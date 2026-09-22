import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /*
     * Cache de navegação no cliente. As telas internas são dinâmicas, e o padrão
     * do Next 16 para elas é 0 s: cada toque na barra inferior refazia a página
     * no servidor e mostrava o esqueleto, mesmo voltando a uma tela vista
     * segundos antes. Com 15 min, a volta é instantânea.
     *
     * Toda gravação precisa chamar `router.refresh()`, que limpa este cache;
     * sem isso, a tela seguiria mostrando o dado anterior até expirar.
     */
    staleTimes: {
      dynamic: 900,
      static: 900,
    },
  },
};

export default nextConfig;
