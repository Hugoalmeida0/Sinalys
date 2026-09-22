"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRightIcon, ClipboardIcon, InfoIcon, SlidersIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SoftBadge } from "@/components/ui/Badge";
import { formatCurrencyBRLOuTraco } from "@/lib/utils/formatacao";
import {
  cenarioResolverTudo,
  limitarReducao,
  simularCenario,
  type BaseSimulacao,
  type Cenario,
  type ResultadoSimulacao,
} from "@/lib/motor/simulador";
import { faixaRiscoLabelCurto } from "@/lib/risco/faixa";
import { faixaRiscoSoftClasses } from "@/lib/risco/estilos";

const ATALHOS = [
  { rotulo: "Manter", valor: 0 },
  { rotulo: "−50%", valor: 50 },
  { rotulo: "Zerar", valor: 100 },
];

export function SimuladorCenarios({ base, clienteId }: { base: BaseSimulacao; clienteId: string }) {
  const [cenario, setCenario] = useState<Cenario>({});
  const [copiado, setCopiado] = useState(false);

  const resultado = useMemo(() => simularCenario(base, cenario), [base, cenario]);
  const frase = useMemo(() => montarFrase(resultado, clienteId), [resultado, clienteId]);
  const temAjuste = resultado.ajustes.length > 0;

  function definir(codigo: string, valor: number) {
    setCenario((atual) => ({ ...atual, [codigo]: limitarReducao(valor) }));
  }

  async function copiarFrase() {
    try {
      await navigator.clipboard.writeText(frase);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o resumo do cenário:", frase);
    }
  }

  if (base.sinais.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Simulador de cenários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Nenhum sinal de risco acionado para este cliente — não há o que simular. O score atual
            reflete o comportamento geral da conta frente à carteira.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="items-start">
          <div className="min-w-0">
            <CardTitle className="text-lg">Simulador de cenários</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Ajuste quanto você pretende reduzir cada sinal e veja o impacto projetado no score
              e na receita em risco.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCenario(cenarioResolverTudo(base.sinais))}
            >
              Resolver tudo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCenario({})} disabled={!temAjuste}>
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-slate-100">
            {base.sinais.map((sinal) => {
              const reducao = cenario[sinal.codigo] ?? 0;
              const contribuicao = base.somaPesos > 0 ? sinal.pontos / base.somaPesos : 0;
              const retirado = contribuicao * (reducao / 100);
              return (
                <li key={sinal.codigo} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-ink">{sinal.metrica}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{sinal.descricao}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-slate-400">contribui</p>
                      <p className="text-sm font-bold text-brand-ink">
                        {formatarPontos(contribuicao)} pts
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="sr-only">Redução de {sinal.metrica}</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={reducao}
                        onChange={(e) => definir(sinal.codigo, Number(e.target.value))}
                        className="h-2 w-full cursor-pointer accent-brand-royal"
                      />
                      <span
                        className={`w-24 shrink-0 text-right text-sm font-semibold tabular-nums ${
                          reducao > 0 ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {reducao > 0 ? `−${reducao}%` : "sem ação"}
                        {reducao > 0 && (
                          <span className="block text-xs font-normal text-slate-400">
                            −{formatarPontos(retirado)} pts
                          </span>
                        )}
                      </span>
                    </label>
                    <div className="flex shrink-0 gap-1">
                      {ATALHOS.map((a) => (
                        <button
                          key={a.rotulo}
                          type="button"
                          onClick={() => definir(sinal.codigo, a.valor)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
                            reducao === a.valor
                              ? "bg-brand-royal text-white ring-brand-royal"
                              : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {a.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex items-start gap-2 text-xs text-slate-400">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Projeção com a mesma fórmula do motor (média ponderada dos sinais avaliáveis), aplicada
              sobre a última predição. Não recalcula a carteira nem a cobertura — é uma estimativa
              para planejar e prestar contas, não uma nova predição.
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <SlidersIcon className="h-5 w-5 text-brand-royal" />
              Impacto projetado
            </CardTitle>
            {temAjuste && (
              <SoftBadge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 ring-inset">
                −{resultado.reducaoScore} pts
              </SoftBadge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LinhaComparacao
              label="Score de risco"
              antes={`${resultado.scoreAntes}/100`}
              depois={`${resultado.scoreDepois}/100`}
              mudou={temAjuste}
              rodape={
                <span className="flex items-center gap-1.5">
                  <SoftBadge className={faixaRiscoSoftClasses[resultado.faixaAntes]}>
                    {faixaRiscoLabelCurto[resultado.faixaAntes]}
                  </SoftBadge>
                  {resultado.faixaDepois !== resultado.faixaAntes && (
                    <>
                      <ArrowRightIcon className="h-3 w-3 text-slate-400" />
                      <SoftBadge className={faixaRiscoSoftClasses[resultado.faixaDepois]}>
                        {faixaRiscoLabelCurto[resultado.faixaDepois]}
                      </SoftBadge>
                    </>
                  )}
                </span>
              }
            />
            <LinhaComparacao
              label="Exposição ponderada (ano)"
              antes={formatCurrencyBRLOuTraco(resultado.receitaRiscoAntes)}
              depois={formatCurrencyBRLOuTraco(resultado.receitaRiscoDepois)}
              mudou={temAjuste && resultado.receitaRiscoAntes != null}
              rodape={
                resultado.receitaRiscoAntes == null ? (
                  "Receita não mapeada — sem projeção em R$"
                ) : temAjuste ? (
                  <span className="font-semibold text-emerald-600">
                    {formatCurrencyBRLOuTraco(
                      resultado.receitaRiscoAntes - (resultado.receitaRiscoDepois ?? 0)
                    )}{" "}
                    a menos de exposição por ano
                  </span>
                ) : (
                  "MRR × 12 × score"
                )
              }
            />
            <LinhaComparacao
              label="Score de prioridade"
              antes={resultado.prioridadeAntes.toLocaleString("pt-BR")}
              depois={resultado.prioridadeDepois.toLocaleString("pt-BR")}
              mudou={temAjuste}
              rodape="Posição na fila do dia (risco × impacto financeiro)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center">
            <CardTitle className="text-base">Resumo para a liderança</CardTitle>
            <Button size="sm" variant="secondary" onClick={copiarFrase} disabled={!temAjuste}>
              <ClipboardIcon className="h-3.5 w-3.5" />
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-slate-600">
              {temAjuste
                ? frase
                : "Mova um controle ao lado para gerar a frase do cenário — pronta para colar no relatório ou na mensagem para a liderança."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LinhaComparacao({
  label,
  antes,
  depois,
  mudou,
  rodape,
}: {
  label: string;
  antes: string;
  depois: string;
  mudou: boolean;
  rodape?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-2xl font-bold ${mudou ? "text-slate-400 line-through decoration-2" : "text-brand-ink"}`}>
          {antes}
        </span>
        {mudou && (
          <>
            <ArrowRightIcon className="h-4 w-4 self-center text-slate-400" />
            <span className="text-2xl font-bold text-emerald-600">{depois}</span>
          </>
        )}
      </div>
      {rodape && <div className="mt-1.5 text-xs text-slate-400">{rodape}</div>}
    </div>
  );
}

function formatarPontos(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function listarEmPortugues(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function montarFrase(r: ResultadoSimulacao, clienteId: string): string {
  if (r.ajustes.length === 0) return "";
  const zerados = r.ajustes.filter((a) => a.reducaoPct === 100).map((a) => a.sinal.metrica.toLowerCase());
  const parciais = r.ajustes
    .filter((a) => a.reducaoPct < 100)
    .map((a) => `${a.sinal.metrica.toLowerCase()} em ${a.reducaoPct}%`);

  const acoes: string[] = [];
  if (zerados.length) acoes.push(`zerarmos ${listarEmPortugues(zerados)}`);
  if (parciais.length) acoes.push(`reduzirmos ${listarEmPortugues(parciais)}`);

  const faixa =
    r.faixaDepois !== r.faixaAntes
      ? ` (${faixaRiscoLabelCurto[r.faixaAntes].toLowerCase()} → ${faixaRiscoLabelCurto[r.faixaDepois].toLowerCase()})`
      : "";
  const receita =
    r.receitaRiscoAntes != null && r.receitaRiscoDepois != null
      ? ` e a receita em risco no ano de ${formatCurrencyBRLOuTraco(r.receitaRiscoAntes)} para ${formatCurrencyBRLOuTraco(r.receitaRiscoDepois)}`
      : "";

  return `Se ${acoes.join(" e ")} no cliente ${clienteId}, o score de risco cai de ${r.scoreAntes} para ${r.scoreDepois}${faixa}${receita}.`;
}
