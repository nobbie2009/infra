import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VM } from './VM.entity';

export enum ServiceType {
  SSH = 'ssh',
  HTTP = 'http',
  HTTPS = 'https',
  DOCKER = 'docker',
  KUBERNETES = 'kubernetes',
  DATABASE = 'database',
  CUSTOM = 'custom',
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vm_id: string;

  @ManyToOne(() => VM, (vm) => vm.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vm_id' })
  vm: VM;

  @Column()
  name: string; // e.g., "SSH", "HTTP", "PostgreSQL"

  @Column({ type: 'enum', enum: ServiceType, default: ServiceType.CUSTOM })
  type: ServiceType;

  @Column()
  port: number;

  @Column({ default: 'tcp' })
  protocol: 'tcp' | 'udp' | 'http' | 'https';

  @Column({ nullable: true })
  url: string; // Full URL for HTTP checks (e.g., http://10.0.0.5:8080)

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: HealthStatus, default: HealthStatus.UNKNOWN })
  health_status: HealthStatus;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ default: 0 })
  response_time_ms: number; // Last check response time

  @Column({ default: 0 })
  check_count: number; // Number of health checks performed

  @Column({ default: 0 })
  failed_count: number; // Number of failed checks

  @Column({ default: true })
  enabled: boolean; // Whether to check this service

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  last_check: Date;

  @Column({ nullable: true })
  last_successful_check: Date;
}
