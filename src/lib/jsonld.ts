/**
 * Datos estructurados (JSON-LD de schema.org) del negocio, generados desde
 * `site.ts`: un `@graph` con el sitio (`WebSite`), la empresa
 * (`Organization`) y una `HardwareStore` por sucursal, con dirección,
 * teléfono, horarios y, cuando esté confirmada, la ubicación (`geo`).
 *
 * Google cruza estos datos con los perfiles de Google Business de cada
 * sucursal: tienen que decir lo mismo (nombre, dirección, teléfono, horario).
 *
 * El JSON-LD de la FAQ está en `faq-jsonld.ts`.
 */
import {
  mapsLink,
  negocio,
  seo,
  sucursales,
  telLink,
  type Horario,
  type Sucursal,
} from "../data/site";

/** URL absoluta dentro del sitio: `abs("/og.jpg")` → `https://losmay.com/og.jpg`. */
const abs = (ruta: string): string => new URL(ruta, negocio.url).href;

const ID_SITIO = abs("/#sitio");
const ID_EMPRESA = abs("/#empresa");

/** Teléfono en formato E.164 (`+529381082953`). */
const e164 = (numero: string): string => telLink(numero).replace(/^tel:/, "");

/** Horarios de apertura; los días cerrados (sin horas) se omiten. */
const horarios = (lista: readonly Horario[]) =>
  lista.flatMap(({ dias, abre, cierra }) =>
    abre && cierra
      ? [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [...dias],
            opens: abre,
            closes: cierra,
          },
        ]
      : [],
  );

const tienda = ({
  id,
  nombre,
  domicilio,
  mapsQuery,
  telefono,
  horarios: lista,
  geo,
}: Sucursal) => ({
  "@type": "HardwareStore",
  "@id": abs(`/#sucursal-${id}`),
  // TODO(cliente): que el nombre coincida con el del perfil de Google Business
  // de la sucursal (issue #11).
  name: `${negocio.nombre} (${nombre})`,
  url: abs("/"),
  image: abs(seo.imagen.src),
  telephone: e164(telefono),
  address: {
    "@type": "PostalAddress",
    streetAddress: `${domicilio.calle}, ${domicilio.colonia}`,
    addressLocality: negocio.ciudad,
    addressRegion: negocio.estado,
    postalCode: domicilio.cp,
    addressCountry: "MX",
  },
  ...(geo && {
    geo: { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng },
  }),
  hasMap: mapsLink(mapsQuery),
  openingHoursSpecification: horarios(lista),
  parentOrganization: { "@id": ID_EMPRESA },
});

export function negocioJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": ID_SITIO,
        url: abs("/"),
        name: negocio.nombreCorto,
        alternateName: negocio.nombre,
        inLanguage: "es-MX",
        publisher: { "@id": ID_EMPRESA },
      },
      {
        "@type": "Organization",
        "@id": ID_EMPRESA,
        name: negocio.nombre,
        alternateName: negocio.nombreCorto,
        url: abs("/"),
        logo: abs("/icon-512.png"),
        description: negocio.descripcion,
      },
      ...sucursales.map(tienda),
    ],
  };
}

/**
 * Serializa el JSON-LD para un `<script type="application/ld+json">`. Escapa
 * `<` para que ningún texto pueda cerrar la etiqueta `</script>`.
 */
export const serializarJsonLd = (datos: object): string =>
  JSON.stringify(datos).replace(/</g, "\\u003c");
