import Link from "next/link";
import { AcoesCliente } from "@/components/AcoesCliente";
import { ChevronRightIcon } from "@/components/icons";
import { Badge, SoftBadge } from "@/components/ui/Badge";
import type { DetalheCliente } from "@/lib/mock-data";
import { faixaRiscoClasses, faixaRiscoLabel } from "@/lib/risk";

export function ClienteHeader({ detalhe }: { detalhe: DetalheCliente }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 pt-4 sm:px-6">
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/clientes" className="hover:text-slate-600">
          Clientes
        </Link>
        <ChevronRightIcon className="h-3 w-3" />
        <span className="font-medium text-slate-600">{detalhe.id}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{detalhe.id}</h1>
            <SoftBadge>{detalhe.segmento}</SoftBadge>
            <SoftBadge>{detalhe.porte} porte</SoftBadge>
            <SoftBadge className="bg-brand-pale text-brand-navy">{detalhe.tipo}</SoftBadge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={faixaRiscoClasses[detalhe.faixaRisco]}>
            {faixaRiscoLabel[detalhe.faixaRisco]}
          </Badge>
          <Badge className="bg-white text-slate-700 ring-1 ring-inset ring-slate-300">
            Score {detalhe.scoreRisco}/{detalhe.scoreMax}
          </Badge>
          <AcoesCliente
            clienteId={detalhe.id}
            clienteLabel={detalhe.segmento}
            showVerDetalhes={false}
          />
        </div>
      </div>
    </div>
  );
}
