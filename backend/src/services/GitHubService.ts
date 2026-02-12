import { Repository } from 'typeorm';
import { GitHubClient } from '../clients/GitHubClient';
import { Project } from '../entities/Project.entity';
import { Credential, CredentialType } from '../entities/Credential.entity';
import { decrypt, DecryptionInput } from '../utils/encryption.util';
import logger from '../utils/logger';

export class GitHubService {
    private client: GitHubClient | null = null;

    constructor(
        private projectRepository: Repository<Project>,
        private credentialRepository: Repository<Credential>
    ) { }

    /**
     * Initialize GitHub client with stored credentials
     */
    async initialize(userId: string): Promise<boolean> {
        try {
            const credential = await this.credentialRepository.findOne({
                where: { user_id: userId, type: CredentialType.GITHUB },
            });

            if (!credential) {
                logger.warn('No GitHub credential found for user', { userId });
                return false;
            }

            const masterKey = process.env.ENCRYPTION_MASTER_KEY;
            if (!masterKey) {
                logger.error('ENCRYPTION_MASTER_KEY not set');
                return false;
            }

            const decryptionInput: DecryptionInput = {
                encrypted: credential.encrypted_data,
                iv: credential.iv,
                salt: credential.salt,
                authTag: credential.auth_tag,
                masterKey,
            };

            let token: string;
            try {
                const decrypted = decrypt(decryptionInput);
                const data = JSON.parse(decrypted);
                token = data.token;
            } catch (error) {
                logger.error('Failed to decrypt GitHub credential', { error: String(error) });
                return false;
            }

            if (!token) {
                logger.error('Invalid GitHub credential data: token missing');
                return false;
            }

            this.client = new GitHubClient(token);
            const connected = await this.client.testConnection();

            if (connected) {
                credential.last_used = new Date();
                await this.credentialRepository.save(credential);
                logger.info('GitHub client initialized successfully');
            }

            return connected;
        } catch (error) {
            logger.error('Failed to initialize GitHub client', { error: String(error) });
            return false;
        }
    }

    /**
     * Sync a project with its GitHub repository
     */
    async syncProject(projectId: string): Promise<Project | null> {
        if (!this.client) {
            logger.error('GitHub client not initialized');
            return null;
        }

        try {
            const project = await this.projectRepository.findOne({ where: { id: projectId } });
            if (!project || !project.github_repo) {
                return project;
            }

            const [owner, repo] = project.github_repo.split('/');
            if (!owner || !repo) {
                logger.error(`Invalid github_repo format: ${project.github_repo}`);
                return project;
            }

            // Fetch repo details
            const repoData = await this.client.getRepository(owner, repo);

            // Fetch README
            const readme = await this.client.getFileContent(owner, repo, 'README.md');

            // Update project data
            project.description = repoData.description || project.description;
            project.readme_content = readme || project.readme_content;
            project.metadata = {
                stars: repoData.stargazers_count,
                forks: repoData.forks_count,
                open_issues: repoData.open_issues_count,
                default_branch: repoData.default_branch,
                language: repoData.language,
                github_updated_at: repoData.updated_at,
            };

            // Try to extract tech stack from package.json
            const packageJsonContent = await this.client.getFileContent(owner, repo, 'package.json');
            if (packageJsonContent) {
                try {
                    const pkg = JSON.parse(packageJsonContent);
                    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
                    const knownTech = [
                        'react', 'vue', 'angular', 'svelte', 'express', 'nest', 'next', 'nuxt',
                        'typescript', 'tailwind', 'bootstrap', 'prisma', 'typeorm', 'sequelize',
                        'mongodb', 'postgresql', 'redis', 'docker', 'kubernetes'
                    ];

                    const detected = knownTech.filter(tech =>
                        Object.keys(dependencies).some(dep => dep.toLowerCase().includes(tech))
                    );

                    if (detected.length > 0) {
                        // Merge with existing or overwrite if empty
                        const currentStack = project.tech_stack || [];
                        project.tech_stack = Array.from(new Set([...currentStack, ...detected]));
                    }
                } catch (e) {
                    logger.warn('Failed to parse package.json for tech stack extraction');
                }
            }

            project.last_sync = new Date();
            return await this.projectRepository.save(project);
        } catch (error) {
            logger.error(`Failed to sync project ${projectId}`, { error: String(error) });
            return null;
        }
    }

    /**
     * List user's repositories for importing
     */
    async listUserRepositories() {
        // This would need a method in GitHubClient
        // For now, let's keep it minimal
        return [];
    }
}
