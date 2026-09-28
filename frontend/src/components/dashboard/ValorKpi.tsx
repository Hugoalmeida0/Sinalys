import { useContagem } from "@/hooks/useContagem";
import { formatCurrencyBRL } from "@/lib/utils/formatacao";

/** Como o número animado deve ser escrito a cada quadro. */
export type FormatoKpi = "moeda" | "inteiro" | "decimal";

/** Número do KPI com contagem animada até o valor final. */
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

  // `null` = a animação ainda não começou. Ao chegar no alvo, entrega a string
  // já formatada, evitando divergência de arredondamento no último quadro.
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
