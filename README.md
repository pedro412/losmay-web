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
- **Header simplificado** (`<BaseLayout headerSimple>`, prop `simple` de `Header`): para páginas fuera de la landing, como el aviso de privacidad. Solo el logo (lleva a `/`) y el botón de WhatsApp, sin links a las secciones ni hamburguesa. Mide lo mismo que el completo.
- **Menú móvil**: el único JS propio de la página (`<script>` en `Header.astro`; en producción se suma el de GA4, ver [Analytics](#analytics-ga4)). Cambia `aria-expanded` y `aria-label`, y se cierra al tocar un link, con `Escape` (devuelve el foco al botón), al tocar fuera, al salir con Tab o al pasar a escritorio. Al abrirse limita el alto del panel al espacio que queda bajo el header, para que en pantallas bajas el botón de WhatsApp se alcance completo.
- **Menú móvil sin JavaScript**: con `@media (scripting: none)` el botón se cambia por dos links, «Abrir menú» (`#menu-movil`, que se muestra con `:target`) y «Cerrar menú» (`#barra-movil`). Tocar un link del menú también lo cierra.
- **Anchors**: `scroll-behavior: smooth` (si no hay `prefers-reduced-motion`) y `scroll-margin-top: var(--altura-header)` en todo `id` dentro de `<main>`, para que el header no tape el inicio de la sección. Si cambia la altura del header, actualiza `--altura-header` en `global.css`.
- **Footer** (`src/components/Footer.astro`): datos de `site.ts` (`negocio`, `sucursales`, `legal`). La línea legal enlaza al [aviso de privacidad](#aviso-de-privacidad) (`/aviso-de-privacidad`); el link solo se pinta si existe `src/pages/aviso-de-privacidad.astro`, para no publicar nunca un link roto. Los links miden 44px de alto y el foco se ve en blanco sobre el marino (`foco-sobre-marino` en `global.css`).

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

## Analytics (GA4)

Google Analytics 4 con `gtag.js`, sin Partytown, y eventos de clic en los botones de conversión (issue [#12](https://github.com/pedro412/losmay-web/issues/12)). Código: `src/components/Analytics.astro` (en el `<head>` de `BaseLayout`) y `src/lib/analytics.ts`.

### Cuándo se carga

`gtag.js` solo se carga y solo se manda algo cuando se cumplen las cuatro condiciones:

| Condición                                                 | Dónde se revisa | Si no se cumple                            |
| --------------------------------------------------------- | --------------- | ------------------------------------------ |
| `PUBLIC_GA_ID` definido (ver `.env.example`)              | build (`idGa`)  | el `<script>` ni siquiera se genera        |
| Build de producción (`import.meta.env.PROD`)              | build           | `npm run dev` no lleva nada                |
| En Vercel, entorno `production` (`VERCEL_ENV`)            | build           | los previews no llevan nada                |
| El dominio es `losmay.com` o `www.losmay.com` (`hostsGa`) | navegador       | en localhost y `*.vercel.app` no hace nada |

La variable va solo en el entorno **Production** de Vercel, así que los previews ya no la tienen; las otras dos revisiones son por si alguien la agrega donde no va. Un ID con formato inválido detiene el build. Las variables `PUBLIC_*` se escriben en el HTML al compilar: después de agregar o cambiar el ID hay que volver a publicar.

### Eventos

Un solo listener en `document` lee `data-track` y los parámetros (`data-ubicacion`, `data-sucursal`) del link que se tocó. Los componentes no llevan JS; solo ponen los atributos con `track()`:

```astro
<a href={wa.general} {...track("click_whatsapp", { ubicacion: "hero" })}>
```

| Evento              | Parámetros                                                                                                          | Dónde                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `click_whatsapp`    | `ubicacion`: `header`, `menu_movil`, `hero`, `pedido_16t`, `pedido_24t`, `pedido_32t`, `pedido_mas32t`, `cta_final` | todos los botones de WhatsApp |
| `click_llamar`      | `sucursal`: `santa_rosalia`, `santa_isabel`; `ubicacion`: `sucursales`, `footer`                                    | links `tel:`                  |
| `click_como_llegar` | `sucursal`: `santa_rosalia`, `santa_isabel`                                                                         | links de Google Maps          |

`header` cubre los tres botones de WhatsApp de la barra (redondo en móvil, redondo en escritorio compacto y verde desde 1024px). Los tipos de `track()` solo aceptan esos eventos y ubicaciones: para un botón nuevo, agrega su `ubicacion` a `UbicacionWhatsApp` o `UbicacionLlamar` en `src/lib/analytics.ts`.

Las pruebas (`tests/e2e/analytics.spec.ts`) compilan con un ID falso, sirven el build como si fuera `https://losmay.com` e interceptan las requests a Google con `page.route`, así que no sale nada a la red. Revisan que `window.dataLayer` reciba cada evento con sus parámetros y que en localhost no se cargue nada.

### DebugView

Abre `https://losmay.com/?debug_mode=1` (o usa la extensión Google Analytics Debugger): los hits de esa visita salen en GA4 → Administrar → DebugView en unos segundos. Toca cada botón y revisa que llegue el evento con su `ubicacion` o `sucursal`.

### Convención de UTMs

GA4 toma solo los parámetros UTM de la URL de entrada; los links internos y los de WhatsApp no llevan UTMs. Para los posts, anuncios y perfiles:

- Todo en minúsculas, sin acentos ni espacios, con guiones: `mayoreo-holcim`, no `Mayoreo Holcim`.
- `utm_source`: de dónde viene la visita: `facebook`, `instagram`, `whatsapp`, `google`.
- `utm_medium`: `social` (publicación orgánica o estado de WhatsApp), `paid_social` (anuncio pagado en Meta), `cpc` (anuncio de Google), `organic` (perfil de Google Business). Con estos valores GA4 asigna bien los canales.
- `utm_campaign`: la campaña, igual en todas las piezas: `mayoreo-holcim`. Si hay varias temporadas, con el mes: `mayoreo-holcim-2026-11`.
- `utm_content`: la pieza concreta, para comparar: `post-4x5`, `video-15s`, `historia-1`.

| Pieza                        | URL                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Post orgánico en Facebook    | `https://losmay.com/?utm_source=facebook&utm_medium=social&utm_campaign=mayoreo-holcim&utm_content=post-4x5`        |
| Anuncio en Instagram         | `https://losmay.com/?utm_source=instagram&utm_medium=paid_social&utm_campaign=mayoreo-holcim&utm_content=video-15s` |
| Estado de WhatsApp           | `https://losmay.com/?utm_source=whatsapp&utm_medium=social&utm_campaign=mayoreo-holcim&utm_content=estado`          |
| Sitio web en Google Business | `https://losmay.com/?utm_source=google&utm_medium=organic&utm_campaign=google-business`                             |

El [Campaign URL Builder](https://ga-dev-tools.google/campaign-url-builder/) arma las URLs. No pongas UTMs en la canónica ni en links dentro del sitio.

### Pendiente (manual)

- [ ] Cliente: propiedad de GA4 de Los May, o crearla nosotros y transferirla (issue #15). Flujo de datos web para `https://losmay.com`.
- [ ] Agregar `PUBLIC_GA_ID` en Vercel, solo en **Production**, y volver a publicar.
- [ ] En GA4 → Administrar → Definiciones personalizadas: crear las dimensiones de evento `ubicacion` y `sucursal` (sin esto los parámetros no salen en los informes, solo en DebugView).
- [ ] Marcar `click_whatsapp` como **evento clave** (Administrar → Eventos clave → Nuevo evento clave, nombre exacto `click_whatsapp`).
- [ ] Probar con DebugView en `https://losmay.com/?debug_mode=1` que lleguen los tres eventos con su `ubicacion` / `sucursal`, y que en un preview de Vercel no se mande nada.
- [ ] Recomendado: retención de datos en 14 meses (Administrar → Recopilación y conservación de datos).
- [ ] Hoy la Content-Security-Policy de `vercel.json` solo trae `frame-ancestors`. Si se le agregan `script-src` o `connect-src`, permitir `https://www.googletagmanager.com` en `script-src` y `https://*.google-analytics.com` y `https://*.analytics.google.com` en `connect-src`.

El [aviso de privacidad](#aviso-de-privacidad) explica las cookies e identificadores de Google Analytics. Si se agrega un evento o se cambia qué se mide, revisa que el aviso lo siga cubriendo.

## Aviso de privacidad

`/aviso-de-privacidad` (issue [#13](https://github.com/pedro412/losmay-web/issues/13)), en `src/pages/aviso-de-privacidad.astro` con el mismo layout, el header simplificado y el footer. El texto vive en `avisoPrivacidad` de `src/data/site.ts`: secciones con párrafos y listas (los links externos van como `{ texto, href }`).

El texto es un **borrador** nuestro conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares: responsable, datos que se tratan (los que el cliente manda por WhatsApp o por teléfono, y las cookies e identificadores de Google Analytics), finalidades necesarias y secundarias, cookies y cómo desactivarlas, remisiones a Google y Vercel, derechos ARCO, revocación del consentimiento y cambios al aviso. Mientras no lo aprueben Los May o su asesor legal:

- La página muestra arriba el recuadro «Borrador pendiente de aprobación».
- Lleva `noindex` y no sale en el sitemap (`seo.rutasSinIndexar`).
- Razón social, domicilio fiscal, contacto de privacidad y fecha de actualización van entre corchetes, resaltados en amarillo, con `// TODO(cliente)`.

**Banner de cookies: no se pone.** En México la ley no exige un consentimiento previo para cookies de medición como en la Unión Europea; basta con informarlo en el aviso de privacidad, enlazado desde el footer de todas las páginas. Si el asesor legal pide además una leyenda visible sobre las cookies, se puede agregar una barra informativa (sin bloquear GA).

### Pendiente (cliente)

- [ ] Revisión y aprobación del texto por Los May o su asesor legal (criterio de aceptación del #13).
- [ ] Razón social y domicilio fiscal del responsable.
- [ ] Correo o teléfono de contacto para privacidad y solicitudes ARCO.
- [ ] Confirmar si se mandan promociones por WhatsApp o teléfono (finalidad secundaria; si no, se quita).
- [ ] Al aprobarlo: llenar los corchetes y la fecha, poner `borrador: null` en `avisoPrivacidad` y quitar `/aviso-de-privacidad` de `seo.rutasSinIndexar` (vuelve a indexarse y a salir en el sitemap).

## Deploy (Vercel)

Issue [#14](https://github.com/pedro412/losmay-web/issues/14). El proyecto `losmay-web` vive en el team **Moto Isla Pro** de Vercel (plan Pro: el Hobby no permite uso comercial) y está conectado a GitHub:

- Cada push a una rama con PR abierto genera un **preview** (`*.vercel.app`); el bot de Vercel deja el link en el PR.
- Cada merge a `main` publica a **producción** (`https://losmay.com`).
- Vercel detecta Astro solo: `npm run build`, salida `dist/`, sin adapter.
- La versión de Node sale de `engines.node` en `package.json` (`24.x`, igual que `.nvmrc`), que gana sobre la que diga el proyecto en Vercel.

Dominios, DNS y variables de entorno no se configuran desde el repo ni con la CLI: se cambian a mano en el panel de Vercel y en Hostinger (ver pendientes abajo).

### `vercel.json`

| Regla                  | Rutas       | Qué hace                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caché `immutable`      | `/_astro/*` | `Cache-Control: public, max-age=31536000, immutable`. Ahí solo hay archivos con hash en el nombre (CSS, JS, fuentes, imágenes procesadas): si cambian, cambia el nombre. El resto (HTML, `og.jpg`, favicons, sitemap) se queda con la caché por defecto de Vercel, que revalida.             |
| Headers de seguridad   | todas       | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Content-Security-Policy: frame-ancestors 'none'` (nadie puede meter la página en un iframe), `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` sin cámara, micrófono, ubicación, pagos, USB ni Topics. |
| `trailingSlash: false` | todas       | `/aviso-de-privacidad/` redirige (308) a `/aviso-de-privacidad`, la misma URL de la canónica y los links. `trailingSlash: "never"` en `astro.config.mjs` hace que el sitemap también las liste sin diagonal.                                                                                 |

HTTPS y HSTS los pone Vercel (certificado automático para cada dominio). `astro preview` no aplica `vercel.json`: las pruebas (`tests/e2e/vercel.spec.ts`) revisan la configuración contra el `dist/` compilado, y los headers reales se revisan con `curl` después del deploy.

### Pendiente (manual)

En Vercel (Settings → Domains del proyecto `losmay-web`):

- [ ] `losmay.com` ya está asignado al proyecto: dejarlo como dominio principal de **Production**.
- [ ] Agregar `www.losmay.com` con **Redirect to** `losmay.com` (308). El canónico es el apex, sin `www`, igual que `site` en `astro.config.mjs`.
- [ ] Agregar `PUBLIC_GA_ID` solo en el entorno **Production** y volver a publicar (ver [Analytics](#analytics-ga4)).

En Hostinger (DNS de `losmay.com`):

- [ ] Registros `A` de `@`: `216.150.1.1` y `216.150.16.1`.
- [ ] Registro `CNAME` de `www`: `2aed6b4a0bef26c4.vercel-dns-016.com`.
- [ ] Borrar los `A`, `AAAA` o `CNAME` anteriores de `@` y `www` (los del parking o hosting de Hostinger); si quedan, parte de las visitas no llega a Vercel. No tocar `MX` ni `TXT` del correo.
- [ ] Esperar a que Vercel marque los dos dominios como **Valid Configuration** y emita el certificado (minutos a unas horas, según la propagación).

Para revisar (criterio de aceptación del #14):

- [ ] `curl -I https://losmay.com` responde `200` con `strict-transport-security` y los headers de seguridad.
- [ ] `curl -I http://losmay.com` redirige a `https://losmay.com/`.
- [ ] `curl -I https://www.losmay.com` redirige (308) a `https://losmay.com/`.
- [ ] `curl -I https://losmay.com/aviso-de-privacidad/` redirige (308) a `/aviso-de-privacidad`.
- [ ] Un archivo de `/_astro/` (sale en el HTML) responde con `cache-control: public, max-age=31536000, immutable`.
- [ ] El PR de la fase 3 tiene su preview de Vercel y en ese preview no se carga GA4.

Opcional, sin activar: **Vercel Web Analytics** y **Speed Insights** para ver los Core Web Vitals de visitas reales. Se activan en el panel del proyecto y piden agregar su script; si se activan, hay que sumarlos a las remisiones del [aviso de privacidad](#aviso-de-privacidad).

## Diseño

El diseño de referencia está en [`docs/design/`](docs/design/README.md):

- [`Main.dc.html`](docs/design/Main.dc.html): landing completa (escritorio 1440 px, móvil 390 px). Fuente de verdad de estructura, copy, medidas y colores.
- [`Marca.dc.html`](docs/design/Marca.dc.html): sistema visual.
- [`Post.dc.html`](docs/design/Post.dc.html): post 4:5, referencia para la imagen Open Graph.

El copy de la UI es el del diseño, en español de México. Los datos que faltan confirmar con el cliente se marcan en código con `// TODO(cliente)`.
