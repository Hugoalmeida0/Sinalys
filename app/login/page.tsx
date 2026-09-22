"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EyeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { ConviteInstalacao } from "@/components/pwa/ConviteInstalacao";
import { BotaoEmBreve } from "@/components/ui/BotaoEmBreve";
import { GlobalsysWordmark } from "@/components/ui/GlobalsysWordmark";
import { marcarRecalculoAoEntrar } from "@/components/dashboard/RecalculoFilaGate";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErro(null);
    setLoading(true);

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), senha: form.get("senha") }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível entrar. Tente novamente.");
        setLoading(false);
        return;
      }

      marcarRecalculoAoEntrar();
      router.push("/");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Verifique sua internet e tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-navy">
      <Image
        src="/imagem_fundo_login.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/75 via-brand-navy/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-6 sm:p-10">
          <GlobalsysWordmark className="text-xl sm:text-2xl" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-6 sm:px-10 lg:flex-row lg:items-center lg:justify-center lg:gap-70 lg:px-20">
          <div className="hidden max-w-md flex-col gap-6 lg:flex">
            <Image
              src="/sinalys-logo-horizontal-white.png"
              alt="Sinalys"
              width={1154}
              height={424}
              className="h-auto w-52"
            />
            <div>
              <h1 className="text-4xl leading-tight font-bold text-brand-light">
                Antecipe riscos.
                <br />
                Preserve conquistas.
              </h1>
              <p className="mt-4 max-w-sm text-base text-puro/85">
                Inteligência de dados para manter seus clientes mais perto.
              </p>
            </div>
          </div>

          <Image
            src="/sinalys-logo-horizontal-white.png"
            alt="Sinalys"
            width={1154}
            height={424}
            className="h-auto w-36 lg:hidden"
          />

          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-slate-500">Acesse sua conta para continuar</p>
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">E-mail</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  defaultValue="ana.souza@globalsys.com"
                  placeholder="seuemail@globalsys.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-royal focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">Senha</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="senha"
                    autoComplete="current-password"
                    required
                    defaultValue="sinalys123"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pr-10 pl-3 text-sm text-slate-800 focus:border-brand-royal focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-brand-royal focus:ring-brand-royal"
                  />
                  Lembrar de mim
                </label>
                <BotaoEmBreve
                  recurso="Recuperação de senha"
                  className="font-medium text-brand-royal hover:underline"
                >
                  Esqueceu a senha?
                </BotaoEmBreve>
              </div>

              {erro && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600"
                >
                  {erro}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full py-2.5">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-400">
              Sinalys é um produto{" "}
              <span className="font-semibold text-slate-500">Globalsys</span>
            </p>
          </div>

          <div className="w-full max-w-sm">
            <ConviteInstalacao />
          </div>
        </div>

        <div className="hidden items-end justify-between p-10 lg:flex">
          <div>
            <GlobalsysWordmark className="text-base" />
            <p className="mt-1 text-sm text-puro/70">
              Conectando tecnologia
              <br />a resultados reais.
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-brand-light">Clientes hoje.</p>
            <p className="font-semibold text-puro">Conquistas amanhã.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
