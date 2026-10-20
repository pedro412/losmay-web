/**
 * Contenido editable de la landing de Los May.
 *
 * Todo lo que cambia con el negocio (teléfonos, horarios, direcciones, textos
 * de WhatsApp, preguntas frecuentes, listas de las secciones) vive aquí, para
 * que cambiar un horario o un teléfono sea un PR de una línea. Los componentes
 * no deben tener nada de esto escrito a mano.
 *
 * El copy es el del diseño (docs/design/Main.dc.html), palabra por palabra.
 *
 * Datos por confirmar con el cliente: se dejan visibles entre corchetes, como
 * en el diseño ("[zonas]", "[Confirmar]"), y se marcan con `TODO(cliente)`.
 * Los componentes los resaltan en amarillo con `<Texto>` (ver
 * `partirPendientes`). Lista completa en el issue #15.
 */
import type { IconName } from "../components/Icon.astro";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Deja solo los dígitos de un número de teléfono. */
const soloDigitos = (numero: string): string => numero.replace(/\D/g, "");

/**
 * Número en formato internacional de México, solo dígitos (`529381082953`).
 * Acepta números locales de 10 dígitos (`938 108 2953`) o ya con lada de país.
 */
const internacional = (numero: string): string => {
  const digitos = soloDigitos(numero);
  return digitos.length === 10 ? `52${digitos}` : digitos;
};

/** Link de WhatsApp con el mensaje prellenado. */
export function waLink(mensaje: string): string {
  return `https://wa.me/${internacional(whatsapp)}?text=${encodeURIComponent(mensaje)}`;
}

/** Link de Google Maps que busca la dirección. */
export function mapsLink(direccion: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

/** Link `tel:` en formato internacional (`tel:+529381082953`). */
export function telLink(numero: string): string {
  return `tel:+${internacional(numero)}`;
}

/** Tramo de un texto: normal o dato por confirmar con el cliente. */
export interface Segmento {
  texto: string;
  pendiente: boolean;
}

/**
 * Parte un texto en tramos normales y pendientes. Los pendientes son los que
 * van entre corchetes (`"Fuera de la ciudad: [zonas]."`) y conservan los
 * corchetes, como en el diseño.
 */
export function partirPendientes(texto: string): Segmento[] {
  return texto
    .split(/(\[[^\]]+\])/)
    .filter((parte) => parte !== "")
    .map((parte) => ({ texto: parte, pendiente: /^\[[^\]]+\]$/.test(parte) }));
}

/** `true` si el texto tiene algún dato por confirmar. */
export const tienePendientes = (texto: string): boolean =>
  /\[[^\]]+\]/.test(texto);

/* -------------------------------------------------------------------------- */
/* Negocio                                                                    */
/* -------------------------------------------------------------------------- */

export const negocio = {
  nombre: "Los May Materiales para Construcción",
  nombreCorto: "Los May",
  ciudad: "Ciudad del Carmen",
  estado: "Campeche",
  dominio: "losmay.com",
  url: "https://losmay.com",
  descripcion: "Materiales para construcción en Ciudad del Carmen, Campeche.",
} as const;

/** Pedido mínimo de mayoreo, en toneladas. */
export const minimoMayoreo = 16;

/* -------------------------------------------------------------------------- */
/* WhatsApp                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Número de WhatsApp para cotizaciones, en formato internacional.
 *
 * TODO(cliente): confirmar el número definitivo. El diseño usa el de Santa
 * Rosalía (938 108 2953). ¿Uno para todo o uno por sucursal? (issue #15)
 */
export const whatsapp = "529381082953";

/** Textos prellenados de WhatsApp. */
export const mensajes = {
  /** Header, menú móvil y hero. */
  general: "Hola Los May, quiero cotizar material para mi obra.",
  /** CTA final. */
  mayoreo: `Hola Los May, quiero cotizar cemento Holcim por mayoreo (desde ${minimoMayoreo} toneladas).`,
  /** Tarjetas de 16, 24 y 32 t. */
  porTonelaje: (ton: number) =>
    `Hola Los May, quiero cotizar ${ton} toneladas de cemento Holcim. Mi obra está en: `,
  /** Tarjeta de +32 t. */
  masDe32:
    "Hola Los May, quiero cotizar más de 32 toneladas de cemento Holcim. Necesito aproximadamente: ",
} as const;

