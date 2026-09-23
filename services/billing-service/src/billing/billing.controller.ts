import { Controller, Get, Query } from '@nestjs/common';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { BillingService } from './billing.service';

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
}
