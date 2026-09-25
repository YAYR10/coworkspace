import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingMetrics } from './bookings/booking.metrics';
import { BookingsController } from './bookings/bookings.controller';
import { BookingsService } from './bookings/bookings.service';
import { InternalKeyGuard } from './common/internal-key.guard';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SpaceClient } from './space/space.client';

@Module({
  imports: [PrismaModule, EventsModule, ScheduleModule.forRoot()],
  controllers: [BookingsController, HealthController, MetricsController],
  providers: [BookingsService, BookingMetrics, SpaceClient, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
