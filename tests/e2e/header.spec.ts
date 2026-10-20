import { expect, test, type Page } from "@playwright/test";
import {
  agregarSeccionesDePrueba,
  ESCRITORIO,
  LINKS_MENU,
  MOVIL,
  scrollInstantaneo,
} from "./helpers";

const botonMenu = (page: Page) => page.locator("[data-menu-toggle]");

/** Distancia (px) entre el borde superior de la sección y el del header. */
const distanciaAlHeader = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const seccion = document.querySelector(sel)!.getBoundingClientRect();
    const header = document.querySelector("header")!.getBoundingClientRect();
    return Math.abs(seccion.top - header.bottom);
  }, selector);
const panel = (page: Page) => page.locator("#menu-movil");

test.describe("Topbar", () => {
  test("texto, colores y tamaño del diseño", async ({ page }) => {
    await page.goto("/");
    const topbar = page.getByText(
      "Distribuidor autorizado Holcim · Entrega en obra · 2 sucursales en Carmen",
      { exact: true },
    );
    await expect(topbar).toBeVisible();
    await expect(topbar).toHaveCSS("background-color", "rgb(10, 32, 56)");
    await expect(topbar).toHaveCSS("color", "rgb(213, 222, 232)");
    await expect(topbar).toHaveCSS("font-size", "13px");
    await expect(topbar).toHaveCSS("font-weight", "600");
    await expect(topbar).toHaveCSS("text-align", "center");
  });
});

test.describe("Header de escritorio", () => {
  test.use({ viewport: ESCRITORIO });

  test("logo de 164px, 5 links y botón verde", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    const logo = header.getByRole("link", { name: "Los May — inicio" });
    await expect(logo).toBeVisible();
    expect((await logo.locator("svg").boundingBox())?.width).toBeCloseTo(
      164,
      0,
    );

    const nav = page.getByRole("navigation", { name: "Principal" });
    for (const { label, href } of LINKS_MENU) {
      const link = nav.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveCSS("font-size", "15px");
      await expect(link).toHaveCSS("font-weight", "600");
      await expect(link).toHaveCSS("color", "rgb(22, 32, 43)");
    }

    const boton = nav.getByRole("link", { name: "Cotizar por WhatsApp" });
    await expect(boton).toBeVisible();
    await expect(boton).toHaveText("Cotizar por WhatsApp");
    await expect(boton).toHaveCSS("background-color", "rgb(19, 133, 68)");
    await expect(boton).toHaveCSS("font-size", "15px");
    await expect(boton).toHaveCSS("font-weight", "700");
    expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    // Sin hamburguesa en escritorio.
    await expect(botonMenu(page)).toBeHidden();
  });

  test("header blanco con borde inferior #E3DFD8 y padding 14px", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(header).toHaveCSS("border-bottom-color", "rgb(227, 223, 216)");
    await expect(header).toHaveCSS("border-bottom-width", "1px");
    const fila = header.locator(":scope > div").last();
    await expect(fila).toHaveCSS("padding-top", "14px");
    await expect(fila).toHaveCSS("padding-bottom", "14px");
    // padding lateral: clamp(20px, 5cqi, 80px) → 72px a 1440px.
    await expect(fila).toHaveCSS("padding-left", "72px");
  });

  test("el header se queda pegado al hacer scroll", async ({ page }) => {
    await page.goto("/");
    await agregarSeccionesDePrueba(page);
    await scrollInstantaneo(page, 1500);
    const caja = await page.getByRole("banner").boundingBox();
    expect(caja!.y).toBe(0);
  });

  test("todo el header cabe en una fila entre 760 y 1023px", async ({
    page,
  }) => {
    for (const ancho of [760, 800, 900, 1023]) {
      await page.setViewportSize({ width: ancho, height: 800 });
      await page.goto("/");
      const header = await page.getByRole("banner").boundingBox();
      expect(header!.height, `alto del header a ${ancho}px`).toBeLessThan(110);
      const desborde = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(desborde, `scroll horizontal a ${ancho}px`).toBe(0);
    }
  });
});

