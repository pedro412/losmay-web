// Genera la imagen para compartir (Open Graph / Twitter card) de 1200 × 630:
// public/og.jpg. Es el post de campaña del diseño (docs/design/Post.dc.html)
// acomodado en horizontal: logo, «Cemento Holcim desde 16 t», los tres
// puntos de la campaña, sello de distribuidor Holcim, losmay.com y la foto del
// bulto con su ficha.
//
// La dibuja el Chromium de Playwright con las mismas fuentes self-hosted del
// sitio (Fontsource) y los mismos assets, y los textos que dependen del
// negocio (mínimo de mayoreo, número de sucursales, dominio) salen de
// src/data/site.ts.
//
// WhatsApp guarda en caché la vista previa de cada URL: si cambia la imagen,
// cambia también el nombre del archivo (y `seo.imagen.src` en site.ts) para
// que se vea la nueva.
//
// Uso: npm run og  (requiere `npx playwright install chromium`)
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import {
  colorMarca,
  minimoMayoreo,
  negocio,
  seo,
  sucursales,
} from "../src/data/site.ts";

const raiz = new URL("../", import.meta.url);
const archivo = (/** @type {string} */ ruta) => readFile(new URL(ruta, raiz));
const dataUri = async (
  /** @type {string} */ ruta,
  /** @type {string} */ tipo,
) => `data:${tipo};base64,${(await archivo(ruta)).toString("base64")}`;

const fuente = async (
  /** @type {string} */ familia,
  /** @type {string} */ pkg,
  /** @type {number} */ peso,
) =>
  `@font-face{font-family:"${familia}";font-weight:${peso};font-style:normal;src:url(${await dataUri(
    `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${peso}-normal.woff2`,
    "font/woff2",
  )}) format("woff2")}`;

// Logo de Los May en versión blanca (sobre marino), desde el componente del
// sitio, para no duplicar los paths.
const logoAstro = (await archivo("src/components/Logo.astro")).toString();
const logo = logoAstro
  .slice(logoAstro.indexOf("<svg"), logoAstro.indexOf("</svg>") + 6)
  .replace(/<svg[^>]*>/, '<svg viewBox="0 0 1100 480" class="logo">')
  .replace("class={stroke}", 'stroke="#E0353C"')
  .replace("class={fill}", 'fill="#E0353C"')
  .replace("class={text}", 'fill="#FFFFFF"')
  .replace(/<!--.*?-->/g, "");

const [foto, holcim, ...fuentes] = await Promise.all([
  // La foto se reduce antes de incrustarla: se pinta a 400 px de ancho.
  sharp(await archivo("src/assets/images/cemento-holcim-ecoplanet-25kg.jpg"))
    .resize({ width: 900 })
    .jpeg({ quality: 90 })
    .toBuffer()
    .then((b) => `data:image/jpeg;base64,${b.toString("base64")}`),
  dataUri("src/assets/brand/holcim-logo-blanco.svg", "image/svg+xml"),
  fuente("Barlow Condensed", "barlow-condensed", 800),
  fuente("Barlow", "barlow", 600),
  fuente("Barlow", "barlow", 700),
]);

const check = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;

const html = `<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><style>
${fuentes.join("\n")}
*{box-sizing:border-box}
html,body{margin:0}
body{width:${seo.imagen.ancho}px;height:${seo.imagen.alto}px;overflow:hidden;background:${colorMarca};color:#FFF;font-family:Barlow,sans-serif}
.lienzo{display:flex;gap:44px;height:100%;padding:52px 52px 52px 60px}
.texto{flex:1 1 0;display:flex;flex-direction:column;min-width:0}
.arriba{display:flex;align-items:center;justify-content:space-between}
.logo{display:block;width:214px;height:auto}
.mayoreo{border:2px solid #FFF;border-radius:6px;padding:7px 14px;font-size:17px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
h1{margin:26px 0 0;font-family:"Barlow Condensed",sans-serif;font-weight:800;text-transform:uppercase;font-size:104px;line-height:.86;letter-spacing:-.01em}
h1 span{display:inline-block;background:#C8202A;padding:3px 16px 0;margin-top:8px}
ul{list-style:none;margin:26px 0 0;padding:0;display:flex;gap:20px;font-size:20px;font-weight:600;white-space:nowrap}
li{display:flex;align-items:center;gap:8px}
li svg{width:22px;height:22px;flex:none;fill:none;stroke:#FF8A8E;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.abajo{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
.sello{display:inline-flex;align-items:center;gap:16px;border:2px solid #2B4D72;border-radius:14px;padding:13px 18px}
.sello img{display:block;height:34px;width:auto}
.sello i{width:2px;align-self:stretch;background:#2B4D72}
.sello span{font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;line-height:1.15}
.dominio{text-align:right}
.dominio small{display:block;font-size:16px;font-weight:600;color:#C9D6E4;letter-spacing:.04em;text-transform:uppercase}
.dominio b{display:block;margin-top:4px;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:54px;line-height:1}
.foto{flex:0 0 372px;position:relative;border-radius:14px;overflow:hidden}
.foto img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 30%}
.ficha{position:absolute;left:14px;right:14px;bottom:14px;background:#FFF;color:${colorMarca};border-radius:10px;padding:14px 18px}
.ficha small{display:block;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#545D68}
.ficha b{display:block;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:38px;line-height:1;text-transform:uppercase}
.ficha span{display:block;font-size:15px;font-weight:600;color:#545D68}
</style></head><body>
<div class="lienzo">
  <div class="texto">
    <div class="arriba">${logo}<span class="mayoreo">Mayoreo</span></div>
    <h1>Cemento Holcim<br><span>desde ${minimoMayoreo} t</span></h1>
    <ul>
      <li>${check}Pedido por WhatsApp</li>
      <li>${check}Entrega en tu obra</li>
      <li>${check}${negocio.ciudad}</li>
    </ul>
    <div class="abajo">
      <div class="sello"><img src="${holcim}" alt="Holcim"><i></i><span>Distribuidor<br>autorizado</span></div>
      <div class="dominio"><small>Cotiza en minutos</small><b>${negocio.dominio}</b></div>
    </div>
  </div>
  <div class="foto">
    <img src="${foto}" alt="">
    <div class="ficha"><small>Holcim Apasco</small><b>ECOPlanet 25 kg</b><span>${sucursales.length} sucursales en Carmen</span></div>
  </div>
</div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: seo.imagen.ancho, height: seo.imagen.alto },
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // Que nada se salga del lienzo (p. ej. si un texto de site.ts crece).
  const desborde = await page.evaluate(() => {
    const caja = document.querySelector(".texto")?.getBoundingClientRect();
    if (!caja) return true;
    return [...document.querySelectorAll(".texto *")].some((el) => {
      const r = el.getBoundingClientRect();
      return r.right > caja.right + 0.5 || r.bottom > caja.bottom + 0.5;
    });
  });
  if (desborde) throw new Error("El texto no cabe en la imagen de 1200 × 630.");
  const png = await page.screenshot({ type: "png" });
  const destino = new URL(`public${seo.imagen.src}`, raiz);
  // JPEG ligero: WhatsApp no muestra vistas previas de imágenes muy pesadas.
  await sharp(png)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(destino.pathname);
  console.log(`Imagen para compartir generada en public${seo.imagen.src}`);
} finally {
  await browser.close();
}
