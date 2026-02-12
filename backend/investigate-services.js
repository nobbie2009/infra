const { AlertService } = require('./dist/services/AlertService'); // Assuming build exists
// Note: We need a mock repository
const mockRepo = {
    find: async () => [],
    findOne: async () => null,
    save: async (entity) => entity,
    createQueryBuilder: () => ({
        where: () => ({
            getMany: async () => []
        })
    })
};

async function investigate() {
    console.log('--- Investigating Backend Services ---');

    try {
        console.log('1. Testing AlertService...');
        const alertService = new AlertService(mockRepo);
        const alerts = await alertService.getActiveAlerts();
        console.log('AlertService.getActiveAlerts() returned:', alerts);
    } catch (e) {
        console.error('AlertService FAILED:', e.message);
    }

    try {
        console.log('\n2. Testing BackupService...');
        const { BackupService } = require('./dist/services/BackupService');
        const backupService = new BackupService();
        const backups = await backupService.listBackups();
        console.log('BackupService.listBackups() returned:', backups.length, 'backups');
    } catch (e) {
        console.error('BackupService FAILED:', e.message);
    }

    try {
        console.log('\n3. Testing ReportService Initialization...');
        // We'll use the compiled code
        const { ReportService } = require('./dist/services/ReportService');
        // Mock dependencies
        const reportService = new ReportService({}, {}, {}, {});
        console.log('ReportService successfully instantiated.');
    } catch (e) {
        console.error('ReportService Initialization FAILED:', e.message);
    }
}

investigate();
