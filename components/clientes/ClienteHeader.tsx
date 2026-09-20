import Link from "next/link";
import { AcoesCliente } from "@/components/AcoesCliente";
import { ChevronRightIcon } from "@/components/icons";
import { Badge, SoftBadge } from "@/components/ui/Badge";
import type { DetalheClientePainel as DetalheCliente } from "@/lib/painel/detalhe";
import { faixaRiscoClasses, faixaRiscoLabel } from "@/lib/risk";

export function ClienteHeader({ detalhe }: { detalhe: DetalheCliente }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/clientes" className="transition-colors hover:text-slate-600">
          Clientes
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-600">{detalhe.id}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
            {detalhe.id}
          </h1>
          <SoftBadge className="px-3 py-1.5">{detalhe.segmento}</SoftBadge>
          <SoftBadge className="px-3 py-1.5">{detalhe.porte} porte</SoftBadge>
          <SoftBadge className="px-3 py-1.5">{detalhe.tipo}</SoftBadge>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`px-3.5 py-2 font-semibold ${faixaRiscoClasses[detalhe.faixaRisco]}`}>
            {faixaRiscoLabel[detalhe.faixaRisco]}
          </Badge>
          <Badge className="bg-white px-3.5 py-2 font-semibold text-slate-700 ring-1 ring-slate-200 ring-inset">
            Score {detalhe.scoreRisco}/{detalhe.scoreMax}
          </Badge>
          <AcoesCliente
            clienteId={detalhe.id}
            clienteLabel={detalhe.nome}
            showVerDetalhes={false}
          />
        </div>
      </div>
    </div>
  );
}
