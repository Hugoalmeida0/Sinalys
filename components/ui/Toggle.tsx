"use client";

import { useState } from "react";

export function Toggle({
  titulo,
  descricao,
  padrao = false,
}: {
  titulo: string;
  descricao: string;
  padrao?: boolean;
}) {
  const [ligado, setLigado] = useState(padrao);

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label={titulo}
        onClick={() => setLigado((v) => !v)}
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          ligado ? "bg-brand-royal" : "bg-slate-200"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            ligado ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-brand-ink">{titulo}</p>
        <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>
      </div>
    </div>
  );
}
