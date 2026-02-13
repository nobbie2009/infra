import 'dotenv/config';
import { AlertService } from './src/services/AlertService';
import { BackupService } from './src/services/BackupService';
import { ReportService } from './src/services/ReportService';
import AppDataSource from './src/config/database';
import { Alert } from './src/entities/Alert.entity';
import { User } from './src/entities/User.entity';
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

async function debugbackend() {
    console.log('--- Starting Deep Debug ---');

    // 1. Database Connection
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connected');
        }
    } catch (e: any) {
        console.error('❌ Database connection failed:', e.message);
        process.exit(1);
    }

    // 2. Test AlertService (Entity Check)
    try {
        const repo = AppDataSource.getRepository(Alert);
        const service = new AlertService(repo);
        const alerts = await service.getActiveAlerts();
        console.log(`✅ AlertService: Found ${alerts.length} active alerts`);
    } catch (e: any) {
        console.error('❌ AlertService Failed:', e.message);
        console.error(e);
    }

    // 3. Test BackupService (Script Execution)
    try {
        const service = new BackupService();
        console.log('Testing Backup Listing...');
        const backups = await service.listBackups();
        console.log(`✅ BackupService: Found ${backups.length} backups`);

        // Only test backup creation if env allows (might fail on windows without pg_dump)
        // console.log('Testing Backup Creation...');
        // await service.createBackup();
        // console.log('✅ BackupService: Creation successful');
    } catch (e: any) {
        console.error('❌ BackupService Failed:', e.message);
    }

    // 4. Test ReportService (PDF Generation)
    try {
        // Re-instantiate AlertService for ReportService
        const alertRepo = AppDataSource.getRepository(Alert);
        const alertService = new AlertService(alertRepo);

        const reportService = new ReportService(
            mockProxmox,
            mockProject,
            mockHealth,
            alertService
        );

        console.log('Testing PDF Generation...');
        const buffer = await reportService.generateInfrastructureReport();
        console.log(`✅ PDF Generated: ${buffer.length} bytes`);

        fs.writeFileSync('debug-report.pdf', buffer);
        console.log('   Saved to debug-report.pdf');

    } catch (e: any) {
        console.error('❌ ReportService Failed:', e.message);
        if (e.message.includes('font')) {
            console.error('   Possible Font Path Issue');
            console.log('   CWD:', process.cwd());
            // Check paths
            const fontPath = path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf');
            console.log(`   Checking path: ${fontPath} -> Exists? ${fs.existsSync(fontPath)}`);
        }
        console.error(e);
    }

    process.exit(0);
}

debugbackend();
