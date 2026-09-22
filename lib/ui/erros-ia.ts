export interface ErroIA {
  mensagem: string;
  /** Falso quando repetir não resolve (sessão expirada, por exemplo). */
  podeTentarDeNovo: boolean;
}

/**
 * Traduz a falha do assistente ou da análise por IA para quem está usando.
 *
 * O servidor devolve o texto do provedor ("HTTP 429", "rate limit exceeded",
 * "Falha ao gerar diagnóstico: …"), que não diz nada a quem está do outro lado
 * e parece um defeito. Aqui só se escolhe a frase; o motivo técnico continua
 * no log do servidor.
 */
export function traduzirErroIA(bruto: string | null | undefined, status?: number): ErroIA {
  const texto = bruto ?? "";

  if (status === 401 || /sess[aã]o inv[aá]lida|unauthorized/i.test(texto)) {
    return {
      mensagem: "Sua sessão expirou. Entre de novo para continuar.",
      podeTentarDeNovo: false,
    };
  }

  if (status === 429 || /\b429\b|quota|rate.?limit|limite/i.test(texto)) {
    return {
      mensagem: "A Sinalys está com muitas perguntas agora. Tente de novo em alguns segundos.",
      podeTentarDeNovo: true,
    };
  }

  if (/failed to fetch|networkerror|load failed|network|conex[aã]o/i.test(texto)) {
    return {
      mensagem: "Não foi possível falar com a Sinalys. Confira sua conexão e tente de novo.",
      podeTentarDeNovo: true,
    };
  }

  return {
    mensagem: "Não consegui responder agora. Tente de novo em alguns segundos.",
    podeTentarDeNovo: true,
  };
}
