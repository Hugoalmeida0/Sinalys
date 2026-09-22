"use client";

import { useContagem } from "@/hooks/useContagem";
import { formatCurrencyBRL } from "@/lib/utils/formatacao";

/** Como o número animado deve ser escrito a cada quadro. */
export type FormatoKpi = "moeda" | "inteiro" | "decimal";

/**
 * Apenas o número do KPI roda no cliente.
 *
 * O cartão inteiro precisa continuar sendo server component: ele recebe o
 * ícone como componente, e função não atravessa a fronteira servidor/cliente.
 * Aqui só entram valores serializáveis.
 */
export function ValorKpi({
  ate,
  formato,
  sufixo,
  final,
}: {
  ate: number;
  formato: FormatoKpi;
  sufixo?: string;
  final: string;
}) {
  const atual = useContagem(ate);

  // `null` é o primeiro render no cliente, que precisa ser idêntico ao HTML do
  // servidor para a hidratação não quebrar. Ao chegar no alvo, entrega de novo
  // a string formatada no servidor, evitando divergência de arredondamento.
  if (atual === null || atual >= ate) return <>{final}</>;

  const texto =
    formato === "moeda"
      ? formatCurrencyBRL(Math.round(atual))
      : formato === "inteiro"
        ? Math.round(atual).toLocaleString("pt-BR")
        : atual.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <>
      {texto}
      {sufixo ?? ""}
    </>
  );
}
