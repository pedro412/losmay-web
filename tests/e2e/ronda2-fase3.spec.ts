import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ANCHOS, MOVIL } from "./helpers";

/**
 * QA de la fase 3, ronda 2: lo que las otras pruebas no revisaban.
 *
 * - Todo el copy visible de docs/design/Main.dc.html aparece en la página.
 * - Las fuentes también cargan en el aviso de privacidad (#13).
 * - La página se queda en claro aunque el sistema esté en modo oscuro.
 * - Teléfono acostado (landscape): sin scroll horizontal y el header no se
 *   come la pantalla.
 *
 * Diferencias chicas (severidad baja) encontradas en esta ronda: van con
 * `test.fail()`, igual que en `espaciado.spec.ts`. Hoy fallan a propósito y
 * la suite sigue en verde; cuando se corrija la app, Playwright avisa
 * «expected to fail, but passed» y hay que quitar el `test.fail()`.
 */

/* -------------------------------------------------------------------------- */
/* Copy del diseño, palabra por palabra                                       */
/* -------------------------------------------------------------------------- */

/** Textos visibles del diseño: sin SVG, scripts ni plantillas `{{…}}`. */
function textosDelDiseno(): string[] {
  const html = readFileSync(
    new URL("../../docs/design/Main.dc.html", import.meta.url),
    "utf8",
  );
  const cuerpo = html
    .split("<x-dc>")[1]
    .split("</x-dc>")[0]
    .replace(/<helmet>[\s\S]*?<\/helmet>/, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ");
  const textos = cuerpo
    .split(/<[^>]+>/)
    .map((t) => t.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim())
    .filter((t) => t && !t.includes("{{"));
  // Los que el diseño arma en el script (menú y tarjetas de Pedido).
  const delScript = [
    "Pedir mayoreo",
    "Entregas",
    "Para quién",
    "Sucursales",
    "Preguntas",
    "16 t",
    "24 t",
    "32 t",
    "+32 t",
    "Mínimo de mayoreo",
    "Entrega programada en obra",
    "Entrega en obra",
    "Fecha y horario a tu medida",
    "En una o varias entregas",
    "Más de 32 toneladas",
    "Obra grande o entregas por etapa",
  ];
  return [...new Set([...textos, ...delScript])].filter(
    (t) => !t.startsWith("[") && !REEMPLAZADOS_POR_EL_CLIENTE.includes(t),
  );
}

/**
 * Textos del diseño que acompañaban un dato pendiente («[zonas]»,
 * «[Confirmar]»…) y que se cambiaron por lo que confirmó Los May. Los
 * corchetes del diseño se filtran aparte.
 */
const REEMPLAZADOS_POR_EL_CLIENTE = [
  "Catálogo completo:",
  "Sí, en Ciudad del Carmen. Fuera de la ciudad:",
];

/** El «₂» de «CO₂» se pinta como <sub>2</sub> (Barlow no trae el glifo). */
const normalizar = (t: string) =>
  t.replace(/₂/g, "2").replace(/\s+/g, " ").toLowerCase();

for (const viewport of [MOVIL, { width: 1440, height: 900 }]) {
  test(`todo el copy visible del diseño aparece en la página a ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    // Respuestas de la FAQ y, en móvil, el menú: también son copy del diseño.
    await page.evaluate(() =>
      document.querySelectorAll("details").forEach((d) => (d.open = true)),
    );
    if (viewport.width < 760)
      await page.getByRole("button", { name: "Abrir menú" }).click();
    const visible = normalizar(
      await page.evaluate(() => document.body.innerText),
    );
    const faltan = textosDelDiseno().filter(
      (t) => !visible.includes(normalizar(t)),
    );
    expect(faltan).toEqual([]);
  });
}

/* -------------------------------------------------------------------------- */
/* Fuentes en el aviso de privacidad                                          */
/* -------------------------------------------------------------------------- */

test("el aviso de privacidad carga Barlow y Barlow Condensed", async ({
  page,
}) => {
  await page.goto("/aviso-de-privacidad");
  await page.evaluate(() => document.fonts.ready);
  const familias = await page.evaluate(() => ({
    cargadas: [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => `${f.family.replace(/^"|"$/g, "")} ${f.weight}`),
    h1: getComputedStyle(document.querySelector("h1")!).fontFamily,
    cuerpo: getComputedStyle(document.body).fontFamily,
  }));
  expect(
    familias.cargadas.some((f) => /^Barlow Condensed\S* 800$/.test(f)),
  ).toBe(true);
  expect(
    familias.cargadas.some((f) => /^Barlow(?! Condensed)\S* 400$/.test(f)),
  ).toBe(true);
  expect(familias.h1).toMatch(/^"?Barlow Condensed/);
  expect(familias.cuerpo).toMatch(/^"?Barlow(?! Condensed)/);
});

/* -------------------------------------------------------------------------- */
/* Modo oscuro del sistema                                                    */
/* -------------------------------------------------------------------------- */

test.describe("con el sistema en modo oscuro", () => {
  test.use({ colorScheme: "dark" });

  for (const ruta of ["/", "/aviso-de-privacidad"]) {
    test(`${ruta} se queda con los colores claros del diseño`, async ({
      page,
    }) => {
      await page.setViewportSize(MOVIL);
      await page.goto(ruta);
      const colores = await page.evaluate(() => ({
        fondo: getComputedStyle(document.body).backgroundColor,
        texto: getComputedStyle(document.body).color,
        header: getComputedStyle(document.querySelector("header")!)
          .backgroundColor,
      }));
      expect(colores.fondo).toBe("rgb(255, 255, 255)");
      expect(colores.header).toBe("rgb(255, 255, 255)");
      expect(colores.texto).toBe("rgb(22, 32, 43)");
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Teléfono acostado                                                          */
/* -------------------------------------------------------------------------- */

test.describe("teléfono acostado (844 × 390, táctil)", () => {
  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });

  for (const ruta of ["/", "/aviso-de-privacidad"]) {
    test(`${ruta}: sin scroll horizontal y el header ocupa menos de un tercio`, async ({
      page,
    }) => {
      await page.goto(ruta);
      await page.evaluate(() => document.fonts.ready);
      const medidas = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        ancho: window.innerWidth,
        header: document.querySelector("header")!.getBoundingClientRect()
          .height,
      }));
      expect(medidas.scroll).toBeLessThanOrEqual(medidas.ancho);
      expect(medidas.header).toBeLessThan(390 / 3);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Diferencias encontradas en la ronda 2 (severidad baja)                     */
/* -------------------------------------------------------------------------- */

/** Renglones en que se parte el texto directo de un elemento. */
async function renglones(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector)!;
    const nodo = [...el.childNodes].find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim(),
    )!;
    const texto = nodo.textContent!;
    const rango = document.createRange();
    const lineas: string[] = [];
    let actual = "";
    let arriba: number | null = null;
    for (let i = 0; i < texto.length; i++) {
      rango.setStart(nodo, i);
      rango.setEnd(nodo, i + 1);
      const caja = rango.getClientRects()[0];
      if (caja && arriba !== null && Math.abs(caja.top - arriba) > 5) {
        lineas.push(actual);
        actual = "";
      }
      if (caja) arriba = caja.top;
      actual += texto[i];
    }
    lineas.push(actual);
    return lineas.map((l) => l.trim());
  }, selector);
}

test.describe("Hero · eyebrow en teléfonos angostos", () => {
  for (const width of [320, 340, 360, 375, 390, 414]) {
    test(`a ${width}px ningún renglón empieza con «·»`, async ({ page }) => {
      test.fail(
        width === 320,
        "A 320px el segundo renglón queda «· Ciudad del Carmen» (el topbar ya lo evita, el eyebrow del hero no)",
      );
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      // El eyebrow es el <p> justo antes del h1.
      const eyebrow = await page.evaluate(() => {
        const p =
          document.querySelector("#hero-titulo")!.previousElementSibling!;
        p.setAttribute("data-qa-eyebrow", "");
        return p.textContent!.trim();
      });
      expect(eyebrow).toBe("Materiales para construcción · Ciudad del Carmen");
      const delEyebrow = await renglones(page, "[data-qa-eyebrow]");
      for (const linea of delEyebrow.slice(1))
        expect(linea.startsWith("·"), `renglón «${linea}»`).toBe(false);
    });
  }
});

test.describe("Espaciado de texto del usuario (WCAG 1.4.12)", () => {
  // Lo que pide el criterio: interlineado 1.5, 0.12em entre letras, 0.16em
  // entre palabras y 2em después de cada párrafo.
  const ESPACIADO = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`;

  for (const ruta of ["/", "/aviso-de-privacidad"])
    for (const width of [320, 390, 1440]) {
      test(`${ruta} a ${width}px sin scroll horizontal ni texto fuera de su caja`, async ({
        page,
      }) => {
        test.fail(
          ruta === "/" && width === 320,
          "A 320px «CONSTRUYE» (60px, Condensed 800) con 0.12em de tracking mide más que el h1 y la página gana 23px de scroll horizontal",
        );
        await page.setViewportSize({ width, height: 800 });
        await page.goto(ruta);
        await page.addStyleTag({ content: ESPACIADO });
        await page.evaluate(() => document.fonts.ready);
        const fuera = await page.evaluate(() => {
          const ancho = document.documentElement.clientWidth;
          const res: string[] = [];
          if (document.documentElement.scrollWidth > ancho)
            res.push(`scrollWidth ${document.documentElement.scrollWidth}`);
          const caminante = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
          );
          let nodo: Node | null;
          while ((nodo = caminante.nextNode())) {
            if (!nodo.textContent!.trim()) continue;
            // Lo que vive en un carril con scroll propio no cuenta.
            let e = nodo.parentElement;
            let enCarril = false;
            while (e) {
              const ox = getComputedStyle(e).overflowX;
              if (ox === "auto" || ox === "scroll") enCarril = true;
              e = e.parentElement;
            }
            if (enCarril) continue;
            const rango = document.createRange();
            rango.selectNodeContents(nodo);
            for (const caja of rango.getClientRects())
              if (caja.right > ancho + 0.5)
                res.push(
                  `«${nodo.textContent!.trim().slice(0, 30)}» llega a ${Math.round(caja.right)}px`,
                );
          }
          return res;
        });
        expect(fuera).toEqual([]);
      });
    }
});

