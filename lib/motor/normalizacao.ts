import { PADRAO_CLIP_Z } from "./constantes";
import type { DirecaoRisco, ObservacaoNumerica } from "./tipos";

function media(valores: number[]): number {
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

/** Desvio-padrão amostral (n-1) — mais adequado para a carteira de clientes, que é uma amostra em crescimento. */
function desvioPadraoAmostral(valores: number[], mediaValores: number): number {
  if (valores.length < 2) return 0;
  const somaQuadrados = valores.reduce((soma, v) => soma + (v - mediaValores) ** 2, 0);
  return Math.sqrt(somaQuadrados / (valores.length - 1));
}

/** Converte uma "distância ruim" (sempre >= 0) em uma escala de alerta 0-100, saturando em `clipZ`. */
function escalarBadness(badness: number, clipZ: number): number {
  const badnessClampeada = Math.min(Math.max(badness, 0), clipZ);
  return (badnessClampeada / clipZ) * 100;
}

/**
 * Task 3.1 — Comparativo de Carteira: calcula o desvio de cada entidade em
 * relação à média da carteira (todas as entidades com valor conhecido para a
 * métrica) e normaliza para 0-100 (docs/motor-matematico.md §1).
 *
 * Retorna um Map apenas com as entidades avaliáveis. Se a carteira não tiver
 * ao menos 2 valores, a comparação estatística não é possível e o Map volta
 * vazio — o chamador deve tratar todas as entidades como "não avaliável"
 * nesse caso (não confundir com omissão individual, tratada antes de chamar
 * esta função).
 */
export function calcularZScoreCarteira(
  valoresPorEntidade: Map<string, number>,
  direcao: DirecaoRisco,
  clipZ: number = PADRAO_CLIP_Z
): Map<string, number> {
  const resultado = new Map<string, number>();
  const valores = Array.from(valoresPorEntidade.values());
  if (valores.length < 2) return resultado;

  const mediaCarteira = media(valores);
  const desvioCarteira = desvioPadraoAmostral(valores, mediaCarteira);

  for (const [entidadeId, valor] of valoresPorEntidade) {
    let badness: number;
    if (desvioCarteira === 0) {
      badness = 0; // toda a carteira tem o mesmo valor: nenhum desvio, logo nenhum risco por este sinal.
    } else {
      const z = (valor - mediaCarteira) / desvioCarteira;
      badness = direcao === "maior_pior" ? z : -z;
    }
    resultado.set(entidadeId, escalarBadness(badness, clipZ));
  }
  return resultado;
}

/**
 * Task 3.1 — Comparativo Histórico (Média Móvel): compara a média recente
 * (últimos `janelaDias`) de UMA entidade com a média/desvio do seu próprio
 * histórico anterior à janela, normalizando para 0-100
 * (docs/motor-matematico.md §1). Usa o mesmo princípio de z-score do
 * comparativo de carteira, mas com a distribuição de referência sendo o
 * próprio passado da entidade em vez da carteira.
 *
 * Retorna `null` (não avaliável) quando não há histórico anterior suficiente
 * (< 2 observações antes da janela) ou nenhuma observação dentro da janela
 * recente — cenário comum para entidades novas, distinto de omissão total
 * (tratada antes de chamar esta função, quando a entidade não tem nenhuma
 * observação da métrica).
 */
export function calcularMediaMovel(
  observacoesEntidadeOrdenadas: ObservacaoNumerica[],
  referenciaEm: Date,
  janelaDias: number,
  direcao: DirecaoRisco,
  clipZ: number = PADRAO_CLIP_Z
): number | null {
  const limiteJanelaMs = referenciaEm.getTime() - janelaDias * 24 * 60 * 60 * 1000;

  const historico: number[] = [];
  const recentes: number[] = [];
  for (const obs of observacoesEntidadeOrdenadas) {
    const tsObs = new Date(obs.observado_em).getTime();
    if (tsObs < limiteJanelaMs) {
      historico.push(obs.valor_numero);
    } else {
      recentes.push(obs.valor_numero);
    }
  }

  if (historico.length < 2 || recentes.length === 0) return null;

  const mediaHistorico = media(historico);
  const desvioHistorico = desvioPadraoAmostral(historico, mediaHistorico);
  const mediaRecente = media(recentes);

  let badness: number;
  if (desvioHistorico === 0) {
    // Histórico sempre estável: qualquer mudança na janela recente já é um sinal forte.
    badness = mediaRecente === mediaHistorico ? 0 : clipZ;
    if (direcao === "maior_pior" && mediaRecente < mediaHistorico) badness = 0;
    if (direcao === "menor_pior" && mediaRecente > mediaHistorico) badness = 0;
  } else {
    const z = (mediaRecente - mediaHistorico) / desvioHistorico;
    badness = direcao === "maior_pior" ? z : -z;
  }

  return escalarBadness(badness, clipZ);
}
