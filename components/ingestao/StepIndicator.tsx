import { CheckIcon } from "@/components/icons";

const steps = [
  { numero: 1, titulo: "Upload do arquivo" },
  { numero: 2, titulo: "Mapeamento (De-Para)" },
  { numero: 3, titulo: "Processamento" },
] as const;

export function StepIndicator({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {steps.map((step, index) => {
        const concluido = step.numero < atual;
        const ativo = step.numero === atual;

        return (
          <li key={step.numero} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  concluido
                    ? "bg-brand-navy text-white"
                    : ativo
                      ? "bg-brand-royal text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {concluido ? <CheckIcon className="h-4 w-4" /> : step.numero}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  ativo || concluido ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.titulo}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-px flex-1 ${concluido ? "bg-brand-navy" : "bg-slate-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
