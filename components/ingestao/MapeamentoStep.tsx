"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangleIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  TIPOS_DESTINO_MAPEAMENTO,
  criarDefinicaoMetrica,
  descricaoTipoDestino,
  listarDefinicoesMetricas,
  rotuloTipoDestino,
  salvarMapeamentos,
  type DefinicaoMetrica,
  type MapeamentoEnvio,
  type TipoDestinoMapeamento,
  type UploadIngestaoResponse,
} from "@/lib/ingestao-client";

const NOVA_METRICA = "__nova__";
const IGNORAR = "";

interface Gatilho {
  valor: string;
  codigoEvento: string;
}

interface ColunaEstado {
  tipoDestino: TipoDestinoMapeamento | typeof IGNORAR;
  campoDestino: string;
  metricaId: string;
  metricaNovaAberta: boolean;
  novaMetrica: { codigo: string; rotulo: string; tipo_valor: DefinicaoMetrica["tipo_valor"] };
  gatilhos: Gatilho[];
}

type EstadoPorAba = Record<string, Record<string, ColunaEstado>>;

function estadoColunaInicial(): ColunaEstado {
  return {
    tipoDestino: IGNORAR,
    campoDestino: "",
    metricaId: "",
    metricaNovaAberta: false,
    novaMetrica: { codigo: "", rotulo: "", tipo_valor: "numero" },
    gatilhos: [],
  };
}

