import type { FaixaRisco } from "@/lib/risco/faixa";
import { faixaRiscoFromScore } from "@/lib/risco/faixa";
import { scoreBadgeClasses } from "@/lib/risco/estilos";

export function ScorePill({
  score,
  max,
  faixa: faixaProp,
  size = "md",
}: {
  score: number;
  max: number;

  faixa?: FaixaRisco;
  size?: "sm" | "md";
}) {
  const faixa = faixaProp ?? faixaRiscoFromScore(score, max);
  const dimensions = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

  return (
    <span
      className={`inline-flex ${dimensions} shrink-0 items-center justify-center rounded-full font-bold ${scoreBadgeClasses[faixa]}`}
      title={`Score de risco: ${score} de ${max}`}
    >
      {score}
    </span>
  );
}
