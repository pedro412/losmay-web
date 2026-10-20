import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { HAY_AVISO_PRIVACIDAD } from "./helpers";

/** Pruebas del issue #11: metadatos, Open Graph, JSON-LD, sitemap y robots. */

const TITULO = "Cemento Holcim por mayoreo en Ciudad del Carmen | Los May";
const DESCRIPCION =
  "Cemento Holcim por mayoreo desde 16 toneladas, con entrega en obra en Ciudad del Carmen. Distribuidor autorizado Holcim con dos sucursales. Cotiza por WhatsApp.";
const OG_IMAGEN = "https://losmay.com/og.jpg";

const meta = (page: Page, selector: string) =>
  page.locator(`head ${selector}`).getAttribute("content");

/** Todos los bloques JSON-LD de la página, ya parseados. */
async function jsonLd(page: Page) {
  const textos = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return textos.map((t) => JSON.parse(t));
}

type Nodo = Record<string, unknown> & { "@type": string };

async function grafo(page: Page): Promise<Nodo[]> {
  const bloque = (await jsonLd(page)).find((j) => j["@graph"]);
  expect(bloque, "falta el @graph del negocio").toBeTruthy();
  expect(bloque["@context"]).toBe("https://schema.org");
  return bloque["@graph"];
}

test.describe("Metadatos (#11)", () => {
  test("title, description, canonical e indexable", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(TITULO);
    expect(await meta(page, 'meta[name="description"]')).toBe(DESCRIPCION);
    expect(DESCRIPCION.length).toBeLessThanOrEqual(160);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://losmay.com/",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    // Un solo title, description y canonical.
    await expect(page.locator("head title")).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test("Open Graph y Twitter card con URLs absolutas", async ({ page }) => {
    await page.goto("/");
    const esperado: [string, string][] = [
      ['meta[property="og:type"]', "website"],
      ['meta[property="og:site_name"]', "Los May"],
      ['meta[property="og:locale"]', "es_MX"],
      ['meta[property="og:url"]', "https://losmay.com/"],
      ['meta[property="og:title"]', TITULO],
      ['meta[property="og:description"]', DESCRIPCION],
      ['meta[property="og:image"]', OG_IMAGEN],
      ['meta[property="og:image:secure_url"]', OG_IMAGEN],
      ['meta[property="og:image:type"]', "image/jpeg"],
      ['meta[property="og:image:width"]', "1200"],
      ['meta[property="og:image:height"]', "630"],
      ['meta[name="twitter:card"]', "summary_large_image"],
      ['meta[name="twitter:title"]', TITULO],
      ['meta[name="twitter:description"]', DESCRIPCION],
      ['meta[name="twitter:image"]', OG_IMAGEN],
    ];
    for (const [selector, valor] of esperado) {
      expect(await meta(page, selector), selector).toBe(valor);
    }
    expect(await meta(page, 'meta[property="og:image:alt"]')).toMatch(
      /Cemento Holcim por mayoreo/,
    );
  });

  test("la imagen para compartir es un JPEG de 1200 × 630 y pesa poco", async ({
    request,
  }) => {
    const respuesta = await request.get("/og.jpg");
    expect(respuesta.status()).toBe(200);
    const cuerpo = await respuesta.body();
    // WhatsApp deja de mostrar vistas previas con imágenes pesadas (~300 KB).
    expect(cuerpo.byteLength).toBeLessThan(300 * 1024);
    const { width, height, format } = await sharp(cuerpo).metadata();
    expect({ width, height, format }).toEqual({
      width: 1200,
      height: 630,
      format: "jpeg",
    });
  });

  test("favicons, apple-touch-icon y manifest", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    for (const ruta of [
      "/favicon.ico",
      "/favicon.svg",
      "/apple-touch-icon.png",
    ]) {
      expect((await request.get(ruta)).status(), ruta).toBe(200);
    }

    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({
      name: "Los May Materiales para Construcción",
      short_name: "Los May",
      start_url: "/",
      theme_color: "#0E2A47",
      background_color: "#0E2A47",
    });
    for (const { src, sizes } of manifest.icons) {
      const icono = await request.get(src);
      expect(icono.status(), src).toBe(200);
      const { width, height } = await sharp(await icono.body()).metadata();
      expect(`${width}x${height}`).toBe(sizes);
    }
    expect(
      manifest.icons.map((i: { sizes: string }) => i.sizes).sort(),
    ).toEqual(["192x192", "512x512"]);
  });
});

