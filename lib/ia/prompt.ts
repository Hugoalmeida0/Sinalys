import { formatCurrencyBRL } from "@/lib/utils/formatacao";
import type { CasoSimilar, ContextoAtual } from "./tipos";

export const PROMPT_SISTEMA = `Você é um gestor sênior de Customer Success analisando risco de churn em uma carteira B2B.

Escreva em português do Brasil, em tom direto e profissional, dirigido a um analista que vai agir hoje.

Regras invioláveis:
- Baseie-se exclusivamente nos dados fornecidos. Nunca invente métricas, números, datas, nomes ou fatos que não estejam no contexto.
- Cite os sinais concretos que sustentam sua conclusão, com os valores observados.
- Se um sinal foi acionado por AUSÊNCIA de dado, trate a omissão como o sinal que ela é (cliente parou de reportar ou usar o produto), não como erro de sistema.
- Se nenhum caso histórico similar foi fornecido, diga isso com todas as letras em "analise_lookalike" e não simule uma comparação.
- O plano de ação deve conter passos executáveis e específicos (quem contatar, sobre o quê, com que objetivo). Proibido escrever conselhos vagos como "monitorar de perto", "acompanhar o cliente" ou "reforçar o relacionamento".
- Não prometa resultados nem garanta retenção.
- Em "plano_acao_imediato", cada item é o texto puro de uma ação. Não comece o item com número, marcador ou "1." — a numeração é feita por quem exibe a lista.
- Ao comparar com casos históricos, descreva cada caso pelo que o texto dele realmente contém. Não atribua a um caso sinais que ele não apresenta, e não extrapole percentuais a partir de dois ou três casos.`;

export function montarPromptUsuario(params: {
  contexto: ContextoAtual;
  casosSimilares: CasoSimilar[];
}): string {
  const { contexto, casosSimilares } = params;
  const nome = contexto.nome_exibicao ?? contexto.id_externo;

  const blocos: string[] = [];

  blocos.push(
    [
      `## Contexto atual (${contexto.rotulo_entidade}: ${nome})`,
      `Data de referência da análise: ${contexto.referencia_em}`,
      `Score de risco: ${contexto.pontuacao.toFixed(1)}/100 (faixa: ${contexto.faixa_risco ?? "indefinida"})`,
      contexto.valor_impacto != null
        ? `Receita mensal em risco: ${formatCurrencyBRL(contexto.valor_impacto)}`
        : "Receita mensal: não mapeada para este cliente.",
      contexto.cobertura != null
        ? `Cobertura do modelo: ${(contexto.cobertura * 100).toFixed(0)}% das regras puderam ser avaliadas.`
        : null,
    ]
      .filter(Boolean)
      .join("\n")
  );

  blocos.push(["### Sinais avaliados pelo motor", formatarSinais(contexto)].join("\n"));

  blocos.push(
    [
      "## Contexto histórico (casos similares da própria base da empresa)",
      formatarCasos(casosSimilares),
    ].join("\n")
  );

  blocos.push(
    "## Sua tarefa\nProduza o diagnóstico do principal ofensor, a leitura do que o histórico sugere e o plano de ação imediato."
  );

  return blocos.join("\n\n");
}

function formatarSinais(contexto: ContextoAtual): string {
  if (contexto.sinais.length === 0) {
    return "Nenhuma regra de modelo foi avaliada para este cliente.";
  }

  return contexto.sinais
    .map((sinal) => {
      const observado = sinal.valor_observado ?? {};
      let situacao: string;

      if (sinal.acionado === null) {
        situacao = "NÃO AVALIÁVEL (dados insuficientes para comparação estatística)";
      } else if (observado.omissao === true) {
        situacao = "ACIONADO POR OMISSÃO (nenhum dado reportado para esta métrica)";
      } else if (sinal.acionado) {
        const valor = observado.valor ?? observado.ultimo_valor;
        situacao = `ACIONADO (valor observado: ${valor ?? "n/d"}${sinal.unidade ? ` ${sinal.unidade}` : ""})`;
      } else {
        const valor = observado.valor ?? observado.ultimo_valor;
        situacao = `dentro do normal (valor observado: ${valor ?? "n/d"}${sinal.unidade ? ` ${sinal.unidade}` : ""})`;
      }

      return `- ${sinal.metrica} [${sinal.codigo_sinal}] — ${situacao}. Peso ${sinal.peso}, contribuição ${sinal.pontos.toFixed(1)} pontos.`;
    })
    .join("\n");
}

function formatarCasos(casos: CasoSimilar[]): string {
  if (casos.length === 0) {
    return "NENHUM caso histórico similar foi encontrado na base vetorial. Não há comparação possível — declare isso explicitamente.";
  }

  return casos
    .map((caso, indice) => {
      const nome = caso.nome_exibicao ?? "cliente não identificado";
      return [
        `### Caso ${indice + 1} — ${nome} (similaridade ${(caso.similaridade * 100).toFixed(0)}%)`,
        `Perfil na época:\n${caso.contexto_texto}`,
        `Ação tomada pelo time: ${caso.acao_realizada}`,
        `Desfecho: ${caso.desfecho.toUpperCase()}`,
      ].join("\n");
    })
    .join("\n\n");
}
