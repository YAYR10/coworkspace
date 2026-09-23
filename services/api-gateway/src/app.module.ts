import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';

@Module({ controllers: [HealthController, MetricsController] })
export class AppModule {}
