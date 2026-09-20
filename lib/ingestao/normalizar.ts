import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { lerLinhasDaAba } from "./planilha";

export interface MapeamentoRegistro {
  id: string;
  aba_origem: string;
  coluna_origem: string;
  tipo_destino: string;
  campo_destino: string | null;
  metrica_id: string | null;
  config_transformacao: Record<string, unknown> | null;
}

export interface DefinicaoMetricaRegistro {
  id: string;
  codigo: string;
  tipo_valor: "numero" | "texto" | "booleano";
}

export interface RelatorioProcessamento {
  linhas_lidas: number;
  entidades_criadas: number;
  entidades_atualizadas: number;
  observacoes_gravadas: number;
  eventos_gravados: number;
  erros: string[];
}

const REGEX_DATA_BR = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/;

function parseData(valor: unknown): Date | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;

  if (typeof valor === "number") {
    const parsed = XLSX.SSF.parse_date_code(valor);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S));
  }

  const texto = String(valor).trim();
  const matchBr = texto.match(REGEX_DATA_BR);
  if (matchBr) {
    const [, dia, mes, anoBruto, hora = "0", minuto = "0"] = matchBr;
    const ano = anoBruto.length === 2 ? Number(anoBruto) + 2000 : Number(anoBruto);
    return new Date(
      Date.UTC(ano, Number(mes) - 1, Number(dia), Number(hora), Number(minuto))
    );
  }

  const isoTentativa = new Date(texto);
  return Number.isNaN(isoTentativa.getTime()) ? null : isoTentativa;
}

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

function coagirValorMetrica(
  valorBruto: unknown,
  tipoValor: DefinicaoMetricaRegistro["tipo_valor"]
): { valor_numero: number | null; valor_texto: string | null; valor_booleano: boolean | null } | null {
  if (valorBruto == null || valorBruto === "") return null;

  if (tipoValor === "numero") {
    const numero =
      typeof valorBruto === "number"
        ? valorBruto
        : Number(String(valorBruto).trim().replace(",", "."));
    if (Number.isNaN(numero)) return null;
    return { valor_numero: numero, valor_texto: null, valor_booleano: null };
  }

  if (tipoValor === "booleano") {
    const texto = String(valorBruto).trim().toLowerCase();
    const verdadeiros = ["sim", "true", "verdadeiro", "1", "s"];
    const falsos = ["nao", "não", "false", "falso", "0", "n"];
    if (verdadeiros.includes(texto)) return { valor_numero: null, valor_texto: null, valor_booleano: true };
    if (falsos.includes(texto)) return { valor_numero: null, valor_texto: null, valor_booleano: false };
    return null;
  }

  return { valor_numero: null, valor_texto: String(valorBruto), valor_booleano: null };
}

