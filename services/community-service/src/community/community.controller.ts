import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { assertStaff, AuthUser, CurrentUser, OptionalUser } from '../common/current-user';
import { EventDto, MessageDto, ProfileDto } from './community.dto';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('members')
  directory(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('locationId') locationId?: string, @Query('skill') skill?: string) {
    return this.community.directory(user, q, locationId, skill);
  }

  @Get('profile/me')
  myProfile(@CurrentUser() user: AuthUser) {
    return this.community.myProfile(user);
  }

  @Put('profile/me')
  saveProfile(@CurrentUser() user: AuthUser, @Body() dto: ProfileDto) {
    return this.community.saveProfile(user, dto);
  }

  @Get('members/:memberId')
  profile(@CurrentUser() user: AuthUser, @Param('memberId', ParseUUIDPipe) memberId: string) {
    return this.community.profile(user, memberId);
  }

  @Get('events')
  events(@OptionalUser() user: AuthUser | null, @Query('locationId') locationId?: string) {
    return this.community.events(locationId, user);
  }

  @Post('events')
  createEvent(@CurrentUser() user: AuthUser, @Body() dto: EventDto) {
    assertStaff(user);
    return this.community.createEvent(user, dto);
  }

  @Delete('events/:id')
  cancelEvent(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    assertStaff(user);
    return this.community.cancelEvent(id);
  }

  @Post('events/:id/attend')
  attend(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.community.attend(user, id);
  }

  @Delete('events/:id/attend')
  leave(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.community.leave(user, id);
  }

  @Get('events/:id/attendees')
  attendees(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    assertStaff(user);
    return this.community.attendees(id);
  }

  @Post('messages')
  send(@CurrentUser() user: AuthUser, @Body() dto: MessageDto) {
    return this.community.send(user, dto);
  }

  @Get('messages')
  conversations(@CurrentUser() user: AuthUser) {
    return this.community.conversations(user);
  }

  @Get('messages/unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.community.unread(user);
  }

  @Get('messages/:memberId')
  thread(@CurrentUser() user: AuthUser, @Param('memberId', ParseUUIDPipe) memberId: string) {
    return this.community.thread(user, memberId);
  }
}
