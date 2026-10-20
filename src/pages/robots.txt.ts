/**
 * `/robots.txt`: permite todo y apunta al sitemap.
 *
 * Las páginas que no se indexan (`seo.rutasSinIndexar`) no se bloquean aquí:
 * Google tiene que poder entrar para leer su `noindex`.
 *
 * Los previews de Vercel (`*.vercel.app`) no se indexan aunque usen este
 * archivo: Vercel les agrega `X-Robots-Tag: noindex`.
 */
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("/sitemap-index.xml", site).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
