import logger from '../utils/logger';

export class PromptService {

    generateFeaturePrompt(context: any): string {
        try {
            const { feature, project, infrastructure } = context;

            return `
# ROLE
You are an Senior Fullstack Developer and DevOps Engineer helping to implement a new feature.

# CONTEXT
**Project**: ${project.name}
**Description**: ${project.description}
**Tech Stack**: ${Array.isArray(project.techStack) ? project.techStack.join(', ') : 'N/A'}
**Repo**: ${project.githubRepo || 'Local'}

# FEATURE REQUEST
**Title**: ${feature.name}
**Priority**: ${feature.priority}
**Status**: ${feature.status}
**Description**:
${feature.description}

# INFRASTRUCTURE CONTEXT
The project is running on the following infrastructure:
${infrastructure.map((vm: any) => `- **${vm.name}** (${vm.ip}): ${vm.services.map((s: any) => `${s.name}:${s.port}`).join(', ') || 'No services'}`).join('\n')}

# README SNIPPET
${project.readme}

# TASK
Please provide a comprehensive implementation plan for this feature, including:
1. File changes (Backend & Frontend)
2. Code snippets
3. Necessary commands
4. Verification steps

Focus on the "${project.techStack?.join('" and "') || 'project'}" ecosystem.
`;
        } catch (error) {
            logger.error('Error generating feature prompt', { error: String(error) });
            return 'Error generating prompt.';
        }
    }

    generateBugPrompt(context: any, errorLog?: string): string {
        // Placeholder for bug prompt
        return `# DEBUGGING TASK \n Context: ${JSON.stringify(context, null, 2)}`;
    }
}
