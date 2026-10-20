import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas e2e contra el sitio compilado (`astro build` + `astro preview`),
 * igual a lo que se publica en Vercel.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4400",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // `--ignore-lock` deja `astro preview` en primer plano. Sin él, Astro 7
    // se manda solo a segundo plano cuando lo corre un agente de IA: el
    // proceso termina enseguida, Playwright no puede apagarlo al final y el
    // servidor queda huérfano en el puerto 4400.
    command: "npm run build && npm run preview -- --port 4400 --ignore-lock",
    url: "http://localhost:4400",
    // Siempre compila y levanta su propio servidor: si se reusara un
    // `astro preview` que ya estuviera corriendo en el puerto 4400, se
    // probaría el dist/ que hubiera en disco, quizá de un build viejo. Si el
    // puerto está ocupado, Playwright falla con un error claro.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
