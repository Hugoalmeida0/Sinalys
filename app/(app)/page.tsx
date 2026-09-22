import { Suspense } from "react";
import { FilaDoDia } from "@/components/dashboard/FilaDoDia";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RecalculoFilaGate } from "@/components/dashboard/RecalculoFilaGate";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  HeartHandshakeIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonKpi } from "@/components/ui/Skeleton";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { formatCurrencyBRL } from "@/lib/utils/formatacao";
import { montarResumoFila } from "@/lib/painel/clientes";
import { calcularKpisPainel } from "@/lib/painel/kpis";
import { carregarPainel } from "@/lib/painel/servidor";
import type { KpisPainel } from "@/lib/painel/tipos";

const KPIS_VAZIOS: KpisPainel = {
  receitaEmRiscoAno: 0,
  clientesEmAlerta: 0,
  totalCarteira: 0,
  antecedenciaMediaMeses: null,
  antecedenciaMedianaMeses: null,
  antecedenciaMaximaMeses: null,
  desfechosAntecipados: 0,
  clientesContatados7d: 0,
  receitaSalva30d: 0,
  clientesRecuperados30d: 0,
};

function meses(valor: number | null): string {
  return valor == null ? "—" : valor.toLocaleString("pt-BR", { minimumFractionDigits: 1 });
}

export default async function DashboardPage() {
  const [usuario, painel] = await Promise.all([obterUsuarioSessao(), carregarPainel()]);
  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  const fila = montarResumoFila(painel.clientes);

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
            titulo={primeiroNome ? `Bom dia, ${primeiroNome}.` : "Bom dia."}
            descricao="Aqui estão os clientes que precisam da sua atenção hoje."
          />

          <Suspense fallback={<EsqueletoKpis />}>
            <GradeKpis painel={painel} />
          </Suspense>
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
            clientes={fila}
            mensagemVazia={
              !painel.modeloId
                ? "Nenhum modelo de risco ativo no projeto. Ative um modelo para gerar a fila."
                : painel.clientes.length === 0
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
 * Os KPIs dependem da consulta mais pesada do painel. Isolados num Suspense
 * próprio, a fila do dia pinta primeiro e estes preenchem quando ficam
 * prontos, em vez de toda a tela esperar pelo dado mais lento.
 */
async function GradeKpis({ painel }: { painel: Awaited<ReturnType<typeof carregarPainel>> }) {
  const kpis = painel.modeloId
    ? await calcularKpisPainel({
        supabase: painel.supabase,
        projetoId: painel.projetoId,
        modeloId: painel.modeloId,
        clientes: painel.clientes,
      })
    : KPIS_VAZIOS;

  const percentualAlerta = kpis.totalCarteira
    ? Math.round((kpis.clientesEmAlerta / kpis.totalCarteira) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Receita salva (30d)"
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
          label="Receita em risco (ano)"
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
          value={
            kpis.antecedenciaMediaMeses == null
              ? "—"
              : `${meses(kpis.antecedenciaMediaMeses)} meses`
          }
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
        />
      </div>
  );
}

function EsqueletoKpis() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonKpi key={i} />
      ))}
    </div>
  );
}
