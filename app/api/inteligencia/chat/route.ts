import { NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterUsuarioSessao } from "@/lib/auth/usuario";
import { resolverModeloAtivoId, resolverProjetoId } from "@/lib/painel/projeto";
import { criarProvedorOpenRouter } from "@/lib/ia/provedor";
import { obterModeloChat } from "@/lib/ia/constantes";
import { criarFerramentasAssistente } from "@/lib/ia/chat/ferramentas";
import { montarPromptSistemaChat, type ContextoTelaChat } from "@/lib/ia/chat/prompt";

export const runtime = "nodejs";
// Vários passos de ferramenta + geração; ~6s medidos por turno, com folga.
export const maxDuration = 60;

/** Mensagens mais antigas que isto saem do contexto — o chat é um painel, não um histórico. */
const MAX_MENSAGENS_CONTEXTO = 20;
/** Passos = chamadas ao modelo por turno (cada uma conta na cota diária da OpenRouter). */
const MAX_PASSOS = 5;

/**
 * Assistente conversacional do painel (widget "Sinalys"). Streaming via AI SDK
 * (`useChat` no front), com ferramentas somente leitura sobre a carteira do
 * projeto do usuário logado.
 *
 * Corpo: { messages: UIMessage[], tela?: { caminho, clienteId } }
 */
export async function POST(request: Request) {
  const usuario = await obterUsuarioSessao();
  if (!usuario) {
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });
  }

  let corpo: { messages?: UIMessage[]; tela?: ContextoTelaChat };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }
  if (!Array.isArray(corpo.messages) || corpo.messages.length === 0) {
    return NextResponse.json({ erro: "Campo 'messages' é obrigatório." }, { status: 400 });
  }

  const supabase = criarClienteSupabaseAdmin();
  const projetoId = await resolverProjetoId();

  const [modeloId, { data: projeto }] = await Promise.all([
    resolverModeloAtivoId(supabase, projetoId),
    supabase.from("projetos").select("rotulo_entidade").eq("id", projetoId).maybeSingle(),
  ]);

  const openrouter = criarProvedorOpenRouter();
  const mensagens = corpo.messages.slice(-MAX_MENSAGENS_CONTEXTO);

  const resultado = streamText({
    model: openrouter.chat(obterModeloChat()),
    system: montarPromptSistemaChat({
      nomeUsuario: usuario.nome,
      rotuloEntidade: projeto?.rotulo_entidade ?? "Cliente",
      tela: corpo.tela,
    }),
    messages: await convertToModelMessages(mensagens),
    tools: criarFerramentasAssistente({ supabase, projetoId, modeloId }),
    stopWhen: stepCountIs(MAX_PASSOS),
    onError: ({ error }) => {
      console.error("[inteligencia/chat]", error);
    },
  });

  return resultado.toUIMessageStreamResponse({
    // Sem isto o front recebe só "An error occurred" e o analista não sabe se é cota, chave ou rede.
    onError: (erro) => {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      if (/quota|rate limit|429/i.test(mensagem)) {
        return "Limite diário de requisições da IA atingido. Tente novamente mais tarde.";
      }
      return `Não consegui responder agora: ${mensagem}`;
    },
  });
}
