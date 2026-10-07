import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DirectoryClient } from './clients/directory.client';
import { InternalKeyGuard } from './common/internal-key.guard';
import { EventStream } from './events/event-stream.service';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { MailerService } from './notifications/mailer.service';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, HealthController, MetricsController],
  providers: [NotificationsService, EventStream, DirectoryClient, MailerService, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
