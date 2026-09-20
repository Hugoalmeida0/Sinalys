import { NextResponse } from "next/server";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { normalizarTipoContato, TIPOS_CONTATO } from "@/lib/contatos/constantes";
import { resolverEntidade } from "@/lib/ia/contexto";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function dataValida(valor: unknown): Date | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const identificador: unknown = corpo?.cliente_id ?? corpo?.entidade_id;
  const tipo = normalizarTipoContato(corpo?.tipo);
  const realizadoEm = dataValida(corpo?.realizado_em ?? corpo?.data);
  const resumo: unknown = corpo?.resumo;

  if (typeof identificador !== "string" || !identificador.trim()) {
    return NextResponse.json({ erro: "Campo 'cliente_id' é obrigatório." }, { status: 400 });
  }
  if (!tipo) {
    return NextResponse.json(
      { erro: `Campo 'tipo' inválido. Use um de: ${Object.keys(TIPOS_CONTATO).join(", ")}.` },
      { status: 400 }
    );
  }
  if (!realizadoEm) {
    return NextResponse.json(
      { erro: "Campo 'realizado_em' inválido (use ISO 8601)." },
      { status: 400 }
    );
  }
  if (typeof resumo !== "string" || !resumo.trim()) {
    return NextResponse.json({ erro: "Campo 'resumo' é obrigatório." }, { status: 400 });
  }
  const proximoPassoEm = corpo?.proximo_passo_em ? dataValida(corpo.proximo_passo_em) : null;
  if (corpo?.proximo_passo_em && !proximoPassoEm) {
    return NextResponse.json(
      { erro: "Campo 'proximo_passo_em' inválido (use ISO 8601)." },
      { status: 400 }
    );
  }

  const supabase = criarClienteSupabaseAdmin();

  try {
    const [projetoId, usuario] = await Promise.all([
      resolverProjetoId(corpo?.projeto_id),
      obterUsuarioSessao(),
    ]);
    const entidade = await resolverEntidade(supabase, projetoId, identificador.trim());
    if (!entidade) {
      return NextResponse.json(
        { erro: `Cliente "${identificador}" não encontrado.` },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("contatos")
      .insert({
        projeto_id: projetoId,
        entidade_id: entidade.id,
        tipo,
        realizado_em: realizadoEm.toISOString(),
        resumo: resumo.trim(),
        proximo_passo:
          typeof corpo?.proximo_passo === "string" && corpo.proximo_passo.trim()
            ? corpo.proximo_passo.trim()
            : null,
        proximo_passo_em: proximoPassoEm?.toISOString() ?? null,
        autor_usuario_id: usuario?.id ?? null,
        autor_nome: usuario?.nome ?? null,
      })
      .select(
        "id, tipo, realizado_em, resumo, proximo_passo, proximo_passo_em, autor_nome, criado_em"
      )
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json(
      { projeto_id: projetoId, cliente_id: entidade.id_externo, contato: data },
      { status: 201 }
    );
  } catch (erro) {
    return NextResponse.json(
      { erro: `Falha ao registrar contato: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identificador = searchParams.get("cliente_id");
  const limite = Math.min(Math.max(Number(searchParams.get("limite")) || 50, 1), 500);
  const supabase = criarClienteSupabaseAdmin();

  try {
    const projetoId = await resolverProjetoId(searchParams.get("projeto_id"));

    let consulta = supabase
      .from("contatos")
      .select(
        "id, entidade_id, tipo, realizado_em, resumo, proximo_passo, proximo_passo_em, autor_nome, criado_em, entidades(id_externo, nome_exibicao)"
      )
      .eq("projeto_id", projetoId)
      .order("realizado_em", { ascending: false })
      .limit(limite);

    if (identificador) {
      const entidade = await resolverEntidade(supabase, projetoId, identificador);
      if (!entidade) {
        return NextResponse.json(
          { erro: `Cliente "${identificador}" não encontrado.` },
          { status: 404 }
        );
      }
      consulta = consulta.eq("entidade_id", entidade.id);
    }

    const { data, error } = await consulta;
    if (error) throw new Error(error.message);

    return NextResponse.json({ projeto_id: projetoId, contatos: data ?? [] });
  } catch (erro) {
    return NextResponse.json(
      { erro: `Falha ao listar contatos: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}
