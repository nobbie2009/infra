import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

export interface ProxmoxNode {
  node: string;
  status: 'online' | 'offline';
  uptime: number;
  maxcpu: number;
  maxmem: number;
  maxdisk: number;
  cpu: number;
  mem: number;
  disk: number;
}

export interface ProxmoxVM {
  vmid: number;
  name: string;
  status: 'running' | 'stopped' | 'paused';
  node: string;
  maxcpu: number;
  maxmem: number;
  maxdisk: number;
  cpu: number;
  mem: number;
  uptime: number;
  netin: number;
  netout: number;
  diskread: number;
  diskwrite: number;
}

export interface ProxmoxVMConfig {
  vmid: number;
  name: string;
  status: string;
  node: string;
  cores: number;
  memory: number;
  sockets: number;
  description?: string;
  ipaddress?: string;
}

export interface ProxmoxNetworkInterface {
  iface: string;
  type: string;
  address?: string;
  address6?: string;
  gateway?: string;
  gateway6?: string;
}

export interface ProxmoxTask {
  id: string;
  type: string;
  status: 'stopped' | 'running';
  exitstatus?: string;
  upid: string;
}

export class ProxmoxClient {
  private client: AxiosInstance;
  private apiToken: string;
  private endpoint: string;
  private node: string;

  constructor(endpoint: string, token: string, node: string = 'pve') {
    this.endpoint = endpoint;
    this.apiToken = token;
    this.node = node;

    // Create axios client with basic config
    this.client = axios.create({
      baseURL: endpoint,
      timeout: 10000,
    });

    // Allow self-signed certificates by disabling strict SSL validation
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    // Add auth header
    this.client.defaults.headers.common['Authorization'] = `PVEAPIToken=${token}`;
  }

  /**
   * Get all nodes in the cluster
   */
  async getNodes(): Promise<ProxmoxNode[]> {
    try {
      const response = await this.client.get('/api2/json/nodes');
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to get Proxmox nodes', { error: String(error) });
      throw new Error('Failed to fetch Proxmox nodes');
    }
  }

