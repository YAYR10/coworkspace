import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user';
import { AvailabilityQueryDto, CreateBookingDto } from './bookings.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.bookings.findMine(user.id);
  }

  @Get('availability')
  availability(@Query() query: AvailabilityQueryDto) {
    return this.bookings.availability(query);
  }

  @Post('waitlist')
  joinWaitlist(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.joinWaitlist(user.id, dto);
  }

  @Get('waitlist/me')
  myWaitlist(@CurrentUser() user: AuthUser) {
    return this.bookings.findMyWaitlist(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.findOne(user, id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.cancel(user, id);
  }
}
