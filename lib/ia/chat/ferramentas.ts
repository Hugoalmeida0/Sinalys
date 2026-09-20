import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarClientesPainel, montarFilaDoDia } from "@/lib/painel/clientes";
import { calcularKpisPainel } from "@/lib/painel/kpis";
import type { ClientePainel } from "@/lib/painel/tipos";
import { montarContextoAtual, resolverEntidade } from "@/lib/ia/contexto";
import { descreverPerfilRisco } from "@/lib/ia/descricao";
import { buscarCasosSimilares } from "@/lib/ia/lookalike";

export interface EscopoFerramentas {
  supabase: SupabaseClient;
  projetoId: string;

  modeloId: string | null;
}

const SEM_MODELO =
  "O projeto não tem modelo de risco ativo, então não há predições nem fila. Oriente o analista a ativar um modelo em Configurações.";

function resumirCliente(c: ClientePainel) {
  return {
    id: c.id,
    nome: c.nome,
    faixa_risco: c.faixaRisco,
    score_risco: c.scoreRisco,
    tendencia: c.tendenciaScore,
    mrr: c.mrr,
    score_prioridade: c.scorePrioridade,
    sinais: c.sinais,
    resumo_alerta: c.resumoAlerta,
    silenciado_ate: c.silenciadoAte,
    atualizado_em: c.atualizadoEm,
  };
}

async function carregarClientes(escopo: EscopoFerramentas) {
  if (!escopo.modeloId) return null;
  const { clientes } = await montarClientesPainel({
    supabase: escopo.supabase,
    projetoId: escopo.projetoId,
    modeloId: escopo.modeloId,
  });
  return clientes;
}

