import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessController } from './access/access.controller';
import { AccessService } from './access/access.service';
import { MembershipClient } from './clients/membership.client';
import { InternalKeyGuard } from './common/internal-key.guard';
import { EventStream } from './events/event-stream.service';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccessController, HealthController, MetricsController],
  providers: [AccessService, EventStream, MembershipClient, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
