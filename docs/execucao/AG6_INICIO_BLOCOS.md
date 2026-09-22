# AG6 — Dois blocos novos na página inicial

Branch: `exec/ag6-inicio-blocos`. Independente das outras. É a menor de todas.

## O que fazer

Em `src/app/(app)/inicio/page.tsx`, acrescentar dois blocos aos que já existem,
no mesmo padrão visual dos atuais:

1. **Depositar em conta** — abre a **mesma modal** que o atalho de depósito de
   Minha Conta abre: `ModalDeposito` de
   `src/components/account/AccountModals.tsx`, pelo `useModal()`. Não duplicar a
   modal nem escrever uma tela nova: é o mesmo componente, com a mesma trava de
   cadastro incompleto e o mesmo fluxo de pagamento.

2. **Mercado** — navega para a página `/mercado`, que desde 21/09/2026 é a
   segunda do menu e reúne as ofertas de venda e de compra e os gráficos.

## Ordem de leitura

1. `CLAUDE.md`
2. `src/app/(app)/inicio/page.tsx` — os blocos que já existem são o molde
3. `src/components/account/AccountModals.tsx` — `ModalDeposito`
4. `src/components/ui/Modal.tsx` — `useModal()`
5. `src/app/(app)/conta/page.tsx` — como o atalho de depósito chama a modal lá

## Cuidados

- A página inicial é Client Component; `useModal()` só funciona dentro do
  provider do layout. Confira antes de montar.
- Alvo mínimo de toque no celular: 44px.
- CSS global por área, com os nomes de classe do monolito. Nada de CSS Modules.
- Se outra branch estiver mexendo na modal de depósito (AG10 volta o depósito
  para o Mercado Pago), **não** mexa nela aqui: esta branch só a chama.

## Fechamento

Sem commit. Rode typecheck, lint, teste e build **uma vez, no fim**, só para
confirmar que a branch está de pé, e **avise que terminou**. O merge e o commit
são feitos depois, por um agente só, com todas as branches juntas.
