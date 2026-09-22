import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ESTADO = "e2e/.auth/estado.json";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "e2e/.artifacts/resultado.json" }]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // A máquina tem inspeção TLS corporativa; sem isso o Chromium recusa a produção.
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "iphone-se",
      dependencies: ["setup"],
      use: {
        ...devices["iPhone SE"],
        viewport: { width: 375, height: 667 },
        storageState: ESTADO,
      },
    },
    {
      // Altura real visível no Safari do iPhone SE, já descontada a barra de URL.
      // É este perfil que expõe overlays dimensionados com `vh`.
      name: "iphone-se-safari",
      dependencies: ["setup"],
      use: {
        ...devices["iPhone SE"],
        viewport: { width: 375, height: 553 },
        storageState: ESTADO,
      },
    },
    {
      name: "iphone-14-pro",
      dependencies: ["setup"],
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 393, height: 852 },
        storageState: ESTADO,
      },
    },
    {
      name: "galaxy-s8",
      dependencies: ["setup"],
      use: {
        ...devices["Galaxy S8"],
        viewport: { width: 360, height: 740 },
        storageState: ESTADO,
      },
    },
  ],
});
