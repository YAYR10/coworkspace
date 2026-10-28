import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ChargesController, InvoicesController, PaymentsController } from './billing/billing.controller';
import { BillingService } from './billing/billing.service';
import { PaymentGatewayService } from './billing/payment-gateway.service';
import { MembershipClient } from './billing/membership.client';
import { PlanPaymentsService } from './billing/plan-payments.service';
import { WompiService } from './billing/wompi.service';
import { InternalKeyGuard } from './common/internal-key.guard';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [InvoicesController, ChargesController, PaymentsController, HealthController, MetricsController],
  providers: [BillingService, PaymentGatewayService, WompiService, PlanPaymentsService, MembershipClient, { provide: APP_GUARD, useClass: InternalKeyGuard }],
})
export class AppModule {}
