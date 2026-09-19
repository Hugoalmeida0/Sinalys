// Dados mockados para visualização do frontend.
// Estrutura inspirada em `docs/modelagem.sql` (entidades, métricas, predições,
// motivos de predição) — sem chamadas reais ao backend/Supabase ainda.

export type FaixaRisco = "critico" | "alerta" | "atencao" | "saudavel";

export type TendenciaScore = "subindo" | "descendo" | "estavel";

export type Cliente = {
  id: string;
  segmento: string;
  porte: "Pequeno" | "Médio" | "Grande";
  tipo: string;
  mrr: number;
  receitaAnualRisco: number;
  scoreRisco: number;
  scoreMax: number;
  faixaRisco: FaixaRisco;
  tendenciaScore: TendenciaScore;
  clienteDesde: string; // ISO date
  resumoAlerta: string;
};

export const clientes: Cliente[] = [
  {
    id: "C061",
    segmento: "Varejo",
    porte: "Grande",
    tipo: "Enterprise",
    mrr: 36148,
    receitaAnualRisco: 309840,
    scoreRisco: 10,
    scoreMax: 18,
    faixaRisco: "critico",
    tendenciaScore: "subindo",
    clienteDesde: "2021-03-12",
    resumoAlerta: "Uso caiu de 85% para 74%; 4 críticos; NPS detrator (6)",
  },
  {
    id: "C080",
    segmento: "Varejo",
    porte: "Grande",
    tipo: "Enterprise",
    mrr: 20924,
    receitaAnualRisco: 251088,
    scoreRisco: 14,
    scoreMax: 18,
    faixaRisco: "critico",
    tendenciaScore: "subindo",
    clienteDesde: "2022-01-08",
    resumoAlerta: "SLA caiu de 76% para 61%; 11 reaberturas; 3 críticos",
  },
  {
    id: "C011",
    segmento: "Varejo",
    porte: "Grande",
    tipo: "Enterprise",
    mrr: 30742,
    receitaAnualRisco: 237152,
    scoreRisco: 9,
    scoreMax: 18,
    faixaRisco: "alerta",
    tendenciaScore: "subindo",
    clienteDesde: "2020-07-22",
    resumoAlerta: "6 críticos; 6 reaberturas; 11 dias de atraso",
  },
  {
    id: "C071",
    segmento: "Varejo",
    porte: "Grande",
    tipo: "Enterprise",
    mrr: 33881,
    receitaAnualRisco: 203286,
    scoreRisco: 7,
    scoreMax: 18,
    faixaRisco: "alerta",
    tendenciaScore: "subindo",
    clienteDesde: "2021-11-02",
    resumoAlerta: "5 críticos; 5 reclamações; NPS detrator (6)",
  },
  {
    id: "C052",
    segmento: "Saúde",
    porte: "Grande",
    tipo: "Enterprise",
    mrr: 28195,
    receitaAnualRisco: 169170,
    scoreRisco: 7,
    scoreMax: 18,
    faixaRisco: "alerta",
    tendenciaScore: "descendo",
    clienteDesde: "2019-09-15",
    resumoAlerta: "SLA caiu de 95% para 77%; 2 reclamações; 11 dias de atraso",
  },
  {
    id: "C034",
    segmento: "Educação",
    porte: "Médio",
    tipo: "Standard",
    mrr: 12430,
    receitaAnualRisco: 74580,
    scoreRisco: 6,
    scoreMax: 18,
    faixaRisco: "atencao",
    tendenciaScore: "estavel",
    clienteDesde: "2022-05-30",
    resumoAlerta: "Uso caiu de 70% para 63%; 1 reabertura",
  },
  {
    id: "C019",
    segmento: "Financeiro",
    porte: "Grande",
    tipo: "Enterprise",
    mrr: 41230,
    receitaAnualRisco: 32000,
    scoreRisco: 3,
    scoreMax: 18,
    faixaRisco: "saudavel",
    tendenciaScore: "estavel",
    clienteDesde: "2018-02-11",
    resumoAlerta: "Todos os indicadores dentro do esperado",
  },
  {
    id: "C045",
    segmento: "Varejo",
    porte: "Pequeno",
    tipo: "Standard",
    mrr: 5210,
    receitaAnualRisco: 62520,
    scoreRisco: 8,
    scoreMax: 18,
    faixaRisco: "alerta",
    tendenciaScore: "subindo",
    clienteDesde: "2023-04-18",
    resumoAlerta: "3 chamados críticos; atraso recorrente no pagamento",
  },
];

