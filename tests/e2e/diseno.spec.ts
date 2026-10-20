import { expect, test, type Page } from "@playwright/test";
import { ESCRITORIO, MOVIL } from "./helpers";

/**
 * Medidas del diseño (docs/design/Main.dc.html) que no cubren las demás
 * pruebas: espaciados, tamaños de íconos y ritmo vertical del footer.
 */

const caja = async (page: Page, selector: string) =>
  (await page.locator(`${selector} >> visible=true`).first().boundingBox())!;

test.describe("Diseño · topbar", () => {
  test("padding 9px 16px, tracking 0.02em y una sola línea en escritorio", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const topbar = page.locator("aside p").first();
    await expect(topbar).toHaveCSS("padding", "9px 16px");
    await expect(topbar).toHaveCSS("letter-spacing", `${13 * 0.02}px`);
    // 9 + 19.5 (13px × 1.5) + 9.
    expect((await topbar.boundingBox())!.height).toBeCloseTo(37.5, 0);
  });

  test("en móvil el renglón nunca empieza con «·»", async ({ page }) => {
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const inicios = await page.locator("aside p").evaluate((p) => {
        // Primer carácter de cada renglón visual.
        const texto = p.firstChild as Text;
        const rango = document.createRange();
        const renglones = new Map<number, string>();
        for (let i = 0; i < texto.length; i++) {
          rango.setStart(texto, i);
          rango.setEnd(texto, i + 1);
          const r = rango.getBoundingClientRect();
          if (r.width === 0) continue;
          const y = Math.round(r.top);
          if (!renglones.has(y)) renglones.set(y, texto.data[i]);
        }
        return [...renglones.values()];
      });
      expect(inicios, `a ${width}px`).not.toContain("·");
    }
  });
});

test.describe("Diseño · header de escritorio", () => {
  test.use({ viewport: ESCRITORIO });

  test("alto: 14px + logo de 164px (71.6px de alto) + 14px + borde", async ({
    page,
  }) => {
    await page.goto("/");
    const header = (await page.getByRole("banner").boundingBox())!;
    expect(header.height).toBeCloseTo(14 + (164 * 480) / 1100 + 14 + 1, 0);
  });

  test("nav con gap de 32px y botón verde: padding 0 18px, gap 8px, ícono de 18px, píldora", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav).toHaveCSS("column-gap", "32px");
    const boton = nav.getByRole("link", { name: "Cotizar por WhatsApp" });
    await expect(boton).toHaveCSS("padding-left", "18px");
    await expect(boton).toHaveCSS("padding-right", "18px");
    await expect(boton).toHaveCSS("column-gap", "8px");
    const radio = await boton.evaluate((el) =>
      parseFloat(getComputedStyle(el).borderTopLeftRadius),
    );
    expect(radio).toBeGreaterThanOrEqual(22);
    const icono = (await boton.locator("svg").boundingBox())!;
    expect(icono.width).toBe(18);
    expect(icono.height).toBe(18);
    await expect(boton.locator("svg")).toHaveAttribute("aria-hidden", "true");
  });

  test("logo pegado al padding lateral (72px a 1440) y botón al borde derecho", async ({
    page,
  }) => {
    await page.goto("/");
    const logo = await caja(
      page,
      "header a[aria-label='Los May — inicio'] svg",
    );
    expect(logo.x).toBeCloseTo(72, 0);
    const boton = (await page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Cotizar por WhatsApp" })
      .boundingBox())!;
    expect(boton.x + boton.width).toBeCloseTo(ESCRITORIO.width - 72, 0);
  });
});

