import { expect, test } from "@playwright/test";
import { ESCRITORIO, LINKS_MENU, MOVIL } from "./helpers";

/**
 * Sin JavaScript, el menú móvil se abre y se cierra con links a
 * `#menu-movil` / `#barra-movil` y `:target` (ver Header.astro).
 */
test.describe("Menú móvil sin JavaScript", () => {
  // Sin animación del scroll suave, para medir la posición al instante.
  test.use({
    javaScriptEnabled: false,
    viewport: MOVIL,
    reducedMotion: "reduce",
  });

  test("el botón se cambia por el link «Abrir menú» y el panel abre y cierra", async ({
    page,
  }) => {
    await page.goto("/");
    const header = page.locator("[data-header]");
    const panel = page.locator("#menu-movil");
    const abrir = header.getByRole("link", { name: "Abrir menú" });
    const cerrar = header.getByRole("link", { name: "Cerrar menú" });

    // El botón (que sin JS no haría nada) no se ve.
    await expect(header.locator("[data-menu-toggle]")).toBeHidden();
    await expect(abrir).toBeVisible();
    await expect(cerrar).toBeHidden();
    await expect(panel).toBeHidden();
    const caja = (await abrir.boundingBox())!;
    expect(caja.width).toBe(44);
    expect(caja.height).toBe(44);

    await abrir.click();
    await expect(panel).toBeVisible();
    await expect(abrir).toBeHidden();
    await expect(cerrar).toBeVisible();
    for (const { label } of LINKS_MENU) {
      await expect(panel.getByRole("link", { name: label })).toBeVisible();
    }
    // Desde arriba, el `:target` solo sube la página lo que mide el topbar:
    // el header queda pegado arriba y el panel, completo bajo él.
    const topbar = (await page
      .locator("[data-header]")
      .evaluate(
        (h) => h.getBoundingClientRect().top + window.scrollY,
      )) as number;
    expect(await page.evaluate(() => window.scrollY)).toBe(topbar);
    const cajaPanel = (await panel.boundingBox())!;
    expect(cajaPanel.y).toBe(64);
    expect(cajaPanel.y + cajaPanel.height).toBeLessThanOrEqual(MOVIL.height);

    await cerrar.click();
    await expect(panel).toBeHidden();
    await expect(abrir).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(topbar);
  });

  test("con la página bajada, abrir y cerrar no la mueve", async ({ page }) => {
    await page.goto("/");
    // Hasta 600px, o lo que dé la página (por ahora es corta).
    const antes = await page.evaluate(() => {
      window.scrollTo(0, 600);
      return window.scrollY;
    });
    expect(antes).toBeGreaterThan(100);
    const header = page.locator("[data-header]");
    const panel = page.locator("#menu-movil");
    await header.getByRole("link", { name: "Abrir menú" }).click();
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(antes);
    expect((await panel.boundingBox())!.y).toBe(64);
    await header.getByRole("link", { name: "Cerrar menú" }).click();
    await expect(panel).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBe(antes);
  });

  test("tocar un link del panel lo cierra", async ({ page }) => {
    await page.goto("/");
    const panel = page.locator("#menu-movil");
    await page
      .locator("[data-header]")
      .getByRole("link", { name: "Abrir menú" })
      .click();
    await expect(panel).toBeVisible();
    const { label, href } = LINKS_MENU[0];
    await panel.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(panel).toBeHidden();
  });

  test("en escritorio no aparecen los links de respaldo", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/#menu-movil");
    await expect(page.locator("[data-menu-sin-js]")).toHaveCount(2);
    for (const link of await page.locator("[data-menu-sin-js]").all()) {
      await expect(link).toBeHidden();
    }
    await expect(page.locator("#menu-movil")).toBeHidden();
  });
});

test.describe("Menú móvil con JavaScript", () => {
  test.use({ viewport: MOVIL });

  test("los links de respaldo sin JS no se ven", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-menu-toggle]")).toBeVisible();
    for (const link of await page.locator("[data-menu-sin-js]").all()) {
      await expect(link).toBeHidden();
    }
  });
});
