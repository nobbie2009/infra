import { Repository } from 'typeorm';
import { VM } from '../entities/VM.entity';
import { ProxmoxService } from './ProxmoxService';
import { ProxmoxVM } from '../clients/ProxmoxClient';
import logger from '../utils/logger';

export interface VMSyncResult {
  created: number;
  updated: number;
  deleted: number;
  total: number;
}

export class VMSyncService {
  constructor(
    private vmRepository: Repository<VM>,
    private proxmoxService: ProxmoxService
  ) {}

  /**
   * Sync VMs from Proxmox to database
   */
  async syncVMs(): Promise<VMSyncResult> {
    try {
      if (!this.proxmoxService.isInitialized()) {
        throw new Error('Proxmox service not initialized');
      }

      logger.info('Starting VM sync...');

      // Fetch all VMs from Proxmox
      const proxmoxVMs = await this.proxmoxService.getAllVMs();
      logger.info(`Fetched ${proxmoxVMs.length} VMs from Proxmox`);

      let created = 0;
      let updated = 0;

      // Upsert each VM
      for (const proxmoxVM of proxmoxVMs) {
        try {
          const existing = await this.vmRepository.findOne({
            where: {
              vmid: proxmoxVM.vmid,
              node: proxmoxVM.node,
            },
          });

          if (existing) {
            // Update existing VM
            existing.name = proxmoxVM.name;
            existing.status = proxmoxVM.status as any;
            existing.cpu_cores = proxmoxVM.maxcpu || 0;
            existing.memory_mb = proxmoxVM.maxmem ? Math.floor(proxmoxVM.maxmem / 1024 / 1024) : 0;
            existing.disk_gb = proxmoxVM.maxdisk ? Math.floor(proxmoxVM.maxdisk / 1024 / 1024 / 1024) : 0;
            existing.network_in = proxmoxVM.netin || 0;
            existing.network_out = proxmoxVM.netout || 0;
            existing.last_sync = new Date();

            await this.vmRepository.save(existing);
            updated++;
          } else {
            // Create new VM
            const newVM = this.vmRepository.create({
              vmid: proxmoxVM.vmid,
              node: proxmoxVM.node,
              name: proxmoxVM.name,
              status: proxmoxVM.status as any,
              cpu_cores: proxmoxVM.maxcpu || 0,
              memory_mb: proxmoxVM.maxmem ? Math.floor(proxmoxVM.maxmem / 1024 / 1024) : 0,
              disk_gb: proxmoxVM.maxdisk ? Math.floor(proxmoxVM.maxdisk / 1024 / 1024 / 1024) : 0,
              network_in: proxmoxVM.netin || 0,
              network_out: proxmoxVM.netout || 0,
              last_sync: new Date(),
            });

            await this.vmRepository.save(newVM);
            created++;
          }
        } catch (error) {
          logger.warn(`Failed to sync VM ${proxmoxVM.vmid}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Mark VMs as deleted if they no longer exist in Proxmox
      const dbVMs = await this.vmRepository.find();
      let deleted = 0;

      for (const dbVM of dbVMs) {
        const stillExists = proxmoxVMs.some(
          (pvm) => pvm.vmid === dbVM.vmid && pvm.node === dbVM.node
        );

        if (!stillExists) {
          await this.vmRepository.remove(dbVM);
          deleted++;
        }
      }

      const result: VMSyncResult = {
        created,
        updated,
        deleted,
        total: created + updated,
      };

      logger.info('VM sync completed', result);
      return result;
    } catch (error) {
      logger.error('VM sync failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all synced VMs from database
   */
  async getAllVMs(): Promise<VM[]> {
    try {
      return await this.vmRepository.find({
        relations: ['services'],
        order: {
          created_at: 'DESC',
        },
      });
    } catch (error) {
      logger.error('Failed to fetch VMs', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get single VM by ID
   */
  async getVMById(vmId: string): Promise<VM | null> {
    try {
      return await this.vmRepository.findOne({
        where: { id: vmId },
        relations: ['services'],
      });
    } catch (error) {
      logger.error('Failed to fetch VM', {
        error: error instanceof Error ? error.message : String(error),
        vmId,
      });
      throw error;
    }
  }

  /**
   * Get VM by VMID and node
   */
  async getVMByVMID(vmid: number, node: string): Promise<VM | null> {
    try {
      return await this.vmRepository.findOne({
        where: {
          vmid,
          node,
        },
        relations: ['services'],
      });
    } catch (error) {
      logger.error('Failed to fetch VM by VMID', {
        error: error instanceof Error ? error.message : String(error),
        vmid,
        node,
      });
      throw error;
    }
  }

  /**
   * Update VM IP address
   */
  async updateVMIP(vmId: string, ipv4?: string, ipv6?: string): Promise<VM> {
    try {
      const vm = await this.getVMById(vmId);
      if (!vm) {
        throw new Error('VM not found');
      }

      if (ipv4) vm.ipv4_address = ipv4;
      if (ipv6) vm.ipv6_address = ipv6;

      vm.updated_at = new Date();
      await this.vmRepository.save(vm);

      logger.info(`VM ${vm.name} IP addresses updated`, {
        vmId,
        ipv4,
        ipv6,
      });

      return vm;
    } catch (error) {
      logger.error('Failed to update VM IP', {
        error: error instanceof Error ? error.message : String(error),
        vmId,
      });
      throw error;
    }
  }

  /**
   * Update VM hostname
   */
  async updateVMHostname(vmId: string, hostname: string): Promise<VM> {
    try {
      const vm = await this.getVMById(vmId);
      if (!vm) {
        throw new Error('VM not found');
      }

      vm.hostname = hostname;
      vm.updated_at = new Date();
      await this.vmRepository.save(vm);

      logger.info(`VM ${vm.name} hostname updated`, {
        vmId,
        hostname,
      });

      return vm;
    } catch (error) {
      logger.error('Failed to update VM hostname', {
        error: error instanceof Error ? error.message : String(error),
        vmId,
      });
      throw error;
    }
  }

  /**
   * Get IP allocation summary
   */
  async getIPAllocations(): Promise<any[]> {
    try {
      const vms = await this.getAllVMs();

      return vms.map((vm) => ({
        vmid: vm.vmid,
        name: vm.name,
        node: vm.node,
        ipv4: vm.ipv4_address || null,
        ipv6: vm.ipv6_address || null,
        hostname: vm.hostname || null,
        status: vm.status,
        services: vm.services || [],
      }));
    } catch (error) {
      logger.error('Failed to get IP allocations', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
