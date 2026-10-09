import { link } from '../router';
import { Brand, StatusChip } from './ServiceStatus';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Brand />
          <p>Salas de reunión y puestos de trabajo por horas, con planes mensuales para equipos.</p>
        </div>
        <nav className="footer-links" aria-label="Pie de página">
          <a href={link('/')}>Buscar sedes</a>
          <a href={link('/cuenta/reservas')}>Mis reservas</a>
          <a href={link('/cuenta/membresia')}>Planes y membresía</a>
        </nav>
        <div className="footer-status">
          <span>Estado de la plataforma</span>
          <StatusChip />
        </div>
      </div>
    </footer>
  );
}
