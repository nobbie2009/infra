import { Repository } from 'typeorm';
import { VM } from '../entities/VM.entity';
import { Service, ServiceType, HealthStatus } from '../entities/Service.entity';
import { ProxmoxService } from './ProxmoxService';
import { HealthCheckService } from './HealthCheckService';
import logger from '../utils/logger';

export interface IPAllocation {
  id: string;
  vmid: number;
  name: string;
  ipv4: string | null;
  ipv6: string | null;
  hostname: string | null;
  status: string;
  node: string;
  services: {
    name: string;
    type: ServiceType;
    port: number;
    health: HealthStatus;
  }[];
}

export class IPManagementService {
  constructor(
    private vmRepository: Repository<VM>,
    private serviceRepository: Repository<Service>,
    private proxmoxService: ProxmoxService,
    private healthCheckService: HealthCheckService
  ) { }

  /**
   * Sync VMs from Proxmox to database
   */
  async syncVMsFromProxmox(userId: string): Promise<VM[]> {
    try {
      // Ensure we are initialized
      if (!this.proxmoxService.isInitialized()) {
        const initialized = await this.proxmoxService.initialize(userId);
        if (!initialized) {
          throw new Error('Could not initialize Proxmox connection. Please check your credentials.');
        }
      }

      const proxmoxVMs = await this.proxmoxService.getAllVMs();
      logger.info(`Received ${proxmoxVMs.length} VMs from Proxmox`);

      const syncedVMs: VM[] = [];

      for (const pmVm of proxmoxVMs) {
        let dbVm = await this.vmRepository.findOne({
          where: { vmid: pmVm.vmid, node: pmVm.node },
        });

        if (!dbVm) {
          dbVm = this.vmRepository.create({
            vmid: pmVm.vmid,
            node: pmVm.node,
            name: pmVm.name,
            status: pmVm.status as any,
            cpu_cores: pmVm.maxcpu,
            memory_mb: Math.round(pmVm.maxmem / 1024 / 1024),
            disk_gb: Math.round(pmVm.maxdisk / 1024 / 1024 / 1024),
            network_in: pmVm.netin,
            network_out: pmVm.netout,
          });
        } else {
          // Update existing VM
          dbVm.status = pmVm.status as any;
          dbVm.cpu_cores = pmVm.maxcpu;
          dbVm.memory_mb = Math.round(pmVm.maxmem / 1024 / 1024);
          dbVm.disk_gb = Math.round(pmVm.maxdisk / 1024 / 1024 / 1024);
          dbVm.network_in = pmVm.netin;
          dbVm.network_out = pmVm.netout;
        }

        dbVm.last_sync = new Date();
        const savedVm = await this.vmRepository.save(dbVm);
        syncedVMs.push(savedVm);

        logger.info(`Synced VM: ${pmVm.name} (${pmVm.vmid})`, { vmid: pmVm.vmid });
      }

      return syncedVMs;
    } catch (error) {
      logger.error('Failed to sync VMs from Proxmox', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get all VMs with their IP allocations
   */
  async getAllAllocations(): Promise<IPAllocation[]> {
    const vms = await this.vmRepository.find({
      relations: ['services'],
      order: { name: 'ASC' },
    });

    return vms.map((vm) => ({
      id: vm.id,
      vmid: vm.vmid,
      name: vm.name,
      ipv4: vm.ipv4_address,
      ipv6: vm.ipv6_address,
      hostname: vm.hostname,
      status: vm.status,
      node: vm.node,
      services: vm.services.map((s) => ({
        name: s.name,
        type: s.type,
        port: s.port,
        health: s.health_status,
      })),
    }));
  }

  /**
   * Get single VM details
   */
  async getVM(vmId: string): Promise<VM | null> {
    return this.vmRepository.findOne({
      where: { id: vmId },
      relations: ['services'],
    });
  }

  /**
   * Update VM IP address
   */
  async updateVMIP(vmId: string, ipv4?: string, ipv6?: string, hostname?: string): Promise<VM> {
    const vm = await this.vmRepository.findOne({ where: { id: vmId } });

    if (!vm) {
      throw new Error(`VM with ID ${vmId} not found`);
    }

    if (ipv4) vm.ipv4_address = ipv4;
    if (ipv6) vm.ipv6_address = ipv6;
    if (hostname) vm.hostname = hostname;

    const updated = await this.vmRepository.save(vm);
    logger.info(`Updated VM IP: ${vm.name}`, { vmId, ipv4, ipv6, hostname });

    return updated;
  }

  /**
   * Refresh VM IPs from Proxmox for all VMs
   */
  async refreshVMIPsFromProxmox(userId: string): Promise<VM[]> {
    try {
      // Ensure we are initialized
      if (!this.proxmoxService.isInitialized()) {
        const initialized = await this.proxmoxService.initialize(userId);
        if (!initialized) {
          throw new Error('Could not initialize Proxmox connection. Please check your credentials.');
        }
      }

      const vms = await this.vmRepository.find();
      const updatedVMs: VM[] = [];

      for (const vm of vms) {
        try {
          const ips = await this.proxmoxService.getVMNetworkIPs(vm.vmid, vm.node);

          let updated = false;
          if (ips.ipv4 && vm.ipv4_address !== ips.ipv4) {
            vm.ipv4_address = ips.ipv4;
            updated = true;
          }
          if (ips.ipv6 && vm.ipv6_address !== ips.ipv6) {
            vm.ipv6_address = ips.ipv6;
            updated = true;
          }

          if (updated) {
            const saved = await this.vmRepository.save(vm);
            updatedVMs.push(saved);
            logger.info(`Refreshed IPs for VM ${vm.name}`, {
              ipv4: ips.ipv4,
              ipv6: ips.ipv6
            });
          }
        } catch (error) {
          logger.warn(`Failed to refresh IPs for VM ${vm.name}`, { error: String(error) });
        }
      }

      logger.info(`Refreshed IPs for ${updatedVMs.length} VMs`);
      return updatedVMs;
    } catch (error) {
      logger.error('Failed to refresh VM IPs from Proxmox', { error: String(error) });
      throw error;
    }
  }

  /**
   * Add service to VM
   */
  async addService(
    vmId: string,
    name: string,
    type: ServiceType,
    port: number,
    protocol: 'tcp' | 'udp' | 'http' | 'https' = 'tcp',
    url?: string
  ): Promise<Service> {
    const vm = await this.vmRepository.findOne({ where: { id: vmId } });

    if (!vm) {
      throw new Error(`VM with ID ${vmId} not found`);
    }

    // Check if service already exists
    const existing = await this.serviceRepository.findOne({
      where: { vm_id: vmId, name, port },
    });

    if (existing) {
      logger.warn(`Service ${name}:${port} already exists for VM ${vm.name}`);
      return existing;
    }

    const service = this.serviceRepository.create({
      vm_id: vmId,
      name,
      type,
      port,
      protocol,
      url,
      health_status: HealthStatus.UNKNOWN,
    });

    const saved = await this.serviceRepository.save(service);
    logger.info(`Added service ${name} to VM ${vm.name}`, { vmId, port });

    return saved;
  }

  /**
   * Remove service from VM
   */
  async removeService(serviceId: string): Promise<void> {
    const service = await this.serviceRepository.findOne({ where: { id: serviceId } });

    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found`);
    }

    await this.serviceRepository.remove(service);
    logger.info(`Removed service ${service.name}`, { serviceId });
  }

  /**
   * Get all services for a VM
   */
  async getVMServices(vmId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { vm_id: vmId },
      order: { port: 'ASC' },
    });
  }

  /**
   * Get services by hostname
   */
  async getServicesByHostname(hostname: string): Promise<Service[]> {
    return this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.vm', 'vm')
      .where('vm.hostname = :hostname', { hostname })
      .orWhere('vm.ipv4_address = :hostname', { hostname })
      .orderBy('service.port', 'ASC')
      .getMany();
  }

  /**
   * Get services by IP address
   */
  async getServicesByIP(ipAddress: string): Promise<Service[]> {
    return this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.vm', 'vm')
      .where('vm.ipv4_address = :ip', { ip: ipAddress })
      .orWhere('vm.ipv6_address = :ip', { ip: ipAddress })
      .orderBy('service.port', 'ASC')
      .getMany();
  }

  /**
   * Get all healthy services
   */
  async getHealthyServices(): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { health_status: HealthStatus.HEALTHY, enabled: true },
      relations: ['vm'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get all unhealthy services
   */
  async getUnhealthyServices(): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { health_status: HealthStatus.UNHEALTHY, enabled: true },
      relations: ['vm'],
      order: { last_check: 'DESC' },
    });
  }

  /**
   * Get service statistics
   */
  async getServiceStatistics(): Promise<{
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    unknownServices: number;
    healthPercentage: number;
  }> {
    const services = await this.serviceRepository.find();

    const stats = {
      totalServices: services.length,
      healthyServices: services.filter((s) => s.health_status === HealthStatus.HEALTHY).length,
      unhealthyServices: services.filter((s) => s.health_status === HealthStatus.UNHEALTHY)
        .length,
      unknownServices: services.filter((s) => s.health_status === HealthStatus.UNKNOWN).length,
      healthPercentage: 0,
    };

    if (stats.totalServices > 0) {
      stats.healthPercentage =
        Math.round((stats.healthyServices / stats.totalServices) * 10000) / 100;
    }

    return stats;
  }

  /**
   * Perform health checks on all services
   */
  async checkAllServices(onlyEnabled: boolean = true): Promise<Map<string, HealthStatus>> {
    const query = this.serviceRepository.createQueryBuilder('service');

    if (onlyEnabled) {
      query.where('service.enabled = :enabled', { enabled: true });
    }

    const services = await query.getMany();
    const results = new Map<string, HealthStatus>();

    logger.info(`Starting health checks for ${services.length} services`);

    for (const service of services) {
      try {
        const result = await this.healthCheckService.checkService(service);
        await this.healthCheckService.updateServiceHealth(service, result);
        results.set(service.id, result.status);

        logger.debug(`Health check result for ${service.name}`, { status: result.status });
      } catch (error) {
        logger.error(`Failed to check service ${service.name}`, { error: String(error) });
        results.set(service.id, HealthStatus.UNHEALTHY);
      }
    }

    logger.info(`Completed health checks for ${services.length} services`);

    return results;
  }

  /**
   * Check single service health
   */
  async checkServiceHealth(serviceId: string): Promise<HealthStatus> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['vm'],
    });

    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const result = await this.healthCheckService.checkService(service);
    await this.healthCheckService.updateServiceHealth(service, result);

    return result.status;
  }
}
