import type { SupabaseClient } from "@supabase/supabase-js";
import { FAIXAS_FILA_PADRAO } from "./clientes";
import type { ClientePainel, KpisPainel } from "./tipos";

const DIAS_POR_MES = 30.44;
const JANELA_CONTATADOS_DIAS = 7;
const FAIXAS_ALERTA = new Set<string>(FAIXAS_FILA_PADRAO);

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

function arredondar1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Antecedência (meses) com que o motor sinalizou cada desfecho ocorrido:
 * distância entre o início da sequência contínua de predições em
 * crítico/alerta imediatamente anterior ao evento-alvo e a data do evento.
 * Desfechos sem alerta prévio contínuo não contam (não foram antecipados).
 */
async function calcularAntecedencias(
  supabase: SupabaseClient,
  projetoId: string,
  modeloId: string
): Promise<number[]> {
  const { data: projeto, error: erroProjeto } = await supabase
    .from("projetos")
    .select("codigo_evento_alvo")
    .eq("id", projetoId)
    .maybeSingle();
  if (erroProjeto) throw new Error(`Falha ao buscar projeto: ${erroProjeto.message}`);
  if (!projeto) return [];

  const { data: eventos, error: erroEventos } = await supabase
    .from("eventos_desfecho")
    .select("entidade_id, ocorrido_em")
    .eq("projeto_id", projetoId)
    .eq("codigo_evento", projeto.codigo_evento_alvo);
  if (erroEventos) throw new Error(`Falha ao buscar desfechos: ${erroEventos.message}`);
  if (!eventos?.length) return [];

  const { data: predicoes, error: erroPred } = await supabase
    .from("predicoes")
    .select("entidade_id, referencia_em, faixa_risco")
    .eq("projeto_id", projetoId)
    .eq("modelo_id", modeloId)
    .in("entidade_id", Array.from(new Set(eventos.map((e) => e.entidade_id))))
    .order("referencia_em", { ascending: true });
  if (erroPred) throw new Error(`Falha ao buscar predições: ${erroPred.message}`);

  const porEntidade = new Map<string, { referencia_em: string; faixa_risco: string | null }[]>();
  for (const p of predicoes ?? []) {
    const lista = porEntidade.get(p.entidade_id) ?? [];
    lista.push(p);
    porEntidade.set(p.entidade_id, lista);
  }

  const meses: number[] = [];
  for (const evento of eventos) {
    const ocorridoEm = new Date(evento.ocorrido_em).getTime();
    let inicioSequencia: number | null = null;

    for (const p of porEntidade.get(evento.entidade_id) ?? []) {
      const ref = new Date(p.referencia_em).getTime();
      if (ref >= ocorridoEm) break;
      if (p.faixa_risco && FAIXAS_ALERTA.has(p.faixa_risco)) {
        if (inicioSequencia == null) inicioSequencia = ref;
      } else {
        inicioSequencia = null;
      }
    }

    if (inicioSequencia != null) {
      meses.push((ocorridoEm - inicioSequencia) / (86_400_000 * DIAS_POR_MES));
    }
  }
  return meses;
}

async function contarContatados(
  supabase: SupabaseClient,
  projetoId: string,
  agora: Date
): Promise<number> {
  const desde = new Date(agora.getTime() - JANELA_CONTATADOS_DIAS * 86_400_000);
  const { data, error } = await supabase
    .from("contatos")
    .select("entidade_id")
    .eq("projeto_id", projetoId)
    .gte("realizado_em", desde.toISOString())
    .lte("realizado_em", agora.toISOString());
  if (error) throw new Error(`Falha ao buscar contatos: ${error.message}`);
  return new Set((data ?? []).map((c) => c.entidade_id)).size;
}

/** KPIs do topo da home, derivados da lista já montada por `montarClientesPainel`. */
export async function calcularKpisPainel(params: {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
  clientes: ClientePainel[];
  agora?: Date;
}): Promise<KpisPainel> {
  const { supabase, projetoId, modeloId, clientes } = params;
  const agora = params.agora ?? new Date();

  const emAlerta = clientes.filter(
    (c) => FAIXAS_ALERTA.has(c.faixaRisco) && !c.silenciadoAte && !c.cancelado
  );

  const [antecedencias, clientesContatados7d] = await Promise.all([
    calcularAntecedencias(supabase, projetoId, modeloId),
    contarContatados(supabase, projetoId, agora),
  ]);

  return {
    receitaEmRiscoAno: emAlerta.reduce((soma, c) => soma + c.receitaAnualRisco, 0),
    clientesEmAlerta: emAlerta.length,
    totalCarteira: clientes.length,
    antecedenciaMediaMeses: antecedencias.length
      ? arredondar1(antecedencias.reduce((s, m) => s + m, 0) / antecedencias.length)
      : null,
    antecedenciaMedianaMeses: antecedencias.length ? arredondar1(mediana(antecedencias)) : null,
    antecedenciaMaximaMeses: antecedencias.length
      ? arredondar1(Math.max(...antecedencias))
      : null,
    desfechosAntecipados: antecedencias.length,
    clientesContatados7d,
  };
}
