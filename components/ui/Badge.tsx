import type { HTMLAttributes } from "react";

export function Badge({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

const TOM_PADRAO = "bg-slate-100 text-slate-600";

/** Marca entidades de teste do motor (cópias de clientes reais, ver scripts/clientes-teste-motor.mts). */
export function BadgeTeste({ origem }: { origem?: string | null }) {
  return (
    <SoftBadge
      className="shrink-0 bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200"
      title={
        origem
          ? `Cópia de teste de ${origem}, calculada pelo motor novo`
          : "Cliente de teste do motor novo"
      }
    >
      Teste
    </SoftBadge>
  );
}

export function SoftBadge({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  // Só aplica o tom neutro quando quem chama não define cor própria —
  // evita depender da ordem das classes do Tailwind para sobrescrever.
  const temTomProprio = className.includes("bg-") || className.includes("text-");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        temTomProprio ? "" : TOM_PADRAO
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
