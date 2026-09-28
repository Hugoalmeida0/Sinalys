import { FilaDoDia } from "@/components/dashboard/FilaDoDia";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RecalculoFilaGate } from "@/components/dashboard/RecalculoFilaGate";
import { ArrowUpRightIcon, CalendarIcon, CheckIcon, HeartHandshakeIcon, UsersIcon } from "@/components/ui/icons";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonKpi } from "@/components/ui/Skeleton";
import { CarregandoPainel, ErroCarregamento } from "@/components/carregando/Carregando";
import { useApi } from "@/hooks/useApi";
import { useUsuario } from "@/lib/auth/sessao";
import { atualizarDados } from "@/lib/atualizacao";
import { formatCurrencyBRL } from "@/lib/utils/formatacao";
import type { ClientePainel, KpisPainel } from "@/lib/painel/tipos";

interface RespostaInicio {
  modelo_id: string | null;
  total_clientes: number;
  fila: ClientePainel[];
}

function meses(valor: number | null): string {
  return valor == null ? "—" : valor.toLocaleString("pt-BR", { minimumFractionDigits: 1 });
}

/** Com o fuso explícito: o horário do navegador pode não ser o de Brasília. */
function saudacao(agora: Date): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(agora)
  );
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function InicioPage() {
  const usuario = useUsuario();
  const inicio = useApi<RespostaInicio>("/api/painel/inicio");
  const primeiroNome = usuario.nome.split(" ")[0] ?? "";
  const cumprimento = saudacao(new Date());

  if (inicio.carregando) return <CarregandoPainel />;
  if (!inicio.dados) {
    return <ErroCarregamento mensagem={inicio.erro?.message ?? "Não foi possível carregar o painel."} aoTentarNovamente={atualizarDados} />;
  }
  const painel = inicio.dados;

  return (
    <RecalculoFilaGate>
      {/*
        No celular tudo empilha numa coluna só, e aí o card do assistente vai
        para o fim com `order-last`: a fila do dia é o que a pessoa veio ver, e
        o convite para conversar faz mais sentido depois dela. A partir de xl o
        layout volta a ser a grade de duas colunas, com a fila ocupando a
        largura inteira embaixo.
      */}
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8 xl:grid xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <PageHeader
            titulo={primeiroNome ? `${cumprimento}, ${primeiroNome}.` : `${cumprimento}.`}
            descricao="Aqui estão os clientes que precisam da sua atenção hoje."
          />

          <GradeKpis />
        </div>

        <AssistantCard
          className="order-last xl:order-none"
          titulo={
            <>
              Por onde começar hoje?
              <br />
              Pergunte à Sinalys.
            </>
          }
          descricao="Peça um resumo da carteira, priorize contatos ou investigue um cliente específico."
          assunto="Por onde devo começar hoje?"
        />

        <div data-tour="fila" className="xl:col-span-2">
          <FilaDoDia
            clientes={painel.fila}
            mensagemVazia={
              !painel.modelo_id
                ? "Nenhum modelo de risco ativo no projeto. Ative um modelo para gerar a fila."
                : painel.total_clientes === 0
                  ? "Nenhuma predição calculada ainda. Rode o motor de risco após a ingestão de dados."
                  : "Nenhum cliente na fila hoje."
            }
          />
        </div>
      </div>
    </RecalculoFilaGate>
  );
}

/**
 * Os KPIs dependem da consulta mais pesada do painel. Carregados à parte, a
 * fila do dia pinta primeiro e estes preenchem quando ficam prontos.
 */
function GradeKpis() {
  const { dados } = useApi<{ kpis: KpisPainel }>("/api/painel/inicio/kpis");
  if (!dados) return <EsqueletoKpis />;
  const { kpis } = dados;

  const percentualAlerta = kpis.totalCarteira ? Math.round((kpis.clientesEmAlerta / kpis.totalCarteira) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="Receita que saiu do alerta (30d)"
        value={formatCurrencyBRL(kpis.receitaSalva30d)}
        animar={{ ate: kpis.receitaSalva30d, formato: "moeda" }}
        indice={0}
        description={
          kpis.clientesRecuperados30d
            ? `${kpis.clientesRecuperados30d} clientes saíram do alerta`
            : "nenhuma recuperação na janela"
        }
        tone="emerald"
        icon={HeartHandshakeIcon}
      />
      <KpiCard
        label="Exposição ponderada (ano)"
        value={formatCurrencyBRL(kpis.receitaEmRiscoAno)}
        animar={{ ate: kpis.receitaEmRiscoAno, formato: "moeda" }}
        indice={1}
        description={`${kpis.clientesEmAlerta} clientes com risco relevante`}
        tone="red"
        icon={ArrowUpRightIcon}
      />
      <KpiCard
        label="Clientes em alerta"
        value={`${kpis.clientesEmAlerta}`}
        animar={{ ate: kpis.clientesEmAlerta, formato: "inteiro" }}
        indice={2}
        description={`de ${kpis.totalCarteira} na carteira (${percentualAlerta}%)`}
        tone="amber"
        icon={UsersIcon}
      />
      <KpiCard
        label="Antecedência média"
        value={kpis.antecedenciaMediaMeses == null ? "—" : `${meses(kpis.antecedenciaMediaMeses)} meses`}
        description={
          kpis.antecedenciaMediaMeses == null
            ? "sem desfechos antecipados ainda"
            : `(mediana ${meses(kpis.antecedenciaMedianaMeses)} | máx. ${meses(kpis.antecedenciaMaximaMeses)})`
        }
        animar={
          kpis.antecedenciaMediaMeses == null
            ? undefined
            : { ate: kpis.antecedenciaMediaMeses, formato: "decimal", sufixo: " meses" }
        }
        indice={3}
        tone="blue"
        icon={CalendarIcon}
      />
      <KpiCard
        label="Clientes contatados"
        value={`${kpis.clientesContatados7d}`}
        animar={{ ate: kpis.clientesContatados7d, formato: "inteiro" }}
        indice={4}
        description="nos últimos 7 dias"
        tone="emerald"
        icon={CheckIcon}
        // No celular a grade é de 2 colunas, e o 5º card ficava sozinho numa linha.
        className="hidden sm:block"
      />
    </div>
  );
}

function EsqueletoKpis() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        // O 5º some no celular, como o card "Clientes contatados" que ele antecipa.
        <div key={i} className={i === 4 ? "hidden sm:block" : undefined}>
          <SkeletonKpi />
        </div>
      ))}
    </div>
  );
}
