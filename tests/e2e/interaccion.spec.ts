import { expect, test, type Page } from "@playwright/test";
import {
  agregarSeccionesDePrueba,
  ANCHOS,
  ESCRITORIO,
  LINKS_MENU,
  MOVIL,
  scrollInstantaneo,
} from "./helpers";

/** Ronda 2 de QA: casos de interacción y carga que faltaban. */

const botonMenu = (page: Page) => page.locator("[data-menu-toggle]");
const panel = (page: Page) => page.locator("#menu-movil");

test.describe("Carga en todos los anchos", () => {
  for (const width of ANCHOS) {
    test(`sin errores ni requests fallidos a ${width}px (con el menú si existe)`, async ({
      page,
    }) => {
      const problemas: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning")
          problemas.push(`[${m.type()}] ${m.text()}`);
      });
      page.on("pageerror", (e) => problemas.push(`[pageerror] ${e}`));
      page.on("requestfailed", (r) =>
        problemas.push(`${r.url()} (${r.failure()?.errorText})`),
      );
      page.on("response", (r) => {
        if (r.status() >= 400) problemas.push(`${r.url()} (${r.status()})`);
      });

      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      if (width < 760) {
        await botonMenu(page).click();
        await page.keyboard.press("Escape");
      }
      await scrollInstantaneo(page, 99999);
      expect(problemas).toEqual([]);
    });
  }
});

test.describe("Fuentes", () => {
  test("se precarga la Condensed 800 y todas las @font-face usan swap", async ({
    page,
  }) => {
    await page.goto("/");
    const precarga = page.locator(
      'link[rel="preload"][as="font"][type="font/woff2"]',
    );
    await expect(precarga).toHaveCount(1);
    await expect(precarga).toHaveAttribute("crossorigin", "");

    const caras = await page.evaluate(() =>
      [...document.fonts].map((f) => ({
        familia: f.family,
        peso: f.weight,
        display: f.display,
      })),
    );
    const barlow = caras.filter((c) => /Barlow/.test(c.familia));
    expect(barlow.length).toBeGreaterThan(0);
    for (const c of barlow) expect(c.display, c.familia).toBe("swap");

    // El archivo precargado es el de la Condensed 800.
    const href = await precarga.getAttribute("href");
    const css = await page.evaluate(() =>
      [...document.querySelectorAll("style")]
        .map((s) => s.textContent)
        .join(""),
    );
    const cara = css
      .split("@font-face")
      .find((bloque) => bloque.includes(href!));
    expect(cara).toMatch(/Barlow Condensed/);
    expect(cara).toMatch(/font-weight:\s*800/);
  });

  test("document.fonts.check confirma las dos familias en los pesos usados", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    await botonMenu(page).click();
    await page.evaluate(() => document.fonts.ready);
    const resultado = await page.evaluate(() => {
      const familia = (sel: string) =>
        getComputedStyle(document.querySelector(sel)!).fontFamily.split(",")[0];
      const condensada = familia("h1");
      const barlow = familia("body");
      return {
        condensada,
        barlow,
        c800: document.fonts.check(`800 68px ${condensada}`),
        c700: document.fonts.check(`700 24px ${condensada}`),
        b400: document.fonts.check(`400 17px ${barlow}`),
        b600: document.fonts.check(`600 13px ${barlow}`),
        b700: document.fonts.check(`700 17px ${barlow}`),
      };
    });
    expect(resultado.condensada).toMatch(/Barlow Condensed/);
    expect(resultado.barlow).toMatch(/Barlow/);
    expect(resultado).toMatchObject({
      c800: true,
      c700: true,
      b400: true,
      b600: true,
      b700: true,
    });
  });
});

