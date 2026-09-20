import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
