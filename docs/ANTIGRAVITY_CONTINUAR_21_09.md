# AntiGravity — continuar as tarefas de 21/09/2026

Branch de origem: `main` em `d432fff`. As alterações abaixo já estão **escritas no
working tree**, com `npm run typecheck` passando, mas **sem build, sem suíte e sem commit**.

## O que já foi feito (não refazer)

| Tarefa | Arquivos |
|---|---|
| Concordância nos Termos (`Conto`/`Plataformo` → `Conta`/`Plataforma`, `obrigada`→`obrigado`, `Controladora`→`Controlador`, cláusula 16.5 de Força Maior sem verbo) | `src/domain/documentos-legais/termos-de-uso-v1.ts`, `clausula-arbitragem-v1.ts` |
| Depósito por Pix direto (chave `76df3c5c-6137-43d0-b922-2fb2c3a04284`, taxa somada de R$ 5,00, sem gateway, sem crédito automático) | `src/domain/deposito-pix.ts`, `src/server/actions/payments.ts` (`solicitarDepositoPix`), `src/server/payments/tipos.ts`, `src/components/account/AccountModals.tsx` |
| Termos + Tabela de Taxas + Privacidade na página Minha Conta | `src/app/(app)/conta/page.tsx` |
| Cores distintas BTC/ETH/USDT e emblema oficial no lugar da sigla "RO" | `src/app/(app)/graficos/page.tsx`, `graficos/comparacoes/page.tsx` |
| Plano mensal (R$ 3,00/moeda/mês) ao lado do anual | `src/domain/fees.ts`, `types.ts`, `plano-custodia.ts`, `src/app/(app)/envios/page.tsx` |
| Custódia proporcional na venda: plano do vendedor encerrado, plano `origem: 'transferencia'` criado para o comprador com os meses restantes | `src/domain/custodia-transferencia.ts` (novo), `src/domain/market.ts` (`transferirMoedaVendida`), `src/server/actions/market.ts`, `sell.ts`, `src/server/payments/conciliacao.ts` |
| Três opções para o comprador (meses restantes / 12 meses novos / mensal) | `escolherPlanoDaTransferencia` em `src/server/actions/plano-custodia.ts`, `src/components/custody/FaturasCustodia.tsx` |
| Persistência dos campos novos | `migrations/032_custodia_transferida.sql` (novo), `repositories/planos.ts`, `db/diff.ts` |
| Tabela de Taxas 2.1 (1.1 mensal, 1.2 anual, 1.3 transferência, 1.4 frete, 4.1 depósito com taxa) | `tabela-de-taxas-v1.ts`, `src/domain/admin/documentos.ts` |

## O que falta — nesta ordem

### 1. Recalcular os hashes congelados dos documentos legais

Os três documentos subiram para a versão `2.1` e o texto mudou, então o hash mudou.
O hash antigo (`97521d13fc2052d531df8de3c10edd4d4df61d86fb1effcee5806ee626bd11b2`)
aparece em três arquivos:

- `src/domain/documentos-legais/canonico.test.ts` (linhas 69 e 71) — e a mesma
  suíte espera `versao: '2.0'`, que agora é `'2.1'`
- `src/domain/admin/documentos.test.ts` (linha 65)
- `src/server/db/db.test.ts` (linha 1034)

O valor novo sai de `DOCUMENTOS_VIGENTES.termos_de_uso.hash`
(`src/domain/documentos-legais/index.ts`). Não recalcular à mão: rodar a suíte
uma vez e ler o valor recebido é suficiente.

### 2. Ajustar a suíte ao comportamento novo

Consertar cada teste **ao comportamento novo**, nunca silenciar. Os quatro pontos
que mudaram e quebram fixtures:

1. `custodiaMensalPorMoeda` passou de `200` para `300`.
2. `ModalidadePlanoCustodia` voltou a ser `'mensal' | 'anual'`.
3. `valorDoPlano()` passou a devolver também `meses` e aceita um 4º parâmetro
   `mesesForcados`.
4. Os quatro caminhos de venda chamam `transferirMoedaVendida(state, seller,
   buyer, sellerEmail, buyerEmail, coinId, taxas)` no lugar de `transferCoin`.
   `transferCoin` continua existindo para movimentação que não é venda.

Vale a pena cobrir com teste novo: venda no 2º mês de um anual deve gerar plano
de 11 meses / R$ 22,00 em 11x para o comprador, e encerrar o plano do vendedor.

### 3. Rodar a migration 032 no Postgres

`032_custodia_transferida.sql` adiciona `meses_contratados`, `origem` e
`plano_origem_id` em `aurea.planos_custodia`, e abre o CHECK de
`faturas_custodia.origem` para `'transferencia'`. Sem ela a primeira venda de
moeda em custódia falha com erro de constraint no meio da compra.

### 4. Fechar o bloco

`npm run typecheck`, `npm run lint`, `npm test` e `npm run build` — **uma vez
cada**, no fim. Depois commit e push. Não rodar teste entre as etapas acima.

### 5. Atualizar o `CLAUDE.md`

A seção "Regras de negócio" ainda diz que os planos são "anual, R$ 24,00" e "de
24 meses, R$ 36,00", e que o ciclo mensal é de R$ 2,00. O vigente é: plano mensal
R$ 3,00/moeda/mês, plano anual R$ 24,00/moeda pelos 12 meses, ciclo pelo mesmo
preço do mensal, e a custódia acompanha a moeda vendida.

### 6. Plano de execução do cancelamento no Mercado Pago (tarefa que o Gabriel separou)

Escrever `docs/PLANO_CANCELAMENTO_COBRANCA_MERCADOPAGO.md` — é **plano, não
implementação**. O que já está resolvido dentro do sistema: ao vender, o plano do
vendedor é encerrado e as faturas pendentes dele são canceladas
(`transferirCustodiaDaMoeda`). O que falta é parar a cobrança recorrente que já
esteja no gateway:

- `PlanoCustodia.assinaturaId` existe no modelo e nunca foi preenchido — hoje o
  cartão é cobrado à vista via Checkout Pro (`iniciarCartaoFatura`), parcelado em
  até 12x, e não há assinatura a cancelar. O plano precisa decidir se a custódia
  passa a usar **Preapproval** (assinatura) ou continua em parcelamento à vista.
- Se for Preapproval: a API a integrar é `PUT /preapproval/{id}` com
  `status: "cancelled"`, e o lugar de chamar é dentro de
  `transferirCustodiaDaMoeda`, quando o plano do vendedor é encerrado.
- Se continuar parcelado à vista: **não há o que cancelar** — as parcelas já
  foram cobradas do cartão do vendedor no ato, e o acerto com ele é estorno
  (`POST /v1/payments/{id}/refunds`), não cancelamento. O plano tem de dizer
  qual das duas coisas a empresa quer.
- Credenciais e ambiente: `src/lib/payments/`, `isMercadoPagoSandbox()`.

## Regras da casa

- Terminal do Gabriel é PowerShell: um comando por linha, sem `&&`, sem `cd`.
- Comentário em português explicando o *porquê*, no padrão do repositório.
- Nada de trava nova, gate de ambiente ou exigência de aceite.
- Marca na interface é **Real Olímpico** (masculino); razão social **AUREA
  CUSTODIA LTDA** onde há CNPJ, contrato ou objeto postal.
- Atalho assumido entra em `RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta, no
  mesmo commit.
