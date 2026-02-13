import 'dotenv/config';
import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import AppDataSource from './config/database';
import { AuthController } from './controllers/AuthController';
import { ProxmoxController } from './controllers/ProxmoxController';
import { InfrastructureController } from './controllers/InfrastructureController';
import { CredentialsController } from './controllers/CredentialsController';
import { AdminController } from './controllers/AdminController';
import { BackupController } from './controllers/BackupController';
import { JWTMiddleware, AuthRequest } from './middleware/jwt.middleware';
import { ProxmoxService } from './services/ProxmoxService';
import { IPManagementService } from './services/IPManagementService';
import { HealthCheckService } from './services/HealthCheckService';
import { CredentialsService } from './services/CredentialsService';
import { AlertService } from './services/AlertService';
import { BackupService } from './services/BackupService';
import { ReportService } from './services/ReportService';
import { ReportController } from './controllers/ReportController';
import { User } from './entities/User.entity';
import { Credential } from './entities/Credential.entity';
import { Alert } from './entities/Alert.entity';
import { VM } from './entities/VM.entity';
import { Service } from './entities/Service.entity';
import { Project } from './entities/Project.entity';
import { Feature } from './entities/Feature.entity';
import { ProjectController } from './controllers/ProjectController';
import { ProjectService } from './services/ProjectService';
import { FeatureController } from './controllers/FeatureController';
import { FeatureService } from './services/FeatureService';
import { GitHubService } from './services/GitHubService';
import { PromptService } from './services/PromptService';
import { ContextCollectorService } from './services/ContextCollectorService';
import { PromptsController } from './controllers/PromptsController';
import logger from './utils/logger';

const app: Express = express();
const port = process.env.BACKEND_PORT || 5000;

// ============================================
// Middleware
// ============================================

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration
const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// Error handling middleware (must be last)
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

// ============================================
// Initialize Database and App
// ============================================