test.describe("JSON-LD de las sucursales (#11)", () => {
  test("todos los bloques JSON-LD están en el <head> y son JSON válido", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.locator('body script[type="application/ld+json"]'),
    ).toHaveCount(0);
    const bloques = await jsonLd(page);
    expect(bloques.map((b) => b["@type"] ?? "@graph").sort()).toEqual([
      "@graph",
      "FAQPage",
    ]);
  });

  test("una HardwareStore por sucursal, con dirección, teléfono y horario", async ({
    page,
  }) => {
    await page.goto("/");
    const nodos = await grafo(page);
    const tiendas = nodos.filter((n) => n["@type"] === "HardwareStore");
    expect(tiendas).toHaveLength(2);

    const empresa = nodos.find((n) => n["@type"] === "Organization");
    expect(empresa).toMatchObject({
      name: "Los May Materiales para Construcción",
      url: "https://losmay.com/",
    });
    expect(nodos.find((n) => n["@type"] === "WebSite")).toMatchObject({
      url: "https://losmay.com/",
      name: "Los May",
    });

    const lunesAViernes = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ];
    const horario = (dias: string[], opens: string, closes: string) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dias,
      opens,
      closes,
    });

    expect(tiendas[0]).toMatchObject({
      "@id": "https://losmay.com/#sucursal-santa-rosalia",
      name: "Los May Materiales para Construcción (Santa Rosalía)",
      url: "https://losmay.com/",
      image: OG_IMAGEN,
      telephone: "+529381082953",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Corregidora 8, Santa Rosalía",
        addressLocality: "Ciudad del Carmen",
        addressRegion: "Campeche",
        postalCode: "24197",
        addressCountry: "MX",
      },
      openingHoursSpecification: [
        horario(lunesAViernes, "07:00", "18:00"),
        horario(["Saturday"], "08:00", "15:00"),
        horario(["Sunday"], "08:00", "13:00"),
      ],
      parentOrganization: { "@id": empresa?.["@id"] },
    });
    expect(tiendas[1]).toMatchObject({
      "@id": "https://losmay.com/#sucursal-santa-isabel",
      name: "Los May Materiales para Construcción (Santa Isabel)",
      telephone: "+529381326244",
      address: {
        streetAddress: "Av. Puerto de Campeche, Volcanes",
        postalCode: "24150",
        addressCountry: "MX",
      },
      // El domingo está cerrado: no lleva horario.
      openingHoursSpecification: [
        horario(lunesAViernes, "07:30", "18:00"),
        horario(["Saturday"], "07:30", "15:00"),
      ],
    });

    for (const tienda of tiendas) {
      // `geo` solo aparece cuando hay coordenadas confirmadas, y completo.
      if ("geo" in tienda) {
        expect(tienda.geo).toMatchObject({
          "@type": "GeoCoordinates",
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        });
      }
      expect(String(tienda.hasMap)).toMatch(
        /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/,
      );
    }
  });

  test("los datos del JSON-LD coinciden con los de la sección Sucursales", async ({
    page,
  }) => {
    await page.goto("/");
    const tiendas = (await grafo(page)).filter(
      (n) => n["@type"] === "HardwareStore",
    );
    const telefonos = await page
      .locator('#sucursales a[href^="tel:"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(tiendas.map((t) => `tel:${t.telephone}`)).toEqual(telefonos);
    const mapas = await page
      .locator('#sucursales a[href*="google.com/maps"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(tiendas.map((t) => t.hasMap)).toEqual(mapas);
  });
});

test.describe("Sitemap y robots.txt (#11)", () => {
  test("robots.txt permite todo y apunta al sitemap", async ({ request }) => {
    const respuesta = await request.get("/robots.txt");
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.text()).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://losmay.com/sitemap-index.xml\n",
    );
  });

  test("el sitemap lista la landing y deja fuera lo que no se indexa", async ({
    request,
  }) => {
    const indice = await (await request.get("/sitemap-index.xml")).text();
    const sitemaps = [...indice.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      ([, loc]) => loc,
    );
    expect(sitemaps.length).toBeGreaterThan(0);
    const urls: string[] = [];
    for (const loc of sitemaps) {
      expect(loc.startsWith("https://losmay.com/")).toBe(true);
      const xml = await (await request.get(new URL(loc).pathname)).text();
      urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => u));
    }
    expect(urls).toContain("https://losmay.com/");
    expect(urls.some((u) => u.includes("aviso-de-privacidad"))).toBe(false);
  });

  test("el aviso de privacidad (borrador) lleva noindex", async ({ page }) => {
    test.skip(!HAY_AVISO_PRIVACIDAD, "La página llega con el issue #13.");
    await page.goto("/aviso-de-privacidad");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });
});
