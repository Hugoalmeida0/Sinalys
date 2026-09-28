import { CampanhaRecuperacaoLista } from "@/components/recuperacao/CampanhaRecuperacaoLista";
import { CausasCancelamento } from "@/components/recuperacao/CausasCancelamento";
import { CarregandoClientes, ErroCarregamento } from "@/components/carregando/Carregando";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCarteira } from "@/hooks/useCarteira";
import { atualizarDados } from "@/lib/atualizacao";

export function RecuperacaoPage() {
  const carteira = useCarteira();
  if (carteira.carregando) return <CarregandoClientes />;
  if (carteira.erro) return <ErroCarregamento mensagem={carteira.erro} aoTentarNovamente={atualizarDados} />;

  const cancelados = carteira.clientes
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
