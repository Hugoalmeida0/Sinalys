import { ConfiguracoesTabs } from "@/components/configuracoes/ConfiguracoesTabs";
import { SaveIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        titulo="Configurações"
        descricao="Gerencie sua conta, integrações e parâmetros do modelo de risco."
        acoes={
          <Button>
            <SaveIcon className="h-4 w-4" />
            Salvar alterações
          </Button>
        }
      />

      <ConfiguracoesTabs />
    </div>
  );
}
