import type { BaseSimulacao } from "@/lib/motor/simulador";
import type { ClientePainel, Evidencia, EventoHistorico, PontoScore, ProximaAcao } from "./tipos";

/** Resposta de `GET /api/clientes/{id}`. */
export type DetalheClientePainel = ClientePainel & {
  nomeFantasia: string;
  responsavelCS: string;
  evidencias: Evidencia[];
  proximasAcoes: ProximaAcao[];
  avaliacaoIA: string;
  analiseLookalike: string | null;
  diagnosticoGeradoEm: string | null;
  historico: EventoHistorico[];
  evolucaoScore: PontoScore[];
  resumoCliente: string;
  explicacaoRisco: string;
  destaquesDisponiveis: { codigo: string; rotulo: string }[];
  simulacao: BaseSimulacao;
};
