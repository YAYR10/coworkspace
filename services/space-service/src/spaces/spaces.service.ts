import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeskDto, CreateLocationDto, CreateRoomDto, RoomQueryDto, UpdateDeskDto, UpdateRoomDto } from './spaces.dto';

export type ResourceType = 'ROOM' | 'DESK';

export interface ResourceView {
  id: string;
  type: ResourceType;
  locationId: string;
  name: string;
  capacity: number;
  isActive: boolean;
  equipment?: Prisma.JsonValue;
  isDedicated?: boolean;
}

const resourceKey = (type: ResourceType, id: string) => `space:resource:${type}:${id}`;

@Injectable()
export class SpacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private get ttl(): number {
    return Number(process.env.CACHE_TTL_SECONDS ?? 60);
  }

  // ---------- Sedes ----------
  findLocations(city?: string) {
    return this.prisma.location.findMany({
      where: city ? { city: { equals: city, mode: 'insensitive' } } : undefined,
      include: { _count: { select: { rooms: true, desks: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findLocation(id: string) {
    const location = await this.prisma.location.findUnique({ where: { id }, include: { rooms: true, desks: true } });
    if (!location) throw new NotFoundException('Sede no encontrada');
    return location;
  }

  createLocation(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
  }

  // ---------- Salas ----------
  findRooms(query: RoomQueryDto) {
    return this.prisma.room.findMany({
      where: {
        isActive: true,
        locationId: query.locationId,
        capacity: query.minCapacity ? { gte: query.minCapacity } : undefined,
        equipment: query.equipment ? { path: [query.equipment], equals: true } : undefined,
      },
      orderBy: { capacity: 'asc' },
    });
  }

  async findRoom(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Sala no encontrada');
    return room;
  }

  async createRoom(dto: CreateRoomDto) {
    await this.findLocation(dto.locationId);
    return this.prisma.room.create({ data: { ...dto, equipment: dto.equipment ?? {} } });
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    await this.findRoom(id);
    const room = await this.prisma.room.update({ where: { id }, data: dto });
    await this.cache.del(resourceKey('ROOM', id));
    return room;
  }

  // ---------- Puestos ----------
  findDesks(locationId?: string) {
    return this.prisma.desk.findMany({ where: { isActive: true, locationId }, orderBy: { code: 'asc' } });
  }

  async findDesk(id: string) {
    const desk = await this.prisma.desk.findUnique({ where: { id } });
    if (!desk) throw new NotFoundException('Puesto no encontrado');
    return desk;
  }

  async createDesk(dto: CreateDeskDto) {
    await this.findLocation(dto.locationId);
    try {
      return await this.prisma.desk.create({ data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ya existe un puesto con ese código en la sede');
      }
      throw err;
    }
  }

  async updateDesk(id: string, dto: UpdateDeskDto) {
    await this.findDesk(id);
    const desk = await this.prisma.desk.update({ where: { id }, data: dto });
    await this.cache.del(resourceKey('DESK', id));
    return desk;
  }

  // ---------- Vista unificada para Booking Service (cacheada) ----------
  async getResource(type: ResourceType, id: string): Promise<ResourceView & { cached: boolean }> {
    const key = resourceKey(type, id);
    const cached = await this.cache.get<ResourceView>(key);
    if (cached) return { ...cached, cached: true };

    let view: ResourceView | null = null;
    if (type === 'ROOM') {
      const room = await this.prisma.room.findUnique({ where: { id } });
      if (room) {
        view = { id: room.id, type, locationId: room.locationId, name: room.name, capacity: room.capacity, isActive: room.isActive, equipment: room.equipment };
      }
    } else {
      const desk = await this.prisma.desk.findUnique({ where: { id } });
      if (desk) {
        view = { id: desk.id, type, locationId: desk.locationId, name: desk.code, capacity: 1, isActive: desk.isActive, isDedicated: desk.isDedicated };
      }
    }
    if (!view) throw new NotFoundException('Recurso no encontrado');
    await this.cache.set(key, view, this.ttl);
    return { ...view, cached: false };
  }
}
