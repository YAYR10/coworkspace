import { Injectable } from '@nestjs/common';
import { Counter } from 'prom-client';

const created = new Counter({ name: 'bookings_created_total', help: 'Reservas creadas', labelNames: ['resource_type'] });
const conflicts = new Counter({ name: 'booking_conflicts_total', help: 'Reservas rechazadas por solapamiento' });
const retries = new Counter({ name: 'booking_optimistic_retries_total', help: 'Reintentos por conflicto de bloqueo optimista' });
const cancelled = new Counter({ name: 'bookings_cancelled_total', help: 'Reservas canceladas', labelNames: ['reason'] });
const confirmed = new Counter({ name: 'bookings_confirmed_total', help: 'Reservas confirmadas por la saga' });

/** Métricas para Prometheus (reservas por minuto = rate(bookings_created_total[1m])). */
@Injectable()
export class BookingMetrics {
  created(resourceType: string) {
    created.inc({ resource_type: resourceType });
  }
  conflict() {
    conflicts.inc();
  }
  retry() {
    retries.inc();
  }
  cancelled(reason: string) {
    cancelled.inc({ reason });
  }
  confirmed() {
    confirmed.inc();
  }
}
