import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { idGa } from "../../src/lib/analytics";
import {
  GA_ID_PRUEBA,
  GOOGLE,
  LOCAL,
  MOVIL,
  PRODUCCION,
  servirComoProduccion,
  type Red,
} from "./helpers";

/**
 * QA de la fase 3 (ronda 1): lo que faltaba cubrir de los issues #12, #13,
 * #14 y #16 en las otras pruebas.
 *
 * - #12: sin ID o fuera de producción no hay ni un byte de Analytics (builds
 *   reales sin ID y como preview de Vercel), en `*.vercel.app` no se mide, y
 *   en móvil todos los links de conversión mandan su evento con los
 *   parámetros de la tabla, también al tocar el ícono o activarlos con Enter.
 * - #13: los datos del responsable llevan `TODO(cliente)` y los links
 *   sueltos del aviso son touch targets de 44px.
 * - #14: el README deja como pendientes (sin palomear) los pasos manuales de
 *   Vercel y Hostinger, con los valores exactos de DNS.
 * - #16: los reportes de Lighthouse móvil están guardados y cumplen el
 *   criterio del issue.
 */

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const leer = (archivo: string) => readFileSync(join(raiz, archivo), "utf8");

/* -------------------------------------------------------------------------- */
/* #12 · GA4 solo en producción                                               */
/* -------------------------------------------------------------------------- */

test.describe("GA4: cuándo se incluye (#12)", () => {
  test("idGa: sin ID, en dev o en un preview de Vercel no hay Analytics", () => {
    const prod = { prod: true, vercelEnv: undefined };
    expect(idGa({ id: undefined, ...prod })).toBeNull();
    expect(idGa({ id: "", ...prod })).toBeNull();
    expect(idGa({ id: "   ", ...prod })).toBeNull();
    expect(
      idGa({ id: GA_ID_PRUEBA, prod: false, vercelEnv: undefined }),
    ).toBeNull();
    expect(
      idGa({ id: GA_ID_PRUEBA, prod: true, vercelEnv: "preview" }),
    ).toBeNull();
    expect(
      idGa({ id: GA_ID_PRUEBA, prod: true, vercelEnv: "development" }),
    ).toBeNull();
    expect(
      idGa({ id: ` ${GA_ID_PRUEBA} `, prod: true, vercelEnv: "production" }),
    ).toBe(GA_ID_PRUEBA);
    expect(() =>
      idGa({ id: "UA-123456-1", prod: true, vercelEnv: undefined }),
    ).toThrow(/no es un ID de medición/);
  });

  test("un build sin PUBLIC_GA_ID, o de preview en Vercel, no trae nada de GA", () => {
    test.slow();
    const htmlDe = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const ruta = join(dir, e.name);
        if (e.isDirectory()) return htmlDe(ruta);
        return e.name.endsWith(".html") ? [readFileSync(ruta, "utf8")] : [];
      });

    const casos: { nombre: string; env: Record<string, string> }[] = [
      { nombre: "sin ID", env: { PUBLIC_GA_ID: "" } },
      {
        nombre: "preview de Vercel con ID",
        env: { PUBLIC_GA_ID: GA_ID_PRUEBA, VERCEL_ENV: "preview" },
      },
    ];
    for (const { nombre, env } of casos) {
      const salida = mkdtempSync(join(tmpdir(), "losmay-ga-"));
      try {
        const entorno: NodeJS.ProcessEnv = { ...process.env, ...env };
        if (!("VERCEL_ENV" in env)) delete entorno.VERCEL_ENV;
        execFileSync("npx", ["astro", "build", "--outDir", salida], {
          cwd: raiz,
          env: entorno,
          stdio: "pipe",
        });
        const paginas = htmlDe(salida);
        expect(paginas.length, nombre).toBeGreaterThanOrEqual(2);
        for (const html of paginas) {
          expect(html, nombre).not.toContain("data-analytics");
          expect(html, nombre).not.toContain("googletagmanager");
          expect(html, nombre).not.toContain("dataLayer");
          expect(html, nombre).not.toContain(GA_ID_PRUEBA);
        }
      } finally {
        rmSync(salida, { recursive: true, force: true });
      }
    }
  });

  test("en un *.vercel.app (aunque el build traiga ID) no carga gtag.js ni manda eventos", async ({
    context,
    page,
  }) => {
    const PREVIEW = "https://losmay-web-git-fase-3.vercel.app";
    const google: string[] = [];
    const externas: string[] = [];
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === PREVIEW) {
        const respuesta = await route.fetch({
          url: `${LOCAL}${url.pathname}${url.search}`,
        });
        return route.fulfill({ response: respuesta });
      }
      if (GOOGLE.test(url.href)) {
        google.push(url.href);
        return route.abort();
      }
      externas.push(url.href);
      return route.abort();
    });
    await page.addInitScript(() => {
      document.addEventListener("click", (e) => e.preventDefault(), true);
    });
    await page.goto(`${PREVIEW}/`);
    await page.waitForLoadState("load");
    await page.locator("main a[href*='wa.me']").first().click();
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(
        () => (window as unknown as { dataLayer?: unknown }).dataLayer,
      ),
    ).toBeUndefined();
    expect(google).toEqual([]);
    expect(externas).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* #12 · Eventos en móvil                                                     */
