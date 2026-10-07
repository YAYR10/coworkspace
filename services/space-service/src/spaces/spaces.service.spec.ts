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

describe('SpacesService: fotos y sedes de ejemplo', () => {
  let prisma: any;
  let service: SpacesService;

  beforeEach(() => {
    prisma = {
      location: {
        findUnique: jest.fn().mockResolvedValue({ id: 'l-1', isPublished: true, rooms: [], desks: [] }),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn((args: any) => Promise.resolve({ id: 'l-1', ...args.data })),
      },
      locationPhoto: { upsert: jest.fn() },
    };
    service = new SpacesService(prisma, { del: jest.fn() } as any);
  });

  it('guarda la foto y actualiza la URL con una versión nueva', async () => {
    const dataUrl = `data:image/jpeg;base64,${Buffer.from('fake-jpeg').toString('base64')}`;
    const result = await service.setPhoto('l-1', { dataUrl });
    expect(prisma.locationPhoto.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ mime: 'image/jpeg' }) }));
    expect(result.photoUrl).toMatch(/^\/api\/locations\/l-1\/photo\?v=\d+$/);
  });

  it('las sedes de ejemplo no se duplican si ya existen', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'ya-existe' });
    const result = await service.seedDemo();
    expect(result.created).toBe(0);
    expect(prisma.location.create).not.toHaveBeenCalled();
  });

  it('crea las sedes de ejemplo con salas y puestos', async () => {
    prisma.location.findFirst.mockResolvedValue(null);
    const result = await service.seedDemo();
    expect(result.created).toBe(result.total);
    expect(prisma.location.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rooms: { create: expect.any(Array) }, desks: { create: expect.any(Array) } }) }),
    );
  });
});
