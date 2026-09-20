/**
 * Clientes de teste do motor novo (decisão do usuário em 2026-09-20: não
 * apagar as predições antigas; criar clientes novos, sinalizados, para ver o
 * motor novo lado a lado).
 *
 * `criar`  — clona cada entidade do projeto (cadastro + observações + eventos
 *            de desfecho) como `<id_externo>-T` com `atributos.teste_motor =
 *            true` e `atributos.teste_origem = <id_externo>`, e roda o motor
 *            mês a mês (Task B.5, `scripts/backfill-motor.mts`) só para os clones. A estatística de carteira
 *            do z-score continua sobre o projeto inteiro.
 * `remover` — apaga os clones e tudo que depende deles (predições, motivos,
 *            observações, eventos, silenciamentos, contatos).
 *
 *   npx tsx scripts/clientes-teste-motor.mts criar
 *   npx tsx scripts/clientes-teste-motor.mts remover
 */
import { randomUUID } from "node:crypto";
import { buscarTodasLinhas } from "@/lib/supabase/paginar";
import { backfill, carregarEnv, criarSupabase, emLotes } from "./backfill-motor.mjs";

const SUFIXO = "-T";

const env = carregarEnv();
const supabase = criarSupabase(env);
const projetoId = env.DEFAULT_PROJETO_ID;

interface Entidade {
  id: string;
  id_externo: string;
  nome_exibicao: string | null;
  iniciado_em: string | null;
  atributos: Record<string, unknown> | null;
}

async function listarEntidades(): Promise<Entidade[]> {
  const { data, error } = await supabase
    .from("entidades")
    .select("id, id_externo, nome_exibicao, iniciado_em, atributos")
    .eq("projeto_id", projetoId);
  if (error) throw new Error(error.message);
  return data as Entidade[];
}

async function criar() {
  const todas = await listarEntidades();
  const clonesExistentes = todas.filter((e) => e.atributos?.teste_motor === true);
  const originais = todas.filter((e) => e.atributos?.teste_motor !== true);
  if (clonesExistentes.length) {
    console.log(`Já existem ${clonesExistentes.length} clientes de teste — nada a criar. Use "remover" antes.`);
    return;
  }

  console.log(`Clonando ${originais.length} entidades…`);
  const novoIdPorOriginal = new Map<string, string>();
  const linhasEntidades = originais.map((e) => {
    const id = randomUUID();
    novoIdPorOriginal.set(e.id, id);
    return {
      id,
      projeto_id: projetoId,
      id_externo: `${e.id_externo}${SUFIXO}`,
      nome_exibicao: `${e.nome_exibicao || e.id_externo} (teste)`,
      iniciado_em: e.iniciado_em,
      atributos: { ...(e.atributos ?? {}), teste_motor: true, teste_origem: e.id_externo },
    };
  });
  for (const lote of emLotes(linhasEntidades)) {
    const { error } = await supabase.from("entidades").insert(lote);
    if (error) throw new Error(`entidades: ${error.message}`);
  }

  const originalIds = Array.from(novoIdPorOriginal.keys());

  interface ObsLinha {
    entidade_id: string;
    metrica_id: string;
    observado_em: string;
    disponivel_em: string;
    valor_numero: number | string | null;
    valor_texto: string | null;
    valor_booleano: boolean | null;
  }
  const { data: obs, error: erroObs } = await buscarTodasLinhas<ObsLinha>(() =>
    supabase
      .from("observacoes")
      .select("entidade_id, metrica_id, observado_em, disponivel_em, valor_numero, valor_texto, valor_booleano")
      .eq("projeto_id", projetoId)
      .in("entidade_id", originalIds)
      // Ordem total (a unique é entidade+métrica+data) — senão as páginas se sobrepõem.
      .order("entidade_id", { ascending: true })
      .order("metrica_id", { ascending: true })
      .order("observado_em", { ascending: true })
  );
  if (erroObs) throw new Error(`observacoes: ${erroObs.message}`);
  const linhasObs = obs.map((o) => ({
    id: randomUUID(),
    projeto_id: projetoId,
    entidade_id: novoIdPorOriginal.get(o.entidade_id)!,
    metrica_id: o.metrica_id,
    observado_em: o.observado_em,
    disponivel_em: o.disponivel_em,
    valor_numero: o.valor_numero,
    valor_texto: o.valor_texto,
    valor_booleano: o.valor_booleano,
    execucao_ingestao_id: null,
  }));
  for (const lote of emLotes(linhasObs)) {
    const { error } = await supabase.from("observacoes").insert(lote);
    if (error) throw new Error(`observacoes: ${error.message}`);
  }
  console.log(`  ${linhasObs.length} observações copiadas`);

  interface EventoLinha {
    entidade_id: string;
    codigo_evento: string;
    ocorrido_em: string;
    detalhes_evento: Record<string, unknown> | null;
  }
  const { data: eventos, error: erroEv } = await buscarTodasLinhas<EventoLinha>(() =>
    supabase
      .from("eventos_desfecho")
      .select("entidade_id, codigo_evento, ocorrido_em, detalhes_evento")
      .eq("projeto_id", projetoId)
      .in("entidade_id", originalIds)
      .order("entidade_id", { ascending: true })
      .order("codigo_evento", { ascending: true })
      .order("ocorrido_em", { ascending: true })
  );
  if (erroEv) throw new Error(`eventos_desfecho: ${erroEv.message}`);
  const linhasEv = eventos.map((ev) => ({
    id: randomUUID(),
    projeto_id: projetoId,
    entidade_id: novoIdPorOriginal.get(ev.entidade_id)!,
    codigo_evento: ev.codigo_evento,
    ocorrido_em: ev.ocorrido_em,
    detalhes_evento: { ...(ev.detalhes_evento ?? {}), teste_motor: true },
    execucao_ingestao_id: null,
  }));
  for (const lote of emLotes(linhasEv)) {
    const { error } = await supabase.from("eventos_desfecho").insert(lote);
    if (error) throw new Error(`eventos_desfecho: ${error.message}`);
  }
  console.log(`  ${linhasEv.length} eventos de desfecho copiados`);

  await backfill(supabase, projetoId, Array.from(novoIdPorOriginal.values()));
}

