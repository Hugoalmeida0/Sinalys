import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { montarClientesPainel } from "./clientes";
import { resolverModeloAtivoId, resolverProjetoId } from "./projeto";
import type { ClientePainel } from "./tipos";

export interface PainelCarregado {
  supabase: SupabaseClient;
  projetoId: string;

  modeloId: string | null;
  clientes: ClientePainel[];
  semPredicao: number;
}

export const carregarPainel = cache(async (): Promise<PainelCarregado> => {
  const supabase = criarClienteSupabaseAdmin();
  const projetoId = await resolverProjetoId();
  const modeloId = await resolverModeloAtivoId(supabase, projetoId);

  if (!modeloId) {
    return { supabase, projetoId, modeloId, clientes: [], semPredicao: 0 };
  }

  const { clientes, semPredicao } = await montarClientesPainel({ supabase, projetoId, modeloId });
  return { supabase, projetoId, modeloId, clientes, semPredicao };
});
