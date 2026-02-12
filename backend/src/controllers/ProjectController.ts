import { Response } from 'express';
import { ProjectService } from '../services/ProjectService';
import { AuthRequest } from '../middleware/jwt.middleware';
import logger from '../utils/logger';

export class ProjectController {
    constructor(private projectService: ProjectService) { }

    /**
     * Get all projects for current user
     */
    async getAll(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const projects = await this.projectService.getAllProjects(userId);
            res.json({ success: true, data: projects });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch projects' });
        }
    }

    /**
     * Get single project
     */
    async getOne(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const project = await this.projectService.getProjectById(userId, id);

            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }

            res.json({ success: true, data: project });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch project' });
        }
    }

    /**
     * Create new project
     */
    async create(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const project = await this.projectService.createProject(userId, req.body);
            res.status(201).json({ success: true, data: project });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message || 'Failed to create project' });
        }
    }

    /**
     * Update project
     */
    async update(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const project = await this.projectService.updateProject(userId, id, req.body);

            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }

            res.json({ success: true, data: project });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update project' });
        }
    }

    /**
     * Delete project
     */
    async delete(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const success = await this.projectService.deleteProject(userId, id);

            if (!success) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }

            res.json({ success: true, message: 'Project deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete project' });
        }
    }

    async sync(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const project = await this.projectService.syncProjectWithGitHub(userId, id);

            res.json({ success: true, data: project });
        } catch (error: any) {
            logger.error('Manual sync failed', { error: error.message });
            res.status(400).json({ success: false, message: error.message || 'Sync failed' });
        }
    }

    /**
     * Link a VM to a project
     */
    async linkVM(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const { vmId } = req.body;
            const success = await this.projectService.linkVM(userId, id, vmId);

            if (!success) {
                return res.status(400).json({ success: false, message: 'Failed to link VM' });
            }

            res.json({ success: true, message: 'VM linked successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to link VM' });
        }
    }

    /**
     * Unlink a VM from a project
     */
    async unlinkVM(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id, vmId } = req.params;
            const success = await this.projectService.unlinkVM(userId, id, vmId);

            if (!success) {
                return res.status(400).json({ success: false, message: 'Failed to unlink VM' });
            }

            res.json({ success: true, message: 'VM unlinked successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to unlink VM' });
        }
    }
}