test.describe("Diseño · header y menú móvil", () => {
  test.use({ viewport: MOVIL, hasTouch: true, isMobile: true });

  test("8px entre el botón de WhatsApp y la hamburguesa; íconos de 22px", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    const wa = header.getByRole("link", { name: "Cotizar por WhatsApp" });
    const boton = page.locator("[data-menu-toggle]");
    const cajaWa = (await wa.boundingBox())!;
    const cajaBoton = (await boton.boundingBox())!;
    expect(cajaBoton.x - (cajaWa.x + cajaWa.width)).toBeCloseTo(8, 0);
    // Hamburguesa pegada al padding derecho de 16px.
    expect(cajaBoton.x + cajaBoton.width).toBeCloseTo(MOVIL.width - 16, 0);
    // Logo pegado al padding izquierdo de 16px.
    expect(
      (await caja(page, "header a[aria-label='Los May — inicio'] svg")).x,
    ).toBeCloseTo(16, 0);

    const iconoWa = (await wa.locator("svg").boundingBox())!;
    expect(iconoWa.width).toBe(22);
    const iconoMenu = (await boton.locator("svg:visible").boundingBox())!;
    expect(iconoMenu.width).toBe(22);
    await expect(boton.locator("svg:visible")).toHaveCSS("stroke-width", "2px");
  });

  test("panel: padding 4px 16px 20px, sombra y botón con ícono de 22px y gap de 10px", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-menu-toggle]").click();
    const panel = page.locator("#menu-movil");
    await expect(panel).toHaveCSS("padding", "4px 16px 20px");
    await expect(panel).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(panel).toHaveCSS("border-bottom-color", "rgb(227, 223, 216)");
    await expect(panel).toHaveCSS("box-shadow", /0px 18px 32px/);
    const wa = panel.getByRole("link", { name: "Cotizar por WhatsApp" });
    await expect(wa).toHaveCSS("column-gap", "10px");
    await expect(wa).toHaveCSS("font-weight", "700");
    await expect(wa).toHaveCSS("color", "rgb(255, 255, 255)");
    const icono = (await wa.locator("svg").boundingBox())!;
    expect(icono.width).toBe(22);
    // Ícono + texto centrados en el botón.
    const cajaWa = (await wa.boundingBox())!;
    const contenido = await wa.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const c = r.getBoundingClientRect();
      return { x: c.x, ancho: c.width };
    });
    expect(contenido.x - cajaWa.x).toBeCloseTo(
      cajaWa.x + cajaWa.width - (contenido.x + contenido.ancho),
      0,
    );
  });

  test("el chevron de los links mide 20px y va al borde derecho", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-menu-toggle]").click();
    const link = page.locator("#menu-movil a[href^='#']").first();
    const chevron = (await link.locator("svg").boundingBox())!;
    expect(chevron.width).toBe(20);
    expect(chevron.x + chevron.width).toBeCloseTo(MOVIL.width - 16, 0);
  });
});

test.describe("Diseño · footer", () => {
  test("logo de 180px y descripción con margin-top de 16px y máximo 300px", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const logo = (await footer.getByRole("img").first().boundingBox())!;
    expect(logo.width).toBe(180);
    const descripcion = footer.getByText(
      "Materiales para construcción en Ciudad del Carmen, Campeche.",
    );
    await expect(descripcion).toHaveCSS("margin-top", "16px");
    await expect(descripcion).toHaveCSS("max-width", "300px");
  });

  test("en escritorio, columnas con gap de 64px y contenido centrado a 1280px", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const fila = page.getByRole("contentinfo").locator(":scope > div").first();
    await expect(fila).toHaveCSS("column-gap", "64px");
    await expect(fila).toHaveCSS("row-gap", "32px");
    const cajaFila = (await fila.boundingBox())!;
    expect(cajaFila.width).toBe(1280);
    expect(cajaFila.x).toBe((ESCRITORIO.width - 1280) / 2);
  });

  /**
   * En el diseño cada línea de contacto es un `<p>` de 22.5px con 8px de
   * margen: las tres líneas (dos teléfonos y el dominio) quedan a 30.5px una
   * de otra. En escritorio no hace falta el área táctil de 44px.
   */
  test("en escritorio, las líneas de Contacto conservan el ritmo del diseño", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const columna = page
      .getByRole("contentinfo")
      .getByRole("heading", { name: "Contacto" })
      .locator("..");
    const centros = await columna.evaluate((col) =>
      [...col.querySelectorAll("p")].map((p) => {
        const r = document.createRange();
        r.selectNodeContents(p);
        const c = r.getBoundingClientRect();
        return c.top + c.height / 2;
      }),
    );
    expect(centros).toHaveLength(3);
    const pasos = [centros[1] - centros[0], centros[2] - centros[1]];
    for (const paso of pasos) expect(paso).toBeCloseTo(30.5, 0);
  });

  test("en móvil, las líneas de Contacto quedan a la misma distancia entre sí", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    const columna = page
      .getByRole("contentinfo")
      .getByRole("heading", { name: "Contacto" })
      .locator("..");
    const centros = await columna.evaluate((col) =>
      [...col.querySelectorAll("p")].map((p) => {
        const r = document.createRange();
        r.selectNodeContents(p);
        const c = r.getBoundingClientRect();
        return c.top + c.height / 2;
      }),
    );
    const pasos = [centros[1] - centros[0], centros[2] - centros[1]];
    expect(Math.abs(pasos[0] - pasos[1])).toBeLessThanOrEqual(2);
  });

  test("el año de la línea legal es el actual", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toContainText(
      `© ${new Date().getFullYear()} Los May Materiales para Construcción`,
    );
  });
});
