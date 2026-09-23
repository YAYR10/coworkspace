import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { SubscribeDto } from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return this.subscriptions.subscribe(user.id, dto);
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
