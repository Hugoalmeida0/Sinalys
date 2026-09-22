import { test, expect, type Page } from "@playwright/test";
import { auditarLayout, bloqueantes, registrar, screenshot, assentar, type Achado } from "./auditoria";

/**
 * A suíte roda contra produção (E2E_BASE_URL). Por isso nada aqui pode gravar
 * dados: a lista abaixo é a trava. Qualquer controle cujo nome acessível bata
 * com um destes padrões é aberto para inspeção de layout, mas nunca confirmado.
 */
const NUNCA_CLICAR = [
  /sair/i,
  /^entrar$/i,
  /salvar/i,
  /confirmar/i,
  /registrar contato$/i,
  /marcar como/i,
  /silenciar/i,
  /excluir/i,
  /remover/i,
  /enviar/i,
  /processar/i,
  /importar/i,
  /exportar/i,
  /recalcular/i,
  /analisar/i, // dispara chamada de LLM paga
  /gerar/i,
];

function proibido(nome: string) {
  return NUNCA_CLICAR.some((re) => re.test(nome.trim()));
}

const ROTAS_BASE = [
  { caminho: "/", nome: "dashboard" },
  { caminho: "/clientes", nome: "clientes" },
  { caminho: "/ingestao", nome: "ingestao" },
  { caminho: "/playbook", nome: "playbook" },
  { caminho: "/recuperacao", nome: "recuperacao" },
  { caminho: "/relatorios", nome: "relatorios" },
  { caminho: "/configuracoes", nome: "configuracoes" },
];

async function irPara(page: Page, caminho: string) {
  await page.goto(caminho, { waitUntil: "domcontentloaded" });
  await assentar(page);
}

async function auditar(page: Page, projeto: string, rotulo: string, acumulado: Achado[]) {
  const achados = await auditarLayout(page, rotulo);
  registrar(projeto, achados);
  acumulado.push(...achados);
  await screenshot(page, projeto, rotulo);
  return achados;
}

