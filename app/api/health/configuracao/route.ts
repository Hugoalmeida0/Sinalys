import { NextResponse } from "next/server";
import { resolverEntidade } from "@/lib/ia/contexto";
import {
  CHAVE_ATRIBUTO_HEALTH_PUBLICO,
  MAX_DESTAQUES_HEALTH,
  BENEFICIOS_PLANO,
  lerConfigHealthPublico,
  serializarConfigHealthPublico,
  validarLinkAgendamento,
  type ConfigHealthPublico,
} from "@/lib/health/configuracao";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_TAMANHO_CODIGO = 120;

function listaDeCodigos(
  valor: unknown,
  campo: string,
  max: number
): { lista?: string[] | null; erro?: string } {
  if (valor === undefined) return {};
  if (valor === null) return { lista: null };
  if (!Array.isArray(valor) || !valor.every((v) => typeof v === "string")) {
    return { erro: `Campo '${campo}' deve ser uma lista de códigos ou null.` };
  }
  const lista = Array.from(
    new Set((valor as string[]).map((v) => v.trim()).filter((v) => v && v.length <= MAX_TAMANHO_CODIGO))
  );
  if (lista.length > max) {
    return { erro: `Campo '${campo}' aceita no máximo ${max} itens.` };
  }
  return { lista };
}

export async function PUT(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const identificador: unknown = corpo?.cliente_id ?? corpo?.entidade_id;
  if (typeof identificador !== "string" || !identificador.trim()) {
    return NextResponse.json({ erro: "Campo 'cliente_id' é obrigatório." }, { status: 400 });
  }

  const destaques = listaDeCodigos(corpo?.destaques, "destaques", MAX_DESTAQUES_HEALTH);
  if (destaques.erro) return NextResponse.json({ erro: destaques.erro }, { status: 400 });

  const beneficios = listaDeCodigos(corpo?.beneficios, "beneficios", BENEFICIOS_PLANO.length);
  if (beneficios.erro) return NextResponse.json({ erro: beneficios.erro }, { status: 400 });
  if (beneficios.lista) {
    const conhecidos = new Set(BENEFICIOS_PLANO.map((b) => b.codigo));
    const desconhecido = beneficios.lista.find((c) => !conhecidos.has(c));
    if (desconhecido) {
      return NextResponse.json({ erro: `Benefício desconhecido: "${desconhecido}".` }, { status: 400 });
    }
  }

  const link = corpo?.link_agendamento === undefined ? undefined : validarLinkAgendamento(corpo.link_agendamento);
  if (link?.erro) return NextResponse.json({ erro: link.erro }, { status: 400 });

  const supabase = criarClienteSupabaseAdmin();

  try {
    const projetoId = await resolverProjetoId(corpo?.projeto_id);
    const entidade = await resolverEntidade(supabase, projetoId, identificador.trim());
    if (!entidade) {
      return NextResponse.json({ erro: `Cliente "${identificador}" não encontrado.` }, { status: 404 });
    }

    const { data: atual, error: erroLeitura } = await supabase
      .from("entidades")
      .select("atributos")
      .eq("id", entidade.id)
      .single();
    if (erroLeitura) throw new Error(erroLeitura.message);

    const anterior = lerConfigHealthPublico(atual.atributos);
    const config: ConfigHealthPublico = {
      destaques: destaques.lista === undefined ? anterior.destaques : destaques.lista,
      beneficios: beneficios.lista === undefined ? anterior.beneficios : beneficios.lista,
      linkAgendamento: link === undefined ? anterior.linkAgendamento : (link.link ?? null),
      atualizadoEm: new Date().toISOString(),
    };

    const atributos = {
      ...((atual.atributos as Record<string, unknown> | null) ?? {}),
      [CHAVE_ATRIBUTO_HEALTH_PUBLICO]: serializarConfigHealthPublico(config),
    };
    const { error: erroEscrita } = await supabase
      .from("entidades")
      .update({ atributos })
      .eq("id", entidade.id);
    if (erroEscrita) throw new Error(erroEscrita.message);

    return NextResponse.json({ projeto_id: projetoId, cliente_id: entidade.id_externo, configuracao: config });
  } catch (erro) {
    return NextResponse.json(
      { erro: `Falha ao salvar personalização: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}
