// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Subconjunto latino de Fontsource: cubre español (á, é, ñ, ¿, ¡) sin
// descargar cirílico ni vietnamita.
const LATIN_RANGE =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

/**
 * Variantes self-hosted desde los paquetes de Fontsource (sin request a
 * Google Fonts y sin depender de la red al compilar).
 * @param {string} pkg
 * @param {string} file
 * @param {number[]} weights
 */
const variants = (pkg, file, weights) =>
  /** @type {[any, ...any[]]} */ (
    weights.map((weight) => ({
      weight,
      style: "normal",
      unicodeRange: [LATIN_RANGE],
      src: [`@fontsource/${pkg}/files/${file}-latin-${weight}-normal.woff2`],
    }))
  );

// https://astro.build/config
export default defineConfig({
  // Sitio 100% estático, sin adapter (se sirve desde Vercel como archivos).
  output: "static",
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Barlow Condensed",
      cssVariable: "--font-barlow-condensed",
      fallbacks: ["Arial Narrow", "sans-serif"],
      display: "swap",
      options: {
        variants: variants(
          "barlow-condensed",
          "barlow-condensed",
          [600, 700, 800],
        ),
      },
    },
    {
      provider: fontProviders.local(),
      name: "Barlow",
      cssVariable: "--font-barlow",
      fallbacks: ["system-ui", "sans-serif"],
      display: "swap",
      options: {
        variants: variants("barlow", "barlow", [400, 500, 600, 700]),
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
