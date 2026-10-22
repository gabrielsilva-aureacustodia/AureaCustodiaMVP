# `src/components/admin/logistica/` — envios e retiradas de todas as contas

`PainelLogistica.tsx` desenha `/admin/logistica` (plano do Admin, seção 3.6; frente C, C3). Sem
'use client': o filtro é um formulário GET (`next/form`) e as etiquetas são links.

`ExpedicaoDaRetirada.tsx` (22/10/2026) é a única peça interativa, um Client Component por retirada:
"Emitir etiqueta dos Correios", depois o código com "Imprimir etiqueta" e "Cancelar etiqueta"; sem o
contrato configurado, o campo do código postado no balcão. Chama as ações de
`src/server/actions/admin/logistica.ts` pelo `run()` do `AdminProvider`; esconder o botão não protege
nada — cada ação confere `logistica.expedir`.

- Envios: protocolo, cliente, moedas, etapa com o alerta de prazo, postagem e recebimento, o
  rastreio que o cliente vê e a etiqueta.
- Retiradas: moeda (com link para a ficha da moeda), situação, taxa com forma de pagamento e
  parcelas (B3), prazo D+30, histórico de etapas, rastreio e a etiqueta de expedição.
- Linha com prazo estourado ganha a faixa vermelha (`.adm-linha-alerta`) e a frase do alerta.

Os dados vêm de `src/server/admin/logistica.ts` (só `import type`); as frases e os prazos, de
`src/domain/admin/logistica.ts`.
