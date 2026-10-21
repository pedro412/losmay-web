import { expect, test, type Locator, type Page } from "@playwright/test";
import { mensajes, pedidos, sucursales } from "../../src/data/site";
import {
  ANCHOS,
  ESCRITORIO,
  leerWhatsApp,
  MENSAJE_GENERAL,
  MOVIL,
  WHATSAPP,
} from "./helpers";

/**
 * Fase 2 · Secciones (issues #6 a #10). Copy, medidas, colores y
 * comportamiento de cada sección contra docs/design/Main.dc.html.
 */

/** `#0E2A47` → `rgb(14, 42, 71)`, como lo devuelve getComputedStyle. */
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const C = {
  marino: rgb("#0E2A47"),
  rojo: rgb("#C8202A"),
  rojo700: rgb("#B01C25"),
  concreto: rgb("#ECE9E4"),
  blanco: rgb("#FFFFFF"),
  grafito: rgb("#16202B"),
  acero: rgb("#545D68"),
  acero600: rgb("#4B535D"),
  marino200: rgb("#C9D6E4"),
  marino100: rgb("#D5DEE8"),
  marinoLine: rgb("#2B4D72"),
  borde: rgb("#D6D1C9"),
  bordeSuave: rgb("#E3DFD8"),
  punteado: rgb("#B9B3A9"),
  whatsapp: rgb("#138544"),
  pendiente: rgb("#FFE7A3"),
  pendienteTexto: rgb("#4A3800"),
};

/** Sección por el id de su titular (`aria-labelledby`). */
const seccion = (page: Page, tituloId: string) =>
  page.locator(`section[aria-labelledby="${tituloId}"]`);

/** Texto visible normalizado (espacios colapsados). */
const texto = async (loc: Locator) =>
  (await loc.innerText()).replace(/\s+/g, " ").trim();

const css = (loc: Locator, prop: string) =>
  loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

/** clamp(min, vw × f, max) en px, como `cqi` sobre el ancho del viewport. */
const clamp = (min: number, f: number, max: number, ancho: number) =>
  Math.min(max, Math.max(min, (ancho * f) / 100));

/** Ancho del viewport sin barra de scroll (lo que mide `cqi`/`vw` en la raíz). */
const anchoUtil = (page: Page) =>
  page.evaluate(() => document.documentElement.clientWidth);

/* -------------------------------------------------------------------------- */

