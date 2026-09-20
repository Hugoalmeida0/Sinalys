import { FilaDoDia } from "@/components/dashboard/FilaDoDia";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  UsersIcon,
} from "@/components/icons";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrencyBRL } from "@/lib/format";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { getFilaDoDia, kpisDashboard } from "@/lib/mock-data";

export default async function DashboardPage() {
  const fila = getFilaDoDia();
  const usuario = await obterUsuarioSessao();
  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <PageHeader
            titulo={primeiroNome ? `Bom dia, ${primeiroNome}.` : "Bom dia."}
            descricao="Aqui estão os clientes que precisam da sua atenção hoje."
          />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        </div>

        <AssistantCard
          titulo={
            <>
              Por onde começar hoje?
              <br />
              Pergunte à Sinalys.
            </>
          }
          descricao="Peça um resumo da carteira, priorize contatos ou investigue um cliente específico."
          assunto="Por onde devo começar hoje?"
        />
      </div>

      <FilaDoDia clientes={fila} />
    </div>
  );
}
