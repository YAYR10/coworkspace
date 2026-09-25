import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ChargesController, InvoicesController } from './billing/billing.controller';
import { BillingService } from './billing/billing.service';
import { PaymentGatewayService } from './billing/payment-gateway.service';
import { InternalKeyGuard } from './common/internal-key.guard';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [InvoicesController, ChargesController, HealthController, MetricsController],
  providers: [BillingService, PaymentGatewayService, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