  /**
   * Get node status
   */
  async getNodeStatus(node: string = this.node): Promise<ProxmoxNode> {
    try {
      const response = await this.client.get(`/api2/json/nodes/${node}/status`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get node status for ${node}`, { error: String(error) });
      throw new Error(`Failed to fetch status for node ${node}`);
    }
  }

  /**
   * Get all cluster resources (VMs, Containers, Storage, etc.)
   */
  async getResources(type?: 'vm' | 'lxc'): Promise<any[]> {
    try {
      const url = type ? `/api2/json/cluster/resources?type=${type}` : '/api2/json/cluster/resources';
      const response = await this.client.get(url);
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to get Proxmox cluster resources', { error: String(error) });
      return [];
    }
  }

  /**
   * Get all VMs on a node (QEMU)
   */
  async getVMs(node: string = this.node): Promise<ProxmoxVM[]> {
    try {
      const response = await this.client.get(`/api2/json/nodes/${node}/qemu`);
      const vms = response.data.data || [];
      return this.enrichVMList(vms, node, 'qemu');
    } catch (error) {
      logger.error(`Failed to get VMs for node ${node}`, { error: String(error) });
      return [];
    }
  }

  /**
   * Get all Containers on a node (LXC)
   */
  async getContainers(node: string = this.node): Promise<ProxmoxVM[]> {
    try {
      const response = await this.client.get(`/api2/json/nodes/${node}/lxc`);
      const containers = response.data.data || [];
      return this.enrichVMList(containers, node, 'lxc');
    } catch (error) {
      logger.error(`Failed to get containers for node ${node}`, { error: String(error) });
      return [];
    }
  }

  /**
   * Enrich VM/Container list with details
   */
  private async enrichVMList(items: any[], node: string, type: 'qemu' | 'lxc'): Promise<ProxmoxVM[]> {
    const enriched: ProxmoxVM[] = [];

    for (const item of items) {
      try {
        // For simple list, we can use the data we already have if we don't want to spam API
        // But for status consistency, we can call individual status
        const status = await (type === 'qemu'
          ? this.getVMStatus(item.vmid, node)
          : this.getContainerStatus(item.vmid, node));

        enriched.push({
          vmid: item.vmid,
          name: item.name || item.vmid.toString(),
          status: status.status as any,
          node,
          maxcpu: status.maxcpu || item.maxcpu || 0,
          maxmem: status.maxmem || item.maxmem || 0,
          maxdisk: status.maxdisk || item.maxdisk || 0,
          cpu: status.cpu || 0,
          mem: status.mem || 0,
          uptime: status.uptime || 0,
          netin: status.netin || 0,
          netout: status.netout || 0,
          diskread: status.diskread || 0,
          diskwrite: status.diskwrite || 0,
        });
      } catch (err) {
        logger.warn(`Failed to enrich ${type} ${item.vmid}`, { error: String(err) });
        enriched.push({
          vmid: item.vmid,
          name: item.name || item.vmid.toString(),
          status: 'stopped',
          node,
          maxcpu: item.maxcpu || 0,
          maxmem: item.maxmem || 0,
          maxdisk: item.maxdisk || 0,
          cpu: 0,
          mem: 0,
          uptime: 0,
          netin: 0,
          netout: 0,
          diskread: 0,
          diskwrite: 0,
        });
      }
    }

    return enriched;
  }

  /**
   * Get single Container status
   */
  async getContainerStatus(vmid: number, node: string = this.node): Promise<any> {
    try {
      const response = await this.client.get(
        `/api2/json/nodes/${node}/lxc/${vmid}/status/current`
      );
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get LXC ${vmid} status`, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get single VM status
   */
  async getVMStatus(vmid: number, node: string = this.node): Promise<any> {
    try {
      const response = await this.client.get(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/current`
      );
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get VM ${vmid} status`, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get VM config
   */
  async getVMConfig(vmid: number, node: string = this.node): Promise<ProxmoxVMConfig> {
    try {
      const response = await this.client.get(`/api2/json/nodes/${node}/qemu/${vmid}/config`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get VM ${vmid} config`, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get VM network interfaces and IPs
   */
  /**
   * Get VM network interfaces and IPs via QEMU Guest Agent
   */
  async getVMNetwork(vmid: number, node: string = this.node): Promise<ProxmoxNetworkInterface[]> {
    try {
      // Try QEMU Guest Agent first (most reliable for IPs)
      try {
        const response = await this.client.get(
          `/api2/json/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`
        );
        const agentInterfaces = response.data.data.result || [];

        // Transform agent format to current format
        return agentInterfaces.map((iface: any) => {
          const ipv4 = iface['ip-addresses']?.find((ip: any) => ip['ip-address-type'] === 'ipv4')?.['ip-address'];
          const ipv6 = iface['ip-addresses']?.find((ip: any) => ip['ip-address-type'] === 'ipv6')?.['ip-address'];

          return {
            iface: iface.name,
            type: 'agent',
            address: ipv4,
            address6: ipv6
          };
        });
      } catch (agentError) {
        // Fallback or just ignore if agent not running
        logger.debug(`Agent network fetch failed for ${vmid} (Agent might not be running)`, { error: String(agentError) });
      }

      // Fallback to config/interfaces if agent fails (though this usually just gives MACs)
      const response = await this.client.get(
        `/api2/json/nodes/${node}/qemu/${vmid}/interfaces`
      );
      return response.data.data || [];
    } catch (error) {
      logger.warn(`Failed to get VM ${vmid} network info`, { error: String(error) });
      return [];
    }
  }

  /**
   * Start VM
   */
  async startVM(vmid: number, node: string = this.node): Promise<string> {
    try {
      const response = await this.client.post(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/start`,
        {}
      );
      logger.info(`VM ${vmid} start initiated`, { node });
      return response.data.data; // Returns UPID
    } catch (error) {
      logger.error(`Failed to start VM ${vmid}`, { error: String(error) });
      throw new Error(`Failed to start VM ${vmid}`);
    }
  }

  /**
   * Stop VM
   */
  async stopVM(vmid: number, node: string = this.node): Promise<string> {
    try {
      const response = await this.client.post(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/stop`,
        {}
      );
      logger.info(`VM ${vmid} stop initiated`, { node });
      return response.data.data; // Returns UPID
    } catch (error) {
      logger.error(`Failed to stop VM ${vmid}`, { error: String(error) });
      throw new Error(`Failed to stop VM ${vmid}`);
    }
  }

  /**
   * Restart VM
   */
  async restartVM(vmid: number, node: string = this.node): Promise<string> {
    try {
      const response = await this.client.post(
        `/api2/json/nodes/${node}/qemu/${vmid}/status/reboot`,
        {}
      );
      logger.info(`VM ${vmid} restart initiated`, { node });
      return response.data.data; // Returns UPID
    } catch (error) {
      logger.error(`Failed to restart VM ${vmid}`, { error: String(error) });
      throw new Error(`Failed to restart VM ${vmid}`);
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(upid: string): Promise<ProxmoxTask> {
    try {
      const response = await this.client.get(`/api2/json/nodes/${this.node}/tasks/${upid}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get task status for ${upid}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * Test connection to Proxmox API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api2/json/version');
      logger.info('Proxmox API connection successful', {
        version: response.data.data?.version,
      });
      return true;
    } catch (error) {
      logger.error('Proxmox API connection failed', { error: String(error) });
      return false;
    }
  }

  /**
   * Get cluster status
   */
  async getClusterStatus(): Promise<any> {
    try {
      const response = await this.client.get('/api2/json/cluster/status');
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get cluster status', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get network configuration for a node
   */
  async getNodeNetwork(node: string = this.node): Promise<any> {
    try {
      const response = await this.client.get(`/api2/json/nodes/${node}/network`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get network config for ${node}`, { error: String(error) });
      return { interfaces: [] };
    }
  }
}
