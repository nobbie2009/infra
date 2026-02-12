import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';

export enum AlertType {
    SYSTEM = 'system',       // Disk space, RAM, CPU
    SERVICE = 'service',     // Service down/unreachable
    SECURITY = 'security',   // Failed logins, unrecognized IPs
    BACKUP = 'backup'        // Backup failed
}

export enum AlertSeverity {
    INFO = 'info',
    WARNING = 'warning',
    CRITICAL = 'critical'
}

export enum AlertStatus {
    ACTIVE = 'active',
    ACKNOWLEDGED = 'acknowledged',
    RESOLVED = 'resolved'
}

@Entity('alerts')
export class Alert {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: AlertType,
        default: AlertType.SYSTEM
    })
    type: AlertType;

    @Column({
        type: 'enum',
        enum: AlertSeverity,
        default: AlertSeverity.INFO
    })
    severity: AlertSeverity;

    @Column()
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({
        type: 'enum',
        enum: AlertStatus,
        default: AlertStatus.ACTIVE
    })
    @Index()
    status: AlertStatus;

    @Column({ nullable: true })
    source: string; // e.g., "Service: nginx-proxy" or "Node: pve1"

    @Column({ nullable: true })
    deduplication_key: string; // Unique key to prevent duplicates (e.g., "service-down-123")

    @CreateDateColumn()
    created_at: Date;

    @Column({ nullable: true })
    resolved_at: Date;

    @Column({ nullable: true })
    acknowledged_at: Date;

    @Column({ nullable: true })
    acknowledged_by: string; // User ID
}
