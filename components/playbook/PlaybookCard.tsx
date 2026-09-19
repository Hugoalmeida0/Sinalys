import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SoftBadge } from "@/components/ui/Badge";
import { CheckIcon } from "@/components/icons";
import type { Playbook } from "@/lib/mock-data";

const categoriaClasses: Record<Playbook["categoria"], string> = {
  SLA: "bg-red-50 text-red-600",
  Financeiro: "bg-amber-50 text-amber-700",
  Engajamento: "bg-blue-50 text-brand-royal",
  Relacionamento: "bg-emerald-50 text-emerald-600",
};

export function PlaybookCard({ playbook }: { playbook: Playbook }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <SoftBadge className={categoriaClasses[playbook.categoria]}>
            {playbook.categoria}
          </SoftBadge>
          <CardTitle className="mt-2">{playbook.titulo}</CardTitle>
          <p className="mt-1 text-xs text-slate-500">Gatilho: {playbook.gatilho}</p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {playbook.passos.map((passo, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {passo}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400">
            <span className="font-semibold text-slate-600">{playbook.clientesElegiveis}</span>{" "}
            clientes elegíveis
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-brand-royal hover:underline"
          >
            Ver clientes
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
