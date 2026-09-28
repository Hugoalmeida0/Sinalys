import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const api = env.VITE_API_URL || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      // Artefatos do Playwright são gravados durante o teste; observá-los
      // recarregaria a página em laço.
      watch: { ignored: ["**/e2e/**", "**/playwright-report/**", "**/test-results/**"] },
      // Em desenvolvimento a API fica atrás do mesmo host do frontend: os
      // cookies de sessão são de primeira parte e não há CORS a configurar.
      proxy: { "/api": { target: api, changeOrigin: true } },
    },
    preview: {
      port: 4173,
      proxy: { "/api": { target: api, changeOrigin: true } },
    },
  };
});
