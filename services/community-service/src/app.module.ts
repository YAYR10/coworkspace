import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MembershipGate } from './clients/membership-gate.service';
import { MembershipClient } from './clients/membership.client';
import { InternalKeyGuard } from './common/internal-key.guard';
import { CommunityController } from './community/community.controller';
import { CommunityService } from './community/community.service';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityController, HealthController, MetricsController],
  providers: [CommunityService, MembershipGate, MembershipClient, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
