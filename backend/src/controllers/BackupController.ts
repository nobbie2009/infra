import { Request, Response } from 'express';
import { BackupService } from '../services/BackupService';
import logger from '../utils/logger';

export class BackupController {
    private backupService: BackupService;

    constructor(backupService: BackupService) {
        this.backupService = backupService;
    }

    async list(req: Request, res: Response) {
        try {
            const backups = await this.backupService.listBackups();
            res.json({ success: true, data: backups });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            await this.backupService.createBackup();
            res.json({ success: true, message: 'Backup initiated successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { filename } = req.params;
            await this.backupService.deleteBackup(filename);
            res.json({ success: true, message: 'Backup deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async download(req: Request, res: Response) {
        try {
            const { filename } = req.params;
            const filePath = this.backupService.getBackupPath(filename);
            res.download(filePath, filename);
        } catch (error: any) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
}
