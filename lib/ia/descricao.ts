import type { ContextoAtual, SinalRisco } from "./tipos";

/**
 * Texto canônico do perfil de risco de um cliente.
 *
 * É o MESMO texto usado para vetorizar na indexação (feedback loop) e na
 * consulta lookalike — essa simetria é o que faz a busca por similaridade
 * funcionar. Alterar o formato aqui degrada a recuperação contra tudo que já
 * foi indexado, então mudanças exigem reindexar a base.
 *
 * Deliberadamente não inclui nome do cliente nem valores em reais: o que deve
 * aproximar dois casos é o *padrão de comportamento*, não quem é o cliente ou
 * quanto ele paga.
 */
export function descreverPerfilRisco(contexto: ContextoAtual): string {
  const linhas: string[] = [
    `Faixa de risco: ${contexto.faixa_risco ?? "indefinida"}.`,
    `Score de risco: ${contexto.pontuacao.toFixed(1)} de 100.`,
  ];

  const acionados = contexto.sinais.filter((s) => s.acionado === true);
  const naoAvaliaveis = contexto.sinais.filter((s) => s.acionado === null);

  if (acionados.length > 0) {
    linhas.push("Sinais de risco detectados:");
    for (const sinal of acionados) {
      linhas.push(`- ${descreverSinal(sinal)}`);
    }
  } else {
    linhas.push("Nenhum sinal de risco acionado.");
  }

  if (naoAvaliaveis.length > 0) {
    linhas.push(
      `Sinais sem dados suficientes para avaliação: ${naoAvaliaveis.map((s) => s.metrica).join(", ")}.`
    );
  }

  return linhas.join("\n");
}

function descreverSinal(sinal: SinalRisco): string {
  const observado = sinal.valor_observado ?? {};

  // Omissão de dado é sinal de risco em si (docs/motor-matematico.md §1),
  // não um valor faltante a ser ignorado.
  if (observado.omissao === true) {
    return `${sinal.metrica}: sem dado reportado (omissão tratada como risco).`;
  }

  const valor = observado.valor ?? observado.ultimo_valor;
  const sufixo = sinal.unidade ? ` ${sinal.unidade}` : "";
  const trecho =
    valor === undefined ? "valor não informado" : `valor observado ${formatarNumero(valor)}${sufixo}`;

  return `${sinal.metrica}: ${trecho} (peso ${sinal.peso}, contribuiu ${sinal.pontos.toFixed(1)} pontos).`;
}

function formatarNumero(valor: unknown): string {
  if (typeof valor === "number") {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(2);
  }
  return String(valor);
}

/**
 * Texto indexado no banco vetorial quando um desfecho é registrado. Combina o
 * perfil de risco de então, a ação tomada pelo time de CS e o resultado — os
 * três blocos que docs/inteligencia.md §1 exige para a memória de longo prazo.
 */
export function descreverCasoHistorico(params: {
  perfilRisco: string;
  acaoRealizada: string;
  desfecho: "recuperado" | "cancelado";
}): string {
  return [
    params.perfilRisco,
    `Ação realizada pelo time de Customer Success: ${params.acaoRealizada}`,
    `Desfecho observado: ${params.desfecho}.`,
  ].join("\n");
}
