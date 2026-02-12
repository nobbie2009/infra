import { DataSource } from 'typeorm';
import { User } from '../entities/User.entity';
import { Credential } from '../entities/Credential.entity';
import { VM } from '../entities/VM.entity';
import { Service } from '../entities/Service.entity';
import { Project } from '../entities/Project.entity';
import { Feature } from '../entities/Feature.entity';
import { Alert } from '../entities/Alert.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'inframan',
  password: process.env.DB_PASSWORD || 'change_me',
  database: process.env.DB_NAME || 'inframanager',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, Credential, VM, Service, Project, Feature, Alert],
  subscribers: [],
  migrations: [],
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
        rejectUnauthorized: false,
      }
      : false,
});

export default AppDataSource;
