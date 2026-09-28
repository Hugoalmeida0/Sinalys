import { Link } from "@/lib/navegacao";
import { SinalysMascot } from "@/components/ui/SinalysMascot";

export function NaoEncontradoPage() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <SinalysMascot variante="alerta" className="h-32 w-auto" />
      <h1 className="text-2xl font-bold text-brand-ink">Página não encontrada</h1>
      <p className="text-sm text-slate-500">O endereço não existe ou o cliente não faz parte desta carteira.</p>
      <Link href="/" className="text-sm font-semibold text-brand-royal hover:underline">
        Voltar para o início
      </Link>
    </div>
  );
}