async function remover() {
  const clones = (await listarEntidades()).filter((e) => e.atributos?.teste_motor === true);
  if (!clones.length) {
    console.log("Nenhum cliente de teste encontrado.");
    return;
  }
  const ids = clones.map((e) => e.id);
  console.log(`Removendo ${ids.length} clientes de teste e seus dados…`);

  const { data: preds, error: erroPreds } = await buscarTodasLinhas<{ id: string }>(() =>
    supabase.from("predicoes").select("id").eq("projeto_id", projetoId).in("entidade_id", ids)
  );
  if (erroPreds) throw new Error(erroPreds.message);
  for (const lote of emLotes(preds.map((p) => p.id))) {
    const { error } = await supabase.from("motivos_predicao").delete().in("predicao_id", lote);
    if (error) throw new Error(`motivos_predicao: ${error.message}`);
  }

  for (const tabela of [
    "predicoes",
    "observacoes",
    "eventos_desfecho",
    "silenciamentos_alerta",
    "contatos",
    "diagnosticos_ia",
  ]) {
    for (const lote of emLotes(ids)) {
      const { error } = await supabase.from(tabela).delete().eq("projeto_id", projetoId).in("entidade_id", lote);
      // Tabelas opcionais (ex. diagnósticos) podem não existir em todo ambiente.
      if (error && !/relation .* does not exist/i.test(error.message)) {
        throw new Error(`${tabela}: ${error.message}`);
      }
    }
  }
  for (const lote of emLotes(ids)) {
    const { error } = await supabase.from("entidades").delete().in("id", lote);
    if (error) throw new Error(`entidades: ${error.message}`);
  }
  console.log("Concluído.");
}

const comando = process.argv[2];
if (comando === "criar") await criar();
else if (comando === "remover") await remover();
else {
  console.error("Uso: npx tsx scripts/clientes-teste-motor.mts <criar|remover>");
  process.exit(1);
}
