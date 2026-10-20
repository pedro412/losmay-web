# Los May — landing de mayoreo

Landing de campaña de **mayoreo de cemento Holcim** para Los May Materiales para Construcción (Ciudad del Carmen). El objetivo es convertir visitas, sobre todo de móvil, en pedidos por WhatsApp.

Plan de trabajo: issue [#17](https://github.com/pedro412/losmay-web/issues/17).

## Stack

|           |                                                                                       |
| --------- | ------------------------------------------------------------------------------------- |
| Framework | [Astro](https://astro.build) con salida estática, sin adapter                         |
| Estilos   | Tailwind CSS v4 vía `@tailwindcss/vite`, tokens en `@theme` (`src/styles/global.css`) |
| Lenguaje  | TypeScript en modo `strict`                                                           |
| Contenido | `src/data/site.ts`                                                                    |
| Analytics | Google Analytics 4, solo en producción                                                |
| Hosting   | Vercel                                                                                |
| Formato   | Prettier con `prettier-plugin-astro` y `prettier-plugin-tailwindcss`                  |

## Cómo correrlo

Requiere Node 24 (ver `.nvmrc`) y npm.

```sh
nvm use
npm install
npm run dev        # http://localhost:4321
```

| Script                 | Qué hace                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`          | Servidor de desarrollo                                                                           |
| `npm run build`        | Genera el sitio estático en `dist/`                                                              |
| `npm run preview`      | Sirve `dist/` localmente                                                                         |
| `npm run check`        | `astro check` (tipos y diagnósticos)                                                             |
| `npm run format`       | Formatea con Prettier                                                                            |
| `npm run format:check` | Verifica el formato sin escribir                                                                 |
| `npm run favicons`     | Regenera los favicons en `public/`                                                               |
| `npm run og`           | Regenera la imagen para compartir `public/og.jpg` (1200 × 630) con el Chromium de Playwright     |
| `npm run test:e2e`     | Compila y corre las pruebas de Playwright (`tests/e2e`) contra `astro preview` en el puerto 4400 |

`test:e2e` siempre levanta su propio servidor (no reusa uno que ya esté corriendo, para no probar un `dist/` viejo); si el puerto 4400 está ocupado, falla con un aviso. Detén el servidor anterior con `npx astro preview stop`.

El CI (`.github/workflows/ci.yml`) corre `npm ci`, `format:check`, `check` y `build` en cada PR.

## Estructura

```
src/
  assets/              imágenes y SVG procesados por Astro
  components/          componentes reutilizables
  components/sections/ secciones de la landing
  data/                contenido (site.ts)
  layouts/             layout base (html, head)
  pages/               rutas
  styles/global.css    Tailwind y tokens
docs/design/           diseño de referencia
```

## Sistema visual

- **Tokens** en `src/styles/global.css` (`@theme`). Solo existen los colores de marca (la paleta por defecto de Tailwind está desactivada): `marino`, `marino-900`, `marino-line`, `marino-200`, `marino-100`, `marino-300`, `marino-700`, `rojo`, `rojo-700`, `rojo-400`, `concreto`, `grafito`, `acero`, `acero-600`, `borde`, `borde-suave`, `borde-tenue`, `whatsapp`, y `pendiente` / `pendiente-texto` para resaltar datos por confirmar.
- **Tipografía** self-hosted con la API de fuentes de Astro (`astro.config.mjs`) desde los paquetes de Fontsource: `font-display` (Barlow Condensed 600/700/800) y `font-sans` (Barlow 400/500/600/700). Se precarga la Condensed 800.
- **Utilidades**: `eyebrow`, `display-heading`, `text-section` / `text-hero` / `text-cta`, `section-pad`, `page-gutter` y `page-container`.
- **Breakpoint**: el diseño tiene uno solo, 760px, y `md:` está redefinido a ese valor (`--breakpoint-md`).
- **Componentes**: `Button` (variantes `whatsapp`, `rojo`, `marino`, `outline-claro`, `outline-marino`) y `SectionHeading` (eyebrow + h2, tonos `claro`, `concreto` y `marino`).

## Layout

`src/layouts/BaseLayout.astro` arma todas las páginas: `<html lang="es-MX">`, `theme-color`, fuentes, skip link "Saltar al contenido", topbar, header, `<main id="contenido">` y footer. Los metadatos de SEO los pone `<Seo>` (ver [SEO](#seo)); para otras etiquetas del `<head>` está el slot `head` (`<Fragment slot="head">…</Fragment>`).

- **Header** (`src/components/Header.astro`): sticky. Bajo 760px muestra logo, WhatsApp redondo y hamburguesa; desde 760px, logo, los 5 links y el botón de WhatsApp. Entre 760 y 1023px la fila del diseño no cabe, así que el botón de WhatsApp se reduce al redondo de 44px y los espacios se compactan. El cambio es solo CSS.
- **Menú móvil**: el único JS de la página (`<script>` en `Header.astro`). Cambia `aria-expanded` y `aria-label`, y se cierra al tocar un link, con `Escape` (devuelve el foco al botón), al tocar fuera, al salir con Tab o al pasar a escritorio. Al abrirse limita el alto del panel al espacio que queda bajo el header, para que en pantallas bajas el botón de WhatsApp se alcance completo.
- **Menú móvil sin JavaScript**: con `@media (scripting: none)` el botón se cambia por dos links, «Abrir menú» (`#menu-movil`, que se muestra con `:target`) y «Cerrar menú» (`#barra-movil`). Tocar un link del menú también lo cierra.
- **Anchors**: `scroll-behavior: smooth` (si no hay `prefers-reduced-motion`) y `scroll-margin-top: var(--altura-header)` en todo `id` dentro de `<main>`, para que el header no tape el inicio de la sección. Si cambia la altura del header, actualiza `--altura-header` en `global.css`.
- **Footer** (`src/components/Footer.astro`): datos de `site.ts` (`negocio`, `sucursales`, `legal`). El link al aviso de privacidad (`/aviso-de-privacidad`) solo se muestra cuando existe `src/pages/aviso-de-privacidad.astro` (llega en el issue #13), para no publicar un link roto. Los links miden 44px de alto y el foco se ve en blanco sobre el marino (`foco-sobre-marino` en `global.css`).

## Assets

| Asset                 | Dónde                               | Cómo se usa                                                                                                                                                                                                                                               |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo Los May          | `src/components/Logo.astro`         | SVG inline con los textos convertidos a paths. Variantes `marino` (sobre claro) y `blanco` (sobre marino); el ancho va por clase, p. ej. `class="w-[164px]"`.                                                                                             |
| Íconos de línea       | `src/components/Icon.astro`         | `<Icon name="pin" size={20} />`: casco, plano, tienda, capas, caja, documento, tarjeta, pin, telefono, flecha-derecha, chevron-derecha, menu y cerrar. Usan `currentColor` y `aria-hidden`. Los trazos y el tipo `IconName` están en `src/lib/iconos.ts`. |
| Ícono de WhatsApp     | `src/assets/icons/whatsapp.svg`     | Lo pone `Button` en la variante `whatsapp`.                                                                                                                                                                                                               |
| Sello Holcim          | `src/components/HolcimSeal.astro`   | "Distribuidor autorizado", variantes `borde` (hero) y `solido` (producto). Logo en `src/assets/brand/`.                                                                                                                                                   |
| Foto de producto      | `src/components/ProductPhoto.astro` | `<Picture>` 4:5 en AVIF/WebP con varios anchos. Original en `src/assets/images/`.                                                                                                                                                                         |
| Favicons              | `public/`                           | `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` e `icon-192.png` / `icon-512.png` (manifest y logo del JSON-LD) a partir del isotipo. Se regeneran con `npm run favicons` (`scripts/favicons.mjs`).                                                  |
| Imagen para compartir | `public/og.jpg`                     | 1200 × 630, el post de campaña (`docs/design/Post.dc.html`) en horizontal. Se regenera con `npm run og` (`scripts/og-image.mjs`), con las fuentes y assets del sitio y los datos de `site.ts`.                                                            |

Pendientes del cliente (issue #15): archivo oficial y permiso de uso del logo de Holcim, y la foto del producto en alta resolución.

## Contenido

Todo el contenido editable vive en `src/data/site.ts`: número de WhatsApp y mensajes prellenados, tarjetas de pedido por tonelaje, sucursales (dirección, teléfono, query de Maps y horarios), menú, FAQ, "Para quién", pasos, beneficios, productos y la ficha del cemento. Ningún componente debe tener teléfonos, horarios ni textos de WhatsApp escritos a mano.

- **Helpers**: `waLink(mensaje)`, `mapsLink(direccion)`, `telLink(numero)` y `formatoHorario(horario)`. `wa.general` y `wa.mayoreo` ya traen los links de los botones.
- **Datos por confirmar**: van entre corchetes, como en el diseño (`"Fuera de la ciudad: [zonas]."`), con un `// TODO(cliente)` encima. El componente `<Texto texto={...} />` los resalta en amarillo (`partirPendientes` hace la separación).

## SEO

Todo sale de `src/data/site.ts` (`seo`, `negocio`, `sucursales`, `faq`) y lo pinta `src/components/Seo.astro` desde `BaseLayout`:

- **`<title>` y `meta description`**: `seo.titulo` y `seo.descripcion` (máximo 160 caracteres). Cada página puede cambiarlos con las props `title` y `description` de `BaseLayout`.
- **Canonical** absoluta sobre `site` (`https://losmay.com`, en `astro.config.mjs`), igual en los previews de Vercel.
- **Open Graph y Twitter card** con `public/og.jpg` (1200 × 630, JPEG de ~85 KB). WhatsApp guarda la vista previa de cada URL en caché: si cambia la imagen, cambia también el nombre del archivo (`seo.imagen.src`).
- **JSON-LD** en el `<head>` de la landing: un `@graph` con `WebSite`, `Organization` y una `HardwareStore` por sucursal (dirección, teléfono, `openingHoursSpecification`, mapa y, cuando se confirme, `geo`), en `src/lib/jsonld.ts`; y el `FAQPage` con las respuestas ya confirmadas, en `src/lib/faq-jsonld.ts`.
- **Sitemap** con `@astrojs/sitemap` (`/sitemap-index.xml`) y **`/robots.txt`** (`src/pages/robots.txt.ts`) que apunta a él.
- **No indexar**: las rutas de `seo.rutasSinIndexar` llevan `<meta name="robots" content="noindex, follow">` y se quedan fuera del sitemap. Hoy está el aviso de privacidad, que es un borrador pendiente de aprobación (#13).
- **Manifest** mínimo en `/manifest.webmanifest` (`src/pages/manifest.webmanifest.ts`).

Las pruebas están en `tests/e2e/seo.spec.ts`. El JSON-LD pasa el validador de schema.org sin errores ni advertencias.

### Pendiente después del deploy (manual)

- [ ] Pasar `https://losmay.com/` por el [Rich Results Test](https://search.google.com/test/rich-results) (criterio de aceptación del #11).
- [ ] Compartir `https://losmay.com/` por WhatsApp y revisar que salgan la imagen y el título. Si se compartió antes de que el dominio apuntara a Vercel, WhatsApp puede mostrar la vista previa vieja durante un tiempo; el [Sharing Debugger de Facebook](https://developers.facebook.com/tools/debug/) fuerza a leerla de nuevo.
- [ ] Verificar el dominio en [Google Search Console](https://search.google.com/search-console) como propiedad de **dominio** (registro TXT en el DNS de Hostinger) y enviar `https://losmay.com/sitemap-index.xml`.
- [ ] Cliente: coordenadas del pin de cada sucursal en Google Business para el `geo` del JSON-LD (`geo` en `sucursales`, `site.ts`). Mientras sea `null`, se omite.
- [ ] Recomendación al cliente: tener al día los perfiles de **Google Business** de las 2 sucursales (nombre, dirección, teléfono, horario, fotos y el link a `https://losmay.com/`), con los mismos datos que la página. En búsquedas locales Google se apoya más en esos perfiles que en el sitio.

## Diseño

El diseño de referencia está en [`docs/design/`](docs/design/README.md):

- [`Main.dc.html`](docs/design/Main.dc.html): landing completa (escritorio 1440 px, móvil 390 px). Fuente de verdad de estructura, copy, medidas y colores.
- [`Marca.dc.html`](docs/design/Marca.dc.html): sistema visual.
- [`Post.dc.html`](docs/design/Post.dc.html): post 4:5, referencia para la imagen Open Graph.

El copy de la UI es el del diseño, en español de México. Los datos que faltan confirmar con el cliente se marcan en código con `// TODO(cliente)`.
