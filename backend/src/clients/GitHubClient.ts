import { Octokit } from 'octokit';
import logger from '../utils/logger';

export class GitHubClient {
    private octokit: Octokit;

    constructor(token: string) {
        this.octokit = new Octokit({ auth: token });
    }

    /**
     * Test connection to GitHub API
     */
    async testConnection(): Promise<boolean> {
        try {
            const { data } = await this.octokit.rest.users.getAuthenticated();
            return !!data.login;
        } catch (error) {
            logger.error('GitHub API connection test failed', { error: String(error) });
            return false;
        }
    }

    /**
     * Get repository details
     */
    async getRepository(owner: string, repo: string) {
        try {
            const { data } = await this.octokit.rest.repos.get({ owner, repo });
            return data;
        } catch (error) {
            logger.error(`Failed to get repository ${owner}/${repo}`, { error: String(error) });
            throw error;
        }
    }

    /**
     * Get file content from repository
     */
    async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
            });

            // Handle case where response might be an array or single file
            const data = response.data;
            if (!Array.isArray(data) && data.type === 'file' && data.content) {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            return null;
        } catch (error) {
            logger.warn(`File ${path} not found in ${owner}/${repo}`);
            return null;
        }
    }

    /**
     * List commits for a repository
     */
    async getRecentCommits(owner: string, repo: string, perPage = 5) {
        try {
            const { data } = await this.octokit.rest.repos.listCommits({
                owner,
                repo,
                per_page: perPage,
            });
            return data;
        } catch (error) {
            logger.error(`Failed to get commits for ${owner}/${repo}`, { error: String(error) });
            return [];
        }
    }
}
