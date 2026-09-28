import type { Integracao } from "@/lib/mock/dados";

export function MarcaIntegracao({ marca }: { marca: Integracao["marca"] }) {
  if (marca === "supabase") {
    return (
      <Moldura className="bg-emerald-50">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M13 2 5 13h6l-1 9 9-11h-6l1-9Z" fill="#3ecf8e" />
        </svg>
      </Moldura>
    );
  }

  if (marca === "gemini") {
    return (
      <Moldura className="bg-sky-50">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            d="M12 2.5c.7 4.6 4.2 8.1 8.8 8.8-4.6.7-8.1 4.2-8.8 8.8-.7-4.6-4.2-8.1-8.8-8.8 4.6-.7 8.1-4.2 8.8-8.8Z"
            fill="#4285f4"
          />
        </svg>
      </Moldura>
    );
  }

  return (
    <Moldura className="bg-slate-100">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M12 4.5 21 19.5H3L12 4.5Z" fill="#0f172a" />
      </svg>
    </Moldura>
  );
}

function Moldura({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-200/70 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}
