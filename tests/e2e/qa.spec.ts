import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  ANCHOS,
  ESCRITORIO,
  MOVIL,
  PRODUCCION,
  servirComoProduccion,
} from "./helpers";

/**
 * QA prelanzamiento (issue #16): lo que se puede revisar en automático antes
 * de anunciar la landing. Completa a las pruebas de cada issue (teclado,
 * touch targets, anchors, contraste, scroll horizontal de la landing, links
 * de WhatsApp, tel: y Maps) con:
 *
 * - Auditoría axe-core (WCAG 2.1 A/AA y buenas prácticas) de las dos
 *   páginas, en móvil y escritorio, con la FAQ abierta y el menú abierto.
 * - El aviso de privacidad con las mismas reglas que la landing: foco
 *   visible, touch targets y sin scroll horizontal.
 * - Imágenes en AVIF/WebP con `sizes` que coincide con lo que se pinta.
 * - Presupuesto de JS (solo el menú y GA) y CLS con las fuentes tardando.
 * - `prefers-reduced-motion`: sin animaciones de movimiento.
 *
 * Lighthouse va aparte (`npm run qa:lighthouse`) y lo que no se puede probar
 * aquí (dispositivos reales, VoiceOver/TalkBack, GA4 en producción) queda en
 * la checklist del README («QA prelanzamiento»).
 */

const PAGINAS = ["/", "/aviso-de-privacidad"] as const;

/** Abre todas las preguntas de la FAQ (si la página las tiene). */
async function abrirFaq(page: Page) {
  await page
    .locator("details")
    .evaluateAll((ds) =>
      ds.forEach((d) => ((d as HTMLDetailsElement).open = true)),
    );
}

/* -------------------------------------------------------------------------- */

