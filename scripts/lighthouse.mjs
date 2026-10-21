// Corre Lighthouse (configuración móvil por defecto: Moto G Power emulado,
// 4G lenta simulada y CPU 4× más lenta) contra el build local servido con
// `astro preview`, y guarda los reportes en docs/qa/lighthouse/ (issue #16).
//
// - Usa el Chromium de Playwright (el mismo de las pruebas e2e), sin
//   depender de que haya un Chrome instalado.
// - Corre cada página varias veces y se queda con la corrida mediana por
//   puntaje de Performance (la simulación varía un poco entre corridas).
// - Guarda por página el reporte HTML y JSON de la mediana, y un
//   `resumen.json` con los puntajes y métricas de todas las corridas.
// - Termina con error si la landing no llega a 95 en alguna categoría o si la
//   mediana no cumple LCP < 2.5 s y CLS < 0.1 (criterios del issue #16).
//
// El aviso de privacidad lleva `noindex` mientras es borrador (issue #13):
// ahí la única auditoría de SEO que puede fallar es `is-crawlable`.
//
// En localhost no se carga GA4 (solo en losmay.com), así que estos números
// no incluyen gtag.js. La medición final va en el preview de Vercel o en
// producción (ver README, «QA prelanzamiento»).
//
// Uso: npm run qa:lighthouse  (compila primero; requiere
// `npx playwright install chromium`). Opcional: LH_CORRIDAS=5.
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const LIGHTHOUSE = "lighthouse@13.5.0";
const PUERTO = 4401;
const BASE = `http://localhost:${PUERTO}`;
const CORRIDAS = Number(process.env.LH_CORRIDAS ?? 3);
const CATEGORIAS = ["performance", "accessibility", "best-practices", "seo"];
const MINIMO = 0.95;
const LCP_MAX_MS = 2500;
const CLS_MAX = 0.1;

/** Páginas a medir y auditorías que pueden fallar a propósito. */
const PAGINAS = [
  { nombre: "landing", ruta: "/", permitidas: [] },
  {
    nombre: "aviso-de-privacidad",
    ruta: "/aviso-de-privacidad",
    // Borrador con `noindex` hasta que Los May lo apruebe (issue #13).
    permitidas: ["is-crawlable"],
  },
];

const raiz = fileURLToPath(new URL("../", import.meta.url));
const destino = fileURLToPath(
  new URL("../docs/qa/lighthouse/", import.meta.url),
);
const temporal = fileURLToPath(
  new URL("../node_modules/.cache/lighthouse/", import.meta.url),
);

/** @param {string} cmd @param {string[]} args @param {object} [opts] */
function correr(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proceso = spawn(cmd, args, { stdio: "inherit", cwd: raiz, ...opts });
    proceso.on("error", reject);
    proceso.on("exit", (codigo) =>
      codigo === 0
        ? resolve(undefined)
        : reject(new Error(`${cmd} ${args[0]} terminó con código ${codigo}`)),
    );
  });
}

