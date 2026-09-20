import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverModeloAtivoId, resolverProjetoId } from "./projeto";

export interface ContextoRotaPainel {
  supabase: SupabaseClient;
  projetoId: string;
  modeloId: string;
}

/**
 * Passo comum das rotas do painel: cliente admin + projeto (sessão → query →
 * env) + modelo (query `modelo_id` → modelo ativo). Devolve uma resposta
 * pronta (422/500) quando não dá para continuar.
 */
export async function montarContextoRotaPainel(
  request: Request
): Promise<ContextoRotaPainel | NextResponse> {
  const { searchParams } = new URL(request.url);
  const supabase = criarClienteSupabaseAdmin();

  try {
    const projetoId = await resolverProjetoId(searchParams.get("projeto_id"));
    const modeloId =
      searchParams.get("modelo_id") || (await resolverModeloAtivoId(supabase, projetoId));
    if (!modeloId) {
      return NextResponse.json(
        { erro: "Nenhum modelo ativo encontrado. Informe 'modelo_id' via query string." },
        { status: 422 }
      );
    }
    return { supabase, projetoId, modeloId };
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}

export function ehResposta(valor: unknown): valor is NextResponse {
  return valor instanceof NextResponse;
}
