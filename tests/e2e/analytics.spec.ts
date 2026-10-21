import { expect, test, type Page } from "@playwright/test";
import {
  ESCRITORIO,
  GA_ID_PRUEBA,
  GOOGLE,
  MOVIL,
  PRODUCCION,
  servirComoProduccion,
  type Red,
} from "./helpers";

/**
 * Pruebas del issue #12: GA4 con eventos de clic.
 *
 * El build de `test:e2e` lleva un ID de GA4 falso (`GA_ID_PRUEBA`). Para
 * probar el comportamiento de producción, el sitio se sirve como si fuera
 * https://losmay.com: cada request a ese origen se contesta con lo que da
 * `astro preview` en localhost. Las requests a Google (googletagmanager.com,
 * google-analytics.com) se interceptan y se contestan vacías, y cualquier
 * otra request externa se aborta: no sale nada a la red.
 *
 * Con `gtag.js` vacío, `window.dataLayer` guarda tal cual lo que manda la
 * página (`gtag("event", nombre, parámetros)`), y eso es lo que se revisa.
 */

/**
 * Los clics no navegan (ni abren WhatsApp, Maps o el marcador): solo importa
 * que el listener de GA4 los vea. `preventDefault` no detiene la propagación.
 */
async function sinNavegar(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("click", (e) => e.preventDefault(), true);
  });
}

/** Lo que hay en `window.dataLayer`, con cada `arguments` como arreglo. */
function dataLayer(page: Page) {
  return page.evaluate(() => {
    const capa = (window as unknown as { dataLayer?: ArrayLike<unknown>[] })
      .dataLayer;
    return capa ? [...capa].map((entrada) => [...Array.from(entrada)]) : null;
  });
}

/** Solo los `gtag("event", …)`, como `[nombre, parámetros]`. */
async function eventos(page: Page) {
  const capa = (await dataLayer(page)) ?? [];
  return capa
    .filter((entrada) => entrada[0] === "event")
    .map((entrada) => [entrada[1], entrada[2]]);
}

/** Toca el link y devuelve el único evento que mandó. */
async function eventoAlTocar(
  page: Page,
  link: ReturnType<Page["locator"]>,
): Promise<unknown[]> {
  const antes = (await eventos(page)).length;
  await link.click();
  await expect.poll(async () => (await eventos(page)).length).toBe(antes + 1);
  return (await eventos(page))[antes];
}

