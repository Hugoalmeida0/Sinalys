/**
 * Personalização da página pública de Health Score (/health/[token]).
 *
 * Persistida em `entidades.atributos.health_publico` (jsonb) em vez de uma
 * coluna própria: não exige migration, e a ingestão faz merge de `atributos`
 * (lib/ingestao/normalizar.ts) — uma reimportação da planilha não apaga a
 * escolha do CS. Este módulo é client-safe (sem Supabase): o modal de
 * personalização e a rota de escrita compartilham as mesmas regras.
 */

export const CHAVE_ATRIBUTO_HEALTH_PUBLICO = "health_publico";

/** Máximo de destaques positivos que a página exibe (chips ficam ilegíveis além disso). */
export const MAX_DESTAQUES_HEALTH = 6;
/** Quantos destaques entram no modo automático (sem escolha do CS). */
export const DESTAQUES_AUTOMATICOS = 3;
export const MAX_TAMANHO_LINK_AGENDAMENTO = 500;

export interface BeneficioPlano {
  /** Estável entre deploys — é o que fica gravado na escolha do CS. */
  codigo: string;
  texto: string;
}

/**
 * Perks fixos do plano, exibidos para todo cliente (fictícios — não existe
 * ainda um cadastro real de benefícios por plano). O objetivo não é
 * informativo: é dar ao CS um motivo positivo concreto para abrir a
 * conversa de retenção, em vez de uma lista genérica de "estamos aqui pra
 * ajudar".
 */
export const BENEFICIOS_PLANO: BeneficioPlano[] = [
  {
    codigo: "suporte_prioritario",
    texto: "Suporte prioritário, com tempo de resposta reduzido para chamados críticos",
  },
  {
    codigo: "consultoria_trimestral",
    texto: "Consultoria estratégica trimestral com seu time de sucesso",
  },
  {
    codigo: "acesso_antecipado",
    texto: "Acesso antecipado a novos recursos antes do lançamento geral",
  },
];

export interface ConfigHealthPublico {
  /**
   * `codigo_sinal` dos sinais que o CS escolheu destacar; `null` = automático
   * (os primeiros N sinais dentro do esperado, ordem do motor). Um sinal
   * escolhido que passe a ser acionado depois é omitido na renderização —
   * nunca vira "destaque" um sinal ruim.
   */
  destaques: string[] | null;
  /** Códigos de `BENEFICIOS_PLANO` exibidos; `null` = todos. */
  beneficios: string[] | null;
  /** URL de agendamento externo (Calendly, Google Agenda…); `null` = formulário embutido. */
  linkAgendamento: string | null;
  atualizadoEm: string | null;
}

export const CONFIG_HEALTH_PADRAO: ConfigHealthPublico = {
  destaques: null,
  beneficios: null,
  linkAgendamento: null,
  atualizadoEm: null,
};

function listaDeStrings(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null;
  return valor.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Lê a config gravada em `atributos`; qualquer forma inesperada cai no padrão. */
export function lerConfigHealthPublico(atributos: unknown): ConfigHealthPublico {
  if (!atributos || typeof atributos !== "object") return CONFIG_HEALTH_PADRAO;
  const bruto = (atributos as Record<string, unknown>)[CHAVE_ATRIBUTO_HEALTH_PUBLICO];
  if (!bruto || typeof bruto !== "object") return CONFIG_HEALTH_PADRAO;
  const cfg = bruto as Record<string, unknown>;
  const link = typeof cfg.link_agendamento === "string" ? cfg.link_agendamento.trim() : "";
  return {
    destaques: listaDeStrings(cfg.destaques),
    beneficios: listaDeStrings(cfg.beneficios),
    linkAgendamento: link || null,
    atualizadoEm: typeof cfg.atualizado_em === "string" ? cfg.atualizado_em : null,
  };
}

/** Forma gravada no jsonb (snake_case, como o resto de `atributos`). */
export function serializarConfigHealthPublico(config: ConfigHealthPublico): Record<string, unknown> {
  return {
    destaques: config.destaques,
    beneficios: config.beneficios,
    link_agendamento: config.linkAgendamento,
    atualizado_em: config.atualizadoEm,
  };
}

/**
 * Só http(s): o link vai para um `<a target="_blank">` numa página pública,
 * então `javascript:` ou esquemas exóticos não passam. Retorna `null` para
 * vazio (sem link) e uma mensagem de erro quando inválido.
 */
export function validarLinkAgendamento(
  valor: unknown
): { link: string | null; erro?: undefined } | { link?: undefined; erro: string } {
  if (valor == null) return { link: null };
  if (typeof valor !== "string") return { erro: "Link de agendamento deve ser um texto." };
  const texto = valor.trim();
  if (!texto) return { link: null };
  if (texto.length > MAX_TAMANHO_LINK_AGENDAMENTO) {
    return { erro: `Link de agendamento deve ter no máximo ${MAX_TAMANHO_LINK_AGENDAMENTO} caracteres.` };
  }
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return { erro: "Link de agendamento inválido. Use uma URL completa, começando com https://." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { erro: "Link de agendamento precisa começar com http:// ou https://." };
  }
  return { link: url.toString() };
}

/** Resolve os benefícios exibidos a partir da escolha gravada (códigos desconhecidos são ignorados). */
export function resolverBeneficios(config: ConfigHealthPublico): BeneficioPlano[] {
  if (config.beneficios == null) return BENEFICIOS_PLANO;
  const escolhidos = new Set(config.beneficios);
  return BENEFICIOS_PLANO.filter((b) => escolhidos.has(b.codigo));
}

/** Frase exibida na página pública para um sinal dentro do esperado. */
export function textoDestaque(rotuloMetrica: string): string {
  return `${rotuloMetrica}: dentro do esperado`;
}

/**
 * Resolve os destaques exibidos: escolha do CS (na ordem em que escolheu,
 * só entre os sinais que continuam dentro do esperado) ou modo automático.
 */
export function resolverDestaques(
  config: ConfigHealthPublico,
  candidatos: { codigo: string; rotulo: string }[]
): string[] {
  if (config.destaques == null) {
    return candidatos.slice(0, DESTAQUES_AUTOMATICOS).map((c) => textoDestaque(c.rotulo));
  }
  const porCodigo = new Map(candidatos.map((c) => [c.codigo, c.rotulo]));
  return config.destaques
    .filter((codigo) => porCodigo.has(codigo))
    .slice(0, MAX_DESTAQUES_HEALTH)
    .map((codigo) => textoDestaque(porCodigo.get(codigo)!));
}
