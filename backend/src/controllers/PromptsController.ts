import { Request, Response } from 'express';
import { ContextCollectorService } from '../services/ContextCollectorService';
import { PromptService } from '../services/PromptService';
import { AuthRequest } from '../middleware/jwt.middleware';

export class PromptsController {
    constructor(
        private contextCollector: ContextCollectorService,
        private promptService: PromptService
    ) { }

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
}