test("una URL que no existe responde 404 con la marca y un link al inicio", async ({
  page,
}) => {
  const respuesta = await page.goto("/no-existe");
  expect(respuesta!.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(
    page.getByRole("main").locator('a[href="/"]').first(),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("main").locator('a[href^="https://wa.me/"]'),
  ).toHaveAttribute("data-ubicacion", "pagina_404");
});

for (const ancho of ANCHOS) {
  test(`la 404 no tiene scroll horizontal a ${ancho}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 800 });
    await page.goto("/no-existe");
    await page.evaluate(() => document.fonts.ready);
    const medidas = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      ancho: window.innerWidth,
    }));
    expect(medidas.scroll).toBeLessThanOrEqual(medidas.ancho);
  });
}

/* Sin scroll horizontal también en el aviso con todos los anchos de la fase. */
for (const ancho of ANCHOS) {
  test(`aviso de privacidad sin scroll horizontal a ${ancho}px${ancho < 760 ? " (táctil)" : ""}`, async ({
    browser,
  }) => {
    const movil = ancho < 760;
    const contexto = await browser.newContext({
      viewport: { width: ancho, height: 800 },
      isMobile: movil,
      hasTouch: movil,
    });
    const page = await contexto.newPage();
    await page.goto("/aviso-de-privacidad");
    await page.evaluate(() => document.fonts.ready);
    const medidas = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      ancho: window.innerWidth,
    }));
    expect(medidas.scroll).toBeLessThanOrEqual(medidas.ancho);
    await contexto.close();
  });
}
