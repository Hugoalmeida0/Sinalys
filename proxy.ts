import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // `webmanifest` precisa ficar de fora: o navegador busca o manifest sem
  // sessão, e caindo no redirecionamento para /login ele recebe HTML em vez
  // de JSON — o que impede a instalação do app na tela de início.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
