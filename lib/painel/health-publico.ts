import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { montarContextoAtual, SemPredicaoError } from "@/lib/ia/contexto";
import { tempoDesde } from "@/lib/format";
import { resolverModeloAtivoId } from "./projeto";

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Perks fixos do plano, exibidos para todo cliente (fictícios — não existe
 * ainda um cadastro real de benefícios por plano). O objetivo não é
 * informativo: é dar ao CS um motivo positivo concreto para abrir a
 * conversa de retenção, em vez de uma lista genérica de "estamos aqui pra
 * ajudar".
 */
const BENEFICIOS_PADRAO = [
  "Suporte prioritário, com tempo de resposta reduzido para chamados críticos",
  "Consultoria estratégica trimestral com seu time de sucesso",
  "Acesso antecipado a novos recursos antes do lançamento geral",
];

export interface HealthPublico {
  nome: string;
  /** null quando a data de início não está cadastrada. */
  clienteDesdeTexto: string | null;
  /**
   * Frases positivas derivadas dos sinais do motor de risco que NÃO foram
   * acionados (ou seja, estão dentro do esperado) — nunca dos que foram
   * acionados. É a única leitura do motor matemático que chega até aqui.
   */
  destaques: string[];
  beneficios: string[];
}

const DESTAQUE_PADRAO = "Sua conta está em dia com o que a gente acompanha por aqui.";

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
  // `token_compartilhamento` é uuid no banco: um valor mal formado (ex. um
  // link corrompido ou "undefined" de uma renderização antiga) faz o
  // Postgres rejeitar a query com erro de sintaxe — melhor responder 404 do
  // que deixar isso virar um 500 na cara do cliente final.
  if (!REGEX_UUID.test(token)) return null;

  const supabase = criarClienteSupabaseAdmin();

  const { data: entidade, error: erroEntidade } = await supabase
    .from("entidades")
    .select("id, projeto_id, id_externo, nome_exibicao, iniciado_em")
    .eq("token_compartilhamento", token)
    .maybeSingle();
  if (erroEntidade) throw new Error(`Falha ao resolver token de compartilhamento: ${erroEntidade.message}`);
  if (!entidade) return null;

  const nome = entidade.nome_exibicao || entidade.id_externo;
  const clienteDesdeTexto = entidade.iniciado_em ? tempoDesde(String(entidade.iniciado_em)) : null;

  const modeloId = await resolverModeloAtivoId(supabase, entidade.projeto_id);
  if (!modeloId) {
    return { nome, clienteDesdeTexto, destaques: [], beneficios: BENEFICIOS_PADRAO };
  }

  try {
    const contexto = await montarContextoAtual({
      supabase,
      projetoId: entidade.projeto_id,
      entidade: { id: entidade.id, id_externo: entidade.id_externo, nome_exibicao: entidade.nome_exibicao },
      modeloId,
    });

    const destaques = contexto.sinais
      .filter((s) => s.acionado === false)
      .slice(0, 3)
      .map((s) => `${s.metrica}: dentro do esperado`);

    return { nome, clienteDesdeTexto, destaques, beneficios: BENEFICIOS_PADRAO };
  } catch (erro) {
    // Cliente sem predição calculada ainda: página mostra estado neutro/positivo, não erro.
    if (erro instanceof SemPredicaoError) {
      return { nome, clienteDesdeTexto, destaques: [], beneficios: BENEFICIOS_PADRAO };
    }
    throw erro;
  }
}

export { DESTAQUE_PADRAO };
