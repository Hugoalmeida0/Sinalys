import { useCallback, useRef, useState } from "react";
import { Link, useRouter } from "@/lib/navegacao";
import { Button } from "@/components/ui/Button";
import { MenuFlutuante } from "@/components/ui/MenuFlutuante";
import { ChevronDownIcon, MoreIcon } from "@/components/ui/icons";
import { MarcarResolvidoModal } from "@/components/clientes/acoes/MarcarResolvidoModal";
import { MarcarCanceladoModal } from "@/components/clientes/acoes/MarcarCanceladoModal";
import { RegistrarContatoModal } from "@/components/clientes/acoes/RegistrarContatoModal";
import { apiFetch } from "@/lib/api";

const ITEM = "block w-full px-3 py-3 lg:py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

export function AcoesCliente({
  clienteId,
  clienteLabel,
  showVerDetalhes = true,
  compacto = false,
}: {
  clienteId: string;
  clienteLabel: string;
  showVerDetalhes?: boolean;

  compacto?: boolean;
}) {
  const router = useRouter();
  const acoesRef = useRef<HTMLDivElement>(null);
  const maisRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resolvidoOpen, setResolvidoOpen] = useState(false);
  const [canceladoOpen, setCanceladoOpen] = useState(false);
  const [silenciando, setSilenciando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fecharMenu = useCallback(() => setMenuOpen(false), []);
  const fecharMais = useCallback(() => setMoreOpen(false), []);

  async function silenciarAlertas() {
    setMoreOpen(false);
    setErro(null);
    setSilenciando(true);
    try {
      const resposta = await apiFetch("/api/alertas/silenciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível silenciar os alertas.");
        return;
      }

      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setSilenciando(false);
    }
  }

  const itensPrincipais = (
    <>
      <button
        type="button"
        onClick={() => {
          setModalOpen(true);
          setMenuOpen(false);
          setMoreOpen(false);
        }}
        className={ITEM}
      >
        Registrar contato
      </button>
      {showVerDetalhes && (
        <Link href={`/clientes/${clienteId}`} className={ITEM}>
          Ver detalhes
        </Link>
      )}
    </>
  );

  return (
    <div className="relative flex items-center gap-1">
      <div ref={acoesRef} className={compacto ? "hidden" : ""}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          Ações
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
      <MenuFlutuante open={menuOpen} anchorRef={acoesRef} onClose={fecharMenu}>
        {itensPrincipais}
        <button
          type="button"
          disabled
          title="Em breve"
          className="block w-full px-3 py-3 lg:py-2 text-left text-sm text-slate-400"
        >
          Agendar reunião
        </button>
      </MenuFlutuante>

      <button
        ref={maisRef}
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        aria-expanded={moreOpen}
        aria-haspopup="menu"
        aria-label="Mais opções"
        disabled={silenciando}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 lg:h-9 lg:w-9 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
      >
        <MoreIcon className="h-4 w-4" />
      </button>
      <MenuFlutuante open={moreOpen} anchorRef={maisRef} onClose={fecharMais}>
        {compacto && itensPrincipais}
        <button
          type="button"
          onClick={() => {
            setResolvidoOpen(true);
            setMoreOpen(false);
          }}
          className={ITEM}
        >
          Marcar como resolvido
        </button>
        <button
          type="button"
          onClick={() => {
            setCanceladoOpen(true);
            setMoreOpen(false);
          }}
          className="block w-full px-3 py-3 lg:py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          Marcar como cancelado
        </button>
        <button
          type="button"
          onClick={silenciarAlertas}
          className="block w-full px-3 py-3 lg:py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          Silenciar alertas (30 dias)
        </button>
      </MenuFlutuante>

      {erro && (
        <p
          role="alert"
          className="absolute top-full right-0 z-10 mt-1 w-56 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 shadow-float"
        >
          {erro}
        </p>
      )}

      <RegistrarContatoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clienteId={clienteId}
        clienteLabel={clienteLabel}
      />
      <MarcarResolvidoModal
        open={resolvidoOpen}
        onOpenChange={setResolvidoOpen}
        clienteId={clienteId}
        clienteLabel={clienteLabel}
      />
      <MarcarCanceladoModal
        open={canceladoOpen}
        onOpenChange={setCanceladoOpen}
        clienteId={clienteId}
        clienteLabel={clienteLabel}
      />
    </div>
  );
}
