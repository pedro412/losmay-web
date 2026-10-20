import { expect, test } from "@playwright/test";
import {
  mapsLink,
  mensajes,
  sucursales,
  telLink,
  waLink,
} from "../../src/data/site";
import {
  ESCRITORIO,
  leerWhatsApp,
  MENSAJE_GENERAL,
  MOVIL,
  WHATSAPP,
} from "./helpers";

test.describe("Links de WhatsApp", () => {
  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`número y texto correctos a ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      if (viewport.width < 760) {
        await page.locator("[data-menu-toggle]").click();
      }
      const links = page.locator("a[href*='wa.me']:visible");
      expect(await links.count()).toBeGreaterThan(0);

      for (const link of await links.all()) {
        const href = (await link.getAttribute("href"))!;
        const wa = leerWhatsApp(href);
        expect(wa.host).toBe("wa.me");
        expect(wa.numero).toBe(WHATSAPP);
        expect(wa.texto).toBe(MENSAJE_GENERAL);
        // El texto va codificado con encodeURIComponent (espacios como %20).
        expect(href).toContain("text=Hola%20Los%20May");
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", /noopener/);
      }
    });
  }

  test("los mensajes de site.ts son los del diseño", () => {
    expect(mensajes.general).toBe(
      "Hola Los May, quiero cotizar material para mi obra.",
    );
    expect(mensajes.mayoreo).toBe(
      "Hola Los May, quiero cotizar cemento Holcim por mayoreo (desde 16 toneladas).",
    );
    expect(mensajes.porTonelaje(24)).toBe(
      "Hola Los May, quiero cotizar 24 toneladas de cemento Holcim. Mi obra está en: ",
    );
    expect(mensajes.masDe32).toBe(
      "Hola Los May, quiero cotizar más de 32 toneladas de cemento Holcim. Necesito aproximadamente: ",
    );
    const wa = leerWhatsApp(waLink(mensajes.porTonelaje(16)));
    expect(wa.numero).toBe(WHATSAPP);
    expect(wa.texto).toBe(mensajes.porTonelaje(16));
  });
});

test.describe("Teléfonos y Maps", () => {
  test("links tel: del footer con número internacional", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const esperados = [
      { texto: "Santa Rosalía · 938 108 2953", href: "tel:+529381082953" },
      { texto: "Santa Isabel · 938 132 6244", href: "tel:+529381326244" },
    ];
    for (const { texto, href } of esperados) {
      await expect(
        footer.getByRole("link", { name: texto, exact: true }),
      ).toHaveAttribute("href", href);
    }
    // Ningún tel: mal formado en toda la página.
    for (const link of await page.locator("a[href^='tel:']").all()) {
      await expect(link).toHaveAttribute("href", /^tel:\+52\d{10}$/);
    }
  });

  test("helpers de tel y Maps", () => {
    expect(telLink("938 108 2953")).toBe("tel:+529381082953");
    expect(telLink("529381082953")).toBe("tel:+529381082953");
    for (const sucursal of sucursales) {
      const url = new URL(mapsLink(sucursal.mapsQuery));
      expect(url.origin + url.pathname).toBe(
        "https://www.google.com/maps/search/",
      );
      expect(url.searchParams.get("api")).toBe("1");
      expect(url.searchParams.get("query")).toBe(sucursal.mapsQuery);
    }
  });

  test("links de Maps de la página (si existen) abren en otra pestaña", async ({
    page,
  }) => {
    await page.goto("/");
    const links = page.locator("a[href*='google.com/maps']");
    for (const link of await links.all()) {
      const url = new URL((await link.getAttribute("href"))!);
      expect(url.searchParams.get("query")).toMatch(/Ciudad del Carmen/);
      await expect(link).toHaveAttribute("target", "_blank");
    }
  });
});

test.describe("Links internos", () => {
  test("el aviso de privacidad del footer no da 404", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const link = page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Aviso de privacidad" });
    await expect(link).toHaveAttribute("href", "/aviso-de-privacidad");
    const respuesta = await request.get("/aviso-de-privacidad");
    expect(respuesta.status()).toBe(200);
  });
});
