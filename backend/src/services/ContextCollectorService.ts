import { ProjectService } from './ProjectService';
import { FeatureService } from './FeatureService';
import { IPManagementService } from './IPManagementService';
import { ProxmoxService } from './ProxmoxService';
import logger from '../utils/logger';

export class ContextCollectorService {
    constructor(
        private projectService: ProjectService,
        private featureService: FeatureService,
        private ipService: IPManagementService,
        private proxmoxService: ProxmoxService
    ) { }

    /**
     * Collects all relevant context for a specific feature
     */
    async collectFeatureContext(featureId: string, userId: string) {
        try {
            const feature = await this.featureService.findOne(featureId);
            if (!feature) {
                throw new Error(`Feature ${featureId} not found`);
            }

            const project = await this.projectService.getProjectById(userId, feature.projectId);
            if (!project) {
                throw new Error(`Project ${feature.projectId} not found`);
            }

            // Collect VM info linked to this project
            const linkedVMs = project.vms || [];
            const vmDetails = await Promise.all(linkedVMs.map(async (vm) => {
                // Get full details including services
                const vmEntity = await this.ipService.getVM(vm.id);
                return vmEntity;
            }));

            // Collect Repository Structure (if available via separate call or cached)
            // For now we use what's in the project entity (tech_stack, readme)

            return {
                type: 'feature',
                timestamp: new Date().toISOString(),
                feature: {
                    name: feature.name,
                    description: feature.description,
                    status: feature.status,
                    priority: feature.priority,
                    effort: feature.effort
                },
                project: {
                    name: project.name,
                    description: project.description,
                    techStack: project.tech_stack,
                    githubRepo: project.github_repo,
                    readme: project.readme_content ? project.readme_content.substring(0, 2000) + '...' : 'N/A' // Truncate README to avoid token limits
                },
                infrastructure: vmDetails.map(vm => ({
                    name: vm?.name,
                    ip: vm?.ipv4_address,
                    node: vm?.node,
                    services: vm?.services?.map(s => ({ name: s.name, port: s.port }))
                }))
            };
        } catch (error) {
            logger.error('Failed to collect feature context', { featureId, error: String(error) });
            throw error;
        }
    }

    /**
     * Collects general infrastructure context
     */
    async collectInfrastructureContext() {
        try {
            const allocations = await this.ipService.getAllAllocations();
            return {
                type: 'infrastructure',
                timestamp: new Date().toISOString(),
                stats: {
                    totalSystems: allocations.length,
                    activeServices: allocations.reduce((acc, vm) => acc + (vm.services?.length || 0), 0)
                },
                systems: allocations.map(vm => ({
                    name: vm.name,
                    ip: vm.ipv4,
                    status: vm.status,
                    node: vm.node,
                    services: vm.services?.map(s => s.name)
                }))
            };
        } catch (error) {
            logger.error('Failed to collect infrastructure context', { error: String(error) });
            throw error;
        }
    }
}
