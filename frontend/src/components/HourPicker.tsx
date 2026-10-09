import type { BusySlot } from '../api';
import { atHour, hourLabel } from '../format';

export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 21;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

export interface Range { start: number; end: number }

const isTaken = (day: Date, h: number, busy: BusySlot[]) => {
  const s = atHour(day, h).getTime();
  const e = s + 3_600_000;
  return busy.some((b) => new Date(b.startTime).getTime() < e && new Date(b.endTime).getTime() > s);
};

/** Siguiente selección: un toque marca la hora de inicio; otro toque posterior extiende hasta esa hora. */
export function nextRange(current: Range | null, h: number, day: Date, busy: BusySlot[], anchored: boolean): Range {
  if (current && anchored && h >= current.start && h - current.start < 12) {
    const clash = HOURS.filter((x) => x >= current.start && x <= h).some((x) => isTaken(day, x, busy));
    if (!clash) return { start: current.start, end: h + 1 };
  }
  return { start: h, end: h + 1 };
}

/** Rejilla de horas del día (7 am – 9 pm) con libres, ocupadas y la selección. */
export function HourPicker({ day, busy, range, onPick }: { day: Date; busy: BusySlot[]; range: Range | null; onPick: (h: number) => void }) {
  const now = Date.now();
  return (
    <div className="hours" role="group" aria-label="Horas del día">
      {HOURS.map((h) => {
        const past = atHour(day, h + 1).getTime() <= now;
        const taken = isTaken(day, h, busy);
        const on = !!range && h >= range.start && h < range.end;
        const edge = !!range && (h === range.start || h === range.end - 1);
        return (
          <button
            key={h}
            type="button"
            className={`hour${on ? ' is-on' : ''}${edge ? ' is-edge' : ''}${taken ? ' is-taken' : ''}`}
            disabled={past || taken}
            aria-pressed={on}
            onClick={() => onPick(h)}
            title={taken ? 'Ocupado' : past ? 'Ya pasó' : 'Libre'}
          >
            {hourLabel(h)}
          </button>
        );
      })}
    </div>
  );
}
