import { Repository } from 'typeorm';
import { ProjectDatabase, DatabaseType } from '../entities/ProjectDatabase.entity';
import { DatabaseQueryLog } from '../entities/DatabaseQueryLog.entity';
import { decrypt, DecryptionInput } from '../utils/encryption.util';
import logger from '../utils/logger';
import { QueryValidationService } from './QueryValidationService';

export interface QueryResult {
  success: boolean;
  rows: any[];
  rowCount: number;
  executionTime: number;
  error?: string;
}

export interface TableInfo {
  name: string;
  rowCount?: number;
  type: 'table' | 'view';
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isIndex: boolean;
  defaultValue?: string;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

/**
 * Abstract database client interface
 */
abstract class DatabaseClient {
  protected database: ProjectDatabase;
  protected isConnected = false;
  protected connectionTimeout = 10000; // 10 seconds

  constructor(database: ProjectDatabase) {
    this.database = database;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract executeQuery(query: string, timeoutMs?: number): Promise<QueryResult>;
  abstract listTables(): Promise<TableInfo[]>;
  abstract describeTable(tableName: string): Promise<TableSchema>;
  abstract testConnection(): Promise<boolean>;
}

/**
 * MySQL implementation
 */
class MySQLClient extends DatabaseClient {
  private connection: any = null;

  async connect(): Promise<boolean> {
    try {
      const mysql = require('mysql2/promise');

      const { host, port, username, password, database } = this.extractCredentials();

      this.connection = await mysql.createConnection({
        host,
        port: parseInt(port),
        user: username,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelayMs: 0,
      });

      this.isConnected = true;
      return true;
    } catch (error) {
      logger.error('MySQL connection failed', { error: String(error) });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.isConnected = false;
    }
  }

  async executeQuery(query: string, timeoutMs = 10000): Promise<QueryResult> {
    if (!this.isConnected) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: 'Database not connected',
      };
    }

    const startTime = Date.now();

    try {
      const [rows] = await Promise.race([
        this.connection.query(query),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        ),
      ]);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        rows: Array.isArray(rows) ? rows.slice(0, 1000) : [],
        rowCount: Array.isArray(rows) ? Math.min(rows.length, 1000) : 0,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTime,
        error: String(error),
      };
    }
  }

  async listTables(): Promise<TableInfo[]> {
    if (!this.isConnected) return [];

    try {
      const [tables] = await this.connection.query(
        `SELECT TABLE_NAME as name, TABLE_TYPE as type FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
        [this.database.type === DatabaseType.MYSQL ? this.extractCredentials().database : 'public']
      );

      return tables.map((t: any) => ({
        name: t.name,
        type: t.type === 'BASE TABLE' ? 'table' : 'view',
      }));
    } catch (error) {
      logger.error('Failed to list tables', { error: String(error) });
      return [];
    }
  }

  async describeTable(tableName: string): Promise<TableSchema> {
    if (!this.isConnected) {
      return { tableName, columns: [] };
    }

    try {
      const [columns] = await this.connection.query(
        `SELECT COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable,
                COLUMN_KEY as keyType, COLUMN_DEFAULT as defaultValue
         FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?`,
        [tableName, this.extractCredentials().database]
      );

      return {
        tableName,
        columns: columns.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable === 'YES',
          isPrimaryKey: col.keyType === 'PRI',
          isIndex: col.keyType !== '',
          defaultValue: col.defaultValue,
        })),
      };
    } catch (error) {
      logger.error('Failed to describe table', { error: String(error) });
      return { tableName, columns: [] };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const [result] = await this.connection.query('SELECT 1 as test');
      return result.length > 0;
    } catch {
      return false;
    }
  }

  private extractCredentials() {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY not configured');

    const decrypted = decrypt({
      encrypted: this.database.encrypted_data,
      iv: this.database.iv,
      salt: this.database.salt,
      authTag: this.database.auth_tag,
      masterKey,
    });

    return JSON.parse(decrypted);
  }
}

/**
 * PostgreSQL implementation
 */
class PostgreSQLClient extends DatabaseClient {
  private pool: any = null;

  async connect(): Promise<boolean> {
    try {
      const { Pool } = require('pg');
      const { host, port, username, password, database } = this.extractCredentials();

      this.pool = new Pool({
        host,
        port: parseInt(port),
        user: username,
        password,
        database,
        max: 5,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: this.connectionTimeout,
      });

      // Test the pool
      const client = await this.pool.connect();
      client.release();

      this.isConnected = true;
      return true;
    } catch (error) {
      logger.error('PostgreSQL connection failed', { error: String(error) });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }

  async executeQuery(query: string, timeoutMs = 10000): Promise<QueryResult> {
    if (!this.isConnected) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: 'Database not connected',
      };
    }

    const startTime = Date.now();

    try {
      const client = await this.pool.connect();

      try {
        // Set query timeout
        await client.query(`SET statement_timeout = ${timeoutMs}`);

        // Execute query with LIMIT 1000
        const queryWithLimit = query.toUpperCase().includes('LIMIT') ? query : `${query} LIMIT 1000`;
        const result = await client.query(queryWithLimit);

        const executionTime = Date.now() - startTime;

        return {
          success: true,
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          executionTime,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTime,
        error: String(error),
      };
    }
  }

  async listTables(): Promise<TableInfo[]> {
    if (!this.isConnected) return [];

    try {
      const client = await this.pool.connect();

      try {
        const result = await client.query(`
          SELECT table_name as name, 'table' as type
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `);

        return result.rows.map((row: any) => ({
          name: row.name,
          type: row.type,
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to list tables', { error: String(error) });
      return [];
    }
  }

  async describeTable(tableName: string): Promise<TableSchema> {
    if (!this.isConnected) {
      return { tableName, columns: [] };
    }

    try {
      const client = await this.pool.connect();

      try {
        const result = await client.query(`
          SELECT
            column_name as name,
            data_type as type,
            is_nullable as nullable,
            column_default as "defaultValue"
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        // Check for primary key
        const pkResult = await client.query(`
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid
          AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass
          AND i.indisprimary
        `, [tableName]);

        const primaryKeys = new Set(pkResult.rows.map((r: any) => r.attname));

        return {
          tableName,
          columns: result.rows.map((col: any) => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable === 'YES',
            isPrimaryKey: primaryKeys.has(col.name),
            isIndex: primaryKeys.has(col.name),
            defaultValue: col.defaultValue,
          })),
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to describe table', { error: String(error) });
      return { tableName, columns: [] };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query('SELECT 1 as test');
        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch {
      return false;
    }
  }

  private extractCredentials() {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY not configured');

    const decrypted = decrypt({
      encrypted: this.database.encrypted_data,
      iv: this.database.iv,
      salt: this.database.salt,
      authTag: this.database.auth_tag,
      masterKey,
    });

    return JSON.parse(decrypted);
  }
}

