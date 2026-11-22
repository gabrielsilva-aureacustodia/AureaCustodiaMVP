# Ficha da frente I — Recibo: número da moeda

```
ID / branch:   I · manut-numero-da-moeda          Onda de merge: 1          Migration reservada: —
Item do Rogério: 12           Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: o recibo do cliente (tela, folha e PDF) mostra o número da moeda, sem alterar o hash.
```

## Pedido do Rogério (as palavras dele)
"Mostrar o número da moeda no recibo do cliente (WhatsApp de sábado 7/11)."

## Aceite
- [ ] **T1 — o que é "o número da moeda":** a moeda tem `Coin.id` (`RO-000042`, código sequencial global) e o recibo tem `recibo.codigo` (`REC-000042`). Confirme com evidência (tela do recibo hoje, `renumerar-acervo.cjs` e o README de recibos) se o Rogério quer o `RO-…` ou outra numeração do acervo; anote a decisão no MD. **Padrão:** mostrar "Moeda nº RO-000042".
- [ ] O número aparece **na tela** (`ReciboCard`, `Certificate`), **na folha** (`FolhaDoRecibo`) e **no PDF** (`recibo-pdf.ts`), em lugar de destaque, ao lado do código do recibo.
- [ ] **Hash inalterado:** a fórmula e os campos do hash **não mudam** (o número só é **exibido**). Teste que compara o hash antes e depois.
- [ ] PDF com acentos e quebra de linha corretos; mobile de 320 a 430 px; claro e escuro.
- [ ] Testes de texto/snapshot do recibo e do PDF; `npm run typecheck` e `npm test` ao fim.

## Ler (e só isto)
`src/components/recibo/Certificate.tsx`, `FolhaDoRecibo.tsx`, `ReciboCard.tsx` · `src/lib/pdf/recibo-pdf.ts` · `src/app/(app)/recibos/**` · `src/domain/types.ts` (`Coin`, `Recibo`) · `src/domain/hash.ts` (**só ler** para **não** mudar) · `renumerar-acervo.cjs` (**só ler**; script de produção, **não executar**).

## Touch
`src/components/recibo/**` · `src/lib/pdf/recibo-pdf.ts` · `src/app/(app)/recibos/**` · testes novos.

## Do not touch
`src/domain/hash.ts` e a fórmula do hash · `types.ts` · QR (o recibo **não** tem QR desde 20/09/2026) · qualquer script `.cjs` da raiz.

## Fora de escopo
Redesenhar o recibo, QR, blockchain, mudar a numeração das moedas.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Confirmar qual é o número e onde ele aparece hoje | decisão anotada |
| T2 | Tela e folha mostram o número | navegador local |
| T3 | PDF mostra o número | PDF gerado conferido |
| T4 | Teste do hash intacto + suíte | verde |

## Específico
Não.

## Superfície protegida
Nenhuma esperada.
