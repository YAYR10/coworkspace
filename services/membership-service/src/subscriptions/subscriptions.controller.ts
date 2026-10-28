import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { PaymentGate } from './payment-gate.service';
import { InternalActivateDto, SubscribeDto } from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly gate: PaymentGate,
  ) {}

  /** Suscripción directa: solo cuando no hay pasarela real (cobro simulado). */
  @Post()
  async subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    await this.gate.assertDirectSubscriptionAllowed();
    return this.subscriptions.subscribe(user.id, dto);
  }

  /** Interno: Billing activa el plan cuando Wompi aprueba el pago (el Gateway bloquea esta ruta). */
  @Post('internal/activate')
  activateAfterPayment(@Body() dto: InternalActivateDto) {
    return this.subscriptions.subscribe(dto.memberId, { planId: dto.planId });
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.subscriptions.findMine(user.id);
  }

  /** Endpoint interno (el Gateway lo bloquea hacia afuera). */
  @Get('member/:memberId/active')
  findActive(@Param('memberId', ParseUUIDPipe) memberId: string) {
    return this.subscriptions.findActive(memberId);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.cancelAutoRenew(user, id);
  }

  @Post(':id/expire')
  expire(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    assertAdmin(user);
    return this.subscriptions.expireNow(id);
  }

  @Post('renewals/run')
  runRenewals(@CurrentUser() user: AuthUser) {
    assertAdmin(user);
    return this.subscriptions.processRenewals().then((processed) => ({ processed }));
  }
}
