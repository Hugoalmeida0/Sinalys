import { useState } from "react";
import { AlertTriangleIcon, CheckIcon, LoaderIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { processarIngestao, type ProcessarIngestaoResponse } from "@/lib/ingestao/api";

export function ProcessamentoStep({
  execucaoIngestaoId,
  onVoltar,
  onNovaIngestao,
}: {
  execucaoIngestaoId: string;
  onVoltar: () => void;
  onNovaIngestao: () => void;
}) {
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<ProcessarIngestaoResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleProcessar() {
    setProcessando(true);
    setErro(null);
    try {
      const res = await processarIngestao(execucaoIngestaoId);
      setResultado(res);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  if (!resultado) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="max-w-md text-sm text-slate-500">
          O mapeamento foi salvo. Agora vamos baixar o arquivo original, aplicar as regras
          De-Para e gravar as observações e eventos normalizados.
        </p>
        <p className="text-xs text-slate-400">
          Execução <span className="font-mono">{execucaoIngestaoId}</span>
        </p>

        {erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erro}</p>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onVoltar} disabled={processando}>
            Voltar
          </Button>
          <Button onClick={handleProcessar} disabled={processando}>
            {processando ? (
              <>
                <LoaderIcon className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Processar ingestão"
            )}
          </Button>
        </div>
      </div>
    );
  }

  const sucesso = resultado.status === "concluido";
  const { relatorio } = resultado;

  return (
    <div className="flex flex-col gap-5">
      <div
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
          sucesso ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}
      >
        {sucesso ? (
          <CheckIcon className="h-5 w-5 shrink-0" />
        ) : (
          <AlertTriangleIcon className="h-5 w-5 shrink-0" />
        )}
        {sucesso
          ? "Ingestão processada com sucesso."
          : "A ingestão falhou — veja os erros abaixo."}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <ResultadoStat label="Linhas lidas" valor={relatorio.linhas_lidas} />
        <ResultadoStat label="Entidades criadas" valor={relatorio.entidades_criadas} />
        <ResultadoStat label="Entidades atualizadas" valor={relatorio.entidades_atualizadas} />
        <ResultadoStat label="Observações gravadas" valor={relatorio.observacoes_gravadas} />
        <ResultadoStat label="Eventos gravados" valor={relatorio.eventos_gravados} />
      </div>

      {relatorio.erros.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800">
            {relatorio.erros.length} {relatorio.erros.length === 1 ? "aviso" : "avisos"} durante o
            processamento
          </p>
          <ul className="mt-2 flex max-h-48 flex-col gap-1.5 overflow-y-auto text-xs text-amber-700">
            {relatorio.erros.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onNovaIngestao}>Nova ingestão</Button>
      </div>
    </div>
  );
}

function ResultadoStat({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <p className="text-xl font-bold text-slate-900">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}
