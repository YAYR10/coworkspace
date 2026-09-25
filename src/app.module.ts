import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CacheService } from './cache/cache.service';
import { InternalKeyGuard } from './common/internal-key.guard';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PrismaModule } from './prisma/prisma.module';
import { DesksController, LocationsController, ResourcesController, RoomsController } from './spaces/spaces.controller';
import { SpacesService } from './spaces/spaces.service';

@Module({
  imports: [PrismaModule],
  controllers: [LocationsController, RoomsController, DesksController, ResourcesController, HealthController, MetricsController],
  providers: [SpacesService, CacheService, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
