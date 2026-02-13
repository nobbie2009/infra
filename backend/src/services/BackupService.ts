import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import logger from '../utils/logger';

export interface BackupFile {
    filename: string;
    size: number;
    created_at: Date;
}

export class BackupService {
    private backupDir: string;
    private scriptPath: string;

    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
        this.scriptPath = path.join(process.cwd(), 'scripts/backup.sh');

        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async listBackups(): Promise<BackupFile[]> {
        try {
            const files = await fs.promises.readdir(this.backupDir);

            const backups = await Promise.all(
                files
                    .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
                    .map(async (file) => {
                        const filePath = path.join(this.backupDir, file);
                        const stats = await fs.promises.stat(filePath);
                        return {
                            filename: file,
                            size: stats.size,
                            created_at: stats.mtime,
                        };
                    })
            );

            // Sort by date desc
            return backups.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        } catch (error) {
            logger.error('Failed to list backups', { error });
            throw error;
        }
    }

    async createBackup(): Promise<string> {
        return new Promise((resolve, reject) => {
            // Execute the shell script
            // Note: In a docker container, we might need to adjust paths or how we call this.
            // For now assuming we run in a way that can access the script.
            // In production docker, snippets logic might differ slightly or we invoke pg_dump directly.
            // Let's assume we invoke the script which does the heavy lifting.

            // On Windows development without WSL, .sh scripts won't run directly via exec easily without bash.
            // For development robustness, strict check.
            // Use bash explicitly to avoid chmod +x requirement
            const command = `bash "${this.scriptPath}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    logger.error('Backup script failed', { error, stderr });
                    reject(new Error(`Backup failed: ${stderr || error.message}`));
                    return;
                }
                logger.info('Backup created successfully', { stdout });
                resolve(stdout);
            });
        });
    }

    async deleteBackup(filename: string): Promise<void> {
        // Prevent directory traversal
        const safeFilename = path.basename(filename);
        const filePath = path.join(this.backupDir, safeFilename);

        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            logger.info('Backup deleted', { filename });
        } else {
            throw new Error('Backup file not found');
        }
    }

    getBackupPath(filename: string): string {
        const safeFilename = path.basename(filename);
        const filePath = path.join(this.backupDir, safeFilename);

        if (!fs.existsSync(filePath)) {
            throw new Error('Backup file not found');
        }

        return filePath;
    }
}
