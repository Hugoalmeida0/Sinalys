import { CampanhaRecuperacaoLista } from "@/components/recuperacao/CampanhaRecuperacaoLista";
import { CausasCancelamento } from "@/components/recuperacao/CausasCancelamento";
import { PageHeader } from "@/components/ui/PageHeader";
import { carregarPainel } from "@/lib/painel/servidor";

export default async function RecuperacaoPage() {
  const painel = await carregarPainel();
  const cancelados = painel.clientes
    .filter((c) => c.cancelado)
    .sort((a, b) => (b.canceladoEm ?? "").localeCompare(a.canceladoEm ?? ""));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        titulo="Campanha de recuperação"
        descricao="Clientes que já cancelaram. Veja o perfil, a causa provável do cancelamento e um plano gerado pela IA para tentar reativá-los."
      />

      <CausasCancelamento cancelados={cancelados} />

      <CampanhaRecuperacaoLista clientes={cancelados} />
    </div>
  );
}
