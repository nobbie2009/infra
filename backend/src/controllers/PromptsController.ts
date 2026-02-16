import { Request, Response } from 'express';
import { ContextCollectorService } from '../services/ContextCollectorService';
import { PromptService } from '../services/PromptService';
import { SmartPromptService, ChatbotResponse } from '../services/SmartPromptService';
import { AuthRequest } from '../middleware/jwt.middleware';
import logger from '../utils/logger';

export class PromptsController {
    private smartPromptService: SmartPromptService;

    constructor(
        private contextCollector: ContextCollectorService,
        private promptService: PromptService
    ) {
        this.smartPromptService = new SmartPromptService();
    }

    /**
     * Original generate endpoint
     */
    async generate(req: AuthRequest, res: Response) {
        try {
            const { type, contextId } = req.body;
            const userId = req.user!.id;

            if (type === 'feature') {
                const context = await this.contextCollector.collectFeatureContext(contextId, userId);
                const prompt = this.promptService.generateFeaturePrompt(context);
                return res.json({ success: true, data: { prompt, context } });
            }

            if (type === 'infrastructure') {
                const context = await this.contextCollector.collectInfrastructureContext();
                return res.json({ success: true, data: { prompt: JSON.stringify(context, null, 2), context } });
            }

            res.status(400).json({ success: false, message: 'Invalid prompt type' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message || 'Failed to generate prompt' });
        }
    }

    /**
     * Generate with chatbot interaction for features
     * POST /api/prompts/generate/feature/:featureId/chat
     */
    async generateWithChatbot(req: AuthRequest, res: Response) {
        try {
            const { featureId } = req.params;
            const userId = req.user!.id;
            const { step, responses } = req.body; // step: 'questions' or 'enhance'

            logger.info('Chat prompt generation', { featureId, step, userId });

            // Step 1: Generate clarification questions
            if (step === 'questions' || !step) {
                const context = await this.contextCollector.collectFeatureContext(featureId, userId);
                const questions = await this.smartPromptService.generateClarificationQuestions(context);

                return res.json({
                    success: true,
                    step: 'questions',
                    data: {
                        feature: context.feature,
                        questions,
                        message: '🤖 Here are some clarifying questions to help refine your feature requirements:',
                    },
                });
            }

            // Step 2: Process responses and generate enhanced prompt
            if (step === 'enhance' && responses) {
                const context = await this.contextCollector.collectFeatureContext(featureId, userId);
                const chatbotResponses: ChatbotResponse[] = responses; // Array of {questionId, answer}

                // Enhance context with chatbot responses
                const enhancedContext = await this.smartPromptService.enhancePromptWithContext(
                    context,
                    chatbotResponses
                );

                // Generate final prompt
                const prompt = this.smartPromptService.generateEnhancedPrompt(enhancedContext);

                return res.json({
                    success: true,
                    step: 'enhanced',
                    data: {
                        prompt,
                        context: enhancedContext,
                        message: '✅ Your feature prompt has been enhanced based on the clarification responses!',
                    },
                });
            }

            res.status(400).json({
                success: false,
                message: 'Invalid step or missing responses',
            });
        } catch (error: any) {
            logger.error('Chat prompt generation failed', { error: error.message });
            res.status(500).json({ success: false, message: error.message || 'Failed to generate prompt with chatbot' });
        }
    }
}
