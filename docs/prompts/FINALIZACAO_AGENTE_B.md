# Prompt — Agente B · Cobrança e custódia

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.
> Os três agentes (A, B e C) podem abrir no mesmo dia.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), como **Agente B** da rodada de finalizações de 13/09/2026.

**Sua missão:** o cliente paga custódia e retirada por saldo, Pix ou cartão, a cobrança mensal
e anual anda sozinha, e cada centavo aparece separado no financeiro — bruto, tarifa do Mercado
Pago e líquido.

Outros dois agentes trabalham ao mesmo tempo neste repositório — A (mercado e termos) e C
(painel Admin). Existe um contrato escrito de quem edita o quê, e ele não se negocia.

## Leia nesta ordem, antes de escrever qualquer linha

1. **`CLAUDE.md`** (raiz) — as regras do projeto
2. **`docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md`** — seções **0, 1, 2 e 3 inteiras**, e
   a **seção 5, que é a sua**
3. **`docs/publish_docs/PROTOCOLO_DO_AGENTE.md`** — as regras de sessão (a regra 5 será
   reescrita pelo Agente A; siga o plano)
4. **`docs/publish_docs/PLANO_PAGAMENTOS_E_CADASTRO.md`** — o que já foi ligado no Mercado Pago
   em 11/09, e por que o saldo só muda quando o webhook confirma
5. **`src/lib/payments/README.md`** e **`ATALHOS.md`**
6. **`RISCOS_ASSUMIDOS.md`** — em especial RA-14

**Este plano é a aprovação do Gabriel para tudo o que está escrito nele.** Não pare para pedir
aprovação de passo que está no plano. Pergunte só quando surgir decisão que o plano não cobre — e,
enquanto espera, siga com o que não depende dela.

