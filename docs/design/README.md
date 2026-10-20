# Diseño de referencia

Exportado del canvas de diseño "Los May — Landing mayoreo cemento" (artifact privado en claude.ai).

| Archivo | Qué es |
|---|---|
| `Main.dc.html` | Landing completa, fluida. Escritorio a 1440px y móvil a 390px (breakpoint 760px). **Fuente de verdad** para estructura, copy, medidas y colores. |
| `Marca.dc.html` | Sistema visual: paleta, tipografía, logo plano y reglas de uso. |
| `Post.dc.html` | Post de campaña 4:5. Referencia para la imagen Open Graph. |
| `assets/` | Foto de producto (1536×2048), logo Holcim en blanco y el ícono de WhatsApp. |

Los `.dc.html` son componentes de diseño con estilos inline y plantillas `{{...}}` / `<sc-for>` / `<sc-if>`. No se sirven tal cual: se leen como especificación. Las rutas `/_blob/<id>` corresponden a:

- `7a797ae1…` → `assets/whatsapp.svg`
- `86474a37…` → `assets/holcim-logo-blanco.svg`
- `b27446c7…` → `assets/cemento-holcim-ecoplanet-25kg.jpg`
