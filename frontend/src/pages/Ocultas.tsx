/**
 * Telas ocultas por feature flag (lib/config/features.ts), como no produto
 * original: existem no código, mas com a flag desligada a rota volta ao início.
 */

import { Navigate } from "react-router-dom";
import { FileSpreadsheetIcon, FileTextIcon, InfoIcon, SlidersIcon } from "@/components/ui/icons";
import { HistoricoIngestoes } from "@/components/ingestao/HistoricoIngestoes";
import { IngestaoWizard } from "@/components/ingestao/IngestaoWizard";
import { PlaybookCard } from "@/components/playbook/PlaybookCard";
import { BarraHorizontal } from "@/components/relatorios/BarraHorizontal";
import { BarraVertical } from "@/components/relatorios/BarraVertical";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EXIBIR_INGESTAO, EXIBIR_PLAYBOOK, EXIBIR_RELATORIOS } from "@/lib/config/features";
import { desfechos90dias, evolucaoScoreMedio, kpisDashboard, playbooks, receitaPorSegmento } from "@/lib/mock/dados";
import { formatCurrencyBRL } from "@/lib/utils/formatacao";

const dicas = [
  { icone: FileSpreadsheetIcon, texto: "Use a nossa planilha modelo" },
  { icone: SlidersIcon, texto: "Verifique os nomes das colunas" },
  { icone: FileTextIcon, texto: "Confira os tipos de dados" },
  { icone: InfoIcon, texto: "Em caso de dúvidas, fale com a Sinalys" },
];

export function IngestaoPage() {
  if (!EXIBIR_INGESTAO) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <PageHeader
            titulo="Ingestão de dados"
            descricao="Envie uma planilha, associe as colunas aos campos do sistema (De-Para) e processe a carga para alimentar o motor de risco."
          />
          <IngestaoWizard />
        </div>

        <div className="flex flex-col gap-4">
          <AssistantCard
            titulo={
              <>
                Precisa de ajuda para
                <br />
                mapear as colunas?
              </>
            }
            descricao="A Sinalys pode te orientar sobre o formato da planilha, os campos do sistema e boas práticas para uma importação sem erros."
            rotuloBotao="Falar com a Sinalys"
            comIconeChat
            variante="analisando"
            assunto="Como devo mapear as colunas da minha planilha?"
          />

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <h2 className="text-base font-bold text-brand-ink">Dicas rápidas</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {dicas.map((dica) => {
                const Icon = dica.icone;
                return (
                  <li key={dica.texto} className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5 shrink-0 text-brand-royal" />
                    <span className="text-sm text-slate-600">{dica.texto}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <HistoricoIngestoes />
    </div>
  );
}

export function PlaybookPage() {
  if (!EXIBIR_PLAYBOOK) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader titulo="Playbook" descricao="Estratégias recomendadas pela IA para cada padrão de risco identificado." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {playbooks.map((playbook) => (
          <PlaybookCard key={playbook.id} playbook={playbook} />
        ))}
      </div>
    </div>
  );
}

export function RelatoriosPage() {
  if (!EXIBIR_RELATORIOS) return <Navigate to="/" replace />;

  const totalDesfechos = desfechos90dias.recuperados + desfechos90dias.cancelados + desfechos90dias.emAndamento;
  const taxaRecuperacao = Math.round(
    (desfechos90dias.recuperados / (desfechos90dias.recuperados + desfechos90dias.cancelados)) * 100
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader titulo="Relatórios" descricao="Visão consolidada de risco e desfechos dos últimos 90 dias." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Exposição ponderada (ano)" value={formatCurrencyBRL(kpisDashboard.receitaEmRiscoAno)} />
        <MiniStat label="Taxa de recuperação" value={`${taxaRecuperacao}%`} tone="emerald" />
        <MiniStat label="Score médio da carteira" value="8,3 / 18" tone="amber" />
        <MiniStat label="NPS médio" value="42" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exposição por segmento</CardTitle>
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
            <DesfechoStat label="Recuperados" valor={desfechos90dias.recuperados} total={totalDesfechos} tone="emerald" />
            <DesfechoStat label="Em andamento" valor={desfechos90dias.emAndamento} total={totalDesfechos} tone="amber" />
            <DesfechoStat label="Cancelados" valor={desfechos90dias.cancelados} total={totalDesfechos} tone="red" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  const toneClass = tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-brand-ink";
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
        <div className={`h-1.5 rounded-full ${toneClasses.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-400">{pct}% do total</p>
    </div>
  );
}
