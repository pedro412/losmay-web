import { expect, test, type Page } from "@playwright/test";
import { ESCRITORIO, HAY_AVISO_PRIVACIDAD, MOVIL } from "./helpers";

/** Recorre la página con Tab y devuelve lo que recibió el foco. */
async function recorrerConTab(page: Page, maximo = 40) {
  const visitados: {
    texto: string;
    outline: string;
    outlineWidth: string;
    visible: boolean;
  }[] = [];
  for (let i = 0; i < maximo; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const estilo = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        texto:
          el.getAttribute("aria-label") ??
          (el.textContent ?? "").replace(/\s+/g, " ").trim(),
        outline: estilo.outlineStyle,
        outlineWidth: estilo.outlineWidth,
        visible:
          r.width > 0 &&
          r.height > 0 &&
          r.bottom > 0 &&
          r.top < window.innerHeight,
      };
    });
    if (!info) break;
    if (visitados.length && visitados[0].texto === info.texto && i > 2) break;
    visitados.push(info);
  }
  return visitados;
}

test.describe("Navegación con teclado", () => {
  test("el primer Tab muestra el skip link y lleva a #contenido", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    const caja = (await skip.boundingBox())!;
    expect(caja.y).toBeGreaterThanOrEqual(0);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenido$/);
    await expect(page.locator("#contenido")).toBeFocused();
  });

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`orden de foco y foco visible a ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      // Sin scroll suave, para medir la posición justo al recibir el foco.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      const visitados = await recorrerConTab(page);
      const textos = visitados.map((v) => v.texto);

      const esperado =
        viewport.width < 760
          ? [
              "Saltar al contenido",
              "Los May — inicio",
              "Cotizar por WhatsApp",
              "Abrir menú",
            ]
          : [
              "Saltar al contenido",
              "Los May — inicio",
              "Pedir mayoreo",
              "Entregas",
              "Para quién",
              "Sucursales",
              "Preguntas",
              "Cotizar por WhatsApp",
            ];
      expect(textos.slice(0, esperado.length)).toEqual(esperado);
      // Footer al final.
      expect(textos).toEqual(
        expect.arrayContaining([
          "Santa Rosalía · 938 108 2953",
          "Santa Isabel · 938 132 6244",
          ...(HAY_AVISO_PRIVACIDAD ? ["Aviso de privacidad"] : []),
        ]),
      );

      for (const v of visitados) {
        expect(v.outline, `foco visible en "${v.texto}"`).not.toBe("none");
        expect(
          parseFloat(v.outlineWidth),
          `grosor del foco en "${v.texto}"`,
        ).toBeGreaterThanOrEqual(2);
        expect(v.visible, `"${v.texto}" en pantalla al recibir foco`).toBe(
          true,
        );
      }
    });
  }

  test("ningún elemento enfocable queda tapado por el header sticky", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const altoHeader = (await page.getByRole("banner").boundingBox())!.height;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Shift+Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        // El skip link va fijo encima del header a propósito: no cuenta.
        if (!el.closest("main, footer")) return null;
        return el.getBoundingClientRect().top;
      });
      // Tolerancia de 1px por redondeo de subpíxeles.
      if (r !== null) expect(r).toBeGreaterThanOrEqual(altoHeader - 1);
    }
    expect(altoHeader).toBeGreaterThan(0);
  });
});

test.describe("Touch targets en móvil", () => {
  test.use({ viewport: MOVIL, hasTouch: true, isMobile: true });

  test("links y botones visibles miden 44px o más de alto y ancho", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-menu-toggle]").click();
    const chicos = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a, button")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          // Visibles y no el skip link (fuera de pantalla hasta el foco).
          return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top >= -1;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            texto:
              el.getAttribute("aria-label") ??
              (el.textContent ?? "").replace(/\s+/g, " ").trim(),
            ancho: Math.round(r.width),
            alto: Math.round(r.height),
          };
        })
        .filter((t) => t.alto < 44 || t.ancho < 44),
    );
    expect(chicos).toEqual([]);
  });
});
