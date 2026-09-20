"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon, LoaderIcon, PlusCircleIcon, SlidersIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Painel } from "./ConfiguracoesTabs";
import type {
  MetricaDisponivelUI,
  NovaRegraPayload,
  RegraModeloUI,
  UseModeloDeRisco,
} from "@/lib/motor/hooks/useModeloDeRisco";

/** Teto só de exibição da barra/slider — o banco aceita qualquer peso ≥ 0. */
const PESO_MAXIMO_UI = 10;

const ROTULOS_TIPO: Record<RegraModeloUI["tipo"], string> = {
  zscore_carteira: "Comparado com a carteira",
  media_movel: "Comparado com o próprio histórico",
};

const ROTULOS_DIRECAO: Record<RegraModeloUI["direcao"], string> = {
  maior_pior: "Quanto maior, pior",
  menor_pior: "Quanto menor, pior",
};

/**
 * Aba "Modelo de risco" de /configuracoes (Módulo 5 — CRUD de pesos/regras).
 * `state` vem de `useModeloDeRisco()`, chamado uma vez em `ConfiguracoesTabs`
 * e repassado aqui e para `PesosResumo` — evita duas buscas independentes.
 */
export function PesosDetalhados({ state }: { state: UseModeloDeRisco }) {
  const { modelo, carregando, erro } = state;
  const [mostrarForm, setMostrarForm] = useState(false);

  if (carregando && !modelo) {
    return (
      <Painel titulo="Pesos do modelo de risco">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </Painel>
    );
  }

  if (!modelo) {
    return (
      <Painel titulo="Pesos do modelo de risco">
        <ErroCarregamento erro={erro} onTentarNovamente={state.recarregar} />
      </Painel>
    );
  }

  return (
    <Painel
      titulo="Pesos do modelo de risco"
      descricao="Usados no cálculo do Score de Risco. Ajuste conforme a realidade da sua operação."
      acao={
        !mostrarForm && (
          <Button variant="secondary" className="shrink-0" onClick={() => setMostrarForm(true)}>
            <PlusCircleIcon className="h-4 w-4" />
            Adicionar sinal
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {erro && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertTriangleIcon className="h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}

        <ListaRegrasEditavel regras={modelo.regras} state={state} />

        {mostrarForm ? (
          <FormularioNovaRegra
            metricas={modelo.metricas_disponiveis}
            state={state}
            onFechar={() => setMostrarForm(false)}
          />
        ) : modelo.metricas_disponiveis.length === 0 ? (
          <p className="text-xs text-slate-400">
            Todas as métricas numéricas do projeto já têm uma regra de risco.
          </p>
        ) : null}
      </div>
    </Painel>
  );
}

function ErroCarregamento({ erro, onTentarNovamente }: { erro: string | null; onTentarNovamente: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-600">
      <p>{erro ?? "Não foi possível carregar o modelo de risco."}</p>
      <Button variant="secondary" size="sm" onClick={onTentarNovamente}>
        Tentar novamente
      </Button>
    </div>
  );
}

function ListaRegrasEditavel({ regras, state }: { regras: RegraModeloUI[]; state: UseModeloDeRisco }) {
  // Rascunho local: só vira PATCH ao clicar "Salvar alterações", para não
  // recalcular o motor a cada arrasto do slider.
  const [rascunho, setRascunho] = useState<Record<string, number>>({});
  const { salvando } = state;

  const pesoAtual = (r: RegraModeloUI) => rascunho[r.id] ?? r.peso;
  const alterados = regras.filter((r) => rascunho[r.id] !== undefined && rascunho[r.id] !== r.peso);

  async function salvar() {
    const atualizacoes = alterados.map((r) => ({ id: r.id, peso: rascunho[r.id] }));
    const ok = await state.salvarPesos(atualizacoes);
    if (ok) setRascunho({});
  }

  if (regras.length === 0) {
    return <p className="text-sm text-slate-400">Nenhum sinal de risco configurado ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {regras.map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-brand-ink">{r.metrica_rotulo}</span>
                <p className="text-xs text-slate-400">
                  {ROTULOS_TIPO[r.tipo]} · {ROTULOS_DIRECAO[r.direcao]}
                  {r.tipo === "media_movel" && r.janela_dias ? ` · janela de ${r.janela_dias} dias` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-brand-ink">
                {pesoAtual(r).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={PESO_MAXIMO_UI}
              step={0.5}
              value={pesoAtual(r)}
              onChange={(e) => setRascunho((prev) => ({ ...prev, [r.id]: Number(e.target.value) }))}
              disabled={salvando}
              aria-label={`Peso de ${r.metrica_rotulo}`}
              className="accent-brand-royal"
            />
          </li>
        ))}
      </ul>

      {alterados.length > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? (
              <>
                <LoaderIcon className="h-4 w-4 animate-spin" />
                Salvando e recalculando…
              </>
            ) : (
              <>
                <SlidersIcon className="h-4 w-4" />
                Salvar {alterados.length === 1 ? "alteração" : `${alterados.length} alterações`}
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => setRascunho({})}
            disabled={salvando}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}

function FormularioNovaRegra({
  metricas,
  state,
  onFechar,
}: {
  metricas: MetricaDisponivelUI[];
  state: UseModeloDeRisco;
  onFechar: () => void;
}) {
  const [metricaId, setMetricaId] = useState(metricas[0]?.id ?? "");
  const [tipo, setTipo] = useState<RegraModeloUI["tipo"]>("zscore_carteira");
  const [direcao, setDirecao] = useState<RegraModeloUI["direcao"]>("maior_pior");
  const [peso, setPeso] = useState(3);
  const [janelaDias, setJanelaDias] = useState(30);
  const { salvando } = state;

  const opcoesMetrica = useMemo(
    () => metricas.map((m) => ({ value: m.id, label: m.unidade ? `${m.rotulo} (${m.unidade})` : m.rotulo })),
    [metricas]
  );

  async function adicionar() {
    if (!metricaId) return;
    const payload: NovaRegraPayload = { metrica_id: metricaId, tipo, direcao, peso };
    if (tipo === "media_movel") payload.janela_dias = janelaDias;
    const ok = await state.criarRegra(payload);
    if (ok) onFechar();
  }

  if (metricas.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-brand-ink">Novo sinal de risco</p>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="text-slate-400 hover:text-slate-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Métrica</span>
        <Select value={metricaId} options={opcoesMetrica} onChange={setMetricaId} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Como comparar</span>
        <Select
          value={tipo}
          options={[
            { value: "zscore_carteira", label: ROTULOS_TIPO.zscore_carteira },
            { value: "media_movel", label: ROTULOS_TIPO.media_movel },
          ]}
          onChange={(v) => setTipo(v as RegraModeloUI["tipo"])}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Direção do risco</span>
        <Select
          value={direcao}
          options={[
            { value: "maior_pior", label: ROTULOS_DIRECAO.maior_pior },
            { value: "menor_pior", label: ROTULOS_DIRECAO.menor_pior },
          ]}
          onChange={(v) => setDirecao(v as RegraModeloUI["direcao"])}
        />
      </label>

      {tipo === "media_movel" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Janela (dias)</span>
          <input
            type="number"
            min={1}
            value={janelaDias}
            onChange={(e) => setJanelaDias(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-royal focus:outline-none"
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">
          Peso: {peso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
        </span>
        <input
          type="range"
          min={0}
          max={PESO_MAXIMO_UI}
          step={0.5}
          value={peso}
          onChange={(e) => setPeso(Number(e.target.value))}
          className="accent-brand-royal"
        />
      </label>

      <Button onClick={adicionar} disabled={salvando || !metricaId} className="w-full justify-center">
        {salvando ? (
          <>
            <LoaderIcon className="h-4 w-4 animate-spin" />
            Adicionando…
          </>
        ) : (
          "Adicionar sinal"
        )}
      </Button>
    </div>
  );
}

/** Versão compacta usada na sidebar de /configuracoes, visível em qualquer aba. */
export function PesosResumo({ state }: { state: UseModeloDeRisco }) {
  const { modelo, carregando } = state;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h2 className="text-base font-bold text-brand-ink">Pesos do modelo de risco</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Usados no cálculo do Score de Risco. Ajuste conforme a realidade da sua operação.
      </p>

      {carregando && !modelo ? (
        <div className="mt-4 flex flex-col gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : !modelo ? (
        <p className="mt-4 text-xs text-slate-400">Não foi possível carregar.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3.5">
          {modelo.regras.slice(0, 4).map((r) => (
            <li key={r.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-600">{r.metrica_rotulo}</span>
                <span className="text-sm font-bold text-brand-ink">
                  {r.peso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-royal"
                  style={{ width: `${Math.min(100, (r.peso / PESO_MAXIMO_UI) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
