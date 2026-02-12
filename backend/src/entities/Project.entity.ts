import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    ManyToMany,
    JoinTable,
    OneToMany,
} from 'typeorm';
import { User } from './User.entity';
import { VM } from './VM.entity';
import { Feature } from './Feature.entity';

@Entity('projects')
export class Project {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    github_repo: string; // e.g. "owner/repo"

    @Column({ type: 'jsonb', nullable: true })
    tech_stack: string[];

    @Column({ nullable: true })
    last_sync: Date;

    @Column({ default: 'active' })
    status: 'active' | 'archived';

    @Column({ nullable: true })
    readme_content: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any; // For additional github info like stars, issues count, etc.

    // Relationship to owner
    @ManyToOne(() => User, (user) => (user as any).projects)
    user: User;

    @Column()
    userId: string;

    // Relationship to VMs
    @ManyToMany(() => VM)
    @JoinTable({
        name: 'project_vms',
        joinColumn: { name: 'projectId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'vmId', referencedColumnName: 'id' }
    })
    vms: VM[];

    @OneToMany(() => Feature, (feature) => feature.project)
    features: Feature[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
