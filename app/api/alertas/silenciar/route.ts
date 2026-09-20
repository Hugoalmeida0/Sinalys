import { NextResponse } from "next/server";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { MAX_DIAS_SILENCIAMENTO, PADRAO_DIAS_SILENCIAMENTO } from "@/lib/contatos/constantes";
import { resolverEntidade } from "@/lib/ia/contexto";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * "Silenciar alertas": tira o cliente da fila do dia por `dias` (default 30).
 * Corpo: { cliente_id (UUID ou id_externo), dias?, motivo?, projeto_id? }
 */
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const identificador: unknown = corpo?.cliente_id ?? corpo?.entidade_id;
  if (typeof identificador !== "string" || !identificador.trim()) {
    return NextResponse.json({ erro: "Campo 'cliente_id' é obrigatório." }, { status: 400 });
  }

  const dias = corpo?.dias == null ? PADRAO_DIAS_SILENCIAMENTO : Number(corpo.dias);
  if (!Number.isInteger(dias) || dias < 1 || dias > MAX_DIAS_SILENCIAMENTO) {
    return NextResponse.json(
      { erro: `Campo 'dias' deve ser um inteiro entre 1 e ${MAX_DIAS_SILENCIAMENTO}.` },
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

    const silenciadoAte = new Date(Date.now() + dias * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("silenciamentos_alerta")
      .insert({
        projeto_id: projetoId,
        entidade_id: entidade.id,
        silenciado_ate: silenciadoAte,
        motivo:
          typeof corpo?.motivo === "string" && corpo.motivo.trim() ? corpo.motivo.trim() : null,
        autor_usuario_id: usuario?.id ?? null,
      })
      .select("id, silenciado_ate, motivo, criado_em")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json(
      { projeto_id: projetoId, cliente_id: entidade.id_externo, silenciamento: data },
      { status: 201 }
    );
  } catch (erro) {
    return NextResponse.json(
      { erro: `Falha ao silenciar alertas: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Reativa os alertas: encerra agora todo silenciamento vigente do cliente.
 * Corpo: { cliente_id, projeto_id? }
 */
export async function DELETE(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const identificador: unknown = corpo?.cliente_id ?? corpo?.entidade_id;
  if (typeof identificador !== "string" || !identificador.trim()) {
    return NextResponse.json({ erro: "Campo 'cliente_id' é obrigatório." }, { status: 400 });
  }

  const supabase = criarClienteSupabaseAdmin();

  try {
    const projetoId = await resolverProjetoId(corpo?.projeto_id);
    const entidade = await resolverEntidade(supabase, projetoId, identificador.trim());
    if (!entidade) {
      return NextResponse.json(
        { erro: `Cliente "${identificador}" não encontrado.` },
        { status: 404 }
      );
    }

    const agora = new Date().toISOString();
    const { data, error } = await supabase
      .from("silenciamentos_alerta")
      .update({ silenciado_ate: agora })
      .eq("projeto_id", projetoId)
      .eq("entidade_id", entidade.id)
      .gt("silenciado_ate", agora)
      .select("id");
    if (error) throw new Error(error.message);

    return NextResponse.json({
      projeto_id: projetoId,
      cliente_id: entidade.id_externo,
      encerrados: data?.length ?? 0,
    });
  } catch (erro) {
    return NextResponse.json(
      { erro: `Falha ao reativar alertas: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}
