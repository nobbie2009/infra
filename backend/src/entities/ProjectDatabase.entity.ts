import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User.entity';
import { Project } from './Project.entity';
import { DatabaseQueryLog } from './DatabaseQueryLog.entity';

export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
}

@Entity('project_databases')
export class ProjectDatabase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  project_id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: DatabaseType })
  type: DatabaseType;

  // Encrypted credentials
  @Column({ type: 'bytea' })
  encrypted_data: Buffer;

  // Initialization Vector for AES-GCM
  @Column({ type: 'bytea' })
  iv: Buffer;

  // Salt for key derivation
  @Column({ type: 'bytea' })
  salt: Buffer;

  // Authentication tag for AES-GCM
  @Column({ type: 'bytea' })
  auth_tag: Buffer;

  // Algorithm version for future upgrades
  @Column({ default: 'aes-256-gcm-v1' })
  algorithm: string;

  // Connection status
  @Column({ default: 'active' })
  status: 'active' | 'inactive';

  // Last successful connection test
  @Column({ nullable: true })
  last_tested: Date;

  // Query history stored separately for audit trail
  @OneToMany(() => DatabaseQueryLog, (log) => log.database, { cascade: true })
  query_logs: DatabaseQueryLog[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ default: false })
  is_deleted: boolean;

  toJSON() {
    // Never expose encrypted data in API responses
    const { encrypted_data, iv, salt, auth_tag, ...result } = this;
    return result;
  }
}
