import { Repository, In } from 'typeorm';
import { Project } from '../entities/Project.entity';
import { GitHubService } from './GitHubService';
import logger from '../utils/logger';

export class ProjectService {
    constructor(
        private projectRepository: Repository<Project>,
        private vmRepository: Repository<any>,
        private githubService: GitHubService
    ) { }

    /**
     * Get all projects for a user
     */
    async getAllProjects(userId: string): Promise<Project[]> {
        try {
            return await this.projectRepository.find({
                where: { userId },
                relations: ['vms'],
                order: { updated_at: 'DESC' },
            });
        } catch (error) {
            logger.error('Failed to get projects', { error: String(error) });
            return [];
        }
    }

    /**
     * Get all projects (Admin)
     */
    async getAllProjectsAdmin(): Promise<Project[]> {
        try {
            return await this.projectRepository.find({
                relations: ['vms'],
                order: { updated_at: 'DESC' },
            });
        } catch (error) {
            logger.error('Failed to get all projects', { error: String(error) });
            return [];
        }
    }

    /**
     * Get project by ID
     */
    async getProjectById(userId: string, id: string): Promise<Project | null> {
        try {
            return await this.projectRepository.findOne({
                where: { id, userId },
                relations: ['vms'],
            });
        } catch (error) {
            logger.error(`Failed to get project ${id}`, { error: String(error) });
            return null;
        }
    }

    /**
     * Create a new project
     */
    async createProject(userId: string, data: Partial<Project>): Promise<Project> {
        try {
            const project = this.projectRepository.create({
                ...data,
                userId,
            });
            const saved = await this.projectRepository.save(project);

            // If github_repo is provided, try to sync immediately
            if (saved.github_repo) {
                // We catch errors here so project creation still succeeds even if sync fails
                try {
                    const initialized = await this.githubService.initialize(userId);
                    if (initialized) {
                        await this.githubService.syncProject(saved.id);
                    }
                } catch (syncError) {
                    logger.warn(`Initial GitHub sync failed for new project ${saved.name}`, { error: String(syncError) });
                }
            }

            return saved;
        } catch (error) {
            logger.error('Failed to create project', { error: String(error) });
            throw error;
        }
    }

    /**
     * Update a project
     */
    async updateProject(userId: string, id: string, data: Partial<Project>): Promise<Project | null> {
        try {
            const project = await this.projectRepository.findOne({ where: { id, userId } });
            if (!project) {
                return null;
            }

            const oldRepo = project.github_repo;
            Object.assign(project, data);
            const saved = await this.projectRepository.save(project);

            // Re-sync if github_repo changed or was added
            if (data.github_repo && data.github_repo !== oldRepo) {
                try {
                    const initialized = await this.githubService.initialize(userId);
                    if (initialized) {
                        await this.githubService.syncProject(id);
                    }
                } catch (syncError) {
                    logger.warn(`GitHub sync failed after repo update for project ${id}`, { error: String(syncError) });
                }
            }

            return saved;
        } catch (error) {
            logger.error(`Failed to update project ${id}`, { error: String(error) });
            return null;
        }
    }

    /**
     * Delete a project
     */
    async deleteProject(userId: string, id: string): Promise<boolean> {
        try {
            const result = await this.projectRepository.delete({ id, userId });
            return (result.affected || 0) > 0;
        } catch (error) {
            logger.error(`Failed to delete project ${id}`, { error: String(error) });
            return false;
        }
    }

    /**
     * Sync a project manually with GitHub
     */
    async syncProjectWithGitHub(userId: string, id: string): Promise<Project | null> {
        try {
            const initialized = await this.githubService.initialize(userId);
            if (!initialized) {
                throw new Error('GitHub service not initialized. Please check your credentials.');
            }

            return await this.githubService.syncProject(id);
        } catch (error) {
            logger.error(`Manual GitHub sync failed for project ${id}`, { error: String(error) });
            throw error;
        }
    }

    /**
     * Link a VM to a project
     */
    async linkVM(userId: string, projectId: string, vmId: string): Promise<boolean> {
        try {
            const project = await this.projectRepository.findOne({
                where: { id: projectId, userId },
                relations: ['vms']
            });
            if (!project) return false;

            const vm = await this.vmRepository.findOne({ where: { id: vmId } });
            if (!vm) return false;

            // Check if already linked
            if (project.vms.some(v => v.id === vmId)) return true;

            project.vms.push(vm);
            await this.projectRepository.save(project);
            return true;
        } catch (error) {
            logger.error(`Failed to link VM ${vmId} to project ${projectId}`, { error: String(error) });
            return false;
        }
    }

    /**
     * Unlink a VM from a project
     */
    async unlinkVM(userId: string, projectId: string, vmId: string): Promise<boolean> {
        try {
            const project = await this.projectRepository.findOne({
                where: { id: projectId, userId },
                relations: ['vms']
            });
            if (!project) return false;

            project.vms = project.vms.filter(v => v.id !== vmId);
            await this.projectRepository.save(project);
            return true;
        } catch (error) {
            logger.error(`Failed to unlink VM ${vmId} from project ${projectId}`, { error: String(error) });
            return false;
        }
    }
}
