# Tutorial guiado do cliente

Três recursos, um maestro:

| Arquivo | Papel |
|---|---|
| `TutorialProvider.tsx` | Decide o que mostrar e quando; guarda o que a conta já viu (localStorage); expõe o exemplo de custódia do tour (`useTutorial().exemplo`). Montado em `src/app/(app)/layout.tsx`. |
| `TourGuiado.tsx` | Tour da primeira visita: tela escurecida e borrada, foco no elemento, balão com Voltar / Pular esta etapa / Pular tudo. |
| `DicasDaPagina.tsx` | Dicas por página e tutoriais contextuais, **sem escurecer**: bolinhas numeradas + painel com "Fechar tutorial". |
| `dom.ts` | Achar o elemento de uma âncora, medir, rolar, e ler/gravar o localStorage (sempre em try/catch). |

O **conteúdo** (textos, passos, âncoras, chaves) mora em `src/domain/tutorial.ts` e é testado em
`src/domain/tutorial.test.ts`. Texto para cliente: sem jargão técnico e sem as palavras
proibidas pelo jurídico (ver `terminologia`); todo valor em reais sai da Tabela de Taxas e todo
prazo de `custody.ts`.

As telas **não conhecem o tutorial**: as âncoras são seletor + texto (`Alvo`), então uma tela que
muda o texto só perde a dica, nunca quebra. As únicas telas que leem o contexto são
`AvisoDebitoCustodia` e `ResumoDaCustodia`, para desenhar a fatura de exemplo do tour.
