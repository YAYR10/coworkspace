import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OPEN_HOURS = () => Math.max(1, Number(process.env.ANALYTICS_OPEN_HOURS ?? 14)); // 7:00–21:00
const pct = (n: number) => Math.round(n * 1000) / 10;

/** Lectura de los KPIs ya calculados por el ETL (consultas baratas sobre tablas propias). */
@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  async occupancy(days = 30, locationId?: string) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - days + 1);
    const rows = await this.prisma.occupancyByLocation.findMany({ where: { day: { gte: since }, locationId: locationId || undefined } });

    const locations = new Map<string, { locationId: string; name: string; city: string; capacity: number; bookedHours: number; bookings: number }>();
    const byHour = new Map<number, number>();
    const heat = new Map<string, number>();
    for (const r of rows) {
      const loc = locations.get(r.locationId) ?? { locationId: r.locationId, name: r.locationName, city: r.city, capacity: r.capacityHours, bookedHours: 0, bookings: 0 };
      loc.bookedHours += r.bookedHours;
      loc.bookings += r.bookings;
      locations.set(r.locationId, loc);
      byHour.set(r.hourSlot, (byHour.get(r.hourSlot) ?? 0) + r.bookedHours);
      heat.set(`${r.weekday}-${r.hourSlot}`, (heat.get(`${r.weekday}-${r.hourSlot}`) ?? 0) + r.bookedHours);
    }
    const capacity = [...locations.values()].reduce((s, l) => s + l.capacity, 0) || 1;
    const booked = [...locations.values()].reduce((s, l) => s + l.bookedHours, 0);
    const weeks = Math.max(1, days / 7);

    return {
      days,
      occupancyRate: pct(booked / (capacity * OPEN_HOURS() * days)),
      bookedHours: Math.round(booked * 10) / 10,
      byLocation: [...locations.values()]
        .map((l) => ({ ...l, bookedHours: Math.round(l.bookedHours * 10) / 10, occupancyRate: pct(l.bookedHours / (l.capacity * OPEN_HOURS() * days)) }))
        .sort((a, b) => b.occupancyRate - a.occupancyRate),
      byHour: [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, h]) => ({ hour, occupancyRate: pct(h / (capacity * days)) })),
      heatmap: [...heat.entries()].map(([k, h]) => {
        const [weekday, hour] = k.split('-').map(Number);
        return { weekday, hour, occupancyRate: pct(h / (capacity * weeks)) };
      }),
    };
  }

  async revenue() {
    const rows = await this.prisma.revenueByPlan.findMany({ orderBy: [{ period: 'asc' }, { planCode: 'asc' }] });
    const byPlan = new Map<string, { planCode: string; planName: string; total: number; membership: number; extra: number }>();
    const byPeriod = new Map<string, number>();
    for (const r of rows) {
      const p = byPlan.get(r.planCode) ?? { planCode: r.planCode, planName: r.planName, total: 0, membership: 0, extra: 0 };
      p.total += r.totalRevenue;
      p.membership += r.membershipRevenue;
      p.extra += r.extraRevenue;
      byPlan.set(r.planCode, p);
      byPeriod.set(r.period, (byPeriod.get(r.period) ?? 0) + r.totalRevenue);
    }
    return {
      rows,
      byPlan: [...byPlan.values()].sort((a, b) => b.total - a.total),
      byPeriod: [...byPeriod.entries()].map(([period, total]) => ({ period, total })),
      total: rows.reduce((s, r) => s + r.totalRevenue, 0),
    };
  }

  async retention() {
    const cohorts = await this.prisma.memberRetention.findMany({ orderBy: { cohort: 'asc' } });
    const members = cohorts.reduce((s, c) => s + c.members, 0);
    const retained = cohorts.reduce((s, c) => s + c.retained, 0);
    return { cohorts, members, retained, churned: members - retained, retentionRate: members ? pct(retained / members) : 0 };
  }

  async summary(includeRevenue: boolean, activeMembers: number | null) {
    const [occ, ret, lastRun] = await Promise.all([
      this.occupancy(30),
      this.retention(),
      this.prisma.etlRun.findFirst({ where: { status: 'OK' }, orderBy: { startedAt: 'desc' } }),
    ]);
    const peak = [...occ.byHour].sort((a, b) => b.occupancyRate - a.occupancyRate)[0] ?? null;
    let revenue = null;
    if (includeRevenue) {
      const rev = await this.revenue();
      const month = new Date().toISOString().slice(0, 7);
      revenue = { thisMonth: rev.byPeriod.find((p) => p.period === month)?.total ?? 0, total: rev.total, topPlan: rev.byPlan[0] ?? null };
    }
    return {
      occupancyRate30d: occ.occupancyRate,
      bookedHours30d: occ.bookedHours,
      topLocation: occ.byLocation[0] ?? null,
      peakHour: peak,
      activeMembers,
      retentionRate: ret.retentionRate,
      revenue,
      lastEtlAt: lastRun?.finishedAt ?? null,
    };
  }
}