/** Links de WhatsApp listos para usar en los botones. */
export const wa = {
  general: waLink(mensajes.general),
  mayoreo: waLink(mensajes.mayoreo),
} as const;

/* -------------------------------------------------------------------------- */
/* Pedido de mayoreo                                                          */
/* -------------------------------------------------------------------------- */

export interface Pedido {
  /** Toneladas, o `"+32"` para la tarjeta abierta. */
  ton: number | "+32";
  /** Lo que se muestra en grande: `"16 t"`, `"+32 t"`. */
  etiqueta: string;
  titulo: string;
  detalle: string;
  /** Texto accesible del link. */
  aria: string;
  /** Link de WhatsApp con el pedido escrito. */
  href: string;
}

const porTonelaje = (ton: number, titulo: string, detalle: string): Pedido => ({
  ton,
  etiqueta: `${ton} t`,
  titulo,
  detalle,
  aria: `Pedir ${ton} toneladas por WhatsApp`,
  href: waLink(mensajes.porTonelaje(ton)),
});

export const pedidos: readonly Pedido[] = [
  porTonelaje(minimoMayoreo, "Mínimo de mayoreo", "Entrega programada en obra"),
  porTonelaje(24, "Entrega en obra", "Fecha y horario a tu medida"),
  porTonelaje(32, "Entrega en obra", "En una o varias entregas"),
  {
    ton: "+32",
    etiqueta: "+32 t",
    titulo: "Más de 32 toneladas",
    detalle: "Obra grande o entregas por etapa",
    aria: "Pedir más de 32 toneladas por WhatsApp",
    href: waLink(mensajes.masDe32),
  },
];

/* -------------------------------------------------------------------------- */
/* Sucursales                                                                 */
/* -------------------------------------------------------------------------- */

/** Día en el formato de schema.org (`openingHoursSpecification`). */
export type Dia =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface Horario {
  /** Como se muestra: "Lunes a viernes", "Sábado". */
  etiqueta: string;
  /** Días que cubre, para los datos estructurados de SEO. */
  dias: readonly Dia[];
  /** Hora de apertura en 24 h (`"07:30"`), o `null` si está cerrado. */
  abre: string | null;
  /** Hora de cierre en 24 h (`"18:00"`), o `null` si está cerrado. */
  cierra: string | null;
}

export interface Sucursal {
  id: string;
  nombre: string;
  /** Dirección completa, como se muestra en la tarjeta. */
  direccion: string;
  /** Dirección corta del footer (sin ciudad). */
  direccionCorta: string;
  /** Lo que se busca en Google Maps para "Cómo llegar". */
  mapsQuery: string;
  /** Teléfono como se muestra (`938 108 2953`). */
  telefono: string;
  horarios: readonly Horario[];
}

