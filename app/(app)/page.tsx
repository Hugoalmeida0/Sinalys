import { FilaDoDia } from "@/components/dashboard/FilaDoDia";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  UsersIcon,
} from "@/components/icons";
import { formatCurrencyBRL } from "@/lib/format";
import { getFilaDoDia, kpisDashboard, usuarioAtual } from "@/lib/mock-data";

export default function DashboardPage() {
  const fila = getFilaDoDia();
  const primeiroNome = usuarioAtual.nome.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bom dia, {primeiroNome}.</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aqui estão os clientes que precisam da sua atenção hoje.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Receita em risco (ano)"
          value={formatCurrencyBRL(kpisDashboard.receitaEmRiscoAno)}
          description={`${kpisDashboard.clientesEmAlerta} clientes com risco relevante`}
          tone="red"
          icon={ArrowUpRightIcon}
        />
        <KpiCard
          label="Clientes em alerta"
          value={`${kpisDashboard.clientesEmAlerta}`}
          description={`de ${kpisDashboard.totalCarteira} na carteira (${Math.round(
            (kpisDashboard.clientesEmAlerta / kpisDashboard.totalCarteira) * 100,
          )}%)`}
          tone="amber"
          icon={UsersIcon}
        />
        <KpiCard
          label="Antecedência média"
          value={`${kpisDashboard.antecedenciaMediaMeses.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
          })} meses`}
          description={`(mediana ${kpisDashboard.antecedenciaMedianaMeses} | máx. ${kpisDashboard.antecedenciaMaximaMeses})`}
          tone="blue"
          icon={CalendarIcon}
        />
        <KpiCard
          label="Clientes contatados"
          value={`${kpisDashboard.clientesContatados7d}`}
          description="nos últimos 7 dias"
          tone="emerald"
          icon={CheckIcon}
        />
      </div>

      <FilaDoDia clientes={fila} />
    </div>
  );
}