export function getFilaDoDia(): Cliente[] {
  return [...clientes]
    .filter((c) => c.faixaRisco === "critico" || c.faixaRisco === "alerta")
    .sort((a, b) => b.receitaAnualRisco - a.receitaAnualRisco);
}

export function getCliente(id: string): Cliente | undefined {
  return clientes.find((c) => c.id === id);
}

export const kpisDashboard = {
  receitaEmRiscoAno: 1_100_000,
  clientesEmAlerta: 16,
  totalCarteira: 58,
  antecedenciaMediaMeses: 4.4,
  antecedenciaMedianaMeses: 4,
  antecedenciaMaximaMeses: 8,
  clientesContatados7d: 12,
};

export type Evidencia = {
  id: string;
  severidade: "critica" | "alta" | "media";
  titulo: string;
};

export type ProximaAcao = {
  id: string;
  titulo: string;
  concluida: boolean;
};

export type EventoHistorico = {
  id: string;
  data: string; // ISO date
  tipo: "contato" | "sinal" | "sistema" | "reuniao";
  titulo: string;
  descricao: string;
  autor?: string;
};

export type DetalheCliente = Cliente & {
  nomeFantasia: string;
  responsavelCS: string;
  evidencias: Evidencia[];
  proximasAcoes: ProximaAcao[];
  avaliacaoIA: string;
  historico: EventoHistorico[];
};

const avaliacaoPadrao =
  "Risco em observação. Recomendamos acompanhar a evolução dos indicadores nas próximas semanas e manter contato regular.";

const detalhesEspecificos: Record<string, Partial<DetalheCliente>> = {
  C080: {
    nomeFantasia: "C080 – Varejo",
    responsavelCS: "Ana Souza",
    evidencias: [
      { id: "e1", severidade: "critica", titulo: "SLA caiu de 76% para 61% (-15 p.p.)" },
      { id: "e2", severidade: "alta", titulo: "11 chamados reabertos no trimestre" },
      { id: "e3", severidade: "critica", titulo: "3 chamados críticos no trimestre" },
      { id: "e4", severidade: "alta", titulo: "13 dias de atraso no pagamento" },
      { id: "e5", severidade: "media", titulo: "2 reuniões previstas não realizadas" },
    ],
    proximasAcoes: [
      { id: "a1", titulo: "Entrar em contato com o gestor", concluida: false },
      { id: "a2", titulo: "Agendar reunião de alinhamento", concluida: false },
      { id: "a3", titulo: "Revisar plano de sucesso do cliente", concluida: false },
      { id: "a4", titulo: "Envolver time técnico", concluida: false },
      { id: "a5", titulo: "Registrar no CRM", concluida: false },
    ],
    avaliacaoIA:
      "Alto risco de cancelamento. Há deterioração consistente nos principais indicadores nos últimos 3 meses.",
    historico: [
      {
        id: "h1",
        data: "2026-09-10",
        tipo: "sinal",
        titulo: "Score de risco subiu de 11 para 14",
        descricao: "Novo atraso de pagamento detectado (13 dias) somado a 2 chamados críticos abertos na semana.",
      },
      {
        id: "h2",
        data: "2026-08-28",
        tipo: "contato",
        titulo: "Ligação com o time financeiro do cliente",
        descricao: "Cliente relatou instabilidade no módulo de faturamento. Prometeu regularizar pagamento em 5 dias úteis.",
        autor: "Ana Souza",
      },
      {
        id: "h3",
        data: "2026-08-14",
        tipo: "reuniao",
        titulo: "Reunião de alinhamento não realizada",
        descricao: "Cliente cancelou a reunião trimestral de acompanhamento sem remarcar.",
      },
      {
        id: "h4",
        data: "2026-07-30",
        tipo: "sistema",
        titulo: "Queda de SLA detectada",
        descricao: "SLA de atendimento caiu de 76% para 61% no período (-15 p.p.).",
      },
      {
        id: "h5",
        data: "2026-06-02",
        tipo: "contato",
        titulo: "Renovação de contrato assinada",
        descricao: "Cliente renovou por mais 12 meses com upgrade de plano.",
        autor: "Ana Souza",
      },
    ],
  },
};

