import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // O manifest e o service worker precisam ficar de fora: o navegador busca
  // os dois sem sessão e, caindo no redirecionamento para /login, recebe HTML
  // no lugar do arquivo — o que impede a instalação do app na tela de início.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw\.js|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