test.describe("Header móvil", () => {
  test.use({ viewport: MOVIL, hasTouch: true, isMobile: true });

  test("logo de 124px, botón de WhatsApp y hamburguesa de 44px", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    expect(
      (
        await header
          .locator("a[aria-label='Los May — inicio'] svg")
          .first()
          .boundingBox()
      )?.width,
    ).toBeCloseTo(124, 0);

    const wa = header.getByRole("link", { name: "Cotizar por WhatsApp" });
    await expect(wa).toBeVisible();
    const cajaWa = (await wa.boundingBox())!;
    expect(cajaWa.width).toBe(44);
    expect(cajaWa.height).toBe(44);
    await expect(wa).toHaveCSS("background-color", "rgb(19, 133, 68)");

    const boton = botonMenu(page);
    const cajaBoton = (await boton.boundingBox())!;
    expect(cajaBoton.width).toBe(44);
    expect(cajaBoton.height).toBe(44);
    await expect(boton).toHaveCSS("border-top-color", "rgb(214, 209, 201)");

    // La fila del header mide 64px (+1px de borde).
    expect((await header.boundingBox())!.height).toBe(65);
    // Sin nav de escritorio.
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeHidden();
  });

  test("abre y cierra con el botón: aria-expanded, aria-label e ícono", async ({
    page,
  }) => {
    await page.goto("/");
    const boton = botonMenu(page);
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(boton).toHaveAttribute("aria-label", "Abrir menú");
    await expect(boton).toHaveAttribute("aria-controls", "menu-movil");
    await expect(panel(page)).toBeHidden();

    await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await expect(boton).toHaveAttribute("aria-label", "Cerrar menú");
    await expect(panel(page)).toBeVisible();
    // Ícono: X visible, hamburguesa oculta.
    const iconos = boton.locator("svg");
    await expect(iconos.nth(0)).toBeHidden();
    await expect(iconos.nth(1)).toBeVisible();

    await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(boton).toHaveAttribute("aria-label", "Abrir menú");
    await expect(panel(page)).toBeHidden();
    await expect(iconos.nth(0)).toBeVisible();
    await expect(iconos.nth(1)).toBeHidden();
  });

  test("panel con los 5 links (Condensed 24px uppercase, chevron rojo) y botón de WhatsApp", async ({
    page,
  }) => {
    await page.goto("/");
    await botonMenu(page).click();
    const nav = page.getByRole("navigation", { name: "Menú" });
    await expect(nav).toBeVisible();

    // Debajo del header (top 64px dentro del header).
    const cajaNav = (await nav.boundingBox())!;
    const cajaHeader = (await page.getByRole("banner").boundingBox())!;
    expect(cajaNav.y).toBeCloseTo(cajaHeader.y + 64, 0);
    expect(cajaNav.width).toBe(MOVIL.width);

    const links = nav.locator("a[href^='#']");
    await expect(links).toHaveCount(5);
    for (const [i, { label, href }] of LINKS_MENU.entries()) {
      const link = links.nth(i);
      await expect(link).toHaveText(label);
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveCSS("font-size", "24px");
      await expect(link).toHaveCSS("font-weight", "700");
      await expect(link).toHaveCSS("text-transform", "uppercase");
      await expect(link).toHaveCSS("color", "rgb(14, 42, 71)");
      await expect(link).toHaveCSS("font-family", /Barlow Condensed/);
      await expect(link).toHaveCSS("border-bottom-color", "rgb(239, 236, 231)");
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(56);
      await expect(link.locator("svg")).toHaveCSS("stroke", "rgb(200, 32, 42)");
    }

    const wa = nav.getByRole("link", { name: "Cotizar por WhatsApp" });
    await expect(wa).toBeVisible();
    await expect(wa).toHaveCSS("background-color", "rgb(19, 133, 68)");
    await expect(wa).toHaveCSS("font-size", "17px");
    await expect(wa).toHaveCSS("border-top-left-radius", "10px");
    await expect(wa).toHaveCSS("margin-top", "16px");
    const cajaWa = (await wa.boundingBox())!;
    expect(cajaWa.height).toBeGreaterThanOrEqual(56);
    expect(cajaWa.width).toBe(MOVIL.width - 32);
  });

  test("Escape cierra el menú y devuelve el foco al botón", async ({
    page,
  }) => {
    await page.goto("/");
    await botonMenu(page).click();
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page)).toBeHidden();
    await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "false");
    await expect(botonMenu(page)).toBeFocused();
  });

  test("tocar un link cierra el menú y lleva a la sección sin quedar tapada", async ({
    page,
  }) => {
    await page.goto("/");
    await agregarSeccionesDePrueba(page);
    for (const { label, href } of LINKS_MENU) {
      await botonMenu(page).click();
      await panel(page).getByRole("link", { name: label }).click();
      await expect(panel(page)).toBeHidden();
      await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "false");
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      // La sección termina justo debajo del header sticky (±2px).
      await expect
        .poll(() => distanciaAlHeader(page, href), { message: label })
        .toBeLessThanOrEqual(2);
    }
  });

  test("tocar el botón de WhatsApp del panel cierra el menú", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await botonMenu(page).click();
    // Evita abrir wa.me de verdad.
    await context.route(/wa\.me/, (route) => route.abort());
    const popup = page.waitForEvent("popup").catch(() => null);
    await panel(page)
      .getByRole("link", { name: "Cotizar por WhatsApp" })
      .click();
    await popup;
    await expect(panel(page)).toBeHidden();
  });

  test("tocar fuera del header cierra el menú", async ({ page }) => {
    await page.goto("/");
    await botonMenu(page).click();
    await expect(panel(page)).toBeVisible();
    // Toque en el footer, lejos del panel.
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await page.touchscreen.tap(20, MOVIL.height - 20);
    await expect(panel(page)).toBeHidden();
  });

  test("clic fuera con mouse también cierra", async ({ page }) => {
    await page.goto("/");
    await botonMenu(page).click();
    await expect(panel(page)).toBeVisible();
    await page.mouse.click(MOVIL.width / 2, MOVIL.height - 10);
    await expect(panel(page)).toBeHidden();
  });

  test("clic dentro del panel (fuera de un link) no lo cierra", async ({
    page,
  }) => {
    await page.goto("/");
    await botonMenu(page).click();
    const caja = (await panel(page).boundingBox())!;
    // Zona del padding inferior del panel.
    await page.mouse.click(caja.x + 4, caja.y + caja.height - 4);
    await expect(panel(page)).toBeVisible();
  });

  test("con teclado: Tab recorre los links del panel y al salir se cierra", async ({
    page,
  }) => {
    await page.goto("/");
    await botonMenu(page).focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();

    // El siguiente Tab entra al primer link del panel.
    await page.keyboard.press("Tab");
    await expect(
      panel(page).getByRole("link", { name: "Pedir mayoreo" }),
    ).toBeFocused();

    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
    await expect(
      panel(page).getByRole("link", { name: "Cotizar por WhatsApp" }),
    ).toBeFocused();

    // Salir del header cierra el panel.
    await page.keyboard.press("Tab");
    await expect(panel(page)).toBeHidden();
  });

  test("pasar a escritorio con el menú abierto lo cierra", async ({ page }) => {
    await page.goto("/");
    await botonMenu(page).click();
    await page.setViewportSize(ESCRITORIO);
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeVisible();
    // Deja pasar el evento `change` del media query antes de volver.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50))),
    );
    await page.setViewportSize(MOVIL);
    await expect(panel(page)).toBeHidden();
    await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("el panel no deja contenido tapado: el header sigue pegado al hacer scroll", async ({
    page,
  }) => {
    await page.goto("/");
    await agregarSeccionesDePrueba(page);
    await scrollInstantaneo(page, 2000);
    expect((await page.getByRole("banner").boundingBox())!.y).toBe(0);
    await botonMenu(page).click();
    const caja = (await panel(page).boundingBox())!;
    expect(caja.y).toBeCloseTo(64, 0);
  });
});

