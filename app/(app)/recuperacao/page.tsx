import { CampanhaRecuperacaoLista } from "@/components/recuperacao/CampanhaRecuperacaoLista";
import { PageHeader } from "@/components/ui/PageHeader";
import { carregarPainel } from "@/lib/painel/servidor";

/**
 * Campanha de recuperação de cancelados (Ponto 3 do usuário): lista os
 * clientes com o evento de desfecho-alvo já registrado (`ClientePainel.cancelado`,
 * já calculado por `montarClientesPainel`) com o mínimo necessário para o
 * analista entender o perfil, a causa provável e um plano de retomada — a
 * mesma Task 4.3 usada no detalhe do cliente ativo, aplicada aqui a quem já
 * saiu.
 */
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

      <CampanhaRecuperacaoLista clientes={cancelados} />
    </div>
  );
}
