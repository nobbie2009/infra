import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import { Project } from './Project.entity';
import { User } from './User.entity';

export enum FeatureStatus {
    PLANNED = 'planned',     // Geplant
    ANALYSIS = 'analysis',   // Analyse
    READY = 'ready',         // Ready
    DEVELOPMENT = 'dev',     // Entwicklung
    TESTING = 'testing',     // Testing
    DEPLOYED = 'deployed',   // Deployed
}

export enum FeaturePriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

@Entity('features')
export class Feature {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: FeatureStatus,
        default: FeatureStatus.PLANNED,
    })
    status: FeatureStatus;

    @Column({
        type: 'enum',
        enum: FeaturePriority,
        default: FeaturePriority.MEDIUM,
    })
    priority: FeaturePriority;

    @Column({ nullable: true })
    effort: number; // in hours or points

    @Column({ nullable: true })
    due_date: Date;

    @ManyToOne(() => Project, (project) => (project as any).features, { onDelete: 'CASCADE' })
    project: Project;

    @Column()
    projectId: string;

    @ManyToOne(() => User, { nullable: true })
    assignee: User;

    @Column({ nullable: true })
    assigneeId: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