test.describe("Estructura de la landing (fase 2)", () => {
  test("las secciones van en el orden del diseño, con sus anchors", async ({
    page,
  }) => {
    await page.goto("/");
    const titulos = await page
      .locator("main section > div h2, main section h1")
      .evaluateAll((hs) =>
        hs.map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim()),
      );
    expect(titulos).toEqual([
      "Construye con Los May.",
      "Si compras cemento por volumen, esto es para ti.",
      "Desde 16 toneladas, en un toque.",
      "En 3 sencillos pasos.",
      "Holcim Apasco ECOPlanet",
      "Material a tiempo, sin sorpresas.",
      "Dos sucursales en Carmen.",
      "Antes de pedir.",
      "¿Cuántas toneladas necesitas?",
    ]);

    for (const [id, titulo] of [
      ["para-quien", "Si compras cemento por volumen, esto es para ti."],
      ["pedido", "Desde 16 toneladas, en un toque."],
      ["entregas", "En 3 sencillos pasos."],
      ["sucursales", "Dos sucursales en Carmen."],
      ["preguntas", "Antes de pedir."],
    ]) {
      await expect(
        page.getByRole("region", { name: titulo, exact: true }),
      ).toHaveAttribute("id", id);
    }
  });

  test("cada <section> se nombra con un titular que existe", async ({
    page,
  }) => {
    await page.goto("/");
    const rotas = await page.evaluate(() =>
      [...document.querySelectorAll("main section")]
        .map((s) => s.getAttribute("aria-labelledby"))
        .filter((id) => !id || !document.getElementById(id)),
    );
    expect(rotas).toEqual([]);
    expect(await page.locator("main section").count()).toBe(9);
  });

  test("los eyebrows de cada sección son los del diseño", async ({ page }) => {
    await page.goto("/");
    const eyebrows = await page
      .locator("main section p.eyebrow")
      .evaluateAll((ps) =>
        ps.map((p) => p.textContent!.replace(/\s+/g, " ").trim()),
      );
    expect(eyebrows).toEqual([
      "Materiales para construcción · Ciudad del Carmen",
      "Para quién es",
      "Pedido de mayoreo",
      "Tu pedido en obra",
      "El cemento",
      "Por qué Los May",
      "Sucursales",
      "Preguntas frecuentes",
    ]);
  });

  for (const ancho of [390, 1440, 1920]) {
    test(`fondos y padding de las secciones a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const w = await anchoUtil(page);
      const fondos: Record<string, string> = {
        "hero-titulo": C.marino,
        "pq-titulo": C.blanco,
        "ped-titulo": C.concreto,
        "ent-titulo": C.marino,
        "prod-titulo": C.blanco,
        "sucursales-titulo": C.blanco,
        "faq-titulo": C.blanco,
        "cta-titulo": C.marino,
      };
      for (const [id, fondo] of Object.entries(fondos)) {
        await expect(seccion(page, id), id).toHaveCSS(
          "background-color",
          fondo,
        );
      }
      await expect(
        page.locator("section", {
          has: page.getByRole("heading", {
            name: "Material a tiempo, sin sorpresas.",
          }),
        }),
      ).toHaveCSS("background-color", C.concreto);

      // padding: clamp(56px, 8cqi, 120px) clamp(20px, 5cqi, 80px)
      const vertical = clamp(56, 8, 120, w);
      const lateral = clamp(20, 5, 80, w);
      for (const id of [
        "pq-titulo",
        "ped-titulo",
        "ent-titulo",
        "prod-titulo",
        "sucursales-titulo",
        "faq-titulo",
      ]) {
        const s = seccion(page, id);
        expect(
          parseFloat(await css(s, "padding-top")),
          `${id} arriba`,
        ).toBeCloseTo(vertical, 0);
        expect(
          parseFloat(await css(s, "padding-bottom")),
          `${id} abajo`,
        ).toBeCloseTo(vertical, 0);
        expect(
          parseFloat(await css(s, "padding-left")),
          `${id} lateral`,
        ).toBeCloseTo(lateral, 0);
      }
      // Hero: clamp(40px, 7cqi, 104px). CTA: clamp(48px, 7cqi, 104px).
      expect(
        parseFloat(await css(seccion(page, "hero-titulo"), "padding-top")),
      ).toBeCloseTo(clamp(40, 7, 104, w), 0);
      expect(
        parseFloat(await css(seccion(page, "cta-titulo"), "padding-top")),
      ).toBeCloseTo(clamp(48, 7, 104, w), 0);
    });
  }

  test("titulares h2: Condensed 800, mayúsculas, clamp(36px, 5cqi, 68px), interlineado 0.95", async ({
    page,
  }) => {
    for (const ancho of [390, 1024, 1440]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const w = await anchoUtil(page);
      const h2s = page.locator("main section h2:not(#cta-titulo)");
      expect(await h2s.count()).toBe(7);
      for (const h2 of await h2s.all()) {
        const nombre = await texto(h2);
        await expect(h2, nombre).toHaveCSS("font-weight", "800");
        await expect(h2, nombre).toHaveCSS("text-transform", "uppercase");
        expect(await css(h2, "font-family"), nombre).toMatch(
          /^"?Barlow Condensed/,
        );
        const size = parseFloat(await css(h2, "font-size"));
        expect(size, `${nombre} a ${ancho}px`).toBeCloseTo(
          clamp(36, 5, 68, w),
          0,
        );
        expect(parseFloat(await css(h2, "line-height")) / size).toBeCloseTo(
          0.95,
          2,
        );
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Hero (#6)", () => {
  test("copy palabra por palabra", async ({ page }) => {
    await page.goto("/");
    const hero = seccion(page, "hero-titulo");
    await expect(hero.locator("h1")).toHaveText("Construye con Los May.");
    await expect(hero).toContainText(
      "Cemento, block, varilla, arena y grava con entrega en tu obra. Dos sucursales en Ciudad del Carmen para que tu obra no se detenga.",
    );
    await expect(
      hero.getByRole("link", { name: "Cotizar por WhatsApp" }),
    ).toBeVisible();
    await expect(
      hero.getByRole("link", { name: "Ver sucursales" }),
    ).toHaveAttribute("href", "#sucursales");
    await expect(
      hero.getByRole("img", { name: "Holcim", exact: true }),
    ).toBeVisible();
    expect(
      await texto(hero.getByText("Distribuidor", { exact: false }).last()),
    ).toMatch(/Distribuidor autorizado/i);
    await expect(hero).toContainText("Campaña de mayoreo");
    await expect(hero).toContainText("Desde 16 t");
    await expect(hero).toContainText("Cemento Holcim directo a tu obra");
    await expect(
      hero.getByRole("link", { name: "Pedir mayoreo" }),
    ).toHaveAttribute("href", "#pedido");
  });

  test("WhatsApp del hero: número y mensaje general", async ({ page }) => {
    await page.goto("/");
    const href = await seccion(page, "hero-titulo")
      .getByRole("link", { name: "Cotizar por WhatsApp" })
      .getAttribute("href");
    const wa = leerWhatsApp(href!);
    expect(wa.numero).toBe(WHATSAPP);
    expect(wa.texto).toBe(MENSAJE_GENERAL);
  });

  for (const ancho of [390, 1440, 1920]) {
    test(`h1: clamp(60px, 8.6cqi, 132px) y franja roja a ${ancho}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const w = await anchoUtil(page);
      const h1 = page.locator("h1");
      expect(parseFloat(await css(h1, "font-size"))).toBeCloseTo(
        clamp(60, 8.6, 132, w),
        0,
      );
      await expect(h1).toHaveCSS("font-weight", "800");
      await expect(h1).toHaveCSS("text-transform", "uppercase");
      await expect(h1).toHaveCSS("color", C.blanco);
      const franja = h1.locator("span", { hasText: "Los May." });
      // La franja es un degradado recortado (utilidad franja-roja), no un
      // fondo plano: ver "Hero · franja roja del titular".
      expect(await css(franja, "background-image")).toContain(C.rojo);
      expect(await css(franja, "box-decoration-break")).toBe("clone");
      const pad = parseFloat(await css(franja, "padding-left"));
      expect(pad / parseFloat(await css(h1, "font-size"))).toBeCloseTo(0.12, 2);
    });
  }

  test("la foto es el LCP: eager, fetchpriority high, sizes y 4:5", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    const foto = seccion(page, "hero-titulo").getByRole("img", {
      name: "Bulto de cemento Holcim Apasco ECOPlanet de 25 kg sobre una tarima",
    });
    await expect(foto).toHaveAttribute("loading", "eager");
    await expect(foto).toHaveAttribute("fetchpriority", "high");
    await expect(foto).toHaveAttribute("sizes", /.+/);
    const caja = (await foto.boundingBox())!;
    expect(caja.width / caja.height).toBeCloseTo(0.8, 2);
    await expect(foto).toHaveCSS("object-fit", "cover");
    await expect(foto).toHaveCSS("object-position", "50% 35%");
    // La variante elegida no es mucho más chica que lo que se pinta (DPR 1).
    const ancho = await foto.evaluate(
      (img: HTMLImageElement) => img.naturalWidth,
    );
    expect(ancho).toBeGreaterThanOrEqual(caja.width - 2);
  });

  test("columnas: lado a lado en escritorio y apiladas en móvil", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const hero = seccion(page, "hero-titulo");
    const h1 = (await hero.locator("h1").boundingBox())!;
    const foto = (await hero.locator("img[alt^='Bulto']").boundingBox())!;
    expect(foto.x).toBeGreaterThan(h1.x + 300);

    await page.setViewportSize(MOVIL);
    const h1m = (await hero.locator("h1").boundingBox())!;
    const fotom = (await hero.locator("img[alt^='Bulto']").boundingBox())!;
    expect(fotom.y).toBeGreaterThan(h1m.y + h1m.height);
    // La foto ocupa todo el ancho de la columna (390 − 2 × 20).
    expect(fotom.width).toBeCloseTo(350, 0);
  });

  test("botones del hero: 56px de alto, radios y colores del diseño", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const hero = seccion(page, "hero-titulo");
    const wa = hero.getByRole("link", { name: "Cotizar por WhatsApp" });
    const suc = hero.getByRole("link", { name: "Ver sucursales" });
    await expect(wa).toHaveCSS("background-color", C.whatsapp);
    await expect(wa).toHaveCSS("border-top-left-radius", "10px");
    await expect(suc).toHaveCSS("border-top-color", C.blanco);
    await expect(suc).toHaveCSS("border-top-width", "2px");
    for (const b of [wa, suc]) {
      expect((await b.boundingBox())!.height).toBeCloseTo(56, 0);
      await expect(b).toHaveCSS("font-size", "17px");
      await expect(b).toHaveCSS("font-weight", "700");
    }
    // max-width 320 y 280.
    expect((await wa.boundingBox())!.width).toBeLessThanOrEqual(320.5);
    expect((await suc.boundingBox())!.width).toBeLessThanOrEqual(280.5);
    const pedir = hero.getByRole("link", { name: "Pedir mayoreo" });
    await expect(pedir).toHaveCSS("background-color", C.rojo);
    expect((await pedir.boundingBox())!.height).toBeCloseTo(48, 0);
  });

  test("card de campaña: colores, tamaños y posición sobre la foto", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const hero = seccion(page, "hero-titulo");
    const etiqueta = hero.getByText("Campaña de mayoreo");
    await expect(etiqueta).toHaveCSS("color", C.rojo700);
    await expect(etiqueta).toHaveCSS("font-weight", "800");
    await expect(etiqueta).toHaveCSS("font-size", "12px");
    const pill = hero.getByText("Desde 16 t");
    await expect(pill).toHaveCSS("background-color", C.marino);
    const titulo = hero.getByText("Cemento Holcim directo a tu obra");
    await expect(titulo).toHaveCSS("font-size", "30px");
    await expect(titulo).toHaveCSS("color", C.marino);
    expect(await css(titulo, "font-family")).toMatch(/^"?Barlow Condensed/);

    const foto = (await hero.locator("img[alt^='Bulto']").boundingBox())!;
    const card = (await titulo.locator("..").boundingBox())!;
    expect(card.x - foto.x).toBeCloseTo(12, 0);
    expect(foto.y + foto.height - (card.y + card.height)).toBeCloseTo(12, 0);
  });

  test("sello Holcim del hero: borde 1.5px #2B4D72, logo de 30px", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = seccion(page, "hero-titulo");
    const logo = hero.getByRole("img", { name: "Holcim", exact: true });
    expect((await logo.boundingBox())!.height).toBeCloseTo(30, 0);
    const sello = logo.locator("..");
    await expect(sello).toHaveCSS("border-top-color", C.marinoLine);
    expect(await css(sello, "border-top-width")).toMatch(/^1(\.5)?px$/);
    await expect(sello).toHaveCSS("border-top-left-radius", "14px");
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Para quién es (#7)", () => {
  const TARJETAS = [
    [
      "Contratistas",
      "Surtido constante para que la obra no se detenga por falta de material.",
    ],
    [
      "Constructoras y arquitectos",
      "Cotización formal por escrito para presupuestar tus proyectos desde el inicio.",
    ],
    [
      "Ferreterías y materialistas",
      "Volumen constante para surtir tu negocio sin quedarte sin existencia.",
    ],
    [
      "Desarrolladores",
      "Entregas programadas por etapa: cimentación, muros y losas.",
    ],
  ];

  test("copy y orden de las 4 tarjetas", async ({ page }) => {
    await page.goto("/");
    const s = page.locator("#para-quien");
    const h3 = s.locator("h3");
    await expect(h3).toHaveText(TARJETAS.map(([t]) => t));
    for (const [, p] of TARJETAS) await expect(s).toContainText(p);
    // Ícono sobre cuadro marino de 48px, radio 12.
    const cuadros = s.locator("h3").locator("xpath=preceding-sibling::div[1]");
    expect(await cuadros.count()).toBe(4);
    for (const c of await cuadros.all()) {
      await expect(c).toHaveCSS("background-color", C.marino);
      await expect(c).toHaveCSS("border-top-left-radius", "12px");
      const b = (await c.boundingBox())!;
      expect(b.width).toBeCloseTo(48, 0);
      expect(b.height).toBeCloseTo(48, 0);
    }
    for (const t of await h3.all()) {
      await expect(t).toHaveCSS("font-size", "26px");
      await expect(t).toHaveCSS("font-weight", "700");
      await expect(t).toHaveCSS("color", C.marino);
    }
  });

  test("móvil: carrusel con scroll-snap, tarjetas al 78% y la siguiente asoma", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    const carril = page
      .locator("#para-quien h3")
      .first()
      .locator("xpath=ancestor::*[contains(@class,'overflow-x-auto')][1]");
    await expect(carril).toHaveCSS("overflow-x", "auto");
    await expect(carril).toHaveCSS("scroll-snap-type", "x mandatory");
    const tarjetas = carril.locator(":scope > *");
    expect(await tarjetas.count()).toBe(4);
    const primera = (await tarjetas.nth(0).boundingBox())!;
    const segunda = (await tarjetas.nth(1).boundingBox())!;
    // min(260px, 78%): a 390 → 260px.
    expect(primera.width).toBeCloseTo(260, 0);
    expect(primera.x).toBeCloseTo(20, 0);
    // La segunda asoma en el borde derecho (pista de que hay más).
    expect(segunda.x).toBeLessThan(390);
    expect(segunda.x + segunda.width).toBeGreaterThan(390);
    await expect(tarjetas.first()).toHaveCSS("scroll-snap-align", "start");
    // Sin scroll horizontal de la página.
    const scroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(scroll).toBeLessThanOrEqual(0);
  });

  test("móvil: el carrusel se puede recorrer con el teclado", async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const carril = page.getByRole("region", { name: "Tipos de cliente" });
    await expect(carril).toHaveAttribute("tabindex", "0");
    await carril.focus();
    await expect(carril).toBeFocused();
    const outline = await css(carril, "outline-style");
    expect(outline).not.toBe("none");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => carril.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    // Cada flecha salta a la siguiente tarjeta (snap); se espera a que termine.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
    }
    await expect
      .poll(() =>
        carril.evaluate(
          (el) => el.scrollLeft + el.clientWidth - el.scrollWidth,
        ),
      )
      .toBeGreaterThan(-2);
  });

  test("1024–1195px: sigue en carrusel con tarjetas de 260px, como el flex del diseño", async ({
    page,
  }) => {
    for (const ancho of [1024, 1100, 1180]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const carril = page.getByRole("region", { name: "Tipos de cliente" });
      const sobra = await carril.evaluate(
        (el) => el.scrollWidth - el.clientWidth,
      );
      expect(sobra, `${ancho}px`).toBeGreaterThan(0);
      for (const t of await carril.locator("article").all()) {
        expect((await t.boundingBox())!.width, `${ancho}px`).toBeCloseTo(
          260,
          0,
        );
      }
    }
  });

  test("escritorio: las 4 tarjetas en una fila, sin carrusel", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const h3 = page.locator("#para-quien h3");
    const ys = await h3.evaluateAll((hs) =>
      hs.map((h) =>
        Math.round(
          h.closest("article,div[class*='rounded']")!.getBoundingClientRect()
            .top,
        ),
      ),
    );
    expect(new Set(ys).size).toBe(1);
    const carril = page.getByRole("region", { name: "Tipos de cliente" });
    const sobra = await carril.evaluate(
      (el) => el.scrollWidth - el.clientWidth,
    );
    expect(sobra).toBeLessThanOrEqual(0);
    // Las tarjetas llenan el contenedor (máx. 1280px), gap 12.
    const cajas = await h3.evaluateAll((hs) =>
      hs.map((h) => h.closest("article")!.getBoundingClientRect().width),
    );
    const total = cajas.reduce((a, b) => a + b, 0) + 3 * 12;
    expect(total).toBeCloseTo(Math.min(1280, 1440 - 2 * 72), 0);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Pedido de mayoreo (#7)", () => {
  const TARJETAS = [
    {
      ton: "16 t",
      titulo: "Mínimo de mayoreo",
      detalle: "Entrega programada en obra",
      msg: "Hola Los May, quiero cotizar 16 toneladas de cemento Holcim. Mi obra está en: ",
    },
    {
      ton: "24 t",
      titulo: "Entrega en obra",
      detalle: "Fecha y horario a tu medida",
      msg: "Hola Los May, quiero cotizar 24 toneladas de cemento Holcim. Mi obra está en: ",
    },
    {
      ton: "32 t",
      titulo: "Entrega en obra",
      detalle: "En una o varias entregas",
      msg: "Hola Los May, quiero cotizar 32 toneladas de cemento Holcim. Mi obra está en: ",
    },
    {
      ton: "+32 t",
      titulo: "Más de 32 toneladas",
      detalle: "Obra grande o entregas por etapa",
      msg: "Hola Los May, quiero cotizar más de 32 toneladas de cemento Holcim. Necesito aproximadamente: ",
    },
  ];

  test("copy de la cabecera y del banner", async ({ page }) => {
    await page.goto("/");
    const s = page.locator("#pedido");
    await expect(s).toContainText(
      "Elige cuántas toneladas necesitas. Se abre WhatsApp con tu pedido escrito y te respondemos con cotización y fecha de entrega.",
    );
    await expect(s).toContainText(
      "¿Menos de 16 t? Te atendemos en cualquiera de nuestras dos sucursales.",
    );
    await expect(s.locator("strong")).toHaveText("¿Menos de 16 t?");
    await expect(
      s.getByRole("link", { name: "Ver sucursales" }),
    ).toHaveAttribute("href", "#sucursales");
  });

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`tarjetas-link: texto, nombre accesible y WhatsApp decodificado a ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const s = page.locator("#pedido");
      const links = s.locator("a[href*='wa.me']");
      await expect(links).toHaveCount(4);
      for (const [i, t] of TARJETAS.entries()) {
        const link = links.nth(i);
        // Sin aria-label: el nombre es todo el texto visible (WCAG 2.5.3,
        // Lighthouse `label-content-name-mismatch`) más un final solo para
        // lectores de pantalla.
        await expect(link).not.toHaveAttribute("aria-label");
        await expect(link).toHaveAccessibleName(
          `${t.ton} ${t.titulo} ${t.detalle} — pedir por WhatsApp`,
        );
        expect(
          await link.evaluate((a) =>
            [...a.querySelectorAll("span:not(.sr-only)")]
              .filter((s) => !s.querySelector("span"))
              .map((s) => s.textContent!.trim())
              .filter(Boolean)
              .join(" "),
          ),
        ).toBe(`${t.ton} ${t.titulo} ${t.detalle}`);
        await expect(link.locator(".sr-only")).toHaveText(
          "— pedir por WhatsApp",
        );
        const wa = leerWhatsApp((await link.getAttribute("href"))!);
        expect(wa.host).toBe("wa.me");
        expect(wa.numero).toBe(WHATSAPP);
        expect(wa.texto).toBe(t.msg);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", /noopener/);
        await expect(link).toBeVisible();
      }
      // Coincide con site.ts.
      expect(pedidos.map((p) => leerWhatsApp(p.href).texto)).toEqual(
        TARJETAS.map((t) => t.msg),
      );
    });
  }

  test("tarjeta: Condensed 48px marino, mínimo 96px, círculo verde de 48px, radio 16", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const links = page.locator("#pedido a[href*='wa.me']");
    for (const link of await links.all()) {
      await expect(link).toHaveCSS("background-color", C.blanco);
      await expect(link).toHaveCSS("border-top-left-radius", "16px");
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(96);
      const ton = link.locator("span").first();
      await expect(ton).toHaveCSS("font-size", "48px");
      await expect(ton).toHaveCSS("font-weight", "800");
      await expect(ton).toHaveCSS("color", C.marino);
      expect(await css(ton, "font-family")).toMatch(/^"?Barlow Condensed/);
      expect((await ton.boundingBox())!.width).toBeGreaterThanOrEqual(88);
      const circulo = link.locator("span[aria-hidden='true']").last();
      await expect(circulo).toHaveCSS("background-color", C.whatsapp);
      const c = (await circulo.boundingBox())!;
      expect(c.width).toBeCloseTo(48, 0);
      expect(c.height).toBeCloseTo(48, 0);
    }
  });

  test("cuadrícula auto-fit 260px: 4 columnas a 1440, 1 a 390", async ({
    page,
  }) => {
    for (const [viewport, columnas] of [
      [ESCRITORIO, 4],
      [MOVIL, 1],
      [{ width: 768, height: 900 }, 2],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const ys = await page
        .locator("#pedido a[href*='wa.me']")
        .evaluateAll((as) =>
          as.map((a) => Math.round(a.getBoundingClientRect().top)),
        );
      const filas = new Set(ys).size;
      expect(filas, `a ${viewport.width}px`).toBe(4 / columnas);
    }
  });

  test("banner punteado: 1.5px dashed #B9B3A9, radio 16, botón píldora de 44px", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = page
      .locator("#pedido strong")
      .locator("xpath=ancestor::div[1]");
    await expect(banner).toHaveCSS("border-top-style", "dashed");
    // 1.5px: Chromium lo pinta en 1px a DPR 1 (redondea a píxeles de pantalla).
    expect(await css(banner, "border-top-width")).toMatch(/^1(\.5)?px$/);
    await expect(banner).toHaveCSS("border-top-color", C.punteado);
    await expect(banner).toHaveCSS("border-top-left-radius", "16px");
    const boton = banner.getByRole("link", { name: "Ver sucursales" });
    expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(boton).toHaveCSS("border-top-color", C.marino);
    await expect(boton).toHaveCSS("font-size", "15px");
    expect(
      parseFloat(await css(boton, "border-top-left-radius")),
    ).toBeGreaterThanOrEqual(22);
  });

  test("las tarjetas tienen foco visible con el teclado", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const link = page.locator("#pedido a[href*='wa.me']").first();
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    expect(await css(link, "outline-style")).not.toBe("none");
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Tu pedido en obra (#8)", () => {
  test("copy de los 3 pasos y cierre", async ({ page }) => {
    await page.goto("/");
    const s = page.locator("#entregas");
    await expect(s.locator("h3")).toHaveText([
      "Solicita",
      "Programamos",
      "Entregamos",
    ]);
    await expect(s).toContainText(
      "Mándanos tu pedido por WhatsApp o llámanos. Te confirmamos existencia.",
    );
    await expect(s).toContainText(
      "Acordamos día y horario según el avance de tu obra.",
    );
    await expect(s).toContainText(
      "Llevamos el cemento a tu obra en Ciudad del Carmen y [zonas cercanas].",
    );
    await expect(s).toContainText("Tu proyecto, nuestra prioridad");
    for (const n of ["01", "02", "03"]) await expect(s).toContainText(n);
  });

  test("pasos: borde superior rojo de 3px, número Condensed 52px, h3 28px", async ({
    page,
  }) => {
    await page.goto("/");
    const s = page.locator("#entregas");
    const pasos = s
      .locator("h3")
      .locator("xpath=ancestor::*[contains(@class,'border-t')][1]");
    expect(await pasos.count()).toBe(3);
    for (const p of await pasos.all()) {
      await expect(p).toHaveCSS("border-top-width", "3px");
      await expect(p).toHaveCSS("border-top-color", C.rojo);
      await expect(p).toHaveCSS("padding-top", "20px");
      const num = p.locator("> :first-child");
      await expect(num).toHaveCSS("font-size", "52px");
      await expect(num).toHaveCSS("font-weight", "800");
      expect((await num.boundingBox())!.width).toBeCloseTo(56, 0);
    }
    for (const h of await s.locator("h3").all()) {
      await expect(h).toHaveCSS("font-size", "28px");
      await expect(h).toHaveCSS("font-weight", "700");
      await expect(h).toHaveCSS("color", C.blanco);
    }
    const cierre = s.getByText("Tu proyecto, nuestra prioridad");
    await expect(cierre).toHaveCSS("font-size", "22px");
    await expect(cierre).toHaveCSS("color", C.marino200);
  });

  test("escritorio: los 3 pasos en una fila", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const ys = await page
      .locator("#entregas h3")
      .evaluateAll((hs) =>
        hs.map((h) => Math.round(h.getBoundingClientRect().top)),
      );
    expect(new Set(ys).size).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("El cemento (#8)", () => {
  test("copy, ficha <dl> 2×2, chips y tarjeta «También en Los May»", async ({
    page,
  }) => {
    await page.goto("/");
    const s = seccion(page, "prod-titulo");
    await expect(s).toContainText(
      "Cemento Portland gris para obra general, en bulto de 25 kg: más ligero de cargar y acomodar en obra.",
    );
    await expect(s.locator("dl dt")).toHaveText([
      "Tipo",
      "Presentación",
      "Marca",
      "Emisiones",
    ]);
    const dd = await s
      .locator("dl dd")
      .evaluateAll((ds) =>
        ds.map((d) => d.textContent!.replace(/\s+/g, " ").trim()),
      );
    expect(dd.slice(0, 3)).toEqual([
      "Portland gris",
      "Bulto de 25 kg",
      "Holcim Apasco",
    ]);
    expect(dd[3]).toMatch(/^−35% CO ?2, según empaque$/);
    await expect(s.locator("ul").first().locator("li")).toHaveText([
      "Buen desempeño",
      "Buen rendimiento",
      "Fácil de colocar",
    ]);
    await expect(s.locator("h3")).toHaveText("También en Los May");
    await expect(s).toContainText(
      "Todo el material de obra negra en un solo lugar, con entrega en el mismo viaje.",
    );
    await expect(s.locator("ul").nth(1).locator("li")).toHaveText([
      "Block",
      "Varilla",
      "Arena",
      "Grava",
    ]);
    await expect(s).toContainText("Catálogo completo: [confirmar con Los May]");
    await expect(
      s.getByRole("img", { name: "Holcim", exact: true }),
    ).toBeVisible();
  });

  test("ficha en 2 columnas con divisores #E3DFD8", async ({ page }) => {
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    const dl = seccion(page, "prod-titulo").locator("dl");
    await expect(dl).toHaveCSS("border-top-color", C.bordeSuave);
    const xs = await dl
      .locator("dt")
      .evaluateAll((ds) =>
        ds.map((d) => Math.round(d.getBoundingClientRect().left)),
      );
    expect(new Set(xs).size).toBe(2);
    for (const dt of await dl.locator("dt").all()) {
      await expect(dt).toHaveCSS("font-size", "12px");
      await expect(dt).toHaveCSS("color", C.acero);
      await expect(dt).toHaveCSS("text-transform", "uppercase");
    }
  });

  test("sello sólido sobre marino con logo de 34px; tarjeta concreto radio 20", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const s = seccion(page, "prod-titulo");
    const logo = s.getByRole("img", { name: "Holcim", exact: true });
    expect((await logo.boundingBox())!.height).toBeCloseTo(34, 0);
    await expect(logo.locator("..")).toHaveCSS("background-color", C.marino);
    const card = s.locator("h3").locator("..");
    await expect(card).toHaveCSS("background-color", C.concreto);
    await expect(card).toHaveCSS("border-top-left-radius", "20px");
    // Dos columnas lado a lado a 1440.
    const h2 = (await s.locator("h2").boundingBox())!;
    const cb = (await card.boundingBox())!;
    expect(cb.x).toBeGreaterThan(h2.x + 400);
    for (const li of await s.locator("ul").nth(1).locator("li").all()) {
      await expect(li).toHaveCSS("background-color", C.blanco);
      await expect(li).toHaveCSS("color", C.marino);
      await expect(li).toHaveCSS("font-weight", "700");
    }
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Por qué Los May (#9)", () => {
  test("copy de las 4 tarjetas", async ({ page }) => {
    await page.goto("/");
    const s = page.locator("section", {
      has: page.getByRole("heading", {
        name: "Material a tiempo, sin sorpresas.",
      }),
    });
    const titulos = await s
      .locator("h3")
      .evaluateAll((hs) =>
        hs.map((h) => h.textContent!.replace(/\s+/g, " ").trim()),
      );
    expect(titulos).toEqual([
      "2 Sucursales",
      "Existencia al momento",
      "Todo por escrito",
      "Crédito a empresas",
    ]);
    await expect(s).toContainText(
      "Santa Rosalía y Santa Isabel, en Ciudad del Carmen.",
    );
    await expect(s).toContainText(
      "Inventario en tiempo real: te confirmamos disponibilidad al instante.",
    );
    await expect(s).toContainText("Cotización clara desde el principio.");
    await expect(s).toContainText("[Confirmar]");
  });

  test("cifra roja Condensed 48px, títulos 22px marino, tarjetas blancas radio 16", async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const s = page.locator("section", {
      has: page.getByRole("heading", {
        name: "Material a tiempo, sin sorpresas.",
      }),
    });
    const cifra = s.getByText("2", { exact: true });
    await expect(cifra).toHaveCSS("font-size", "48px");
    await expect(cifra).toHaveCSS("color", C.rojo);
    await expect(cifra).toHaveCSS("font-weight", "800");
    for (const h of await s.locator("h3").all()) {
      await expect(h).toHaveCSS("font-size", "22px");
      await expect(h).toHaveCSS("color", C.marino);
      const card = h.locator("..");
      await expect(card).toHaveCSS("background-color", C.blanco);
      await expect(card).toHaveCSS("border-top-left-radius", "16px");
    }
    // Íconos rojos de 40px.
    const iconos = s.locator("li svg");
    expect(await iconos.count()).toBe(3);
    for (const i of await iconos.all()) {
      expect((await i.boundingBox())!.width).toBeCloseTo(40, 0);
      await expect(i).toHaveCSS("color", C.rojo);
    }
    // 4 en fila a 1440.
    const ys = await s
      .locator("h3")
      .evaluateAll((hs) =>
        hs.map((h) => Math.round(h.parentElement!.getBoundingClientRect().top)),
      );
    expect(new Set(ys).size).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Sucursales (#9)", () => {
  const ESPERADO = [
    {
      nombre: "Santa Rosalía",
      direccion: "Corregidora 8, Santa Rosalía, 24197 Cd. del Carmen, Camp.",
      tel: "938 108 2953",
      telHref: "tel:+529381082953",
      horarios: [
        ["Lunes a viernes", "7:00 a 18:00"],
        ["Sábado", "8:00 a 15:00"],
        ["Domingo", "8:00 a 13:00"],
      ],
      maps: "Corregidora 8, Santa Rosalía, 24197 Ciudad del Carmen, Campeche",
    },
    {
      nombre: "Santa Isabel",
      direccion:
        "Av. Puerto de Campeche, Volcanes, 24150 Cd. del Carmen, Camp.",
      tel: "938 132 6244",
      telHref: "tel:+529381326244",
      horarios: [
        ["Lunes a viernes", "7:30 a 18:00"],
        ["Sábado", "7:30 a 15:00"],
        ["Domingo", "Cerrado"],
      ],
      maps: "Av. Puerto de Campeche, Volcanes, 24150 Ciudad del Carmen, Campeche",
    },
  ];

  test("tarjetas con nombre, dirección, horarios, tel: y Maps", async ({
    page,
  }) => {
    await page.goto("/");
    const s = page.locator("#sucursales");
    await expect(s.locator("h3")).toHaveText(ESPERADO.map((e) => e.nombre));
    for (const [i, e] of ESPERADO.entries()) {
      const card = s.locator("h3").nth(i).locator("..");
      await expect(card).toContainText(e.direccion);
      const pares = await card
        .locator("dl > div")
        .evaluateAll((ds) =>
          ds.map((d) => [
            d.querySelector("dt")!.textContent!.trim(),
            d.querySelector("dd")!.textContent!.trim(),
          ]),
        );
      expect(pares).toEqual(e.horarios);

      const tel = card.locator("a[href^='tel:']");
      await expect(tel).toHaveAttribute("href", e.telHref);
      expect(await texto(tel)).toBe(e.tel);
      await expect(tel).not.toHaveAttribute("target", "_blank");

      const maps = card.locator("a[href*='google.com/maps']");
      expect(await texto(maps)).toBe("Cómo llegar");
      const url = new URL((await maps.getAttribute("href"))!);
      expect(url.origin + url.pathname).toBe(
        "https://www.google.com/maps/search/",
      );
      expect(url.searchParams.get("api")).toBe("1");
      expect(url.searchParams.get("query")).toBe(e.maps);
      await expect(maps).toHaveAttribute("target", "_blank");
      await expect(maps).toHaveAttribute("rel", /noopener/);
    }
    expect(sucursales.map((x) => x.nombre)).toEqual(
      ESPERADO.map((e) => e.nombre),
    );
  });

  test("diseño de la tarjeta: concreto radio 20, nombre 32px, botones de 48px", async ({
    page,
  }) => {
    for (const viewport of [MOVIL, ESCRITORIO]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const s = page.locator("#sucursales");
      for (const h of await s.locator("h3").all()) {
        await expect(h).toHaveCSS("font-size", "32px");
        await expect(h).toHaveCSS("font-weight", "800");
        await expect(h).toHaveCSS("color", C.marino);
        const card = h.locator("..");
        await expect(card).toHaveCSS("background-color", C.concreto);
        await expect(card).toHaveCSS("border-top-left-radius", "20px");
        await expect(card.locator("dl")).toHaveCSS(
          "background-color",
          C.blanco,
        );
        const tel = card.locator("a[href^='tel:']");
        const maps = card.locator("a[href*='google.com/maps']");
        await expect(tel).toHaveCSS("background-color", C.marino);
        await expect(maps).toHaveCSS("border-top-color", C.marino);
        await expect(maps).toHaveCSS("border-top-width", "2px");
        const bt = (await tel.boundingBox())!;
        const bm = (await maps.boundingBox())!;
        expect(bt.height).toBeGreaterThanOrEqual(48);
        expect(bm.height).toBeGreaterThanOrEqual(48);
        // flex: 1 1 0 → casi el mismo ancho (el borde de 2px del outline
        // suma 4px, igual que en el diseño).
        expect(
          Math.abs(bt.width - bm.width),
          `anchos a ${viewport.width}px`,
        ).toBeLessThanOrEqual(5);
        // El teléfono cabe en un renglón.
        expect(bt.height).toBeLessThan(60);
      }
      // Dos columnas en escritorio, apiladas en móvil.
      const ys = await s
        .locator("h3")
        .evaluateAll((hs) =>
          hs.map((h) => Math.round(h.getBoundingClientRect().top)),
        );
      expect(new Set(ys).size).toBe(viewport.width >= 760 ? 1 : 2);
    }
  });

  test("320px: las tarjetas caben y el teléfono no se corta", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/");
    for (const tel of await page.locator("#sucursales a[href^='tel:']").all()) {
      const desborda = await tel.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 1,
      );
      expect(desborda).toBe(false);
      const caja = (await tel.boundingBox())!;
      expect(caja.x + caja.width).toBeLessThanOrEqual(320);
    }
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Preguntas frecuentes (#10)", () => {
  const FAQ = [
    [
      "¿Desde cuánto es mayoreo?",
      "Desde 16 toneladas. Para cantidades menores te atendemos en cualquiera de nuestras dos sucursales.",
    ],
    [
      "¿Entregan en obra?",
      "Sí, en Ciudad del Carmen. Fuera de la ciudad: [zonas].",
    ],
    ["¿Facturan?", "[Confirmar: factura CFDI con tu RFC]"],
    [
      "¿Qué formas de pago aceptan?",
      "[Efectivo, transferencia, tarjeta: confirmar]",
    ],
    [
      "¿Manejan crédito?",
      "[Confirmar: crédito para empresas y clientes recurrentes]",
    ],
    [
      "¿Puedo programar entregas por etapa?",
      "Sí. Dinos el total de tu obra y acordamos entregas según el avance.",
    ],
  ];

  test("6 preguntas con <details>/<summary> nativos y el copy del diseño", async ({
    page,
  }) => {
    await page.goto("/");
    const s = page.locator("#preguntas");
    const details = s.locator("details");
    await expect(details).toHaveCount(6);
    for (const [i, [p, r]] of FAQ.entries()) {
      const d = details.nth(i);
      await expect(d.locator("summary")).toHaveText(
        new RegExp(`^\\s*${p.replace(/[?¿]/g, "\\$&")}\\s*[+−]*\\s*$`),
      );
      await d.locator("summary").click();
      expect(await texto(d.locator("p"))).toBe(r);
    }
  });

  test("contenedor de 880px centrado", async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto("/");
    const cont = page
      .locator("#preguntas h2")
      .locator("xpath=ancestor::div[1]/..");
    const b = (await cont.boundingBox())!;
    expect(b.width).toBeCloseTo(880, 0);
    expect(b.x).toBeCloseTo((1440 - 880) / 2, 0);
  });

  test("summary: 64px mínimo, 18px bold marino, sin marcador nativo, + rojo que cambia a −", async ({
    page,
  }) => {
    await page.goto("/");
    const d = page.locator("#preguntas details").first();
    const summary = d.locator("summary");
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(64);
    await expect(summary).toHaveCSS("font-size", "18px");
    await expect(summary).toHaveCSS("font-weight", "700");
    await expect(summary).toHaveCSS("color", C.marino);
    await expect(summary).toHaveCSS("list-style-type", "none");
    await expect(summary).toHaveCSS("cursor", "pointer");
    const marcador = await summary.evaluate(
      (el) => getComputedStyle(el, "::marker").content,
    );
    expect(["none", "normal", '""']).toContain(marcador);
    expect(await css(summary, "display")).toBe("flex");

    const indicador = summary.locator("[aria-hidden='true']").first();
    await expect(indicador).toHaveCSS("color", C.rojo);
    await expect(indicador).toHaveCSS("font-size", "26px");
    expect((await indicador.innerText()).trim()).toBe("+");
    await summary.click();
    await expect(d).toHaveAttribute("open", "");
    expect((await indicador.innerText()).trim()).toMatch(/^[−-]$/);
    await expect(d).toHaveCSS("border-bottom-color", C.borde);
  });

  test("se abre y cierra con Enter y Espacio, y el foco se ve", async ({
    page,
  }) => {
    await page.goto("/");
    const d = page.locator("#preguntas details").nth(1);
    const summary = d.locator("summary");
    await summary.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(summary).toBeFocused();
    expect(await css(summary, "outline-style")).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(d).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(d).not.toHaveAttribute("open", "");
    // Rol de botón expandible para lectores de pantalla.
    const snap = await page.locator("#preguntas").ariaSnapshot();
    expect(snap).toContain("¿Entregan en obra?");
  });

  test("JSON-LD FAQPage válido, solo con respuestas confirmadas", async ({
    page,
  }) => {
    await page.goto("/");
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const faq = scripts
      .map((t) => JSON.parse(t))
      .find((j) => j["@type"] === "FAQPage");
    expect(faq).toBeTruthy();
    expect(faq["@context"]).toBe("https://schema.org");
    const preguntas = faq.mainEntity.map(
      (q: { name: string; acceptedAnswer: { text: string } }) => [
        q.name,
        q.acceptedAnswer.text,
      ],
    );
    expect(preguntas).toEqual([FAQ[0], FAQ[5]]);
    for (const q of faq.mainEntity) {
      expect(q["@type"]).toBe("Question");
      expect(q.acceptedAnswer["@type"]).toBe("Answer");
      expect(q.acceptedAnswer.text).not.toMatch(/\[/);
    }
  });
});

/* -------------------------------------------------------------------------- */

test.describe("CTA final (#10)", () => {
  test("copy, borde rojo de 6px y botones", async ({ page }) => {
    await page.goto("/");
    const s = seccion(page, "cta-titulo");
    await expect(s.locator("h2")).toHaveText("¿Cuántas toneladas necesitas?");
    await expect(s).toContainText(
      "Mándanos tu pedido y te respondemos con cotización y fecha de entrega.",
    );
    await expect(s).toHaveCSS("border-top-width", "6px");
    await expect(s).toHaveCSS("border-top-color", C.rojo);
    const wa = s.getByRole("link", { name: "Cotizar por WhatsApp" });
    const w = leerWhatsApp((await wa.getAttribute("href"))!);
    expect(w.numero).toBe(WHATSAPP);
    expect(w.texto).toBe(mensajes.mayoreo);
    expect(w.texto).toBe(
      "Hola Los May, quiero cotizar cemento Holcim por mayoreo (desde 16 toneladas).",
    );
    await expect(wa).toHaveAttribute("target", "_blank");
    await expect(
      s.getByRole("link", { name: "Ver opciones de pedido" }),
    ).toHaveAttribute("href", "#pedido");
    for (const b of [
      wa,
      s.getByRole("link", { name: "Ver opciones de pedido" }),
    ]) {
      expect((await b.boundingBox())!.height).toBeCloseTo(56, 0);
      await expect(b).toHaveCSS("border-top-left-radius", "12px");
    }
  });

  for (const ancho of [390, 1440, 1920]) {
    test(`titular clamp(40px, 5.6cqi, 80px) a ${ancho}px y botones de máx. 420px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const w = await anchoUtil(page);
      const h2 = page.locator("#cta-titulo");
      expect(parseFloat(await css(h2, "font-size"))).toBeCloseTo(
        clamp(40, 5.6, 80, w),
        0,
      );
      expect(
        parseFloat(await css(h2, "line-height")) /
          parseFloat(await css(h2, "font-size")),
      ).toBeCloseTo(0.92, 2);
      const wa = seccion(page, "cta-titulo").getByRole("link", {
        name: "Cotizar por WhatsApp",
      });
      expect((await wa.boundingBox())!.width).toBeLessThanOrEqual(420.5);
    });
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Datos por confirmar", () => {
  test("todos los textos entre corchetes se ven resaltados en amarillo", async ({
    page,
  }) => {
    await page.goto("/");
    // Abre las FAQ para que los pendientes sean visibles.
    await page
      .locator("#preguntas details")
      .evaluateAll((ds) =>
        ds.forEach((d) => ((d as HTMLDetailsElement).open = true)),
      );
    const pendientes = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.querySelector("main")!,
        NodeFilter.SHOW_TEXT,
      );
      const res: { texto: string; fondo: string; color: string }[] = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n.textContent ?? "";
        if (!/\[[^\]]+\]/.test(t)) continue;
        const el = n.parentElement!;
        if (el.closest("script")) continue;
        const cs = getComputedStyle(el);
        res.push({
          texto: t.trim(),
          fondo: cs.backgroundColor,
          color: cs.color,
        });
      }
      return res;
    });
    expect(pendientes.map((p) => p.texto).sort()).toEqual(
      [
        "[zonas cercanas]",
        "[confirmar con Los May]",
        "[Confirmar]",
        "[zonas]",
        "[Confirmar: factura CFDI con tu RFC]",
        "[Efectivo, transferencia, tarjeta: confirmar]",
        "[Confirmar: crédito para empresas y clientes recurrentes]",
      ].sort(),
    );
    for (const p of pendientes) {
      expect(p.fondo, p.texto).toBe(C.pendiente);
      expect(p.color, p.texto).toBe(C.pendienteTexto);
    }
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Anchors dentro de las secciones", () => {
  const casos = [
    ["hero-titulo", "Ver sucursales", "#sucursales"],
    ["hero-titulo", "Pedir mayoreo", "#pedido"],
    ["ped-titulo", "Ver sucursales", "#sucursales"],
    ["cta-titulo", "Ver opciones de pedido", "#pedido"],
  ] as const;

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`llevan a la sección sin que el header la tape a ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const [id, nombre, destino] of casos) {
        await page.goto("/");
        await seccion(page, id).getByRole("link", { name: nombre }).click();
        await expect(page).toHaveURL(new RegExp(`${destino}$`));
        const header = (await page.getByRole("banner").boundingBox())!;
        const top = await page
          .locator(destino)
          .evaluate((el) => el.getBoundingClientRect().top);
        expect(top, `${nombre} → ${destino}`).toBeGreaterThanOrEqual(
          header.y + header.height - 1,
        );
        expect(top, `${nombre} → ${destino}`).toBeLessThanOrEqual(
          header.y + header.height + 2,
        );
      }
    });
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Sin desbordes por sección", () => {
  for (const ancho of ANCHOS) {
    test(`ningún texto se corta ni se sale de su caja a ${ancho}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const problemas = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            "main a, main h1, main h2, main h3, main p, main dd, main dt, main li, main summary",
          ),
        ]
          .filter((el) => {
            const cs = getComputedStyle(el);
            if (cs.overflowX !== "visible") return false;
            return el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
          })
          .map(
            (el) =>
              `${el.tagName.toLowerCase()}: ${(el.textContent ?? "").trim().slice(0, 40)} (${el.scrollWidth} > ${el.clientWidth})`,
          ),
      );
      expect(problemas).toEqual([]);
    });
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Carga completa de la página", () => {
  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`al bajar hasta el final cargan todas las imágenes, sin errores, a ${viewport.width}px`, async ({
      page,
    }) => {
      const errores: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning")
          errores.push(m.text());
      });
      page.on("pageerror", (e) => errores.push(String(e)));
      page.on("requestfailed", (r) =>
        errores.push(`${r.url()} (${r.failure()?.errorText})`),
      );
      page.on("response", (r) => {
        if (r.status() >= 400) errores.push(`${r.url()} (${r.status()})`);
      });
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      // Baja poco a poco para disparar las imágenes con loading="lazy".
      const alto = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      for (let y = 0; y < alto; y += 600) {
        await page.evaluate(
          (top) => window.scrollTo({ top, behavior: "instant" }),
          y,
        );
        await page.waitForTimeout(50);
      }
      await page
        .locator("#preguntas details")
        .evaluateAll((ds) =>
          ds.forEach((d) => ((d as HTMLDetailsElement).open = true)),
        );
      await page.waitForLoadState("networkidle");
      const rotas = await page.evaluate(() =>
        [...document.images]
          .filter((i) => !i.complete || i.naturalWidth === 0)
          .map((i) => i.currentSrc || i.src),
      );
      expect(rotas).toEqual([]);
      expect(errores).toEqual([]);
    });
  }

  test("el LCP en móvil es la foto del hero", async ({ page }) => {
    await page.setViewportSize(MOVIL);
    await page.goto("/", { waitUntil: "networkidle" });
    const lcp = await page.evaluate(
      () =>
        new Promise<string>((res) => {
          new PerformanceObserver((lista) => {
            const e = lista.getEntries().at(-1) as PerformanceEntry & {
              element?: Element;
            };
            res(e.element?.getAttribute("alt") ?? e.element?.tagName ?? "");
          }).observe({ type: "largest-contentful-paint", buffered: true });
        }),
    );
    expect(lcp).toMatch(/^Bulto de cemento Holcim/);
  });
});