export function MapeamentoStep({
  uploadResultado,
  onSalvo,
  onVoltar,
}: {
  uploadResultado: UploadIngestaoResponse;
  onSalvo: (execucaoIngestaoId: string) => void;
  onVoltar: () => void;
}) {
  const [abaAtiva, setAbaAtiva] = useState(uploadResultado.abas[0]?.aba_origem ?? "");
  const [abasIgnoradas, setAbasIgnoradas] = useState<Set<string>>(new Set());
  const [estado, setEstado] = useState<EstadoPorAba>(() => {
    const inicial: EstadoPorAba = {};
    for (const aba of uploadResultado.abas) {
      inicial[aba.aba_origem] = {};
      for (const coluna of aba.colunas) {
        inicial[aba.aba_origem][coluna] = estadoColunaInicial();
      }
    }
    return inicial;
  });

  const [metricas, setMetricas] = useState<DefinicaoMetrica[]>([]);
  const [carregandoMetricas, setCarregandoMetricas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarDefinicoesMetricas()
      .then(setMetricas)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregandoMetricas(false));
  }, []);

  const abaAtual = uploadResultado.abas.find((a) => a.aba_origem === abaAtiva) ?? uploadResultado.abas[0];

  function atualizarColuna(aba: string, coluna: string, patch: Partial<ColunaEstado>) {
    setEstado((prev) => ({
      ...prev,
      [aba]: {
        ...prev[aba],
        [coluna]: { ...prev[aba][coluna], ...patch },
      },
    }));
  }

  const temIdEntidadePorAba = useMemo(() => {
    const mapa: Record<string, boolean> = {};
    for (const aba of uploadResultado.abas) {
      mapa[aba.aba_origem] = Object.values(estado[aba.aba_origem] ?? {}).some(
        (c) => c.tipoDestino === "id_entidade",
      );
    }
    return mapa;
  }, [estado, uploadResultado.abas]);

  async function handleCriarMetrica(aba: string, coluna: string) {
    const rascunho = estado[aba][coluna].novaMetrica;
    if (!rascunho.codigo || !rascunho.rotulo) {
      setErro("Informe código e rótulo para criar a nova métrica.");
      return;
    }
    try {
      const nova = await criarDefinicaoMetrica(rascunho);
      setMetricas((prev) => [...prev, nova].sort((a, b) => a.rotulo.localeCompare(b.rotulo)));
      atualizarColuna(aba, coluna, { metricaId: nova.id, metricaNovaAberta: false });
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  function alternarIgnorarAba(aba: string) {
    setAbasIgnoradas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(aba)) proximo.delete(aba);
      else proximo.add(aba);
      return proximo;
    });
  }

  function montarPayload(): MapeamentoEnvio[] {
    const payload: MapeamentoEnvio[] = [];
    for (const aba of uploadResultado.abas) {
      if (abasIgnoradas.has(aba.aba_origem)) continue;
      for (const coluna of aba.colunas) {
        const c = estado[aba.aba_origem][coluna];
        if (!c || c.tipoDestino === IGNORAR) continue;

        payload.push({
          aba_origem: aba.aba_origem,
          coluna_origem: coluna,
          tipo_destino: c.tipoDestino,
          campo_destino:
            c.tipoDestino === "atributo_entidade" ? c.campoDestino || null : null,
          metrica_id: c.tipoDestino === "metrica" ? c.metricaId || null : null,
          config_transformacao:
            c.tipoDestino === "status_evento" && c.gatilhos.length > 0
              ? { gatilhos: Object.fromEntries(c.gatilhos.filter((g) => g.valor).map((g) => [g.valor, g.codigoEvento])) }
              : undefined,
        });
      }
    }
    return payload;
  }

  async function handleSalvar() {
    setErro(null);
    const mapeamentos = montarPayload();

    if (mapeamentos.length === 0) {
      setErro("Mapeie ao menos uma coluna antes de salvar.");
      return;
    }
    const metricaFaltando = mapeamentos.find((m) => m.tipo_destino === "metrica" && !m.metrica_id);
    if (metricaFaltando) {
      setErro(`Selecione ou crie uma métrica para a coluna "${metricaFaltando.coluna_origem}".`);
      return;
    }

    setSalvando(true);
    try {
      await salvarMapeamentos(uploadResultado.execucao_ingestao_id, mapeamentos);
      onSalvo(uploadResultado.execucao_ingestao_id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (!abaAtual) {
    return <p className="text-sm text-slate-500">Nenhuma aba detectada no arquivo enviado.</p>;
  }

  const abaAtualIgnorada = abasIgnoradas.has(abaAtual.aba_origem);

  return (
    <div className="flex flex-col gap-4">
      {uploadResultado.abas.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {uploadResultado.abas.map((aba) => {
            const ignorada = abasIgnoradas.has(aba.aba_origem);
            return (
              <div
                key={aba.aba_origem || "planilha"}
                className={`flex items-center gap-1 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium transition-colors ${
                  ignorada
                    ? "bg-slate-50 text-slate-400 line-through"
                    : aba.aba_origem === abaAtiva
                      ? "bg-brand-navy text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <button type="button" onClick={() => setAbaAtiva(aba.aba_origem)}>
                  {aba.aba_origem || "Planilha"}
                </button>
                <button
                  type="button"
                  onClick={() => alternarIgnorarAba(aba.aba_origem)}
                  title={ignorada ? "Voltar a considerar esta aba" : "Ignorar esta aba (não será importada)"}
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none ${
                    ignorada
                      ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                      : aba.aba_origem === abaAtiva
                        ? "bg-white/20 text-white hover:bg-white/30"
                        : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                  }`}
                >
                  {ignorada ? "+" : "×"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {abaAtualIgnorada ? (
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          Esta aba está marcada para ser ignorada — nenhuma coluna dela será importada. Clique no
          &quot;+&quot; ao lado do nome da aba para voltar a considerá-la.
        </div>
      ) : (
        !temIdEntidadePorAba[abaAtual.aba_origem] && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            Esta aba ainda não tem uma coluna marcada como &quot;Identificador da entidade&quot;. Sem
            isso, ela será ignorada no processamento.
          </div>
        )
      )}

      {!abaAtualIgnorada && (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Coluna do arquivo</th>
              <th className="px-4 py-2.5">Tipo de destino</th>
              <th className="px-4 py-2.5">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {abaAtual.colunas.map((coluna) => {
              const c = estado[abaAtual.aba_origem][coluna];
              return (
                <tr key={coluna} className="border-b border-slate-50 align-top last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{coluna}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.tipoDestino}
                      onChange={(e) =>
                        atualizarColuna(abaAtual.aba_origem, coluna, {
                          tipoDestino: e.target.value as ColunaEstado["tipoDestino"],
                        })
                      }
                      className="w-full min-w-[200px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand-royal focus:outline-none"
                    >
                      <option value={IGNORAR}>Ignorar coluna</option>
                      {TIPOS_DESTINO_MAPEAMENTO.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {rotuloTipoDestino[tipo]}
                        </option>
                      ))}
                    </select>
                    {c.tipoDestino !== IGNORAR && (
                      <p className="mt-1 max-w-[220px] text-xs text-slate-400">
                        {descricaoTipoDestino[c.tipoDestino]}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.tipoDestino === "atributo_entidade" && (
                      <input
                        type="text"
                        value={c.campoDestino}
                        onChange={(e) =>
                          atualizarColuna(abaAtual.aba_origem, coluna, { campoDestino: e.target.value })
                        }
                        placeholder={`Nome do atributo (padrão: ${coluna})`}
                        className="w-full min-w-[220px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand-royal focus:outline-none"
                      />
                    )}

                    {c.tipoDestino === "metrica" && (
                      <div className="flex flex-col gap-2">
                        <select
                          value={c.metricaNovaAberta ? NOVA_METRICA : c.metricaId}
                          disabled={carregandoMetricas}
                          onChange={(e) => {
                            if (e.target.value === NOVA_METRICA) {
                              atualizarColuna(abaAtual.aba_origem, coluna, { metricaNovaAberta: true });
                            } else {
                              atualizarColuna(abaAtual.aba_origem, coluna, {
                                metricaId: e.target.value,
                                metricaNovaAberta: false,
                              });
                            }
                          }}
                          className="w-full min-w-[220px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand-royal focus:outline-none"
                        >
                          <option value="" disabled>
                            {carregandoMetricas ? "Carregando..." : "Selecione a métrica"}
                          </option>
                          {metricas.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.rotulo} ({m.codigo})
                            </option>
                          ))}
                          <option value={NOVA_METRICA}>+ Criar nova métrica</option>
                        </select>

                        {c.metricaNovaAberta && (
                          <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 p-2.5">
                            <input
                              type="text"
                              placeholder="código (ex.: taxa_uso)"
                              value={c.novaMetrica.codigo}
                              onChange={(e) =>
                                atualizarColuna(abaAtual.aba_origem, coluna, {
                                  novaMetrica: { ...c.novaMetrica, codigo: e.target.value },
                                })
                              }
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-brand-royal focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="rótulo (ex.: Taxa de uso)"
                              value={c.novaMetrica.rotulo}
                              onChange={(e) =>
                                atualizarColuna(abaAtual.aba_origem, coluna, {
                                  novaMetrica: { ...c.novaMetrica, rotulo: e.target.value },
                                })
                              }
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-brand-royal focus:outline-none"
                            />
                            <select
                              value={c.novaMetrica.tipo_valor}
                              onChange={(e) =>
                                atualizarColuna(abaAtual.aba_origem, coluna, {
                                  novaMetrica: {
                                    ...c.novaMetrica,
                                    tipo_valor: e.target.value as DefinicaoMetrica["tipo_valor"],
                                  },
                                })
                              }
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-brand-royal focus:outline-none"
                            >
                              <option value="numero">Número</option>
                              <option value="texto">Texto</option>
                              <option value="booleano">Booleano</option>
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleCriarMetrica(abaAtual.aba_origem, coluna)}
                            >
                              Criar métrica
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {c.tipoDestino === "status_evento" && (
                      <div className="flex flex-col gap-1.5">
                        {c.gatilhos.map((g, index) => (
                          <div key={index} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="valor na planilha"
                              value={g.valor}
                              onChange={(e) => {
                                const gatilhos = [...c.gatilhos];
                                gatilhos[index] = { ...gatilhos[index], valor: e.target.value };
                                atualizarColuna(abaAtual.aba_origem, coluna, { gatilhos });
                              }}
                              className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-brand-royal focus:outline-none"
                            />
                            <span className="text-slate-300">→</span>
                            <input
                              type="text"
                              placeholder="código do evento"
                              value={g.codigoEvento}
                              onChange={(e) => {
                                const gatilhos = [...c.gatilhos];
                                gatilhos[index] = { ...gatilhos[index], codigoEvento: e.target.value };
                                atualizarColuna(abaAtual.aba_origem, coluna, { gatilhos });
                              }}
                              className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-brand-royal focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const gatilhos = c.gatilhos.filter((_, i) => i !== index);
                                atualizarColuna(abaAtual.aba_origem, coluna, { gatilhos });
                              }}
                              className="text-slate-300 hover:text-red-500"
                              aria-label="Remover regra"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            atualizarColuna(abaAtual.aba_origem, coluna, {
                              gatilhos: [...c.gatilhos, { valor: "", codigoEvento: "" }],
                            })
                          }
                          className="flex items-center gap-1 text-xs font-medium text-brand-royal hover:underline"
                        >
                          <PlusIcon className="h-3 w-3" /> adicionar regra
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erro}</p>}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onVoltar}>
          Voltar
        </Button>
        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar mapeamento e continuar"}
        </Button>
      </div>
    </div>
  );
}
