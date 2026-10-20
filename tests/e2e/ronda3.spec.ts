import { devices, expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ANCHOS, BREAKPOINT, ESCRITORIO, MOVIL } from "./helpers";

/**
 * Ronda 3 de QA (fase 1): emulación táctil real, tokens del sistema visual,
 * logo e íconos, único JS de la página, scroll suave según
 * `prefers-reduced-motion`, el breakpoint exacto, el alto del header contra
 * `--altura-header` y el contraste de los botones.
 */

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));

// `defaultBrowserType` no se puede usar dentro de un describe.
const { defaultBrowserType: _, ...PIXEL_7 } = devices["Pixel 7"];

const botonMenu = (page: Page) => page.locator("[data-menu-toggle]");

/* -------------------------------------------------------------------------- */
/* Contraste (WCAG 2.x)                                                       */
/* -------------------------------------------------------------------------- */

type Rgb = [number, number, number];

function leerRgb(color: string): Rgb {
  const m = color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (!m) throw new Error(`Color no soportado: ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminancia([r, g, b]: Rgb) {
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: Rgb, b: Rgb) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Aplica `filter: brightness(x)` como lo hace el navegador (lineal, con tope). */
function conBrillo(rgb: Rgb, filtro: string): Rgb {
  const m = filtro.match(/brightness\(([\d.]+)\)/);
  const k = m ? Number(m[1]) : 1;
  return rgb.map((c) => Math.min(255, Math.round(c * k))) as Rgb;
}

async function coloresDe(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const c = getComputedStyle(el);
    return { texto: c.color, fondo: c.backgroundColor, filtro: c.filter };
  });
}

/* -------------------------------------------------------------------------- */
/* Pruebas                                                                    */
/* -------------------------------------------------------------------------- */

test.describe("Menú móvil en un teléfono emulado (Pixel 7, táctil)", () => {
  test.use(PIXEL_7);

  test("tocar abre; tocar fuera, un link o Escape lo cierran", async ({
    page,
  }) => {
    await page.goto("/");
    const boton = botonMenu(page);
    const panel = page.locator("#menu-movil");

    await boton.tap();
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();

    // Toque en el contenido, debajo del panel.
    const alto = page.viewportSize()!.height;
    await page.touchscreen.tap(200, alto - 40);
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();

    await boton.tap();
    await panel.locator("a[href='#sucursales']").tap();
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#sucursales$/);

    await boton.tap();
    await page.keyboard.press("Escape");
    await expect(boton).toHaveAttribute("aria-expanded", "false");
  });

  test("sin zoom de la vista ni scroll horizontal, con el menú cerrado y abierto", async ({
    page,
  }) => {
    await page.goto("/");
    const medir = () =>
      page.evaluate(() => ({
        escala: window.visualViewport?.scale ?? 1,
        scrollWidth: document.documentElement.scrollWidth,
        ancho: window.innerWidth,
      }));
    for (const abrir of [false, true]) {
      if (abrir) await botonMenu(page).tap();
      const m = await medir();
      expect(m.escala).toBe(1);
      expect(m.scrollWidth).toBeLessThanOrEqual(m.ancho);
    }
  });
});

test.describe("Teléfonos angostos con viewport real (isMobile)", () => {
  for (const width of [320, 360]) {
    test(`a ${width}px el layout viewport no se ensancha`, async ({
      browser,
    }) => {
      // Con isMobile, si algo se desborda Chrome agranda el layout viewport
      // y aleja la vista: innerWidth deja de ser el ancho del dispositivo.
      const contexto = await browser.newContext({
        viewport: { width, height: 640 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await contexto.newPage();
      await page.goto("/");
      for (const abrir of [false, true]) {
        if (abrir) await botonMenu(page).tap();
        const m = await page.evaluate(() => ({
          ancho: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(m.ancho).toBe(width);
        expect(m.scrollWidth).toBe(width);
      }
      await contexto.close();
    });
  }
});

test.describe("Breakpoint", () => {
  test(`a ${BREAKPOINT - 1}px se ve el header móvil y a ${BREAKPOINT}px el de escritorio`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: BREAKPOINT - 1, height: 800 });
    await page.goto("/");
    await expect(page.locator("#barra-movil")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeHidden();

    await page.setViewportSize({ width: BREAKPOINT, height: 800 });
    await expect(page.locator("#barra-movil")).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeVisible();
  });

  test("--altura-header coincide con el alto real del header en todos los anchos", async ({
    page,
  }) => {
    await page.goto("/");
    const anchos = [...ANCHOS, 400, 500, 640, 759, 760, 800, 900, 1023, 1280];
    for (const width of anchos) {
      await page.setViewportSize({ width, height: 800 });
      const m = await page.evaluate(() => ({
        real: document.querySelector("[data-header]")!.getBoundingClientRect()
          .height,
        variable: parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--altura-header",
          ),
        ),
      }));
      expect(
        Math.abs(m.real - m.variable),
        `a ${width}px el header mide ${m.real}px y --altura-header es ${m.variable}px`,
      ).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("Scroll suave", () => {
  test("hay scroll suave por defecto", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
  });

  test.describe("con prefers-reduced-motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("el scroll es instantáneo", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    });
  });
});

test.describe("Único JS de la página (issue #5)", () => {
  test("solo hay un <script>, el del menú, y es del mismo origen", async ({
    page,
  }) => {
    const externos: string[] = [];
    page.on("request", (r) => {
      const url = new URL(r.url());
      if (url.origin !== "http://localhost:4400") externos.push(r.url());
    });
    await page.goto("/");
    const scripts = await page.evaluate(() =>
      // El JSON-LD de la FAQ es un `<script>` de datos, no ejecutable.
      [...document.scripts]
        .filter((s) => s.type !== "application/ld+json")
        .map((s) => ({
          src: s.src,
          codigo: s.textContent ?? "",
        })),
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0].codigo).toContain("data-menu-toggle");
    expect(externos).toEqual([]);
  });
});

test.describe("Sistema visual (issue #2)", () => {
  test("@theme define los 15 colores del issue con su hex", () => {
    const css = readFileSync(join(RAIZ, "src/styles/global.css"), "utf8");
    const tema = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    const esperados: Record<string, string> = {
      marino: "#0E2A47",
      "marino-900": "#0A2038",
      "marino-line": "#2B4D72",
      "marino-200": "#C9D6E4",
      "marino-100": "#D5DEE8",
      rojo: "#C8202A",
      "rojo-700": "#B01C25",
      "rojo-400": "#E0353C",
      concreto: "#ECE9E4",
      grafito: "#16202B",
      acero: "#545D68",
      "acero-600": "#4B535D",
      borde: "#D6D1C9",
      "borde-suave": "#E3DFD8",
      whatsapp: "#138544",
    };
    for (const [token, hex] of Object.entries(esperados)) {
      const valor = tema.match(
        new RegExp(`--color-${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
      )?.[1];
      expect(valor?.toUpperCase(), `--color-${token}`).toBe(hex);
    }
  });

  test("cuerpo: Barlow 17px / 1.5 en grafito sobre blanco", async ({
    page,
  }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toHaveCSS("font-size", "17px");
    await expect(body).toHaveCSS("line-height", "25.5px");
    await expect(body).toHaveCSS("color", "rgb(22, 32, 43)");
    await expect(body).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(body).toHaveCSS("font-family", /^Barlow/);
  });
});

