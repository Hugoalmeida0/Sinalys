import { ClientesTable, type Ordenacao } from "@/components/clientes/ClientesTable";
import { ResumoCarteira, type ResumoFaixa } from "@/components/clientes/ResumoCarteira";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import type { FaixaRisco } from "@/lib/mock-data";
import { carregarPainel } from "@/lib/painel/servidor";

const ORDEM_FAIXAS: FaixaRisco[] = ["critico", "alerta", "atencao", "saudavel"];
const ORDENACOES_VALIDAS = new Set<string>(["prioridade", "score", "receita", "mrr", "atualizacao"]);

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ ordem?: string }>;
}) {
  const [{ clientes, semPredicao }, { ordem }] = await Promise.all([carregarPainel(), searchParams]);
  const ordemInicial = ordem && ORDENACOES_VALIDAS.has(ordem) ? (ordem as Ordenacao) : undefined;

  // O resumo e a descrição refletem a carteira ativa — a visão padrão da tabela.
  const ativos = clientes.filter((c) => !c.cancelado);
  const inativos = clientes.length - ativos.length;

  const resumo: ResumoFaixa[] = ORDEM_FAIXAS.map((faixa) => {
    const total = ativos.filter((c) => c.faixaRisco === faixa).length;
    return {
      faixa,
      total,
      percentual: ativos.length ? Math.round((total / ativos.length) * 100) : 0,
    };
  });

  const testes = clientes.filter((c) => c.teste).length;
  const detalhes = [
    semPredicao ? `${semPredicao} sem score` : "",
    inativos ? `${inativos} inativos` : "",
    testes ? `${testes} de teste do motor novo` : "",
  ].filter(Boolean);
  const descricao =
    clientes.length === 0
      ? "Nenhum cliente com score calculado ainda."
      : `${ativos.length} clientes ativos na carteira${detalhes.length ? ` (${detalhes.join(", ")})` : ""}. Acompanhe o score de risco de cada um.`;

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

      <ClientesTable clientes={clientes} ordemInicial={ordemInicial} />
    </div>
  );
}
