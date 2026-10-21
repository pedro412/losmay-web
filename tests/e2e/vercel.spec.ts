import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Pruebas del issue #14: la configuración de Vercel que vive en el repo
 * (`vercel.json`, `engines.node`) y que el build la respete. `astro preview`
 * no aplica `vercel.json`, así que aquí se revisa la configuración contra el
 * `dist/` que compiló `test:e2e`; los headers reales se revisan con `curl -I`
 * después del deploy (ver README, «Deploy»).
 */

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const dist = join(raiz, "dist");
const leerJson = (archivo: string) =>
  JSON.parse(readFileSync(join(raiz, archivo), "utf8"));

type Regla = {
  source: string;
  headers: { key: string; value: string }[];
};
const vercel: { trailingSlash?: boolean; headers: Regla[] } =
  leerJson("vercel.json");

/**
 * Convierte el `source` de una regla (sintaxis path-to-regexp, aquí solo
 * literales y grupos `(.*)`) en una RegExp, para saber a qué rutas aplica.
 */
function patron(source: string) {
  const partes = source
    .split("(.*)")
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${partes.join(".*")}$`);
}

/** Headers que Vercel manda en una ruta: las reglas que aplican, en orden. */
function headersDe(ruta: string) {
  const resultado = new Map<string, string>();
  for (const regla of vercel.headers) {
    if (!patron(regla.source).test(ruta)) continue;
    for (const { key, value } of regla.headers) {
      resultado.set(key.toLowerCase(), value);
    }
  }
  return resultado;
}

/** Todas las rutas públicas del build (`/index.html`, `/_astro/…`). */
function archivos(dir = dist): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return ["/" + relative(dist, ruta).split("\\").join("/")];
  });
}

const IMMUTABLE = "public, max-age=31536000, immutable";

test.describe("Vercel (#14)", () => {
  test("los assets con hash de /_astro llevan caché immutable", () => {
    const assets = archivos().filter((r) => r.startsWith("/_astro/"));
    // CSS, fuentes e imágenes procesadas, como mínimo.
    expect(assets.some((r) => r.endsWith(".css"))).toBe(true);
    expect(assets.some((r) => r.endsWith(".woff2"))).toBe(true);
    expect(assets.some((r) => /\.(avif|webp)$/.test(r))).toBe(true);
    for (const ruta of assets) {
      // Astro pone un hash del contenido en el nombre de todo lo que sale en
      // /_astro; si algún archivo no lo tuviera, `immutable` lo dejaría
      // pegado en caché un año después de cambiarlo.
      const nombre = ruta.split("/").pop()!;
      expect(nombre, `${ruta} no tiene hash en el nombre`).toMatch(
        /(^|[._])[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/,
      );
      expect(headersDe(ruta).get("cache-control"), ruta).toBe(IMMUTABLE);
    }
  });

  test("nada fuera de /_astro se queda en caché como immutable", () => {
    // HTML, favicons, og.jpg, sitemap, robots.txt y manifest no llevan hash:
    // se quedan con la caché por defecto de Vercel (revalida en cada visita).
    const otras = archivos().filter((r) => !r.startsWith("/_astro/"));
    expect(otras).toContain("/index.html");
    for (const ruta of [...otras, "/", "/aviso-de-privacidad"]) {
      expect(headersDe(ruta).get("cache-control"), ruta).toBeUndefined();
    }
  });

  test("headers de seguridad básicos en todas las rutas", () => {
    for (const ruta of ["/", "/aviso-de-privacidad", "/_astro/x.css"]) {
      const h = headersDe(ruta);
      expect(h.get("x-content-type-options"), ruta).toBe("nosniff");
      expect(h.get("x-frame-options"), ruta).toBe("DENY");
      expect(h.get("content-security-policy"), ruta).toBe(
        "frame-ancestors 'none'",
      );
      expect(h.get("referrer-policy"), ruta).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(h.get("permissions-policy"), ruta).toContain("camera=()");
      expect(h.get("permissions-policy"), ruta).toContain("geolocation=()");
    }
  });

  test("la CSP no bloquea GA4 ni los scripts de la página", () => {
    // Solo `frame-ancestors`: una política de `script-src` / `connect-src`
    // tendría que permitir Google Analytics (ver README, «Analytics»).
    const csp = headersDe("/").get("content-security-policy") ?? "";
    expect(csp).not.toMatch(/(default|script|connect)-src/);
  });

  test("URLs sin diagonal final en Vercel, el sitemap y los links", () => {
    // vercel.json redirige `/ruta/` → `/ruta` (308); la canónica, los links
    // internos y el sitemap ya van sin diagonal, para no pasar por el 308.
    expect(vercel.trailingSlash).toBe(false);
    const sitemap = readFileSync(join(dist, "sitemap-0.xml"), "utf8");
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls).toContain("https://losmay.com/");
    for (const url of urls) {
      const { pathname } = new URL(url);
      expect(pathname === "/" || !pathname.endsWith("/"), url).toBe(true);
    }
    for (const pagina of archivos().filter((r) => r.endsWith(".html"))) {
      const html = readFileSync(join(dist, pagina), "utf8");
      const internos = [...html.matchAll(/href="(\/[^"#?]*)/g)].map(
        (m) => m[1],
      );
      for (const href of internos) {
        expect(href === "/" || !href.endsWith("/"), `${pagina}: ${href}`).toBe(
          true,
        );
      }
    }
  });

  test("Node fijo en 24.x, igual que .nvmrc", () => {
    const pkg = leerJson("package.json");
    expect(pkg.engines.node).toBe("24.x");
    const nvmrc = readFileSync(join(raiz, ".nvmrc"), "utf8").trim();
    expect(nvmrc).toBe("24");
    expect(leerJson("package-lock.json").packages[""].engines.node).toBe(
      "24.x",
    );
  });

  test("sin adapter: el sitio es estático", () => {
    const config = readFileSync(join(raiz, "astro.config.mjs"), "utf8");
    expect(config).toContain('output: "static"');
    expect(config).not.toMatch(/@astrojs\/vercel/);
    expect(leerJson("package.json").dependencies).not.toHaveProperty(
      "@astrojs/vercel",
    );
  });
});