/* -------------------------------------------------------------------------- */

async function eventos(page: Page) {
  return page.evaluate(() => {
    const capa = (window as unknown as { dataLayer?: ArrayLike<unknown>[] })
      .dataLayer;
    return (capa ? [...capa].map((e) => [...Array.from(e)]) : [])
      .filter((e) => e[0] === "event")
      .map((e) => [e[1], e[2]]);
  });
}

async function prepararProduccion(context: BrowserContext, page: Page) {
  const red = await servirComoProduccion(context);
  await page.addInitScript(() => {
    document.addEventListener("click", (e) => e.preventDefault(), true);
  });
  return red;
}

test.describe("GA4: eventos en móvil (#12)", () => {
  test.use({ viewport: MOVIL, hasTouch: true, isMobile: true });
  let red: Red;

  test.beforeEach(async ({ context, page }) => {
    red = await prepararProduccion(context, page);
    await page.goto(`${PRODUCCION}/`);
  });

  test.afterEach(() => {
    expect(red.externas).toEqual([]);
  });

  test("tocar cada link de conversión manda un solo evento con sus parámetros", async ({
    page,
  }) => {
    const esperados: [string, string, Record<string, string>][] = [
      [
        "main a[href*='wa.me'] >> nth=0",
        "click_whatsapp",
        { ubicacion: "hero" },
      ],
      [
        "main a[href*='wa.me'] >> nth=1",
        "click_whatsapp",
        { ubicacion: "pedido_16t" },
      ],
      [
        "main a[href*='wa.me'] >> nth=2",
        "click_whatsapp",
        { ubicacion: "pedido_24t" },
      ],
      [
        "main a[href*='wa.me'] >> nth=3",
        "click_whatsapp",
        { ubicacion: "pedido_32t" },
      ],
      [
        "main a[href*='wa.me'] >> nth=4",
        "click_whatsapp",
        { ubicacion: "pedido_mas32t" },
      ],
      [
        "main a[href*='wa.me'] >> nth=5",
        "click_whatsapp",
        { ubicacion: "cta_final" },
      ],
      [
        "#sucursales a[href^='tel:'] >> nth=0",
        "click_llamar",
        { sucursal: "santa_rosalia", ubicacion: "sucursales" },
      ],
      [
        "#sucursales a[href^='tel:'] >> nth=1",
        "click_llamar",
        { sucursal: "santa_isabel", ubicacion: "sucursales" },
      ],
      [
        "footer a[href^='tel:'] >> nth=0",
        "click_llamar",
        { sucursal: "santa_rosalia", ubicacion: "footer" },
      ],
      [
        "footer a[href^='tel:'] >> nth=1",
        "click_llamar",
        { sucursal: "santa_isabel", ubicacion: "footer" },
      ],
      [
        "a[href*='google.com/maps'] >> nth=0",
        "click_como_llegar",
        { sucursal: "santa_rosalia" },
      ],
      [
        "a[href*='google.com/maps'] >> nth=1",
        "click_como_llegar",
        { sucursal: "santa_isabel" },
      ],
    ];
    for (const [selector, nombre, parametros] of esperados) {
      const antes = (await eventos(page)).length;
      await page.locator(selector).tap();
      await expect
        .poll(async () => (await eventos(page)).length, { message: selector })
        .toBe(antes + 1);
      expect((await eventos(page))[antes], selector).toEqual([
        nombre,
        parametros,
      ]);
    }
  });

  test("tocar el ícono dentro de la tarjeta de pedido también cuenta", async ({
    page,
  }) => {
    const icono = page
      .locator(
        "a[data-ubicacion='pedido_24t'] img, a[data-ubicacion='pedido_24t'] svg",
      )
      .first();
    await icono.tap();
    await expect
      .poll(() => eventos(page))
      .toEqual([["click_whatsapp", { ubicacion: "pedido_24t" }]]);
  });

  test("activar un link con Enter (teclado) manda el evento", async ({
    page,
  }) => {
    await page.locator("a[data-ubicacion='cta_final']").focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => eventos(page))
      .toEqual([["click_whatsapp", { ubicacion: "cta_final" }]]);
  });
});

