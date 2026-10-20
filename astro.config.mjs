// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Sitio 100% estático, sin adapter (se sirve desde Vercel como archivos).
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
