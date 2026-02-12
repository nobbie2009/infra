import { Request, Response } from 'express';
import { ProxmoxService } from '../services/ProxmoxService';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/jwt.middleware';

export class ProxmoxController {
  constructor(private proxmoxService: ProxmoxService) {}

  /**
   * POST /api/infrastructure/proxmox/init
   * Initialize Proxmox client with stored credentials
   */
  async initializeProxmox(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { credentialId } = req.body;

      const initialized = await this.proxmoxService.initialize(req.user.id, credentialId);

      if (!initialized) {
        res.status(400).json({
          success: false,
          message: 'Failed to initialize Proxmox connection. Check your credentials.',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Proxmox client initialized successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initialization failed';
      logger.error(message, { endpoint: '/api/infrastructure/proxmox/init' });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/proxmox/status
   * Get Proxmox connection status
   */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const isInitialized = this.proxmoxService.isInitialized();

      res.json({
        success: true,
        data: {
          initialized: isInitialized,
          message: isInitialized ? 'Connected' : 'Not connected',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get status',
      });
    }
  }

  /**
   * GET /api/infrastructure/nodes
   * Get all Proxmox nodes
   */
  async getNodes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const nodes = await this.proxmoxService.getNodes();

      res.json({
        success: true,
        data: nodes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get nodes';
      logger.error(message, { userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/nodes/:node
   * Get single node status
   */
  async getNodeStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { node } = req.params;

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const status = await this.proxmoxService.getNodeStatus(node);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get node status';
      logger.error(message, { node: req.params.node, userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/vms
   * Get all VMs across all nodes (or specific node if ?node=xxx)
   */
  async getVMs(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const node = req.query.node as string | undefined;
      let vms;

      if (node) {
        vms = await this.proxmoxService.getVMs(node);
      } else {
        vms = await this.proxmoxService.getAllVMs();
      }

      // Apply filters if provided
      let filtered = vms;

      if (req.query.status) {
        filtered = filtered.filter((vm) => vm.status === req.query.status);
      }

      if (req.query.name) {
        const searchTerm = (req.query.name as string).toLowerCase();
        filtered = filtered.filter((vm) => vm.name.toLowerCase().includes(searchTerm));
      }

      res.json({
        success: true,
        data: {
          count: filtered.length,
          vms: filtered,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get VMs';
      logger.error(message, { userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/vms/:vmid
   * Get single VM details
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

      const { vmid, node } = req.params;

      if (!node) {
        res.status(400).json({
          success: false,
          message: 'Node parameter required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const vm = await this.proxmoxService.getVM(parseInt(vmid), node);

      res.json({
        success: true,
        data: vm,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get VM details';
      logger.error(message, { vmid: req.params.vmid, userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/vms/:vmid/start
   * Start a VM
   */
  async startVM(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { vmid, node } = req.params;

      if (!node) {
        res.status(400).json({
          success: false,
          message: 'Node parameter required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const upid = await this.proxmoxService.startVM(parseInt(vmid), node);

      logger.info(`User ${req.user.username} started VM ${vmid}`, { vmid, node });

      res.json({
        success: true,
        message: `VM ${vmid} start initiated`,
        data: { upid },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start VM';
      logger.error(message, { vmid: req.params.vmid, userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/vms/:vmid/stop
   * Stop a VM
   */
  async stopVM(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { vmid, node } = req.params;

      if (!node) {
        res.status(400).json({
          success: false,
          message: 'Node parameter required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const upid = await this.proxmoxService.stopVM(parseInt(vmid), node);

      logger.info(`User ${req.user.username} stopped VM ${vmid}`, { vmid, node });

      res.json({
        success: true,
        message: `VM ${vmid} stop initiated`,
        data: { upid },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop VM';
      logger.error(message, { vmid: req.params.vmid, userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * POST /api/infrastructure/vms/:vmid/restart
   * Restart a VM
   */
  async restartVM(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { vmid, node } = req.params;

      if (!node) {
        res.status(400).json({
          success: false,
          message: 'Node parameter required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const upid = await this.proxmoxService.restartVM(parseInt(vmid), node);

      logger.info(`User ${req.user.username} restarted VM ${vmid}`, { vmid, node });

      res.json({
        success: true,
        message: `VM ${vmid} restart initiated`,
        data: { upid },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restart VM';
      logger.error(message, { vmid: req.params.vmid, userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/topology
   * Get network topology data
   */
  async getTopology(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const topology = await this.proxmoxService.getNetworkTopology();

      res.json({
        success: true,
        data: topology,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get topology';
      logger.error(message, { userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }

  /**
   * GET /api/infrastructure/cluster-status
   * Get cluster status
   */
  async getClusterStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!this.proxmoxService.isInitialized()) {
        res.status(400).json({
          success: false,
          message: 'Proxmox not initialized',
        });
        return;
      }

      const status = await this.proxmoxService.getClusterStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get cluster status';
      logger.error(message, { userId: req.user?.id });

      res.status(500).json({
        success: false,
        message,
      });
    }
  }
}
