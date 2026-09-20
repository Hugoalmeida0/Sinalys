import { unstable_cache } from "next/cache";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { CODIGO_METRICA_RECEITA_MENSAL } from "@/lib/motor/constantes";

const DOZE_HORAS_EM_SEGUNDOS = 60 * 60 * 12;

/**
 * Cache de leituras quase-estáticas do projeto (config de tenant, não dado de
 * negócio): modelo ativo, `codigo_evento_alvo`/`rotulo_entidade` e o id da
 * métrica reservada de receita mensal. Cada uma delas é reconsultada do zero
 * em várias funções diferentes a cada request — mas só mudam por ação manual
 * rara (ativar outro modelo, editar o projeto), nunca como parte do fluxo
 * normal de uso. Não vale a latência de rede (~400-500ms por chamada ao
 * Supabase, medido em produção) de buscar de novo em toda página.
 *
 * Usa `unstable_cache` (não `use cache`/Cache Components): não exige ligar o
 * flag experimental `cacheComponents` no `next.config.ts`, que muda o modelo
 * de renderização da aplicação inteira — mudança grande demais só para isto.
 * Na Vercel, o resultado fica no Data Cache da própria plataforma,
 * compartilhado entre todas as instâncias serverless (cache distribuído sem
 * precisar de Redis/infra própria). Em dev local, cai para cache em memória
 * do processo — ainda poupa chamadas repetidas dentro da mesma sessão de
 * `next dev`.
 *
 * TTL de 12h, sem invalidação por tag: nenhuma rota do MVP hoje escreve nessas
 * três tabelas depois do seed inicial, então não há mutação para "escutar" —
 * se isso mudar (ex.: uma tela de ativar/trocar modelo), adicionar
 * `revalidateTag` no ponto de escrita correspondente.
 */

export const obterProjetoInfoCache = unstable_cache(
  async (projetoId: string) => {
    const supabase = criarClienteSupabaseAdmin();
    const { data, error } = await supabase
      .from("projetos")
      .select("codigo_evento_alvo, rotulo_entidade")
      .eq("id", projetoId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar projeto: ${error.message}`);
    return data;
  },
  ["projeto-info"],
  { revalidate: DOZE_HORAS_EM_SEGUNDOS, tags: ["projeto-info"] }
);

export const obterModeloAtivoIdCache = unstable_cache(
  async (projetoId: string): Promise<string | null> => {
    const supabase = criarClienteSupabaseAdmin();
    const { data, error } = await supabase
      .from("modelos")
      .select("id")
      .eq("projeto_id", projetoId)
      .eq("status", "ativo")
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar modelo ativo: ${error.message}`);
    return (data?.id as string | undefined) ?? null;
  },
  ["modelo-ativo"],
  { revalidate: DOZE_HORAS_EM_SEGUNDOS, tags: ["modelo-ativo"] }
);

export const obterMetricaReceitaIdCache = unstable_cache(
  async (projetoId: string): Promise<string | null> => {
    const supabase = criarClienteSupabaseAdmin();
    const { data, error } = await supabase
      .from("definicoes_metricas")
      .select("id")
      .eq("projeto_id", projetoId)
      .eq("codigo", CODIGO_METRICA_RECEITA_MENSAL)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar métrica de receita: ${error.message}`);
    return (data?.id as string | undefined) ?? null;
  },
  ["metrica-receita-mensal"],
  { revalidate: DOZE_HORAS_EM_SEGUNDOS, tags: ["metrica-receita-mensal"] }
);
