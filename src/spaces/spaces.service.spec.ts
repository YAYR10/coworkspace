import { NotFoundException } from '@nestjs/common';
import { SpacesService } from './spaces.service';

describe('SpacesService.getResource', () => {
  let prisma: any;
  let cache: any;
  let service: SpacesService;

  beforeEach(() => {
    prisma = { room: { findUnique: jest.fn() }, desk: { findUnique: jest.fn() } };
    cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
    service = new SpacesService(prisma, cache);
  });

  it('devuelve el recurso desde caché sin tocar la base de datos', async () => {
    cache.get.mockResolvedValue({ id: 'r-1', type: 'ROOM', locationId: 'l-1', name: 'Sala A', capacity: 6, isActive: true });
    const result = await service.getResource('ROOM', 'r-1');
    expect(result.cached).toBe(true);
    expect(prisma.room.findUnique).not.toHaveBeenCalled();
  });

  it('consulta PostgreSQL y guarda en caché cuando no está cacheado', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r-1', locationId: 'l-1', name: 'Sala A', capacity: 6, isActive: true, equipment: {} });
    const result = await service.getResource('ROOM', 'r-1');
    expect(result).toMatchObject({ id: 'r-1', type: 'ROOM', capacity: 6, cached: false });
    expect(cache.set).toHaveBeenCalledWith('space:resource:ROOM:r-1', expect.any(Object), expect.any(Number));
  });

  it('lanza 404 si el recurso no existe', async () => {
    prisma.desk.findUnique.mockResolvedValue(null);
    await expect(service.getResource('DESK', 'd-x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('una sala de una sede sin publicar no se puede reservar', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r-2', locationId: 'l-2', name: 'Sala B', capacity: 4, isActive: true, equipment: {}, location: { isPublished: false } });
    const result = await service.getResource('ROOM', 'r-2');
    expect(result.isActive).toBe(false);
  });
});

describe('SpacesService.findCountries', () => {
  it('agrupa las sedes publicadas por país con sus ciudades', async () => {
    const prisma: any = {
      location: {
        findMany: jest.fn().mockResolvedValue([
          { country: 'Colombia', city: 'Montería' },
          { country: 'Colombia', city: 'Bogotá' },
          { country: 'México', city: 'CDMX' },
        ]),
      },
    };
    const service = new SpacesService(prisma, {} as any);
    const result = await service.findCountries();
    expect(prisma.location.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublished: true } }));
    expect(result).toEqual([
      { country: 'Colombia', locations: 2, cities: ['Bogotá', 'Montería'] },
      { country: 'México', locations: 1, cities: ['CDMX'] },
    ]);
  });
});
