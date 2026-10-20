/**
 * Manifest mínimo (`/manifest.webmanifest`): nombre, colores e íconos para
 * cuando se agrega la página a la pantalla de inicio en Android. Los íconos
 * los genera `npm run favicons`.
 */
import type { APIRoute } from "astro";
import { colorMarca, negocio } from "../data/site";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: negocio.nombre,
        short_name: negocio.nombreCorto,
        description: negocio.descripcion,
        lang: "es-MX",
        start_url: "/",
        scope: "/",
        display: "browser",
        background_color: colorMarca,
        theme_color: colorMarca,
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
