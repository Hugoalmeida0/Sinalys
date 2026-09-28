/**
 * Cliente HTTP da API Python.
 *
 * As chamadas usam caminhos relativos (`/api/...`): em desenvolvimento o Vite
 * encaminha para o backend (ver vite.config.ts), então a sessão viaja em
 * cookie httpOnly de primeira parte e o navegador nunca vê o token.
 */

const EVENTO_SESSAO_EXPIRADA = "sinalys:sessao-expirada";

export async function apiFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const resposta = await fetch(caminho, { credentials: "include", ...init });
  if (resposta.status === 401 && !caminho.startsWith("/api/auth/")) {
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  }
  return resposta;
}

export function aoExpirarSessao(callback: () => void): () => void {
  window.addEventListener(EVENTO_SESSAO_EXPIRADA, callback);
  return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, callback);
}

export class ErroHttp extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

/** GET que devolve o JSON ou lança `ErroHttp` com a mensagem `erro` da API. */
export async function apiJson<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await apiFetch(caminho, init);
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroHttp(corpo?.erro ?? `Erro inesperado (HTTP ${resposta.status}).`, resposta.status);
  }
  return corpo as T;
}
