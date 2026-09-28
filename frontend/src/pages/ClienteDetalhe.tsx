import { useParams } from "react-router-dom";
import { ClienteHeader } from "@/components/clientes/ClienteHeader";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";
import { CarregandoCliente, ErroCarregamento } from "@/components/carregando/Carregando";
import { useApi } from "@/hooks/useApi";
import { atualizarDados } from "@/lib/atualizacao";
import type { DetalheClientePainel } from "@/lib/painel/detalhe";
import { NaoEncontradoPage } from "./NaoEncontrado";

/** Base dos links públicos (Health Score). Em produção, a URL do próprio frontend. */
const BASE_URL_PUBLICA = window.location.origin;

export function ClienteDetalhePage() {
  const { id = "" } = useParams();
  return <ConteudoCliente key={id} id={id} />;
}

function ConteudoCliente({ id }: { id: string }) {
  const { dados, carregando, erro } = useApi<DetalheClientePainel>(`/api/clientes/${encodeURIComponent(id)}`);

  if (carregando) return <CarregandoCliente />;
  if (!dados) {
    if (erro?.status === 404) return <NaoEncontradoPage />;
    return <ErroCarregamento mensagem={erro?.message ?? "Não foi possível carregar o cliente."} aoTentarNovamente={atualizarDados} />;
  }

  return (
    <div>
      <ClienteHeader detalhe={dados} baseUrl={BASE_URL_PUBLICA} />
      <ClienteTabs detalhe={dados} />
    </div>
  );
}
