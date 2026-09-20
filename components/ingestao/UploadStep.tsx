"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileSpreadsheetIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { uploadArquivoIngestao, type UploadIngestaoResponse } from "@/lib/ingestao-client";

const EXTENSOES_ACEITAS = [".xlsx", ".xls", ".csv"];

export function UploadStep({
  onEnviado,
}: {
  onEnviado: (resultado: UploadIngestaoResponse) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function extensaoValida(nome: string) {
    return EXTENSOES_ACEITAS.some((ext) => nome.toLowerCase().endsWith(ext));
  }

  function selecionarArquivo(file: File) {
    setErro(null);
    if (!extensaoValida(file.name)) {
      setErro("Formato não suportado. Envie um arquivo .xlsx, .xls ou .csv.");
      return;
    }
    setArquivo(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
    const file = event.dataTransfer.files?.[0];
    if (file) selecionarArquivo(file);
  }

  async function handleEnviar() {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await uploadArquivoIngestao(arquivo);
      onEnviado(resultado);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          arrastando
            ? "border-brand-royal bg-brand-pale"
            : "border-slate-200 hover:border-brand-royal/50 hover:bg-slate-50/60"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-pale text-brand-royal">
          <UploadIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-brand-ink">
            Arraste um arquivo aqui ou clique para selecionar
          </p>
          <p className="mt-1.5 text-sm text-slate-400">Formatos aceitos: .xlsx, .xls, .csv</p>
          <p className="text-sm text-slate-400">Tamanho máximo: 50 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={EXTENSOES_ACEITAS.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) selecionarArquivo(file);
          }}
        />
      </div>

      {arquivo && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
          <FileSpreadsheetIcon className="h-5 w-5 shrink-0 text-brand-royal" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-ink">{arquivo.name}</p>
            <p className="text-xs text-slate-400">{(arquivo.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => setArquivo(null)}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Remover
          </button>
        </div>
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{erro}</p>
      )}

      <div className="flex justify-end">
        {/* Sem arquivo escolhido, o botão abre o seletor em vez de ficar inerte. */}
        <Button
          size="lg"
          onClick={arquivo ? handleEnviar : () => inputRef.current?.click()}
          disabled={enviando}
        >
          {enviando ? "Enviando..." : arquivo ? "Enviar arquivo" : "Selecionar arquivo"}
        </Button>
      </div>
    </div>
  );
}
