import { ConflictException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SourceDb } from '../clients/source.db';
import { PrismaService } from '../prisma/prisma.service';
import { queries } from './etl.queries';

const WINDOW_DAYS = () => Number(process.env.ANALYTICS_WINDOW_DAYS ?? 90);
export const TZ = () => process.env.ANALYTICS_TZ ?? 'America/Bogota';

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * ETL periódico: Extrae de las réplicas de solo lectura de Membership, Space, Booking y Billing,
 * Transforma en KPIs y Carga en las tablas propias de Analytics (reemplazo completo en una transacción).
 */
@Injectable()
export class EtlService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EtlService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly source: SourceDb,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test') return;
    // Al despertar (Render free) se recalcula para que el panel no muestre datos viejos
    setTimeout(() => void this.run('startup').catch(() => undefined), 15000);
  }

  @Cron(process.env.ANALYTICS_ETL_CRON ?? '0 */30 * * * *')
  scheduled() {
    return this.run('cron').catch(() => undefined);
  }

  async run(trigger: 'cron' | 'manual' | 'startup') {
    if (this.running) throw new ConflictException('Ya hay un ETL en curso');
    this.running = true;
    const run = await this.prisma.etlRun.create({ data: { trigger, status: 'RUNNING' } });
    const started = Date.now();
    try {
      const q = queries();
      const [locations, occupancy, membershipRev, extraRev, retention] = await Promise.all([
        this.source.query(q.locations),
        this.source.query(q.occupancy, [WINDOW_DAYS(), TZ()]),
        this.source.query(q.membershipRevenue),
        this.source.query(q.extraRevenue, [TZ()]),
        this.source.query(q.retention),
      ]);

      const occupancyRows = this.transformOccupancy(locations, occupancy);
      const revenueRows = this.transformRevenue(membershipRev, extraRev);
      const retentionRows = retention.map((r: any) => ({
        cohort: r.cohort,
        members: r.members,
        retained: r.retained,
        churned: r.members - r.retained,
        retentionRate: r.members ? round(r.retained / r.members) : 0,
      }));

      await this.prisma.$transaction([
        this.prisma.occupancyByLocation.deleteMany({}),
        this.prisma.occupancyByLocation.createMany({ data: occupancyRows }),
        this.prisma.revenueByPlan.deleteMany({}),
        this.prisma.revenueByPlan.createMany({ data: revenueRows }),
        this.prisma.memberRetention.deleteMany({}),
        this.prisma.memberRetention.createMany({ data: retentionRows }),
      ]);
      const rows = occupancyRows.length + revenueRows.length + retentionRows.length;
      const durationMs = Date.now() - started;
      this.logger.log(`ETL ${trigger}: ${rows} filas en ${durationMs} ms`);
      return this.prisma.etlRun.update({ where: { id: run.id }, data: { status: 'OK', finishedAt: new Date(), durationMs, rows } });
    } catch (err) {
      this.logger.error(`ETL ${trigger} falló: ${err.message}`);
      await this.prisma.etlRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', finishedAt: new Date(), durationMs: Date.now() - started, error: String(err.message).slice(0, 500) },
      });
      throw err;
    } finally {
      this.running = false;
    }
  }

  transformOccupancy(locations: any[], rows: any[]) {
    const byId = new Map(locations.map((l) => [l.id, l]));
    return rows
      .filter((r) => byId.has(r.location_id))
      .map((r) => {
        const loc = byId.get(r.location_id);
        const capacityHours = Math.max(1, Number(loc.resources));
        const bookedHours = round(Number(r.booked_hours), 2);
        return {
          locationId: r.location_id,
          locationName: loc.name,
          city: loc.city,
          day: new Date(`${r.day}T00:00:00.000Z`),
          weekday: r.weekday,
          hourSlot: r.hour_slot,
          bookedHours,
          capacityHours,
          occupancyRate: round(Math.min(1, bookedHours / capacityHours)),
          bookings: r.bookings,
        };
      });
  }

  transformRevenue(membership: any[], extra: any[]) {
    const rows = new Map<string, any>();
    const key = (r: any) => `${r.period}|${r.plan_code}`;
    const get = (r: any) => {
      if (!rows.has(key(r))) {
        rows.set(key(r), { period: r.period, planCode: r.plan_code, planName: r.plan_name, membershipRevenue: 0, extraRevenue: 0, totalRevenue: 0, invoices: 0, payingMembers: 0 });
      }
      return rows.get(key(r));
    };
    for (const r of membership) {
      const row = get(r);
      row.membershipRevenue += r.revenue;
      row.invoices += r.invoices;
      row.payingMembers = Math.max(row.payingMembers, r.members);
    }
    for (const r of extra) get(r).extraRevenue += r.revenue;
    for (const row of rows.values()) row.totalRevenue = row.membershipRevenue + row.extraRevenue;
    return [...rows.values()];
  }

  runs() {
    return this.prisma.etlRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });
  }

  activeMembers(): Promise<number> {
    return this.source.query(queries().activeMembers).then((r) => r[0]?.n ?? 0);
  }
}
