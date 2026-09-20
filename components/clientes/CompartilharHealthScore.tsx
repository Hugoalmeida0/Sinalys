"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowUpRightIcon, CheckIcon, XIcon } from "@/components/ui/icons";
import {
  BENEFICIOS_PLANO,
  DESTAQUES_AUTOMATICOS,
  MAX_DESTAQUES_HEALTH,
  textoDestaque,
  validarLinkAgendamento,
  type ConfigHealthPublico,
} from "@/lib/health/configuracao";

interface Props {
  token: string;
  baseUrl: string;
  clienteId: string;
  clienteLabel: string;

  destaquesDisponiveis: { codigo: string; rotulo: string }[];
  config: ConfigHealthPublico;
}

export function CompartilharHealthScore(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Compartilhar com o cliente
      </Button>
      {open && <ModalCompartilhar {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function ModalCompartilhar({
  token,
  baseUrl,
  clienteId,
  clienteLabel,
  destaquesDisponiveis,
  config,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const url = `${baseUrl}/health/${token}`;

  const sugeridos = destaquesDisponiveis.slice(0, DESTAQUES_AUTOMATICOS).map((d) => d.codigo);
  const [destaques, setDestaques] = useState<string[]>(() => {
    if (config.destaques == null) return sugeridos;
    const validos = new Set(destaquesDisponiveis.map((d) => d.codigo));
    return config.destaques.filter((c) => validos.has(c));
  });
  const [beneficios, setBeneficios] = useState<string[]>(
    () => config.beneficios ?? BENEFICIOS_PLANO.map((b) => b.codigo)
  );
  const [link, setLink] = useState(config.linkAgendamento ?? "");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<"salvo" | "copiado" | null>(null);

  function alternar(lista: string[], codigo: string, max: number): string[] | null {
    if (lista.includes(codigo)) return lista.filter((c) => c !== codigo);
    if (lista.length >= max) return null;
    return [...lista, codigo];
  }

  async function salvar(copiarDepois: boolean) {
    setErro(null);
    setStatus(null);
    const validacao = validarLinkAgendamento(link);
    if (validacao.erro) {
      setErro(validacao.erro);
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/health/configuracao", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          destaques,
          beneficios,
          link_agendamento: validacao.link,
        }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível salvar a personalização.");
        return;
      }
      router.refresh();
      if (copiarDepois) {
        try {
          await navigator.clipboard.writeText(url);
          setStatus("copiado");
        } catch {
          window.prompt("Copie o link do Health Score:", url);
          setStatus("salvo");
        }
      } else {
        setStatus("salvo");
      }
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void salvar(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Compartilhar Health Score</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {clienteId} – {clienteLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="scroll-slim flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5"
        >
          <p className="text-sm text-slate-500">
            Escolha o que o cliente vê na página. Ela nunca mostra score, faixa de risco, MRR nem
            sinais em alerta — só o que está indo bem e como marcar a próxima conversa.
          </p>

          <fieldset className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-semibold text-brand-ink">
                Destaques positivos{" "}
                <span className="font-normal text-slate-400">
                  ({destaques.length}/{MAX_DESTAQUES_HEALTH})
                </span>
              </legend>
              {destaquesDisponiveis.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDestaques(sugeridos)}
                  className="text-xs font-semibold text-brand-royal hover:underline"
                >
                  Usar sugeridos
                </button>
              )}
            </div>
            {destaquesDisponiveis.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Nenhum indicador dentro do esperado no momento. A página mostrará a frase padrão
                de agradecimento, sem destaques.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {destaquesDisponiveis.map((d) => {
                  const marcado = destaques.includes(d.codigo);
                  const bloqueado = !marcado && destaques.length >= MAX_DESTAQUES_HEALTH;
                  return (
                    <li key={d.codigo}>
                      <label
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                          marcado
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        } ${bloqueado ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 accent-emerald-600"
                          checked={marcado}
                          disabled={bloqueado}
                          onChange={() => {
                            const proxima = alternar(destaques, d.codigo, MAX_DESTAQUES_HEALTH);
                            if (proxima) setDestaques(proxima);
                          }}
                        />
                        <span className="leading-snug">{textoDestaque(d.rotulo)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-brand-ink">Benefícios do plano</legend>
            <ul className="flex flex-col gap-2">
              {BENEFICIOS_PLANO.map((b) => {
                const marcado = beneficios.includes(b.codigo);
                return (
                  <li key={b.codigo}>
                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        marcado
                          ? "border-brand-royal/30 bg-brand-pale text-brand-navy"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-brand-royal"
                        checked={marcado}
                        onChange={() => {
                          const proxima = alternar(beneficios, b.codigo, BENEFICIOS_PLANO.length);
                          if (proxima) setBeneficios(proxima);
                        }}
                      />
                      <span className="leading-snug">{b.texto}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-ink">
              Agendamento da call de alinhamento
            </span>
            <input
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://calendly.com/seu-time/alinhamento (opcional)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-royal focus:outline-none"
            />
            <span className="text-xs text-slate-500">
              Com um link (Calendly, Google Agenda…), o botão da página abre sua agenda. Sem link,
              a página mostra um formulário de pedido de call que cai no histórico deste cliente
              aqui no painel.
            </span>
          </label>

          <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 px-3 py-3">
            <span className="text-xs font-medium text-slate-600">Link público</span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-xs text-slate-500">{url}</code>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-royal hover:underline"
              >
                Abrir prévia
                <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </a>
            </div>
            <span className="text-xs text-slate-400">
              Salve antes de abrir a prévia para ver a página com as escolhas acima.
            </span>
          </div>

          {erro && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {erro}
            </p>
          )}
          {status && (
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <CheckIcon className="h-3.5 w-3.5" />
              {status === "copiado"
                ? "Personalização salva e link copiado!"
                : "Personalização salva."}
            </p>
          )}

          <div className="mt-1 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={salvando}
              onClick={() => void salvar(false)}
            >
              Salvar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar e copiar link"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
