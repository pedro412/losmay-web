import { expect, test } from "@playwright/test";
import { ESCRITORIO, MOVIL } from "./helpers";

test.describe("Footer", () => {
  test("contenido y copy del diseño", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toHaveCSS("background-color", "rgb(10, 32, 56)");
    await expect(footer).toHaveCSS("color", "rgb(201, 214, 228)");
    await expect(footer).toHaveCSS("font-size", "15px");

    await expect(
      footer.getByRole("img", { name: "Los May Materiales para construcción" }),
    ).toBeVisible();
    await expect(
      footer.getByText(
        "Materiales para construcción en Ciudad del Carmen, Campeche.",
        { exact: true },
      ),
    ).toBeVisible();

    await expect(
      footer.getByRole("heading", { name: "2 sucursales" }),
    ).toBeVisible();
    await expect(
      footer.getByRole("heading", { name: "Contacto" }),
    ).toBeVisible();
    await expect(footer).toContainText(
      "Santa RosalíaCorregidora 8, Santa Rosalía, 24197",
    );
    await expect(footer).toContainText(
      "Santa IsabelAv. Puerto de Campeche, Volcanes, 24150",
    );
    await expect(footer.getByText("losmay.com", { exact: true })).toBeVisible();

    const anio = new Date().getFullYear();
    await expect(
      footer.getByText(`© ${anio} Los May Materiales para Construcción`),
    ).toBeVisible();
    await expect(
      footer.getByText(
        "Holcim y Apasco son marcas registradas de Holcim, usadas con autorización.",
        { exact: true },
      ),
    ).toBeVisible();
  });

  test("encabezados de columna: 13px, 0.12em, blancos y en mayúsculas", async ({
    page,
  }) => {
    await page.goto("/");
    const h = page.getByRole("contentinfo").getByRole("heading", {
      name: "Contacto",
    });
    await expect(h).toHaveCSS("font-size", "13px");
    await expect(h).toHaveCSS("letter-spacing", `${13 * 0.12}px`);
    await expect(h).toHaveCSS("text-transform", "uppercase");
    await expect(h).toHaveCSS("color", "rgb(255, 255, 255)");
  });

  test("línea legal: 13px, #A9B8C9 y borde #22405F", async ({ page }) => {
    await page.goto("/");
    const legal = page
      .getByRole("contentinfo")
      .getByText("Holcim y Apasco son marcas registradas", { exact: false });
    await expect(legal).toHaveCSS("font-size", "13px");
    await expect(legal).toHaveCSS("color", "rgb(169, 184, 201)");
    const fila = legal.locator("..");
    await expect(fila).toHaveCSS("border-top-color", "rgb(34, 64, 95)");
    await expect(fila).toHaveCSS("margin-top", "40px");
    await expect(fila).toHaveCSS("padding-top", "20px");
  });

  test("padding del diseño: 48px arriba, 28px abajo", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toHaveCSS("padding-top", "48px");
    await expect(footer).toHaveCSS("padding-bottom", "28px");
    await expect(footer).toHaveCSS("padding-left", "72px");
  });

  test("tres columnas en escritorio y apiladas en móvil", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const columnas = page
      .getByRole("contentinfo")
      .locator(":scope > div")
      .first()
      .locator(":scope > div");
    await expect(columnas).toHaveCount(3);
    const ys = await Promise.all(
      (await columnas.all()).map(async (c) => (await c.boundingBox())!.y),
    );
    expect(new Set(ys).size).toBe(1);

    await page.setViewportSize(MOVIL);
    const xs = await Promise.all(
      (await columnas.all()).map(async (c) => (await c.boundingBox())!.x),
    );
    expect(new Set(xs).size).toBe(1);
  });
});
