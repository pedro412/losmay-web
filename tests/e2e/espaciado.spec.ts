import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Fase 2 · QA ronda 2: medidas internas de cada sección contra
 * docs/design/Main.dc.html (márgenes, gaps, paddings, radios e
 * interlineados). Las pruebas de secciones.spec.ts ya cubren copy, colores y
 * tamaños de letra; aquí se mide el ritmo vertical y horizontal de adentro de
 * cada bloque, que es lo que hace que la página "se vea" como el diseño.
 *
 * Se usa `expect.soft` para que una sola corrida liste todas las diferencias.
 */

/** clamp(min, vw * ancho / 100, max): cqi del diseño = ancho del viewport. */
const clamp = (min: number, vw: number, max: number, ancho: number) =>
  Math.min(max, Math.max(min, (vw * ancho) / 100));

const ANCHOS_MEDIDAS = [390, 1440] as const;

type Estilos = Record<string, string>;

/** Propiedades calculadas de un elemento, en px. */
async function estilos(loc: Locator, props: string[]): Promise<Estilos> {
  return loc.evaluate((el, ps) => {
    const cs = getComputedStyle(el);
    const out: Record<string, string> = {};
    for (const p of ps) out[p] = cs.getPropertyValue(p);
    return out;
  }, props);
}

/** Compara px con tolerancia de medio pixel. */
function px(actual: string, esperado: number, etiqueta: string) {
  const valor = parseFloat(actual);
  expect
    .soft(
      Math.abs(valor - esperado),
      `${etiqueta}: ${actual} (diseño ${esperado}px)`,
    )
    .toBeLessThanOrEqual(0.5);
}

/** Distancia vertical entre el borde inferior de `a` y el superior de `b`. */
async function separacion(a: Locator, b: Locator) {
  const ra = await a.boundingBox();
  const rb = await b.boundingBox();
  if (!ra || !rb) throw new Error("Elemento sin caja");
  return rb.y - (ra.y + ra.height);
}

