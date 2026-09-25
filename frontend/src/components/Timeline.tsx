import type { BusySlot } from '../api';
import { atHour, hourLabel } from '../format';

export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 21;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

export interface Selection { start: number; end: number }

interface Props {
  day: Date;
  busy: BusySlot[];
  selection: Selection | null;
  onPick: (hour: number) => void;
  label: string;
}

/** Franja de 7 am a 9 pm. Cada celda es una hora; las reservas existentes se dibujan encima. */
export function Timeline({ day, busy, selection, onPick, label }: Props) {
  const now = Date.now();
  const span = CLOSE_HOUR - OPEN_HOUR;
  const pct = (d: Date) => ((d.getHours() + d.getMinutes() / 60 - OPEN_HOUR) / span) * 100;

  const isBusy = (h: number) => {
    const s = atHour(day, h).getTime();
    const e = s + 3_600_000;
    return busy.some((b) => new Date(b.startTime).getTime() < e && new Date(b.endTime).getTime() > s);
  };

  return (
    <div className="timeline" role="group" aria-label={label}>
      <div className="timeline-track">
        {HOURS.map((h) => {
          const past = atHour(day, h + 1).getTime() <= now;
          const taken = isBusy(h);
          const picked = !!selection && h >= selection.start && h < selection.end;
          return (
            <button
              key={h}
              type="button"
              className={`slot${picked ? ' is-picked' : ''}`}
              disabled={past || taken}
              aria-pressed={picked}
              aria-label={`${hourLabel(h)} ${taken ? 'ocupado' : past ? 'ya pasó' : 'libre'}`}
              onClick={() => onPick(h)}
            />
          );
        })}
        {busy.map((b, i) => {
          const s = new Date(b.startTime);
          const e = new Date(b.endTime);
          const left = Math.max(0, pct(s));
          const right = Math.min(100, pct(e));
          if (right <= 0 || left >= 100) return null;
          return (
            <span
              key={i}
              className={`busy busy-${b.status.toLowerCase()}`}
              style={{ left: `${left}%`, width: `${right - left}%` }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div className="timeline-ruler" aria-hidden="true">
        {HOURS.map((h) => (
          <span key={h}>{h % 2 === 1 ? hourLabel(h) : ''}</span>
        ))}
      </div>
    </div>
  );
}
