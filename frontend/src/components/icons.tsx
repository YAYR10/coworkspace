/** Íconos de línea (24×24, trazo actual). Sin librerías para no inflar el sitio. */
import type { ReactNode } from 'react';

const Svg = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const PinIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);
export const SearchIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);
export const PeopleIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.4c1.7.6 2.8 2.2 3.1 4.6" />
  </Svg>
);
export const DeskIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="3" y="4" width="18" height="11" rx="1.5" />
    <path d="M8 19h8M12 15v4" />
  </Svg>
);
export const RoomIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="4" y="7" width="16" height="7" rx="1.5" />
    <path d="M6 14v5M18 14v5M8 7V5M16 7V5M12 7V4" />
  </Svg>
);
export const ArrowLeft = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);
export const CheckIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const MapIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" />
    <path d="M9 4v14M15 6v14" />
  </Svg>
);
export const GridIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </Svg>
);
export const BuildingIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4 21V5.5L13 3v18M13 8l7 2v11M3 21h18" />
    <path d="M7.5 8h2M7.5 11.5h2M7.5 15h2M16 13h1.5M16 16.5h1.5" />
  </Svg>
);
export const CloseIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const MenuIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

/** Ícono por servicio de sede (palabras clave en español). */
export function ServiceIcon({ name, size = 20 }: { name: string; size?: number }) {
  const n = name.toLowerCase();
  if (n.includes('wifi') || n.includes('internet'))
    return <Svg size={size}><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.3a9.5 9.5 0 0 1 13 0M8.6 15.6a5 5 0 0 1 6.8 0" /><circle cx="12" cy="19" r=".8" fill="currentColor" /></Svg>;
  if (n.includes('café') || n.includes('cafe') || n.includes('agua'))
    return <Svg size={size}><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3" /></Svg>;
  if (n.includes('parque'))
    return <Svg size={size}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3" /></Svg>;
  if (n.includes('locker'))
    return <Svg size={size}><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M12 3.5v17M9 10v2M15 10v2" /></Svg>;
  if (n.includes('impres'))
    return <Svg size={size}><path d="M7 8V3.5h10V8M7 17H4.5V9.5A1.5 1.5 0 0 1 6 8h12a1.5 1.5 0 0 1 1.5 1.5V17H17" /><rect x="7" y="13.5" width="10" height="7" /></Svg>;
  if (n.includes('cabina') || n.includes('teléf') || n.includes('telef'))
    return <Svg size={size}><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" /></Svg>;
  if (n.includes('24') || n.includes('acceso'))
    return <Svg size={size}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
  if (n.includes('aire'))
    return <Svg size={size}><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6.5l2.5-2M9.5 19.5 12 17.5l2.5 2" /></Svg>;
  if (n.includes('cocina'))
    return <Svg size={size}><path d="M7 3.5v7a2 2 0 0 0 2 2V20.5M5 3.5v5M9 3.5v5M16.5 20.5V3.5c-2 1-3 3.5-3 7h3" /></Svg>;
  if (n.includes('mascota'))
    return <Svg size={size}><circle cx="6.5" cy="11" r="1.8" /><circle cx="17.5" cy="11" r="1.8" /><circle cx="9.5" cy="6.5" r="1.8" /><circle cx="14.5" cy="6.5" r="1.8" /><path d="M8 18a4 4 0 0 1 8 0c0 1.5-1.5 2-4 2s-4-.5-4-2z" /></Svg>;
  if (n.includes('recep'))
    return <Svg size={size}><path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6.5M10.5 6.5h3" /></Svg>;
  if (n.includes('descanso') || n.includes('lounge'))
    return <Svg size={size}><path d="M4 11V8.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V11M3 12.5a1.5 1.5 0 0 1 3 0V15h12v-2.5a1.5 1.5 0 0 1 3 0V18H3zM5 18v2M19 18v2" /></Svg>;
  return <CheckIcon size={size} />;
}
