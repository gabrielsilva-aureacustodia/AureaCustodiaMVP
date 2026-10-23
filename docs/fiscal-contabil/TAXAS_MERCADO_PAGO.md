# Mercado Pago × Real Olímpico — tarifas, APIs e o que o sistema registra

Pesquisa de 22/10/2026. Somente leitura: nenhum arquivo do repositório foi alterado. As páginas oficiais
foram lidas nesta data. Várias páginas de `mercadopago.com.br` recusam leitura automática (HTTP 403) e foram
abertas num navegador. Onde a página oficial não diz nada, o item está na seção (d).

> **Resumo em uma frase para o Rogério:** o Mercado Pago cobra um percentual de cada pagamento que recebemos.
> No Pix são 0,99% e no cartão, de 3,98% a 4,98%, conforme o prazo em que o dinheiro fica disponível. O
> sistema já guarda a taxa de cada pagamento avulso, lida do próprio Mercado Pago. Ficam de fora a
> **assinatura mensal do cartão** (renovações), os **saques**, os **estornos** e os **chargebacks**.

---

## (a) Como integramos hoje

### Produtos do Mercado Pago em uso

| Produto | Chamada | Onde | Para quê |
|---|---|---|---|
| **Pix pela Payments API** (Checkout Transparente/"Checkout API", modelo legado de pagamentos) | `POST /v1/payments` com `payment_method_id: 'pix'` e `X-Idempotency-Key` = referência externa | `src/lib/payments/cobranca.ts:31` (fetch em `:64`) | QR Code/Copia e Cola de todos os fluxos por Pix |
| **Checkout Pro** (preferência hospedada) | `POST /checkout/preferences` | `src/lib/payments/cobranca.ts:113` (fetch em `:170`) | "Cartão" de todos os fluxos. **Atenção:** `excluded_payment_types: []` (`:159`) não exclui nada. Na página do MP, o cliente também pode pagar com **boleto, Pix, saldo MP, Linha de Crédito e débito virtual Caixa**. `statement_descriptor: 'AUREA CUSTODIA'` (`:157`) |
| **Consulta de pagamento** | `GET /v1/payments/{id}` | `src/lib/payments/mercadopago.ts:113` (fetch em `:141`) | Fonte da verdade da conciliação: lê status, valor, `net_received_amount`, `total_paid_amount`, `installment_amount`, `money_release_date` |
| **Assinaturas (Preapproval, sem plano)** | `POST /preapproval`, `PUT /preapproval/{id}` (valor), `PUT /preapproval/{id}` `status: cancelled` | `src/lib/payments/mercadopago.ts:240`, `:296`, `:339` | Fatura de custódia paga no cartão vira débito mensal recorrente |
| **Payouts** (Pix para a chave do cliente) | `POST /v1/payouts` (Ed25519 em produção), `GET /v1/payouts/{id}/transactions` | `src/lib/payments/payouts-core.ts:104` (fetch `:126`), `:152` (`:160`) | Saque automático. **Desligado** até `MP_PAYOUTS_ATIVO="true"` e a chave privada estarem configurados (`src/lib/payments/payouts.ts`) |
| **Webhook** (`payment`) | `POST /api/webhooks/mercadopago`, assinatura HMAC `x-signature` | `src/app/api/webhooks/mercadopago/route.ts`; validação em `src/lib/payments/webhook.ts` | Dispara `conciliarPagamento` (`route.ts:102`). Avisos sem pagamento (assinatura, contestação) são só marcados como vistos (`route.ts:117`) |

**Não usamos:** Orders API (`/v1/orders`), Bricks, cartão tokenizado, reembolsos (`/v1/payments/{id}/refunds`),
contestações (`/v1/chargebacks`) nem relatórios (`/v1/account/release_report`, `/v1/account/settlement_report`).

**Parcelamento:** `payment_methods.installments` recebe `parcelasMax` (`cobranca.ts:160`). Hoje vale 1 em tudo,
exceto a **retirada segura (R$ 180,00), que aceita até 2x** (`src/server/actions/custody.ts:1211`). O sistema não
diz ao MP quem paga os juros. Isso depende da configuração de parcelamento da conta (seção d).

