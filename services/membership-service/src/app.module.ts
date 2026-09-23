import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { InternalKeyGuard } from './common/internal-key.guard';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { MembersController } from './members/members.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PlansController } from './plans/plans.controller';
import { PlansService } from './plans/plans.service';
import { PrismaModule } from './prisma/prisma.module';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { SubscriptionsService } from './subscriptions/subscriptions.service';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-jwt-secret-cambia-esto',
        signOptions: { expiresIn: process.env.ACCESS_TOKEN_TTL ?? '15m' },
      }),
    }),
  ],
  controllers: [AuthController, MembersController, PlansController, SubscriptionsController, HealthController, MetricsController],
  providers: [AuthService, PlansService, SubscriptionsService, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
