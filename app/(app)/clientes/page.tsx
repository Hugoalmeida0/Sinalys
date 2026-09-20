import { ClientesTable } from "@/components/clientes/ClientesTable";
import { ResumoCarteira } from "@/components/clientes/ResumoCarteira";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { clientes } from "@/lib/mock-data";

export default function ClientesPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <PageHeader
            titulo="Clientes"
            descricao={`${clientes.length} clientes na carteira. Acompanhe o score de risco de cada um.`}
          />
          <ResumoCarteira />
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

      <ClientesTable clientes={clientes} />
    </div>
  );
}
