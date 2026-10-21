/**
 * Google Analytics 4 (issue #12).
 *
 * - `gtag.js` se carga solo en producción: build de producción
 *   (`import.meta.env.PROD`), con `PUBLIC_GA_ID` definido, fuera de los
 *   previews de Vercel (`VERCEL_ENV`) y, ya en el navegador, solo en los
 *   dominios de `hostsGa` (losmay.com y www). En `astro dev`, en
 *   `astro preview` (localhost), en los previews y en `*.vercel.app` no se
 *   carga nada ni se manda nada.
 * - Tracking delegado: un solo listener en `document` (`<Analytics>`) lee
 *   `data-track` y los `data-*` de los parámetros del link que se tocó. Los
 *   componentes solo ponen los atributos con `track()`, sin JS propio.
 *
 * Eventos (tabla del issue #12):
 *
 * | Evento              | Parámetros                |
 * | ------------------- | ------------------------- |
 * | `click_whatsapp`    | `ubicacion`               |
 * | `click_llamar`      | `sucursal`, `ubicacion`   |
 * | `click_como_llegar` | `sucursal`                |
 */
import { negocio, type Pedido } from "../data/site";

/** Dónde está el botón de WhatsApp que se tocó. */
export type UbicacionWhatsApp =
  | "header"
  | "menu_movil"
  | "hero"
  | `pedido_${number}t`
  | "pedido_mas32t"
  | "cta_final"
  | "pagina_404";

/** Dónde está el link `tel:` que se tocó. */
export type UbicacionLlamar = "sucursales" | "footer";

interface ParametrosPorEvento {
  click_whatsapp: { ubicacion: UbicacionWhatsApp };
  click_llamar: { sucursal: string; ubicacion: UbicacionLlamar };
  click_como_llegar: { sucursal: string };
}

export type EventoGa = keyof ParametrosPorEvento;

/**
 * Parámetros que se mandan con cada evento. El listener solo manda los
 * eventos de esta lista y solo con estos parámetros.
 */
export const parametrosGa: {
  readonly [E in EventoGa]: readonly (keyof ParametrosPorEvento[E])[];
} = {
  click_whatsapp: ["ubicacion"],
  click_llamar: ["sucursal", "ubicacion"],
  click_como_llegar: ["sucursal"],
};

/**
 * Atributos `data-*` de un link con tracking:
 *
 * <a {...track("click_llamar", { sucursal: "santa_rosalia", ubicacion: "footer" })}>
 *
 * da `data-track="click_llamar" data-sucursal="santa_rosalia"
 * data-ubicacion="footer"`.
 */
export function track<E extends EventoGa>(
  evento: E,
  parametros: ParametrosPorEvento[E],
): Record<`data-${string}`, string> {
  const atributos: Record<`data-${string}`, string> = { "data-track": evento };
  for (const [clave, valor] of Object.entries(parametros)) {
    atributos[`data-${clave}`] = valor;
  }
  return atributos;
}

/** `sucursal` de los eventos: el id de `site.ts` con guion bajo (`santa_rosalia`). */
export const sucursalGa = (id: string): string => id.replaceAll("-", "_");

/** `ubicacion` de cada tarjeta de pedido: `pedido_16t`, …, `pedido_mas32t`. */
export const ubicacionPedido = ({ ton }: Pedido): UbicacionWhatsApp =>
  ton === "+32" ? "pedido_mas32t" : `pedido_${ton}t`;

/** Dominios donde sí se mide: el de producción y su `www`. */
const dominio = new URL(negocio.url).hostname;
export const hostsGa: readonly string[] = [dominio, `www.${dominio}`];

/** Formato de un ID de medición de GA4. */
const FORMATO_ID = /^G-[A-Z0-9]+$/;

/**
 * ID de GA4 si en este build se debe incluir Analytics; `null` si no.
 *
 * - Sin ID o fuera de un build de producción (`astro dev`): `null`.
 * - En Vercel, solo el entorno `production` (los previews y `vercel dev`
 *   no miden aunque alguien agregue la variable ahí).
 * - Un ID con formato inválido rompe el build, para que un error al
 *   capturarlo en Vercel no deje la página sin medir sin que nadie lo note.
 */
export function idGa({
  id,
  prod,
  vercelEnv,
}: {
  id: string | undefined;
  prod: boolean;
  vercelEnv: string | undefined;
}): string | null {
  const limpio = id?.trim();
  if (!prod || !limpio) return null;
  if (vercelEnv && vercelEnv !== "production") return null;
  if (!FORMATO_ID.test(limpio)) {
    throw new Error(
      `PUBLIC_GA_ID="${limpio}" no es un ID de medición de GA4 (G-XXXXXXXXXX).`,
    );
  }
  return limpio;
}