const LUNES_A_VIERNES: readonly Dia[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// TODO(cliente): validar direcciones, teléfonos y horarios de las dos
// sucursales (issue #15).
export const sucursales: readonly Sucursal[] = [
  {
    id: "santa-rosalia",
    nombre: "Santa Rosalía",
    direccion: "Corregidora 8, Santa Rosalía, 24197 Cd. del Carmen, Camp.",
    direccionCorta: "Corregidora 8, Santa Rosalía, 24197",
    mapsQuery:
      "Corregidora 8, Santa Rosalía, 24197 Ciudad del Carmen, Campeche",
    telefono: "938 108 2953",
    horarios: [
      {
        etiqueta: "Lunes a viernes",
        dias: LUNES_A_VIERNES,
        abre: "07:00",
        cierra: "18:00",
      },
      {
        etiqueta: "Sábado",
        dias: ["Saturday"],
        abre: "08:00",
        cierra: "15:00",
      },
      { etiqueta: "Domingo", dias: ["Sunday"], abre: "08:00", cierra: "13:00" },
    ],
  },
  {
    id: "santa-isabel",
    nombre: "Santa Isabel",
    direccion: "Av. Puerto de Campeche, Volcanes, 24150 Cd. del Carmen, Camp.",
    direccionCorta: "Av. Puerto de Campeche, Volcanes, 24150",
    mapsQuery:
      "Av. Puerto de Campeche, Volcanes, 24150 Ciudad del Carmen, Campeche",
    telefono: "938 132 6244",
    horarios: [
      {
        etiqueta: "Lunes a viernes",
        dias: LUNES_A_VIERNES,
        abre: "07:30",
        cierra: "18:00",
      },
      {
        etiqueta: "Sábado",
        dias: ["Saturday"],
        abre: "07:30",
        cierra: "15:00",
      },
      { etiqueta: "Domingo", dias: ["Sunday"], abre: null, cierra: null },
    ],
  },
];

/** Hora sin cero inicial, como en el diseño: `"07:30"` → `"7:30"`. */
const hora = (hhmm: string): string => hhmm.replace(/^0/, "");

/** Horario como se muestra: `"7:00 a 18:00"` o `"Cerrado"`. */
export function formatoHorario({ abre, cierra }: Horario): string {
  return abre && cierra ? `${hora(abre)} a ${hora(cierra)}` : "Cerrado";
}

/* -------------------------------------------------------------------------- */
/* Navegación                                                                 */
/* -------------------------------------------------------------------------- */

export interface LinkMenu {
  label: string;
  href: `#${string}`;
}

/** Links del header y del menú móvil, con el anchor de cada sección. */
export const menu: readonly LinkMenu[] = [
  { label: "Pedir mayoreo", href: "#pedido" },
  { label: "Entregas", href: "#entregas" },
  { label: "Para quién", href: "#para-quien" },
  { label: "Sucursales", href: "#sucursales" },
  { label: "Preguntas", href: "#preguntas" },
];

/** Franja superior (topbar), arriba del header. */
export const topbar = `Distribuidor autorizado Holcim · Entrega en obra · ${sucursales.length} sucursales en Carmen`;

/** Línea legal del footer. */
export const legal = {
  // TODO(cliente): confirmar la autorización de Holcim para usar su marca y
  // logo (issue #15).
  marcas:
    "Holcim y Apasco son marcas registradas de Holcim, usadas con autorización.",
  /** La página se publica en el issue #13. */
  avisoPrivacidad: {
    label: "Aviso de privacidad",
    href: "/aviso-de-privacidad",
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Secciones                                                                  */
/* -------------------------------------------------------------------------- */

export interface Tarjeta {
  icono: IconName;
  titulo: string;
  texto: string;
}

/** "Para quién es". */
export const paraQuien: readonly Tarjeta[] = [
  {
    icono: "casco",
    titulo: "Contratistas",
    texto:
      "Surtido constante para que la obra no se detenga por falta de material.",
  },
  {
    icono: "plano",
    titulo: "Constructoras y arquitectos",
    texto:
      "Cotización formal por escrito para presupuestar tus proyectos desde el inicio.",
  },
  {
    icono: "tienda",
    titulo: "Ferreterías y materialistas",
    texto:
      "Volumen constante para surtir tu negocio sin quedarte sin existencia.",
  },
  {
    icono: "capas",
    titulo: "Desarrolladores",
    texto: "Entregas programadas por etapa: cimentación, muros y losas.",
  },
];

export interface Paso {
  numero: string;
  titulo: string;
  texto: string;
}

/** "Tu pedido en obra · En 3 sencillos pasos". */
export const pasos: readonly Paso[] = [
  {
    numero: "01",
    titulo: "Solicita",
    texto:
      "Mándanos tu pedido por WhatsApp o llámanos. Te confirmamos existencia.",
  },
  {
    numero: "02",
    titulo: "Programamos",
    texto: "Acordamos día y horario según el avance de tu obra.",
  },
  {
    numero: "03",
    titulo: "Entregamos",
    // TODO(cliente): zonas de entrega fuera de Ciudad del Carmen (issue #15).
    texto:
      "Llevamos el cemento a tu obra en Ciudad del Carmen y [zonas cercanas].",
  },
];

/**
 * "Por qué Los May". La primera tarjeta muestra una cifra en lugar de ícono.
 */
export type Beneficio =
  | { cifra: string; titulo: string; texto: string }
  | { icono: IconName; titulo: string; texto: string };

export const beneficios: readonly Beneficio[] = [
  {
    cifra: String(sucursales.length),
    titulo: "Sucursales",
    texto: "Santa Rosalía y Santa Isabel, en Ciudad del Carmen.",
  },
  {
    // TODO(cliente): confirmar que hoy se puede prometer "inventario en tiempo
    // real" (issue #15).
    icono: "caja",
    titulo: "Existencia al momento",
    texto:
      "Inventario en tiempo real: te confirmamos disponibilidad al instante.",
  },
  {
    icono: "documento",
    titulo: "Todo por escrito",
    texto: "Cotización clara desde el principio.",
  },
  {
    // TODO(cliente): ¿hay crédito a empresas? ¿Qué condiciones? (issue #15)
    icono: "tarjeta",
    titulo: "Crédito a empresas",
    texto: "[Confirmar]",
  },
];

/* -------------------------------------------------------------------------- */
/* Producto                                                                   */
/* -------------------------------------------------------------------------- */

/** Ficha del cemento ("El cemento"). */
export const cemento = {
  nombre: "Holcim Apasco ECOPlanet",
  descripcion:
    "Cemento Portland gris para obra general, en bulto de 25 kg: más ligero de cargar y acomodar en obra.",
  ficha: [
    { etiqueta: "Tipo", valor: "Portland gris" },
    { etiqueta: "Presentación", valor: "Bulto de 25 kg" },
    { etiqueta: "Marca", valor: "Holcim Apasco" },
    // TODO(cliente): validar el −35% CO₂ contra el empaque o la ficha técnica
    // (issue #15).
    { etiqueta: "Emisiones", valor: "−35% CO₂, según empaque" },
  ],
  atributos: ["Buen desempeño", "Buen rendimiento", "Fácil de colocar"],
} as const;

/** "También en Los May". */
export const productos = {
  titulo: "También en Los May",
  texto:
    "Todo el material de obra negra en un solo lugar, con entrega en el mismo viaje.",
  lista: ["Block", "Varilla", "Arena", "Grava"],
  // TODO(cliente): catálogo completo además de block, varilla, arena y grava
  // (issue #15).
  catalogo: "Catálogo completo: [confirmar con Los May]",
} as const;

/* -------------------------------------------------------------------------- */
/* Preguntas frecuentes                                                       */
/* -------------------------------------------------------------------------- */

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

export const faq: readonly Pregunta[] = [
  {
    pregunta: "¿Desde cuánto es mayoreo?",
    respuesta: `Desde ${minimoMayoreo} toneladas. Para cantidades menores te atendemos en cualquiera de nuestras dos sucursales.`,
  },
  {
    pregunta: "¿Entregan en obra?",
    // TODO(cliente): zonas de entrega fuera de Ciudad del Carmen (issue #15).
    respuesta: "Sí, en Ciudad del Carmen. Fuera de la ciudad: [zonas].",
  },
  {
    pregunta: "¿Facturan?",
    // TODO(cliente): ¿factura CFDI con RFC? (issue #15)
    respuesta: "[Confirmar: factura CFDI con tu RFC]",
  },
  {
    pregunta: "¿Qué formas de pago aceptan?",
    // TODO(cliente): formas de pago (issue #15).
    respuesta: "[Efectivo, transferencia, tarjeta: confirmar]",
  },
  {
    pregunta: "¿Manejan crédito?",
    // TODO(cliente): crédito para empresas y clientes recurrentes (issue #15).
    respuesta: "[Confirmar: crédito para empresas y clientes recurrentes]",
  },
  {
    pregunta: "¿Puedo programar entregas por etapa?",
    respuesta:
      "Sí. Dinos el total de tu obra y acordamos entregas según el avance.",
  },
];