async function esperarServidor() {
  for (let i = 0; i < 60; i++) {
    try {
      const respuesta = await fetch(BASE);
      if (respuesta.ok) return;
    } catch {
      // Todavía no levanta.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`astro preview no respondió en ${BASE}`);
}

/** @param {any} lhr */
function resumir(lhr) {
  const metrica = (/** @type {string} */ id) => lhr.audits[id]?.numericValue;
  return {
    puntajes: Object.fromEntries(
      CATEGORIAS.map((c) => [c, lhr.categories[c]?.score ?? null]),
    ),
    metricas: {
      fcpMs: Math.round(metrica("first-contentful-paint")),
      lcpMs: Math.round(metrica("largest-contentful-paint")),
      tbtMs: Math.round(metrica("total-blocking-time")),
      cls: Number(metrica("cumulative-layout-shift").toFixed(3)),
      speedIndexMs: Math.round(metrica("speed-index")),
      pesoTotalKiB: Math.round(metrica("total-byte-weight") / 1024),
    },
    // Auditorías con puntaje que no pasan, por categoría (para el reporte).
    fallidas: Object.fromEntries(
      CATEGORIAS.map((c) => [
        c,
        lhr.categories[c].auditRefs
          .map((/** @type {{ id: string }} */ ref) => lhr.audits[ref.id])
          .filter(
            (/** @type {any} */ a) =>
              a.score !== null &&
              a.score < 1 &&
              ["binary", "numeric", "metricSavings"].includes(
                a.scoreDisplayMode,
              ),
          )
          .map((/** @type {any} */ a) => a.id),
      ]),
    ),
  };
}

async function main() {
  const chrome = chromium.executablePath();
  await rm(temporal, { recursive: true, force: true });
  await mkdir(temporal, { recursive: true });
  await mkdir(destino, { recursive: true });

  // `--ignore-lock` deja `astro preview` en primer plano (ver
  // playwright.config.ts) para poder apagarlo al terminar.
  const servidor = spawn(
    "npx",
    ["astro", "preview", "--port", String(PUERTO), "--ignore-lock"],
    { cwd: raiz, stdio: "ignore", detached: true },
  );
  const apagar = () => {
    try {
      process.kill(-(/** @type {number} */ (servidor.pid)), "SIGTERM");
    } catch {
      // Ya estaba apagado.
    }
  };
  process.on("exit", apagar);

  /** @type {Record<string, any>} */
  const resumen = {
    fecha: new Date().toISOString(),
    lighthouse: LIGHTHOUSE,
    configuracion:
      "móvil por defecto (Moto G Power emulado, 4G lenta simulada, CPU 4×)",
    servidor: `astro preview (${BASE}), sin GA4`,
    corridasPorPagina: CORRIDAS,
    paginas: {},
  };
  const errores = [];

  try {
    await esperarServidor();
    for (const pagina of PAGINAS) {
      const corridas = [];
      for (let i = 1; i <= CORRIDAS; i++) {
        const base = `${temporal}${pagina.nombre}-${i}`;
        console.log(`\n▶ ${pagina.ruta} · corrida ${i} de ${CORRIDAS}`);
        await correr("npx", [
          "--yes",
          LIGHTHOUSE,
          `${BASE}${pagina.ruta}`,
          `--chrome-path=${chrome}`,
          "--chrome-flags=--headless=new",
          `--only-categories=${CATEGORIAS.join(",")}`,
          "--output=json",
          "--output=html",
          `--output-path=${base}`,
          "--quiet",
        ]);
        const lhr = JSON.parse(await readFile(`${base}.report.json`, "utf8"));
        corridas.push({ base, ...resumir(lhr) });
      }

      // Mediana por Performance (desempate por LCP).
      const ordenadas = [...corridas].sort(
        (a, b) =>
          a.puntajes.performance - b.puntajes.performance ||
          b.metricas.lcpMs - a.metricas.lcpMs,
      );
      const mediana = ordenadas[Math.floor((ordenadas.length - 1) / 2)];
      for (const ext of ["html", "json"]) {
        await copyFile(
          `${mediana.base}.report.${ext}`,
          `${destino}${pagina.nombre}.report.${ext}`,
        );
      }

      const { base: _, ...elegida } = mediana;
      resumen.paginas[pagina.ruta] = {
        reporte: `docs/qa/lighthouse/${pagina.nombre}.report.html`,
        mediana: elegida,
        corridas: corridas.map(({ puntajes, metricas }) => ({
          puntajes,
          metricas,
        })),
      };

      for (const categoria of CATEGORIAS) {
        const puntaje = elegida.puntajes[categoria];
        const fallidas = elegida.fallidas[categoria];
        const soloPermitidas =
          fallidas.length > 0 &&
          fallidas.every((/** @type {string} */ id) =>
            pagina.permitidas.includes(id),
          );
        if (puntaje < MINIMO && !soloPermitidas) {
          errores.push(
            `${pagina.ruta}: ${categoria} ${Math.round(puntaje * 100)} (< 95) · ${fallidas.join(", ")}`,
          );
        }
      }
      if (elegida.metricas.lcpMs >= LCP_MAX_MS) {
        errores.push(`${pagina.ruta}: LCP ${elegida.metricas.lcpMs} ms`);
      }
      if (elegida.metricas.cls >= CLS_MAX) {
        errores.push(`${pagina.ruta}: CLS ${elegida.metricas.cls}`);
      }
    }
  } finally {
    apagar();
  }

  await writeFile(
    `${destino}resumen.json`,
    JSON.stringify(resumen, null, 2) + "\n",
  );

  console.log("\nMediana por página:");
  console.table(
    Object.fromEntries(
      Object.entries(resumen.paginas).map(([ruta, { mediana }]) => [
        ruta,
        {
          ...Object.fromEntries(
            CATEGORIAS.map((c) => [c, Math.round(mediana.puntajes[c] * 100)]),
          ),
          "LCP (ms)": mediana.metricas.lcpMs,
          CLS: mediana.metricas.cls,
          "TBT (ms)": mediana.metricas.tbtMs,
          "Peso (KiB)": mediana.metricas.pesoTotalKiB,
        },
      ]),
    ),
  );
  console.log(`Reportes en ${destino}`);

  if (errores.length) {
    console.error("\n✗ No cumple el issue #16:\n  " + errores.join("\n  "));
    process.exitCode = 1;
  } else {
    console.log("\n✓ Cumple ≥ 95 en las 4 categorías, LCP < 2.5 s y CLS < 0.1");
  }
}

await main();
