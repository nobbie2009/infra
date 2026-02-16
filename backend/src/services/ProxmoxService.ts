import { Repository } from 'typeorm';
import { ProxmoxClient, ProxmoxVM, ProxmoxNode } from '../clients/ProxmoxClient';
import { Credential, CredentialType } from '../entities/Credential.entity';
import { decrypt, DecryptionInput } from '../utils/encryption.util';
import logger from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

export class ProxmoxService {
  private proxmoxClient: ProxmoxClient | null = null;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheDefaultTTL = 5 * 60 * 1000; // 5 minutes

  constructor(private credentialRepository: Repository<Credential>) { }

  /**
   * Initialize Proxmox client with stored credentials
   */
  async initialize(userId: string, credentialId?: string): Promise<boolean> {
    try {
      // Find Proxmox credential
      const credential = await this.credentialRepository.findOne({
        where: {
          user_id: userId,
          type: CredentialType.PROXMOX,
          ...(credentialId && { id: credentialId }),
        },
      });

      if (!credential) {
        logger.warn('No Proxmox credential found', { userId });
        return false;
      }

      // Decrypt credential
      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        logger.error('ENCRYPTION_MASTER_KEY not set');
        return false;
      }

      const decryptionInput: DecryptionInput = {
        encrypted: credential.encrypted_data,
        iv: credential.iv,
        salt: credential.salt,
        authTag: credential.auth_tag,
        masterKey,
      };

      let credentialData: any;
      try {
        const decrypted = decrypt(decryptionInput);
        credentialData = JSON.parse(decrypted);
      } catch (error) {
        logger.error('Failed to decrypt Proxmox credential', { error: String(error) });
        return false;
      }

      // Create client
      const endpoint = credentialData.endpoint || process.env.PROXMOX_API_ENDPOINT;
      const token = credentialData.token;
      const node = credentialData.node || process.env.PROXMOX_NODE || 'pve';

      if (!endpoint || !token) {
        logger.error('Invalid Proxmox credential data', { hasEndpoint: !!endpoint, hasToken: !!token });
        return false;
      }

      this.proxmoxClient = new ProxmoxClient(endpoint, token, node);

      // Test connection
      const connected = await this.proxmoxClient.testConnection();
      if (!connected) {
        logger.warn('Proxmox API connection test failed');
        return false;
      }

      if (connected) {
        credential.last_used = new Date();
        await this.credentialRepository.save(credential);
        logger.info('Proxmox client initialized', { endpoint, node });
      }
      return connected;
    } catch (error) {
      logger.error('Failed to initialize Proxmox client', { error: String(error) });
      return false;
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.proxmoxClient !== null;
  }

