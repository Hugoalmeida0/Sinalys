import {
  AlertTriangleIcon,
  CheckIcon,
  LoaderIcon,
  ReportsIcon,
} from "@/components/icons";
import { SinalysMascot } from "@/components/ui/SinalysMascot";
import { formatDatePtBR, formatTimePtBR } from "@/lib/format";
import type { UseAnaliseIA } from "@/lib/ia/hooks/useAnaliseIA";

/**
 * Corpo visual do diagnóstico de IA (Task 4.3): estado de progresso, erro,
 * vazio, ou o diagnóstico + "o que o histórico diz" + checklist de ações.
 * Usado dentro da aba "Plano de ação" do cliente e da campanha de recuperação
 * — cada tela monta seu próprio cabeçalho/botão em torno disso.
 */
export function ConteudoAnaliseIA({
  estado,
  textoVazio,
}: {
  estado: UseAnaliseIA;
  textoVazio: string;
}) {
  const { plano, analisando, erro, concluidas, alternarAcao } = estado;

  return (
    <div className="flex flex-col gap-5">
      {analisando && (
        <div className="flex items-start gap-3 rounded-xl bg-brand-pale px-4 py-3 text-sm text-brand-navy">
          <LoaderIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
          <p>
            Cruzando os sinais do motor de risco com o histórico de casos parecidos e gerando o
            plano. Isso leva até um minuto.
          </p>
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{erro}</p>
        </div>
      )}

      {!plano && !analisando && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <SinalysMascot variante="insight" className="h-24 w-auto" />
          <p className="max-w-md text-sm leading-relaxed text-slate-500">{textoVazio}</p>
        </div>
      )}

      {plano && (
        <>
          {plano.origem === "fallback" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                O analista de IA está indisponível no momento (limite de uso ou instabilidade). Este
                diagnóstico foi montado automaticamente a partir das regras do motor de risco, sem
                geração de texto.
              </p>
            </div>
          )}

          <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-brand-ink">
              <AlertTriangleIcon className="h-4 w-4 text-red-500" />
              Diagnóstico
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{plano.diagnostico}</p>
          </section>

          {plano.analiseLookalike && (
            <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-brand-ink">
                <ReportsIcon className="h-4 w-4 text-brand-royal" />O que o histórico diz
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{plano.analiseLookalike}</p>
            </section>
          )}

          <div>
            <h3 className="mb-2 text-sm font-bold text-brand-ink">Ações imediatas</h3>
            <ul className="flex flex-col gap-2">
              {plano.acoes.map((acao, index) => {
                const feita = Boolean(concluidas[index]);
                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => alternarAcao(index)}
                      className="flex w-full items-start gap-3 rounded-xl border border-slate-100 px-3.5 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          feita
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 text-transparent"
                        }`}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${
                          feita ? "text-slate-400 line-through" : "text-slate-700"
                        }`}
                      >
                        {index + 1}. {acao}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {plano.geradoEm && (
            <p className="text-xs text-slate-400">
              {plano.origem === "fallback" ? "Gerado por regras" : "Gerado pela IA"} em{" "}
              {formatDatePtBR(plano.geradoEm)} às {formatTimePtBR(plano.geradoEm)}
              {plano.origem === "cache" ? " (reaproveitado da última análise)" : ""}. O conteúdo é uma
              recomendação: confira os sinais antes de agir.
            </p>
          )}
        </>
      )}
    </div>
  );
}
