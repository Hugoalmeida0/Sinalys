import { useAssistente } from "@/components/assistente/AssistenteProvider";
import { ArrowRightIcon, ChatIcon } from "@/components/ui/icons";
import { SinalysMascot, type VarianteMascote } from "@/components/ui/SinalysMascot";

export function AssistantCard({
  titulo,
  descricao,
  rotuloBotao = "Abrir assistente",
  comIconeChat = false,
  layout = "lado",
  variante = "padrao",

  assunto,
  className = "",
}: {
  titulo: React.ReactNode;
  descricao: string;
  rotuloBotao?: string;
  comIconeChat?: boolean;
  layout?: "lado" | "topo";
  variante?: VarianteMascote;
  assunto?: string;
  className?: string;
}) {
  const { abrir } = useAssistente();
  const empilhado = layout === "topo";

  return (
    <div
      className={`navy-surface relative isolate overflow-hidden rounded-2xl p-5 text-white shadow-float ${className}`}
    >
      <Faiscas />

      <div
        className={`relative flex gap-4 ${
          empilhado ? "flex-col items-center text-center" : "flex-col sm:flex-row sm:items-center"
        }`}
      >
        <SinalysMascot
          variante={variante}
          className={`shrink-0 drop-shadow-[0_10px_30px_rgba(96,165,250,0.45)] ${
            empilhado ? "h-32 w-auto" : "h-28 w-auto"
          }`}
        />

        <div className={`min-w-0 flex-1 ${empilhado ? "" : "sm:pr-2"}`}>
          <h2 className="text-lg leading-snug font-bold">{titulo}</h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-100/80">{descricao}</p>
          <button
            type="button"
            onClick={() => abrir(assunto)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-royal px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(96,165,250,0.9)] transition-colors hover:bg-[#1d4ed8]"
          >
            {comIconeChat && <ChatIcon className="h-4 w-4" />}
            {rotuloBotao}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Faiscas() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute top-6 left-8 h-1.5 w-1.5 rounded-full bg-sky-300/70" />
      <span className="absolute top-16 right-10 h-1 w-1 rounded-full bg-sky-200/60" />
      <span className="absolute right-24 bottom-10 h-1.5 w-1.5 rounded-full bg-sky-300/50" />
      <span className="absolute bottom-6 left-24 h-1 w-1 rounded-full bg-sky-200/50" />
      <span className="absolute top-1/2 left-2 h-1 w-1 rounded-full bg-sky-300/40" />
    </div>
  );
}
