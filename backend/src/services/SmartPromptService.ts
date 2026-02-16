import Anthropic from '@anthropic-ai/sdk';
import { PromptService } from './PromptService';
import logger from '../utils/logger';

export interface ChatbotQuestion {
  id: string;
  question: string;
  type: 'technical' | 'clarification' | 'scope' | 'priority';
}

export interface ChatbotResponse {
  questionId: string;
  answer: string;
}

export class SmartPromptService {
  private anthropic: Anthropic;
  private promptService: PromptService;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.warn('ANTHROPIC_API_KEY not configured for SmartPromptService');
    }
    this.anthropic = new Anthropic({ apiKey });
    this.promptService = new PromptService();
  }

  /**
   * Generate clarification questions for a feature
   */
  async generateClarificationQuestions(context: any): Promise<ChatbotQuestion[]> {
    try {
      const { feature, project } = context;

      const systemPrompt = `You are a helpful product manager and technical architect.
Your job is to ask clarifying questions about feature requests to understand them better.
Ask 3-4 focused, specific questions that will help developers understand requirements.
Return ONLY a JSON array with the questions.`;

      const userPrompt = `Feature Request:
Title: ${feature.name}
Description: ${feature.description}
Priority: ${feature.priority}
Project: ${project.name} (${project.description})

Please generate 3-4 clarifying questions that would help a development team better understand this feature.
Format as JSON array like: [{"id":"q1","question":"...","type":"clarification"},...]
Types can be: 'technical', 'clarification', 'scope', 'priority'`;

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('Could not extract JSON from Claude response', { response: content.text });
        return this.getDefaultQuestions();
      }

      const questions = JSON.parse(jsonMatch[0]);
      logger.info('Generated clarification questions', { count: questions.length });
      return questions;
    } catch (error) {
      logger.error('Failed to generate clarification questions', { error: String(error) });
      return this.getDefaultQuestions();
    }
  }

  /**
   * Enhance prompt based on chatbot responses
   */
  async enhancePromptWithContext(
    baseContext: any,
    chatbotResponses: ChatbotResponse[]
  ): Promise<any> {
    try {
      const { feature } = baseContext;

      const systemPrompt = `You are a technical architect.
Your job is to analyze user responses to clarifying questions and extract key insights.
Return ONLY valid JSON object with extracted requirements.`;

      const responseSummary = chatbotResponses
        .map((r) => `Q: [previous question]\nA: ${r.answer}`)
        .join('\n\n');

      const userPrompt = `Feature: ${feature.name}
Description: ${feature.description}

User Responses to Clarification Questions:
${responseSummary}

Please extract and structure the key requirements, constraints, and technical considerations from these responses.
Return as JSON with keys: requirements[], constraints[], technicalConsiderations[], estimatedComplexity (low/medium/high)`;

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('Could not extract JSON from Claude enhancement response');
        return {
          requirements: [],
          constraints: [],
          technicalConsiderations: [],
          estimatedComplexity: 'medium',
        };
      }

      const enhancedContext = JSON.parse(jsonMatch[0]);
      logger.info('Enhanced prompt context', { keys: Object.keys(enhancedContext) });

      return {
        ...baseContext,
        enhancedRequirements: enhancedContext,
      };
    } catch (error) {
      logger.error('Failed to enhance prompt context', { error: String(error) });
      return baseContext;
    }
  }

  /**
   * Generate final prompt with all context
   */
  generateEnhancedPrompt(enhancedContext: any): string {
    try {
      const { feature, project, infrastructure, enhancedRequirements } = enhancedContext;

      const basePrompt = this.promptService.generateFeaturePrompt(enhancedContext);

      if (!enhancedRequirements) {
        return basePrompt;
      }

      return `${basePrompt}

# REFINED REQUIREMENTS (from clarification conversation)
${enhancedRequirements.requirements ? `## Requirements:\n${enhancedRequirements.requirements.map((r: string) => `- ${r}`).join('\n')}` : ''}

${enhancedRequirements.constraints ? `## Constraints:\n${enhancedRequirements.constraints.map((c: string) => `- ${c}`).join('\n')}` : ''}

${enhancedRequirements.technicalConsiderations ? `## Technical Considerations:\n${enhancedRequirements.technicalConsiderations.map((t: string) => `- ${t}`).join('\n')}` : ''}

${enhancedRequirements.estimatedComplexity ? `## Estimated Complexity: ${enhancedRequirements.estimatedComplexity}` : ''}
`;
    } catch (error) {
      logger.error('Failed to generate enhanced prompt', { error: String(error) });
      return this.promptService.generateFeaturePrompt(enhancedContext);
    }
  }

  /**
   * Default questions if Claude fails
   */
  private getDefaultQuestions(): ChatbotQuestion[] {
    return [
      {
        id: 'q1',
        question: 'What is the primary user goal or business outcome for this feature?',
        type: 'clarification',
      },
      {
        id: 'q2',
        question: 'Are there any specific technical constraints or dependencies we should consider?',
        type: 'technical',
      },
      {
        id: 'q3',
        question: 'What is the scope - is this a standalone feature or does it integrate with existing systems?',
        type: 'scope',
      },
      {
        id: 'q4',
        question: 'What is the timeline or deadline for this feature?',
        type: 'priority',
      },
    ];
  }
}