test.describe("GA4 en producción (losmay.com)", () => {
  let red: Red;

  test.beforeEach(async ({ context, page }) => {
    red = await servirComoProduccion(context);
    await sinNavegar(page);
  });

  test.afterEach(() => {
    expect(red.externas).toEqual([]);
  });

  test("carga gtag.js con el ID y manda la vista de página", async ({
    page,
  }) => {
    await page.goto(`${PRODUCCION}/`);
    await expect
      .poll(() => red.google)
      .toContainEqual(
        `https://www.googletagmanager.com/gtag/js?id=${GA_ID_PRUEBA}`,
      );
    const gtagJs = page.locator(
      'script[src^="https://www.googletagmanager.com/gtag/js"]',
    );
    await expect(gtagJs).toHaveCount(1);
    expect(await gtagJs.evaluate((s: HTMLScriptElement) => s.async)).toBe(true);

    const capa = await dataLayer(page);
    expect(capa?.[0]?.[0]).toBe("js");
    expect(capa?.[1]).toEqual(["config", GA_ID_PRUEBA, {}]);
    expect(await eventos(page)).toEqual([]);
  });

  test("gtag.js espera al evento load: no compite con la foto del hero (#16)", async ({
    page,
  }) => {
    // Se detiene la foto del hero (LCP) para que `load` tarde en llegar.
    let soltarFoto!: () => void;
    const foto = new Promise<void>((r) => (soltarFoto = r));
    await page.route(
      /\/_astro\/cemento-holcim.*\.(avif|webp|jpg)$/,
      async (route) => {
        await foto;
        await route.fallback();
      },
    );

    await page.goto(`${PRODUCCION}/`, { waitUntil: "domcontentloaded" });
    // La vista de página ya está en dataLayer, pero gtag.js no se pidió.
    expect((await dataLayer(page))?.[1]).toEqual(["config", GA_ID_PRUEBA, {}]);
    await page.waitForTimeout(500);
    expect(red.google).toEqual([]);
    await expect(
      page.locator('script[src*="googletagmanager.com"]'),
    ).toHaveCount(0);

    soltarFoto();
    await expect
      .poll(() => red.google)
      .toContainEqual(
        `https://www.googletagmanager.com/gtag/js?id=${GA_ID_PRUEBA}`,
      );
    expect(await page.evaluate(() => document.readyState)).toBe("complete");
  });

  test("con ?debug_mode=1 los hits van a DebugView", async ({ page }) => {
    await page.goto(`${PRODUCCION}/?debug_mode=1`);
    const capa = await dataLayer(page);
    expect(capa?.[1]).toEqual(["config", GA_ID_PRUEBA, { debug_mode: true }]);
  });

  test.describe("escritorio", () => {
    test.use({ viewport: ESCRITORIO });

    test("click_whatsapp: header y todos los botones de WhatsApp de la página", async ({
      page,
    }) => {
      await page.goto(`${PRODUCCION}/`);

      const header = page
        .locator("header a[href*='wa.me']")
        .filter({ visible: true });
      await expect(header).toHaveCount(1);
      expect(await eventoAlTocar(page, header)).toEqual([
        "click_whatsapp",
        { ubicacion: "header" },
      ]);

      // Todos los links a WhatsApp de <main>, en orden.
      const links = page.locator("main a[href*='wa.me']");
      const ubicaciones = [
        "hero",
        "pedido_16t",
        "pedido_24t",
        "pedido_32t",
        "pedido_mas32t",
        "cta_final",
      ];
      await expect(links).toHaveCount(ubicaciones.length);
      for (const [i, ubicacion] of ubicaciones.entries()) {
        expect(await eventoAlTocar(page, links.nth(i))).toEqual([
          "click_whatsapp",
          { ubicacion },
        ]);
      }
    });

    test("click_llamar: sucursales y footer, con sucursal y ubicacion", async ({
      page,
    }) => {
      await page.goto(`${PRODUCCION}/`);
      const tels = page.locator("a[href^='tel:']");
      const esperados = [
        { sucursal: "santa_rosalia", ubicacion: "sucursales" },
        { sucursal: "santa_isabel", ubicacion: "sucursales" },
        { sucursal: "santa_rosalia", ubicacion: "footer" },
        { sucursal: "santa_isabel", ubicacion: "footer" },
      ];
      await expect(tels).toHaveCount(esperados.length);
      for (const [i, parametros] of esperados.entries()) {
        expect(await eventoAlTocar(page, tels.nth(i))).toEqual([
          "click_llamar",
          parametros,
        ]);
      }
    });

    test("click_como_llegar: un evento por sucursal", async ({ page }) => {
      await page.goto(`${PRODUCCION}/`);
      const maps = page.locator("a[href*='google.com/maps']");
      const sucursales = ["santa_rosalia", "santa_isabel"];
      await expect(maps).toHaveCount(sucursales.length);
      for (const [i, sucursal] of sucursales.entries()) {
        expect(await eventoAlTocar(page, maps.nth(i))).toEqual([
          "click_como_llegar",
          { sucursal },
        ]);
      }
    });

    test("los links sin data-track no mandan eventos", async ({ page }) => {
      await page.goto(`${PRODUCCION}/`);
      await page
        .getByRole("navigation", { name: "Principal" })
        .getByRole("link", { name: "Entregas" })
        .click();
      await page
        .locator("#sucursales")
        .getByText("Santa Rosalía")
        .first()
        .click();
      expect(await eventos(page)).toEqual([]);
    });
  });

  test.describe("escritorio compacto (760–1023px)", () => {
    test.use({ viewport: { width: 900, height: 800 } });

    test("el WhatsApp redondo del header manda ubicacion=header", async ({
      page,
    }) => {
      await page.goto(`${PRODUCCION}/`);
      const boton = page
        .locator("header a[href*='wa.me']")
        .filter({ visible: true });
      await expect(boton).toHaveCount(1);
      expect(await eventoAlTocar(page, boton)).toEqual([
        "click_whatsapp",
        { ubicacion: "header" },
      ]);
    });
  });

  test.describe("móvil", () => {
    test.use({ viewport: MOVIL });

    test("header y menú móvil", async ({ page }) => {
      await page.goto(`${PRODUCCION}/`);
      const header = page
        .locator("#barra-movil a[href*='wa.me']")
        .filter({ visible: true });
      expect(await eventoAlTocar(page, header)).toEqual([
        "click_whatsapp",
        { ubicacion: "header" },
      ]);

      await page.getByRole("button", { name: "Abrir menú" }).click();
      const menu = page.locator("#menu-movil a[href*='wa.me']");
      await expect(menu).toBeVisible();
      expect(await eventoAlTocar(page, menu)).toEqual([
        "click_whatsapp",
        { ubicacion: "menu_movil" },
      ]);
    });
  });
});

test.describe("GA4 fuera de producción", () => {
  test("en localhost no carga gtag.js ni manda nada", async ({ page }) => {
    const google: string[] = [];
    await page.route(GOOGLE, (route) => {
      google.push(route.request().url());
      return route.abort();
    });
    await sinNavegar(page);
    await page.goto("/");

    // El build de prueba sí trae el script (tiene ID), pero no hace nada
    // fuera de losmay.com.
    await expect(page.locator("script[data-analytics]")).toHaveCount(1);
    await page.locator("main a[href*='wa.me']").first().click();
    await page.locator("a[href^='tel:']").first().click();

    expect(await dataLayer(page)).toBeNull();
    expect(
      await page.evaluate(() => typeof (window as { gtag?: unknown }).gtag),
    ).toBe("undefined");
    await expect(
      page.locator('script[src*="googletagmanager.com"]'),
    ).toHaveCount(0);
    expect(google).toEqual([]);
  });
});
