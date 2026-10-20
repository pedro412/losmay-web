import { expect, test } from "@playwright/test";
import { ANCHOS } from "./helpers";

test.describe("Carga de la página", () => {
  test("sin errores en consola ni requests fallidos", async ({ page }) => {
    const errores: string[] = [];
    const fallidos: string[] = [];

    page.on("console", (mensaje) => {
      if (mensaje.type() === "error" || mensaje.type() === "warning") {
        errores.push(`[${mensaje.type()}] ${mensaje.text()}`);
      }
    });
    page.on("pageerror", (error) => errores.push(`[pageerror] ${error}`));
    page.on("requestfailed", (request) =>
      fallidos.push(`${request.url()} (${request.failure()?.errorText})`),
    );
    page.on("response", (response) => {
      if (response.status() >= 400) {
        fallidos.push(`${response.url()} (${response.status()})`);
      }
    });

    for (const ancho of [390, 1440]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
    }

    expect(errores).toEqual([]);
    expect(fallidos).toEqual([]);
  });

  test("los favicons responden", async ({ request }) => {
    for (const ruta of [
      "/favicon.ico",
      "/favicon.svg",
      "/apple-touch-icon.png",
    ]) {
      const respuesta = await request.get(ruta);
      expect(respuesta.status(), ruta).toBe(200);
    }
  });

  test("html base: lang, viewport, theme-color y título", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      "content",
      /width=device-width/,
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      /#0E2A47/i,
    );
    await expect(page).toHaveTitle("Los May — Cemento Holcim por mayoreo");
  });

  for (const ancho of ANCHOS) {
    test(`sin scroll horizontal a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);

      const medidas = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        cliente: document.documentElement.clientWidth,
        // Elementos que se salen por la derecha (para el reporte). No cuentan
        // los que van dentro de un carril con scroll horizontal propio (el
        // carrusel de "Para quién es"): ahí asomar cortados es intencional.
        desbordados: [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.right <= window.innerWidth + 0.5) {
              return false;
            }
            for (let p = el.parentElement; p; p = p.parentElement) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === "auto" || ox === "scroll") return false;
            }
            return true;
          })
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
      }));

      expect(medidas.desbordados).toEqual([]);
      expect(medidas.scroll).toBeLessThanOrEqual(medidas.cliente);
    });

    test(`sin scroll horizontal a ${ancho}px con el menú abierto`, async ({
      page,
    }) => {
      test.skip(ancho >= 760, "El menú móvil solo existe debajo de 760px");
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      await page.getByRole("button", { name: "Abrir menú" }).click();
      const scroll = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(scroll).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("Fuentes", () => {
  test("Barlow y Barlow Condensed cargadas con sus pesos", async ({ page }) => {
    await page.goto("/");
    // Abre el menú en móvil para que se use la Condensed 700 también.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.evaluate(() => document.fonts.ready);

    const cargadas = await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => f.status === "loaded")
        .map((f) => ({
          familia: f.family.replace(/^"|"$/g, ""),
          peso: f.weight,
        })),
    );

    const pesos = (prefijo: RegExp) =>
      new Set(
        cargadas.filter((f) => prefijo.test(f.familia)).map((f) => f.peso),
      );

    const condensada = pesos(/^Barlow Condensed/);
    const barlow = pesos(/^Barlow(?! Condensed)/);

    // Condensed: 800 (titulares) y 700 (links del menú móvil).
    expect([...condensada].sort()).toEqual(
      expect.arrayContaining(["700", "800"]),
    );
    // Barlow: 400 (texto), 600 (topbar, nav) y 700 (botones, footer).
    expect([...barlow].sort()).toEqual(
      expect.arrayContaining(["400", "600", "700"]),
    );
  });

  test("el h1 y el cuerpo usan las familias correctas", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const familias = await page.evaluate(() => ({
      body: getComputedStyle(document.body).fontFamily,
      h1: getComputedStyle(document.querySelector("h1")!).fontFamily,
      h1Peso: getComputedStyle(document.querySelector("h1")!).fontWeight,
    }));
    expect(familias.body).toMatch(/^"?Barlow(?! Condensed)/);
    expect(familias.h1).toMatch(/^"?Barlow Condensed/);
    expect(familias.h1Peso).toBe("800");
  });

  test("no hay requests a Google Fonts", async ({ page }) => {
    const externos: string[] = [];
    page.on("request", (r) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(r.url()))
        externos.push(r.url());
    });
    await page.goto("/", { waitUntil: "networkidle" });
    expect(externos).toEqual([]);
  });
});

test.describe("Estructura y accesibilidad", () => {
  test("un solo h1", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("landmarks: banner, main, contentinfo y navegación", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeAttached();
  });

  test("todas las imágenes tienen alt (o están ocultas)", async ({ page }) => {
    await page.goto("/");
    const sinAlt = await page.evaluate(() => [
      ...[...document.querySelectorAll("img")]
        .filter((img) => !img.hasAttribute("alt"))
        .map((img) => img.outerHTML.slice(0, 120)),
      // SVG visibles sin nombre accesible ni aria-hidden.
      ...[...document.querySelectorAll("svg")]
        .filter(
          (svg) =>
            !svg.closest('[aria-hidden="true"]') &&
            !svg.getAttribute("aria-label") &&
            !svg.querySelector("title"),
        )
        .map((svg) => svg.outerHTML.slice(0, 120)),
    ]);
    expect(sinAlt).toEqual([]);
  });

  test("todos los links y botones tienen nombre accesible", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const elementos = page.locator("a:visible, button:visible");
      const total = await elementos.count();
      for (let i = 0; i < total; i++) {
        const el = elementos.nth(i);
        const nombre =
          (await el.getAttribute("aria-label")) ??
          (await el.innerText()).trim();
        expect(
          nombre,
          await el.evaluate((e) => e.outerHTML.slice(0, 120)),
        ).not.toBe("");
      }
    }
  });

  test("los ids son únicos", async ({ page }) => {
    await page.goto("/");
    const repetidos = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    expect(repetidos).toEqual([]);
  });
});