  /**
   * Clear cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cached data or fetch if expired
   */
  private async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.cacheDefaultTTL
  ): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      logger.debug(`Cache hit for ${key}`);
      return cached.data;
    }

    logger.debug(`Cache miss for ${key}, fetching...`);
    const data = await fetcher();

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    return data;
  }

  /**
   * Get all nodes
   */
  async getNodes(): Promise<ProxmoxNode[]> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    return this.getOrFetch('nodes', () => this.proxmoxClient!.getNodes());
  }

  /**
   * Get node status
   */
  async getNodeStatus(node: string): Promise<ProxmoxNode> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    return this.getOrFetch(`node-status:${node}`, () =>
      this.proxmoxClient!.getNodeStatus(node)
    );
  }

  /**
   * Get all VMs on a node
   */
  async getVMs(node: string): Promise<ProxmoxVM[]> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    return this.getOrFetch(`vms:${node}`, () => this.proxmoxClient!.getVMs(node));
  }

  /**
   * Get all Containers (LXC) on a node
   */
  async getContainers(node: string): Promise<ProxmoxVM[]> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    return this.getOrFetch(`containers:${node}`, () => this.proxmoxClient!.getContainers(node));
  }

  /**
   * Get all VMs across all nodes
   */
  async getAllVMs(): Promise<ProxmoxVM[]> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    try {
      // First try to use cluster resources (most efficient)
      const resources = await this.proxmoxClient.getResources();

      if (resources && resources.length > 0) {
        const vms = resources
          .filter(r => r.type === 'qemu' || r.type === 'lxc' || r.type === 'vm')
          .map(r => ({
            vmid: r.vmid,
            name: r.name || r.vmid.toString(),
            status: r.status as any,
            node: r.node,
            maxcpu: r.maxcpu || 0,
            maxmem: r.maxmem || 0,
            maxdisk: r.maxdisk || 0,
            cpu: r.cpu || 0,
            mem: r.mem || 0,
            uptime: r.uptime || 0,
            netin: 0,
            netout: 0,
            diskread: 0,
            diskwrite: 0
          }));

        if (vms.length > 0) {
          logger.info(`Found ${vms.length} VMs/LXC via cluster API`);
          return vms;
        }
      }

      // Fallback: iterate over nodes
      logger.info('Falling back to node-by-node VM fetching');
      const nodes = await this.getNodes();

      if (!nodes || nodes.length === 0) {
        logger.warn('No Proxmox nodes found! Check permissions for /nodes');
        return [];
      }

      const allVMs: ProxmoxVM[] = [];

      for (const node of nodes) {
        try {
          if (node.status !== 'online') continue;

          const [vms, containers] = await Promise.all([
            this.proxmoxClient.getVMs(node.node),
            this.proxmoxClient.getContainers(node.node)
          ]);
          allVMs.push(...vms, ...containers);
        } catch (error) {
          logger.error(`Failed to get VMs for node ${node.node}`, { error: String(error) });
        }
      }

      logger.info(`Total VMs/Containers found: ${allVMs.length}`);
      return allVMs;
    } catch (error) {
      logger.error('Failed to get all VMs', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get single VM details
   */
  async getVM(vmid: number, node: string): Promise<any> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    return this.getOrFetch(`vm:${node}:${vmid}`, async () => {
      const [status, config, network] = await Promise.all([
        this.proxmoxClient!.getVMStatus(vmid, node),
        this.proxmoxClient!.getVMConfig(vmid, node),
        this.proxmoxClient!.getVMNetwork(vmid, node),
      ]);

      return {
        status,
        config,
        network,
      };
    });
  }

  /**
   * Get VM network IPs from Proxmox
   * Returns first IPv4 and IPv6 if available
   */
  async getVMNetworkIPs(
    vmid: number,
    node: string
  ): Promise<{ ipv4?: string; ipv6?: string }> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    try {
      const network = await this.proxmoxClient.getVMNetwork(vmid, node);

      const result: { ipv4?: string; ipv6?: string } = {};

      // Extract first IPv4 and IPv6 from network interfaces
      for (const iface of network) {
        if (iface.address && !result.ipv4) {
          result.ipv4 = iface.address;
        }
        if (iface.address6 && !result.ipv6) {
          result.ipv6 = iface.address6;
        }
      }

      logger.info(`Retrieved network IPs for VM ${vmid}`, { ipv4: result.ipv4, ipv6: result.ipv6 });
      return result;
    } catch (error) {
      logger.warn(`Failed to get network IPs for VM ${vmid}`, { error: String(error) });
      return {};
    }
  }

  /**
   * Start VM (bypasses cache)
   */
  async startVM(vmid: number, node: string): Promise<string> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    const upid = await this.proxmoxClient.startVM(vmid, node);

    // Invalidate relevant caches
    this.clearCache(`vm:${node}:${vmid}`);
    this.clearCache(`vms:${node}`);

    return upid;
  }

  /**
   * Stop VM (bypasses cache)
   */
  async stopVM(vmid: number, node: string): Promise<string> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    const upid = await this.proxmoxClient.stopVM(vmid, node);

    // Invalidate relevant caches
    this.clearCache(`vm:${node}:${vmid}`);
    this.clearCache(`vms:${node}`);

    return upid;
  }

  /**
   * Restart VM (bypasses cache)
   */
  async restartVM(vmid: number, node: string): Promise<string> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    const upid = await this.proxmoxClient.restartVM(vmid, node);

    // Invalidate relevant caches
    this.clearCache(`vm:${node}:${vmid}`);
    this.clearCache(`vms:${node}`);

    return upid;
  }

  /**
   * Get task status
   */
  async getTaskStatus(upid: string): Promise<any> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    return this.proxmoxClient.getTaskStatus(upid);
  }

  /**
   * Get cluster status
   */
  async getClusterStatus(): Promise<any> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    return this.getOrFetch('cluster-status', () => this.proxmoxClient!.getClusterStatus());
  }

  /**
   * Get network topology
   */
  async getNetworkTopology(): Promise<any> {
    if (!this.proxmoxClient) {
      throw new Error('Proxmox client not initialized');
    }

    try {
      const nodes = await this.getNodes();
      const vms = await this.getAllVMs();

      const topology = {
        nodes: nodes.map((n) => ({
          id: n.node,
          label: n.node,
          status: n.status,
          cpu: n.cpu,
          mem: n.mem,
          disk: n.disk,
        })),
        vms: vms.map((v) => ({
          id: `vm-${v.vmid}`,
          label: v.name,
          status: v.status,
          node: v.node,
          cpu: v.cpu,
          mem: v.mem,
        })),
        connections: vms.map((v) => ({
          from: v.node,
          to: `vm-${v.vmid}`,
        })),
      };

      return topology;
    } catch (error) {
      logger.error('Failed to get network topology', { error: String(error) });
      throw error;
    }
  }
}
