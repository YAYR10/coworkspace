import { BadRequestException, Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { assertAdmin, assertStaff, AuthUser, CurrentUser, isStaff, OptionalUser } from '../common/current-user';
import {
  CreateDeskDto,
  CreateLocationDto,
  CreateRoomDto,
  DeskQueryDto,
  LocationQueryDto,
  PhotoUploadDto,
  RoomQueryDto,
  UpdateDeskDto,
  UpdateLocationDto,
  UpdateRoomDto,
} from './spaces.dto';
import { ResourceType, SpacesService } from './spaces.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  findAll(@OptionalUser() user: AuthUser | null, @Query() query: LocationQueryDto) {
    return this.spaces.findLocations(query, isStaff(user));
  }

  /** Países con sedes publicadas (debe ir antes de :id). */
  @Get('countries')
  countries() {
    return this.spaces.findCountries();
  }

  @Get(':id')
  findOne(@OptionalUser() user: AuthUser | null, @Param('id', ParseUUIDPipe) id: string) {
    return this.spaces.findLocation(id, isStaff(user));
  }

  /** Foto de la sede (pública, cacheable). */
  @Get(':id/photo')
  @Header('Cache-Control', 'public, max-age=86400')
  async photo(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const photo = await this.spaces.getPhoto(id);
    res.setHeader('Content-Type', photo.mime);
    return new StreamableFile(Buffer.from(photo.data));
  }

  @Put(':id/photo')
  uploadPhoto(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PhotoUploadDto) {
    assertStaff(user);
    return this.spaces.setPhoto(id, dto);
  }

  @Delete(':id/photo')
  deletePhoto(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    assertStaff(user);
    return this.spaces.deletePhoto(id);
  }

  /** Crea sedes de ejemplo en varios países (solo administrador). */
  @Post('demo')
  seedDemo(@CurrentUser() user: AuthUser) {
    assertAdmin(user);
    return this.spaces.seedDemo();
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLocationDto) {
    assertStaff(user);
    return this.spaces.createLocation(dto);
  }

  /** Editar sede, sus servicios o publicarla/ocultarla (coordinador o administrador). */
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLocationDto) {
    assertStaff(user);
    return this.spaces.updateLocation(id, dto);
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
    assertStaff(user);
    return this.spaces.createRoom(dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto) {
    assertStaff(user);
    return this.spaces.updateRoom(id, dto);
  }
}

@Controller('desks')
export class DesksController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  findAll(@Query() query: DeskQueryDto) {
    return this.spaces.findDesks(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.spaces.findDesk(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDeskDto) {
    assertStaff(user);
    return this.spaces.createDesk(dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeskDto) {
    assertStaff(user);
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
