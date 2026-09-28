import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export type ParteMensagem =
  | { tipo: "texto"; texto: string }
  | { tipo: "ferramenta"; id: string; nome: string; estado: "executando" | "concluida" | "erro" };

export interface MensagemChat {
  id: string;
  role: "user" | "assistant";
  partes: ParteMensagem[];
}

export type StatusChat = "pronto" | "enviado" | "transmitindo" | "erro";

export interface TelaChat {
  caminho: string;
  clienteId?: string;
}

type EventoChat =
  | { tipo: "texto"; delta: string }
  | { tipo: "ferramenta"; id: string; nome: string; estado: "executando" | "concluida" | "erro" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "fim" };

let sequencia = 0;
const novoId = () => `m${Date.now().toString(36)}${(sequencia++).toString(36)}`;

function textoDa(mensagem: MensagemChat): string {
  return mensagem.partes
    .filter((p): p is Extract<ParteMensagem, { tipo: "texto" }> => p.tipo === "texto")
    .map((p) => p.texto)
    .join("");
}

/**
 * Conversa com `POST /api/inteligencia/chat`, que responde em NDJSON: uma
 * linha JSON por evento (trecho de texto, ferramenta consultada, erro, fim).
 */
export function useChatSinalys() {
  const [mensagens, setMensagensEstado] = useState<MensagemChat[]>([]);
  const [status, setStatus] = useState<StatusChat>("pronto");
  const [erro, setErro] = useState<{ mensagem: string; status?: number } | null>(null);
  const controle = useRef<AbortController | null>(null);
  // Espelho síncrono das mensagens: montar o histórico a enviar não pode
  // depender de um updater de estado (que o StrictMode executa duas vezes).
  const atuais = useRef<MensagemChat[]>([]);

  const setMensagens = useCallback((mudar: (atuais: MensagemChat[]) => MensagemChat[]) => {
    atuais.current = mudar(atuais.current);
    setMensagensEstado(atuais.current);
  }, []);

  const transmitir = useCallback(async (historico: MensagemChat[], tela: TelaChat) => {
    controle.current?.abort();
    const abortar = new AbortController();
    controle.current = abortar;
    setErro(null);
    setStatus("enviado");

    const idResposta = novoId();
    const atualizarResposta = (mudar: (partes: ParteMensagem[]) => ParteMensagem[]) =>
      setMensagens((atuais) => {
        const existe = atuais.some((m) => m.id === idResposta);
        const base = existe ? atuais : [...atuais, { id: idResposta, role: "assistant" as const, partes: [] }];
        return base.map((m) => (m.id === idResposta ? { ...m, partes: mudar(m.partes) } : m));
      });

    try {
      const resposta = await apiFetch("/api/inteligencia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historico.map((m) => ({ role: m.role, content: textoDa(m) })),
          tela,
        }),
        signal: abortar.signal,
      });
      if (!resposta.ok || !resposta.body) {
        const corpo = await resposta.json().catch(() => null);
        setErro({ mensagem: corpo?.erro ?? `HTTP ${resposta.status}`, status: resposta.status });
        setStatus("erro");
        return;
      }

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let pendente = "";
      let falhou = false;

      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        pendente += decodificador.decode(value, { stream: true });
        const linhas = pendente.split("\n");
        pendente = linhas.pop() ?? "";

        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evento = JSON.parse(linha) as EventoChat;
          if (evento.tipo === "texto") {
            setStatus("transmitindo");
            atualizarResposta((partes) => {
              const ultima = partes[partes.length - 1];
              if (ultima?.tipo === "texto") {
                return [...partes.slice(0, -1), { tipo: "texto", texto: ultima.texto + evento.delta }];
              }
              return [...partes, { tipo: "texto", texto: evento.delta }];
            });
          } else if (evento.tipo === "ferramenta") {
            setStatus("transmitindo");
            atualizarResposta((partes) => {
              const i = partes.findIndex((p) => p.tipo === "ferramenta" && p.id === evento.id);
              const parte: ParteMensagem = { tipo: "ferramenta", id: evento.id, nome: evento.nome, estado: evento.estado };
              return i === -1 ? [...partes, parte] : partes.map((p, j) => (j === i ? parte : p));
            });
          } else if (evento.tipo === "erro") {
            falhou = true;
            setErro({ mensagem: evento.mensagem });
          }
        }
      }
      setStatus(falhou ? "erro" : "pronto");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setStatus("pronto");
        return;
      }
      setErro({ mensagem: (e as Error).message });
      setStatus("erro");
    }
  }, [setMensagens]);

  const enviar = useCallback(
    (texto: string, tela: TelaChat) => {
      const pergunta: MensagemChat = { id: novoId(), role: "user", partes: [{ tipo: "texto", texto }] };
      setMensagens((lista) => [...lista, pergunta]);
      void transmitir(atuais.current, tela);
    },
    [setMensagens, transmitir],
  );

  /** Refaz a última pergunta: descarta a resposta parcial, se houver, e reenvia. */
  const regenerar = useCallback(
    (tela: TelaChat) => {
      const ultimaPergunta = atuais.current.map((m) => m.role).lastIndexOf("user");
      if (ultimaPergunta === -1) return;
      setMensagens((lista) => lista.slice(0, ultimaPergunta + 1));
      void transmitir(atuais.current, tela);
    },
    [setMensagens, transmitir],
  );

  const parar = useCallback(() => {
    controle.current?.abort();
    controle.current = null;
    setStatus("pronto");
  }, []);

  const limpar = useCallback(() => {
    controle.current?.abort();
    controle.current = null;
    setMensagens(() => []);
    setErro(null);
    setStatus("pronto");
  }, [setMensagens]);

  return {
    mensagens,
    status,
    erro,
    enviar,
    regenerar,
    parar,
    limpar,
    limparErro: () => setErro(null),
  };
}
