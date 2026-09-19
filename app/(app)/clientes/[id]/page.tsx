import { notFound } from "next/navigation";
import { ClienteHeader } from "@/components/clientes/ClienteHeader";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";
import { getDetalheCliente } from "@/lib/mock-data";

export default async function ClienteDetalhePage(
  props: PageProps<"/clientes/[id]">,
) {
  const { id } = await props.params;
  const detalhe = getDetalheCliente(id);

  if (!detalhe) notFound();

  return (
    <div>
      <ClienteHeader detalhe={detalhe} />
      <ClienteTabs detalhe={detalhe} />
    </div>
  );
}
