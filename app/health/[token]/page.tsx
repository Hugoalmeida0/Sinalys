import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { buscarHealthPublico, DESTAQUE_PADRAO } from "@/lib/painel/health-publico";
import { resolverBaseUrlAbsoluta } from "@/lib/config/base-url";
import { SinalysMascot } from "@/components/ui/SinalysMascot";
import { AgendarCall } from "@/components/health/AgendarCall";
import {
  CheckIcon,
  ClockIcon,
  PlusCircleIcon,
  TargetIcon,
  type IconProps,
} from "@/components/icons";
import type { ComponentType } from "react";

export const runtime = "nodejs";

/**
 * QR code apontando pra esta mesma página, gerado como SVG (sem chamada a
 * API externa — offline, grátis, sem rate limit). Pensado para o CS abrir a
 * página em uma call e o cliente escanear com o celular em vez de digitar o
 * link — por isso o QR sempre codifica a URL absoluta correta do ambiente
 * (domínio da Vercel, ou o IP de LAN em dev local — ver lib/config/base-url.ts).
 */
async function gerarQrCodeSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#0B2545", light: "#ffffff" },
  });
}

/** Ícone + cor por posição — a ordem dos benefícios é fixa em `lib/painel/health-config.ts`. */
const ESTILO_BENEFICIO: { icone: ComponentType<IconProps>; bg: string; icone_cor: string; anel: string }[] = [
  { icone: ClockIcon, bg: "bg-emerald-50", icone_cor: "text-emerald-600", anel: "ring-emerald-100" },
  { icone: TargetIcon, bg: "bg-brand-pale", icone_cor: "text-brand-royal", anel: "ring-brand-royal/10" },
  { icone: PlusCircleIcon, bg: "bg-amber-50", icone_cor: "text-amber-600", anel: "ring-amber-100" },
];

export default async function HealthScorePublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const health = await buscarHealthPublico(token);
  if (!health) notFound();

  const destaques = health.destaques.length > 0 ? health.destaques : [DESTAQUE_PADRAO];

  const baseUrl = resolverBaseUrlAbsoluta(await headers());
  const urlPagina = `${baseUrl}/health/${token}`;
  const qrCodeSvg = await gerarQrCodeSvg(urlPagina);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero em tela cheia */}
      <div className="relative overflow-hidden bg-brand-navy">
        <Image
          src="/imagem_fundo_login.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/90 via-brand-navy/70 to-brand-royal/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-transparent" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-14 sm:py-20 lg:flex-row lg:justify-between lg:gap-12 lg:py-24">
          <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
            <Image
              src="/sinalys-logo-horizontal-white.png"
              alt="Sinalys"
              width={1154}
              height={424}
              className="h-auto w-32 sm:w-40"
            />
            <p className="mt-6 text-sm font-semibold tracking-wide text-brand-light uppercase">
              Resumo da parceria · {health.nome}
            </p>
            <h1 className="mt-3 text-3xl leading-tight font-bold text-white sm:text-4xl lg:text-5xl">
              Obrigado por caminhar com a gente
              {health.clienteDesdeTexto ? ` há ${health.clienteDesdeTexto}` : ""}.
            </h1>
            <p className="mt-4 max-w-md text-base text-white/80">
              Preparamos um resumo rápido do que está indo bem na sua conta e dos benefícios do seu
              plano.
            </p>
          </div>

          <SinalysMascot
            variante="insight"
            className="h-56 w-auto drop-shadow-2xl sm:h-72 lg:h-80"
            priority
          />
        </div>
      </div>

      {/* QR code — sobreposto à base do hero, pra ficar visível em call sem rolar a página */}
      <div className="relative z-10 mx-auto -mt-10 flex max-w-6xl justify-center px-6 sm:-mt-12 sm:justify-end">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200/80 sm:p-5">
          <div
            className="h-24 w-24 shrink-0 sm:h-28 sm:w-28 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
          />
          <div className="max-w-[10rem]">
            <p className="text-sm font-bold text-brand-ink">Está em uma call?</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Aponte a câmera do celular para abrir esta página diretamente.
            </p>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-6 pb-12 sm:py-16">
        {/* Destaques */}
        <section>
          <h2 className="mb-4 text-center text-xl font-bold text-brand-ink lg:text-left">
            O que está funcionando bem
          </h2>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            {destaques.map((destaque) => (
              <span
                key={destaque}
                className="flex items-center gap-2 rounded-full bg-emerald-50 py-2.5 pr-5 pl-3 text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {destaque}
              </span>
            ))}
          </div>
        </section>

        {/* Benefícios */}
        <section>
          <h2 className="mb-4 text-center text-xl font-bold text-brand-ink lg:text-left">
            Benefícios exclusivos do seu plano
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {health.beneficios.map((beneficio, i) => {
              const estilo = ESTILO_BENEFICIO[i % ESTILO_BENEFICIO.length];
              const Icone = estilo.icone;
              return (
                <div
                  key={beneficio}
                  className={`flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-card ring-1 ${estilo.anel} transition-transform hover:-translate-y-1`}
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${estilo.bg} ${estilo.icone_cor}`}
                  >
                    <Icone className="h-7 w-7" />
                  </span>
                  <p className="text-sm leading-relaxed font-semibold text-brand-ink">{beneficio}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA + agendamento */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-royal to-brand-navy px-6 py-10 text-center shadow-xl sm:px-10">
          <h2 className="text-2xl font-bold text-white">
            Vamos conversar sobre os próximos passos da sua conta?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/85">
            Seu time de sucesso preparou algumas recomendações personalizadas para você. Marque
            uma call de alinhamento no horário que for melhor para o seu time.
          </p>
          <div className="mt-6 flex justify-center">
            <AgendarCall token={token} linkAgendamento={health.linkAgendamento} />
          </div>
        </section>
      </div>

      <p className="pb-10 text-center text-xs text-slate-400">
        Página gerada automaticamente pela Sinalys.
      </p>
    </main>
  );
}
