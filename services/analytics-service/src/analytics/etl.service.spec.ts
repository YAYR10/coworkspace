import { EtlService } from './etl.service';
import { KpiService } from './kpi.service';

describe('Analytics ETL y KPIs', () => {
  const etl = new EtlService({} as any, {} as any);

  it('calcula la ocupación por sede y franja con la capacidad de la sede', () => {
    const rows = etl.transformOccupancy(
      [{ id: 'l-1', name: 'Chapinero', city: 'Bogotá', resources: 4 }],
      [
        { location_id: 'l-1', day: '2026-10-20', weekday: 2, hour_slot: 9, booked_hours: 3, bookings: 3 },
        { location_id: 'otra', day: '2026-10-20', weekday: 2, hour_slot: 9, booked_hours: 1, bookings: 1 },
      ],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ locationName: 'Chapinero', hourSlot: 9, capacityHours: 4, occupancyRate: 0.75 });
    expect(rows[0].day.toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('suma mensualidades y cargos adicionales por plan y mes', () => {
    const rows = etl.transformRevenue(
      [{ period: '2026-10', plan_code: 'FLEX', plan_name: 'Flex', revenue: 700000, invoices: 2, members: 2 }],
      [
        { period: '2026-10', plan_code: 'FLEX', plan_name: 'Flex', revenue: 50000, members: 1 },
        { period: '2026-10', plan_code: 'SIN_PLAN', plan_name: 'Sin membresía', revenue: 30000, members: 1 },
      ],
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ planCode: 'FLEX', membershipRevenue: 700000, extraRevenue: 50000, totalRevenue: 750000, invoices: 2 }),
        expect.objectContaining({ planCode: 'SIN_PLAN', totalRevenue: 30000 }),
      ]),
    );
  });

  it('registra la ejecución y reemplaza los KPIs en una sola transacción', async () => {
    const prisma: any = {
      etlRun: { create: jest.fn().mockResolvedValue({ id: 'r-1' }), update: jest.fn(({ data }: any) => data) },
      occupancyByLocation: { deleteMany: jest.fn(), createMany: jest.fn() },
      revenueByPlan: { deleteMany: jest.fn(), createMany: jest.fn() },
      memberRetention: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const source: any = {
      query: jest.fn(async (sql: string) => (sql.includes('cohort') ? [{ cohort: '2026-09', members: 4, retained: 3 }] : [])),
    };
    const run = await new EtlService(prisma, source).run('manual');
    expect(source.query).toHaveBeenCalledTimes(5);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.memberRetention.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ cohort: '2026-09', churned: 1, retentionRate: 0.75 })] });
    expect(run).toMatchObject({ status: 'OK', rows: 1 });
  });

  it('el tablero calcula ocupación, hora pico y retención desde las tablas de KPIs', async () => {
    const prisma: any = {
      occupancyByLocation: {
        findMany: jest.fn().mockResolvedValue([
          { locationId: 'l-1', locationName: 'A', city: 'Bogotá', capacityHours: 2, bookedHours: 2, bookings: 2, hourSlot: 10, weekday: 1 },
          { locationId: 'l-1', locationName: 'A', city: 'Bogotá', capacityHours: 2, bookedHours: 1, bookings: 1, hourSlot: 15, weekday: 1 },
        ]),
      },
      memberRetention: { findMany: jest.fn().mockResolvedValue([{ cohort: '2026-09', members: 10, retained: 8 }]) },
      etlRun: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const s = await new KpiService(prisma).summary(false, 12);
    expect(s.peakHour).toMatchObject({ hour: 10 });
    expect(s.retentionRate).toBe(80);
    expect(s.revenue).toBeNull();
    expect(s.activeMembers).toBe(12);
  });
});
