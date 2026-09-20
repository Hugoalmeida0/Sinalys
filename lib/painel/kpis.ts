import type { SupabaseClient } from "@supabase/supabase-js";
import { FAIXAS_FILA_PADRAO } from "./clientes";
import { obterProjetoInfoCache } from "./cache-estatico";
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

async function calcularAntecedencias(
  supabase: SupabaseClient,
  projetoId: string,
  modeloId: string
): Promise<number[]> {
  const [projeto, { data: eventosBrutos, error: erroEventos }] = await Promise.all([
    obterProjetoInfoCache(projetoId),
    supabase.from("eventos_desfecho").select("entidade_id, ocorrido_em, codigo_evento").eq("projeto_id", projetoId),
  ]);
  if (erroEventos) throw new Error(`Falha ao buscar desfechos: ${erroEventos.message}`);
  if (!projeto) return [];

  const eventos = (eventosBrutos ?? []).filter((e) => e.codigo_evento === projeto.codigo_evento_alvo);
  if (!eventos.length) return [];

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

const JANELA_RECEITA_SALVA_DIAS = 30;

async function calcularReceitaSalva(
  supabase: SupabaseClient,
  projetoId: string,
  modeloId: string
): Promise<{ receita: number; clientes: number }> {
  const { data: predicoes, error } = await supabase
    .from("predicoes")
    .select("entidade_id, referencia_em, faixa_risco, valor_impacto")
    .eq("projeto_id", projetoId)
    .eq("modelo_id", modeloId)
    .order("entidade_id", { ascending: true })
    .order("referencia_em", { ascending: true });
  if (error) throw new Error(`Falha ao buscar predições: ${error.message}`);
  if (!predicoes?.length) return { receita: 0, clientes: 0 };

  const ultimaReferencia = predicoes.reduce(
    (max, p) => Math.max(max, new Date(p.referencia_em).getTime()),
    0
  );
  const desde = new Date(ultimaReferencia - JANELA_RECEITA_SALVA_DIAS * 86_400_000);

  const porEntidade = new Map<
    string,
    { referencia_em: string; faixa_risco: string | null; valor_impacto: number | string | null }[]
  >();
  for (const p of predicoes ?? []) {
    const lista = porEntidade.get(p.entidade_id) ?? [];
    lista.push(p);
    porEntidade.set(p.entidade_id, lista);
  }

  let receita = 0;
  let clientesRecuperados = 0;

  for (const [, serie] of porEntidade) {
    for (let i = serie.length - 1; i > 0; i -= 1) {
      const atual = serie[i];
      const anterior = serie[i - 1];
      const atualEmAlerta = atual.faixa_risco != null && FAIXAS_ALERTA.has(atual.faixa_risco);
      const anteriorEmAlerta = anterior.faixa_risco != null && FAIXAS_ALERTA.has(anterior.faixa_risco);
      const dentroDaJanela = new Date(atual.referencia_em) >= desde;

      if (!atualEmAlerta && anteriorEmAlerta && dentroDaJanela) {
        const valorImpacto = atual.valor_impacto == null ? 0 : Number(atual.valor_impacto);
        receita += valorImpacto * 12;
        clientesRecuperados += 1;
        break;
      }

      if (i === serie.length - 1 && atualEmAlerta) break;
    }
  }

  return { receita, clientes: clientesRecuperados };
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

  const [antecedencias, clientesContatados7d, receitaSalva] = await Promise.all([
    calcularAntecedencias(supabase, projetoId, modeloId),
    contarContatados(supabase, projetoId, agora),
    calcularReceitaSalva(supabase, projetoId, modeloId),
  ]);

  return {
    receitaEmRiscoAno: emAlerta.reduce((soma, c) => soma + (c.receitaAnualRisco ?? 0), 0),
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
    receitaSalva30d: receitaSalva.receita,
    clientesRecuperados30d: receitaSalva.clientes,
  };
}