export function criarFerramentasAssistente(escopo: EscopoFerramentas) {
  return {
    listar_fila_prioridade: tool({
      description:
        "Lista os clientes que merecem atenção agora, ordenados por Score de Urgência (risco × receita mensal). " +
        "Por padrão traz só as faixas crítico e alerta, sem os silenciados. Use para 'quem está em risco', 'por onde começo', 'quem merece atenção'.",
      inputSchema: z.object({
        limite: z.number().int().min(1).max(25).default(8).describe("Quantos clientes devolver."),
        incluir_todas_faixas: z
          .boolean()
          .default(false)
          .describe("true para incluir também 'atencao' e 'saudavel'."),
        incluir_silenciados: z.boolean().default(false),
      }),
      execute: async ({ limite, incluir_todas_faixas, incluir_silenciados }) => {
        const clientes = await carregarClientes(escopo);
        if (!clientes) return { erro: SEM_MODELO };
        const fila = montarFilaDoDia(clientes, {
          faixas: incluir_todas_faixas ? ["critico", "alerta", "atencao", "saudavel"] : undefined,
          incluirSilenciados: incluir_silenciados,
        });
        return {
          total_na_fila: fila.length,
          total_carteira: clientes.length,
          clientes: fila.slice(0, limite).map(resumirCliente),
        };
      },
    }),

    resumo_carteira: tool({
      description:
        "Visão geral da carteira: quantidade de clientes por faixa de risco, receita anual em risco, " +
        "clientes contatados nos últimos 7 dias e antecedência média com que o motor sinalizou desfechos passados. Use para 'resuma minha carteira', 'como está o mês'.",
      inputSchema: z.object({}),
      execute: async () => {
        const clientes = await carregarClientes(escopo);
        if (!clientes || !escopo.modeloId) return { erro: SEM_MODELO };
        const kpis = await calcularKpisPainel({
          supabase: escopo.supabase,
          projetoId: escopo.projetoId,
          modeloId: escopo.modeloId,
          clientes,
        });
        const porFaixa = { critico: 0, alerta: 0, atencao: 0, saudavel: 0 };
        let mrrTotal = 0;
        let mrrEmRisco = 0;
        for (const c of clientes) {
          porFaixa[c.faixaRisco] += 1;
          mrrTotal += c.mrr ?? 0;
          if (c.faixaRisco === "critico" || c.faixaRisco === "alerta") mrrEmRisco += c.mrr ?? 0;
        }
        return {
          total_clientes: clientes.length,
          por_faixa: porFaixa,
          mrr_total: mrrTotal,
          mrr_em_faixas_de_alerta: mrrEmRisco,
          receita_anual_em_risco_ponderada: kpis.receitaEmRiscoAno,
          clientes_contatados_7d: kpis.clientesContatados7d,
          antecedencia_media_meses: kpis.antecedenciaMediaMeses,
          desfechos_antecipados: kpis.desfechosAntecipados,
          silenciados: clientes.filter((c) => c.silenciadoAte).length,
        };
      },
    }),

    detalhar_cliente: tool({
      description:
        "Raio-x completo de UM cliente: score e faixa de risco, cada sinal avaliado pelo motor com valor observado e peso, " +
        "receita mensal, último diagnóstico de IA (se existir), últimos contatos registrados pelo time e desfechos passados. " +
        "Use sempre que a pergunta for sobre um cliente específico ('por que o C004 está crítico', 'como agir com este cliente').",
      inputSchema: z.object({
        cliente_id: z
          .string()
          .min(1)
          .describe("Código do cliente como aparece no painel (ex: 'C004') ou UUID."),
      }),
      execute: async ({ cliente_id }) => {
        const entidade = await resolverEntidade(escopo.supabase, escopo.projetoId, cliente_id.trim());
        if (!entidade) return { erro: `Nenhum cliente com código "${cliente_id}" nesta carteira.` };

        const clientes = await carregarClientes(escopo);
        const painel = clientes?.find((c) => c.entidadeId === entidade.id) ?? null;

        let contexto: Awaited<ReturnType<typeof montarContextoAtual>> | null = null;
        try {
          contexto = await montarContextoAtual({
            supabase: escopo.supabase,
            projetoId: escopo.projetoId,
            entidade,
            modeloId: escopo.modeloId ?? undefined,
          });
        } catch {
        }

        const [diagnosticoRes, contatosRes, desfechosRes] = await Promise.all([
          escopo.supabase
            .from("diagnosticos_ia")
            .select("diagnostico_principal, analise_lookalike, plano_acao_imediato, criado_em, modelo_ia")
            .eq("entidade_id", entidade.id)
            .order("criado_em", { ascending: false })
            .limit(1)
            .maybeSingle(),
          escopo.supabase
            .from("contatos")
            .select("tipo, realizado_em, resumo, proximo_passo, autor_nome")
            .eq("entidade_id", entidade.id)
            .order("realizado_em", { ascending: false })
            .limit(5),
          escopo.supabase
            .from("eventos_desfecho")
            .select("codigo_evento, ocorrido_em")
            .eq("entidade_id", entidade.id)
            .order("ocorrido_em", { ascending: false })
            .limit(5),
        ]);

        return {
          cliente: painel
            ? {
                ...resumirCliente(painel),
                segmento: painel.segmento,
                porte: painel.porte,
                plano: painel.tipo,
                cliente_desde: painel.clienteDesde,
                variacao_mrr_pct: painel.variacaoMrr,
                cobertura_do_modelo: painel.cobertura,
              }
            : { id: entidade.id_externo, nome: entidade.nome_exibicao },
          predicao: contexto
            ? {
                referencia_em: contexto.referencia_em,
                score_risco: contexto.pontuacao,
                faixa_risco: contexto.faixa_risco,
                cobertura: contexto.cobertura,
                score_urgencia: contexto.score_urgencia,
                sinais: contexto.sinais.map((s) => ({
                  metrica: s.metrica,
                  situacao:
                    s.acionado === null
                      ? "nao_avaliavel"
                      : s.valor_observado?.omissao === true
                        ? "acionado_por_omissao_de_dado"
                        : s.acionado
                          ? "acionado"
                          : "normal",
                  valor_observado: s.valor_observado?.valor ?? s.valor_observado?.ultimo_valor ?? null,
                  unidade: s.unidade,
                  peso: s.peso,
                  pontos: s.pontos,
                })),
              }
            : {
                aviso:
                  "Este cliente ainda não tem predição do motor de risco. Oriente a rodar o cálculo de risco antes de analisar sinais.",
              },
          ultimo_diagnostico_ia: diagnosticoRes.data ?? null,
          ultimos_contatos: contatosRes.data ?? [],
          desfechos_passados: desfechosRes.data ?? [],
        };
      },
    }),

    buscar_casos_similares: tool({
      description:
        "Busca no histórico da própria empresa os clientes que se comportaram de forma parecida com este (busca semântica), " +
        "com a ação que o time tomou e o desfecho (recuperado/cancelado). Use para 'o que funcionou em casos assim', 'o que o histórico diz'.",
      inputSchema: z.object({
        cliente_id: z.string().min(1).describe("Código do cliente (ex: 'C004') ou UUID."),
        limite: z.number().int().min(1).max(5).default(3),
      }),
      execute: async ({ cliente_id, limite }) => {
        const entidade = await resolverEntidade(escopo.supabase, escopo.projetoId, cliente_id.trim());
        if (!entidade) return { erro: `Nenhum cliente com código "${cliente_id}" nesta carteira.` };

        let contexto;
        try {
          contexto = await montarContextoAtual({
            supabase: escopo.supabase,
            projetoId: escopo.projetoId,
            entidade,
            modeloId: escopo.modeloId ?? undefined,
          });
        } catch (erro) {
          return { erro: (erro as Error).message };
        }

        const casos = await buscarCasosSimilares({
          supabase: escopo.supabase,
          projetoId: escopo.projetoId,
          perfilRisco: descreverPerfilRisco(contexto),
          entidadeExcluida: entidade.id,
          limite,
        });

        return {
          total: casos.length,
          aviso:
            casos.length === 0
              ? "Nenhum caso histórico similar na base. Diga isso ao analista; não invente comparações."
              : undefined,
          casos: casos.map((c) => ({
            cliente: c.nome_exibicao,
            similaridade_pct: Math.round(c.similaridade * 100),
            perfil_na_epoca: c.contexto_texto,
            acao_realizada: c.acao_realizada,
            desfecho: c.desfecho,
          })),
        };
      },
    }),
  };
}

export type FerramentasAssistente = ReturnType<typeof criarFerramentasAssistente>;
