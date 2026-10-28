import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { assertStaff, AuthUser, CurrentUser } from '../common/current-user';
import { IssueCredentialDto, ValidateDto } from './access.dto';
import { AccessService } from './access.service';

@Controller('access')
export class AccessController {
  constructor(private readonly access: AccessService) {}

  /** El miembro genera su QR (o el personal emite una tarjeta NFC). */
  @Post('credentials')
  issue(@CurrentUser() user: AuthUser, @Body() dto: IssueCredentialDto) {
    return this.access.issue(user, dto.kind ?? 'QR', dto.memberId);
  }

  @Get('credentials/me')
  mine(@CurrentUser() user: AuthUser) {
    return this.access.mine(user.id);
  }

  @Delete('credentials/:id')
  revoke(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.access.revoke(user, id);
  }

  /** Lector de la puerta / recepción: valida el código en tiempo real. */
  @Post('validate')
  @HttpCode(200)
  validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateDto) {
    assertStaff(user);
    return this.access.validate(dto.token, dto.locationId);
  }

  @Get('logs/me')
  myLogs(@CurrentUser() user: AuthUser) {
    return this.access.logs({ memberId: user.id, take: 50 });
  }

  @Get('logs')
  logs(@CurrentUser() user: AuthUser, @Query('locationId') locationId?: string, @Query('memberId') memberId?: string) {
    assertStaff(user);
    return this.access.logs({ locationId, memberId });
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser, @Query('locationId') locationId?: string) {
    assertStaff(user);
    return this.access.stats(locationId);
  }
}
