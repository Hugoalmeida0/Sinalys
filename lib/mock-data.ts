// Dados mockados para visualização do frontend.
// Estrutura inspirada em `docs/modelagem.sql` (entidades, métricas, predições,
// motivos de predição) — sem chamadas reais ao backend/Supabase ainda.

export type FaixaRisco = "critico" | "alerta" | "atencao" | "saudavel";

export type TendenciaScore = "subindo" | "descendo" | "estavel";

export type Cliente = {
  id: string;
  nome: string;
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
  /** Variação do MRR frente ao mês anterior, em pontos percentuais. */
  variacaoMrr: number;
  /** Chips exibidos na coluna "Principais sinais" da lista de clientes. */
  sinais: string[];
  atualizadoEm: string; // ISO date
};

export const clientes: Cliente[] = [
  {
    id: "C061",
    nome: "Distribuidora RT",
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
    variacaoMrr: -8,
    sinais: ["Uso ↓ 85%", "4 críticos", "NPS detrator"],
    atualizadoEm: "2026-09-18",
  },
  {
    id: "C080",
    nome: "Comercial Alves",
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
    variacaoMrr: 12,
    sinais: ["SLA ↓ 76%", "11 reaberturas", "3 críticos"],
    atualizadoEm: "2026-09-19",
  },
  {
    id: "C011",
    nome: "Mercado do Povo",
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
    variacaoMrr: -4,
    sinais: ["6 críticos", "6 reaberturas", "11 dias de atraso"],
    atualizadoEm: "2026-09-17",
  },
  {
    id: "C071",
    nome: "Super Azul",
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
    variacaoMrr: 3,
    sinais: ["NPS ↓", "5 críticos", "5 reclamações"],
    atualizadoEm: "2026-09-14",
  },
  {
    id: "C052",
    nome: "Atacado Central",
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
    variacaoMrr: -6,
    sinais: ["SLA ↓ 95%", "2 reclamações", "11 dias de atraso"],
    atualizadoEm: "2026-09-12",
  },
  {
    id: "C034",
    nome: "Instituto Horizonte",
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
    variacaoMrr: 2,
    sinais: ["Uso ↓ 70%", "1 reabertura"],
    atualizadoEm: "2026-09-10",
  },
  {
    id: "C019",
    nome: "Banco Meridiano",
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
    variacaoMrr: 5,
    sinais: ["Tudo em dia"],
    atualizadoEm: "2026-09-08",
  },
  {
    id: "C045",
    nome: "Loja Prática",
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
    variacaoMrr: -11,
    sinais: ["3 chamados", "Atraso de pagamento"],
    atualizadoEm: "2026-09-15",
  },
];

export function getFilaDoDia(): Cliente[] {
  return [...clientes]
    .filter((c) => c.faixaRisco === "critico" || c.faixaRisco === "alerta")
    .sort((a, b) => b.receitaAnualRisco - a.receitaAnualRisco);
}

