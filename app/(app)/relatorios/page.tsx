import { BarraHorizontal } from "@/components/relatorios/BarraHorizontal";
import { BarraVertical } from "@/components/relatorios/BarraVertical";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrencyBRL } from "@/lib/utils/formatacao";
import {
  desfechos90dias,
  evolucaoScoreMedio,
  kpisDashboard,
  receitaPorSegmento,
} from "@/lib/mock/dados";
import { redirect } from "next/navigation";
import { EXIBIR_RELATORIOS } from "@/lib/config/features";

export default function RelatoriosPage() {
  if (!EXIBIR_RELATORIOS) redirect("/");

  const totalDesfechos =
    desfechos90dias.recuperados + desfechos90dias.cancelados + desfechos90dias.emAndamento;
  const taxaRecuperacao = Math.round(
    (desfechos90dias.recuperados /
      (desfechos90dias.recuperados + desfechos90dias.cancelados)) *
      100,
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        titulo="Relatórios"
        descricao="Visão consolidada de risco e desfechos dos últimos 90 dias."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Receita em risco (ano)" value={formatCurrencyBRL(kpisDashboard.receitaEmRiscoAno)} />
        <MiniStat label="Taxa de recuperação" value={`${taxaRecuperacao}%`} tone="emerald" />
        <MiniStat label="Score médio da carteira" value="8,3 / 18" tone="amber" />
        <MiniStat label="NPS médio" value="42" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receita em risco por segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <BarraHorizontal dados={receitaPorSegmento} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução do score médio de risco</CardTitle>
          </CardHeader>
          <CardContent>
            <BarraVertical dados={evolucaoScoreMedio} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desfechos dos últimos 90 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <DesfechoStat
              label="Recuperados"
              valor={desfechos90dias.recuperados}
              total={totalDesfechos}
              tone="emerald"
            />
            <DesfechoStat
              label="Em andamento"
              valor={desfechos90dias.emAndamento}
              total={totalDesfechos}
              tone="amber"
            />
            <DesfechoStat
              label="Cancelados"
              valor={desfechos90dias.cancelados}
              total={totalDesfechos}
              tone="red"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-brand-ink";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function DesfechoStat({
  label,
  valor,
  total,
  tone,
}: {
  label: string;
  valor: number;
  total: number;
  tone: "emerald" | "amber" | "red";
}) {
  const toneClasses = {
    emerald: { text: "text-emerald-600", bar: "bg-emerald-500" },
    amber: { text: "text-amber-600", bar: "bg-amber-500" },
    red: { text: "text-red-600", bar: "bg-red-500" },
  }[tone];

  const pct = Math.round((valor / total) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className={`text-lg font-bold ${toneClasses.text}`}>{valor}</p>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full ${toneClasses.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">{pct}% do total</p>
    </div>
  );
}
