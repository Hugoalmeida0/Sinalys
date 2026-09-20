import { PlaybookCard } from "@/components/playbook/PlaybookCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { playbooks } from "@/lib/mock-data";
import { redirect } from "next/navigation";
import { EXIBIR_PLAYBOOK } from "@/lib/config/features";

export default function PlaybookPage() {
  // MVP: feature oculta (lib/config/features.ts). Bloqueia acesso direto
  // por URL alem de remover do menu — nenhum codigo abaixo foi removido.
  if (!EXIBIR_PLAYBOOK) redirect("/");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        titulo="Playbook"
        descricao="Estratégias recomendadas pela IA para cada padrão de risco identificado."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {playbooks.map((playbook) => (
          <PlaybookCard key={playbook.id} playbook={playbook} />
        ))}
      </div>
    </div>
  );
}
