import { test, expect, type Page } from "@playwright/test";
import {
  auditarLayout,
  bloqueantes,
  registrar,
  screenshot,
  assentar,
  vigiarErros,
  type Achado,
} from "./auditoria";

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

/**
 * Aba da faixa rolável. Buscar só pelo nome acessível é ambíguo: "Notificações"
 * também é o rótulo do sino no header.
 */
function aba_(page: Page, nome: string) {
  return page
    .locator("[data-aba-ativa]")
    .filter({ hasText: new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
}

/**
 * Navega tolerando navegações que o próprio app dispara.
 *
 * O RecalculoFilaGate chama `router.refresh()` quando termina de recalcular a
 * fila, e esse refresh pode atropelar o goto do teste ("interrupted by another
 * navigation"). É comportamento legítimo da aplicação, então quem se adapta é
 * o teste.
 */
async function irPara(page: Page, caminho: string) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      await page.goto(caminho, { waitUntil: "domcontentloaded" });
      break;
    } catch (e) {
      const msg = (e as Error).message;
      const atropelado = /interrupted by another navigation|Execution context was destroyed/i.test(msg);
      if (!atropelado || tentativa === 2) throw e;
      await page.waitForTimeout(700);
    }
  }
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
    const erros = vigiarErros(page);

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

    expect(erros(), "erros de runtime:\n  " + erros().join("\n  ")).toHaveLength(0);

    const problemas = bloqueantes(todos);
    expect(problemas, formatar(problemas)).toHaveLength(0);
  });

  test("assistente virtual", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    await irPara(page, "/");

    // No mobile o gatilho é o mascote no centro da navegação inferior.
    const gatilho = page.getByRole("button", { name: "Falar com a Sinalys", exact: true });
    await expect(gatilho).toBeVisible();
    await expect(gatilho, "o gatilho do assistente precisa estar ao alcance do polegar").toBeInViewport();
    await gatilho.click();

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

  test("aviso de implementacao futura", async ({ page }, info) => {
    const projeto = info.project.name;
    const todos: Achado[] = [];

    await irPara(page, "/clientes");

    const exportar = page.getByRole("button", { name: /exportar/i }).first();
    await expect(exportar).toBeVisible();
    await exportar.click();

    const aviso = page.getByRole("status").filter({ hasText: /implementação futura/i });
    await expect(aviso, "o controle decorativo precisa dar algum retorno").toBeVisible();
    await expect(aviso).toBeInViewport();

    await auditar(page, projeto, "aviso-implementacao-futura", todos);

    // Some sozinho, sem exigir ação de quem está usando.
    await expect(aviso).toBeHidden({ timeout: 10_000 });

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
      const botao = aba_(page, aba);
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
      const botao = aba_(page, aba);
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

      const seletor = 'main button:visible, main [role="button"]:visible, main summary:visible';
      const total = Math.min(await page.locator(seletor).count(), 25);

      for (let i = 0; i < total; i++) {
        const alvo = page.locator(seletor).nth(i);
        if ((await alvo.count()) === 0) continue;

        const nome = ((await alvo.getAttribute("aria-label")) ?? (await alvo.innerText()) ?? "").trim();
        if (!nome || proibido(nome)) continue;

        await alvo.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(350);
        await auditar(page, projeto, `clique-${rota.nome}-${i}-${nome.slice(0, 20)}`, todos);

        // Fecha o que tiver aberto. Só recarrega se o clique navegou para fora
        // da rota — recarregar a cada controle torna a varredura inviável.
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(150);
        if (!page.url().includes(rota.caminho === "/" ? "/" : rota.caminho)) {
          await irPara(page, rota.caminho);
        }
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