### Cada fluxo de dinheiro

| # | Fluxo | Meio | Arquivo:linha | Produto MP | Taxa gravada? |
|---|---|---|---|---|---|
| 1 | **Depósito em saldo** | Pix | `src/server/actions/payments.ts:72` (Pix `:118`) | Payments API Pix | Sim, em `recebimentos_gateway` (ver abaixo) |
| 1b | Depósito em saldo | "Cartão" | `payments.ts:133` → `criarPreferenciaDeposito` (`mercadopago.ts:61`, `parcelasMax: 1`) | Checkout Pro (qualquer meio) | Sim |
| 2 | **Compra direta** (preço + comissão + 1º mês de custódia) | Pix / Checkout Pro | `payments.ts:173` (Pix `:272`, CP `:294`) | idem | Sim |
| 3 | **Fatura de custódia** | Pix | `src/server/actions/plano-custodia.ts:279` (`:312`) | Payments API Pix | Sim |
| 4 | **Fatura de custódia no cartão = assinatura recorrente** | Cartão | `plano-custodia.ts:332` → `ativarDebitoAutomatico` (`:355`); conciliação `liquidarAssinaturaCustodia` (`src/server/payments/conciliacao.ts:318`); ajuste e cancelamento em `src/server/custodia/assinatura.ts:58,88`; cancelamento pelo cliente em `plano-custodia.ts:455` | Preapproval | **Só o 1º débito** (ver o defeito abaixo) |
| 5 | **Frete do envio** (Correios, preço de contrato) | Pix / Checkout Pro | `custody.ts:717` (Pix `:746`), `custody.ts:764` (CP `:792`) | idem | Sim |
| 6 | **Oferta de compra pré-paga** | Pix / Checkout Pro | `src/server/actions/reserva.ts:285` (Pix `:366`, CP `:378`) | idem | Sim |
| 6b | Reserva pós-paga (oculta na tela desde 28/09) | Pix / Checkout Pro | `reserva.ts:178` (`:236`, `:248`) | idem | Sim |
| 7 | **Retirada física** (taxa R$ 50,00 comum / R$ 180,00 segura) | Pix / Checkout Pro (até 2x na segura) | `custody.ts:1103` (`:1148`), `custody.ts:1185` (`:1234`) | idem | Sim |
| 8 | **Saque Pix automático** | Pix enviado | pedido em `src/server/actions/account.ts:580` (tarifa R$ 5,00 = `taxaSaqueFixa`); envio em `src/server/saques/pagamento.ts:56` → `criarPayoutPix` (`:112`) | Payouts | **Não.** Não lemos nem gravamos custo de envio |
| 9 | **Saque manual** pela equipe | Pix feito fora do sistema | `pagamento.ts:229` (`registrarPagamentoManual`), ações em `src/server/actions/admin/saques.ts:93` | nenhum (app do banco ou do MP) | Não |
| 10 | **Estorno / devolução** | — | Não há chamada à API de reembolso. Quando o pagamento não pode liquidar o que pagou, o valor vira **saldo interno** (`devolverComoSaldo`, ex. `conciliacao.ts:518-527`, `:658`). Saque recusado = estorno interno no ledger (`pagamento.ts:265`) | nenhum | Não |
| 11 | **Chargeback / contestação** | — | Não tratado. `conciliarPagamento` encerra quando o status não é `approved` (`conciliacao.ts:723`). Um pagamento que passa a `refunded` ou `charged_back` **não desfaz o crédito** já dado. O webhook ignora o tópico de contestações (`route.ts:117`) | nenhum | Não |

### O que gravamos sobre a taxa

- `consultarPagamentoMercadoPago` calcula **tarifa = `transaction_amount` − `transaction_details.net_received_amount`**
  (`mercadopago.ts:177-181`). Também lê `total_paid_amount`, `installments`, `installment_amount` e
  `money_release_date`. **Não lê `fee_details`, `charges_details`, `money_release_status` nem
  `transaction_amount_refunded`.**
