import type { ContextoAtual, SinalRisco } from "./tipos";

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
