import { FilaDoDia } from "@/components/dashboard/FilaDoDia";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RecalculoFilaGate } from "@/components/dashboard/RecalculoFilaGate";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  UsersIcon,
} from "@/components/icons";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { formatCurrencyBRL } from "@/lib/format";
import { montarFilaDoDia } from "@/lib/painel/clientes";
import { calcularKpisPainel } from "@/lib/painel/kpis";
import { carregarPainel } from "@/lib/painel/servidor";
import type { KpisPainel } from "@/lib/painel/tipos";

const KPIS_VAZIOS: KpisPainel = {
  receitaEmRiscoAno: 0,
  clientesEmAlerta: 0,
  totalCarteira: 0,
  antecedenciaMediaMeses: null,
  antecedenciaMedianaMeses: null,
  antecedenciaMaximaMeses: null,
  desfechosAntecipados: 0,
  clientesContatados7d: 0,
};

function meses(valor: number | null): string {
  return valor == null ? "—" : valor.toLocaleString("pt-BR", { minimumFractionDigits: 1 });
}

export default async function DashboardPage() {
  const [usuario, painel] = await Promise.all([obterUsuarioSessao(), carregarPainel()]);
  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  const kpis = painel.modeloId
    ? await calcularKpisPainel({
        supabase: painel.supabase,
        projetoId: painel.projetoId,
        modeloId: painel.modeloId,
        clientes: painel.clientes,
      })
    : KPIS_VAZIOS;
  const fila = montarFilaDoDia(painel.clientes);
  const segmentos = Array.from(new Set(painel.clientes.map((c) => c.segmento).filter(Boolean))).sort();
  const percentualAlerta = kpis.totalCarteira
    ? Math.round((kpis.clientesEmAlerta / kpis.totalCarteira) * 100)
    : 0;

  return (
    <RecalculoFilaGate>
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
                value={formatCurrencyBRL(kpis.receitaEmRiscoAno)}
                description={`${kpis.clientesEmAlerta} clientes com risco relevante`}
                tone="red"
                icon={ArrowUpRightIcon}
              />
              <KpiCard
                label="Clientes em alerta"
                value={`${kpis.clientesEmAlerta}`}
                description={`de ${kpis.totalCarteira} na carteira (${percentualAlerta}%)`}
                tone="amber"
                icon={UsersIcon}
              />
              <KpiCard
                label="Antecedência média"
                value={
                  kpis.antecedenciaMediaMeses == null
                    ? "—"
                    : `${meses(kpis.antecedenciaMediaMeses)} meses`
                }
                description={
                  kpis.antecedenciaMediaMeses == null
                    ? "sem desfechos antecipados ainda"
                    : `(mediana ${meses(kpis.antecedenciaMedianaMeses)} | máx. ${meses(kpis.antecedenciaMaximaMeses)})`
                }
                tone="blue"
                icon={CalendarIcon}
              />
              <KpiCard
                label="Clientes contatados"
                value={`${kpis.clientesContatados7d}`}
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

        <FilaDoDia
          clientes={fila}
          segmentos={segmentos}
          mensagemVazia={
            !painel.modeloId
              ? "Nenhum modelo de risco ativo no projeto. Ative um modelo para gerar a fila."
              : painel.clientes.length === 0
                ? "Nenhuma predição calculada ainda. Rode o motor de risco após a ingestão de dados."
                : "Nenhum cliente em risco crítico ou alerta hoje."
          }
        />
      </div>
    </RecalculoFilaGate>
  );
}