test.describe("Logo e íconos (issue #3)", () => {
  test.use({ viewport: ESCRITORIO });

  test("el logo no usa <text>: los textos están convertidos a paths", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("svg text")).toHaveCount(0);
  });

  test("variantes de color: marino + rojo en el header, blanco + #E0353C en el footer", async ({
    page,
  }) => {
    await page.goto("/");
    const colores = (selector: string) =>
      page.locator(selector).evaluate((svg) => {
        const usados = new Set<string>();
        for (const el of svg.querySelectorAll("path, rect, polygon")) {
          const c = getComputedStyle(el);
          if (c.fill !== "none") usados.add(c.fill);
          if (c.stroke !== "none") usados.add(c.stroke);
        }
        return [...usados].sort();
      });

    expect(
      await colores(
        "header a[aria-label='Los May — inicio'] svg >> visible=true",
      ),
    ).toEqual(["rgb(14, 42, 71)", "rgb(200, 32, 42)"]);
    expect(await colores("footer svg")).toEqual([
      "rgb(224, 53, 60)",
      "rgb(255, 255, 255)",
    ]);
  });

  test("el logo del footer es una imagen con nombre; el del header es decorativo dentro de un link con nombre", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("img", { name: "Los May Materiales para construcción" }),
    ).toBeVisible();
    const logoHeader = page.locator(
      "header a[aria-label='Los May — inicio'] svg >> visible=true",
    );
    await expect(logoHeader).toHaveAttribute("aria-hidden", "true");
  });

  test("íconos de línea: aria-hidden y trazo de 1.8 a 2.2", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    await botonMenu(page).click();
    const iconos = await page.evaluate(() =>
      [...document.querySelectorAll("header svg, footer svg")]
        .filter((svg) => getComputedStyle(svg).stroke !== "none")
        .filter((svg) => svg.getBoundingClientRect().width > 0)
        .filter((svg) => svg.getBoundingClientRect().width <= 24)
        .map((svg) => ({
          oculto: svg.getAttribute("aria-hidden"),
          trazo: parseFloat(getComputedStyle(svg).strokeWidth),
        })),
    );
    expect(iconos.length).toBeGreaterThan(0);
    for (const { oculto, trazo } of iconos) {
      expect(oculto).toBe("true");
      expect(trazo).toBeGreaterThanOrEqual(1.8);
      expect(trazo).toBeLessThanOrEqual(2.2);
    }
  });
});