/** Contagem e participação de cada faixa de risco na carteira. */
export function getResumoCarteira(): {
  faixa: FaixaRisco;
  total: number;
  percentual: number;
}[] {
  const ordem: FaixaRisco[] = ["critico", "alerta", "atencao", "saudavel"];

  return ordem.map((faixa) => {
    const total = clientes.filter((c) => c.faixaRisco === faixa).length;
    return {
      faixa,
      total,
      percentual: Math.round((total / clientes.length) * 100),
    };
  });
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

export type PontoScore = {
  mes: string;
  score: number;
};

export type DetalheCliente = Cliente & {
  nomeFantasia: string;
  responsavelCS: string;
  evidencias: Evidencia[];
  proximasAcoes: ProximaAcao[];
  avaliacaoIA: string;
  historico: EventoHistorico[];
  /** Série de 12 meses exibida no gráfico de evolução do score. */
  evolucaoScore: PontoScore[];
  resumoCliente: string;
};

/**
 * Gera uma série plausível de 12 meses terminando no score atual do cliente.
 * Determinística (sem random) para não divergir entre servidor e cliente.
 */
function gerarEvolucaoScore(atual: number, max: number): PontoScore[] {
  const meses = [
    "out/25",
    "nov/25",
    "dez/25",
    "jan/26",
    "fev/26",
    "mar/26",
    "abr/26",
    "mai/26",
    "jun/26",
    "jul/26",
    "ago/26",
    "set/26",
  ];
  const variacao = [0, 1, -1, 0, 1, 0, -1, 0, 1, 1, 0, 0];
  const inicio = Math.max(1, Math.round(atual * 0.55));

  return meses.map((mes, i) => {
    const progresso = inicio + ((atual - inicio) * i) / (meses.length - 1);
    const valor = i === meses.length - 1 ? atual : progresso + variacao[i];
    return { mes, score: Math.min(max, Math.max(0, Math.round(valor))) };
  });
}

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
    resumoCliente:
      "Cliente do segmento varejo, de grande porte, com contrato Enterprise. Apresenta queda recente no nível de serviço, aumento de chamados reabertos e atraso no pagamento. Requer atenção imediata e plano de ação conjunto.",
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
    evolucaoScore: gerarEvolucaoScore(base.scoreRisco, base.scoreMax),
    resumoCliente:
      overrides?.resumoCliente ??
      `Cliente do segmento ${base.segmento.toLowerCase()}, de ${base.porte.toLowerCase()} porte, com contrato ${base.tipo}. ${base.resumoAlerta}.`,
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

export type StatusIngestao = "processado" | "com_erros" | "em_processamento";

export type IngestaoRegistro = {
  id: string;
  arquivo: string;
  tamanho: string;
  enviadoEm: string; // ISO datetime
  registros: number;
  status: StatusIngestao;
  processadoEm: string | null; // ISO datetime
};

export const historicoIngestoes: IngestaoRegistro[] = [
  {
    id: "i1",
    arquivo: "base_clientes_set2026.xlsx",
    tamanho: "2,4 MB",
    enviadoEm: "2026-09-18T14:32:00",
    registros: 8542,
    status: "processado",
    processadoEm: "2026-09-18T14:35:00",
  },
  {
    id: "i2",
    arquivo: "distribuidores.csv",
    tamanho: "1,1 MB",
    enviadoEm: "2026-09-15T10:15:00",
    registros: 2316,
    status: "com_erros",
    processadoEm: "2026-09-15T10:18:00",
  },
  {
    id: "i3",
    arquivo: "carteira_varejo.xlsx",
    tamanho: "3,8 MB",
    enviadoEm: "2026-09-11T16:20:00",
    registros: 12094,
    status: "processado",
    processadoEm: "2026-09-11T16:25:00",
  },
  {
    id: "i4",
    arquivo: "prospect_sudeste.csv",
    tamanho: "900 KB",
    enviadoEm: "2026-09-08T09:41:00",
    registros: 1103,
    status: "em_processamento",
    processadoEm: null,
  },
];

export type Integracao = {
  id: string;
  nome: string;
  descricao: string;
  status: "conectado" | "pendente";
  /** Cor de fundo do quadradinho da marca na lista. */
  marca: "supabase" | "gemini" | "vercel";
};

export const integracoes: Integracao[] = [
  {
    id: "supabase",
    nome: "Supabase (Postgres + pgvector)",
    descricao: "Banco de dados vetorial para clientes e embeddings.",
    status: "conectado",
    marca: "supabase",
  },
  {
    id: "gemini",
    nome: "Google Gemini (IA generativa)",
    descricao: "Geração de insights e resumos inteligentes.",
    status: "conectado",
    marca: "gemini",
  },
  {
    id: "vercel",
    nome: "Vercel Cron (varredura diária)",
    descricao: "Execução de rotinas de atualização de dados.",
    status: "pendente",
    marca: "vercel",
  },
];

export const pesosModeloRisco = [
  { sinal: "Queda severa de uso do sistema", peso: 5 },
  { sinal: "Atraso de pagamento", peso: 4 },
  { sinal: "Queda de SLA", peso: 4 },
  { sinal: "Chamados críticos abertos", peso: 3 },
  { sinal: "Reaberturas de chamados", peso: 2 },
  { sinal: "NPS detrator", peso: 2 },
];

export const PESO_MAXIMO = 5;

export type MembroEquipe = {
  id: string;
  nome: string;
  iniciais: string;
  email: string;
  papel: "Administrador" | "Gestor" | "Analista";
};

export const equipe: MembroEquipe[] = [
  {
    id: "u1",
    nome: "Ana Souza",
    iniciais: "AS",
    email: "ana.souza@sinalys.com.br",
    papel: "Administrador",
  },
  {
    id: "u2",
    nome: "Rafael Torres",
    iniciais: "RT",
    email: "rafael.torres@sinalys.com.br",
    papel: "Gestor",
  },
  {
    id: "u3",
    nome: "Marina Costa",
    iniciais: "MC",
    email: "marina.costa@sinalys.com.br",
    papel: "Analista",
  },
];
