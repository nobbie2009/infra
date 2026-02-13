
import 'dotenv/config';
import { AlertService } from './src/services/AlertService';
import { BackupService } from './src/services/BackupService';
import { ReportService } from './src/services/ReportService';
import AppDataSource from './src/config/database';
import { Alert } from './src/entities/Alert.entity';
import path from 'path';
import fs from 'fs';

// Mock other services for ReportService
const mockProxmox = {
    getAllVMs: async () => [],
    getNodes: async () => [],
} as any;
const mockProject = {
    getAllProjectsAdmin: async () => [],
} as any;
const mockHealth = {
    getSystemStats: async () => ({
        cpu: { load: 0.5, model: 'Test CPU' },
        memory: { percentage: 50, used: 1024, total: 2048, free: 1024 },
        uptime: 1000,
        hostname: 'test-host',
        platform: 'linux'
    }),
} as any;

// Mock AlertService fallback
const mockAlertService = {
    getActiveAlerts: async () => []
} as any;

async function debugbackend() {
    console.log('--- Starting Deep Debug (With DB) ---');

    // 1. Database Connection
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connected');
        }
    } catch (e: any) {
        console.error('❌ Database connection failed:', e.message);
        // We continue to test ReportService even if DB fails, using mock
    }

    // 2. Test AlertService (Entity Check)
    let realAlertService = null;
    try {
        if (AppDataSource.isInitialized) {
            const repo = AppDataSource.getRepository(Alert);
            realAlertService = new AlertService(repo);
            const alerts = await realAlertService.getActiveAlerts();
            console.log(`✅ AlertService: Found ${alerts.length} active alerts`);
        }
    } catch (e: any) {
        console.error('❌ AlertService Failed:', e.message);
        console.error(e);
    }

    // 3. Test BackupService
    try {
        const service = new BackupService();
        console.log('Testing Backup Listing...');
        const backups = await service.listBackups();
        console.log(`✅ BackupService: Found ${backups.length} backups`);
    } catch (e: any) {
        console.error('❌ BackupService Failed:', e.message);
    }

    // 4. Test ReportService (PDF Generation)
    try {
        const service = new ReportService(
            mockProxmox,
            mockProject,
            mockHealth,
            realAlertService || mockAlertService
        );

        console.log('Testing PDF Generation...');
        const buffer = await service.generateInfrastructureReport();
        console.log(`✅ PDF Generated: ${buffer.length} bytes`);

        fs.writeFileSync('debug-report.pdf', buffer);
        console.log('   Saved to debug-report.pdf');

    } catch (e: any) {
        console.error('❌ ReportService Failed:', e.message);
        if (e.message.includes('font') || e.code === 'ENOENT') {
            console.error('   Possible Font Path Issue');
            console.log('   CWD:', process.cwd());
            const fontPath = path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf');
            console.log(`   Checking path: ${fontPath} -> Exists? ${fs.existsSync(fontPath)}`);
        }
        console.error(e);
    }

    process.exit(0);
}

debugbackend();
