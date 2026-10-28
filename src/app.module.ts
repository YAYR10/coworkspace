import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsController } from './analytics/analytics.controller';
import { EtlService } from './analytics/etl.service';
import { KpiService } from './analytics/kpi.service';
import { SourceDb } from './clients/source.db';
import { InternalKeyGuard } from './common/internal-key.guard';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [AnalyticsController, HealthController, MetricsController],
  providers: [EtlService, KpiService, SourceDb, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
