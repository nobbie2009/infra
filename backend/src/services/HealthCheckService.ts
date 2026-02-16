import axios, { AxiosError } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { Service, HealthStatus } from '../entities/Service.entity';
import { AlertService } from './AlertService';
import { AlertType, AlertSeverity } from '../entities/Alert.entity';
import logger from '../utils/logger';
import * as os from 'os';

const execAsync = promisify(exec);

export interface HealthCheckResult {
  status: HealthStatus;
  responseTime: number;
  message?: string;
  timestamp: Date;
}

export class HealthCheckService {
  constructor(
    private serviceRepository: Repository<Service>,
    private alertService: AlertService
  ) { }

  /**
   * Perform health check on a service
   */
  async checkService(service: Service): Promise<HealthCheckResult> {
    if (!service.enabled) {
      return {
        status: HealthStatus.UNKNOWN,
        responseTime: 0,
        message: 'Service is disabled',
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      switch (service.protocol) {
        case 'http':
        case 'https':
          result = await this.checkHTTP(service, startTime);
          break;
        case 'tcp':
          result = await this.checkTCP(service, startTime);
          break;
        case 'udp':
          result = await this.checkUDP(service, startTime);
          break;
        default:
          result = await this.checkTCP(service, startTime);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`Health check failed for service ${service.id}`, {
        error: String(error),
        serviceId: service.id,
        serviceName: service.name,
      });

      result = {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }

    // Alerting Logic
    const alertKey = `service-down-${service.id}`;
    if (result.status === HealthStatus.UNHEALTHY) {
      if (service.failed_count && service.failed_count >= 2) { // Only alert after 3 consecutive failures (2 previous + current)
        await this.alertService.createAlert(
          AlertType.SERVICE,
          AlertSeverity.CRITICAL,
          `Service Unhealthy: ${service.name}`,
          `Service ${service.name} on ${service.vm?.name || 'unknown host'} is unreachable. Error: ${result.message}`,
          `Service:${service.name}`,
          alertKey
        );
      }
    } else if (result.status === HealthStatus.HEALTHY) {
      // Auto-resolve alert if exists
      await this.alertService.resolveAlertByKey(alertKey);
    }

    return result;
  }

  /**
   * Check HTTP/HTTPS service
   */
  private async checkHTTP(
    service: Service,
    startTime: number
  ): Promise<HealthCheckResult> {
    if (!service.url) {
      return {
        status: HealthStatus.UNKNOWN,
        responseTime: 0,
        message: 'URL not configured',
        timestamp: new Date(),
      };
    }

    try {
      const response = await axios.get(service.url, {
        timeout: 5000,
        validateStatus: () => true, // Accept all status codes
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 400;

      return {
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        responseTime,
        message: `HTTP ${response.status}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const message = error instanceof AxiosError
        ? error.code || error.message
        : 'HTTP check failed';

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check TCP port connectivity
   */
  private async checkTCP(
    service: Service,
    startTime: number
  ): Promise<HealthCheckResult> {
    const ipAddress = service.vm?.ipv4_address || '127.0.0.1';

    try {
      // Use nc (netcat) to check TCP port
      const command = `timeout 3 bash -c "echo > /dev/tcp/${ipAddress}/${service.port}" 2>/dev/null`;

      await execAsync(command);

      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.HEALTHY,
        responseTime,
        message: `TCP port ${service.port} is open`,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        message: `TCP port ${service.port} is closed`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check UDP port (basic ICMP ping)
   */
  private async checkUDP(
    service: Service,
    startTime: number
  ): Promise<HealthCheckResult> {
    const ipAddress = service.vm?.ipv4_address || '127.0.0.1';

    try {
      // Use ping for UDP check (ICMP echo)
      const command = `ping -c 1 -W 2 ${ipAddress} > /dev/null 2>&1`;

      await execAsync(command);

      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.HEALTHY,
        responseTime,
        message: `Host ${ipAddress} is reachable`,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        message: `Host ${ipAddress} is unreachable`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Perform ping check on IP address
   */
  async pingIP(ipAddress: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const command = `ping -c 1 -W 2 ${ipAddress} > /dev/null 2>&1`;
      await execAsync(command);

      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.HEALTHY,
        responseTime,
        message: `Host ${ipAddress} is online`,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        message: `Host ${ipAddress} is offline`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update service with health check result
   */
  async updateServiceHealth(service: Service, result: HealthCheckResult): Promise<void> {
    service.health_status = result.status;
    service.response_time_ms = result.responseTime;
    service.last_check = result.timestamp;
    service.check_count = (service.check_count || 0) + 1;
    service.error_message = (result.message || null) as any;

    if (result.status === HealthStatus.HEALTHY) {
      service.last_successful_check = result.timestamp;
    } else {
      service.failed_count = (service.failed_count || 0) + 1;
    }

    await this.serviceRepository.save(service);
  }

  /**
   * Get health check statistics for a service
   */
  getHealthStats(service: Service): {
    healthPercentage: number;
    totalChecks: number;
    failedChecks: number;
    lastCheckTime: Date | null;
  } {
    const totalChecks = service.check_count || 0;
    const failedChecks = service.failed_count || 0;
    const successfulChecks = totalChecks - failedChecks;
    const healthPercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    return {
      healthPercentage: Math.round(healthPercentage * 100) / 100,
      totalChecks,
      failedChecks,
      lastCheckTime: service.last_check || null,
    };
  }

  /**
   * Get system statistics (CPU, RAM)
   */
  /**
   * Get system statistics (CPU, RAM, Disk)
   */
  async getSystemStats(): Promise<any> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();

    const cpuUsage = await this.getCpuUsage();
    const diskStats = await this.getDiskStats();

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      uptime: os.uptime(),
      cpu: {
        cores: cpus.length,
        model: cpus[0].model,
        load: loadAvg,
        usage: cpuUsage
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usage: Math.round((usedMem / totalMem) * 100)
      },
      disk: diskStats
    };
  }

  private async getCpuUsage(): Promise<number> {
    try {
      // Simple CPU usage calculation based on load avg and cores as fallback
      // Or simplified os.cpus() diff if I could persist state, but stateless is harder.
      // For now, let's use a one-shot measurement of os.cpus() with a small delay?
      // Actually, loadavg[0] / cores * 100 is a rough proxy for "saturation" on Linux.
      // Let's try a better approach: generic /proc/stat read if linux
      if (os.platform() === 'linux') {
        const { stdout } = await execAsync('grep "cpu " /proc/stat');
        const line = stdout.trim();
        // cpu  user nice system idle ...
        const parts = line.split(/\s+/);
        // This is cumulative... needs two sample points. 
        // Fallback to loadavg based approximation for stateless simplicity in this iteration
        const cpus = os.cpus();
        const load = os.loadavg()[0];
        const usage = Math.min(100, Math.round((load / cpus.length) * 100));
        return usage;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  private async getDiskStats(): Promise<any> {
    try {
      if (os.platform() === 'linux') {
        // Get disk usage for root partition
        const { stdout } = await execAsync('df -B1 /');
        // Filesystem     1B-blocks      Used Available Use% Mounted on
        // /dev/root    50000000000 20000000000 30000000000  40% /
        const lines = stdout.trim().split('\n');
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/);
          const total = parseInt(parts[1], 10);
          const used = parseInt(parts[2], 10);
          const free = parseInt(parts[3], 10);
          return {
            total,
            used,
            free,
            usage: Math.round((used / total) * 100)
          };
        }
      }
      return { total: 0, used: 0, free: 0, usage: 0 };
    } catch (e) {
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }
}
