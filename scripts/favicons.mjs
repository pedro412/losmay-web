// Genera los favicons a partir del isotipo de Los May (casita + bodega del
// logo, docs/design/Marca.dc.html):
//
// - public/favicon.svg: trazos ~1.6× más gruesos para que se lean a 16-32 px.
// - public/favicon.ico: 16, 32 y 48 px (PNG dentro del ICO).
// - public/apple-touch-icon.png: 180 px, cuadrado y sin transparencia (iOS
//   aplica su propia máscara), con los grosores originales del logo.
//
// Uso: npm run favicons
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const MARINO = "#0E2A47";
const ROJO_SOBRE_MARINO = "#E0353C";

/**
 * @param {{ weight: number; rounded: boolean; pad: number }} options
 *   weight: multiplicador del grosor de trazo; pad: margen extra del lienzo.
 */
function isotipo({ weight, rounded, pad }) {
  const w = (/** @type {number} */ n) => +(n * weight).toFixed(1);
  // Caja del isotipo: x 589-1100, y ~0-396 → lienzo cuadrado centrado.
  const size = 560 + pad * 2;
  const x = 564.5 - pad;
  const y = -82 - pad;
  const bar = Math.max(28, w(25));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}">
  <rect x="${x}" y="${y}" width="${size}" height="${size}"${rounded ? ` rx="${size * 0.2}"` : ""} fill="${MARINO}"/>
  <g fill="none" stroke="${ROJO_SOBRE_MARINO}">
    <path d="M600 168 L900 18 L1089 124 L1089 396" stroke-width="${w(22)}" stroke-linejoin="miter"/>
    <rect x="688" y="196" width="134" height="98" stroke-width="${w(20)}"/>
    <path d="M755 196 V294 M688 245 H822" stroke-width="${w(16)}"/>
    <rect x="885" y="182" width="100" height="192" stroke-width="${w(20)}"/>
  </g>
  <g fill="${ROJO_SOBRE_MARINO}">
    <rect x="952" y="262" width="14" height="24"/>
    <rect x="975" y="10" width="30" height="58"/>
    <rect x="589" y="${396 - bar}" width="511" height="${bar}"/>
  </g>
</svg>
`;
}

/** ICO con imágenes PNG embebidas (soportado por todos los navegadores). */
function ico(/** @type {{ size: number; png: Buffer }[]} */ images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((img) => img.png)]);
}

const small = isotipo({ weight: 1.6, rounded: true, pad: 0 });
const apple = isotipo({ weight: 1, rounded: false, pad: 60 });

const render = (/** @type {string} */ svg, /** @type {number} */ size) =>
  sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

await writeFile("public/favicon.svg", small);
await writeFile(
  "public/favicon.ico",
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({
        size,
        png: await render(small, size),
      })),
    ),
  ),
);
await writeFile(
  "public/apple-touch-icon.png",
  await sharp(await render(apple, 180))
    .flatten({ background: MARINO })
    .png({ compressionLevel: 9 })
    .toBuffer(),
);
console.log("Favicons generados en public/");
