import type { BrowserContext, Page } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * ¿Ya existe la página del aviso de privacidad (issue #13)? El footer solo
 * muestra el link cuando existe, para no publicar un link roto.
 */
export const HAY_AVISO_PRIVACIDAD = ["astro", "md", "mdx"].some((ext) =>
  existsSync(
    new URL(`../../src/pages/aviso-de-privacidad.${ext}`, import.meta.url),
  ),
);

/**
 * ID de GA4 falso con el que compila `test:e2e` (ver `playwright.config.ts`),
 * para probar los eventos sin mandar nada a Google (issue #12).
 */
export const GA_ID_PRUEBA = "G-PRUEBA0000";

/** Anchos en los que no debe haber scroll horizontal. */
export const ANCHOS = [320, 360, 390, 768, 1024, 1440, 1920] as const;

/** Breakpoint del diseño: debajo de 760px se ve el header móvil. */
export const BREAKPOINT = 760;

export const MOVIL = { width: 390, height: 844 };
export const ESCRITORIO = { width: 1440, height: 900 };

/** Número de WhatsApp del diseño (Santa Rosalía). */
export const WHATSAPP = "529381082953";

export const MENSAJE_GENERAL =
  "Hola Los May, quiero cotizar material para mi obra.";

export const LINKS_MENU = [
  { label: "Pedir mayoreo", href: "#pedido" },
  { label: "Entregas", href: "#entregas" },
  { label: "Para quién", href: "#para-quien" },
  { label: "Sucursales", href: "#sucursales" },
  { label: "Preguntas", href: "#preguntas" },
] as const;

/** Decodifica un link de wa.me en número y texto. */
export function leerWhatsApp(href: string) {
  const url = new URL(href);
  return {
    host: url.host,
    numero: url.pathname.replace(/^\//, ""),
    texto: url.searchParams.get("text"),
  };
}

/**
 * Las secciones de la landing llegan en la fase 2. Para probar los anchors
 * del menú se agregan secciones de relleno con los mismos ids dentro de
 * `<main>`.
 */
export async function agregarSeccionesDePrueba(page: Page) {
  await page.evaluate(
    (ids) => {
      const main = document.querySelector("main");
      if (!main) throw new Error("No hay <main>");
      for (const id of ids) {
        if (document.getElementById(id)) continue;
        const seccion = document.createElement("section");
        seccion.id = id;
        seccion.style.minHeight = "1200px";
        seccion.textContent = id;
        main.append(seccion);
      }
    },
    LINKS_MENU.map(({ href }) => href.slice(1)),
  );
}

/** Scroll instantáneo (sin el scroll suave del sitio). */
export async function scrollInstantaneo(page: Page, y: number) {
  await page.evaluate(
    (destino) => window.scrollTo({ top: destino, behavior: "instant" }),
    y,
  );
}

/*
 * Producción simulada (issues #12 y #16): el build local servido como si
 * fuera https://losmay.com, con las requests a Google contestadas vacías y
 * todo lo demás externo abortado. No sale nada a la red.
 */

export const LOCAL = "http://localhost:4400";
export const PRODUCCION = "https://losmay.com";
export const GOOGLE =
  /^https?:\/\/([a-z0-9-]+\.)*(googletagmanager|google-analytics)\.com\//;

export type Red = { google: string[]; externas: string[] };

/** Sirve el build local en https://losmay.com y corta todo lo externo. */
export async function servirComoProduccion(
  context: BrowserContext,
): Promise<Red> {
  const red: Red = { google: [], externas: [] };
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === PRODUCCION) {
      const respuesta = await route.fetch({
        url: `${LOCAL}${url.pathname}${url.search}`,
      });
      return route.fulfill({ response: respuesta });
    }
    if (url.origin === LOCAL) return route.continue();
    if (GOOGLE.test(url.href)) {
      red.google.push(url.href);
      return route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: "",
      });
    }
    red.externas.push(url.href);
    return route.abort();
  });
  return red;
}