test.describe("Accesibilidad de las secciones", () => {
  test("jerarquía de titulares sin saltos (h1 → h2 → h3)", async ({ page }) => {
    await page.goto("/");
    const niveles = await page.evaluate(() =>
      [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map(
        (h) => Number(h.tagName[1]),
      ),
    );
    expect(niveles[0]).toBe(1);
    for (let i = 1; i < niveles.length; i++) {
      expect(niveles[i] - niveles[i - 1], `titular ${i}`).toBeLessThanOrEqual(
        1,
      );
    }
  });

  test("los <summary> de la FAQ miden 44px o más (touch target) a 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/");
    for (const s of await page.locator("#preguntas summary").all()) {
      const b = (await s.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
  });

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`contraste del texto de las secciones (4.5:1, 3:1 en texto grande) a ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page
        .locator("#preguntas details")
        .evaluateAll((ds) =>
          ds.forEach((d) => ((d as HTMLDetailsElement).open = true)),
        );
      const fallas = await page.evaluate(() => {
        const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
        const lum = ([r, g, b]: number[]) => {
          const f = (v: number) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const fondo = (el: Element | null): number[] | null => {
          for (let e = el; e; e = e.parentElement) {
            const c = parse(getComputedStyle(e).backgroundColor);
            if (c.length === 3 || (c.length === 4 && c[3] === 1))
              return c.slice(0, 3);
            if (c.length === 4 && c[3] > 0) return null; // semitransparente: no se mide
          }
          return [255, 255, 255];
        };
        const res: string[] = [];
        const walker = document.createTreeWalker(
          document.querySelector("main")!,
          NodeFilter.SHOW_TEXT,
        );
        const vistos = new Set<Element>();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.trim()) continue;
          const el = n.parentElement!;
          if (vistos.has(el) || el.closest("script,[aria-hidden='true']"))
            continue;
          vistos.add(el);
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          const cs = getComputedStyle(el);
          const bg = fondo(el);
          if (!bg) continue;
          const fg = parse(cs.color).slice(0, 3);
          const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
          const ratio = (a + 0.05) / (b + 0.05);
          const size = parseFloat(cs.fontSize);
          const grande =
            size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
          if (ratio < (grande ? 3 : 4.5)) {
            res.push(
              `${el.textContent!.trim().slice(0, 30)}: ${ratio.toFixed(2)} (${cs.color} sobre rgb(${bg}))`,
            );
          }
        }
        return res;
      });
      expect(fallas).toEqual([]);
    });
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Analytics: atributos data-track (#12)", () => {
  test("WhatsApp del hero y del CTA, llamar y cómo llegar", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      seccion(page, "hero-titulo").locator("a[href*='wa.me']"),
    ).toHaveAttribute("data-ubicacion", "hero");
    await expect(
      seccion(page, "cta-titulo").locator("a[href*='wa.me']"),
    ).toHaveAttribute("data-ubicacion", "cta_final");
    for (const s of ["hero-titulo", "cta-titulo"]) {
      await expect(
        seccion(page, s).locator("a[href*='wa.me']"),
      ).toHaveAttribute("data-track", "click_whatsapp");
    }
    const suc = page.locator("#sucursales");
    const tels = suc.locator("a[href^='tel:']");
    const maps = suc.locator("a[href*='google.com/maps']");
    await expect(tels).toHaveCount(2);
    await expect(maps).toHaveCount(2);
    for (const [i, slug] of ["santa_rosalia", "santa_isabel"].entries()) {
      await expect(tels.nth(i)).toHaveAttribute("data-track", "click_llamar");
      await expect(tels.nth(i)).toHaveAttribute("data-sucursal", slug);
      await expect(tels.nth(i)).toHaveAttribute("data-ubicacion", "sucursales");
      await expect(maps.nth(i)).toHaveAttribute(
        "data-track",
        "click_como_llegar",
      );
      await expect(maps.nth(i)).toHaveAttribute("data-sucursal", slug);
    }
  });
});

test("listas sin viñetas conservan role=list (Safari/VoiceOver)", async ({
  page,
}) => {
  await page.goto("/");
  const sinRol = await page.evaluate(() =>
    [...document.querySelectorAll("main ul, main ol")]
      .filter(
        (l) =>
          getComputedStyle(l).listStyleType === "none" &&
          l.getAttribute("role") !== "list",
      )
      .map((l) => l.closest("section")?.id || l.className),
  );
  expect(sinRol).toEqual([]);
});

test.describe("Hero · franja roja del titular", () => {
  // Con line-height 0.9, un fondo inline normal cubre ~1.2em y tapaba la
  // parte baja de "CONSTRUYE". La franja debe empezar dentro del renglón de
  // "Los May.", nunca encima del anterior.
  for (const width of [320, 390, 768, 1440]) {
    test(`no invade el renglón anterior a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const medida = await page
        .locator("#hero-titulo .franja-roja")
        .evaluate((el) => {
          const estilo = getComputedStyle(el);
          const em = parseFloat(estilo.fontSize);
          const alto = parseFloat(
            getComputedStyle(el.parentElement!).lineHeight,
          );
          const primera = el.getClientRects()[0];
          // Tope de la caja de línea del renglón de la franja.
          const topeLinea = primera.top + (primera.height - alto) / 2;
          const topeFranja = primera.top + 0.2 * em;
          return {
            fondoPlano: estilo.backgroundColor,
            degradado: estilo.backgroundImage,
            margen: topeFranja - topeLinea,
          };
        });
      expect(medida.fondoPlano).toBe("rgba(0, 0, 0, 0)");
      expect(medida.degradado).toContain("linear-gradient");
      expect(medida.margen).toBeGreaterThanOrEqual(0);
    });
  }
});
