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
  // `projeto` vem do cache de 12h (lib/painel/cache-estatico.ts) — o filtro
  // por `codigo_evento_alvo` é aplicado aqui em memória, então não precisa
  // esperar essa leitura pra montar a query de `eventos_desfecho`.
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

/**
 * "Receita salva": clientes que estavam em crítico/alerta e cuja predição mais
 * recente caiu para uma faixa fora de alerta (recuperação), com a transição
 * ocorrendo dentro da janela. Soma a receita anualizada (valor_impacto × 12) no
 * momento da recuperação — é o KPI de negócio mais direto do produto: quanto
 * a operação de CS evitou perder, não só quanto está em risco.
 */
async function calcularReceitaSalva(
  supabase: SupabaseClient,
  projetoId: string,
  modeloId: string,
  agora: Date
): Promise<{ receita: number; clientes: number }> {
  const desde = new Date(agora.getTime() - JANELA_RECEITA_SALVA_DIAS * 86_400_000);

  const { data: predicoes, error } = await supabase
    .from("predicoes")
    .select("entidade_id, referencia_em, faixa_risco, valor_impacto")
    .eq("projeto_id", projetoId)
    .eq("modelo_id", modeloId)
    .order("entidade_id", { ascending: true })
    .order("referencia_em", { ascending: true });
  if (error) throw new Error(`Falha ao buscar predições: ${error.message}`);

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
    // Última recuperação da série: última predição fora de alerta cuja predição
    // imediatamente anterior estava em alerta e a transição caiu na janela.
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
      // Se a predição mais recente já está em alerta de novo, não há recuperação a contar.
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

  const [antecedencias, clientesContatados7d, receitaSalva] = await Promise.all([
    calcularAntecedencias(supabase, projetoId, modeloId),
    contarContatados(supabase, projetoId, agora),
    calcularReceitaSalva(supabase, projetoId, modeloId, agora),
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
    receitaSalva30d: receitaSalva.receita,
    clientesRecuperados30d: receitaSalva.clientes,
  };
}
