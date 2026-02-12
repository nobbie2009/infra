import { Request, Response } from 'express';
import { FeatureService } from '../services/FeatureService';
import { FeatureStatus, FeaturePriority } from '../entities/Feature.entity';

export class FeatureController {
    constructor(private featureService: FeatureService) { }

    async create(req: Request, res: Response) {
        try {
            const { name, description, status, priority, effort, projectId, assigneeId } = req.body;
            const feature = await this.featureService.create({
                name,
                description,
                status,
                priority,
                effort,
                projectId,
                assigneeId,
            });
            res.status(201).json({ success: true, data: feature });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async listByProject(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const features = await this.featureService.findAllByProject(projectId);
            res.json({ success: true, data: features });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const feature = await this.featureService.update(id, req.body);
            if (!feature) {
                return res.status(404).json({ success: false, message: 'Feature not found' });
            }
            res.json({ success: true, data: feature });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const feature = await this.featureService.updateStatus(id, status as FeatureStatus);
            if (!feature) {
                return res.status(404).json({ success: false, message: 'Feature not found' });
            }
            res.json({ success: true, data: feature });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const success = await this.featureService.delete(id);
            res.json({ success });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
