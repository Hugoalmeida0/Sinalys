import { PlaybookCard } from "@/components/playbook/PlaybookCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { playbooks } from "@/lib/mock-data";

export default function PlaybookPage() {
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
