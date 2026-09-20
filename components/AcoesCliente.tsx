"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon, MoreIcon } from "@/components/icons";
import { RegistrarContatoModal } from "@/components/RegistrarContatoModal";

export function AcoesCliente({
  clienteId,
  clienteLabel,
  showVerDetalhes = true,
  compacto = false,
}: {
  clienteId: string;
  clienteLabel: string;
  showVerDetalhes?: boolean;
  /** Em listas densas, mostra apenas o menu "..." sem o botão "Ações". */
  compacto?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <div
        className={`relative ${compacto ? "hidden" : ""}`}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
        }}
      >
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          Ações
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </Button>

        {menuOpen && (
          <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-float">
            <button
              type="button"
              onClick={() => {
                setModalOpen(true);
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Registrar contato
            </button>
            {showVerDetalhes && (
              <Link
                href={`/clientes/${clienteId}`}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Ver detalhes
              </Link>
            )}
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Agendar reunião
            </button>
          </div>
        )}
      </div>

      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setMoreOpen(false);
        }}
      >
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-label="Mais opções"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <MoreIcon className="h-4 w-4" />
        </button>

        {moreOpen && (
          <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-float">
            {compacto && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(true);
                    setMoreOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Registrar contato
                </button>
                {showVerDetalhes && (
                  <Link
                    href={`/clientes/${clienteId}`}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Ver detalhes
                  </Link>
                )}
              </>
            )}
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Marcar como resolvido
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Silenciar alertas
            </button>
          </div>
        )}
      </div>

      <RegistrarContatoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clienteId={clienteId}
        clienteLabel={clienteLabel}
      />
    </div>
  );
}
