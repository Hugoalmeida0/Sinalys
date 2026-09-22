"use client";

import { useState } from "react";
import {
  CheckIcon,
  ClockIcon,
  InfoIcon,
  MoreIcon,
  PencilIcon,
  PlusCircleIcon,
  XIcon,
} from "@/components/ui/icons";
import { MarcaIntegracao } from "@/components/configuracoes/MarcaIntegracao";
import { PesosDetalhados, PesosResumo } from "@/components/configuracoes/ModeloDeRisco";
import { AssistantCard } from "@/components/ui/AssistantCard";
import { Button } from "@/components/ui/Button";
import { BotaoEmBreve } from "@/components/ui/BotaoEmBreve";
import { useEmBreve } from "@/components/ui/EmBreve";
import { SoftBadge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { useAbaVisivel } from "@/hooks/useAbaVisivel";
import { useModeloDeRisco } from "@/hooks/useModeloDeRisco";
import { equipe, integracoes, usuarioAtual, type Integracao } from "@/lib/mock/dados";

const tabs = [
  "Geral",
  "Integrações",
  "Modelo de risco",
  "Usuários",
  "Notificações",
] as const;

type Tab = (typeof tabs)[number];

export function ConfiguracoesTabs() {
  const [tab, setTab] = useState<Tab>("Geral");
  const faixaAbas = useAbaVisivel(tab);

  const modeloState = useModeloDeRisco();

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={faixaAbas}
        className="scroll-slim flex gap-2 overflow-x-auto border-b border-slate-200"
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            data-aba-ativa={tab === t}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t
                ? "border-brand-royal text-brand-royal"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          {tab === "Geral" && (
            <>
              <PerfilDaConta />
              <ListaIntegracoes />
              <Preferencias />
            </>
          )}
          {tab === "Integrações" && <ListaIntegracoes />}
          {tab === "Modelo de risco" && <PesosDetalhados state={modeloState} />}
          {tab === "Usuários" && <Usuarios />}
          {tab === "Notificações" && <Preferencias titulo="Notificações" />}
        </div>

        <aside className="flex flex-col gap-4">
          <AssistantCard
            titulo={
              <>
                Quer ajuda para
                <br />
                calibrar o modelo?
              </>
            }
            descricao="Converse com o assistente da Sinalys para ajustar os pesos, entender os riscos e melhorar seus resultados."
            variante="analisando"
            assunto="Como devo calibrar os pesos do modelo de risco?"
          />

          <PesosResumo state={modeloState} />
          <DicaDaSinalys />
        </aside>
      </div>
    </div>
  );
}

/** Mesmo visual do Button secundário, porém avisando que o recurso ainda vem. */
function BotaoEmBreveEstilizado({
  recurso,
  children,
}: {
  recurso: string;
  children: React.ReactNode;
}) {
  const avisar = useEmBreve();
  return (
    <Button variant="secondary" className="shrink-0" onClick={() => avisar(recurso)}>
      {children}
    </Button>
  );
}

