import type { SupabaseClient } from "@supabase/supabase-js";
import { montarContextoAtual } from "@/lib/ia/contexto";
import type { SinalRisco } from "@/lib/ia/tipos";
import type {
  Evidencia,
  EventoHistorico,
  PontoScore,
  ProximaAcao,
} from "@/lib/mock-data";
import { TIPOS_CONTATO, type TipoContato } from "@/lib/contatos/constantes";
import { PREFIXO_SOLICITACAO_AGENDAMENTO } from "@/lib/health/agendamento";
import type { BaseSimulacao } from "@/lib/motor/simulador";
import type { ClientePainel } from "./tipos";

/** Meses de histórico exibidos no gráfico de evolução do score. */
const MESES_EVOLUCAO = 12;
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Detalhe do cliente na forma que `ClienteHeader`/`ClienteTabs` consomem
 * (mesmos campos do `DetalheCliente` do mock, sobre `ClientePainel`).
 */
export type DetalheClientePainel = ClientePainel & {
  nomeFantasia: string;
  responsavelCS: string;
  evidencias: Evidencia[];
  proximasAcoes: ProximaAcao[];
  avaliacaoIA: string;
  /** `analise_lookalike` do último diagnóstico de IA; null sem diagnóstico. */
  analiseLookalike: string | null;
  /** null = ainda não há diagnóstico de IA gerado para este cliente. */
  diagnosticoGeradoEm: string | null;
  historico: EventoHistorico[];
  evolucaoScore: PontoScore[];
  resumoCliente: string;
  /** Explicação em linguagem natural do "porquê" do score, direto das regras do motor (sem IA). */
  explicacaoRisco: string;
  /**
   * Sinais dentro do esperado (acionado === false), candidatos a "destaque
   * positivo" na página pública — é entre estes que o CS escolhe no modal
   * de compartilhamento. Ordem do motor (mais pesados primeiro).
   */
  destaquesDisponiveis: { codigo: string; rotulo: string }[];
  /** Base do simulador de cenários (lib/motor/simulador.ts). */
  simulacao: BaseSimulacao;
};

const AVALIACAO_SEM_DIAGNOSTICO =
  "Diagnóstico de IA ainda não gerado para este cliente. Gere um diagnóstico para receber a análise prescritiva.";

const ACOES_PADRAO: ProximaAcao[] = [
  { id: "a1", titulo: "Entrar em contato com o cliente", concluida: false },
  { id: "a2", titulo: "Registrar no CRM", concluida: false },
];

/** Severidade pela intensidade do sinal normalizado (0-100) — mesma escala das faixas de risco. */
function severidadeDoSinal(s: SinalRisco): Evidencia["severidade"] {
  const normalizado = s.peso > 0 ? s.pontos / s.peso : 0;
  if (normalizado >= 70) return "critica";
  if (normalizado >= 40) return "alta";
  return "media";
}

function tituloDaEvidencia(s: SinalRisco): string {
  const obs = s.valor_observado ?? {};
  if (obs.omissao === true) return `${s.metrica}: sem dados no período (omissão tratada como risco)`;
  const bruto = obs.valor ?? obs.ultimo_valor;
  const valor = typeof bruto === "number" ? bruto : Number(bruto);
  if (!Number.isFinite(valor)) return `${s.metrica} fora do padrão`;
  const unidade = s.unidade ? ` ${s.unidade}` : "";
  return `${s.metrica} em ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${unidade}, fora do padrão da carteira`;
}

/**
 * Explicabilidade: traduz os sinais acionados pelo motor matemático (peso ×
 * contribuição em pontos, já calculados e persistidos em `motivos_predicao`)
 * em um parágrafo direto sobre por que o score é o que é — sem depender do
 * diagnóstico de IA, que pode não existir ou estar indisponível.
 */
