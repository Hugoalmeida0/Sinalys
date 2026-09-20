/**
 * Task B.5 — Backfill mensal do motor: roda `calcularPredicoesProjeto` no 1º
 * dia de cada mês, da primeira observação do projeto até a última, para que
 * exista série histórica de verdade (tendência, evolução do score, KPI de
 * antecedência) em vez de uma foto única.
 *
 *   npx tsx scripts/backfill-motor.mts            # todas as entidades
 *   npx tsx scripts/backfill-motor.mts --limpar   # antes, apaga predições com
 *                                                 # referência posterior à
 *                                                 # última observação (rodadas
 *                                                 # antigas com "hoje")
 *
 * Idempotente: a chave de dedup é (entidade, dia), então rodar de novo só
 * atualiza.
 */
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calcularPredicoesProjeto, resolverReferenciaPadrao } from "@/lib/motor/calcular";
import { buscarTodasLinhas } from "@/lib/supabase/paginar";

const LOTE = 500;

export function carregarEnv(): Record<string, string> {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

export function emLotes<T>(itens: T[]): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += LOTE) lotes.push(itens.slice(i, i + LOTE));
  return lotes;
}

export function criarSupabase(env: Record<string, string>): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Apaga predições (e motivos) com referência posterior à última observação — rodadas antigas com `referencia_em = hoje`. */
export async function limparPredicoesFuturas(supabase: SupabaseClient, projetoId: string): Promise<number> {
  const ultima = await resolverReferenciaPadrao(supabase, projetoId);
  if (!ultima) return 0;
  const corte = new Date(ultima.getTime() + 86_400_000 - 1).toISOString();

  const { data: preds, error } = await buscarTodasLinhas<{ id: string }>(() =>
    supabase
      .from("predicoes")
      .select("id")
      .eq("projeto_id", projetoId)
      .gt("referencia_em", corte)
      .order("id", { ascending: true })
  );
  if (error) throw new Error(error.message);

  for (const lote of emLotes(preds.map((p) => p.id))) {
    const r1 = await supabase.from("motivos_predicao").delete().in("predicao_id", lote);
    if (r1.error) throw new Error(`motivos_predicao: ${r1.error.message}`);
    const r2 = await supabase.from("predicoes").delete().in("id", lote);
    if (r2.error) throw new Error(`predicoes: ${r2.error.message}`);
  }
  return preds.length;
}

/** Roda o motor no 1º dia de cada mês, da primeira observação até a última; `entidadeIds` restringe quem é calculado. */
export async function backfill(supabase: SupabaseClient, projetoId: string, entidadeIds?: string[]) {
  const { data: modelo, error } = await supabase
    .from("modelos")
    .select("id")
    .eq("projeto_id", projetoId)
    .eq("status", "ativo")
    .single();
  if (error || !modelo) throw new Error("Projeto sem modelo ativo.");

  const { data: primeira } = await supabase
    .from("observacoes")
    .select("observado_em")
    .eq("projeto_id", projetoId)
    .order("observado_em", { ascending: true })
    .limit(1)
    .single();
  const ultima = await resolverReferenciaPadrao(supabase, projetoId);
  if (!primeira || !ultima) throw new Error("Projeto sem observações.");

  const inicio = new Date(primeira.observado_em);
  const referencias: Date[] = [];
  for (
    let d = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
    d <= ultima;
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  ) {
    referencias.push(d);
  }
  if (referencias[referencias.length - 1]?.getTime() !== ultima.getTime()) referencias.push(ultima);

  console.log(`Backfill: ${referencias.length} referências${entidadeIds ? ` para ${entidadeIds.length} entidades` : ""}…`);
  for (const referenciaEm of referencias) {
    const t0 = Date.now();
    const r = await calcularPredicoesProjeto({
      supabase,
      projetoId,
      modeloId: modelo.id,
      referenciaEm,
      somenteEntidades: entidadeIds,
    });
    const cob = r.predicoes.reduce((s, p) => s + p.cobertura, 0) / (r.predicoes.length || 1);
    console.log(
      `  ${referenciaEm.toISOString().slice(0, 10)}: ${r.predicoes.length} predições, cobertura ${cob.toFixed(2)}, ${Date.now() - t0} ms${r.avisos.length ? ` — avisos: ${r.avisos.join(" | ")}` : ""}`
    );
  }
}

// Só executa quando chamado diretamente (o script dos clones importa as funções).
if (process.argv[1] && /backfill-motor\.mts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const env = carregarEnv();
  const supabase = criarSupabase(env);
  const projetoId = env.DEFAULT_PROJETO_ID;
  if (process.argv.includes("--limpar")) {
    const n = await limparPredicoesFuturas(supabase, projetoId);
    console.log(`Removidas ${n} predições com referência posterior à última observação.`);
  }
  await backfill(supabase, projetoId);
}
