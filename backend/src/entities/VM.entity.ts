import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { Service } from './Service.entity';

@Entity('vms')
export class VM {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vmid: number; // Proxmox VMID

  @Column()
  node: string; // Proxmox node name

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, type: 'varchar' })
  ipv4_address: string;

  @Column({ nullable: true, type: 'varchar' })
  ipv6_address: string;

  @Column({ nullable: true })
  hostname: string;

  @Column({ default: 'offline' })
  status: 'online' | 'offline' | 'paused';

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: 0 })
  cpu_cores: number;

  @Column({ default: 0 })
  memory_mb: number;

  @Column({ default: 0 })
  disk_gb: number;

  // Network stats
  @Column({ default: 0 })
  network_in: number; // bytes

  @Column({ default: 0 })
  network_out: number; // bytes

  // Relationships
  @OneToMany(() => Service, (service) => service.vm, { cascade: true })
  services: Service[];

  @ManyToMany('Project', 'vms')
  projects: any[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  last_sync: Date;
}
