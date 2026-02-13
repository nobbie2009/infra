import { Request, Response } from 'express';
import { AlertService } from '../services/AlertService';
import { ProxmoxService } from '../services/ProxmoxService';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { HealthCheckService } from '../services/HealthCheckService';
import * as os from 'os';

export class AdminController {
    constructor(
        private alertService: AlertService,
        private proxmoxService: ProxmoxService,
        private userRepository: Repository<User>,
        private healthCheckService: HealthCheckService
    ) { }

    /**
     * Get system statistics (CPU, RAM, Disk)
     */
    async getSystemStats(req: Request, res: Response) {
        try {
            const stats = await this.healthCheckService.getSystemStats();
            res.json({ success: true, data: stats });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get all active alerts
     */
    async getAlerts(req: Request, res: Response) {
        try {
            const alerts = await this.alertService.getActiveAlerts();
            res.json({ success: true, data: alerts });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user.id;

            const alert = await this.alertService.acknowledgeAlert(id, userId);

            if (!alert) {
                return res.status(404).json({ success: false, message: 'Alert not found' });
            }

            res.json({ success: true, data: alert });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * List all users (Admin only)
     */
    async getUsers(req: Request, res: Response) {
        try {
            const users = await this.userRepository.find({
                select: ['id', 'username', 'role', 'created_at', 'last_login']
            });
            res.json({ success: true, data: users });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * Debug Filesystem (Temporary)
     */
    async debugFS(req: Request, res: Response) {
        try {
            const fs = require('fs');
            const path = require('path');
            const debugInfo = {
                cwd: process.cwd(),
                env: process.env,
                filesInCwd: fs.readdirSync(process.cwd()),
                nodeModulesExists: fs.existsSync(path.join(process.cwd(), 'node_modules')),
                nodeModulesPdfmake: fs.existsSync(path.join(process.cwd(), 'node_modules/pdfmake')) ? 'exists' : 'missing',
                fontsPath: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
                fontsPathExists: fs.existsSync(path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf')),
                scriptsValues: fs.existsSync(path.join(process.cwd(), 'scripts')) ? fs.readdirSync(path.join(process.cwd(), 'scripts')) : 'missing scripts dir'
            };
            res.json({ success: true, data: debugInfo });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
