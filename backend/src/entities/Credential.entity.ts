import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';

export enum CredentialType {
  PROXMOX = 'proxmox',
  GITHUB = 'github',
  SSH = 'ssh',
  DATABASE = 'database',
  API_KEY = 'api_key',
  GENERIC = 'generic',
}

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CredentialType })
  type: CredentialType;

  // Encrypted data storage
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  last_used: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  // For audit trail
  @Column({ default: false })
  is_deleted: boolean;

  toJSON() {
    // Never expose encrypted data in API responses
    const { encrypted_data, iv, salt, auth_tag, ...result } = this;
    return result;
  }
}
