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
import type { IconName } from "../lib/iconos";

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

/**
 * Color de marca para `<meta name="theme-color">`. Es el mismo valor que
 * `--color-marino` en src/styles/global.css.
 */
export const colorMarca = "#0E2A47";

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
  /** Link de WhatsApp con el pedido escrito. */
  href: string;
}

const porTonelaje = (ton: number, titulo: string, detalle: string): Pedido => ({
  ton,
  etiqueta: `${ton} t`,
  titulo,
  detalle,
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

/** Domicilio de una sucursal, por partes (para los datos estructurados). */
export interface Domicilio {
  /** Calle y número: `"Corregidora 8"`. */
  calle: string;
  colonia: string;
  /** Código postal. */
  cp: string;
}

/** Coordenadas de una sucursal, en grados decimales. */
export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Sucursal {
  id: string;
  nombre: string;
  domicilio: Domicilio;
  /** Dirección completa, como se muestra en la tarjeta. */
  direccion: string;
  /** Dirección corta del footer (sin ciudad). */
  direccionCorta: string;
  /** Lo que se busca en Google Maps para "Cómo llegar". */
  mapsQuery: string;
  /** Teléfono como se muestra (`938 108 2953`). */
  telefono: string;
  horarios: readonly Horario[];
  /**
   * Ubicación del pin, para el `geo` del JSON-LD (SEO local). `null` mientras
   * no esté confirmada: el JSON-LD la omite (es recomendada, no obligatoria).
   */
  geo: Coordenadas | null;
}

/**
 * Arma una sucursal a partir de su domicilio. Las tres versiones de la
 * dirección (tarjeta, footer y búsqueda de Maps) salen de las mismas partes,
 * para que no se desalineen.
 */
const sucursal = (
  datos: Omit<Sucursal, "direccion" | "direccionCorta" | "mapsQuery">,
): Sucursal => {
  const { calle, colonia, cp } = datos.domicilio;
  return {
    ...datos,
    direccion: `${calle}, ${colonia}, ${cp} Cd. del Carmen, Camp.`,
    direccionCorta: `${calle}, ${colonia}, ${cp}`,
    mapsQuery: `${calle}, ${colonia}, ${cp} ${negocio.ciudad}, ${negocio.estado}`,
  };
};

const LUNES_A_VIERNES: readonly Dia[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// TODO(cliente): validar direcciones, teléfonos y horarios de las dos
// sucursales (issue #15). Deben coincidir con sus perfiles de Google Business:
// Google compara estos datos (también los del JSON-LD) con los del perfil.
export const sucursales: readonly Sucursal[] = [
  sucursal({
    id: "santa-rosalia",
    nombre: "Santa Rosalía",
    domicilio: {
      calle: "Corregidora 8",
      colonia: "Santa Rosalía",
      cp: "24197",
    },
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
    // TODO(cliente): coordenadas del pin de la sucursal en su perfil de Google
    // Business (issue #11). No se calculan a mano para no publicar un punto
    // equivocado.
    geo: null,
  }),
  sucursal({
    id: "santa-isabel",
    nombre: "Santa Isabel",
    domicilio: {
      calle: "Av. Puerto de Campeche",
      colonia: "Volcanes",
      cp: "24150",
    },
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
    // TODO(cliente): coordenadas del pin en Google Business (issue #11).
    geo: null,
  }),
];

const numerosEnLetra = [
  "cero",
  "una",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
] as const;

/**
 * Número de sucursales con letra, como lo escribe el copy del diseño:
 * `"dos sucursales"`. Lo usan el hero, el titular de Sucursales, el banner de
 * Pedido y la FAQ, para que todos sigan a `sucursales.length`.
 */
export const sucursalesEnLetra = ((n: number): string => {
  const numero = numerosEnLetra.at(n) ?? String(n);
  return n === 1 ? `${numero} sucursal` : `${numero} sucursales`;
})(sucursales.length);

/** Primera letra en mayúscula: `"dos sucursales"` → `"Dos sucursales"`. */
export const mayuscula = (texto: string): string =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

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

/**
 * Textos fijos de la interfaz que se repiten en varios componentes (botones,
 * `aria-label` y skip link), para que no se desalineen entre sí.
 */
export const ui = {
  /** Botones y links de WhatsApp del header y del menú móvil. */
  cotizarWhatsApp: "Cotizar por WhatsApp",
  abrirMenu: "Abrir menú",
  cerrarMenu: "Cerrar menú",
  /** Nombre accesible del logo, que lleva al inicio. */
  irAlInicio: "Los May — inicio",
  saltarAlContenido: "Saltar al contenido",
  /**
   * Link de regreso a la landing desde otras páginas (aviso de privacidad).
   * TODO(cliente): copy fuera del diseño (el diseño no incluye la página del
   * aviso); revisarlo junto con el borrador del aviso.
   */
  volverAlInicio: "Volver al inicio",
  /**
   * Final del nombre accesible de las tarjetas de Pedido, solo para lectores
   * de pantalla: «16 t Mínimo de mayoreo Entrega programada en obra — pedir
   * por WhatsApp».
   */
  pedirPorWhatsApp: "pedir por WhatsApp",
} as const;

/** Links del header y del menú móvil, con el anchor de cada sección. */
export const menu: readonly LinkMenu[] = [
  { label: "Pedir mayoreo", href: "#pedido" },
  { label: "Entregas", href: "#entregas" },
  { label: "Para quién", href: "#para-quien" },
  { label: "Sucursales", href: "#sucursales" },
  { label: "Preguntas", href: "#preguntas" },
];

/**
 * Franja superior (topbar), arriba del header. Los espacios antes de cada «·»
 * y dentro de «Entrega en obra» y «2 sucursales en Carmen» son de no
 * separación (\u00A0): en móvil el renglón solo se corta después de un «·» (o
 * dentro de la primera frase), nunca empieza con «·» ni deja el número solo.
 */
export const topbar = [
  "Distribuidor autorizado Holcim",
  "Entrega\u00A0en\u00A0obra",
  `${sucursales.length}\u00A0sucursales\u00A0en\u00A0Carmen`,
].join("\u00A0· ");

/** Línea legal del footer. */
export const legal = {
  // TODO(cliente): confirmar la autorización de Holcim para usar su marca y
  // logo (issue #15).
  marcas:
    "Holcim y Apasco son marcas registradas de Holcim, usadas con autorización.",
  /** Página del aviso (issue #13), texto en `avisoPrivacidad`. */
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
    // Ojo (fase 2): Barlow no tiene el «₂» (U+2082) en ningún subconjunto de
    // Fontsource, así que se dibujaría con la fuente de respaldo. Al mostrar
    // este valor, pintar el 2 como `CO<sub>2</sub>` (o con el «2» normal y
    // `font-variant-position: sub`) en lugar del carácter U+2082.
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
    respuesta: `Desde ${minimoMayoreo} toneladas. Para cantidades menores te atendemos en cualquiera de nuestras ${sucursalesEnLetra}.`,
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

/* -------------------------------------------------------------------------- */
/* Aviso de privacidad                                                        */
/* -------------------------------------------------------------------------- */

/** Link externo dentro del aviso (políticas de Google y WhatsApp). */
export interface LinkExterno {
  texto: string;
  href: string;
}

/**
 * Bloque de una sección del aviso: un párrafo (texto) o una lista de viñetas
 * (cada elemento es texto o un link externo). Los datos por confirmar van
 * entre corchetes y `<Texto>` los resalta, como en la landing.
 */
export type BloqueAviso = string | { lista: readonly (string | LinkExterno)[] };

export interface SeccionAviso {
  /** Ancla de la sección (`/aviso-de-privacidad#cookies`). */
  id: string;
  titulo: string;
  bloques: readonly BloqueAviso[];
}

// TODO(cliente): razón social (persona física o moral) que opera Los May, tal
// como aparece en su constancia de situación fiscal (issue #13).
const razonSocial = "[razón social]";
// TODO(cliente): domicilio fiscal completo del responsable (issue #13).
const domicilioFiscal = "[domicilio fiscal]";
// TODO(cliente): correo (o teléfono) de la persona o área que atiende los
// temas de privacidad y las solicitudes ARCO (issue #13).
const contactoPrivacidad = "[contacto de privacidad]";

/**
 * Aviso de privacidad integral (`/aviso-de-privacidad`, issue #13), conforme
 * a la Ley Federal de Protección de Datos Personales en Posesión de los
 * Particulares (LFPDPPP).
 *
 * TODO(cliente): es un BORRADOR propuesto por nosotros. Lo tienen que revisar
 * y aprobar Los May o su asesor legal. Mientras tanto la página muestra el
 * aviso de `borrador` y no se indexa (`seo.rutasSinIndexar`). Al aprobarlo:
 * 1. Llenar los corchetes (razón social, domicilio, contacto y fecha).
 * 2. Poner `borrador: null`.
 * 3. Quitar "/aviso-de-privacidad" de `seo.rutasSinIndexar`.
 */
export const avisoPrivacidad = {
  titulo: "Aviso de privacidad",
  /** Título y descripción para buscadores y para compartir. */
  seoTitulo: `Aviso de privacidad | ${negocio.nombreCorto}`,
  seoDescripcion: `Aviso de privacidad de ${negocio.nombre}: qué datos personales tratamos, para qué, el uso de cookies de Google Analytics y cómo ejercer tus derechos ARCO.`,
  /** Aviso visible arriba del texto. `null` cuando el cliente lo apruebe. */
  borrador: {
    titulo: "Borrador pendiente de aprobación",
    texto:
      "Este texto es una propuesta que todavía no revisan ni aprueban Los May ni su asesor legal. No es el aviso de privacidad vigente.",
  } as { titulo: string; texto: string } | null,
  // TODO(cliente): fecha en que se apruebe y publique el aviso.
  actualizacion: "Última actualización: [fecha de aprobación]",
  introduccion: `En ${negocio.nombre} («Los May») cuidamos los datos personales que nos compartes. Este aviso explica qué datos tratamos, para qué los usamos, con quién los compartimos y cómo puedes ejercer tus derechos.`,
  secciones: [
    {
      id: "responsable",
      titulo: "Quién es responsable de tus datos",
      bloques: [
        `${razonSocial}, que opera con el nombre comercial ${negocio.nombre}, con domicilio en ${domicilioFiscal}, es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y demás normativa aplicable.`,
        `Para cualquier asunto relacionado con tus datos personales puedes escribirnos a ${contactoPrivacidad}.`,
      ],
    },
    {
      id: "datos",
      titulo: "Qué datos personales tratamos",
      bloques: [
        "Este sitio no tiene formularios ni cuentas de usuario. Solo tratamos:",
        {
          lista: [
            "Los datos que tú nos das al escribirnos por WhatsApp o al llamar a una sucursal: tu nombre, tu número de teléfono, la ubicación de tu obra o el domicilio de entrega, el material y las cantidades que te interesan y, en su caso, los datos fiscales que nos proporciones para facturar.",
            "Los datos que se generan al navegar en este sitio por medio de cookies e identificadores de Google Analytics (ver «Cookies y Google Analytics»).",
          ],
        },
        "No tratamos datos personales sensibles. Si nos compartes datos de otra persona (por ejemplo, de quien recibirá el material en la obra), te pedimos que antes le informes y cuentes con su consentimiento.",
      ],
    },
    {
      id: "finalidades",
      titulo: "Para qué usamos tus datos",
      bloques: [
        "Finalidades necesarias para atender tu solicitud:",
        {
          lista: [
            "Responder tus mensajes y llamadas.",
            "Prepararte y enviarte cotizaciones.",
            "Confirmar existencia, programar y entregar el material en tu obra.",
            "Dar seguimiento a tu pedido, a su pago y, en su caso, a su facturación.",
          ],
        },
        "Finalidades secundarias, que no son necesarias para atender tu pedido:",
        {
          lista: [
            // TODO(cliente): confirmar si Los May manda promociones; si no,
            // quitar esta finalidad.
            "Enviarte promociones y novedades de Los May por WhatsApp o por teléfono.",
            "Medir de forma estadística cómo se usa este sitio para mejorarlo.",
          ],
        },
        `Si no quieres que usemos tus datos para las finalidades secundarias, avísanos en cualquier momento por WhatsApp o en ${contactoPrivacidad}. Tu negativa no afecta la atención de tus pedidos. Para la medición del sitio también puedes bloquear las cookies como se explica abajo.`,
      ],
    },
    {
      id: "cookies",
      titulo: "Cookies y Google Analytics",
      bloques: [
        "Este sitio usa Google Analytics 4, un servicio de Google LLC, para saber cuántas personas lo visitan y qué botones usan. Para ello, Google Analytics guarda cookies en tu navegador (como _ga y _ga_*) y recopila de forma automática:",
        {
          lista: [
            "Un identificador aleatorio de tu navegador o dispositivo.",
            "Las páginas que visitas, cuánto tiempo y desde qué sitio, publicación o anuncio llegaste.",
            "Los botones que tocas para escribirnos por WhatsApp, llamarnos o ver cómo llegar a una sucursal.",
            "Datos técnicos como el tipo de dispositivo, el navegador, el sistema operativo, el idioma y la ciudad o región aproximada desde donde te conectas.",
          ],
        },
        // TODO(cliente): el asesor legal debe validar lo que aquí se afirma
        // de Google (que GA4 no guarda la IP, servidores fuera de México).
        "Usamos esta información solo de forma agregada y estadística: no la usamos para identificarte ni la cruzamos con los datos que nos das por WhatsApp o por teléfono. Según Google, Google Analytics 4 no registra ni guarda las direcciones IP. Google trata esta información conforme a sus propias políticas y puede guardarla en servidores fuera de México.",
        "Puedes bloquear o borrar las cookies desde la configuración de tu navegador, navegar en modo privado o instalar el complemento de inhabilitación de Google Analytics. El sitio funciona igual sin ellas.",
        {
          lista: [
            {
              texto:
                "Cómo usa Google la información de los sitios que usan sus servicios",
              href: "https://policies.google.com/technologies/partner-sites?hl=es-419",
            },
            {
              texto: "Complemento de inhabilitación de Google Analytics",
              href: "https://tools.google.com/dlpage/gaoptout?hl=es-419",
            },
          ],
        },
      ],
    },
    {
      id: "transferencias",
      titulo: "Con quién compartimos tus datos",
      bloques: [
        "No vendemos ni rentamos tus datos personales. Solo los compartimos:",
        {
          lista: [
            "Con proveedores que nos prestan servicios y que solo pueden usarlos para eso: Google LLC (estadísticas del sitio) y Vercel Inc. (alojamiento del sitio).",
            "Con autoridades competentes, cuando la ley nos obligue o nos lo requieran conforme a ella.",
          ],
        },
        // TODO(cliente): el asesor legal debe confirmar que estas remisiones
        // y comunicaciones no requieren consentimiento conforme a la LFPDPPP
        // vigente.
        "Ninguno de estos casos requiere tu consentimiento conforme a la ley.",
        "WhatsApp es un servicio de WhatsApp LLC (Meta). Cuando nos escribes por WhatsApp, WhatsApp también trata tus datos conforme a su propia política de privacidad.",
        {
          lista: [
            {
              texto: "Política de privacidad de WhatsApp",
              href: "https://www.whatsapp.com/legal/privacy-policy?lang=es_LA",
            },
          ],
        },
      ],
    },
    {
      id: "derechos-arco",
      titulo: "Tus derechos ARCO",
      bloques: [
        "Tienes derecho a saber qué datos tenemos de ti y cómo los usamos (Acceso), a pedirnos que los corrijamos si están incompletos o son inexactos (Rectificación), a que los eliminemos de nuestros registros (Cancelación) y a oponerte a que los usemos para fines específicos (Oposición).",
        `Para ejercerlos, envía tu solicitud a ${contactoPrivacidad} con:`,
        {
          lista: [
            "Tu nombre y un medio para responderte.",
            "Una identificación oficial tuya o, en su caso, de tu representante, con el documento que acredite la representación.",
            "Una descripción clara de los datos y del derecho que quieres ejercer.",
            "Cualquier dato o documento que nos ayude a localizar tu información.",
          ],
        },
        // TODO(cliente): el asesor legal puede precisar aquí los plazos de
        // respuesta de la ley vigente.
        "Te responderemos por el medio que nos indiques, en los plazos que establece la ley. Si consideras que tu derecho a la protección de datos personales ha sido vulnerado, puedes acudir ante la autoridad competente en la materia.",
      ],
    },
    {
      id: "revocacion",
      titulo: "Cómo revocar tu consentimiento o limitar el uso de tus datos",
      bloques: [
        `Puedes revocar en cualquier momento el consentimiento que nos diste, o pedirnos que dejemos de enviarte promociones, escribiéndonos por WhatsApp o a ${contactoPrivacidad}. Si la revocación afecta datos necesarios para un pedido en curso, es posible que no podamos completarlo.`,
        "Para limitar la publicidad que recibes por teléfono, también puedes inscribirte en el Registro Público para Evitar Publicidad (REPEP) de la Procuraduría Federal del Consumidor (Profeco).",
      ],
    },
    {
      id: "cambios",
      titulo: "Cambios a este aviso",
      bloques: [
        `Podemos actualizar este aviso por cambios en la ley o en nuestra forma de trabajar. Publicaremos cualquier cambio en esta misma página (${negocio.dominio}${legal.avisoPrivacidad.href}), con la fecha de su última actualización.`,
      ],
    },
  ] satisfies readonly SeccionAviso[],
} as const;

/* -------------------------------------------------------------------------- */
/* SEO y redes                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Metadatos de la landing: `<title>`, `meta description`, Open Graph y
 * Twitter card (ver `src/components/Seo.astro`).
 *
 * La descripción solo repite lo que ya dice la página (mínimo de mayoreo,
 * entrega en obra, sucursales); Google la muestra bajo el título y WhatsApp
 * debajo de la imagen al compartir el link.
 */
export const seo = {
  titulo: "Cemento Holcim por mayoreo en Ciudad del Carmen | Los May",
  descripcion: `Cemento Holcim por mayoreo desde ${minimoMayoreo} toneladas, con entrega en obra en ${negocio.ciudad}. Distribuidor autorizado Holcim con ${sucursalesEnLetra}. Cotiza por WhatsApp.`,
  /** Idioma de Open Graph. */
  locale: "es_MX",
  /**
   * Imagen para compartir (1200 × 630), basada en el post de campaña del
   * diseño (docs/design/Post.dc.html). Se regenera con `npm run og`.
   */
  imagen: {
    src: "/og.jpg",
    ancho: 1200,
    alto: 630,
    alt: `Cemento Holcim por mayoreo desde ${minimoMayoreo} t con Los May: pedido por WhatsApp y entrega en tu obra en ${negocio.ciudad}.`,
  },
  /**
   * Rutas que no se indexan: llevan `<meta name="robots" content="noindex">`
   * y se quedan fuera del sitemap. Sin la diagonal final.
   *
   * El aviso de privacidad (issue #13) es un borrador pendiente de aprobación
   * del cliente: se quita de aquí cuando lo apruebe.
   */
  rutasSinIndexar: ["/aviso-de-privacidad"] as readonly string[],
} as const;

/** `true` si la ruta (`/aviso-de-privacidad/`, con o sin diagonal) no se indexa. */
export const sinIndexar = (ruta: string): boolean =>
  seo.rutasSinIndexar.includes(ruta.replace(/(.)\/+$/, "$1"));