async function abrir(page: Page, ancho: number) {
  await page.setViewportSize({ width: ancho, height: 900 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
}

for (const ancho of ANCHOS_MEDIDAS) {
  test.describe(`Medidas internas a ${ancho}px`, () => {
    test.beforeEach(async ({ page }) => {
      await abrir(page, ancho);
    });

    test("hero: márgenes, gaps, sello y card de campaña", async ({ page }) => {
      const hero = page.locator("main > section").first();
      const s = await estilos(hero, ["padding-top", "padding-left"]);
      px(
        s["padding-top"],
        clamp(40, 7, 104, ancho),
        "padding vertical del hero",
      );
      px(
        s["padding-left"],
        clamp(20, 5, 80, ancho),
        "padding lateral del hero",
      );

      const fila = hero.locator(":scope > div");
      px(
        (await estilos(fila, ["column-gap"]))["column-gap"],
        clamp(32, 5, 80, ancho),
        "gap de columnas",
      );

      const eyebrow = hero.locator("p").first();
      px(
        (await estilos(eyebrow, ["column-gap"]))["column-gap"],
        10,
        "gap del cuadrito del eyebrow",
      );
      const h1 = page.locator("h1");
      px(
        (await estilos(h1, ["margin-top"]))["margin-top"],
        16,
        "margin-top del h1",
      );
      const parrafo = h1.locator("xpath=following-sibling::p[1]");
      px(
        (await estilos(parrafo, ["margin-top"]))["margin-top"],
        20,
        "margin-top del párrafo",
      );
      const botones = parrafo.locator("xpath=following-sibling::div[1]");
      const b = await estilos(botones, ["margin-top", "column-gap", "row-gap"]);
      px(b["margin-top"], 28, "margin-top de los botones");
      px(b["column-gap"], 12, "gap entre botones");
      px(b["row-gap"], 12, "gap vertical entre botones");

      const sello = botones.locator("xpath=following-sibling::div[1]");
      const se = await estilos(sello, [
        "margin-top",
        "column-gap",
        "padding-top",
        "padding-left",
        "border-top-width",
        "border-top-left-radius",
      ]);
      px(se["margin-top"], 28, "margin-top del sello");
      px(se["column-gap"], 16, "gap del sello");
      px(se["padding-top"], 14, "padding vertical del sello");
      px(se["padding-left"], 18, "padding lateral del sello");
      px(se["border-top-width"], 1.5, "borde del sello");
      px(se["border-top-left-radius"], 14, "radio del sello");

      const foto = hero.locator("picture img, img[fetchpriority]").first();
      px(
        (await estilos(foto, ["border-top-left-radius"]))[
          "border-top-left-radius"
        ],
        16,
        "radio de la foto",
      );

      const card = hero.getByText("Campaña de mayoreo").locator("xpath=../..");
      const c = await estilos(card, [
        "left",
        "right",
        "bottom",
        "row-gap",
        "padding-top",
        "padding-left",
        "padding-bottom",
        "border-top-left-radius",
      ]);
      px(c.left, 12, "card: left");
      px(c.right, 12, "card: right");
      px(c.bottom, 12, "card: bottom");
      px(c["row-gap"], 12, "card: gap");
      px(c["padding-top"], 16, "card: padding-top");
      px(c["padding-left"], 18, "card: padding lateral");
      px(c["padding-bottom"], 18, "card: padding-bottom");
      px(c["border-top-left-radius"], 14, "card: radio");

      const pill = hero.getByText("Desde 16 t");
      const pi = await estilos(pill, ["padding-top", "padding-left"]);
      px(pi["padding-top"], 5, "pill: padding vertical");
      px(pi["padding-left"], 10, "pill: padding lateral");

      const pedir = card.getByRole("link", { name: "Pedir mayoreo" });
      const pe = await estilos(pedir, [
        "min-height",
        "border-top-left-radius",
        "column-gap",
      ]);
      px(pe["min-height"], 48, "Pedir mayoreo: alto mínimo");
      px(pe["border-top-left-radius"], 10, "Pedir mayoreo: radio");
      px(pe["column-gap"], 8, "Pedir mayoreo: gap con la flecha");
    });

    test("para quién es: carril y tarjetas", async ({ page }) => {
      const carril = page.getByRole("region", { name: "Tipos de cliente" });
      const s = await estilos(carril, [
        "margin-top",
        "column-gap",
        "padding-bottom",
      ]);
      px(s["margin-top"], 32, "margin-top del carril");
      px(s["column-gap"], 12, "gap entre tarjetas");
      px(s["padding-bottom"], 8, "padding-bottom del carril");

      const tarjeta = carril.locator("article").first();
      const t = await estilos(tarjeta, [
        "padding-top",
        "padding-left",
        "row-gap",
        "border-top-left-radius",
        "border-top-width",
      ]);
      px(t["padding-top"], 24, "tarjeta: padding");
      px(t["padding-left"], 24, "tarjeta: padding lateral");
      px(t["row-gap"], 12, "tarjeta: gap");
      px(t["border-top-left-radius"], 14, "tarjeta: radio");
      px(t["border-top-width"], 1, "tarjeta: borde");

      const icono = tarjeta.locator(":scope > div").first();
      const i = await estilos(icono, [
        "width",
        "height",
        "border-top-left-radius",
      ]);
      px(i.width, 48, "cuadro del ícono: ancho");
      px(i.height, 48, "cuadro del ícono: alto");
      px(i["border-top-left-radius"], 12, "cuadro del ícono: radio");
      const svg = await icono.locator("svg").boundingBox();
      expect.soft(svg?.width, "ícono de 24px").toBeCloseTo(24, 0);
    });

    test("pedido: intro, cuadrícula, tarjeta e interlineado del detalle", async ({
      page,
    }) => {
      const pedido = page.locator("#pedido");
      const intro = pedido.getByText("Elige cuántas toneladas necesitas", {
        exact: false,
      });
      const ii = await estilos(intro, [
        "margin-top",
        "max-width",
        "line-height",
        "font-size",
      ]);
      px(ii["margin-top"], 14, "intro: margin-top");
      px(ii["max-width"], 560, "intro: ancho máximo");

      const grid = pedido.locator("ul").first();
      const g = await estilos(grid, ["margin-top", "column-gap", "row-gap"]);
      px(g["margin-top"], 28, "cuadrícula: margin-top");
      px(g["column-gap"], 10, "cuadrícula: gap");
      px(g["row-gap"], 10, "cuadrícula: gap vertical");

      const tarjeta = grid.getByRole("link").first();
      const t = await estilos(tarjeta, [
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "column-gap",
        "border-top-left-radius",
      ]);
      px(t["padding-top"], 16, "tarjeta: padding-top");
      px(t["padding-right"], 16, "tarjeta: padding-right");
      px(t["padding-bottom"], 16, "tarjeta: padding-bottom");
      px(t["padding-left"], 20, "tarjeta: padding-left");
      px(t["column-gap"], 16, "tarjeta: gap");

      const titulo = tarjeta.locator("[id$='-titulo']");
      px(
        (await estilos(titulo, ["line-height"]))["line-height"],
        24,
        "título: interlineado",
      );
      px(
        (await estilos(titulo.locator(".."), ["row-gap"]))["row-gap"],
        2,
        "gap entre título y detalle",
      );

      const banner = pedido.getByText("¿Menos de 16 t?").locator("xpath=../..");
      const bn = await estilos(banner, [
        "margin-top",
        "padding-top",
        "padding-left",
        "row-gap",
        "column-gap",
      ]);
      px(bn["margin-top"], 20, "banner: margin-top");
      px(bn["padding-top"], 18, "banner: padding vertical");
      px(bn["padding-left"], 20, "banner: padding lateral");
      px(bn["row-gap"], 12, "banner: gap vertical");
      px(bn["column-gap"], 24, "banner: gap horizontal");
      const boton = banner.getByRole("link", { name: "Ver sucursales" });
      const bo = await estilos(boton, [
        "padding-left",
        "min-height",
        "border-top-width",
      ]);
      px(bo["padding-left"], 18, "Ver sucursales: padding lateral");
      px(bo["border-top-width"], 2, "Ver sucursales: borde");
    });

    test("entregas: cuadrícula, pasos y cierre", async ({ page }) => {
      const entregas = page.locator("#entregas");
      const lista = entregas.locator("ol");
      const l = await estilos(lista, ["margin-top", "row-gap", "column-gap"]);
      px(l["margin-top"], 32, "pasos: margin-top");
      px(l["row-gap"], 12, "pasos: gap vertical");
      px(l["column-gap"], 32, "pasos: gap horizontal");

      const paso = lista.locator("li").first();
      const p = await estilos(paso, [
        "column-gap",
        "padding-top",
        "border-top-width",
      ]);
      px(p["column-gap"], 18, "paso: gap número-texto");
      px(p["padding-top"], 20, "paso: padding-top");
      px(p["border-top-width"], 3, "paso: borde rojo");
      px(
        (await estilos(paso.locator(":scope > span"), ["width"]))["width"],
        56,
        "número: ancho",
      );
      px(
        (await estilos(paso.locator("p"), ["margin-top"]))["margin-top"],
        8,
        "texto del paso: margin-top",
      );

      const cierre = entregas.getByText("Tu proyecto, nuestra prioridad");
      const c = await estilos(cierre, [
        "margin-top",
        "font-size",
        "letter-spacing",
      ]);
      px(c["margin-top"], 32, "cierre: margin-top");
      px(c["font-size"], 22, "cierre: tamaño");
      px(c["letter-spacing"], 0.88, "cierre: tracking 0.04em");
    });

    test("el cemento: columnas, sello, ficha, chips y tarjeta", async ({
      page,
    }) => {
      const sec = page.locator("section[aria-labelledby='prod-titulo']");
      const fila = sec.locator(":scope > div");
      const f = await estilos(fila, ["row-gap", "column-gap"]);
      px(f["row-gap"], 32, "columnas: gap vertical");
      px(f["column-gap"], clamp(40, 6, 96, ancho), "columnas: gap horizontal");

      const sello = sec.locator("img[alt='Holcim']").locator("..");
      const se = await estilos(sello, [
        "margin-top",
        "padding-top",
        "padding-left",
        "column-gap",
        "border-top-left-radius",
      ]);
      px(se["margin-top"], 20, "sello: margin-top");
      px(se["padding-top"], 16, "sello: padding vertical");
      px(se["padding-left"], 20, "sello: padding lateral");
      px(se["column-gap"], 16, "sello: gap");
      px(se["border-top-left-radius"], 14, "sello: radio");

      const desc = sec.getByText("Cemento Portland gris para obra general", {
        exact: false,
      });
      const d = await estilos(desc, ["margin-top", "max-width"]);
      px(d["margin-top"], 20, "descripción: margin-top");
      px(d["max-width"], 520, "descripción: ancho máximo");

      const dl = sec.locator("dl");
      px(
        (await estilos(dl, ["margin-top"]))["margin-top"],
        24,
        "ficha: margin-top",
      );
      const celdas = dl.locator(":scope > div");
      const c0 = await estilos(celdas.nth(0), [
        "padding-top",
        "padding-right",
        "padding-bottom",
      ]);
      const c1 = await estilos(celdas.nth(1), ["padding-top", "padding-right"]);
      px(c0["padding-top"], 14, "celda: padding-top");
      px(c0["padding-bottom"], 14, "celda: padding-bottom");
      px(c0["padding-right"], 12, "celda izquierda: padding-right");
      px(c1["padding-right"], 0, "celda derecha: padding-right");
      px(
        (await estilos(dl.locator("dd").first(), ["margin-top"]))["margin-top"],
        4,
        "dd: margin-top",
      );

      const chips = sec.locator("ul").first();
      const ch = await estilos(chips, ["margin-top", "column-gap"]);
      px(ch["margin-top"], 20, "chips: margin-top");
      px(ch["column-gap"], 8, "chips: gap");
      const chip = await estilos(chips.locator("li").first(), [
        "padding-top",
        "padding-left",
      ]);
      px(chip["padding-top"], 6, "chip: padding vertical");
      px(chip["padding-left"], 14, "chip: padding lateral");

      const tarjeta = sec
        .getByRole("heading", { name: "También en Los May" })
        .locator("..");
      const t = await estilos(tarjeta, [
        "padding-top",
        "row-gap",
        "border-top-left-radius",
      ]);
      px(t["padding-top"], clamp(22, 3, 40, ancho), "tarjeta: padding");
      px(t["row-gap"], 14, "tarjeta: gap");
      px(t["border-top-left-radius"], 20, "tarjeta: radio");
      const productos = tarjeta.locator("ul");
      px(
        (await estilos(productos, ["column-gap"]))["column-gap"],
        8,
        "productos: gap",
      );
      const prod = await estilos(productos.locator("li").first(), [
        "padding-top",
        "padding-left",
        "border-top-left-radius",
      ]);
      px(prod["padding-top"], 14, "producto: padding vertical");
      px(prod["padding-left"], 16, "producto: padding lateral");
      px(prod["border-top-left-radius"], 12, "producto: radio");
    });

    test("por qué Los May: cuadrícula y tarjetas", async ({ page }) => {
      const sec = page.locator("section[aria-labelledby='por-que-titulo']");
      const grid = sec.locator("ul");
      const g = await estilos(grid, ["margin-top", "column-gap"]);
      px(g["margin-top"], 32, "cuadrícula: margin-top");
      px(g["column-gap"], 10, "cuadrícula: gap");
      const tarjeta = grid.locator("li").nth(1);
      const t = await estilos(tarjeta, [
        "padding-top",
        "row-gap",
        "border-top-left-radius",
      ]);
      px(t["padding-top"], 20, "tarjeta: padding");
      px(t["row-gap"], 8, "tarjeta: gap");
      px(t["border-top-left-radius"], 16, "tarjeta: radio");
      const svg = await tarjeta.locator("svg").boundingBox();
      expect.soft(svg?.width, "ícono de 40px").toBeCloseTo(40, 0);
    });

    test("sucursales: cuadrícula, tarjeta, dirección, horarios y botones", async ({
      page,
    }) => {
      const sec = page.locator("#sucursales");
      const grid = sec.locator("ul").first();
      const g = await estilos(grid, ["margin-top", "column-gap"]);
      px(g["margin-top"], 32, "cuadrícula: margin-top");
      px(g["column-gap"], 12, "cuadrícula: gap");
      const tarjeta = grid.locator(":scope > li").first();
      const t = await estilos(tarjeta, [
        "padding-top",
        "row-gap",
        "border-top-left-radius",
      ]);
      px(t["padding-top"], 24, "tarjeta: padding");
      px(t["row-gap"], 16, "tarjeta: gap");
      px(t["border-top-left-radius"], 20, "tarjeta: radio");

      const dir = tarjeta.locator(":scope > p");
      px(
        (await estilos(dir, ["column-gap"]))["column-gap"],
        10,
        "dirección: gap con el pin",
      );
      const pin = dir.locator("svg");
      const pinCaja = await pin.boundingBox();
      expect.soft(pinCaja?.width, "pin de 20px").toBeCloseTo(20, 0);
      px(
        (await estilos(pin, ["margin-top"]))["margin-top"],
        2,
        "pin: margin-top",
      );

      const dl = tarjeta.locator("dl");
      const d = await estilos(dl, [
        "row-gap",
        "padding-top",
        "padding-left",
        "border-top-left-radius",
        "font-size",
      ]);
      px(d["row-gap"], 6, "horarios: gap");
      px(d["padding-top"], 14, "horarios: padding vertical");
      px(d["padding-left"], 16, "horarios: padding lateral");
      px(d["border-top-left-radius"], 12, "horarios: radio");
      px(d["font-size"], 15, "horarios: tamaño");

      const botones = tarjeta.locator(":scope > div").last();
      px(
        (await estilos(botones, ["column-gap"]))["column-gap"],
        8,
        "botones: gap",
      );
      const llamar = botones.getByRole("link").first();
      const ll = await estilos(llamar, [
        "border-top-left-radius",
        "column-gap",
        "font-size",
      ]);
      px(ll["border-top-left-radius"], 12, "Llamar: radio");
      px(ll["column-gap"], 8, "Llamar: gap con el ícono");
      px(ll["font-size"], 17, "Llamar: tamaño (hereda 17px)");
      // Con flex: 1 1 0 y box-sizing: border-box, el borde de 2px de «Cómo
      // llegar» no se puede encoger: en el diseño ese botón queda 4px más
      // ancho que «Llamar». Más que eso ya sería otra proporción.
      const anchoLlamar = (await llamar.boundingBox())!.width;
      const anchoMaps = (await botones.getByRole("link").last().boundingBox())!
        .width;
      expect
        .soft(
          Math.abs(anchoMaps - anchoLlamar),
          "Llamar y Cómo llegar casi del mismo ancho",
        )
        .toBeLessThanOrEqual(4.5);
    });

    test("preguntas: lista, summary y respuesta", async ({ page }) => {
      const sec = page.locator("#preguntas");
      const lista = sec.locator("details").first().locator("..");
      const l = await estilos(lista, [
        "margin-top",
        "border-top-width",
        "border-top-color",
      ]);
      px(l["margin-top"], 28, "lista: margin-top");
      px(l["border-top-width"], 1, "lista: borde superior");
      expect
        .soft(l["border-top-color"], "lista: borde #D6D1C9")
        .toBe("rgb(214, 209, 201)");

      const summary = sec.locator("summary").first();
      const s = await estilos(summary, ["column-gap", "min-height"]);
      px(s["column-gap"], 16, "summary: gap");
      px(s["min-height"], 64, "summary: alto mínimo");

      await summary.click();
      const resp = sec.locator("details").first().locator("p");
      const r = await estilos(resp, ["margin-top", "margin-bottom"]);
      px(r["margin-top"], 0, "respuesta: margin-top");
      px(r["margin-bottom"], 20, "respuesta: margin-bottom");
    });

    test("CTA final: padding, gaps y botones", async ({ page }) => {
      const sec = page.locator("section[aria-labelledby='cta-titulo']");
      const s = await estilos(sec, ["padding-top", "padding-left"]);
      px(s["padding-top"], clamp(48, 7, 104, ancho), "CTA: padding vertical");
      px(s["padding-left"], clamp(20, 5, 80, ancho), "CTA: padding lateral");
      const fila = sec.locator(":scope > div");
      const f = await estilos(fila, ["row-gap", "column-gap"]);
      px(f["row-gap"], 24, "CTA: gap vertical");
      px(f["column-gap"], 48, "CTA: gap horizontal");
      const p = sec.locator("p");
      const pp = await estilos(p, ["margin-top", "font-size"]);
      px(pp["margin-top"], 12, "CTA: margin-top del párrafo");
      px(pp["font-size"], 17, "CTA: tamaño del párrafo");
      const botones = sec.getByRole("link").first().locator("..");
      px(
        (await estilos(botones, ["row-gap"]))["row-gap"],
        10,
        "CTA: gap entre botones",
      );
      const wa = await estilos(sec.getByRole("link").first(), [
        "border-top-left-radius",
        "min-height",
        "column-gap",
      ]);
      px(wa["border-top-left-radius"], 12, "CTA WhatsApp: radio");
      px(wa["min-height"], 56, "CTA WhatsApp: alto");
      px(wa["column-gap"], 10, "CTA WhatsApp: gap con el ícono");
    });

    test("separación entre eyebrow y h2 de cada sección es de 10px", async ({
      page,
    }) => {
      const h2s = page.locator("main section h2");
      const n = await h2s.count();
      for (let i = 0; i < n; i++) {
        const h2 = h2s.nth(i);
        const previo = h2.locator("xpath=preceding-sibling::p[1]");
        if ((await previo.count()) === 0) continue;
        px(
          (await estilos(h2, ["margin-top"]))["margin-top"],
          10,
          `margin-top del h2 «${(await h2.textContent())?.trim()}»`,
        );
        expect.soft(await separacion(previo, h2)).toBeGreaterThanOrEqual(9.5);
      }
    });
  });
}

/*
 * Diferencias chicas (severidad baja) encontradas en la ronda 2 de QA de la
 * fase 2. Están marcadas con `test.fail()`: hoy fallan a propósito y la suite
 * sigue en verde. Cuando se corrija la app, Playwright avisa «expected to fail,
 * but passed» y hay que quitar el `test.fail()`.
 */
test.describe("Interlineados heredados del diseño (ronda 2, baja)", () => {
  test("detalle de las tarjetas de Pedido: 14px × 1.5 = 21px", async ({
    page,
  }) => {
    test.fail(true, "La app usa text-sm de Tailwind (20px de interlineado)");
    await abrir(page, 390);
    const detalle = page.locator("#pedido [id$='-detalle']").first();
    // El diseño no le pone line-height: hereda el 1.5 del cuerpo.
    expect(
      parseFloat((await estilos(detalle, ["line-height"]))["line-height"]),
    ).toBeCloseTo(21, 0);
  });

  test("pregunta de dos renglones a 320px mide 64px, como en el diseño", async ({
    page,
  }) => {
    test.fail(
      true,
      "La app usa interlineado 1.375 + padding vertical de 12px: 73.5px",
    );
    await abrir(page, 320);
    // Diseño: summary sin padding, 18px × 1.5 = 27px por renglón; dos
    // renglones (54px) quedan dentro del min-height de 64px.
    const larga = page
      .locator("#preguntas summary")
      .filter({ hasText: "¿Puedo programar" });
    const caja = await larga.boundingBox();
    expect(caja!.height).toBeCloseTo(64, 0);
  });
});
