import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { SpaceClient, spaceServiceUrl } from './space.client';

describe('SpaceClient', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.SPACE_RETRY_BUDGET_MS;
  });

  it('usa la URL pública de Render si no está configurada', () => {
    expect(spaceServiceUrl({ RENDER: 'true' })).toBe('https://coworkspace-space.onrender.com');
    expect(spaceServiceUrl({ SPACE_SERVICE_URL: 'space-service:3002/' })).toBe('http://space-service:3002');
    expect(spaceServiceUrl({})).toBe('http://localhost:3002');
  });

  it('reintenta mientras Space despierta (502) y luego responde', async () => {
    const ok = { id: 'r-1', type: 'ROOM', locationId: 'l-1', name: 'Sala', capacity: 4, isActive: true };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 502, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ok }) as any;
    const client = new SpaceClient();
    await expect(client.getResource('ROOM', 'r-1')).resolves.toMatchObject({ id: 'r-1' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('404 no se reintenta', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false }) as any;
    await expect(new SpaceClient().getResource('ROOM', 'x')).rejects.toBeInstanceOf(NotFoundException);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('se rinde con 503 cuando se acaba el tiempo', async () => {
    process.env.SPACE_RETRY_BUDGET_MS = '1500';
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as any;
    await expect(new SpaceClient().getResource('ROOM', 'x')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
