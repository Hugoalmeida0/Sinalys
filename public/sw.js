/*
 * Service worker mínimo.
 *
 * Existe por um motivo só: o Chrome exige um service worker registrado e com
 * ouvinte de `fetch` para considerar o site instalável e disparar o evento
 * `beforeinstallprompt` — o que habilita a instalação em um toque. Sem ele o
 * manifest sozinho não basta, e o botão de instalar nunca aparece.
 *
 * De propósito ele NÃO guarda nada em cache. Um service worker que serve
 * conteúdo antigo é a forma mais fácil de deixar alguém preso numa versão
 * quebrada do app, e aqui o ganho de offline não compensa esse risco. O
 * ouvinte de fetch não chama `respondWith`, então toda requisição segue o
 * caminho normal da rede.
 *
 * Se um dia o app for realmente funcionar offline, é aqui que a estratégia de
 * cache entra — com versionamento explícito e limpeza no `activate`.
 */

self.addEventListener("install", () => {
  // Assume o controle sem esperar as abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      // Remove qualquer cache deixado por versões anteriores deste arquivo.
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", () => {
  // Sem `respondWith`: o navegador resolve a requisição normalmente.
});