test.describe("Menú móvil · casos extra", () => {
  test.use({ viewport: MOVIL, hasTouch: true, isMobile: true });

  test("Escape con el foco en un link del panel cierra y devuelve el foco al botón", async ({
    page,
  }) => {
    await page.goto("/");
    await botonMenu(page).click();
    const link = panel(page).getByRole("link", { name: "Sucursales" });
    await link.focus();
    await page.keyboard.press("Escape");
    await expect(panel(page)).toBeHidden();
    await expect(botonMenu(page)).toBeFocused();
  });

  test("Escape con el menú cerrado no mueve el foco", async ({ page }) => {
    await page.goto("/");
    const logo = page
      .getByRole("banner")
      .getByRole("link", { name: "Los May — inicio" })
      .first();
    await logo.focus();
    await page.keyboard.press("Escape");
    await expect(logo).toBeFocused();
    await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("tocar el topbar (fuera del header) cierra el menú", async ({
    page,
  }) => {
    await page.goto("/");
    await botonMenu(page).click();
    const topbar = (await page.locator("aside").boundingBox())!;
    await page.touchscreen.tap(topbar.x + 10, topbar.y + topbar.height / 2);
    await expect(panel(page)).toBeHidden();
  });

  test("aria-controls apunta al panel y el panel cerrado queda fuera del árbol accesible", async ({
    page,
  }) => {
    await page.goto("/");
    const id = await botonMenu(page).getAttribute("aria-controls");
    await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Menú" })).toHaveCount(0);
    await botonMenu(page).click();
    await expect(page.getByRole("navigation", { name: "Menú" })).toHaveCount(1);
  });

  test("abrir y cerrar varias veces deja el estado consistente", async ({
    page,
  }) => {
    await page.goto("/");
    for (let i = 0; i < 4; i++) {
      await botonMenu(page).click();
      await expect(panel(page)).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel(page)).toBeHidden();
    }
    await botonMenu(page).click();
    await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "true");
    await expect(botonMenu(page)).toHaveAttribute("aria-label", "Cerrar menú");
  });

  test("con la página bajada, el panel arranca justo bajo el header y cabe en la pantalla", async ({
    page,
  }) => {
    await page.goto("/");
    await agregarSeccionesDePrueba(page);
    await scrollInstantaneo(page, 1200);
    await botonMenu(page).click();
    const caja = (await panel(page).boundingBox())!;
    expect(caja.y).toBeCloseTo(64, 0);
    expect(caja.y + caja.height).toBeLessThanOrEqual(MOVIL.height);
  });
});

test.describe("Anchors · casos extra", () => {
  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`entrar con #hash deja la sección bajo el header a ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await agregarSeccionesDePrueba(page);
      for (const { href } of LINKS_MENU) {
        await scrollInstantaneo(page, 0);
        await page.evaluate((h) => (location.hash = h), href);
        await expect
          .poll(() =>
            page.evaluate((sel) => {
              const s = document.querySelector(sel)!.getBoundingClientRect();
              const h = document
                .querySelector("header")!
                .getBoundingClientRect();
              return Math.round(s.top - h.bottom);
            }, href),
          )
          .toBeGreaterThanOrEqual(-1);
        const distancia = await page.evaluate((sel) => {
          const s = document.querySelector(sel)!.getBoundingClientRect();
          const h = document.querySelector("header")!.getBoundingClientRect();
          return Math.abs(s.top - h.bottom);
        }, href);
        expect(distancia, href).toBeLessThanOrEqual(2);
      }
    });
  }

  test("el skip link no deja el inicio del contenido tapado por el header", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const top = await page.evaluate(
      () => document.querySelector("#contenido")!.getBoundingClientRect().top,
    );
    const header = (await page.getByRole("banner").boundingBox())!;
    expect(top).toBeGreaterThanOrEqual(header.y + header.height - 1);
  });
});

test.describe("Foco visible · colores", () => {
  test("anillo marino sobre fondo claro y blanco sobre el footer", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const nav = page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Entregas" });
    await nav.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(nav).toBeFocused();
    await expect(nav).toHaveCSS("outline-color", "rgb(14, 42, 71)");

    const tel = page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Santa Isabel · 938 132 6244" });
    await tel.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(tel).toBeFocused();
    await expect(tel).toHaveCSS("outline-color", "rgb(255, 255, 255)");
  });
});

test.describe("Touch targets en anchos chicos", () => {
  for (const width of [320, 360]) {
    test(`todo lo tocable mide 44px o más a ${width}px`, async ({
      browser,
    }) => {
      const contexto = await browser.newContext({
        viewport: { width, height: 700 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await contexto.newPage();
      await page.goto("/");
      await botonMenu(page).click();
      const chicos = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("a, button")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top >= -1;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              texto: (el.getAttribute("aria-label") ?? el.textContent ?? "")
                .replace(/\s+/g, " ")
                .trim(),
              ancho: Math.round(r.width),
              alto: Math.round(r.height),
            };
          })
          .filter((t) => t.alto < 44 || t.ancho < 44),
      );
      expect(chicos).toEqual([]);
      await contexto.close();
    });
  }
});
