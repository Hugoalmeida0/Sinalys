import type { PostgrestError } from "@supabase/supabase-js";

const TAMANHO_PAGINA = 1000;

interface ConsultaPaginavel<T> {
  range(inicio: number, fim: number): PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;
}

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
