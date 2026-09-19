import { IngestaoWizard } from "@/components/ingestao/IngestaoWizard";

export default function IngestaoPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ingestão de dados</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envie uma planilha, associe as colunas aos campos do sistema (De-Para) e processe a
          carga para alimentar o motor de risco.
        </p>
      </div>

      <IngestaoWizard />
    </div>
  );
}
