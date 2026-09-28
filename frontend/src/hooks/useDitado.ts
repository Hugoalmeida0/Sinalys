import { useCallback, useEffect, useRef, useState } from "react";
import { useSuporteNavegador } from "./useSuporteNavegador";

/**
 * Ditado por voz via Web Speech API.
 *
 * Existe no Chrome (Android/desktop) e no Safari do iOS sob prefixo `webkit`.
 * Onde não existe, `suportado` volta falso e quem chama simplesmente não
 * renderiza o botão de microfone — nunca um botão que não funciona.
 */

type Reconhecimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

function construtor(): (new () => Reconhecimento) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Reconhecimento;
    webkitSpeechRecognition?: new () => Reconhecimento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDitado(aoTranscrever: (texto: string) => void) {
  const suportado = useSuporteNavegador(() => construtor() !== null);
  const [ouvindo, setOuvindo] = useState(false);
  const motor = useRef<Reconhecimento | null>(null);
  const callback = useRef(aoTranscrever);

  // Mantém a callback fresca sem recriar o motor de reconhecimento.
  useEffect(() => {
    callback.current = aoTranscrever;
  }, [aoTranscrever]);

  useEffect(() => () => motor.current?.abort(), []);

  const parar = useCallback(() => {
    motor.current?.stop();
    setOuvindo(false);
  }, []);

  const iniciar = useCallback(() => {
    const Motor = construtor();
    if (!Motor) return;

    const r = new Motor();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = true;

    r.onresult = (e) => {
      let texto = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        texto += e.results[i][0].transcript;
      }
      callback.current(texto);
    };
    r.onerror = () => setOuvindo(false);
    r.onend = () => setOuvindo(false);

    motor.current = r;
    try {
      r.start();
      setOuvindo(true);
    } catch {
      setOuvindo(false);
    }
  }, []);

  const alternar = useCallback(() => {
    if (ouvindo) parar();
    else iniciar();
  }, [ouvindo, iniciar, parar]);

  return { suportado, ouvindo, alternar, parar };
}
