import { Imagem as Image } from "@/components/ui/Imagem";

export type VarianteMascote =
  | "padrao"
  | "flutuando"
  | "insight"
  | "alerta"
  | "analisando"
  | "emblema";

const artes: Record<VarianteMascote, { src: string; w: number; h: number; alt: string }> = {
  padrao: { src: "/mascote-padrao.png", w: 500, h: 640, alt: "Mascote da Sinalys" },
  flutuando: {
    src: "/mascote-flutuando.png",
    w: 445,
    h: 640,
    alt: "Mascote da Sinalys flutuando",
  },
  insight: {
    src: "/mascote-insight.png",
    w: 496,
    h: 640,
    alt: "Mascote da Sinalys comemorando um insight",
  },
  alerta: {
    src: "/mascote-alerta.png",
    w: 499,
    h: 640,
    alt: "Mascote da Sinalys sinalizando um alerta",
  },
  analisando: {
    src: "/mascote-analisando.png",
    w: 588,
    h: 640,
    alt: "Mascote da Sinalys analisando dados",
  },
  emblema: { src: "/mascote-emblema.png", w: 640, h: 628, alt: "Sinalys" },
};

export function SinalysMascot({
  variante = "padrao",
  className = "",
  priority = false,

  decorativo = true,
}: {
  variante?: VarianteMascote;
  className?: string;
  priority?: boolean;
  decorativo?: boolean;
}) {
  const arte = artes[variante];

  return (
    <Image
      src={arte.src}
      alt={decorativo ? "" : arte.alt}
      aria-hidden={decorativo || undefined}
      width={arte.w}
      height={arte.h}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
