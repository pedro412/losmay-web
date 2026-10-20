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

## Diseño

El diseño de referencia está en [`docs/design/`](docs/design/README.md):

- [`Main.dc.html`](docs/design/Main.dc.html): landing completa (escritorio 1440 px, móvil 390 px). Fuente de verdad de estructura, copy, medidas y colores.
- [`Marca.dc.html`](docs/design/Marca.dc.html): sistema visual.
- [`Post.dc.html`](docs/design/Post.dc.html): post 4:5, referencia para la imagen Open Graph.

El copy de la UI es el del diseño, en español de México. Los datos que faltan confirmar con el cliente se marcan en código con `// TODO(cliente)`.
