import { Request, Response } from 'express';
import { CredentialsService } from '../services/CredentialsService';
import { CredentialType } from '../entities/Credential.entity';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/jwt.middleware';

import { ProxmoxService } from '../services/ProxmoxService';
import { GitHubService } from '../services/GitHubService';

export class CredentialsController {
  // Constructor requires 3 services as of latest update
  constructor(
    private credentialsService: CredentialsService,
    private proxmoxService: ProxmoxService,
    private githubService: GitHubService
  ) { }

  /**
   * POST /api/credentials/:id/test
   * Test a credential connection
   */
  async test(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const credential = await this.credentialsService.findById(req.user.id, id);

      if (!credential) {
        res.status(404).json({
          success: false,
          message: 'Credential not found',
        });
        return;
      }

      let success = false;
      let message = '';

      if (credential.type === CredentialType.PROXMOX) {
        success = await this.proxmoxService.initialize(req.user.id, id);
        message = success ? 'Proxmox connection successful' : 'Proxmox connection failed';
      } else if (credential.type === CredentialType.GITHUB) {
        // For GitHub, initialization includes testing connection
        success = await this.githubService.initialize(req.user.id);
        message = success ? 'GitHub connection successful' : 'GitHub connection failed';
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported credential type for testing',
        });
        return;
      }

      res.json({
        success,
        message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test failed';
      logger.error(message, { endpoint: '/api/credentials/:id/test', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }


  /**
   * POST /api/credentials
   * Create a new credential
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { name, type, value, description } = req.body;

      // Validate required fields
      if (!name || !type || !value) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, type, value',
        });
        return;
      }

      // Validate type is a known credential type
      if (!Object.values(CredentialType).includes(type)) {
        res.status(400).json({
          success: false,
          message: `Invalid credential type. Must be one of: ${Object.values(CredentialType).join(', ')}`,
        });
        return;
      }

      const credential = await this.credentialsService.create(req.user.id, {
        name,
        type,
        value,
        description,
      });

      res.status(201).json({
        success: true,
        message: 'Credential created successfully',
        data: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          created_at: credential.created_at,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create credential';
      logger.error(message, { endpoint: '/api/credentials', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/credentials
   * List all credentials for the authenticated user
   */
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const credentials = await this.credentialsService.findAll(req.user.id);

      res.json({
        success: true,
        data: credentials,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch credentials';
      logger.error(message, { endpoint: '/api/credentials', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/credentials/:id
   * Get a single credential (returns encrypted data to prevent accidental exposure)
   */
  async getOne(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const credential = await this.credentialsService.findById(req.user.id, id);

      if (!credential) {
        res.status(404).json({
          success: false,
          message: 'Credential not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          description: credential.description,
          created_at: credential.created_at,
          updated_at: credential.updated_at,
          last_used: credential.last_used,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch credential';
      logger.error(message, { endpoint: '/api/credentials/:id', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * PUT /api/credentials/:id
   * Update a credential
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const { name, value, description } = req.body;

      const credential = await this.credentialsService.update(req.user.id, id, {
        name,
        value,
        description,
      });

      res.json({
        success: true,
        message: 'Credential updated successfully',
        data: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          updated_at: credential.updated_at,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update credential';
      logger.error(message, { endpoint: '/api/credentials/:id', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * DELETE /api/credentials/:id
   * Delete a credential
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      await this.credentialsService.delete(req.user.id, id);

      res.json({
        success: true,
        message: 'Credential deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete credential';
      logger.error(message, { endpoint: '/api/credentials/:id', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/credentials/:id/decrypt
   * Decrypt and return credential value (careful - only for display, not for logging!)
   */
  async decrypt(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const credential = await this.credentialsService.findById(req.user.id, id);

      if (!credential) {
        res.status(404).json({
          success: false,
          message: 'Credential not found',
        });
        return;
      }

      const decryptedValue = await this.credentialsService.decrypt(credential);

      logger.warn(`Credential decrypted by user ${req.user.username}`, {
        credentialId: credential.id,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Credential decrypted. Be careful with sensitive data!',
        data: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          value: decryptedValue,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to decrypt credential';
      logger.error(message, { endpoint: '/api/credentials/:id/decrypt', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/credentials/type/:type
   * List all credentials of a specific type
   */
  async listByType(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { type } = req.params;

      if (!Object.values(CredentialType).includes(type as CredentialType)) {
        res.status(400).json({
          success: false,
          message: `Invalid credential type. Must be one of: ${Object.values(CredentialType).join(', ')}`,
        });
        return;
      }

      const credentials = await this.credentialsService.findByType(req.user.id, type as CredentialType);

      res.json({
        success: true,
        data: credentials,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch credentials';
      logger.error(message, { endpoint: '/api/credentials/type/:type', userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }
}
