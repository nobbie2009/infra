import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ChatMessage } from '../entities/chat-message.entity';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { HealthModule } from '../health/health.module';
import { ProjectsModule } from '../projects/projects.module';
import { FeaturesModule } from '../features/features.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    InfrastructureModule,
    HealthModule,
    ProjectsModule,
    FeaturesModule,
    AuditLogModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
