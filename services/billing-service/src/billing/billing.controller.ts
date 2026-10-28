import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { IsString, IsUUID, Length } from 'class-validator';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { BillingService } from './billing.service';
import { PlanPaymentsService } from './plan-payments.service';

export class PlanCheckoutDto {
  @IsUUID()
  planId: string;
}

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly billing: BillingService) {}

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.billing.invoicesOf(user.id);
  }

  @Get()
  all(@CurrentUser() user: AuthUser, @Query('memberId') memberId?: string) {
    assertAdmin(user);
    return this.billing.allInvoices(memberId);
  }
}

@Controller('charges')
export class ChargesController {
  constructor(private readonly billing: BillingService) {}

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.billing.chargesOf(user.id);
  }

  @Get('booking/:bookingId')
  forBooking(@CurrentUser() user: AuthUser, @Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.billing.chargeForBooking(user, bookingId);
  }

  /** Enlace de pago en Wompi para el cobro pendiente de una reserva. */
  @Post('booking/:bookingId/checkout')
  @HttpCode(200)
  checkout(@CurrentUser() user: AuthUser, @Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.billing.checkout(user, bookingId);
  }

  /** Todos los cobros adicionales (solo administrador). */
  @Get()
  all(@CurrentUser() user: AuthUser, @Query('memberId') memberId?: string) {
    assertAdmin(user);
    return this.billing.allCharges(memberId);
  }
}

class VerifyDto {
  @IsString()
  @Length(3, 80)
  transactionId: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly billing: BillingService,
    private readonly plans: PlanPaymentsService,
  ) {}

  /** Pagar una membresía: devuelve el enlace al checkout de Wompi. */
  @Post('plans/checkout')
  @HttpCode(200)
  planCheckout(@CurrentUser() user: AuthUser, @Body() dto: PlanCheckoutDto) {
    return this.plans.checkout(user, dto.planId);
  }

  @Get('plans/me')
  myPlanPayments(@CurrentUser() user: AuthUser) {
    return this.plans.mine(user.id);
  }

  @Get('plans')
  allPlanPayments(@CurrentUser() user: AuthUser) {
    assertAdmin(user);
    return this.plans.all();
  }

  /** Qué pasarela está activa (pública: la interfaz la usa para mostrar el modo pruebas). */
  @Get('status')
  status() {
    return this.billing.paymentStatus();
  }

  /** El miembro vuelve del checkout: se confirma el pago consultando la transacción en Wompi. */
  @Post('wompi/verify')
  @HttpCode(200)
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyDto) {
    return this.billing.verifyTransaction(user, dto.transactionId);
  }

  /** Webhook de eventos de Wompi (configurar en el panel de Wompi → Desarrolladores → URL de eventos). */
  @Post('wompi/webhook')
  @HttpCode(200)
  webhook(@Body() event: any) {
    return this.billing.handleWompiEvent(event);
  }
}
