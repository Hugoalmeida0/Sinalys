import type { MetadataRoute } from "next";

/**
 * Instalação na tela de início.
 *
 * Em modo standalone o app abre sem a barra de URL do navegador — o que, além
 * de parecer aplicativo, devolve a altura que a barra do Safari ocupa e que já
 * foi a causa de overlays ficarem fora da área visível.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sinalys — inteligência de risco de clientes",
    short_name: "Sinalys",
    description: "Antecipe riscos. Preserve conquistas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#f6f8fc",
    theme_color: "#0a2d6b",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
