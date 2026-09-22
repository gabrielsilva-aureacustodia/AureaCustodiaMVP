# AG10 — Depósito volta para a integração do Mercado Pago

Branch: `exec/ag10-deposito-mercadopago`. Independente das outras.

## O que fazer

Voltar o depósito em conta para **como era antes de 21/09/2026**: cobrança
aberta no Mercado Pago, dinheiro caindo na conta da empresa lá, e o sistema
reconhecendo o pagamento e creditando o saldo do cliente.

O Pix direto para a chave da empresa não funcionou como o Gabriel esperava.
**Não é para analisar, comparar ou recomendar nada** — é para voltar.

## O caminho é curto porque nada foi apagado

`iniciarDeposito(valorCents, metodo)` continua **inteira e testada** em
`src/server/actions/payments.ts`. Ela foi apenas **congelada**: nenhuma tela a
chama. Abre cobrança Pix (`criarPixDeposito`) ou Checkout Pro
(`criarPreferenciaDeposito`), grava a intenção com `tipoOperacao: 'deposito'` e
devolve o que a tela precisa mostrar.

`PainelPagamento` (`src/components/pagamento/PainelPagamento.tsx`) também
continua inteiro — é ele que mostra o QR, o copia e cola, o botão de cartão e o
acompanhamento do status.

O que a modal de depósito faz hoje (`ModalDeposito` em
`src/components/account/AccountModals.tsx`) é chamar `solicitarDepositoPix`, que
só mostra a chave e **não credita nada**.

Então o trabalho é:

1. Religar `ModalDeposito` a `iniciarDeposito` pelo `PainelPagamento`, com Pix e
   cartão, como era.
2. Remover o que só existia para o Pix direto: `solicitarDepositoPix` em
   `src/server/actions/payments.ts`, `src/domain/deposito-pix.ts` e o tipo
   `DepositoPixDireto` em `src/server/payments/tipos.ts`.
3. Conferir a conciliação ponta a ponta: o webhook / a consulta de status
   reconhece o pagamento e credita o saldo pelo `externalReference`.

**Depósito continua sem taxa** (Tabela de Taxas, cláusula 4.1). A tarifa fixa de
R$ 5,00 é do saque.

## Ordem de leitura

1. `CLAUDE.md`
2. `src/server/actions/payments.ts` — `iniciarDeposito` inteira, e a nota que diz por que ela ficou congelada
3. `src/components/account/AccountModals.tsx` — `ModalDeposito`
4. `src/components/pagamento/PainelPagamento.tsx`
5. `src/lib/payments/` — `criarPixDeposito`, `criarPreferenciaDeposito`, `isMercadoPagoSandbox`
6. `src/server/payments/conciliacao.ts` e `repositorios.ts`
7. `git log` do commit que trocou o depósito por Pix direto — o diff é o roteiro da volta

## Cuidados

- **O saldo só sobe com pagamento confirmado pelo gateway.** Foi um
  `deposit()` que creditava sem cobrança que abriu o buraco de valor em
  setembro. Nenhum caminho de tela pode creditar.
- O vínculo entre cobrança e conta é o `externalReference` gerado pela
  plataforma, nunca o e-mail do pagador no Mercado Pago.
- O teto de depósito vem da configuração do painel (`depositoMaxCents`), e é
  conferido **no servidor**.
- Credencial nenhuma no repositório. Variável que já existe na Vercel não se
  pede de novo.
- Se `isMercadoPagoSandbox()` estiver ligado, a tela precisa dizer que a
  cobrança é de teste em vez de abrir aba nenhuma — o comportamento já existe.

## Fechamento

Sem commit. Rode typecheck, lint, teste e build **uma vez, no fim**, só para
confirmar que a branch está de pé, e **avise que terminou**. O merge e o commit
são feitos depois, por um agente só, com todas as branches juntas.