export async function processarMapeamentos(params: {
  supabase: SupabaseClient;
  projetoId: string;
  execucaoIngestaoId: string;
  workbook: XLSX.WorkBook;
  isCsv: boolean;
  mapeamentos: MapeamentoRegistro[];
  definicoesMetricas: DefinicaoMetricaRegistro[];
}): Promise<RelatorioProcessamento> {
  const { supabase, projetoId, execucaoIngestaoId, workbook, isCsv, mapeamentos, definicoesMetricas } =
    params;

  const relatorio: RelatorioProcessamento = {
    linhas_lidas: 0,
    entidades_criadas: 0,
    entidades_atualizadas: 0,
    observacoes_gravadas: 0,
    eventos_gravados: 0,
    erros: [],
  };

  const metricaPorId = new Map(definicoesMetricas.map((m) => [m.id, m]));
  const abasComMapeamento = Array.from(new Set(mapeamentos.map((m) => m.aba_origem)));

  for (const abaOrigem of abasComMapeamento) {
    const mapeamentosDaAba = mapeamentos.filter((m) => m.aba_origem === abaOrigem);
    const idEntidadeMap = mapeamentosDaAba.find((m) => m.tipo_destino === "id_entidade");

    if (!idEntidadeMap) {
      relatorio.erros.push(`Aba "${abaOrigem}": nenhuma coluna mapeada como id_entidade — ignorada.`);
      continue;
    }

    let linhas: Record<string, unknown>[];
    try {
      linhas = lerLinhasDaAba(workbook, abaOrigem, isCsv);
    } catch (erro) {
      relatorio.erros.push(`Aba "${abaOrigem}": ${(erro as Error).message}`);
      continue;
    }
    relatorio.linhas_lidas += linhas.length;

    const dataObservacaoMap = mapeamentosDaAba.find((m) => m.tipo_destino === "data_observacao");
    const inicioEntidadeMap = mapeamentosDaAba.find((m) => m.tipo_destino === "inicio_entidade");
    const atributoMaps = mapeamentosDaAba.filter((m) => m.tipo_destino === "atributo_entidade");
    const metricaMaps = mapeamentosDaAba.filter((m) => m.tipo_destino === "metrica");
    const codigoEventoMap = mapeamentosDaAba.find((m) => m.tipo_destino === "codigo_evento");
    const dataEventoMap = mapeamentosDaAba.find((m) => m.tipo_destino === "data_evento");
    const statusEventoMaps = mapeamentosDaAba.filter((m) => m.tipo_destino === "status_evento");

    const entidadesPorIdExterno = new Map<
      string,
      { atributos: Record<string, unknown>; iniciadoEm: Date | null }
    >();

    for (const linha of linhas) {
      const idExternoBruto = linha[idEntidadeMap.coluna_origem];
      if (idExternoBruto == null || idExternoBruto === "") continue;
      const idExterno = String(idExternoBruto).trim();

      const atual = entidadesPorIdExterno.get(idExterno) ?? { atributos: {}, iniciadoEm: null };
      for (const atributoMap of atributoMaps) {
        const chave = atributoMap.campo_destino ?? atributoMap.coluna_origem;
        const valor = linha[atributoMap.coluna_origem];
        if (valor != null && valor !== "") atual.atributos[chave] = valor;
      }
      if (inicioEntidadeMap && !atual.iniciadoEm) {
        atual.iniciadoEm = parseData(linha[inicioEntidadeMap.coluna_origem]);
      }
      entidadesPorIdExterno.set(idExterno, atual);
    }

    const idEntidadePorIdExterno = new Map<string, string>();
    const idsExternos = Array.from(entidadesPorIdExterno.keys());

    const existentesPorIdExterno = new Map<
      string,
      { id: string; atributos: Record<string, unknown>; iniciado_em: string | null }
    >();
    for (const lote of emLotes(idsExternos, 500)) {
      const { data: existentes, error: erroSelect } = await supabase
        .from("entidades")
        .select("id, id_externo, atributos, iniciado_em")
        .eq("projeto_id", projetoId)
        .in("id_externo", lote);

      if (erroSelect) {
        relatorio.erros.push(`Aba "${abaOrigem}": falha ao consultar entidades existentes (${erroSelect.message}).`);
        continue;
      }
      for (const e of existentes ?? []) {
        existentesPorIdExterno.set(e.id_externo, e);
      }
    }

    const linhasEntidade = idsExternos.map((idExterno) => {
      const dados = entidadesPorIdExterno.get(idExterno)!;
      const existente = existentesPorIdExterno.get(idExterno);
      const id = existente?.id ?? randomUUID();
      const atributos = { ...(existente?.atributos ?? {}), ...dados.atributos };
      const iniciado_em = existente?.iniciado_em ?? dados.iniciadoEm?.toISOString() ?? null;
      if (existente) relatorio.entidades_atualizadas += 1;
      else relatorio.entidades_criadas += 1;
      idEntidadePorIdExterno.set(idExterno, id);
      return { id, projeto_id: projetoId, id_externo: idExterno, iniciado_em, atributos };
    });

    for (const lote of emLotes(linhasEntidade, 500)) {
      const { error: erroUpsert } = await supabase.from("entidades").upsert(lote, { onConflict: "id" });
      if (erroUpsert) {
        relatorio.erros.push(`Aba "${abaOrigem}": falha ao gravar entidades (${erroUpsert.message}).`);
      }
    }

    const observacoesParaGravar: Record<string, unknown>[] = [];
    const eventosParaGravar: Record<string, unknown>[] = [];

    for (const linha of linhas) {
      const idExternoBruto = linha[idEntidadeMap.coluna_origem];
      if (idExternoBruto == null || idExternoBruto === "") continue;
      const idExterno = String(idExternoBruto).trim();
      const entidadeId = idEntidadePorIdExterno.get(idExterno);
      if (!entidadeId) continue;

      const dataObservacao = dataObservacaoMap ? parseData(linha[dataObservacaoMap.coluna_origem]) : null;

      for (const metricaMap of metricaMaps) {
        const valorBruto = linha[metricaMap.coluna_origem];
        if (valorBruto == null || valorBruto === "") continue;
        if (!dataObservacao) {
          relatorio.erros.push(
            `Entidade ${idExterno}: valor de métrica sem data_observacao válida na aba "${abaOrigem}".`
          );
          continue;
        }
        const metricaDef = metricaMap.metrica_id ? metricaPorId.get(metricaMap.metrica_id) : undefined;
        if (!metricaDef) {
          relatorio.erros.push(`Coluna "${metricaMap.coluna_origem}": definição de métrica não encontrada.`);
          continue;
        }
        const valorCoagido = coagirValorMetrica(valorBruto, metricaDef.tipo_valor);
        if (!valorCoagido) {
          relatorio.erros.push(
            `Entidade ${idExterno}: valor "${String(valorBruto)}" inválido para métrica "${metricaDef.codigo}".`
          );
          continue;
        }
        observacoesParaGravar.push({
          id: randomUUID(),
          projeto_id: projetoId,
          entidade_id: entidadeId,
          metrica_id: metricaDef.id,
          observado_em: dataObservacao.toISOString(),
          disponivel_em: dataObservacao.toISOString(),
          execucao_ingestao_id: execucaoIngestaoId,
          ...valorCoagido,
        });
      }

      const dataEvento = dataEventoMap ? parseData(linha[dataEventoMap.coluna_origem]) : dataObservacao;

      if (codigoEventoMap) {
        const valorCodigo = linha[codigoEventoMap.coluna_origem];
        if (valorCodigo != null && valorCodigo !== "") {
          if (dataEvento) {
            eventosParaGravar.push({
              id: randomUUID(),
              projeto_id: projetoId,
              entidade_id: entidadeId,
              codigo_evento: String(valorCodigo).trim(),
              ocorrido_em: dataEvento.toISOString(),
              execucao_ingestao_id: execucaoIngestaoId,
            });
          } else {
            relatorio.erros.push(`Entidade ${idExterno}: evento sem data_evento válida na aba "${abaOrigem}".`);
          }
        }
      }

      for (const statusMap of statusEventoMaps) {
        const valorStatus = linha[statusMap.coluna_origem];
        if (valorStatus == null || valorStatus === "") continue;
        const gatilhos = (statusMap.config_transformacao?.gatilhos ?? {}) as Record<string, string>;
        const codigoEvento = gatilhos[String(valorStatus).trim()];
        if (!codigoEvento) continue;
        if (!dataEvento) {
          relatorio.erros.push(
            `Entidade ${idExterno}: status_evento "${valorStatus}" sem data associada na aba "${abaOrigem}".`
          );
          continue;
        }
        eventosParaGravar.push({
          id: randomUUID(),
          projeto_id: projetoId,
          entidade_id: entidadeId,
          codigo_evento: codigoEvento,
          ocorrido_em: dataEvento.toISOString(),
          execucao_ingestao_id: execucaoIngestaoId,
        });
      }
    }

    for (const lote of emLotes(observacoesParaGravar, 1000)) {
      const { error, count } = await supabase
        .from("observacoes")
        .upsert(lote, { onConflict: "entidade_id,metrica_id,observado_em", count: "exact" });
      if (error) {
        relatorio.erros.push(`Aba "${abaOrigem}": falha ao gravar observações (${error.message}).`);
      } else {
        relatorio.observacoes_gravadas += count ?? lote.length;
      }
    }

    for (const lote of emLotes(eventosParaGravar, 1000)) {
      const { error, count } = await supabase
        .from("eventos_desfecho")
        .upsert(lote, { onConflict: "entidade_id,codigo_evento,ocorrido_em", count: "exact" });
      if (error) {
        relatorio.erros.push(`Aba "${abaOrigem}": falha ao gravar eventos (${error.message}).`);
      } else {
        relatorio.eventos_gravados += count ?? lote.length;
      }
    }
  }

  return relatorio;
}
