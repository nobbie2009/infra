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
            // Get the most recent GitHub credential (in case multiple exist)
            const credentials = await this.credentialRepository.find({
                where: { user_id: userId, type: CredentialType.GITHUB, is_deleted: false },
                order: { updated_at: 'DESC' },
            });

            if (!credentials || credentials.length === 0) {
                logger.warn('No GitHub credential found for user', { userId });
                return false;
            }

            // Try credentials from newest to oldest
            for (const credential of credentials) {
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

                let token: string | null = null;
                try {
                    const decrypted = decrypt(decryptionInput);

                    // Try to parse as JSON first (format: {"token": "ghp_..."})
                    try {
                        const data = JSON.parse(decrypted);
                        token = data.token || data;
                    } catch {
                        // If JSON parse fails, treat the whole decrypted string as token
                        token = decrypted.trim();
                    }

                    // Validate token format - accept various GitHub token formats
                    // ghp_ = Personal Access Token (new format)
                    // gho_ = OAuth token
                    // ghu_ = User-to-server token
                    // ghs_ = Server-to-server token
                    // ghr_ = Refresh token
                    if (!token || typeof token !== 'string') {
                        logger.warn(`Invalid token type in credential ${credential.id}`, {
                            userId,
                            tokenType: typeof token,
                            decrypted: decrypted.substring(0, 50) + '...'
                        });
                        continue; // Try next credential
                    }

                    const trimmedToken = token.trim();
                    const validTokenPrefixes = ['ghp_', 'gho_', 'ghu_', 'ghs_', 'ghr_'];
                    const isValidToken = validTokenPrefixes.some(prefix => trimmedToken.startsWith(prefix));

                    if (!isValidToken) {
                        logger.warn(`Unknown GitHub token format in credential ${credential.id} (Proceeding anyway)`, {
                            userId,
                            tokenStart: trimmedToken.substring(0, 15) + '...',
                        });
                        // Don't skip, try the token anyway as it might be a new format (e.g. github_pat_)
                    }

                    token = trimmedToken;

                    logger.info(`Testing GitHub credential ${credential.id}`, { userId });
                    this.client = new GitHubClient(token);
                    const connected = await this.client.testConnection();

                    if (connected) {
                        credential.last_used = new Date();
                        await this.credentialRepository.save(credential);
                        logger.info('GitHub client initialized successfully', {
                            credentialId: credential.id,
                            userId,
                        });
                        return true;
                    } else {
                        logger.warn(`GitHub credential test failed: ${credential.id}`, { userId });
                        continue; // Try next credential
                    }
                } catch (error) {
                    logger.warn(`Failed to process GitHub credential ${credential.id}`, {
                        error: String(error),
                        userId,
                    });
                    continue; // Try next credential
                }
            }

            logger.error('No valid GitHub credential found after testing all credentials', { userId });
            return false;
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
