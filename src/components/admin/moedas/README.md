# `src/components/admin/moedas/` — a auditoria do acervo

As peças de `/admin/moedas` e `/admin/moedas/[codigo]` (plano do Admin, seção 3.5; frente C, C3).

| Arquivo | O que desenha | Cliente? |
|---|---|---|
| `FiltroDeMoedas.tsx` | Formulário GET: busca, tipo, situação, passou pela bancada, caixa | não |
| `TabelaDeMoedas.tsx` | Uma linha por moeda: recibo e hash curto, dono, caixa e posição, análise (peso, operador, vídeo), situação e valor estimado; `hashCurto()` | não |
| `VerificarCorrente.tsx` | O botão e o resultado das três conferências, com o índice da primeira divergência | sim |
| `BotaoVideo.tsx` | "Assistir ao vídeo": pede a URL de leitura ao servidor e abre o player | sim |

A situação (custodiada, em retirada, retirada) e o cruzamento recibo × análise vêm prontos de
`src/domain/admin/moedas.ts`; nada é calculado aqui.
