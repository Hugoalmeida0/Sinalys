import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ClienteHeader } from "@/components/clientes/ClienteHeader";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";
import { montarDetalheCliente } from "@/lib/painel/detalhe";
import { carregarPainel } from "@/lib/painel/servidor";
import { resolverBaseUrlAbsoluta } from "@/lib/config/base-url";

export default async function ClienteDetalhePage(
  props: PageProps<"/clientes/[id]">,
) {
  const { id } = await props.params;
  const [painel, listaHeaders] = await Promise.all([carregarPainel(), headers()]);
  const baseUrl = resolverBaseUrlAbsoluta(listaHeaders);

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
      <ClienteHeader detalhe={detalhe} baseUrl={baseUrl} />
      <ClienteTabs detalhe={detalhe} />
    </div>
  );
}
