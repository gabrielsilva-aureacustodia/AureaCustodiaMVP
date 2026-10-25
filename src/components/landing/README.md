# `src/components/landing/` — landing e casco das páginas públicas

Componentes de marcação (sem `'use client'`, salvo `FeeSimulator` e `ScrollRevealInit`) da página inicial e do
cabeçalho/rodapé que landing, documentos e Academy compartilham (`PublicHeader`, `PublicFooter`). Usam só os dois
logos de `/public/brand/`, não importam módulos de servidor e não digitam número: taxas chegam da tabela vigente via
`src/app/page.tsx`, preços do livro de ofertas, tiragem e peso do catálogo. Ativos da Frente 2 em `visuais.ts`.
Decisões e inventário em `docs/polimento/landing/`.
