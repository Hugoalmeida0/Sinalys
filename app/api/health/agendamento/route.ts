import { NextResponse } from "next/server";
import {
  MAX_TAMANHO_MENSAGEM_SOLICITACAO,
  MAX_TAMANHO_NOME_SOLICITANTE,
  montarResumoSolicitacao,
  PROXIMO_PASSO_AGENDAMENTO,
} from "@/lib/health/agendamento";
import { resolverEntidadePorToken } from "@/lib/health/publico";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));

  if (typeof corpo?.site === "string" && corpo.site.trim()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const token: unknown = corpo?.token;
  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ erro: "Token da página é obrigatório." }, { status: 400 });
  }
  const nome = texto(corpo?.nome, MAX_TAMANHO_NOME_SOLICITANTE);
  if (!nome) {
    return NextResponse.json({ erro: "Informe seu nome para a gente te chamar." }, { status: 400 });
  }
  const email = texto(corpo?.email, 200);
  if (email && !REGEX_EMAIL.test(email)) {
    return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  }
  let preferenciaEm: string | null = null;
  if (corpo?.preferencia_em) {
    const d = new Date(String(corpo.preferencia_em));
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ erro: "Data/hora preferida inválida." }, { status: 400 });
    }
    preferenciaEm = d.toISOString();
  }
  const mensagem = texto(corpo?.mensagem, MAX_TAMANHO_MENSAGEM_SOLICITACAO);

  const supabase = criarClienteSupabaseAdmin();

  try {
    const entidade = await resolverEntidadePorToken(supabase, token.trim());
    if (!entidade) {
      return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    }

    const pedido = { nome, email, preferenciaEm, mensagem };
    const { error } = await supabase.from("contatos").insert({
      projeto_id: entidade.projeto_id,
      entidade_id: entidade.id,
      tipo: "outro",
      realizado_em: new Date().toISOString(),
      resumo: montarResumoSolicitacao(pedido),
      proximo_passo: PROXIMO_PASSO_AGENDAMENTO,
      proximo_passo_em: preferenciaEm,

      autor_usuario_id: null,
      autor_nome: null,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (erro) {
    return NextResponse.json(
      { erro: `Não foi possível registrar o pedido: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}
