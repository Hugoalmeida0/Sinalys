export const CHAVE_ATRIBUTO_HEALTH_PUBLICO = "health_publico";

export const MAX_DESTAQUES_HEALTH = 6;

export const DESTAQUES_AUTOMATICOS = 3;
export const MAX_TAMANHO_LINK_AGENDAMENTO = 500;

export interface BeneficioPlano {
  codigo: string;
  texto: string;
}

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
  destaques: string[] | null;

  beneficios: string[] | null;

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

export function serializarConfigHealthPublico(config: ConfigHealthPublico): Record<string, unknown> {
  return {
    destaques: config.destaques,
    beneficios: config.beneficios,
    link_agendamento: config.linkAgendamento,
    atualizado_em: config.atualizadoEm,
  };
}

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

export function resolverBeneficios(config: ConfigHealthPublico): BeneficioPlano[] {
  if (config.beneficios == null) return BENEFICIOS_PLANO;
  const escolhidos = new Set(config.beneficios);
  return BENEFICIOS_PLANO.filter((b) => escolhidos.has(b.codigo));
}

export function textoDestaque(rotuloMetrica: string): string {
  return `${rotuloMetrica}: dentro do esperado`;
}

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
