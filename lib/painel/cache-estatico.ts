import { unstable_cache } from "next/cache";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { CODIGO_METRICA_RECEITA_MENSAL } from "@/lib/motor/constantes";

const DOZE_HORAS_EM_SEGUNDOS = 60 * 60 * 12;

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
