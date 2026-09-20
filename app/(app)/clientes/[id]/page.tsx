import { notFound } from "next/navigation";
import { ClienteHeader } from "@/components/clientes/ClienteHeader";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";
import { montarDetalheCliente } from "@/lib/painel/detalhe";
import { carregarPainel } from "@/lib/painel/servidor";

export default async function ClienteDetalhePage(
  props: PageProps<"/clientes/[id]">,
) {
  const { id } = await props.params;
  const painel = await carregarPainel();

  // Aceita o código visível (C001) ou o UUID interno.
  const cliente = painel.clientes.find((c) => c.id === id || c.entidadeId === id);
  if (!cliente || !painel.modeloId) notFound();

  const detalhe = await montarDetalheCliente({
    supabase: painel.supabase,
    projetoId: painel.projetoId,
    modeloId: painel.modeloId,
    cliente,
  });

  return (
    <div>
      <ClienteHeader detalhe={detalhe} />
      <ClienteTabs detalhe={detalhe} />
    </div>
  );
}
