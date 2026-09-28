import { type Page, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export type Achado = {
  tipo: "scroll-horizontal" | "elemento-vazando" | "fora-da-viewport" | "alvo-pequeno" | "scroll-travado";
  rotulo: string;
  detalhe: string;
};

const DIR_SHOTS = path.join("e2e", "__screenshots__");

/**
 * Varre o DOM procurando elementos que ultrapassam a largura da viewport.
 * Ignora quem está dentro de um container com overflow-x rolável (tabelas e
 * faixas de abas são legitimamente mais largas que a tela).
 */
export async function auditarLayout(page: Page, rotulo: string): Promise<Achado[]> {
  return page.evaluate((rotuloInterno) => {
    const achados: { tipo: string; rotulo: string; detalhe: string }[] = [];
    const larguraVp = window.innerWidth;
    const alturaVp = window.innerHeight;
    const doc = document.documentElement;

    const identificar = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 4).join(".")}`
        : "";
      const texto = (el.textContent ?? "").trim().slice(0, 40);
      return `${tag}${id}${cls}${texto ? ` "${texto}"` : ""}`;
    };

    const dentroDeScrollHorizontal = (el: Element) => {
      let atual: Element | null = el.parentElement;
      while (atual && atual !== doc) {
        const ox = getComputedStyle(atual).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
        atual = atual.parentElement;
      }
      return false;
    };

    if (doc.scrollWidth > doc.clientWidth + 1) {
      achados.push({
        tipo: "scroll-horizontal",
        rotulo: rotuloInterno,
        detalhe: `scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`,
      });
    }

    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const estilo = getComputedStyle(el);
      if (estilo.display === "none" || estilo.visibility === "hidden" || estilo.opacity === "0") continue;

      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      // Elemento mais largo que a tela, sem um container rolável que justifique.
      if ((r.right > larguraVp + 1 || r.left < -1) && !dentroDeScrollHorizontal(el)) {
        achados.push({
          tipo: "elemento-vazando",
          rotulo: rotuloInterno,
          detalhe: `${identificar(el)} → left=${Math.round(r.left)} right=${Math.round(r.right)} (vp=${larguraVp})`,
        });
      }

      // Overlay fixo com parte fora da área visível — a falha do chatbot.
      if (estilo.position === "fixed" && (r.top < -1 || r.bottom > alturaVp + 1)) {
        const area = r.width * r.height;
        if (area > 20000) {
          achados.push({
            tipo: "fora-da-viewport",
            rotulo: rotuloInterno,
            detalhe: `${identificar(el)} → top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} (altura vp=${alturaVp})`,
          });
        }
      }
    }

    // Alvos de toque. Reportado como aviso, não como falha.
    const clicaveis = document.body.querySelectorAll('button, a, [role="button"], [role="tab"], input, select');
    for (const el of Array.from(clicaveis)) {
      const estilo = getComputedStyle(el);
      if (estilo.display === "none" || estilo.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 40 || r.width < 40) {
        achados.push({
          tipo: "alvo-pequeno",
          rotulo: rotuloInterno,
          detalhe: `${identificar(el)} → ${Math.round(r.width)}x${Math.round(r.height)}px`,
        });
      }
    }

    return achados;
  }, rotulo) as Promise<Achado[]>;
}

/** Achados que reprovam o teste. Alvo de toque pequeno é só aviso. */
export function bloqueantes(achados: Achado[]): Achado[] {
  return achados.filter((a) => a.tipo !== "alvo-pequeno");
}

export async function screenshot(page: Page, projeto: string, nome: string) {
  const dir = path.join(DIR_SHOTS, projeto);
  fs.mkdirSync(dir, { recursive: true });
  const seguro = nome.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  // `scale: "css"` evita estourar o limite de 32767px do WebKit em páginas
  // longas quando o perfil tem deviceScaleFactor 3.
  await page.screenshot({ path: path.join(dir, `${seguro}.png`), fullPage: true, scale: "css" });
}

/** Acumula achados num arquivo único para eu revisar tudo de uma vez. */
export function registrar(projeto: string, achados: Achado[]) {
  if (achados.length === 0) return;
  const dir = path.join("e2e", ".artifacts");
  fs.mkdirSync(dir, { recursive: true });
  const arquivo = path.join(dir, `achados-${projeto}.jsonl`);
  const linhas = achados.map((a) => JSON.stringify(a)).join("\n");
  fs.appendFileSync(arquivo, linhas + "\n", "utf8");
}

/**
 * Vigia erros de runtime da página.
 *
 * Violações de fronteira servidor/cliente (passar função como prop para um
 * client component, por exemplo) não aparecem no tsc nem no ESLint: só
 * estouram ao renderizar. Sem isso, a suíte passava com a tela quebrada.
 */
/**
 * Ruído conhecido do motor de teste, que não indica problema na aplicação:
 *
 * - `interactive-widget`: chave de viewport que o WebKit ainda não conhece e
 *   simplesmente ignora. É intencional — serve ao Chrome, onde faz o layout
 *   reagir ao teclado virtual.
 * - prefetch RSC bloqueado: o WebKit sob automação recusa alguns `_rsc=`, mas
 *   a navegação segue normalmente pelo caminho completo.
 */
const RUIDO_CONHECIDO = [
  /Viewport argument key "interactive-widget"/i,
  /_rsc=.*due to access control checks/i,
  /favicon/i,
  /net::ERR_/i,
  /Failed to load resource/i,
];

const ehRuido = (texto: string) => RUIDO_CONHECIDO.some((re) => re.test(texto));

export function vigiarErros(page: Page) {
  const erros: string[] = [];

  page.on("pageerror", (e) => {
    if (ehRuido(e.message)) return;
    erros.push(`pageerror: ${e.message.slice(0, 300)}`);
  });

  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const texto = m.text();
    if (ehRuido(texto)) return;
    erros.push(`console: ${texto.slice(0, 300)}`);
  });

  page.on("response", (r) => {
    if (r.status() >= 500) erros.push(`HTTP ${r.status()} em ${r.url()}`);
  });

  return () => Array.from(new Set(erros));
}

export async function logar(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  // Os campos já vêm preenchidos com as credenciais de demonstração.
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
  await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
}

/** Espera a página assentar: fontes, imagens e animações. */
export async function assentar(page: Page) {
  await page.waitForLoadState("domcontentloaded");

  // O contexto de execução pode ser descartado no meio do evaluate enquanto a
  // navegação ainda está trocando o documento — basta esperar e tentar de novo.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      await page.evaluate(() => document.fonts?.ready);
      break;
    } catch {
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  // No SPA os dados chegam depois do DOM: espera sair a tela de abertura e os
  // esqueletos de carregamento, para auditar a tela real e não o placeholder.
  await page
    .waitForFunction(() => !document.querySelector('[role="status"][aria-label^="Carregando"]'), undefined, {
      timeout: 30_000,
    })
    .catch(() => {});

  await page.waitForTimeout(400);
}
