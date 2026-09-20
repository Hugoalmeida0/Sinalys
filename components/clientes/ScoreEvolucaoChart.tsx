import type { PontoScore } from "@/lib/mock-data";
import { faixaRiscoFromScore } from "@/lib/risk";

const L = 34; // margem esquerda (rótulos do eixo Y)
const R = 8;
const T = 10;
const B = 26; // margem inferior (rótulos do eixo X)
const W = 620;
const H = 230;

const CORES = {
  critico: "#e11d48",
  alerta: "#f59e0b",
  atencao: "#2563eb",
  saudavel: "#10b981",
} as const;

/**
 * Evolução do score ao longo dos meses sobre as faixas de risco.
 * SVG puro com viewBox — escala junto com o card, sem biblioteca de gráficos.
 */
export function ScoreEvolucaoChart({
  pontos,
  scoreMax,
}: {
  pontos: PontoScore[];
  scoreMax: number;
}) {
  const areaW = W - L - R;
  const areaH = H - T - B;

  const x = (i: number) => L + (areaW * i) / Math.max(1, pontos.length - 1);
  const y = (v: number) => T + areaH - (areaH * v) / scoreMax;

  // Limites das faixas, derivados dos mesmos cortes de faixaRiscoFromScore.
  const faixas = [
    { de: 0.5, ate: 1, cor: CORES.critico, rotulo: "Risco crítico" },
    { de: 0.35, ate: 0.5, cor: CORES.alerta, rotulo: "Risco alto" },
    { de: 0.25, ate: 0.35, cor: CORES.atencao, rotulo: "Atenção" },
    { de: 0, ate: 0.25, cor: CORES.saudavel, rotulo: "Saudável" },
  ];

  const linha = pontos
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`)
    .join(" ");

  const ultimo = pontos[pontos.length - 1];
  const corUltimo = CORES[faixaRiscoFromScore(ultimo.score, scoreMax)];

  // Marcas do eixo Y em quartos da escala.
  const marcasY = [0, 0.33, 0.66, 1].map((f) => Math.round(scoreMax * f));

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-0 flex-1"
        role="img"
        aria-label={`Evolução do score de risco nos últimos ${pontos.length} meses`}
      >
        {/* faixas de risco ao fundo */}
        {faixas.map((f) => (
          <rect
            key={f.rotulo}
            x={L}
            y={y(scoreMax * f.ate)}
            width={areaW}
            height={y(scoreMax * f.de) - y(scoreMax * f.ate)}
            fill={f.cor}
            opacity="0.08"
          />
        ))}

        {/* eixo Y */}
        {marcasY.map((v) => (
          <text
            key={v}
            x={L - 10}
            y={y(v) + 4}
            textAnchor="end"
            className="fill-slate-400"
            fontSize="12"
          >
            {v}
          </text>
        ))}

        {/* série */}
        <path
          d={linha}
          fill="none"
          stroke={corUltimo}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {pontos.map((p, i) => (
          <circle
            key={p.mes}
            cx={x(i)}
            cy={y(p.score)}
            r="4"
            fill="#ffffff"
            stroke={CORES[faixaRiscoFromScore(p.score, scoreMax)]}
            strokeWidth="2.5"
          />
        ))}

        {/* rótulo do valor atual */}
        <g transform={`translate(${x(pontos.length - 1) - 52}, ${y(ultimo.score) - 34})`}>
          <rect width="46" height="24" rx="8" fill="#ffffff" stroke="#e2e8f0" />
          <text
            x="23"
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            className="fill-slate-700"
          >
            {ultimo.score}/{scoreMax}
          </text>
        </g>

        {/* eixo X — um rótulo a cada dois meses para não poluir */}
        {pontos.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={p.mes}
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize="12"
            >
              {p.mes}
            </text>
          ) : null,
        )}
      </svg>

      <ul className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 sm:w-32 sm:flex-col sm:justify-around sm:pb-6">
        {faixas.map((f) => (
          <li key={f.rotulo} className="text-xs font-semibold" style={{ color: f.cor }}>
            {f.rotulo}
          </li>
        ))}
      </ul>
    </div>
  );
}
