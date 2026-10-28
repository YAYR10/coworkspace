import { Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { assertAdmin, assertStaff, AuthUser, CurrentUser, isAdmin } from '../common/current-user';
import { EtlService } from './etl.service';
import { KpiService } from './kpi.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly kpi: KpiService,
    private readonly etl: EtlService,
  ) {}

  /** Tablero principal. Los ingresos solo los ve el administrador. */
  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    assertStaff(user);
    const active = await this.etl.activeMembers().catch(() => null);
    return this.kpi.summary(isAdmin(user), active);
  }

  @Get('occupancy')
  occupancy(
    @CurrentUser() user: AuthUser,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
    @Query('locationId') locationId?: string,
  ) {
    assertStaff(user);
    return this.kpi.occupancy(Math.min(Math.max(days, 1), 90), locationId);
  }

  @Get('revenue')
  revenue(@CurrentUser() user: AuthUser) {
    assertAdmin(user);
    return this.kpi.revenue();
  }

  @Get('retention')
  retention(@CurrentUser() user: AuthUser) {
    assertStaff(user);
    return this.kpi.retention();
  }

  @Post('etl')
  run(@CurrentUser() user: AuthUser) {
    assertAdmin(user);
    return this.etl.run('manual');
  }

  @Get('etl/runs')
  runs(@CurrentUser() user: AuthUser) {
    assertStaff(user);
    return this.etl.runs();
  }
}
