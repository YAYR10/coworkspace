import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { ChangePasswordDto, ChangeRoleDto, UpdateProfileDto } from './members.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  // ---------- Perfil propio (cualquier usuario) ----------
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.members.me(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.members.updateProfile(user.id, dto);
  }

  @Post('me/password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.members.changePassword(user.id, dto);
  }

  // ---------- Gestión de usuarios (solo ADMIN) ----------
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('role') role?: string) {
    assertAdmin(user);
    return this.members.list({ q, role });
  }

  @Patch(':id/role')
  changeRole(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeRoleDto) {
    assertAdmin(user);
    return this.members.changeRole(user, id, dto);
  }
}
