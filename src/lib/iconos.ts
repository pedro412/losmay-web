/**
 * Trazos de los íconos de línea del diseño (docs/design/Main.dc.html), en
 * una cuadrícula de 24×24. Los dibuja `src/components/Icon.astro`.
 *
 * Vive en un módulo .ts aparte para que src/data/site.ts pueda usar el tipo
 * `IconName` sin depender de un componente.
 */
export const icons = {
  /** Contratistas */
  casco:
    '<path d="M3 18h18"/><path d="M5 18v-3a7 7 0 0 1 14 0v3"/><path d="M10 8.5V5h4v3.5"/>',
  /** Constructoras y arquitectos */
  plano:
    '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h7v10"/><path d="M14 4v6h7"/>',
  /** Ferreterías y materialistas */
  tienda:
    '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M10 20v-6h4v6"/>',
  /** Desarrolladores */
  capas:
    '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  /** Existencia al momento */
  caja: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4"/><path d="M12 11v10"/>',
  /** Todo por escrito */
  documento:
    '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h5"/>',
  /** Crédito a empresas */
  tarjeta:
    '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
  /** Dirección de sucursal */
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  telefono:
    '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  /** Flecha de botones ("Pedir mayoreo") */
  "flecha-derecha": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  /** Chevron de los links del menú móvil */
  "chevron-derecha": '<path d="M9 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
} as const;

export type IconName = keyof typeof icons;
