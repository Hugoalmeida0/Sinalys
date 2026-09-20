import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { montarContextoAtual, SemPredicaoError } from "@/lib/ia/contexto";
import { tempoDesde } from "@/lib/utils/formatacao";
import {
  lerConfigHealthPublico,
  resolverBeneficios,
  resolverDestaques,
  type ConfigHealthPublico,
} from "@/lib/health/configuracao";
import { resolverModeloAtivoId } from "@/lib/painel/projeto";

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface HealthPublico {
  nome: string;

  clienteDesdeTexto: string | null;

  destaques: string[];
  beneficios: string[];

  linkAgendamento: string | null;
}

const DESTAQUE_PADRAO = "Sua conta está em dia com o que a gente acompanha por aqui.";

export interface EntidadePorToken {
  id: string;
  projeto_id: string;
  id_externo: string;
  nome_exibicao: string | null;
  iniciado_em: string | null;
  atributos: unknown;
}

export async function resolverEntidadePorToken(
  supabase: SupabaseClient,
  token: string
): Promise<EntidadePorToken | null> {
  if (!REGEX_UUID.test(token)) return null;
  const { data, error } = await supabase
    .from("entidades")
    .select("id, projeto_id, id_externo, nome_exibicao, iniciado_em, atributos")
    .eq("token_compartilhamento", token)
    .maybeSingle();
  if (error) throw new Error(`Falha ao resolver token de compartilhamento: ${error.message}`);
  return (data as EntidadePorToken | null) ?? null;
}

export async function buscarHealthPublico(token: string): Promise<HealthPublico | null> {
  const supabase = criarClienteSupabaseAdmin();

  const entidade = await resolverEntidadePorToken(supabase, token);
  if (!entidade) return null;

  const nome = entidade.nome_exibicao || entidade.id_externo;
  const clienteDesdeTexto = entidade.iniciado_em ? tempoDesde(String(entidade.iniciado_em)) : null;
  const config = lerConfigHealthPublico(entidade.atributos);

  const semSinais = (): HealthPublico => montar(nome, clienteDesdeTexto, config, []);

  const modeloId = await resolverModeloAtivoId(supabase, entidade.projeto_id);
  if (!modeloId) return semSinais();

  try {
    const contexto = await montarContextoAtual({
      supabase,
      projetoId: entidade.projeto_id,
      entidade: { id: entidade.id, id_externo: entidade.id_externo, nome_exibicao: entidade.nome_exibicao },
      modeloId,
    });

    const candidatos = contexto.sinais
      .filter((s) => s.acionado === false)
      .map((s) => ({ codigo: s.codigo_sinal, rotulo: s.metrica }));

    return montar(nome, clienteDesdeTexto, config, candidatos);
  } catch (erro) {
    if (erro instanceof SemPredicaoError) return semSinais();
    throw erro;
  }
}

function montar(
  nome: string,
  clienteDesdeTexto: string | null,
  config: ConfigHealthPublico,
  candidatos: { codigo: string; rotulo: string }[]
): HealthPublico {
  return {
    nome,
    clienteDesdeTexto,
    destaques: resolverDestaques(config, candidatos),
    beneficios: resolverBeneficios(config).map((b) => b.texto),
    linkAgendamento: config.linkAgendamento,
  };
}

export { DESTAQUE_PADRAO };
