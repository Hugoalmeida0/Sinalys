import type { FaixaRisco } from "@/lib/mock-data";
import { faixaRiscoFromScore, scoreBadgeClasses } from "@/lib/risk";

export function ScorePill({
  score,
  max,
  faixa: faixaProp,
  size = "md",
}: {
  score: number;
  max: number;
  /** Faixa de risco já calculada (fonte da verdade). Se omitida, é derivada do score. */
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