async function bootstrap() {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await AppDataSource.initialize();
    logger.info('Database connected successfully');

    // Check and validate environment variables
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    if (!process.env.ENCRYPTION_MASTER_KEY) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is not set');
    }

    // Initialize Controllers and Services
    const userRepository = AppDataSource.getRepository(User);
    const credentialRepository = AppDataSource.getRepository(Credential);
    const vmRepository = AppDataSource.getRepository(VM);
    const serviceRepository = AppDataSource.getRepository(Service);
    const projectRepository = AppDataSource.getRepository(Project);
    const featureRepository = AppDataSource.getRepository(Feature);

    const authController = new AuthController(userRepository);
    const proxmoxService = new ProxmoxService(credentialRepository);
    const githubService = new GitHubService(projectRepository, credentialRepository);
    const credentialsService = new CredentialsService(credentialRepository);
    // Initialize controller with all required dependencies
    const credentialsController = new CredentialsController(credentialsService, proxmoxService, githubService);
    const proxmoxController = new ProxmoxController(proxmoxService);

    const alertRepository = AppDataSource.getRepository(Alert);
    const alertService = new AlertService(alertRepository);

    const healthCheckService = new HealthCheckService(serviceRepository, alertService);
    const ipManagementService = new IPManagementService(
      vmRepository,
      serviceRepository,
      proxmoxService,
      healthCheckService
    );
    const infrastructureController = new InfrastructureController(
      ipManagementService,
      healthCheckService
    );

    const projectService = new ProjectService(projectRepository, vmRepository, githubService);
    const projectController = new ProjectController(projectService);

    const featureService = new FeatureService(featureRepository);
    const featureController = new FeatureController(featureService);

    const promptService = new PromptService();
    const contextCollector = new ContextCollectorService(
      projectService,
      featureService,
      ipManagementService,
      proxmoxService
    );
    const promptsController = new PromptsController(contextCollector, promptService);

    const adminController = new AdminController(alertService, proxmoxService, userRepository, healthCheckService);

    const jwtMiddleware = new JWTMiddleware(userRepository);

    // ============================================
    // Routes
    // ============================================

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // API Routes
    const authRoutes = express.Router();

    // Public routes
    authRoutes.post('/register', (req: Request, res: Response) =>
      authController.register(req, res)
    );
    authRoutes.post('/login', (req: Request, res: Response) => authController.login(req, res));
    authRoutes.post('/refresh', (req: Request, res: Response) =>
      authController.refreshToken(req, res)
    );

    // Protected routes
    authRoutes.get(
      '/me',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => authController.getCurrentUser(req, res)
    );

    authRoutes.post(
      '/logout',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => authController.logout(req, res)
    );

    app.use('/api/auth', authRoutes);

    // Credentials Routes
    const credentialsRoutes = express.Router();

    credentialsRoutes.post(
      '/',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.create(req, res)
    );

    credentialsRoutes.get(
      '/',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.list(req, res)
    );

    credentialsRoutes.get(
      '/type/:type',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.listByType(req, res)
    );

    credentialsRoutes.get(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.getOne(req, res)
    );

    credentialsRoutes.put(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.update(req, res)
    );

    credentialsRoutes.post(
      '/:id/decrypt',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.decrypt(req, res)
    );

    credentialsRoutes.post(
      '/:id/test',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.testConnection(req, res)
    );

    credentialsRoutes.delete(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => credentialsController.delete(req, res)
    );

    app.use('/api/credentials', credentialsRoutes);

    // Infrastructure Routes (Proxmox)
    const infrastructureRoutes = express.Router();

    // Proxmox routes - all protected
    infrastructureRoutes.post(
      '/proxmox/init',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.initializeProxmox(req, res)
    );

    infrastructureRoutes.get(
      '/proxmox/status',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.getStatus(req, res)
    );

    infrastructureRoutes.get(
      '/nodes',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.getNodes(req, res)
    );

    infrastructureRoutes.get(
      '/nodes/:node',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.getNodeStatus(req, res)
    );

    infrastructureRoutes.get(
      '/vms',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.getVMs(req, res)
    );

    infrastructureRoutes.get(
      '/vms/:vmid',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.getVM(req, res)
    );

    infrastructureRoutes.post(
      '/vms/:vmid/start',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.startVM(req, res)
    );

    infrastructureRoutes.post(
      '/vms/:vmid/stop',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.stopVM(req, res)
    );

    infrastructureRoutes.post(
      '/vms/:vmid/restart',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.restartVM(req, res)
    );

    infrastructureRoutes.get(
      '/topology',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.getTopology(req, res)
    );

    infrastructureRoutes.get(
      '/cluster-status',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => proxmoxController.getClusterStatus(req, res)
    );

    // IP Management Routes
    infrastructureRoutes.get(
      '/ip-allocations',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.getAllAllocations(req, res)
    );

    infrastructureRoutes.get(
      '/vm-details/:vmId',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.getVM(req, res)
    );

    infrastructureRoutes.put(
      '/vm-details/:vmId/ip',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.updateVMIP(req, res)
    );

    infrastructureRoutes.post(
      '/sync-vms',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.syncVMs(req, res)
    );

    infrastructureRoutes.post(
      '/vm-details/:vmId/services',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.addService(req, res)
    );

    infrastructureRoutes.get(
      '/vm-details/:vmId/services',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.getVMServices(req, res)
    );

    infrastructureRoutes.delete(
      '/services/:serviceId',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.removeService(req, res)
    );

    infrastructureRoutes.post(
      '/health-check/:serviceId',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.checkServiceHealth(req, res)
    );

    infrastructureRoutes.post(
      '/health-check-all',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.checkAllServicesHealth(req, res)
    );

    infrastructureRoutes.get(
      '/services/healthy',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.getHealthyServices(req, res)
    );

    infrastructureRoutes.get(
      '/services/unhealthy',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.getUnhealthyServices(req, res)
    );

    infrastructureRoutes.get(
      '/services/stats',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => infrastructureController.getServiceStats(req, res)
    );

    app.use('/api/infrastructure', infrastructureRoutes);

    // Project Routes
    const projectRoutes = express.Router();

    projectRoutes.get(
      '/',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.getAll(req, res)
    );

    projectRoutes.get(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.getOne(req, res)
    );

    projectRoutes.post(
      '/',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.create(req, res)
    );

    projectRoutes.put(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.update(req, res)
    );

    projectRoutes.delete(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.delete(req, res)
    );

    projectRoutes.post(
      '/:id/sync',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.sync(req, res)
    );

    projectRoutes.post(
      '/:id/vms',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.linkVM(req, res)
    );

    projectRoutes.delete(
      '/:id/vms/:vmId',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => projectController.unlinkVM(req, res)
    );

    app.use('/api/projects', projectRoutes);

    // Feature Routes
    const featureRoutes = express.Router();

    featureRoutes.get(
      '/project/:projectId',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => featureController.listByProject(req, res)
    );

    featureRoutes.post(
      '/',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => featureController.create(req, res)
    );

    featureRoutes.put(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => featureController.update(req, res)
    );

    featureRoutes.patch(
      '/:id/status',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => featureController.updateStatus(req, res)
    );

    featureRoutes.delete(
      '/:id',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => featureController.delete(req, res)
    );

    app.use('/api/features', featureRoutes);

    // Prompt Routes
    const promptRoutes = express.Router();

    promptRoutes.post(
      '/generate',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => promptsController.generate(req, res)
    );

    app.use('/api/prompts', promptRoutes);

    // Admin Routes
    const adminRoutes = express.Router();

    // Backup Controller
    const backupService = new BackupService();
    const backupController = new BackupController(backupService);

    adminRoutes.get(
      '/system/stats',
      jwtMiddleware.authenticate(userRepository),
      jwtMiddleware.authorize(['admin']),
      (req: AuthRequest, res: Response) => adminController.getSystemStats(req, res)
    );

    adminRoutes.get(
      '/alerts',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => adminController.getAlerts(req, res)
    );

    adminRoutes.post(
      '/alerts/:id/ack',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => adminController.acknowledgeAlert(req, res)
    );

    adminRoutes.get(
      '/users',
      jwtMiddleware.authenticate(userRepository),
      jwtMiddleware.authorize(['admin']),
      (req: AuthRequest, res: Response) => adminController.getUsers(req, res)
    );

    // Backup Routes
    adminRoutes.get(
      '/backups',
      jwtMiddleware.authenticate(userRepository),
      jwtMiddleware.authorize(['admin']),
      (req: AuthRequest, res: Response) => backupController.list(req, res)
    );

    adminRoutes.post(
      '/backups',
      jwtMiddleware.authenticate(userRepository),
      jwtMiddleware.authorize(['admin']),
      (req: AuthRequest, res: Response) => backupController.create(req, res)
    );

    adminRoutes.delete(
      '/backups/:filename',
      jwtMiddleware.authenticate(userRepository),
      jwtMiddleware.authorize(['admin']),
      (req: AuthRequest, res: Response) => backupController.delete(req, res)
    );

    adminRoutes.get(
      '/backups/:filename/download',
      jwtMiddleware.authenticate(userRepository),
      jwtMiddleware.authorize(['admin']),
      (req: AuthRequest, res: Response) => backupController.download(req, res)
    );

    adminRoutes.get(
      '/debug/fs',
      (req: Request, res: Response) => adminController.debugFS(req, res)
    );

    app.use('/api/admin', adminRoutes);

    // Report Routes
    const reportService = new ReportService(proxmoxService, projectService, healthCheckService, alertService);
    const reportController = new ReportController(reportService);

    const reportRoutes = express.Router();

    reportRoutes.get(
      '/infrastructure/summary',
      jwtMiddleware.authenticate(userRepository),
      (req: AuthRequest, res: Response) => reportController.getInfrastructureSummary(req, res)
    );

    app.use('/api/reports', reportRoutes);

    // API Info endpoint
    app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'Infrastruktur-Manager API',
        version: '0.1.0',
        endpoints: {
          auth: '/api/auth',
          health: '/health',
        },
      });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.path} not found`,
      });
    });

    // Error handler (must be last)
    app.use(errorHandler);

    // ============================================
    // Start Server
    // ============================================

    app.listen(port, () => {
      logger.info(`🚀 Server started on port ${port}`);
      console.log(`📍 http://localhost:${port}`);
      console.log(`📍 API: http://localhost:${port}/api`);
      console.log(`📍 Health: http://localhost:${port}/health`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Bootstrap failed: ${message}`, { error });
    console.error(`❌ Bootstrap failed:`, error);
    process.exit(1);
  }
}

// Start the application
bootstrap();

export default app;
