import type { PostgrestError } from "@supabase/supabase-js";

/** Tamanho máximo de página do PostgREST na configuração padrão do Supabase. */
const TAMANHO_PAGINA = 1000;

interface ConsultaPaginavel<T> {
  range(inicio: number, fim: number): PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;
}

/**
 * Percorre todas as páginas de uma consulta que pode devolver mais de 1000
 * linhas (limite silencioso do PostgREST) e concatena o resultado.
 *
 * `montar` deve devolver a consulta já filtrada e ordenada — a ordem é
 * obrigatória para que as páginas sejam estáveis.
 */
export async function buscarTodasLinhas<T>(
  montar: () => ConsultaPaginavel<T>
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const linhas: T[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await montar().range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) return { data: linhas, error };
    linhas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return { data: linhas, error: null };
}