/**
 * Main Database Query Service
 */
export class DatabaseQueryService {
  private validationService: QueryValidationService;
  private clients: Map<string, DatabaseClient> = new Map();

  constructor(
    private databaseRepository: Repository<ProjectDatabase>,
    private queryLogRepository: Repository<DatabaseQueryLog>
  ) {
    this.validationService = new QueryValidationService();
  }

  /**
   * Execute a SQL query on a project database
   */
  async executeQuery(userId: string, dbId: string, query: string): Promise<QueryResult> {
    // Validate database access
    const database = await this.validateDatabaseAccess(userId, dbId);
    if (!database) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: 'Database not found or access denied',
      };
    }

    // Validate query
    const validation = this.validationService.validateQuery(query);
    if (!validation.valid) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: validation.errors.join('; '),
      };
    }

    // Get or create client
    const client = await this.getClient(database);
    if (!client) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: 'Failed to connect to database',
      };
    }

    // Execute query
    const result = await client.executeQuery(query);

    // Log query
    await this.logQuery(userId, dbId, query, result);

    return result;
  }

  /**
   * List tables in a database
   */
  async listTables(userId: string, dbId: string): Promise<TableInfo[]> {
    const database = await this.validateDatabaseAccess(userId, dbId);
    if (!database) return [];

    const client = await this.getClient(database);
    if (!client) return [];

    return client.listTables();
  }

  /**
   * Get table schema
   */
  async describeTable(userId: string, dbId: string, tableName: string): Promise<TableSchema> {
    const database = await this.validateDatabaseAccess(userId, dbId);
    if (!database) {
      return { tableName, columns: [] };
    }

    const client = await this.getClient(database);
    if (!client) {
      return { tableName, columns: [] };
    }

    return client.describeTable(tableName);
  }

  /**
   * Test database connection
   */
  async testConnection(userId: string, dbId: string): Promise<boolean> {
    const database = await this.validateDatabaseAccess(userId, dbId);
    if (!database) return false;

    try {
      const client = await this.getClient(database);
      if (!client) return false;

      const connected = await client.testConnection();

      if (connected) {
        database.last_tested = new Date();
        await this.databaseRepository.save(database);
        logger.info(`Database connection test successful for ${dbId}`);
      }

      return connected;
    } catch (error) {
      logger.error(`Database connection test failed for ${dbId}`, { error: String(error) });
      return false;
    }
  }

  /**
   * Get query history
   */
  async getQueryHistory(userId: string, dbId: string, limit = 50): Promise<DatabaseQueryLog[]> {
    const database = await this.validateDatabaseAccess(userId, dbId);
    if (!database) return [];

    return this.queryLogRepository.find({
      where: { database_id: dbId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get or create database client with connection pooling
   */
  private async getClient(database: ProjectDatabase): Promise<DatabaseClient | null> {
    if (this.clients.has(database.id)) {
      return this.clients.get(database.id)!;
    }

    try {
      const ClientClass = database.type === DatabaseType.MYSQL ? MySQLClient : PostgreSQLClient;
      const client = new ClientClass(database);

      if (await client.connect()) {
        this.clients.set(database.id, client);
        return client;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to create database client`, { error: String(error) });
      return null;
    }
  }

  /**
   * Validate database access (user ownership)
   */
  private async validateDatabaseAccess(userId: string, dbId: string): Promise<ProjectDatabase | null> {
    try {
      const database = await this.databaseRepository.findOne({
        where: { id: dbId, user_id: userId },
        relations: ['project'],
      });

      if (!database || database.is_deleted) {
        return null;
      }

      return database;
    } catch (error) {
      logger.error('Database access validation failed', { error: String(error) });
      return null;
    }
  }

  /**
   * Log query execution
   */
  private async logQuery(userId: string, dbId: string, query: string, result: QueryResult): Promise<void> {
    try {
      const log = this.queryLogRepository.create({
        database_id: dbId,
        user_id: userId,
        query: this.validationService.sanitizeForLogging(query),
        row_count: result.rowCount,
        execution_time_ms: result.executionTime,
        status: result.success ? 'success' : 'error',
        error_message: result.error,
      });

      await this.queryLogRepository.save(log);
    } catch (error) {
      logger.error('Failed to log query', { error: String(error) });
    }
  }

  /**
   * Cleanup - disconnect all clients
   */
  async cleanup(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect();
    }
    this.clients.clear();
  }
}
