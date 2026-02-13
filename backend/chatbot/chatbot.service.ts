import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage } from '../entities/chat-message.entity';
import { CHATBOT_TOOLS, getToolByName, isDestructiveAction } from './tool-definitions';
import { InfrastructureService } from '../infrastructure/infrastructure.service';
import { HealthCheckService } from '../health/health-check.service';
import { ProjectsService } from '../projects/projects.service';
import { FeaturesService } from '../features/features.service';
import { AuditLogService } from '../audit-log/audit-log.service';

interface ChatResponse {
  message: string;
  toolsUsed: string[];
  needsConfirmation: boolean;
  confirmationRequest?: {
    title: string;
    description: string;
    toolName: string;
    toolParams: any;
  };
}

@Injectable()
export class ChatbotService {
  private logger = new Logger('ChatbotService');
  private claudeClient: Anthropic;
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    private infrastructureService: InfrastructureService,
    private healthCheckService: HealthCheckService,
    private projectsService: ProjectsService,
    private featuresService: FeaturesService,
    private auditLogService: AuditLogService,
  ) {
    this.claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Get system prompt with infrastructure context
   */
  private getSystemPrompt(): string {
    return `You are an expert Infrastructure Manager ChatBot for a homelab infrastructure.

You have access to these tools:
${CHATBOT_TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')}

IMPORTANT GUIDELINES:
1. Be concise and helpful in responses
2. Use tools to gather information
3. Format responses with Markdown, Tables, and Code-blocks where appropriate
4. For destructive actions (VM control, feature creation), inform user that confirmation is needed
5. If uncertain, ask clarifying questions
6. When analyzing data, provide insights and recommendations
7. Always consider security and safety

RESPONSE FORMAT:
- Use tables for lists of data
- Use code-blocks for logs or configurations
- Use bullet points for explanations
- Include relevant metrics or status badges`;
  }

  /**
   * Process user query with Claude and tool-use
   */
  async processQuery(
    userMessage: string,
    sessionId: string,
    userId: string,
  ): Promise<ChatResponse> {
    try {
      this.logger.log(
        `Processing query for user ${userId}: "${userMessage.substring(0, 50)}..."`,
      );

      // Load conversation history
      const history = await this.getConversationHistory(sessionId);

      // Build messages array for Claude
      const messages: Anthropic.MessageParam[] = [
        ...history.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userMessage },
      ];

      // Call Claude with tools
      let response = await this.claudeClient.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: this.getSystemPrompt(),
        tools: CHATBOT_TOOLS,
        messages,
      });

      const toolsUsed: string[] = [];
      let finalResponse = response;

      // Process tool uses in a loop
      while (response.stop_reason === 'tool_use') {
        const toolUse = response.content.find(
          (block) => block.type === 'tool_use',
        );

        if (!toolUse || toolUse.type !== 'tool_use') break;

        const toolName = toolUse.name;
        toolsUsed.push(toolName);

        this.logger.log(`Tool used: ${toolName} with input: ${JSON.stringify(toolUse.input)}`);

        // Check if destructive action
        if (isDestructiveAction(toolName)) {
          // Don't execute immediately, return confirmation request
          await this.saveChatMessage(sessionId, userId, 'assistant', response.content[0].text || '');
          return {
            message: `⚠️ This action requires your confirmation.\n\nAction: ${toolName}\n\nPlease confirm to proceed.`,
            toolsUsed,
            needsConfirmation: true,
            confirmationRequest: {
              title: `Confirm: ${toolName}`,
              description: JSON.stringify(toolUse.input),
              toolName,
              toolParams: toolUse.input,
            },
          };
        }

        // Execute tool
        const toolResult = await this.executeTool(toolName, toolUse.input);

        // Continue conversation with tool result
        response = await this.claudeClient.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 1024,
          system: this.getSystemPrompt(),
          tools: CHATBOT_TOOLS,
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: response.content,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(toolResult),
                },
              ],
            },
          ],
        });

        finalResponse = response;
      }

      // Extract final text response
      const finalText =
        finalResponse.content
          .filter((block) => block.type === 'text')
          .map((block) => {
            if (block.type === 'text') return block.text;
            return '';
          })
          .join('\n') || 'No response generated';

      // Save to conversation history
      await this.saveChatMessage(sessionId, userId, 'user', userMessage);
      await this.saveChatMessage(
        sessionId,
        userId,
        'assistant',
        finalText,
        toolsUsed,
      );

      // Log to audit trail
      await this.auditLogService.log(userId, 'chatbot_query', {
        query: userMessage,
        toolsUsed,
        responseLength: finalText.length,
      });

      return {
        message: finalText,
        toolsUsed,
        needsConfirmation: false,
      };
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a tool and return result
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    try {
      switch (toolName) {
        case 'get_vms':
          return await this.infrastructureService.getVMs(params.filter);

        case 'get_services':
          return await this.infrastructureService.getServices(params.vm_id);

        case 'get_health_status':
          return await this.healthCheckService.getGlobalStatus();

        case 'query_logs':
          return await this.infrastructureService.queryLogs(
            params.service,
            params.duration,
            params.error_only,
          );

        case 'get_metrics':
          return await this.infrastructureService.getMetrics(
            params.vm_id,
            params.metric,
            params.duration,
          );

        case 'list_projects':
          return await this.projectsService.getAllProjects();

        case 'search_audit_log':
          return await this.auditLogService.search(
            params.action,
            params.timeframe,
          );

        case 'analyze_anomalies':
          return await this.healthCheckService.analyzeAnomalies(params.focus);

        // Destructive actions return pending state
        case 'execute_vm_action':
        case 'create_feature':
        case 'generate_prompt':
          return { status: 'pending_confirmation', params };

        default:
          this.logger.warn(`Unknown tool: ${toolName}`);
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolName} - ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Confirm and execute a destructive action
   */
  async confirmAndExecuteAction(
    toolName: string,
    params: any,
    userId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Executing confirmed action: ${toolName}`);

      switch (toolName) {
        case 'execute_vm_action':
          const result = await this.infrastructureService.executeVMAction(
            params.vm_id,
            params.action,
          );
          await this.auditLogService.log(userId, 'vm_action', {
            vm_id: params.vm_id,
            action: params.action,
            result,
          });
          return result;

        case 'create_feature':
          const feature = await this.featuresService.createFeature(
            params.project_id,
            params,
          );
          await this.auditLogService.log(userId, 'feature_created', {
            feature_id: feature.id,
            project_id: params.project_id,
          });
          return feature;

        case 'generate_prompt':
          return await this.projectsService.generatePrompt(params.feature_id);

        default:
          throw new Error(`Unknown action: ${toolName}`);
      }
    } catch (error) {
      this.logger.error(`Action execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: 20, // Last 20 messages for context window
    });
  }

  /**
   * Save chat message to database
   */
  private async saveChatMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    toolsUsed?: string[],
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      sessionId,
      userId,
      role,
      content,
      toolsUsed,
    });
    return this.chatMessageRepository.save(message);
  }

  /**
   * Clear old sessions (cleanup)
   */
  async cleanupOldSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - this.SESSION_TIMEOUT);
    await this.chatMessageRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .execute();
    this.logger.log('Cleaned up old chat sessions');
  }
}
