import { useSearchParams } from "react-router-dom";
import { ClientesTable, type Ordenacao } from "@/components/clientes/ClientesTable";
import { ResumoCarteira, type ResumoFaixa } from "@/components/clientes/ResumoCarteira";
import { CarregandoClientes, ErroCarregamento } from "@/components/carregando/Carregando";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCarteira } from "@/hooks/useCarteira";
import { atualizarDados } from "@/lib/atualizacao";
import { TODAS_FAIXAS } from "@/lib/painel/clientes";

const ORDENACOES_VALIDAS = new Set<string>(["prioridade", "score", "receita", "mrr", "atualizacao"]);

export function ClientesPage() {
  const [parametros] = useSearchParams();
  const carteira = useCarteira();
  const ordem = parametros.get("ordem");
  const ordemInicial = ordem && ORDENACOES_VALIDAS.has(ordem) ? (ordem as Ordenacao) : undefined;

  if (carteira.carregando) return <CarregandoClientes />;
  if (carteira.erro) return <ErroCarregamento mensagem={carteira.erro} aoTentarNovamente={atualizarDados} />;
  const { clientes, semPredicao } = carteira;

  const ativos = clientes.filter((c) => !c.cancelado);
  const inativos = clientes.length - ativos.length;

  const resumo: ResumoFaixa[] = TODAS_FAIXAS.map((faixa) => {
    const total = ativos.filter((c) => c.faixaRisco === faixa).length;
    return { faixa, total, percentual: ativos.length ? Math.round((total / ativos.length) * 100) : 0 };
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

  // No celular o card do assistente vai para o fim da coluna: a lista de
  // clientes é o conteúdo principal da tela e precisa vir antes do convite para
  // conversar. A partir de xl volta a grade de duas colunas, com a tabela
  // ocupando a largura inteira embaixo.
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8 xl:grid xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Clientes" descricao={descricao} />
        <ResumoCarteira resumo={resumo} />
      </div>

      <AssistantCard
        className="order-last xl:order-none"
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

      <div className="xl:col-span-2">
        <ClientesTable key={ordemInicial ?? "padrao"} clientes={clientes} ordemInicial={ordemInicial} />
      </div>
    </div>
  );
}
