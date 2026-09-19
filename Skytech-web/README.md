# Skytech Web

React + TypeScript (Vite) + Tailwind CSS + CSS puro.

## Stack

- **React 19** + **Vite** — build e dev server
- **TypeScript** — tipagem
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — utilitários, estilização padrão
- **CSS puro** (`src/styles/`) — apenas para o que o Tailwind não cobre (reset, `@font-face`, animações complexas)
- **react-router-dom** — rotas

## Estrutura

```
src/
  assets/       imagens, fontes, ícones estáticos
  components/   componentes reutilizáveis (usados em 2+ páginas)
  pages/        uma página por rota (componente exportado com o mesmo nome do arquivo)
  styles/       CSS puro global (global.css importado uma vez em main.tsx)
  App.tsx       shell da aplicação (providers, layout raiz)
  AppRoutes.tsx única lista de rotas
  main.tsx      entrypoint
```

## Regras (para manter a arquitetura simples e previsível)

1. **Sem camadas extras.** Nada de `features/`, `modules/`, `hooks/`, `store/`, `services/`, `utils/` até que exista uma necessidade real — crie a pasta só quando o segundo caso de uso aparecer.
2. **Página = rota.** Cada arquivo em `pages/` corresponde a uma entrada em `AppRoutes.tsx`. Página não importa outra página.
3. **Componente em `components/` só se for reutilizado.** Componente usado em uma página só fica dentro da própria página (ou em `pages/NomeDaPagina/` se crescer).
4. **Estilo é Tailwind por padrão.** Só usar `styles/*.css` para o que Tailwind não resolve (reset, keyframes, font-face). Não criar um `.css` por componente.
5. **Um único ponto de rotas.** Todas as rotas vivem em `AppRoutes.tsx`, nunca espalhadas.
6. **Sem gerenciador de estado global por padrão.** `useState`/`useContext` do próprio React até que a necessidade justifique outra coisa — e aí é decisão explícita, não suposição.

## Scripts

```bash
npm run dev       # dev server
npm run build     # build de produção (tsc + vite build)
npm run preview   # preview do build
npm run lint      # oxlint
```
