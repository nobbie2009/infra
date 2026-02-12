import axios, { AxiosError } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { Service, HealthStatus } from '../entities/Service.entity';
import logger from '../utils/logger';

const execAsync = promisify(exec);

export interface HealthCheckResult {
  status: HealthStatus;
  responseTime: number;
  message?: string;
  timestamp: Date;
}

export class HealthCheckService {
  constructor(private serviceRepository: Repository<Service>) {}

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

    try {
      switch (service.protocol) {
        case 'http':
        case 'https':
          return await this.checkHTTP(service, startTime);
        case 'tcp':
          return await this.checkTCP(service, startTime);
        case 'udp':
          return await this.checkUDP(service, startTime);
        default:
          return await this.checkTCP(service, startTime);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`Health check failed for service ${service.id}`, {
        error: String(error),
        serviceId: service.id,
        serviceName: service.name,
      });

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
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
}
