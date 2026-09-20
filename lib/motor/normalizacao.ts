import { PADRAO_CLIP_Z } from "./constantes";
import type { DirecaoRisco, ObservacaoNumerica } from "./tipos";

function media(valores: number[]): number {
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

function desvioPadraoAmostral(valores: number[], mediaValores: number): number {
  if (valores.length < 2) return 0;
  const somaQuadrados = valores.reduce((soma, v) => soma + (v - mediaValores) ** 2, 0);
  return Math.sqrt(somaQuadrados / (valores.length - 1));
}

function escalarBadness(badness: number, clipZ: number): number {
  const badnessClampeada = Math.min(Math.max(badness, 0), clipZ);
  return (badnessClampeada / clipZ) * 100;
}

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
      badness = 0;
    } else {
      const z = (valor - mediaCarteira) / desvioCarteira;
      badness = direcao === "maior_pior" ? z : -z;
    }
    resultado.set(entidadeId, escalarBadness(badness, clipZ));
  }
  return resultado;
}

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
    badness = mediaRecente === mediaHistorico ? 0 : clipZ;
    if (direcao === "maior_pior" && mediaRecente < mediaHistorico) badness = 0;
    if (direcao === "menor_pior" && mediaRecente > mediaHistorico) badness = 0;
  } else {
    const z = (mediaRecente - mediaHistorico) / desvioHistorico;
    badness = direcao === "maior_pior" ? z : -z;
  }

  return escalarBadness(badness, clipZ);
}