function montarExplicacaoRisco(contexto: {
  pontuacao: number;
  faixa_risco: string | null;
  cobertura: number | null;
  sinais: SinalRisco[];
}): string {
  const acionados = [...contexto.sinais]
    .filter((s) => s.acionado === true)
    .sort((a, b) => b.pontos - a.pontos);

  const abertura = `Score ${Math.round(contexto.pontuacao)}/100 (faixa ${contexto.faixa_risco ?? "indefinida"}).`;

  if (acionados.length === 0) {
    return `${abertura} Nenhum sinal de risco individual foi acionado pelo motor — o score reflete o comportamento geral da conta frente à carteira.`;
  }

  const total = acionados.reduce((soma, s) => soma + s.pontos, 0) || 1;
  const principais = acionados.slice(0, 3).map((s) => {
    const participacao = Math.round((s.pontos / total) * 100);
    const obs = s.valor_observado ?? {};
    const causa =
      obs.omissao === true
        ? "sem dado reportado no período"
        : tituloDaEvidencia(s).replace(`${s.metrica}: `, "").replace(`${s.metrica} `, "");
    return `${s.metrica} (${causa}, responde por ${participacao}% do score)`;
  });

  const cobertura =
    contexto.cobertura != null && contexto.cobertura < 1
      ? ` Apenas ${Math.round(contexto.cobertura * 100)}% das regras do modelo puderam ser avaliadas para este cliente.`
      : "";

  return `${abertura} Principal(is) motivo(s): ${principais.join("; ")}.${cobertura}`;
}