test.describe("axe-core: WCAG 2.1 AA y buenas prácticas", () => {
  for (const ruta of PAGINAS) {
    for (const viewport of [MOVIL, ESCRITORIO]) {
      test(`${ruta} a ${viewport.width}px sin violaciones`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto(ruta);
        await page.evaluate(() => document.fonts.ready);
        await abrirFaq(page);

        const auditar = async (estado: string) => {
          const { violations } = await new AxeBuilder({ page })
            .withTags([
              "wcag2a",
              "wcag2aa",
              "wcag21a",
              "wcag21aa",
              "wcag22aa",
              "best-practice",
            ])
            .analyze();
          const resumen = violations.map(
            (v) =>
              `[${estado}] ${v.id} (${v.impact}): ${v.nodes
                .slice(0, 3)
                .map((n) => n.target.join(" "))
                .join(" | ")}`,
          );
          expect(resumen).toEqual([]);
        };

        await auditar("página");
        const menu = page.getByRole("button", { name: "Abrir menú" });
        if (await menu.isVisible()) {
          await menu.click();
          await auditar("menú abierto");
        }
      });
    }
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Aviso de privacidad: mismas reglas que la landing", () => {
  const RUTA = "/aviso-de-privacidad";

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`foco visible en todo lo enfocable a ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(RUTA);
      const vistos = new Set<string>();
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            id: `${el.tagName}:${el.getAttribute("href")}:${el.textContent?.trim()}`,
            outline: cs.outlineStyle,
            grosor: parseFloat(cs.outlineWidth),
            enPantalla: r.bottom > 0 && r.top < window.innerHeight,
          };
        });
        if (!info || vistos.has(info.id)) break;
        vistos.add(info.id);
        expect(info.outline, info.id).not.toBe("none");
        expect(info.grosor, info.id).toBeGreaterThanOrEqual(2);
        expect(info.enPantalla, info.id).toBe(true);
      }
      // Skip link, logo, WhatsApp, volver, 3 links externos y el footer.
      expect(vistos.size).toBeGreaterThanOrEqual(8);
    });
  }

  for (const width of [320, 390]) {
    test(`touch targets de 44px a ${width}px (menos los links dentro de una oración)`, async ({
      browser,
    }) => {
      const contexto = await browser.newContext({
        viewport: { width, height: 700 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await contexto.newPage();
      await page.goto(RUTA);
      const chicos = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("a, button, summary")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            // Solo están exentos los links dentro de una oración (WCAG 2.5.8):
            // su párrafo o elemento de lista tiene más texto que el link. Un
            // link que es todo el contenido de su <li> (las listas de links del
            // aviso) es un touch target como cualquier botón.
            const contenedor = el.closest("p, li");
            const enOracion =
              !!contenedor &&
              contenedor.textContent!.trim() !== el.textContent!.trim();
            return r.width > 0 && r.top >= -1 && !enOracion;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              texto: (el.getAttribute("aria-label") ?? el.textContent ?? "")
                .replace(/\s+/g, " ")
                .trim(),
              ancho: Math.round(r.width),
              alto: Math.round(r.height),
            };
          })
          .filter((t) => t.alto < 44 || t.ancho < 44),
      );
      expect(chicos).toEqual([]);
      await contexto.close();
    });
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Links de WhatsApp en iOS y Android", () => {
  for (const ruta of PAGINAS) {
    test(`${ruta}: todos son https://wa.me (app o web.whatsapp sin app)`, async ({
      page,
    }) => {
      await page.setViewportSize(MOVIL);
      await page.goto(ruta);
      const hrefs = await page
        .locator("a[href*='whatsapp'], a[href*='wa.me']")
        .evaluateAll((as) =>
          as
            .map((a) => a.getAttribute("href")!)
            // Las políticas de WhatsApp que cita el aviso no son de pedido.
            .filter((h) => !h.includes("/legal/")),
        );
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        // `https://wa.me/<número>?text=` abre la app en iOS y Android si
        // está instalada y, si no, la página de WhatsApp que ofrece
        // instalarla o seguir en web.whatsapp.com. `whatsapp://` falla sin
        // la app y `api.whatsapp.com` agrega un salto.
        const url = new URL(href);
        expect(url.protocol, href).toBe("https:");
        expect(url.host, href).toBe("wa.me");
        // Número con lada de país (52) y sin «+», espacios ni guiones.
        expect(url.pathname, href).toMatch(/^\/52\d{10}$/);
        expect(url.searchParams.get("text"), href).toBeTruthy();
      }
    });
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Imágenes", () => {
  test("las fotos salen en AVIF y WebP, con medidas y lazy fuera del hero", async ({
    page,
  }) => {
    await page.goto("/");
    const fotos = await page.evaluate(() =>
      [...document.images]
        .filter((img) => !/\.svg(\?|$)/.test(img.getAttribute("src") ?? ""))
        .map((img) => ({
          alt: img.alt,
          enPicture: img.parentElement?.tagName === "PICTURE",
          formatos: [...(img.parentElement?.querySelectorAll("source") ?? [])]
            .map((s) => s.type)
            .sort(),
          width: img.getAttribute("width"),
          height: img.getAttribute("height"),
          loading: img.loading,
          enHero: !!img.closest("section[aria-labelledby='hero-titulo']"),
        })),
    );
    expect(fotos.length).toBeGreaterThan(0);
    for (const foto of fotos) {
      expect(foto.enPicture, foto.alt).toBe(true);
      expect(foto.formatos, foto.alt).toEqual(["image/avif", "image/webp"]);
      expect(foto.width && foto.height, foto.alt).toBeTruthy();
      expect(foto.loading, foto.alt).toBe(foto.enHero ? "eager" : "lazy");
    }
  });

  for (const ancho of ANCHOS) {
    test(`sizes coincide con el ancho pintado a ${ancho}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      const medidas = await page.evaluate(() => {
        /** Ancho en px de una longitud CSS (`520px`, `36vw`, `calc(…)`). */
        const medir = (longitud: string) => {
          const div = document.createElement("div");
          div.style.cssText = `position:absolute;visibility:hidden;width:${longitud}`;
          document.body.append(div);
          const px = div.getBoundingClientRect().width;
          div.remove();
          return px;
        };
        return [...document.querySelectorAll<HTMLImageElement>("img[sizes]")]
          .filter((img) => img.getBoundingClientRect().width > 0)
          .map((img) => {
            const entrada = img.sizes
              .split(",")
              .map((s) => s.trim())
              .find((s) => {
                const m = s.match(/^(\(.+\))\s+\S+$/);
                return !m || matchMedia(m[1]).matches;
              })!;
            const longitud = entrada.match(/^\(.+\)\s+(\S+)$/)?.[1] ?? entrada;
            return {
              alt: img.alt,
              sizes: Math.round(medir(longitud)),
              pintado: Math.round(img.getBoundingClientRect().width),
            };
          });
      });
      expect(medidas.length).toBeGreaterThan(0);
      for (const { alt, sizes, pintado } of medidas) {
        // Ni más chica (se ve borrosa) ni más de 15% más grande (bytes de
        // más en datos móviles) que lo que de verdad se pinta.
        expect(
          sizes,
          `${alt}: sizes ${sizes}px vs ${pintado}px`,
        ).toBeGreaterThanOrEqual(pintado - 2);
        expect(
          sizes,
          `${alt}: sizes ${sizes}px vs ${pintado}px`,
        ).toBeLessThanOrEqual(Math.ceil(pintado * 1.15) + 2);
      }
    });
  }
});

/* -------------------------------------------------------------------------- */

test.describe("Presupuesto de JS y estabilidad (producción simulada)", () => {
  test("solo el menú y GA: 2 scripts inline chicos y gtag.js", async ({
    context,
    page,
  }) => {
    const red = await servirComoProduccion(context);
    const scriptsPedidos: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "script") scriptsPedidos.push(r.url());
    });
    await page.setViewportSize(MOVIL);
    await page.goto(`${PRODUCCION}/`, { waitUntil: "load" });
    await expect.poll(() => red.google.length).toBeGreaterThan(0);

    const inline = await page.evaluate(() =>
      [...document.scripts]
        .filter((s) => !s.src && s.type !== "application/ld+json")
        .map((s) => ({
          tipo: s.hasAttribute("data-analytics") ? "ga" : "menu",
          bytes: new Blob([s.textContent ?? ""]).size,
        })),
    );
    expect(inline.map((s) => s.tipo).sort()).toEqual(["ga", "menu"]);
    const total = inline.reduce((suma, s) => suma + s.bytes, 0);
    expect(total, `${total} bytes de JS inline`).toBeLessThan(4 * 1024);

    // Ningún .js propio: el único script externo es gtag.js.
    expect(scriptsPedidos).toEqual([
      expect.stringMatching(/^https:\/\/www\.googletagmanager\.com\/gtag\/js/),
    ]);
    expect(red.externas).toEqual([]);
  });

  test("ningún CSS bloquea el primer pintado: va dentro del HTML", async ({
    page,
  }) => {
    for (const ruta of PAGINAS) {
      await page.goto(ruta);
      await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
      expect(await page.locator("head style").count()).toBeGreaterThan(0);
    }
  });

  test("CLS < 0.1 en móvil aunque las fuentes tarden en llegar", async ({
    page,
  }) => {
    // Las fuentes llegan 1.5 s tarde: el texto se pinta primero con la
    // fuente de respaldo (`font-display: swap`) y luego cambia.
    await page.route(/\.woff2$/, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.addInitScript(() => {
      (window as unknown as { cls: number }).cls = 0;
      new PerformanceObserver((lista) => {
        for (const e of lista.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!e.hadRecentInput) {
            (window as unknown as { cls: number }).cls += e.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.setViewportSize(MOVIL);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("load");
    // Baja por toda la página para que carguen las imágenes lazy.
    const alto = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < alto; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(50);
    }
    const cls = await page.evaluate(
      () => (window as unknown as { cls: number }).cls,
    );
    expect(cls).toBeLessThan(0.1);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const ruta of PAGINAS) {
    test(`${ruta}: sin animaciones ni transiciones de movimiento`, async ({
      page,
    }) => {
      await page.goto(ruta);
      const movimiento = await page.evaluate(() => {
        // Cambios de color, filtro o sombra (hover) no son movimiento.
        const permitidas = new Set([
          "all",
          "none",
          "color",
          "background-color",
          "border-color",
          "outline-color",
          "text-decoration-color",
          "fill",
          "stroke",
          "filter",
          "box-shadow",
          "opacity",
        ]);
        const res: string[] = [];
        for (const el of document.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          if (cs.animationName !== "none") {
            res.push(`${el.tagName}: animation ${cs.animationName}`);
          }
          const duraciones = cs.transitionDuration.split(",").map(parseFloat);
          cs.transitionProperty.split(",").forEach((p, i) => {
            const prop = p.trim();
            const dur = duraciones[i % duraciones.length];
            // `all` con duración es lo que deja Tailwind en `transition`.
            // `--tw-gradient-*` son los colores de degradado que agrega
            // `transition-colors`.
            const color =
              permitidas.has(prop) || prop.startsWith("--tw-gradient-");
            if (dur > 0 && (!color || prop === "all")) {
              res.push(`${el.tagName}.${el.className}: transition ${prop}`);
            }
          });
        }
        return res;
      });
      expect(movimiento).toEqual([]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    });
  }
});
