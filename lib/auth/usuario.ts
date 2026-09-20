import type { User } from "@supabase/supabase-js";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export interface UsuarioSessao {
  id: string;
  email: string;
  nome: string;
  cargo: string | null;
  iniciais: string;

  projetoId: string | null;
}

export function montarUsuarioSessao(user: User): UsuarioSessao {
  const email = user.email ?? "";
  const nome =
    (typeof user.user_metadata?.nome === "string" && user.user_metadata.nome.trim()) ||
    email.split("@")[0] ||
    "Usuário";
  const partes = nome.split(/\s+/).filter(Boolean);
  const iniciais = (partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "");

  return {
    id: user.id,
    email,
    nome,
    cargo: typeof user.user_metadata?.cargo === "string" ? user.user_metadata.cargo : null,
    iniciais: iniciais.toUpperCase() || "?",
    projetoId:
      typeof user.app_metadata?.projeto_id === "string" ? user.app_metadata.projeto_id : null,
  };
}

export async function obterUsuarioSessao(): Promise<UsuarioSessao | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return montarUsuarioSessao(data.user);
}
