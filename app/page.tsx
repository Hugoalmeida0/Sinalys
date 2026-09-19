import Image from "next/image";

export default function Home() {
  return (
    <main className="bg-brand-pale flex min-h-screen flex-1 flex-col items-center justify-center gap-4">
      <Image
        src="/sinalys-logo-horizontal-color.png"
        alt="Sinalys"
        width={1154}
        height={424}
        className="h-auto w-64"
        priority
      />
      <p className="text-brand-royal text-sm font-medium tracking-wide uppercase">
        Transformando sinais em ação.
      </p>
    </main>
  );
}
