# `src/components/admin/inicio/` — o painel inicial

| Arquivo | O que faz |
|---|---|
| `PainelInicial.tsx` | Uma home, três composições pela variante do papel: `gestao` (resultados do mês primeiro), `operacional` (o que espera a bancada e a logística), `desenvolvimento` (saúde do painel e últimas ações). Mais os atalhos para as áreas que o papel alcança |

A variante organiza, não concede: cada seção só existe se a página a carregou, e a página
(`src/app/(admin)/admin/page.tsx`) só carrega o que a permissão alcança
(`carregarPainelInicial`, em `src/server/admin/resultados.ts`). Sem 'use client'.
