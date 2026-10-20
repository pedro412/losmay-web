/** Variables de entorno públicas (se documentan en `.env.example`). */
interface ImportMetaEnv {
  /**
   * ID de medición de GA4 (`G-XXXXXXXXXX`). Solo se configura en el entorno
   * Production de Vercel; sin él no se carga Analytics (issue #12).
   */
  readonly PUBLIC_GA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