test.describe("responsividade mobile", () => {
  test("rotas principais", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    for (const rota of ROTAS_BASE) {
      await irPara(page, rota.caminho);
      await auditar(page, projeto, `rota-${rota.nome}`, todos);
    }

    // Detalhe do cliente: pega o primeiro da lista.
    await irPara(page, "/clientes");
    const href = await page.locator('a[href^="/clientes/"]').first().getAttribute("href");
    expect(href, "nenhum cliente na lista para abrir o detalhe").toBeTruthy();
    await irPara(page, href!);
    await auditar(page, projeto, "rota-cliente-detalhe", todos);

    const erros = bloqueantes(todos);
    expect(erros, formatar(erros)).toHaveLength(0);
  });

  test("assistente virtual", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    await irPara(page, "/");

    const fab = page.getByRole("button", { name: "Abrir assistente da Sinalys", exact: true });
    await expect(fab).toBeVisible();
    await fab.click();

    const painel = page.getByRole("region", { name: /assistente da sinalys/i });
    await expect(painel).toBeVisible();
    await page.waitForTimeout(300);

    await auditar(page, projeto, "assistente-aberto", todos);

    // O header, o botão de fechar e o campo de entrada precisam estar dentro da
    // área visível — é aqui que o widget quebra hoje.
    const caixa = await painel.boundingBox();
    const altura = page.viewportSize()!.height;
    expect(caixa, "painel do assistente sem caixa").toBeTruthy();
    expect(
      caixa!.y,
      `topo do painel do assistente fora da tela (y=${Math.round(caixa!.y)}, viewport=${altura})`
    ).toBeGreaterThanOrEqual(0);
    expect(
      caixa!.y + caixa!.height,
      `base do painel do assistente fora da tela (bottom=${Math.round(caixa!.y + caixa!.height)}, viewport=${altura})`
    ).toBeLessThanOrEqual(altura + 1);

    const fechar = painel.getByRole("button", { name: /^fechar$/i });
    await expect(fechar, "botão de fechar do assistente não está acessível").toBeInViewport();

    const campo = painel.getByPlaceholder(/pergunte sobre/i);
    await expect(campo, "campo de pergunta não está acessível").toBeInViewport();

    // Fecha por Escape e confirma que a página volta a rolar.
    await page.keyboard.press("Escape");
    await expect(painel).toBeHidden();
    const travado = await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden");
    expect(travado, "scroll da página ficou travado após fechar o assistente").toBe(false);

    const erros = bloqueantes(todos);
    expect(erros, formatar(erros)).toHaveLength(0);
  });

  test("menu mobile", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    await irPara(page, "/");
    await page.getByRole("button", { name: /abrir menu/i }).click();
    await page.waitForTimeout(300);
    await auditar(page, projeto, "menu-mobile-aberto", todos);

    await page.getByRole("button", { name: /^fechar$/i }).first().click();
    await page.waitForTimeout(200);

    const erros = bloqueantes(todos);
    expect(erros, formatar(erros)).toHaveLength(0);
  });

  test("abas do cliente", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    await irPara(page, "/clientes");
    const href = await page.locator('a[href^="/clientes/"]').first().getAttribute("href");
    await irPara(page, href!);

    for (const aba of ["Visão geral", "Sinais de risco", "Simulador", "Plano de ação"]) {
      const botao = page.getByRole("button", { name: aba, exact: true });
      if ((await botao.count()) === 0) continue;

      // A aba precisa estar alcançável na faixa rolável antes do clique.
      await expect(botao, `aba "${aba}" não está visível na faixa de abas`).toBeInViewport();
      await botao.click();
      await page.waitForTimeout(500);
      await auditar(page, projeto, `cliente-aba-${aba}`, todos);
    }

    const erros = bloqueantes(todos);
    expect(erros, formatar(erros)).toHaveLength(0);
  });

  test("abas de configuracoes", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    await irPara(page, "/configuracoes");

    for (const aba of ["Geral", "Integrações", "Modelo de risco", "Usuários", "Notificações"]) {
      const botao = page.getByRole("button", { name: aba, exact: true });
      if ((await botao.count()) === 0) continue;

      await expect(botao, `aba "${aba}" não está visível na faixa de abas`).toBeInViewport();
      await botao.click();
      await page.waitForTimeout(400);
      await auditar(page, projeto, `config-aba-${aba}`, todos);
    }

    const erros = bloqueantes(todos);
    expect(erros, formatar(erros)).toHaveLength(0);
  });

  test("varredura de clicaveis", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    const alvos = [...ROTAS_BASE];

    for (const rota of alvos) {
      await irPara(page, rota.caminho);

      const controles = page.locator(
        'main button:visible, main [role="button"]:visible, main summary:visible'
      );
      const total = Math.min(await controles.count(), 25);

      for (let i = 0; i < total; i++) {
        await irPara(page, rota.caminho);
        const alvo = page
          .locator('main button:visible, main [role="button"]:visible, main summary:visible')
          .nth(i);
        if ((await alvo.count()) === 0) continue;

        const nome = ((await alvo.getAttribute("aria-label")) ?? (await alvo.innerText()) ?? "").trim();
        if (!nome || proibido(nome)) continue;

        await alvo.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(400);
        await auditar(page, projeto, `clique-${rota.nome}-${i}-${nome.slice(0, 20)}`, todos);

        // Devolve a página ao estado neutro.
        await page.keyboard.press("Escape").catch(() => {});
      }
    }

    const erros = bloqueantes(todos);
    expect(erros, formatar(erros)).toHaveLength(0);
  });
});

function formatar(achados: Achado[]) {
  if (achados.length === 0) return "";
  const porTipo = new Map<string, Achado[]>();
  for (const a of achados) {
    const lista = porTipo.get(a.tipo) ?? [];
    lista.push(a);
    porTipo.set(a.tipo, lista);
  }
  const linhas: string[] = [`${achados.length} achado(s) de layout:`];
  for (const [tipo, lista] of porTipo) {
    linhas.push(`\n  [${tipo}] ${lista.length}x`);
    const unicos = Array.from(new Set(lista.map((a) => `${a.rotulo} :: ${a.detalhe}`)));
    for (const d of unicos.slice(0, 12)) linhas.push(`    - ${d}`);
    if (unicos.length > 12) linhas.push(`    ... +${unicos.length - 12}`);
  }
  return linhas.join("\n");
}
