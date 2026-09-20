import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { montarContextoAtual, SemPredicaoError } from "@/lib/ia/contexto";
import { tempoDesde } from "@/lib/format";
import {
  lerConfigHealthPublico,
  resolverBeneficios,
  resolverDestaques,
  type ConfigHealthPublico,
} from "./health-config";
import { resolverModeloAtivoId } from "./projeto";

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface HealthPublico {
  nome: string;
  /** null quando a data de início não está cadastrada. */
  clienteDesdeTexto: string | null;
  /**
   * Frases positivas derivadas dos sinais do motor de risco que NÃO foram
   * acionados (ou seja, estão dentro do esperado) — nunca dos que foram
   * acionados. É a única leitura do motor matemático que chega até aqui.
   * Quais aparecem é escolha do CS (lib/painel/health-config.ts).
   */
  destaques: string[];
  beneficios: string[];
  /** Agenda externa configurada pelo CS; null = formulário embutido de pedido de call. */
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

/**
 * Resolve a entidade dona de um token de compartilhamento. `null` para token
 * inexistente OU mal formado: `token_compartilhamento` é uuid no banco, e um
 * valor inválido (link corrompido, "undefined" de uma renderização antiga)
 * faria o Postgres rejeitar a query — melhor 404 do que 500 na cara do
 * cliente final.
 */
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

/**
 * Fecha o loop com o cliente final — mas como ferramenta de retenção, não
 * como um raio-x de risco exposto sem curadoria. Esta página é para o CS
 * abrir a conversa com o cliente a partir de algo positivo (docs/inteligencia.md
 * não cobre isso — é decisão de produto, não do motor): NUNCA expõe score de
 * risco, faixa, sinais acionados (ruins), MRR ou qualquer comparação com o
 * resto da carteira. Esses dados continuam privados à organização, visíveis
 * só no painel interno (aba "Plano de ação" do cliente).
 *
 * Retorna `null` quando o token não existe/é inválido (rota responde 404).
 */
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
    // Cliente sem predição calculada ainda: página mostra estado neutro/positivo, não erro.
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