- Depois de liquidar, grava uma linha idempotente em `aurea.recebimentos_gateway` (`conciliacao.ts:796`, migration
  `src/server/db/migrations/017_cobrancas_gateway.sql`) com: valor bruto, valor pago pelo cliente, tarifa,
  líquido, parcelas, método, aprovação, **liberação prevista** e competência.
- A DRE soma essa tarifa na linha **4.1.07 "Tarifas de gateway de pagamento"** (`src/domain/dre.ts:140`, `:371`).
  A tarifa aparece na ficha do usuário (`AbaFinanceiro.tsx:293`) e no relatório (`src/server/relatorios/dados.ts:657`).
- Assim, **nenhuma taxa do MP está fixa no código**. Isso já é o desenho certo. As falhas estão nas lacunas abaixo.

### Lacunas e defeitos encontrados (para decidir, não corrigidos)

1. **A renovação da assinatura de custódia não é conciliada.** A intenção `ASS-{planoId}` é criada uma vez
   (`plano-custodia.ts:351`). O primeiro pagamento a encerra. Nos meses seguintes, se o pagamento recorrente vier com
   a mesma `external_reference`, a reivindicação falha (`conciliacao.ts:745`). Se o valor mudou com
   `atualizarAssinaturaRecorrente`, ainda cai em "valor divergente" (`:738`). Nos dois casos **a fatura do mês não é
   baixada e a tarifa não entra em `recebimentos_gateway`**: o cartão do cliente é cobrado e o sistema não vê.
   Não há tratamento dos tópicos `subscription_authorized_payment` e `subscription_preapproval`. O
   `docs/PLANO_CANCELAMENTO_COBRANCA_MERCADOPAGO.md` está desatualizado: diz que `assinaturaId` "nunca foi
   preenchido", mas hoje é preenchido.
2. **Chargeback e reembolso feitos no painel do MP não desfazem nada no sistema.** Pelos Termos do MP (2.12.2),
   o valor contestado é debitado da conta da Áurea. O saldo interno do cliente continua creditado. Exemplo de risco:
   depósito no cartão → saque por Pix → chargeback.
3. **Checkout Pro aceita boleto.** `excluded_payment_types: []` deixa o boleto entrar, com tarifa de R$ 3,49
   (ver b) e compensação em até 3 dias úteis. Numa cobrança de frete ou de R$ 2,00, o boleto custa mais que o próprio
   valor. O mesmo vale para "saldo MP/Linha de Crédito" (4,99%).
4. **Depósito no cartão seguido de saque.** Os Termos de Uso proíbem usar o MP para atividade que possa ser vista
   como "antecipação de dinheiro, autofinanciamento" (lidos em 22/10/2026). Cartão → saldo → Pix para fora pode ser
   lido assim. Vale perguntar ao MP (seção d).
5. Achado lateral, não confirmado: frete, reserva e oferta pré-paga mandam `back_urls` **relativas** (`/envios`,
   `/compras`) com `auto_return: 'approved'` (`custody.ts:799`, `reserva.ts:255`, `:385` → `cobranca.ts:162-167`). O
   Checkout Pro costuma exigir URL absoluta quando há `auto_return`. Conferir em sandbox.

---

## (b) Tabela de taxas

### Fontes oficiais lidas em 22/10/2026

