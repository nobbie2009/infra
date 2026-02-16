import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { ProjectDatabase, DatabaseType } from '../entities/ProjectDatabase.entity';
import { DatabaseQueryLog } from '../entities/DatabaseQueryLog.entity';
import { Project } from '../entities/Project.entity';
import { DatabaseQueryService } from '../services/DatabaseQueryService';
import { encrypt } from '../utils/encryption.util';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export class DatabaseController {
  constructor(
    private databaseRepository: Repository<ProjectDatabase>,
    private queryLogRepository: Repository<DatabaseQueryLog>,
    private projectRepository: Repository<Project>,
    private queryService: DatabaseQueryService
  ) {}

  /**
   * Create new database connection for a project
   * POST /api/projects/:projectId/databases
   */
  async createDatabase(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      // Verify project ownership
      const project = await this.projectRepository.findOne({
        where: { id: projectId, userId },
      });

      if (!project) {
        res.status(403).json({ success: false, message: 'Project not found or access denied' });
        return;
      }

      const { name, type, host, port, username, password, database, ssl, description } = req.body;

      // Validate required fields
      if (!name || !type || !host || !port || !username || !password || !database) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Validate type
      if (!Object.values(DatabaseType).includes(type)) {
        res.status(400).json({ success: false, message: 'Invalid database type' });
        return;
      }

      // Validate port
      const portNum = parseInt(port);
      if (portNum < 1 || portNum > 65535) {
        res.status(400).json({ success: false, message: 'Port must be between 1 and 65535' });
        return;
      }

      // Encrypt credentials
      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        res.status(500).json({ success: false, message: 'Encryption key not configured' });
        return;
      }

      const credentialData = JSON.stringify({
        host,
        port,
        username,
        password,
        database,
        ssl: ssl || false,
      });

      const encrypted = encrypt(credentialData, masterKey);

      // Create database entry
      const projectDatabase = this.databaseRepository.create({
        project_id: projectId,
        user_id: userId,
        name,
        type,
        description,
        encrypted_data: encrypted.encrypted,
        iv: encrypted.iv,
        salt: encrypted.salt,
        auth_tag: encrypted.authTag,
        algorithm: 'aes-256-gcm-v1',
        status: 'active',
      });

      const saved = await this.databaseRepository.save(projectDatabase);

      res.status(201).json({
        success: true,
        message: 'Database connection created',
        database: saved.toJSON(),
      });
    } catch (error) {
      logger.error('Create database error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to create database connection' });
    }
  }

  /**
   * List databases for a project
   * GET /api/projects/:projectId/databases
   */
  async listDatabases(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      // Verify project ownership
      const project = await this.projectRepository.findOne({
        where: { id: projectId, userId },
      });

      if (!project) {
        res.status(403).json({ success: false, message: 'Project not found or access denied' });
        return;
      }

      const databases = await this.databaseRepository.find({
        where: {
          project_id: projectId,
          user_id: userId,
          is_deleted: false,
        },
      });

      res.json({
        success: true,
        databases: databases.map((db) => db.toJSON()),
      });
    } catch (error) {
      logger.error('List databases error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to list databases' });
    }
  }

  /**
   * Get single database
   * GET /api/databases/:id
   */
  async getDatabase(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const database = await this.databaseRepository.findOne({
        where: { id, user_id: userId, is_deleted: false },
        relations: ['project'],
      });

      if (!database) {
        res.status(404).json({ success: false, message: 'Database not found' });
        return;
      }

      res.json({
        success: true,
        database: database.toJSON(),
      });
    } catch (error) {
      logger.error('Get database error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to get database' });
    }
  }

  /**
   * Update database
   * PUT /api/databases/:id
   */
  async updateDatabase(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { name, description, status } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const database = await this.databaseRepository.findOne({
        where: { id, user_id: userId, is_deleted: false },
      });

      if (!database) {
        res.status(404).json({ success: false, message: 'Database not found' });
        return;
      }

      if (name) database.name = name;
      if (description) database.description = description;
      if (status && ['active', 'inactive'].includes(status)) {
        database.status = status;
      }

      const updated = await this.databaseRepository.save(database);

      res.json({
        success: true,
        message: 'Database updated',
        database: updated.toJSON(),
      });
    } catch (error) {
      logger.error('Update database error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to update database' });
    }
  }

  /**
   * Soft delete database
   * DELETE /api/databases/:id
   */
  async deleteDatabase(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const database = await this.databaseRepository.findOne({
        where: { id, user_id: userId, is_deleted: false },
      });

      if (!database) {
        res.status(404).json({ success: false, message: 'Database not found' });
        return;
      }

      database.is_deleted = true;
      await this.databaseRepository.save(database);

      res.json({
        success: true,
        message: 'Database deleted',
      });
    } catch (error) {
      logger.error('Delete database error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to delete database' });
    }
  }

  /**
   * Test database connection
   * POST /api/databases/:id/test
   */
  async testConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const connected = await this.queryService.testConnection(userId, id);

      res.json({
        success: connected,
        message: connected ? 'Connection successful' : 'Connection failed',
      });
    } catch (error) {
      logger.error('Test connection error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to test connection' });
    }
  }

  /**
   * Execute SQL query
   * POST /api/databases/:id/query
   */
  async executeQuery(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { query } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      if (!query) {
        res.status(400).json({ success: false, message: 'Query is required' });
        return;
      }

      const result = await this.queryService.executeQuery(userId, id, query);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount,
          executionTime: result.executionTime,
        },
      });
    } catch (error) {
      logger.error('Execute query error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to execute query' });
    }
  }

  /**
   * List tables in database
   * GET /api/databases/:id/tables
   */
  async listTables(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const tables = await this.queryService.listTables(userId, id);

      res.json({
        success: true,
        tables,
      });
    } catch (error) {
      logger.error('List tables error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to list tables' });
    }
  }

  /**
   * Get table schema
   * GET /api/databases/:id/tables/:tableName
   */
  async describeTable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, tableName } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const schema = await this.queryService.describeTable(userId, id, tableName);

      res.json({
        success: true,
        schema,
      });
    } catch (error) {
      logger.error('Describe table error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to describe table' });
    }
  }

  /**
   * Get query history
   * GET /api/databases/:id/history
   */
  async getQueryHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = '50' } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const limitNum = Math.min(parseInt(limit as string) || 50, 200);
      const history = await this.queryService.getQueryHistory(userId, id, limitNum);

      res.json({
        success: true,
        history,
      });
    } catch (error) {
      logger.error('Get query history error', { error: String(error) });
      res.status(500).json({ success: false, message: 'Failed to get query history' });
    }
  }
}
