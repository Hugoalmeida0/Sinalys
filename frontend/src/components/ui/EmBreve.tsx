import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Aviso curto para controles que ainda não têm comportamento.
 *
 * Um botão que não responde ao toque lê como defeito; um que responde dizendo
 * que o recurso ainda vem lê como escopo. O aviso é discreto de propósito —
 * ele explica, não interrompe: some sozinho e não bloqueia a tela.
 */

type EmBreveContexto = { avisar: (recurso?: string) => void };

const Contexto = createContext<EmBreveContexto | null>(null);

const DURACAO_MS = 2600;

export function EmBreveProvider({ children }: { children: React.ReactNode }) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);

  const limpar = useCallback(() => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
  }, []);

  const avisar = useCallback(
    (recurso?: string) => {
      limpar();
      setSaindo(false);
      setMensagem(recurso ? `${recurso} — implementação futura` : "Implementação futura");

      temporizadores.current.push(setTimeout(() => setSaindo(true), DURACAO_MS - 250));
      temporizadores.current.push(setTimeout(() => setMensagem(null), DURACAO_MS));
    },
    [limpar]
  );

  useEffect(() => limpar, [limpar]);

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Contexto.Provider value={valor}>
      {children}

      {/* Ancorado no topo: o rodapé é disputado pela navegação inferior, pelo
          bottom sheet do assistente e pelos botões de ação dos modais. */}
      {mensagem && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-[60] flex justify-center px-4 transition-all duration-200 ${
            saindo ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <p className="flex max-w-full items-center gap-2 truncate rounded-full bg-brand-deep/95 py-2 pr-4 pl-3 text-[11px] font-semibold text-white shadow-float ring-1 ring-white/10 backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-cyan" />
            {mensagem}
          </p>
        </div>
      )}
    </Contexto.Provider>
  );
}

export function useEmBreve() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useEmBreve precisa estar dentro de <EmBreveProvider>.");
  return ctx.avisar;
}
