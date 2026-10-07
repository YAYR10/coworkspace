import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDeskDto,
  CreateLocationDto,
  CreateRoomDto,
  DeskQueryDto,
  LocationQueryDto,
  RoomQueryDto,
  UpdateDeskDto,
  UpdateLocationDto,
  UpdateRoomDto,
} from './spaces.dto';

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
const sameText = (value?: string) => (value ? { equals: value.trim(), mode: 'insensitive' as const } : undefined);
/** Limpia la lista de servicios: sin espacios sobrantes ni repetidos. */
const cleanServices = (list?: string[]) =>
  list ? [...new Map(list.map((x) => x.trim()).filter(Boolean).map((x) => [x.toLowerCase(), x])).values()] : undefined;

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
  /** Público: solo sedes publicadas. El personal puede pedir todas con ?all=true. */
  findLocations(query: LocationQueryDto, staff = false) {
    const includeHidden = staff && query.all === 'true';
    return this.prisma.location.findMany({
      where: {
        isPublished: includeHidden ? undefined : true,
        country: sameText(query.country),
        city: sameText(query.city),
      },
      include: { _count: { select: { rooms: true, desks: true } } },
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
  }

  /** Países (y sus ciudades) donde hay sedes publicadas: alimenta el selector de ubicación. */
  async findCountries() {
    const rows = await this.prisma.location.findMany({ where: { isPublished: true }, select: { country: true, city: true } });
    const byCountry = new Map<string, { country: string; locations: number; cities: Set<string> }>();
    for (const { country, city } of rows) {
      const entry = byCountry.get(country.toLowerCase()) ?? { country, locations: 0, cities: new Set<string>() };
      entry.locations += 1;
      entry.cities.add(city);
      byCountry.set(country.toLowerCase(), entry);
    }
    return [...byCountry.values()]
      .map((e) => ({ country: e.country, locations: e.locations, cities: [...e.cities].sort() }))
      .sort((a, b) => a.country.localeCompare(b.country, 'es'));
  }

  async findLocation(id: string, staff = true) {
    const location = await this.prisma.location.findUnique({ where: { id }, include: { rooms: true, desks: true } });
    if (!location || (!location.isPublished && !staff)) throw new NotFoundException('Sede no encontrada');
    if (!staff) {
      location.rooms = location.rooms.filter((r) => r.isActive);
      location.desks = location.desks.filter((d) => d.isActive);
    }
    return location;
  }

  createLocation(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: { ...dto, services: cleanServices(dto.services) ?? [] } });
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    const current = await this.findLocation(id);
    const location = await this.prisma.location.update({ where: { id }, data: { ...dto, services: cleanServices(dto.services) } });
    // Publicar/ocultar una sede cambia si sus salas y puestos se pueden reservar: se invalida la caché
    if (dto.isPublished !== undefined && dto.isPublished !== current.isPublished) {
      await this.cache.del(
        ...current.rooms.map((r) => resourceKey('ROOM', r.id)),
        ...current.desks.map((d) => resourceKey('DESK', d.id)),
      );
    }
    return location;
  }

  // ---------- Salas ----------
  findRooms(query: RoomQueryDto) {
    return this.prisma.room.findMany({
      where: {
        isActive: true,
        locationId: query.locationId,
        location: { isPublished: true, country: sameText(query.country) },
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
  findDesks(query: DeskQueryDto) {
    return this.prisma.desk.findMany({
      where: { isActive: true, locationId: query.locationId, location: { isPublished: true, country: sameText(query.country) } },
      orderBy: { code: 'asc' },
    });
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
      const room = await this.prisma.room.findUnique({ where: { id }, include: { location: { select: { isPublished: true } } } });
      if (room) {
        const isActive = room.isActive && (room.location?.isPublished ?? true);
        view = { id: room.id, type, locationId: room.locationId, name: room.name, capacity: room.capacity, isActive, equipment: room.equipment };
      }
    } else {
      const desk = await this.prisma.desk.findUnique({ where: { id }, include: { location: { select: { isPublished: true } } } });
      if (desk) {
        const isActive = desk.isActive && (desk.location?.isPublished ?? true);
        view = { id: desk.id, type, locationId: desk.locationId, name: desk.code, capacity: 1, isActive, isDedicated: desk.isDedicated };
      }
    }
    if (!view) throw new NotFoundException('Recurso no encontrado');
    await this.cache.set(key, view, this.ttl);
    return { ...view, cached: false };
  }
}
