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

| Script                 | Qué hace                             |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Servidor de desarrollo               |
| `npm run build`        | Genera el sitio estático en `dist/`  |
| `npm run preview`      | Sirve `dist/` localmente             |
| `npm run check`        | `astro check` (tipos y diagnósticos) |
| `npm run format`       | Formatea con Prettier                |
| `npm run format:check` | Verifica el formato sin escribir     |
| `npm run favicons`     | Regenera los favicons en `public/`   |

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

`src/layouts/BaseLayout.astro` arma todas las páginas: `<html lang="es-MX">`, `theme-color`, fuentes, skip link "Saltar al contenido", topbar, header, `<main id="contenido">` y footer. Los metadatos de SEO entran por el slot `head` (`<Fragment slot="head">…</Fragment>`).

- **Header** (`src/components/Header.astro`): sticky. Bajo 760px muestra logo, WhatsApp redondo y hamburguesa; desde 760px, logo, los 5 links y el botón de WhatsApp. Entre 760 y 1023px la fila del diseño no cabe, así que el botón de WhatsApp se reduce al redondo de 44px y los espacios se compactan. El cambio es solo CSS.
- **Menú móvil**: el único JS de la página (`<script>` en `Header.astro`). Cambia `aria-expanded` y `aria-label`, y se cierra al tocar un link, con `Escape` (devuelve el foco al botón), al tocar fuera, al salir con Tab o al pasar a escritorio.
- **Anchors**: `scroll-behavior: smooth` (si no hay `prefers-reduced-motion`) y `scroll-margin-top: var(--altura-header)` en todo `id` dentro de `<main>`, para que el header no tape el inicio de la sección. Si cambia la altura del header, actualiza `--altura-header` en `global.css`.
- **Footer** (`src/components/Footer.astro`): datos de `site.ts` (`negocio`, `sucursales`, `legal`). El link al aviso de privacidad apunta a `/aviso-de-privacidad` (la página llega en el issue #13).

## Assets

| Asset             | Dónde                               | Cómo se usa                                                                                                                                                                                 |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo Los May      | `src/components/Logo.astro`         | SVG inline con los textos convertidos a paths. Variantes `marino` (sobre claro) y `blanco` (sobre marino); el ancho va por clase, p. ej. `class="w-[164px]"`.                               |
| Íconos de línea   | `src/components/Icon.astro`         | `<Icon name="pin" size={20} />`: casco, plano, tienda, capas, caja, documento, tarjeta, pin, telefono, flecha-derecha, chevron-derecha, menu y cerrar. Usan `currentColor` y `aria-hidden`. |
| Ícono de WhatsApp | `src/assets/icons/whatsapp.svg`     | Lo pone `Button` en la variante `whatsapp`.                                                                                                                                                 |
| Sello Holcim      | `src/components/HolcimSeal.astro`   | "Distribuidor autorizado", variantes `borde` (hero) y `solido` (producto). Logo en `src/assets/brand/`.                                                                                     |
| Foto de producto  | `src/components/ProductPhoto.astro` | `<Picture>` 4:5 en AVIF/WebP con varios anchos. Original en `src/assets/images/`.                                                                                                           |
| Favicons          | `public/`                           | `favicon.svg`, `favicon.ico` y `apple-touch-icon.png` a partir del isotipo. Se regeneran con `npm run favicons` (`scripts/favicons.mjs`).                                                   |

Pendientes del cliente (issue #15): archivo oficial y permiso de uso del logo de Holcim, y la foto del producto en alta resolución.

## Contenido

Todo el contenido editable vive en `src/data/site.ts`: número de WhatsApp y mensajes prellenados, tarjetas de pedido por tonelaje, sucursales (dirección, teléfono, query de Maps y horarios), menú, FAQ, "Para quién", pasos, beneficios, productos y la ficha del cemento. Ningún componente debe tener teléfonos, horarios ni textos de WhatsApp escritos a mano.

- **Helpers**: `waLink(mensaje)`, `mapsLink(direccion)`, `telLink(numero)` y `formatoHorario(horario)`. `wa.general` y `wa.mayoreo` ya traen los links de los botones.
- **Datos por confirmar**: van entre corchetes, como en el diseño (`"Fuera de la ciudad: [zonas]."`), con un `// TODO(cliente)` encima. El componente `<Texto texto={...} />` los resalta en amarillo (`partirPendientes` hace la separación).

## Diseño

El diseño de referencia está en [`docs/design/`](docs/design/README.md):

- [`Main.dc.html`](docs/design/Main.dc.html): landing completa (escritorio 1440 px, móvil 390 px). Fuente de verdad de estructura, copy, medidas y colores.
- [`Marca.dc.html`](docs/design/Marca.dc.html): sistema visual.
- [`Post.dc.html`](docs/design/Post.dc.html): post 4:5, referencia para la imagen Open Graph.

El copy de la UI es el del diseño, en español de México. Los datos que faltan confirmar con el cliente se marcan en código con `// TODO(cliente)`.