Se algum desses documentos não estiver no seu worktree, leia da pasta principal
`C:\dev\AureaCustodiaMVP\`.

## Seu worktree e suas branches

Você trabalha numa pasta própria, para não trocar de branch debaixo dos outros agentes:

```bash
git -C C:/dev/AureaCustodiaMVP fetch origin
git -C C:/dev/AureaCustodiaMVP worktree add C:/dev/AureaCustodiaMVP-cobranca -b feat/b-cobranca-e-custodia origin/main
cd C:/dev/AureaCustodiaMVP-cobranca
npm install
git checkout -b feat/b1-cobranca-reutilizavel
```

O `.env.local` não existe no worktree: `scripts/env-local.mjs` já o encontra para os scripts de
banco, e para `npm run dev` você copia o arquivo da pasta principal (ele continua ignorado pelo
Git). Os testes não precisam dele.

## Seu território

Pagamentos (`src/lib/payments/`, `src/server/payments/`, `src/server/actions/payments.ts`,
`src/app/api/webhooks/mercadopago`, `src/components/pagamento/` e `pagamento.css`, a extração em
`src/components/account/AccountModals.tsx`) e custódia (`src/domain/custody.ts`,
`plano-custodia.ts`, `competencia.ts`, `retirada.ts`, `dre.ts`, `src/server/custodia/`,
`src/server/estacao/analise.ts`, `src/server/actions/custody.ts` e `plano-custodia.ts`,
`src/app/(app)/envios`, `src/components/custody/`, `src/app/(app)/conta/faturas`,
`src/components/recibo/ModalSolicitarRetirada.tsx`, `src/app/api/cron/faturamento`,
`vercel.json`).

A tabela completa está na seção 3.1 do plano. **Arquivo fora do seu território você não
edita** — escreve um item em `docs/finalizacoes/PENDENCIAS_AGENTE_B.md` pedindo que o dono edite.
Em particular: **`src/domain/fees.ts` é do Agente A** — você usa `TAXAS_PADRAO`,
`comissaoPorMoeda`, `custoDeCompraPorMoeda` e `liquidoDeVendaPorMoeda`, não as reescreve.

Em `src/domain/types.ts` você só acrescenta no fim, num bloco
`/* === Finalizações · Frente B === */`. Migrations: **017, 018 e 019**. Riscos assumidos:
**RA-30 a RA-39**.

## Suas três sub-branches, uma por vez

- **B1 — Cobrança reutilizável** (`feat/b1-cobranca-reutilizavel`, migration 017). Plano,
  seção 5, B1. **Comece por B1.0**: a credencial do Mercado Pago passa a seguir o `MP_SANDBOX`.
  Hoje a de teste vence mesmo em produção, e o Gabriel configura as credenciais amanhã — B1.0
  pode ir para a `main` sozinha, antes do resto. Depois: cobrança genérica com parcelas, leitura
  de tarifa, líquido e liberação, tabela `recebimentos_gateway`, `PainelPagamento`.
  **B1.4 (conciliação por tipo e compra direta com a comissão do comprador) só depois de
  `git merge origin/main` com A1 dentro.** Se A1 ainda não entrou, faça B1.5 e B1.6 antes.
- **B2 — Plano de custódia** (`feat/b2-plano-de-custodia`, migration 018). **Só com A1 na
  `main`.** Comece por B2.1, o defeito de contagem, num commit sozinho. Depois: plano mensal e
  anual, passo novo no envio com "Pagar depois", Minha conta › Faturas, emissão e recusa
  alimentando o plano, ciclo do dia 1º sem cobrar duas vezes, débito automático no cartão.
- **B3 — Retirada e financeiro** (`feat/b3-retirada-e-financeiro`, migration 019). Retirada em
  duas fases, sem exigir saldo; tarifa do Mercado Pago como despesa automática na DRE;
  custódia por competência, com o anual em 1/12 por mês; quatro relatórios novos.

## O ciclo de cada sub-branch

Ao terminar:

```bash
npm run typecheck
npm test
npm run build
git checkout feat/b-cobranca-e-custodia
git merge --no-ff feat/b1-cobranca-reutilizavel
git push origin feat/b-cobranca-e-custodia feat/b1-cobranca-reutilizavel
```

Escreva em `docs/finalizacoes/RELATORIO_AGENTE_B.md`: o que foi feito, os testes novos, o que
você clicou para conferir e o que apareceu, e a linha **"B1 pronta para main — merge <hash>"**.

**Você não faz merge na `main`.** Quem leva é o Gabriel. Antes de abrir a sub-branch seguinte:

```bash
git checkout feat/b-cobranca-e-custodia
git fetch origin
git merge origin/main
git checkout -b feat/b2-plano-de-custodia
```

## Três coisas que não podem sair erradas

**1. O livro-razão fecha sem `ajuste` em todo pagamento pelo gateway.** O padrão já existe na
compra direta: a entrada externa entra em `deposits` e o débito do serviço na mesma mutação.
Fatura, plano e retirada pagos por Pix ou cartão seguem o mesmo desenho, e cada um tem teste
PGlite provando que nenhum `ajuste` nasce.

**2. Nenhum mês é cobrado duas vezes, e nenhuma moeda sob guarda fica sem cobrança.** A régua é
`pagoAteCompetencia`. Os testes que provam: anual pago não gera ciclo por 12 meses; moeda
comprada no mercado é faturada para quem comprou; moeda com recibo extinto não é faturada.

**3. Antes de codar qualquer chamada nova ao Mercado Pago, abra a documentação vigente** — os
links estão no plano. Não deduza de memória nome de campo, tópico de notificação nem caminho de
menu de painel. O que foi conferido em 13/09 está escrito no plano; o que não foi, você confere.

## Regras que valem em cima de tudo

- **Nenhuma trava que o Gabriel não pediu.** O plano de custódia não bloqueia a postagem
  ("Pagar depois" sempre visível). A retirada não exige saldo. Saldo insuficiente não esconde
  Pix nem cartão.
- **O "split" é separação no financeiro** (decisão F-5). Nada de OAuth, conta de terceiro ou
  `marketplace_fee`.
- **Você não muda variável de ambiente, nem liga ou desliga produção.** Quem manda é o
  `MP_SANDBOX`, que o Gabriel configura. Se precisar de valor novo, peça em
  `PENDENCIAS_AGENTE_B.md` com o **nome e o valor literal e completo**.
- **Dinheiro em centavos inteiros.** Parcela, tarifa e líquido também.
- **Nada de `@/server/*` em Client Component.**
- **`recebimentos_gateway` é só `INSERT … ON CONFLICT DO NOTHING`.**
- **Regra contábil não é regra de imposto.** Competência e apropriação do anual entram; alíquota
  não entra em código.
- **Toda regra nova de dinheiro, prazo ou cobrança tem teste no mesmo commit.**
- **Palavras proibidas em texto do produto**: token, NFT, cripto, ativo digital, ativo,
  investimento, investidor, corretora, rentabilidade, retorno. O termo é **recibo**. Campo da API
  do Mercado Pago com esse nome é da API dele — no seu código, o nome é seu e é em português.
- **Não expanda o escopo, e não mexa em DNS, e-mail nem domínio.**
- **Bloqueou por permissão?** Pare e entregue o comando pronto para colar, num bloco de código,
  com o que ele faz em uma frase.
- **Atalho tomado entra em dois lugares no mesmo commit**: `RISCOS_ASSUMIDOS.md` e o
  `ATALHOS.md` da pasta.
- **Pasta nova ganha `README.md`** descrevendo os arquivos e as conexões com as outras pastas.
- **Comentários em português**, explicando o porquê.