- **[O1] Checkout para loja virtual:** https://www.mercadopago.com.br/ferramentas-para-vender/check-out.
  Crédito: 4,98% na hora, 4,49% em 14 dias, 3,98% em 30 dias. Pix: 0,99% na hora. Boleto: **R$ 3,49** em até 3 dias.
  Saldo no MP: 4,99% na hora. Débito virtual Caixa: 3,99% na hora. A página diz: "A taxa dependerá do tempo que você
  escolher para ter o dinheiro das suas vendas liberado". As taxas e prazos ficam no app, em "Seu negócio > Custos >
  Checkouts" (caminho escrito na própria página). Antifraude: não há taxa separada no Pro
  (blog oficial: https://www.mercadopago.com.br/blog/checkout-pro-vs-transparente).
- **[O2] Link de pagamento:** https://www.mercadopago.com.br/ferramentas-para-vender/link-de-pagamento. Os números
  diferem um pouco de [O1]: crédito 4,98% / **4,48%** / **3,99%**, Pix 0,99%, **boleto 3,99%**, saldo ou Linha de
  Crédito 4,99%, débito Caixa 3,99%. A página diz "Não há taxas mensais", sem valor fixo por transação.
  **Tabela de parcelamento:** 2x 2,53%, 3x 4,62%, 4x 6,69%, 5x 8,66%, 6x 9,96%, 7x 11,24%, 8x 12,50%, 9x 13,73%,
  10x 14,93%, 11x 16,12%, 12x 17,28% … 18x 24,28%. Texto da página: parcelar "com acréscimo no preço para o
  comprador" ou "sem acréscimo por uma taxa somada à tarifa de processamento". Nota de rodapé: alguns vendedores
  novos não têm "na hora" logo de início.
- **[O3] Planos de assinatura:** https://www.mercadopago.com.br/ferramentas-para-vender/assinaturas. Os quadros
  dizem "Débito – Na hora – 4,99%", "Crédito – Na hora – 4,49%" e "Em 30 dias – 3,99%", com a nota "Válido para
  todos os meios de pagamento". Meios: "cartão de crédito ou saldo disponível no Mercado Pago".
- **[O4] Termos e Condições de Uso:** https://www.mercadopago.com.br/ajuda/299. Cláusulas 2.1.5 e 2.1.6: parcelamento
  sem acréscimo é tarifado ao vendedor; com acréscimo, a tarifa é cobrada do comprador. 2.3.4: custo de retirada
  para conta bancária "conforme Tabela de Taxas e Tarifas". 2.6.5.5: devolução de Pix em até 90 dias. 2.12.2:
  chargeback debitado do recebedor, salvo cobertura do Programa de Proteção ao Vendedor, mais "eventuais custos
  operacionais". 2.12.3: se não pagar, multa de 2% e juros de 1% a.m. 2.12.4: documentos em até 10 dias. 2.16.2.1:
  custo de antecipação descontado.
- **[O5] Conta Digital:** https://www.mercadopago.com.br/conta (seção de tarifas). "Transferências (Pix, TED):
  Grátis". Saque com Pix: 8 grátis/mês, depois R$ 5,90. Banco24Horas: R$ 5,90. A página é da conta pessoal.
  Não confirma que valha para a conta PJ nem para a API de Payouts.
- **[O6] Reembolsos (developers):**
  https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/payment-management/cancellations-and-refunds/introduction.
  Reembolso total ou parcial em até **180 dias** da aprovação, com **saldo disponível suficiente**. Não fala de taxa.
- **[O7] Payouts:** https://www.mercadopago.com.br/developers/pt/docs/payouts/integration-configuration/money-transfers
  e https://www.mercadopago.com.br/developers/en/docs/payouts/resources/endpoints-map. `/v1/payouts` confirmado,
  resposta 202, valor mínimo 1. **Nenhuma menção a tarifa.**
- **[O8] QR Code presencial (só referência, não é o nosso caso):**
  https://www.mercadopago.com.br/ajuda/quanto-custa-receber-pagamentos-com-codigo-qr_3605. Pix 0,49%, com a nota
  "Suas taxas podem ser diferentes das mostradas aqui, verifique suas condições comerciais atuais na seção
  Configuração de taxas."

**Não há taxa mínima nem valor fixo por transação publicados** para Pix e cartão online: só percentual. A exceção é o
boleto, que em [O1] é **R$ 3,49 fixo**. O arredondamento do MP para centavos não está publicado. Nos exemplos,
"≈" indica valor arredondado ao centavo.

### Por fluxo (taxas de tabela, PJ sem negociação; a taxa real vem da conta)

| Fluxo | Meio / produto | Taxa de tabela | Quem paga | Liberação | Fonte | R$ 100,00 | R$ 2,00 (custódia) |
|---|---|---|---|---|---|---|---|
| Depósito | Pix (`/v1/payments`) | 0,99% | Áurea (o cliente recebe o valor cheio no saldo) | na hora | O1 | 0,99 → líquido 99,01 | ≈0,02 → ≈1,98 |
| Depósito | Checkout Pro, cartão à vista | 4,98% / 4,49% / 3,98% (na hora / 14 d / 30 d) | Áurea | conforme a configuração | O1 | 4,98 / 4,49 / 3,98 | ≈0,10 / ≈0,09 / ≈0,08 |
| Depósito | Checkout Pro, **boleto** (hoje permitido) | R$ 3,49 fixo (O1) ou 3,99% (O2) | Áurea | até 3 dias | O1/O2 | 3,49 (ou 3,99) | **3,49 = 174% do valor** (ou ≈0,08) |
| Depósito | Checkout Pro, saldo MP / Linha de Crédito | 4,99% | Áurea | na hora | O1/O2 | 4,99 | ≈0,10 |
| Depósito | Checkout Pro, débito virtual Caixa | 3,99% | Áurea | na hora | O1 | 3,99 | ≈0,08 |
| Compra direta | Pix / Checkout Pro | iguais ao depósito | Áurea (a comissão de 0,5% + R$ 1,00 por lado não cobre o Pix e às vezes não cobre o cartão: ver nota 1) | idem | O1 | idem | idem |
| Fatura de custódia | Pix | 0,99% | Áurea | na hora | O1 | 0,99 | **≈0,02** |
| Fatura de custódia | Cartão via **assinatura** (Preapproval) | 4,49% crédito na hora (ou 4,99%, ou 3,99% em 30 d) | Áurea | conforme a configuração | O3 | 4,49 | **≈0,09** (≈4,5% da receita de custódia) |
| Assinatura recorrente (meses seguintes) | Preapproval | igual à linha acima, **a cada mês** | Áurea | idem | O3 | 4,49/mês | ≈0,09/mês |
| Frete do envio | Pix / Checkout Pro | 0,99% / 3,98–4,98% | **Áurea** (o frete é repassado "sem margem", então a taxa sai do bolso da empresa) | idem | O1 | 0,99 / 4,98 | — |
| Oferta pré-paga / reserva | Pix / Checkout Pro | iguais ao depósito | Áurea | idem | O1 | idem | — |
| Retirada física | Pix / Checkout Pro (segura até 2x) | à vista: iguais ao depósito. **2x sem acréscimo:** +2,53% sobre a tarifa (O2) | Áurea. Se o parcelamento for **com acréscimo**, quem paga é o cliente (O4 2.1.6) | idem | O1/O2/O4 | — | R$ 180,00 em 2x sem acréscimo: 4,98% + 2,53% = 7,51% ≈ R$ 13,52 |
| Saque Pix automático | Payouts `/v1/payouts` | **não publicada** | Áurea (o cliente paga R$ 5,00 de tarifa nossa) | 202 = aceito; crédito depois | O7 (silencia) | desconhecido | — |
| Saque manual | Pix pelo app ou banco | "Transferências (Pix, TED): Grátis" na página da conta digital | Áurea | na hora | O5 (não confirma PJ) | provavelmente 0 | — |
| Estorno / devolução | `/v1/payments/{id}/refunds` (não usado) | sem cobrança publicada. **Se a tarifa original volta, não está confirmado** | Áurea (precisa de saldo) | cartão: até 180 dias. Pix: até 90 dias | O4/O6 | ? | ? |
| Chargeback | — | valor debitado + "eventuais custos operacionais", sem valor publicado. Se não pago: multa de 2% + 1% a.m. | Áurea, salvo o Programa de Proteção ao Vendedor | — | O4 2.12 | perde R$ 100 + ? | — |
| Antecipação | — | "custos da antecipação" descontados (O4 2.16.2.1). Na prática, a escolha "na hora / 14 / 30 dias" já embute isso | Áurea | — | O1/O4 | (4,98 − 3,98 = 1,00 a mais por receber na hora) | — |

**Nota 1 (comissão × taxa do MP).** Numa compra direta de R$ 100,00 por Pix, o comprador paga R$ 100,00 + R$ 1,50
de comissão + R$ 2,00 do 1º mês de custódia = R$ 103,50. O MP retém 0,99% ≈ R$ 1,02. No cartão "na hora", retém
4,98% ≈ R$ 5,15, mais do que os R$ 3,00 de comissão dos dois lados somados. A conta é ilustrativa: a comissão vem da
tabela vigente.

**Nota 2 (R$ 2,00).** Como não há mínimo publicado, R$ 2,00 no Pix custa ≈ R$ 0,02 e no cartão ≈ R$ 0,08 a 0,10.
O que torna a cobrança pequena **desproporcional** é: (i) o **boleto a R$ 3,49 fixo** (hoje aceito no Checkout Pro);
(ii) a assinatura mensal, que paga o percentual todo mês; (iii) qualquer mínimo que a conta tenha e o site não mostre.
O item (iii) precisa ser conferido no primeiro pagamento real, lendo `net_received_amount`.

---

## (c) Campos da API para gravar a taxa real, e relatórios de conciliação

### Pagamento (`GET /v1/payments/{id}`)
Referência: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/get-payment/get

| Campo | O que a referência diz | Uso |
|---|---|---|
| `transaction_amount` | valor da transação | bruto, já conferido contra a intenção |
| `transaction_details.net_received_amount` | "Valor líquido recebido" | **taxa = bruto − líquido** (o que já fazemos) |
| `transaction_details.total_paid_amount` | "Valor total cobrado ao pagador" | mostra juros pagos pelo comprador no parcelado com acréscimo |
| `transaction_details.installment_amount` | descrito como "Valor da taxa de financiamento escolhida" (na prática, valor da parcela) | — |
| `installments` | número de parcelas | — |
| `money_release_date` | "Data em que o pagamento é liquidado e o dinheiro é disponibilizado na conta" | já gravado como `liberacao_prevista` |
| `money_release_schema` | `null` ou `payment_in_flow` (parcelas liberadas mês a mês) | **não lido.** Gravar para saber se o parcelado entra de uma vez |
| `transaction_amount_refunded` | "Valor reembolsado da transação" | **não lido.** Sinal de reembolso |
| `status` / `status_detail` | inclui `refunded`, `charged_back`, `in_mediation` | hoje só `approved` gera efeito |
| `fee_details[]` (`type`: `mercadopago_fee`, `financing_fee`, `application_fee`…; `amount`; `fee_payer`) | **não aparece na referência BR atual** (só em respostas e na documentação antiga) | separaria taxa de processamento e custo de parcelamento sem acréscimo. Ver seção d |
| `charges_details[]` | **não aparece na referência BR atual** | idem |

Recomendação, sem implementar: guardar o `raw` (já retornado em `mercadopago.ts`) ou ao menos `fee_details`,
`money_release_schema` e `transaction_amount_refunded` em `recebimentos_gateway`. E reconciliar mensalmente contra o
relatório de liberações, que é a fonte que o MP documenta campo a campo.

### Assinatura (Preapproval)
- Cada cobrança mensal é uma **fatura** (`authorized_payment`): `GET /authorized_payments/{id}` traz
  `preapproval_id`, `external_reference`, `transaction_amount`, `debit_date`, `retry_attempt`, `status`
  (`scheduled`, `processed`, `recycling`) e **`payment.id`/`payment.status`**.
  Referência: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-authorized-payment/get
- Tópicos de webhook (https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks):
  `subscription_authorized_payment`, `subscription_preapproval`, `subscription_preapproval_plan`, `payment`
  (inclui pagamentos de assinaturas) e `topic_chargebacks_wh` ("abertura de chargebacks, mudanças de status e
  modificações referentes às liberações de dinheiro").
  Com o `payment.id` da fatura, a taxa sai do mesmo `GET /v1/payments/{id}`.

### Relatórios (fonte oficial para conciliação e contabilidade)

**Relatório de Liberações** (o que entrou e saiu do saldo disponível):
`POST https://api.mercadopago.com/v1/account/release_report` com `begin_date`/`end_date` (UTC), mais endpoints de
configuração, lista, download e geração automática.
Referência: https://www.mercadopago.com.br/developers/pt/reference/releases-report/create-report/post.
Colunas (https://www.mercadopago.com.br/developers/pt/docs/reports/released-money/report-fields): `DATE`, `SOURCE_ID`
(id do pagamento), **`EXTERNAL_REFERENCE`** (nosso `DEP-`, `CMP-`, `FAT-`, `ASS-`, `FRT-`, `RET-`…), `RECORD_TYPE`,
`DESCRIPTION` (payment, `refund`, `chargeback`, `payout`, `fee_release_in_advance`, `reserve_for_refund`…),
**`GROSS_AMOUNT`, `MP_FEE_AMOUNT`, `FINANCING_FEE_AMOUNT`**, `SHIPPING_FEE_AMOUNT`, `TAXES_AMOUNT`,
`EFFECTIVE_COUPON_AMOUNT`, **`NET_CREDIT_AMOUNT`, `NET_DEBIT_AMOUNT`, `BALANCE_AMOUNT`**, `PAYMENT_METHOD`,
`INSTALLMENTS`, `TRANSACTION_APPROVAL_DATE`, `METADATA`.

**Relatório "Dinheiro em conta" / settlement** (todas as transações):
`POST https://api.mercadopago.com/v1/account/settlement_report` (202).
Referência: https://www.mercadopago.com.br/developers/pt/reference/settlements-report/create-report/post.
Colunas (https://mercadopago.com.br/developers/en/docs/reports/account-money/report-fields): `TRANSACTION_AMOUNT`,
**`FEE_AMOUNT`** (processamento + frete + parcelamento + cupom), `MKP_FEE_AMOUNT`, `FINANCING_FEE_AMOUNT`,
`SHIPPING_FEE_AMOUNT`, `TAXES_AMOUNT`, **`SETTLEMENT_NET_AMOUNT`**, `REAL_AMOUNT` (líquido depois de chargebacks,
reclamações e reembolsos), `MONEY_RELEASE_DATE`, `IS_RELEASED`, **`EXTERNAL_REFERENCE`**, `SOURCE_ID`,
`TRANSACTION_TYPE` (`SETTLEMENT`, `REFUND`, `CHARGEBACK`, `DISPUTE`, `PAYOUT`), `PAYMENT_METHOD`,
`PAYMENT_METHOD_TYPE`, `INSTALLMENTS`, `INSTALLMENT_NUMBER`, `INSTALLMENT_NET_AMOUNT`.

**Por que importa:** esses relatórios mostram as quatro coisas que o sistema não vê hoje: renovações da assinatura,
saídas por Payouts (`PAYOUT`), reembolsos (`REFUND`) e chargebacks (`CHARGEBACK`), com o `EXTERNAL_REFERENCE`
para casar com `aurea.recebimentos_gateway`. Eles também servem de comprovante da despesa bancária para o contador.

### Payouts
`GET /v1/payouts/{id}`, `/transactions` e `/transactions/{tid}` ([O7]). A documentação **não lista campo de
tarifa**. O custo de cada envio, se houver, só aparece no relatório (`DESCRIPTION`/`TRANSACTION_TYPE` = `payout`,
`NET_DEBIT_AMOUNT`).

---

## (d) Não confirmado, e o que o Gabriel precisa conferir no painel do MP

### Não confirmado em página oficial
1. **A tabela "vigente" é uma só?** [O1] e [O2] divergem em 14 dias (4,49% × 4,48%), 30 dias (3,98% × 3,99%) e
   boleto (R$ 3,49 × 3,99%). A página de assinaturas [O3] usa rótulos confusos ("Débito 4,99%"). A página
   `mercadopago.com.br/custos-e-tarifas` não existe mais, e a "Tabela de taxas e tarifas" (ajuda/45226) não abriu
   para leitura. **A taxa que vale é a da conta.**
2. **Taxa do Payouts (`/v1/payouts`) e do Pix enviado pela conta PJ.** Nenhuma página oficial dá valor. [O5]
   diz "Grátis" para Pix/TED, mas na página da conta pessoal.
3. **Se a tarifa volta no reembolso** (total ou parcial) e **se há custo fixo por chargeback.** Os Termos falam só
   em "eventuais custos operacionais".
4. **`fee_details` e `charges_details`** não estão na referência BR atual de "Obter pagamento". O cálculo por
   `net_received_amount` é o único que a referência sustenta hoje. Testar num pagamento real se `fee_details`
   continua vindo.
5. **Se `net_received_amount` pode vir 0 ou nulo** em algum estado aprovado. Se vier 0, o código registraria tarifa
   = 100% (`mercadopago.ts:177-181`). Conferir nos primeiros pagamentos reais.
6. **Se o pagamento gerado pela assinatura carrega a `external_reference` da Preapproval** (`ASS-{planoId}`). A
   fatura (`authorized_payment`) carrega. O `payment` não está documentado.
7. **Meios aceitos na assinatura.** [O3] diz "cartão de crédito ou saldo". A página de developers de assinaturas
   lista também Pix, débito, Linha de Crédito e boleto
   (https://www.mercadopago.com.br/developers/pt/docs/subscriptions/landing).
8. **Valor mínimo da Preapproval e do Pix** (R$ 2,00 é aceito?). A doc do Payouts diz mínimo 1, e só para payouts.
9. **Assinatura Ed25519 do Payouts.** A página atual diz só "chaves pública e privada do integrador". Não cita
   Ed25519 nem como entregar a chave pública. O desenho em `payouts-core.ts` e
   `docs/ASSINATURA_MERCADO_PAGO_SAQUE_AUTOMATICO.md` precisa ser confirmado com o MP.
10. **Nota fiscal das tarifas.** Não achei página oficial que diga se o MP emite NFS-e ou outro documento fiscal
    das tarifas para o CNPJ. Até lá, o lastro contábil da despesa 4.1.07 são os relatórios de Liberações e de
    Dinheiro em conta (colunas `MP_FEE_AMOUNT` e `FEE_AMOUNT`), que podem ser gerados por API ou baixados.
    Perguntar ao MP e ao contador.
11. **Depósito no cartão seguido de saque** (lacuna 4 da seção a): perguntar ao MP se isso fere a regra contra
    "antecipação de dinheiro, autofinanciamento".

### O que conferir no painel ou no app (só o que as páginas oficiais nomeiam)
- **Taxas e prazos configurados para Checkouts.** Segundo [O1]: "Seu negócio > Custos > Checkouts". Anotar a taxa e o
  prazo escolhidos para crédito, Pix, boleto, saldo/Linha de Crédito e débito. Conferir se "na hora" está liberado,
  já que contas novas podem começar em 7 dias [O2].
- **Parcelamento:** se a conta oferece **sem acréscimo** (a Áurea paga a taxa de [O2], somada) ou **com acréscimo**
  (paga o cliente). Isso afeta a retirada segura em 2x.
- **Condições comerciais negociadas** ("Configuração de taxas", termo de [O8]), se houver.
- **Assinaturas:** a taxa aplicada às cobranças recorrentes e o prazo de liberação.
- **Pix/TED enviados pela conta PJ** e **Payouts:** pedir a tabela ao MP. As perguntas 3 e 4 de
  `docs/ASSINATURA_MERCADO_PAGO_SAQUE_AUTOMATICO.md` §7 continuam abertas.
- **Programa de Proteção ao Vendedor:** se as vendas por Checkout Pro e Pix API da Áurea estão cobertas.
- **Prova prática, o jeito mais seguro:** fazer um Pix de R$ 2,00 e um cartão de R$ 100,00 em produção e ler
  `net_received_amount` em `aurea.recebimentos_gateway` e no relatório de Liberações. O número que sair ali é a
  taxa real da conta.
