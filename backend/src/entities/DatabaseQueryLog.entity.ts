import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';
import { ProjectDatabase } from './ProjectDatabase.entity';

@Entity('database_query_logs')
export class DatabaseQueryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  database_id: string;

  @ManyToOne(() => ProjectDatabase, (db) => db.query_logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'database_id' })
  database: ProjectDatabase;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  query: string;

  @Column({ nullable: true })
  row_count: number;

  @Column({ nullable: true })
  execution_time_ms: number;

  @Column({ default: 'success' })
  status: 'success' | 'error' | 'timeout';

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;
}