export function getDetalheCliente(id: string): DetalheCliente | undefined {
  const base = getCliente(id);
  if (!base) return undefined;

  const overrides = detalhesEspecificos[id];

  return {
    ...base,
    nomeFantasia: overrides?.nomeFantasia ?? `${base.id} – ${base.segmento}`,
    responsavelCS: overrides?.responsavelCS ?? "Ana Souza",
    evidencias:
      overrides?.evidencias ?? [
        { id: "e1", severidade: "media", titulo: base.resumoAlerta },
      ],
    proximasAcoes:
      overrides?.proximasAcoes ?? [
        { id: "a1", titulo: "Entrar em contato com o cliente", concluida: false },
        { id: "a2", titulo: "Registrar no CRM", concluida: false },
      ],
    avaliacaoIA: overrides?.avaliacaoIA ?? avaliacaoPadrao,
    historico: overrides?.historico ?? [],
  };
}

export const receitaPorSegmento = [
  { segmento: "Varejo", valor: 761_366 },
  { segmento: "Saúde", valor: 169_170 },
  { segmento: "Financeiro", valor: 32_000 },
  { segmento: "Educação", valor: 74_580 },
] as const;

export const evolucaoScoreMedio = [
  { mes: "Abr", score: 6.1 },
  { mes: "Mai", score: 6.6 },
  { mes: "Jun", score: 7.0 },
  { mes: "Jul", score: 7.4 },
  { mes: "Ago", score: 7.9 },
  { mes: "Set", score: 8.3 },
] as const;

export const desfechos90dias = {
  recuperados: 9,
  cancelados: 3,
  emAndamento: 16,
};

export type Playbook = {
  id: string;
  titulo: string;
  gatilho: string;
  categoria: "SLA" | "Financeiro" | "Engajamento" | "Relacionamento";
  clientesElegiveis: number;
  passos: string[];
};

export const playbooks: Playbook[] = [
  {
    id: "p1",
    titulo: "Recuperação de SLA crítico",
    gatilho: "Queda de SLA acima de 10 p.p. no trimestre",
    categoria: "SLA",
    clientesElegiveis: 6,
    passos: [
      "Abrir chamado de investigação técnica prioritária",
      "Ligar para o ponto focal em até 24h",
      "Agendar reunião de recuperação com time técnico",
      "Enviar relatório de causa raiz em até 5 dias úteis",
    ],
  },
  {
    id: "p2",
    titulo: "Atraso de pagamento recorrente",
    gatilho: "2 ou mais atrasos nos últimos 90 dias",
    categoria: "Financeiro",
    clientesElegiveis: 4,
    passos: [
      "Contatar o time financeiro do cliente",
      "Oferecer renegociação de vencimento",
      "Registrar acordo no CRM",
      "Acompanhar pagamento em 5 dias úteis",
    ],
  },
  {
    id: "p3",
    titulo: "Queda de uso da plataforma",
    gatilho: "Uso ativo caiu mais de 15% no mês",
    categoria: "Engajamento",
    clientesElegiveis: 9,
    passos: [
      "Enviar diagnóstico de uso para o gestor do cliente",
      "Agendar sessão de reonboarding focada nos módulos parados",
      "Compartilhar conteúdo de capacitação relevante",
      "Reavaliar uso em 30 dias",
    ],
  },
  {
    id: "p4",
    titulo: "NPS detrator",
    gatilho: "Nota de NPS igual ou menor que 6",
    categoria: "Relacionamento",
    clientesElegiveis: 5,
    passos: [
      "Ligar para entender o motivo da nota em até 48h",
      "Registrar plano de melhoria acordado",
      "Envolver liderança se o motivo for estrutural",
      "Reaplicar pesquisa em 60 dias",
    ],
  },
];

export const usuarioAtual = {
  nome: "Ana Souza",
  cargo: "Gestora de Relacionamento",
  iniciais: "AS",
};
