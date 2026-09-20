import {
  FileSpreadsheetIcon,
  FileTextIcon,
  InfoIcon,
  SlidersIcon,
} from "@/components/icons";
import { HistoricoIngestoes } from "@/components/ingestao/HistoricoIngestoes";
import { IngestaoWizard } from "@/components/ingestao/IngestaoWizard";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";
import { EXIBIR_INGESTAO } from "@/lib/config/features";

const dicas = [
  { icone: FileSpreadsheetIcon, texto: "Use a nossa planilha modelo" },
  { icone: SlidersIcon, texto: "Verifique os nomes das colunas" },
  { icone: FileTextIcon, texto: "Confira os tipos de dados" },
  { icone: InfoIcon, texto: "Em caso de dúvidas, fale com a Sinalys" },
];

export default function IngestaoPage() {
  // MVP: feature oculta (lib/config/features.ts). Bloqueia acesso direto
  // por URL alem de remover do menu — nenhum codigo abaixo foi removido.
  if (!EXIBIR_INGESTAO) redirect("/");

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