test.describe("Menú móvil en pantallas bajas", () => {
  for (const viewport of [
    { width: 667, height: 375 },
    { width: 320, height: 480 },
  ]) {
    test(`a ${viewport.width}x${viewport.height} el botón de WhatsApp del panel se alcanza completo`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await botonMenu(page).click();
      // Lleva el panel hasta el final de su propio scroll.
      const fondo = await panel(page).evaluate((p) => {
        p.scrollTop = p.scrollHeight;
        const wa = p.querySelector("a[href*='wa.me']")!;
        return {
          panel: p.getBoundingClientRect().bottom,
          wa: wa.getBoundingClientRect().bottom,
          alto: window.innerHeight,
        };
      });
      expect(
        fondo.wa,
        "botón de WhatsApp dentro de la pantalla",
      ).toBeLessThanOrEqual(fondo.alto);
      expect(fondo.panel, "panel dentro de la pantalla").toBeLessThanOrEqual(
        fondo.alto,
      );
    });
  }
});

test.describe("Anchors en escritorio", () => {
  test.use({ viewport: ESCRITORIO });

  test("los links del nav llevan a la sección compensando el header", async ({
    page,
  }) => {
    await page.goto("/");
    await agregarSeccionesDePrueba(page);
    const nav = page.getByRole("navigation", { name: "Principal" });
    for (const { label, href } of LINKS_MENU) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect
        .poll(() => distanciaAlHeader(page, href), { message: label })
        .toBeLessThanOrEqual(2);
    }
  });

  test("el logo lleva al inicio", async ({ page }) => {
    await page.goto("/");
    await agregarSeccionesDePrueba(page);
    await scrollInstantaneo(page, 2000);
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Los May — inicio" })
      .click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
