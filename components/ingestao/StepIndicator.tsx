import { CheckIcon } from "@/components/icons";

const steps = [
  { numero: 1, titulo: "Upload do arquivo" },
  { numero: 2, titulo: "Mapeamento (De-Para)" },
  { numero: 3, titulo: "Processamento" },
] as const;

export function StepIndicator({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-3 sm:gap-5">
      {steps.map((step, index) => {
        const concluido = step.numero < atual;
        const ativo = step.numero === atual;

        const ultimo = index === steps.length - 1;

        return (
          <li
            key={step.numero}
            // Só os passos com conector esticam, para as linhas ficarem parelhas.
            className={`flex items-center gap-3 sm:gap-5 ${ultimo ? "" : "flex-1"}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  concluido
                    ? "bg-brand-navy text-white"
                    : ativo
                      ? "bg-brand-royal text-white shadow-[0_10px_20px_-10px_rgba(37,99,235,0.95)]"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {concluido ? <CheckIcon className="h-4 w-4" /> : step.numero}
              </span>
              <span
                className={`hidden text-sm font-semibold sm:inline ${
                  ativo ? "text-brand-ink" : concluido ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {step.titulo}
              </span>
            </div>
            {!ultimo && (
              <div
                className={`h-px flex-1 ${concluido ? "bg-brand-navy/40" : "bg-slate-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
