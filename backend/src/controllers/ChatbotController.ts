import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/jwt.middleware';
import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger';

const CHATBOT_TOOLS = [
  {
    name: 'get_vms',
    description: 'Get a list of all VMs with optional filters',
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['running', 'stopped', 'suspended'] },
            name: { type: 'string' },
          },
        },
      },
    },
  },
  {
    name: 'get_services',
    description: 'Get all services running on infrastructure',
    input_schema: {
      type: 'object',
      properties: {
        vm_id: { type: 'string' },
      },
    },
  },
  {
    name: 'get_health_status',
    description: 'Get overall infrastructure health status',
    input_schema: { type: 'object', properties: {} },
  },
];

export class ChatbotController {
  private claudeClient: Anthropic;
  private conversationHistory: Map<string, any[]> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey.includes('YOUR-API-KEY')) {
      logger.warn('ANTHROPIC_API_KEY not configured. ChatBot will not function.');
      // Don't throw error to prevent server crash
      this.claudeClient = null as any;
    } else {
      this.claudeClient = new Anthropic({ apiKey });
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert Infrastructure Manager ChatBot for a homelab infrastructure.

You have access to these tools:
${CHATBOT_TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')}

Guidelines:
1. Be concise and helpful in responses
2. Use available tools to gather information
3. Format responses with Markdown
4. Always consider security and safety
5. Antworte und schreibe auf DEUTSCH`;
  }

  async query(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user?.id;

      if (!message || !sessionId) {
        res.status(400).json({ success: false, message: 'message and sessionId required' });
        return;
      }

      logger.info(`ChatBot query from user ${userId}: ${message.substring(0, 50)}...`);

      // Get conversation history
      const history = this.conversationHistory.get(sessionId) || [];

      // Call Claude
      const messages: any[] = [
        ...history,
        { role: 'user', content: message },
      ];

      if (!this.claudeClient) {
        res.status(503).json({ success: false, message: 'ChatBot is not configured (Missing API Key)' });
        return;
      }

      const response = await this.claudeClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: this.getSystemPrompt(),
        tools: CHATBOT_TOOLS as any,
        messages,
      });

      // Extract response
      const responseText = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n') || 'No response generated';

      // Save to history
      const newHistory = [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ];
      this.conversationHistory.set(sessionId, newHistory.slice(-20)); // Keep last 20 messages

      res.json({
        success: true,
        message: responseText,
        toolsUsed: [],
        needsConfirmation: false,
      });
    } catch (error: any) {
      logger.error('ChatBot query error', { error: error.message });
      res.status(500).json({
        success: false,
        message: `ChatBot error: ${error.message}`,
      });
    }
  }

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId, limit = '20' } = req.query;

      if (!sessionId) {
        res.status(400).json({ success: false, message: 'sessionId required' });
        return;
      }

      const history = this.conversationHistory.get(sessionId as string) || [];
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      res.json({
        success: true,
        sessionId,
        messageCount: history.length,
        messages: history.slice(-limitNum),
      });
    } catch (error: any) {
      logger.error('Get history error', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async confirm(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { toolName, params } = req.body;

      // TODO: Implement confirmation logic for destructive actions
      res.json({
        success: true,
        message: `Action ${toolName} confirmed`,
        result: { status: 'pending' },
      });
    } catch (error: any) {
      logger.error('Confirmation error', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
