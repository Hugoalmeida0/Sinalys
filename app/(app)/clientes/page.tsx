import { ClientesTable } from "@/components/clientes/ClientesTable";
import { ResumoCarteira, type ResumoFaixa } from "@/components/clientes/ResumoCarteira";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import type { FaixaRisco } from "@/lib/mock-data";
import { carregarPainel } from "@/lib/painel/servidor";

const ORDEM_FAIXAS: FaixaRisco[] = ["critico", "alerta", "atencao", "saudavel"];

export default async function ClientesPage() {
  const { clientes, semPredicao } = await carregarPainel();
  const ordenados = [...clientes].sort((a, b) => b.scoreRisco - a.scoreRisco);

  const resumo: ResumoFaixa[] = ORDEM_FAIXAS.map((faixa) => {
    const total = clientes.filter((c) => c.faixaRisco === faixa).length;
    return {
      faixa,
      total,
      percentual: clientes.length ? Math.round((total / clientes.length) * 100) : 0,
    };
  });

  const descricao =
    clientes.length === 0
      ? "Nenhum cliente com score calculado ainda."
      : `${clientes.length} clientes na carteira${semPredicao ? ` (${semPredicao} sem score)` : ""}. Acompanhe o score de risco de cada um.`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <PageHeader titulo="Clientes" descricao={descricao} />
          <ResumoCarteira resumo={resumo} />
        </div>

        <AssistantCard
          titulo={
            <>
              Precisa de insights?
              <br />
              Converse com a Sinalys.
            </>
          }
          descricao="Pergunte sobre seus clientes, riscos ou oportunidades."
          variante="flutuando"
          assunto="Quais clientes da carteira merecem atenção agora?"
        />
      </div>

      <ClientesTable clientes={ordenados} />
    </div>
  );
}