test.describe("Contenido centralizado (issue #4)", () => {
  /** Archivos .astro/.ts de componentes, layouts y páginas. */
  function archivos(dir: string): string[] {
    return readdirSync(dir).flatMap((nombre) => {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) return archivos(ruta);
      return /\.(astro|ts|tsx|js|mjs)$/.test(nombre) ? [ruta] : [];
    });
  }

  test("ningún componente tiene teléfonos, links de WhatsApp ni tel: escritos a mano", () => {
    const rutas = ["src/components", "src/layouts", "src/pages"].flatMap((d) =>
      archivos(join(RAIZ, d)),
    );
    expect(rutas.length).toBeGreaterThan(0);
    for (const ruta of rutas) {
      const codigo = readFileSync(ruta, "utf8");
      expect(codigo, ruta).not.toMatch(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/);
      expect(codigo, ruta).not.toMatch(/wa\.me|api\.whatsapp\.com/);
      expect(codigo, ruta).not.toMatch(/tel:\+?\d/);
      expect(codigo, ruta).not.toMatch(/Hola Los May/);
    }
  });

  test("los datos entre corchetes de site.ts tienen un TODO(cliente) cerca", () => {
    const lineas = readFileSync(join(RAIZ, "src/data/site.ts"), "utf8").split(
      "\n",
    );
    lineas.forEach((linea, i) => {
      // Los comentarios pueden citar ejemplos entre corchetes.
      if (/^\s*(\*|\/\/|\/\*)/.test(linea)) return;
      // Solo literales de texto con un dato pendiente ("[zonas]", "[Confirmar]").
      if (!/["'`][^"'`]*\[[A-Za-zÁÉÍÓÚáéíóúñ][^\]]*\][^"'`]*["'`]/.test(linea))
        return;
      const contexto = lineas.slice(Math.max(0, i - 6), i + 1).join("\n");
      expect(contexto, `site.ts:${i + 1} ${linea.trim()}`).toContain(
        "TODO(cliente)",
      );
    });
  });
});

test.describe("Contraste de los botones y textos del header y footer", () => {
  test("en reposo, el texto cumple 4.5:1 sobre su fondo", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const casos: [string, string][] = [
      ["topbar", "aside p"],
      [
        "botón verde del header",
        "nav[aria-label='Principal'] a[href*='wa.me'] >> visible=true",
      ],
    ];
    for (const [nombre, selector] of casos) {
      const { texto, fondo } = await coloresDe(page, selector);
      expect(
        contraste(leerRgb(texto), leerRgb(fondo)),
        nombre,
      ).toBeGreaterThanOrEqual(4.5);
    }

    // Footer: los textos sobre marino-900.
    const fondoFooter = leerRgb(
      await page
        .locator("footer")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    );
    const textos = await page
      .locator("footer p, footer a, footer h2, footer strong")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    for (const color of textos) {
      expect(
        contraste(leerRgb(color), fondoFooter),
        `footer ${color}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // El hover del botón verde oscurece el fondo (whatsapp-hover) en lugar de
  // aclararlo, para que el texto blanco de 15px no baje de 4.5:1.
  test("en hover, el botón verde de texto sigue en 4.5:1", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const selector =
      "nav[aria-label='Principal'] a[href*='wa.me'] >> visible=true";
    const enReposo = (await coloresDe(page, selector)).fondo;
    await page.locator(selector).hover();
    await expect
      .poll(async () => (await coloresDe(page, selector)).fondo)
      .not.toBe(enReposo);
    // Deja terminar la transición (150ms).
    await page.waitForTimeout(300);
    const { texto, fondo, filtro } = await coloresDe(page, selector);
    expect(
      contraste(
        conBrillo(leerRgb(texto), filtro),
        conBrillo(leerRgb(fondo), filtro),
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
