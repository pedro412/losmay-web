/**
 * JSON-LD `FAQPage` de schema.org generado desde la FAQ de `site.ts`.
 *
 * Solo entran las preguntas cuya respuesta ya está confirmada: las que todavía
 * tienen un dato entre corchetes ("[zonas]", "[Confirmar…]") se quedan fuera
 * para no publicar placeholders en los resultados de Google. Al confirmar el
 * dato en `site.ts`, la pregunta entra sola.
 *
 * TODO(cliente): zonas, CFDI, formas de pago y crédito (issue #15).
 */
import { tienePendientes, type Pregunta } from "../data/site";

export function faqJsonLd(preguntas: readonly Pregunta[]) {
  const confirmadas = preguntas.filter(
    ({ respuesta }) => !tienePendientes(respuesta),
  );

  if (confirmadas.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: confirmadas.map(({ pregunta, respuesta }) => ({
      "@type": "Question",
      name: pregunta,
      acceptedAnswer: { "@type": "Answer", text: respuesta },
    })),
  };
}

/**
 * Serializa el JSON-LD para un `<script type="application/ld+json">`. Escapa
 * `<` para que ningún texto pueda cerrar la etiqueta `</script>`.
 */
export const serializarJsonLd = (datos: object): string =>
  JSON.stringify(datos).replace(/</g, "\\u003c");
