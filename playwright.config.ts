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
    command: "npm run build && npm run preview -- --port 4400",
    url: "http://localhost:4400",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
