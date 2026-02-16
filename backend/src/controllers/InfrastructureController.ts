import { Request, Response } from 'express';
import { IPManagementService } from '../services/IPManagementService';
import { HealthCheckService } from '../services/HealthCheckService';
import { ServiceType } from '../entities/Service.entity';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/jwt.middleware';

export class InfrastructureController {
  constructor(
    private ipManagementService: IPManagementService,
    private healthCheckService: HealthCheckService
  ) { }

  /**
   * GET /api/infrastructure/ip-allocations
   * Get all VMs with their IP addresses
   */
  async getAllAllocations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const allocations = await this.ipManagementService.getAllAllocations();

      res.json({
        success: true,
        data: {
          count: allocations.length,
          allocations,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get allocations';
      logger.error(message, { endpoint: '/api/infrastructure/ip-allocations' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/vms/:vmId
   * Get single VM with services
   */
  async getVM(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { vmId } = req.params;
      const vm = await this.ipManagementService.getVM(vmId);

      if (!vm) {
        res.status(404).json({
          success: false,
          message: 'VM not found',
        });
        return;
      }

      res.json({
        success: true,
        data: vm,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get VM';
      logger.error(message, { vmId: req.params.vmId });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * PUT /api/infrastructure/vms/:vmId
   * Update VM details (IPs, Description, Tags)
   */
  async updateVM(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { vmId } = req.params;
      const updates = req.body; // Expecting partial VM object

      const updated = await this.ipManagementService.updateVM(vmId, updates);

      res.json({
        success: true,
        message: 'VM updated successfully',
        data: updated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update VM';
      logger.error(message, { vmId: req.params.vmId });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/sync-vms
   * Sync VMs from Proxmox
   */
  async syncVMs(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const syncedVMs = await this.ipManagementService.syncVMsFromProxmox(req.user.id);

      logger.info(`User ${req.user.username} synced ${syncedVMs.length} VMs`, {
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: `Synced ${syncedVMs.length} VMs`,
        data: {
          count: syncedVMs.length,
          vms: syncedVMs,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync VMs';
      logger.error(message, { endpoint: '/api/infrastructure/sync-vms' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/refresh-vm-ips
   * Refresh VM IP addresses from Proxmox
   */
  async refreshVMIPs(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const updatedVMs = await this.ipManagementService.refreshVMIPsFromProxmox(req.user.id);

      logger.info(`User ${req.user.username} refreshed IPs for ${updatedVMs.length} VMs`, {
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: `Refreshed IPs for ${updatedVMs.length} VMs`,
        data: {
          count: updatedVMs.length,
          vms: updatedVMs,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh VM IPs';
      logger.error(message, { endpoint: '/api/infrastructure/refresh-vm-ips' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/vms/:vmId/services
   * Add service to VM
   */
  async addService(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { vmId } = req.params;
      const { name, type, port, protocol, url } = req.body;

      if (!name || !port) {
        res.status(400).json({
          success: false,
          message: 'Name and port are required',
        });
        return;
      }

      const service = await this.ipManagementService.addService(
        vmId,
        name,
        type as ServiceType,
        port,
        protocol || 'tcp',
        url
      );

      res.status(201).json({
        success: true,
        message: 'Service added successfully',
        data: service,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add service';
      logger.error(message, { vmId: req.params.vmId });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/vms/:vmId/services
   * Get all services for a VM
   */
  async getVMServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { vmId } = req.params;
      const services = await this.ipManagementService.getVMServices(vmId);

      res.json({
        success: true,
        data: {
          count: services.length,
          services,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get services';
      logger.error(message, { vmId: req.params.vmId });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * DELETE /api/infrastructure/services/:serviceId
   * Remove service
   */
  async removeService(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { serviceId } = req.params;
      await this.ipManagementService.removeService(serviceId);

      res.json({
        success: true,
        message: 'Service removed successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove service';
      logger.error(message, { serviceId: req.params.serviceId });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/health-check/:serviceId
   * Check service health
   */
  async checkServiceHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { serviceId } = req.params;
      const status = await this.ipManagementService.checkServiceHealth(serviceId);

      res.json({
        success: true,
        data: {
          serviceId,
          status,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Health check failed';
      logger.error(message, { serviceId: req.params.serviceId });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/health-check-all
   * Check all services health
   */
  async checkAllServicesHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const onlyEnabled = req.body.onlyEnabled !== false;
      const results = await this.ipManagementService.checkAllServices(onlyEnabled);

      logger.info(`User ${req.user.username} checked ${results.size} services`, {
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: `Checked ${results.size} services`,
        data: {
          count: results.size,
          results: Array.from(results.entries()).map(([id, status]) => ({ id, status })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Health check failed';
      logger.error(message, { endpoint: '/api/infrastructure/health-check-all' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/services/healthy
   * Get all healthy services
   */
  async getHealthyServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const services = await this.ipManagementService.getHealthyServices();

      res.json({
        success: true,
        data: {
          count: services.length,
          services,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get services';
      logger.error(message, { endpoint: '/api/infrastructure/services/healthy' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/services/unhealthy
   * Get all unhealthy services
   */
  async getUnhealthyServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const services = await this.ipManagementService.getUnhealthyServices();

      res.json({
        success: true,
        data: {
          count: services.length,
          services,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get services';
      logger.error(message, { endpoint: '/api/infrastructure/services/unhealthy' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/services/stats
   * Get service statistics
   */
  async getServiceStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const stats = await this.ipManagementService.getServiceStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get statistics';
      logger.error(message, { endpoint: '/api/infrastructure/services/stats' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }
}
