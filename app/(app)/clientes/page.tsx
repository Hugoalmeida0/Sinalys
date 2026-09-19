import { ClientesTable } from "@/components/clientes/ClientesTable";
import { clientes } from "@/lib/mock-data";

export default function ClientesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="mt-1 text-sm text-slate-500">
          {clientes.length} clientes na carteira. Acompanhe o score de risco de cada um.
        </p>
      </div>

      <ClientesTable clientes={clientes} />
    </div>
  );
}
