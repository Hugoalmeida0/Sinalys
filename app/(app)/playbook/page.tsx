import { PlaybookCard } from "@/components/playbook/PlaybookCard";
import { playbooks } from "@/lib/mock-data";

export default function PlaybookPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Playbook</h1>
        <p className="mt-1 text-sm text-slate-500">
          Estratégias recomendadas pela IA para cada padrão de risco identificado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {playbooks.map((playbook) => (
          <PlaybookCard key={playbook.id} playbook={playbook} />
        ))}
      </div>
    </div>
  );
}
