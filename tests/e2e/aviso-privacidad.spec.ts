import { expect, test } from "@playwright/test";
import { ANCHOS, ESCRITORIO, MOVIL } from "./helpers";

/**
 * Aviso de privacidad (issue #13): página publicada y enlazada desde el
 * footer, header simplificado, mención de Google Analytics y sus cookies, y
 * aviso de borrador con `noindex` mientras el cliente no lo apruebe.
 */
const RUTA = "/aviso-de-privacidad";

test.describe("Aviso de privacidad", () => {
  test("responde 200 con su título, h1 y canónica", async ({
    page,
    request,
  }) => {
    expect((await request.get(RUTA)).status()).toBe(200);
    await page.goto(RUTA);
    await expect(page).toHaveTitle("Aviso de privacidad | Los May");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Aviso de privacidad",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://losmay.com/aviso-de-privacidad",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Aviso de privacidad de Los May/,
    );
  });

  test("el footer de la landing enlaza al aviso y el link lleva a la página", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Aviso de privacidad" })
      .click();
    await expect(page).toHaveURL(/\/aviso-de-privacidad\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Aviso de privacidad",
    );
    // El footer también está en el aviso.
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Aviso de privacidad" }),
    ).toHaveAttribute("href", RUTA);
  });

  test("muestra el aviso de borrador y no se indexa", async ({ page }) => {
    await page.goto(RUTA);
    const borrador = page.locator("[data-aviso-borrador]");
    await expect(borrador).toBeVisible();
    await expect(borrador).toContainText("Borrador pendiente de aprobación");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("menciona Google Analytics y sus cookies, y enlaza la desactivación", async ({
    page,
  }) => {
    await page.goto(RUTA);
    const cookies = page.locator("section#cookies");
    await expect(
      cookies.getByRole("heading", { name: "Cookies y Google Analytics" }),
    ).toBeVisible();
    await expect(cookies).toContainText("Google Analytics 4");
    await expect(cookies).toContainText("cookies");
    await expect(cookies).toContainText("_ga");
    const optOut = cookies.getByRole("link", {
      name: "Complemento de inhabilitación de Google Analytics",
    });
    await expect(optOut).toHaveAttribute(
      "href",
      /^https:\/\/tools\.google\.com\/dlpage\/gaoptout/,
    );
    await expect(optOut).toHaveAttribute("target", "_blank");
    await expect(optOut).toHaveAttribute("rel", /noopener/);
  });

  test("tiene las secciones que pide la LFPDPPP", async ({ page }) => {
    await page.goto(RUTA);
    const titulos = await page
      .getByRole("main")
      .getByRole("heading", { level: 2 })
      .allTextContents();
    expect(titulos.map((t) => t.trim())).toEqual([
      "Quién es responsable de tus datos",
      "Qué datos personales tratamos",
      "Para qué usamos tus datos",
      "Cookies y Google Analytics",
      "Con quién compartimos tus datos",
      "Tus derechos ARCO",
      "Cómo revocar tu consentimiento o limitar el uso de tus datos",
      "Cambios a este aviso",
    ]);
  });

  test("los datos del cliente pendientes se ven resaltados", async ({
    page,
  }) => {
    await page.goto(RUTA);
    const pendientes = await page
      .locator("main span.bg-pendiente")
      .allTextContents();
    for (const dato of [
      "[razón social]",
      "[domicilio fiscal]",
      "[contacto de privacidad]",
      "[fecha de aprobación]",
    ]) {
      expect(pendientes).toContain(dato);
    }
  });

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`header simplificado a ${viewport.width}px: logo al inicio y WhatsApp, sin menú`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(RUTA);
      const header = page.getByRole("banner");
      await expect(
        header.getByRole("link", { name: "Los May — inicio" }).filter({
          visible: true,
        }),
      ).toHaveAttribute("href", "/");
      const whatsapp = header
        .getByRole("link", { name: "Cotizar por WhatsApp" })
        .filter({ visible: true });
      await expect(whatsapp).toHaveCount(1);
      await expect(whatsapp).toHaveAttribute("data-track", "click_whatsapp");
      await expect(whatsapp).toHaveAttribute("data-ubicacion", "header");
      // Sin links a las secciones, sin hamburguesa ni menú móvil.
      await expect(header.locator("a[href*='#']")).toHaveCount(0);
      await expect(header.getByRole("button")).toHaveCount(0);
      await expect(page.locator("#menu-movil")).toHaveCount(0);
      // Misma altura que el header completo de la landing.
      const alto = await header.evaluate(
        (el) => el.getBoundingClientRect().height,
      );
      await page.goto("/");
      const altoLanding = await page
        .getByRole("banner")
        .evaluate((el) => el.getBoundingClientRect().height);
      expect(Math.abs(alto - altoLanding)).toBeLessThanOrEqual(1);
    });
  }

  test("«Volver al inicio» lleva a la landing", async ({ page }) => {
    await page.goto(RUTA);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Volver al inicio" })
      .click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("sin scroll horizontal en ningún ancho", async ({ page }) => {
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto(RUTA);
      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(desborde, `scroll horizontal a ${ancho}px`).toBeLessThanOrEqual(0);
    }
  });

  test("sin errores en consola ni requests fallidos", async ({ page }) => {
    const errores: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        errores.push(`[${m.type()}] ${m.text()}`);
      }
    });
    page.on("pageerror", (e) => errores.push(`[pageerror] ${e}`));
    page.on("response", (r) => {
      if (r.status() >= 400) errores.push(`${r.url()} (${r.status()})`);
    });
    await page.goto(RUTA, { waitUntil: "networkidle" });
    expect(errores).toEqual([]);
  });
});
