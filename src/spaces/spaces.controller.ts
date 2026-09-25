import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { assertAdmin, AuthUser, CurrentUser } from '../common/current-user';
import { CreateDeskDto, CreateLocationDto, CreateRoomDto, RoomQueryDto, UpdateDeskDto, UpdateRoomDto } from './spaces.dto';
import { ResourceType, SpacesService } from './spaces.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  findAll(@Query('city') city?: string) {
    return this.spaces.findLocations(city);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.spaces.findLocation(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLocationDto) {
    assertAdmin(user);
    return this.spaces.createLocation(dto);
  }
}

@Controller('rooms')
export class RoomsController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  findAll(@Query() query: RoomQueryDto) {
    return this.spaces.findRooms(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.spaces.findRoom(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomDto) {
    assertAdmin(user);
    return this.spaces.createRoom(dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto) {
    assertAdmin(user);
    return this.spaces.updateRoom(id, dto);
  }
}

@Controller('desks')
export class DesksController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  findAll(@Query('locationId') locationId?: string) {
    return this.spaces.findDesks(locationId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.spaces.findDesk(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDeskDto) {
    assertAdmin(user);
    return this.spaces.createDesk(dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeskDto) {
    assertAdmin(user);
    return this.spaces.updateDesk(id, dto);
  }
}

/** Endpoint interno consumido por Booking Service (no expuesto por el Gateway). */
@Controller('resources')
export class ResourcesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get(':type/:id')
  get(@Param('type') type: string, @Param('id', ParseUUIDPipe) id: string) {
    const normalized = type.toUpperCase();
    if (normalized !== 'ROOM' && normalized !== 'DESK') throw new BadRequestException('type debe ser ROOM o DESK');
    return this.spaces.getResource(normalized as ResourceType, id);
  }
}