function rotuloMes(iso: string): string {
  const d = new Date(iso);
  return `${MESES_CURTOS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
}

function rotuloTipoContato(tipo: string): string {
  return tipo in TIPOS_CONTATO ? TIPOS_CONTATO[tipo as TipoContato] : tipo;
}

export async function montarDetalheCliente(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  cliente: ClientePainel;
}): Promise<DetalheClientePainel> {
  const { supabase, projetoId, modeloId, cliente } = params;
  const entidade = { id: cliente.entidadeId, id_externo: cliente.id, nome_exibicao: cliente.nome };

  const inicioJanela = new Date();
  inicioJanela.setUTCMonth(inicioJanela.getUTCMonth() - (MESES_EVOLUCAO - 1), 1);
  inicioJanela.setUTCHours(0, 0, 0, 0);

  const [contexto, predicoesRes, diagnosticoRes, contatosRes, eventosRes] = await Promise.all([
    montarContextoAtual({ supabase, projetoId, entidade, modeloId }),
    supabase
      .from("predicoes")
      .select("referencia_em, pontuacao")
      .eq("entidade_id", cliente.entidadeId)
      .eq("modelo_id", modeloId)
      .gte("referencia_em", inicioJanela.toISOString())
      .order("referencia_em", { ascending: true }),
    supabase
      .from("diagnosticos_ia")
      .select("diagnostico_principal, analise_lookalike, plano_acao_imediato, criado_em")
      .eq("projeto_id", projetoId)
      .eq("entidade_id", cliente.entidadeId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contatos")
      .select("id, tipo, realizado_em, resumo, proximo_passo, autor_nome")
      .eq("entidade_id", cliente.entidadeId)
      .order("realizado_em", { ascending: false })
      .limit(50),
    supabase
      .from("eventos_desfecho")
      .select("id, codigo_evento, ocorrido_em")
      .eq("entidade_id", cliente.entidadeId)
      .order("ocorrido_em", { ascending: false })
      .limit(20),
  ]);
  for (const r of [predicoesRes, diagnosticoRes, contatosRes, eventosRes]) {
    if (r.error) throw new Error(`Falha ao montar detalhe do cliente: ${r.error.message}`);
  }

  // Evidências: só sinais acionados, dos mais pesados para os mais leves.
  const acionados = contexto.sinais.filter((s) => s.acionado === true);
  const evidencias: Evidencia[] = acionados.map((s, i) => ({
    id: `e${i + 1}`,
    severidade: severidadeDoSinal(s),
    titulo: tituloDaEvidencia(s),
  }));

  const destaquesDisponiveis = contexto.sinais
    .filter((s) => s.acionado === false)
    .map((s) => ({ codigo: s.codigo_sinal, rotulo: s.metrica }));

  // Simulador: o CS só "resolve" sinais acionados, mas o denominador do
  // score é a soma dos pesos de TODAS as regras avaliáveis (score.ts).
  const simulacao: BaseSimulacao = {
    scoreRisco: cliente.scoreRisco,
    somaPesos: contexto.sinais
      .filter((s) => s.acionado !== null)
      .reduce((soma, s) => soma + s.peso, 0),
    mrr: cliente.mrr,
    impactoRelativo: cliente.impactoRelativo,
    sinais: acionados.map((s) => ({
      codigo: s.codigo_sinal,
      metrica: s.metrica,
      peso: s.peso,
      pontos: s.pontos,
      descricao: tituloDaEvidencia(s),
    })),
  };

  // Evolução: última predição de cada mês da janela.
  const porMes = new Map<string, number>();
  for (const p of predicoesRes.data ?? []) {
    porMes.set(rotuloMes(p.referencia_em), Number(p.pontuacao));
  }
  const evolucaoScore: PontoScore[] = Array.from(porMes, ([mes, score]) => ({
    mes,
    score: Math.round(score),
  }));

  const diagnostico = diagnosticoRes.data;
  const plano = Array.isArray(diagnostico?.plano_acao_imediato)
    ? (diagnostico!.plano_acao_imediato as unknown[]).filter((a): a is string => typeof a === "string")
    : [];
  const proximasAcoes: ProximaAcao[] = plano.length
    ? plano.map((titulo, i) => ({ id: `a${i + 1}`, titulo, concluida: false }))
    : ACOES_PADRAO;

  const historico: EventoHistorico[] = [
    ...(contatosRes.data ?? []).map<EventoHistorico>((c) => ({
      id: `c-${c.id}`,
      data: String(c.realizado_em).slice(0, 10),
      tipo: c.tipo === "reuniao_presencial" || c.tipo === "videochamada" ? "reuniao" : "contato",
      // Pedido de call feito pelo próprio cliente na página pública de Health
      // Score (app/api/health/agendamento) — merece um título próprio na timeline.
      titulo: c.resumo.startsWith(PREFIXO_SOLICITACAO_AGENDAMENTO)
        ? "Cliente pediu uma call de alinhamento"
        : rotuloTipoContato(c.tipo),
      descricao: c.proximo_passo ? `${c.resumo} Próximo passo: ${c.proximo_passo}.` : c.resumo,
      autor: c.autor_nome ?? undefined,
    })),
    ...(eventosRes.data ?? []).map<EventoHistorico>((e) => ({
      id: `ev-${e.id}`,
      data: String(e.ocorrido_em).slice(0, 10),
      tipo: "sistema",
      titulo: `Evento registrado: ${e.codigo_evento}`,
      descricao: "Desfecho importado na ingestão de dados.",
    })),
    ...(diagnostico
      ? [
          {
            id: "ia-ultimo",
            data: String(diagnostico.criado_em).slice(0, 10),
            tipo: "sinal" as const,
            titulo: "Diagnóstico de IA gerado",
            descricao: diagnostico.diagnostico_principal,
          },
        ]
      : []),
  ].sort((a, b) => b.data.localeCompare(a.data));

  const autorMaisRecente = contatosRes.data?.find((c) => c.autor_nome)?.autor_nome;

  return {
    ...cliente,
    nomeFantasia: `${cliente.id} – ${cliente.segmento || contexto.rotulo_entidade}`,
    responsavelCS: autorMaisRecente ?? "Não atribuído",
    evidencias,
    proximasAcoes,
    avaliacaoIA: diagnostico?.diagnostico_principal ?? AVALIACAO_SEM_DIAGNOSTICO,
    analiseLookalike: diagnostico?.analise_lookalike ?? null,
    diagnosticoGeradoEm: diagnostico?.criado_em ?? null,
    historico,
    evolucaoScore,
    explicacaoRisco: montarExplicacaoRisco(contexto),
    destaquesDisponiveis,
    simulacao,
    resumoCliente: [
      `${contexto.rotulo_entidade} do segmento ${cliente.segmento || "não informado"}`,
      cliente.porte ? `de porte ${cliente.porte.toLowerCase()}` : null,
      cliente.tipo ? `com plano ${cliente.tipo}` : null,
    ]
      .filter(Boolean)
      .join(", ")
      .concat(`. ${cliente.resumoAlerta}.`),
  };
}