export function Painel({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-ink">{titulo}</h2>
          {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PerfilDaConta() {
  return (
    <Painel
      titulo="Perfil da conta"
      descricao="Suas informações de acesso e perfil no Sinalys."
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-navy text-base font-bold text-puro">
          {usuarioAtual.iniciais}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-brand-ink">{usuarioAtual.nome}</p>
          <p className="text-sm text-slate-500">{usuarioAtual.cargo}</p>
          <p className="text-sm text-slate-400">ana.souza@sinalys.com.br</p>
        </div>
        <BotaoEmBreveEstilizado recurso="Editar perfil">
          <PencilIcon className="h-4 w-4" />
          Editar perfil
        </BotaoEmBreveEstilizado>
      </div>
    </Painel>
  );
}

const statusIntegracao: Record<
  Integracao["status"],
  { label: string; classes: string; icone: typeof CheckIcon }
> = {
  conectado: {
    label: "Conectado",
    classes: "bg-emerald-50 text-emerald-700",
    icone: CheckIcon,
  },
  pendente: { label: "Pendente", classes: "bg-amber-50 text-amber-700", icone: ClockIcon },
};

function ListaIntegracoes() {
  return (
    <Painel
      titulo="Integrações"
      descricao="Conecte os serviços utilizados pelo Sinalys."
      acao={
        <BotaoEmBreveEstilizado recurso="Adicionar integração">
          <PlusCircleIcon className="h-4 w-4" />
          Adicionar integração
        </BotaoEmBreveEstilizado>
      }
    >
      <ul className="flex flex-col divide-y divide-slate-100">
        {integracoes.map((integracao) => {
          const { label, classes, icone: Icon } = statusIntegracao[integracao.status];

          return (
            <li key={integracao.id} className="flex items-center gap-3.5 py-3.5 first:pt-0">
              <MarcaIntegracao marca={integracao.marca} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-ink">{integracao.nome}</p>
                <p className="mt-0.5 text-xs text-slate-500">{integracao.descricao}</p>
              </div>
              <SoftBadge className={`${classes} shrink-0 px-3 py-1.5`}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </SoftBadge>
              <BotaoEmBreve
                recurso={`Opções de ${integracao.nome}`}
                aria-label={`Opções de ${integracao.nome}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <MoreIcon className="h-4 w-4" />
              </BotaoEmBreve>
            </li>
          );
        })}
      </ul>
    </Painel>
  );
}

const preferencias = [
  {
    titulo: "Receber alertas por e-mail",
    descricao: "Seja notificado sobre clientes em alerta.",
    padrao: true,
  },
  {
    titulo: "Relatórios semanais automáticos",
    descricao: "Receba um resumo semanal por e-mail.",
    padrao: false,
  },
  {
    titulo: "Notificações no app",
    descricao: "Receba notificações em tempo real.",
    padrao: true,
  },
  {
    titulo: "Dicas e novidades do produto",
    descricao: "Receba atualizações sobre novas funcionalidades.",
    padrao: true,
  },
];

function Preferencias({ titulo = "Preferências" }: { titulo?: string }) {
  return (
    <Painel titulo={titulo} descricao="Ajuste o comportamento da plataforma.">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {preferencias.map((p) => (
          <Toggle
            key={p.titulo}
            titulo={p.titulo}
            descricao={p.descricao}
            padrao={p.padrao}
          />
        ))}
      </div>
    </Painel>
  );
}

function Usuarios() {
  return (
    <Painel
      titulo="Usuários"
      descricao="Quem tem acesso ao Sinalys nesta organização."
      acao={
        <Button variant="secondary" className="shrink-0">
          <PlusCircleIcon className="h-4 w-4" />
          Convidar usuário
        </Button>
      }
    >
      <ul className="flex flex-col divide-y divide-slate-100">
        {equipe.map((membro) => (
          <li key={membro.id} className="flex items-center gap-3.5 py-3.5 first:pt-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-pale text-xs font-bold text-brand-navy">
              {membro.iniciais}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-ink">{membro.nome}</p>
              <p className="mt-0.5 text-xs text-slate-500">{membro.email}</p>
            </div>
            <SoftBadge className="shrink-0 px-3 py-1.5">{membro.papel}</SoftBadge>
            <BotaoEmBreve
              recurso={`Opções de ${membro.nome}`}
              aria-label={`Opções de ${membro.nome}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <MoreIcon className="h-4 w-4" />
            </BotaoEmBreve>
          </li>
        ))}
      </ul>
    </Painel>
  );
}

function DicaDaSinalys() {
  const [visivel, setVisivel] = useState(true);
  if (!visivel) return null;

  return (
    <div className="relative rounded-2xl bg-brand-pale p-5 pr-10">
      <button
        type="button"
        onClick={() => setVisivel(false)}
        aria-label="Dispensar dica"
        className="absolute top-4 right-4 text-slate-400 transition-colors hover:text-slate-600"
      >
        <XIcon className="h-4 w-4" />
      </button>

      <div className="flex gap-3">
        <InfoIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-royal" />
        <div>
          <p className="text-sm font-bold text-brand-navy">Dica da Sinalys</p>
          <p className="mt-1 text-xs leading-relaxed text-brand-navy/70">
            Ajuste os pesos do modelo com base no seu contexto de negócio. Pequenas mudanças
            podem gerar grandes insights.
          </p>
        </div>
      </div>
    </div>
  );
}
