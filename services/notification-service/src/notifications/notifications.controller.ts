import { Controller, Get } from '@nestjs/common';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { NotificationsService } from './notifications.service';
import { RemindersService } from './reminders.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly reminders: RemindersService,
  ) {}

  /** Recordatorios programados del usuario (próximas reservas y vencimiento del plan). */
  @Get('reminders/me')
  upcoming(@CurrentUser() user: AuthUser) {
    return this.reminders.upcoming(user.id);
  }

  /** Bandeja del usuario: los avisos que se le enviaron. */
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.notifications.mine(user.id);
  }

  /** Todos los correos (solo administrador). */
  @Get()
  all(@CurrentUser() user: AuthUser) {
    assertAdmin(user);
    return this.notifications.all();
  }

  /** ¿Se envían correos de verdad o está en modo demostración? (solo administrador) */
  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    assertAdmin(user);
    return this.notifications.status();
  }
}