test.describe("GA4 en el aviso de privacidad (#12, #13)", () => {
  test("el WhatsApp del header mide ubicacion=header y los links legales no mandan nada", async ({
    context,
    page,
  }) => {
    const red = await prepararProduccion(context, page);
    await page.setViewportSize(MOVIL);
    await page.goto(`${PRODUCCION}/aviso-de-privacidad`);
    await page.locator("main a[href*='whatsapp.com/legal']").click();
    await page.getByRole("link", { name: "Volver al inicio" }).click();
    expect(await eventos(page)).toEqual([]);
    await page
      .locator("header a[href*='wa.me']")
      .filter({ visible: true })
      .click();
    await expect
      .poll(() => eventos(page))
      .toEqual([["click_whatsapp", { ubicacion: "header" }]]);
    expect(red.externas).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* #13 · Aviso de privacidad                                                  */
/* -------------------------------------------------------------------------- */

test.describe("Aviso de privacidad (#13)", () => {
  test("razón social, domicilio fiscal y contacto de privacidad llevan TODO(cliente)", () => {
    const fuente = leer("src/data/site.ts").split("\n");
    for (const marcador of [
      "[razón social]",
      "[domicilio fiscal]",
      "[contacto de privacidad]",
    ]) {
      const i = fuente.findIndex((l) => l.includes(`"${marcador}"`));
      expect(i, marcador).toBeGreaterThan(-1);
      const contexto = fuente.slice(Math.max(0, i - 3), i + 1).join("\n");
      expect(contexto, marcador).toContain("TODO(cliente)");
    }
  });

  test("los links sueltos del aviso (listas de links) miden 44px de alto en móvil", async ({
    browser,
  }) => {
    for (const width of [320, 390]) {
      const contexto = await browser.newContext({
        viewport: { width, height: 800 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await contexto.newPage();
      await page.goto("/aviso-de-privacidad");
      // Un link que es todo el contenido de su <li> no está dentro de una
      // oración: no aplica la excepción de WCAG 2.5.8 y es un touch target.
      const chicos = await page.locator("main li > a").evaluateAll((as) =>
        as
          .filter(
            (a) =>
              a.parentElement!.textContent!.trim() === a.textContent!.trim(),
          )
          .map((a) => {
            const r = a.getBoundingClientRect();
            return {
              texto: a.textContent!.trim(),
              alto: Math.round(r.height),
            };
          })
          .filter((t) => t.alto < 44),
      );
      expect(chicos, `${width}px`).toEqual([]);
      await contexto.close();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* #14 · Pasos manuales de Vercel y Hostinger                                 */
/* -------------------------------------------------------------------------- */

test.describe("Deploy: pendientes manuales documentados (#14)", () => {
  test("el README los deja sin palomear, con los valores exactos", () => {
    const readme = leer("README.md");
    const pendiente = (patron: RegExp) =>
      readme.split("\n").find((l) => patron.test(l));

    const casos: [string, RegExp][] = [
      ["redirect www → apex", /www\.losmay\.com.*Redirect to.*losmay\.com/],
      ["A 216.150.1.1", /216\.150\.1\.1/],
      ["A 216.150.16.1", /216\.150\.16\.1/],
      ["CNAME www", /2aed6b4a0bef26c4\.vercel-dns-016\.com/],
      ["PUBLIC_GA_ID en Production", /PUBLIC_GA_ID.*Production/],
    ];
    for (const [nombre, patron] of casos) {
      const linea = pendiente(patron);
      expect(linea, nombre).toBeDefined();
      expect(linea!.trim(), nombre).toMatch(/^- \[ \] /);
    }
    expect(readme).not.toMatch(
      /^- \[x\] .*(216\.150|vercel-dns|PUBLIC_GA_ID)/im,
    );
  });

  test("ningún archivo del repo despliega ni toca dominios en Vercel", () => {
    const pkg = JSON.parse(leer("package.json")) as {
      scripts: Record<string, string>;
    };
    for (const [nombre, comando] of Object.entries(pkg.scripts)) {
      expect(comando, nombre).not.toMatch(/\bvercel\b/);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* #16 · Reportes de Lighthouse                                               */
/* -------------------------------------------------------------------------- */

test.describe("Lighthouse móvil guardado (#16)", () => {
  type Mediana = {
    puntajes: Record<string, number>;
    metricas: { lcpMs: number; cls: number };
  };
  const archivo = "docs/qa/lighthouse/resumen.json";

  test("hay reporte HTML de la landing y del aviso, y la landing cumple ≥ 95, LCP < 2.5 s y CLS < 0.1", () => {
    expect(existsSync(join(raiz, archivo))).toBe(true);
    const resumen = JSON.parse(leer(archivo)) as {
      configuracion: string;
      paginas: Record<string, { reporte: string; mediana: Mediana }>;
    };
    expect(resumen.configuracion).toMatch(/móvil/);
    for (const ruta of ["/", "/aviso-de-privacidad"]) {
      const pagina = resumen.paginas[ruta];
      expect(pagina, ruta).toBeDefined();
      expect(existsSync(join(raiz, pagina.reporte)), pagina.reporte).toBe(true);
    }
    const landing = resumen.paginas["/"].mediana;
    for (const categoria of [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ]) {
      expect(landing.puntajes[categoria], categoria).toBeGreaterThanOrEqual(
        0.95,
      );
    }
    expect(landing.metricas.lcpMs).toBeLessThan(2500);
    expect(landing.metricas.cls).toBeLessThan(0.1);
  });
});
