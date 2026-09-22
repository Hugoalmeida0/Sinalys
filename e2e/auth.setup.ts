import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ARQUIVO_ESTADO = path.join("e2e", ".auth", "estado.json");

setup("autenticar", async ({ page }) => {
  fs.mkdirSync(path.dirname(ARQUIVO_ESTADO), { recursive: true });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible({ timeout: 60_000 });

  // Sem esperar a hidratação, o clique dispara o submit nativo do form (GET com
  // as credenciais na query string) em vez do handler React.
  await page.waitForLoadState("networkidle");
  await expect
    .poll(
      async () => {
        const alvo = page.getByRole("button", { name: "Mostrar senha" });
        if ((await alvo.count()) === 0) return false;
        await alvo.click();
        return (await page.locator('input[name="senha"]').getAttribute("type")) === "text";
      },
      { timeout: 90_000, message: "React não hidratou a tela de login" }
    )
    .toBe(true);
  await page.getByRole("button", { name: "Ocultar senha" }).click();

  await page.locator('input[name="email"]').fill("ana.souza@globalsys.com");
  await page.locator('input[name="senha"]').fill("sinalys123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90_000 });
  await expect(page.locator("main")).toBeVisible({ timeout: 60_000 });

  // O tour de primeira visita cobre a tela inteira e intercepta os cliques.
  // Marcá-lo como visto no estado compartilhado deixa os demais testes livres;
  // quem precisa dele (o teste do próprio tour) limpa a chave e recarrega.
  await page.evaluate(() => localStorage.setItem("sinalys:tour-concluido", "1"));

  await page.context().storageState({ path: ARQUIVO_ESTADO });
});
