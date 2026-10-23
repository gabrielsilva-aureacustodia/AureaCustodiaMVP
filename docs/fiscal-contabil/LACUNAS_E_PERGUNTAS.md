# Lacunas do sistema e perguntas em aberto

22/10/2026. O que o sistema faz hoje **diferente** do que `REGRAS_FISCAIS_E_CONTABEIS.md` pede, e o que precisa de
resposta de fora (contador, Mercado Pago, teste) antes de implementar. Nada aqui foi corrigido ainda.

## 0. Respostas do contador (Túlio Monteiro, WhatsApp, 23/10/2026) e o que mudou

| # | Pergunta | Resposta | O que mudou |
|---|---|---|---|
| 1 | Código da tarifa de saque | "Se a tarifa refere-se aos serviços do armazenamento, onde haverá o saque, o melhor código é o 11.04" | Nota da tarifa no código da custódia (11.04.01/001, NBS 1.0602.90.00, cIndOp 050101), emitida no pedido do saque e **cancelada** se o saque for recusado (`src/domain/nfse/pedidos.ts`, `eventos.ts`) |
| 2 | Código da taxa de retirada | "É uma movimentação do armazenamento, siga com o código 11.04.01" | Nota da taxa de retirada, emitida quando a retirada passa a paga |
| 3 | Frete do envio | "Despesa de cliente: você recebe o dinheiro e faz o pagamento daquela despesa do cliente" | Sem NFS-e; na DRE sai do resultado inteiro (não abate mais 4.1.06; a fatura dos Correios desses envios também fica fora) — `src/domain/dre.ts` |
| 4 | Competência da custódia | "O dia da movimentação do dinheiro, ou seja, o dia do pagamento" | Confirma a regra do Gabriel já implantada |
| 5 | Tipo/indicador de operação | "100301 para as intermediações e 050101 para a custódia" | Confirma o `cIndOp` já usado. O `tpOper` da intermediação segue `5` (pesquisa) |
| 6 | `indFinal` | "Acontece quando não se colocam os dados do cliente (ex.: estacionamento). No seu caso todos terão clientes" | Confirma `0` |
| 7 | Endereço na custódia | "Pode colocar endereço do cliente em todas as NFS-e, mesmo não sendo obrigatório na custódia" | Já era assim quando o cadastro tem endereço; na custódia, a falta dele não barra a nota |
| 8 | Inscrição municipal | "A Áurea tem IM 1.795.745/001-4, aconselho a colocar" | A DPS leva `IM` = 17957450014; se a Sefin recusar com E0120 (BH sem a IM no cadastro nacional complementar, como respondeu a produção restrita), reenvia sem ela |
| + | IBS/CBS no início do formulário | "Essa é pra colocar SIM" | Confirma: a DPS automática sempre leva o grupo IBSCBS |

## 1. Lacunas no código (achadas nesta pesquisa)

| # | Lacuna | Onde | Regra |
|---|---|---|---|
| L1 | ~~Nenhuma emissão de NFS-e~~ — **custódia, comissões, tarifa de saque e taxa de retirada emitem desde 23/10/2026**, com cancelamento automático da tarifa de saque recusado. Faltam o PDF e o cancelamento manual pelo painel. | — | R2 |
| L2 | **ISS com alíquota única** (`issBp`) aplicada à receita total; BH cobra 5% na custódia e 3% na intermediação. | `src/domain/dre.ts` (`ParametrosContabeis`, `comBp`) | R12 |
| L3 | **Livro-razão de uma perna só** (a do cliente): não há conta devedora/credora, nº sequencial de lançamento contábil nem plano de contas por lançamento. Receita, passivo de clientes e caixa do Mercado Pago não se encontram num mesmo lançamento. | `src/domain/ledger.ts` | R6, R7 |
| L4 | **Sem data do fato separada da data do registro** nem marca de extemporâneo. | `LancamentoPendente` | R5, R9 |
| L5 | **Correção pelo painel não exige forma (estorno/transferência/complementação), nº do lançamento corrigido nem data do fato** — só o motivo (desde 21/10). | `src/server/actions/admin/` (ajuste de saldo) | R9 |
| L6 | **Renovações mensais da assinatura de custódia no cartão não são conciliadas**: o cartão é cobrado, a fatura do mês não é baixada e a taxa não é gravada. Webhooks `subscription_authorized_payment` / `subscription_preapproval` ignorados. | `src/server/payments/conciliacao.ts`, `src/app/api/webhooks/mercadopago/route.ts` | R10 |
| L7 | **Reembolso e chargeback no Mercado Pago não desfazem o crédito** dado ao cliente; tópico de contestações ignorado. | `conciliacao.ts`, webhook | R1, R9 |
| L8 | **Checkout Pro aceita boleto** (`excluded_payment_types: []`): R$ 3,49 fixo numa cobrança de R$ 2,00. | `src/lib/payments/cobranca.ts` | R10 |
| L9 | **Custo do saque (Payouts / Pix manual) não é registrado.** | `src/server/saques/pagamento.ts` | R10 |
| L10 | **Cadastro sem código IBGE do município** do cliente (a nota exige `cMun`), e o cadastro é opcional — quem não completou pode negociar? Precisa de CPF válido + endereço com CEP antes da 1ª comissão. | `Cadastro` em `src/domain/types.ts` | R2.3 |
| L11 | ~~Frete classificado fora da receita bruta~~ — **resolvido (contador, 23/10/2026): despesa do cliente**, fora do resultado; a DRE deixou de abater 4.1.06 com ele. | `src/domain/dre.ts`, ledger `frete` | R1 |
| L12 | **Sem conciliação diária** Mercado Pago × saldos de clientes × receita, nem subcontas "recursos de clientes / recursos próprios". | — | R11 |
| L13 | **Sem diferimento de custódia** (ciclo que cruza o mês), caso o contador exija CPC 47. | `src/domain/competencia.ts` | R5.4 |
| L14 | Comentário de topo do ledger está desatualizado (diz que a comissão sai só do vendedor e que a custódia tem sinal zero). | `src/domain/ledger.ts` | — |
| L16 | **O aceite da moeda não tem hora gravada.** `Coin.entrada` e `recibo.dataEmissao` são `DateBR`, só a data, mas o período de guarda que a nota de custódia cobre começa na data e na hora exatas da geração do recibo e do hash (decisão de 23/10/2026). É preciso um campo `Timestamp` gravado no aceite e na compra. | `src/domain/types.ts` (superfície protegida) | R5.3 |
| L15 | Não lemos `money_release_schema`, `transaction_amount_refunded` nem `status` `refunded`/`charged_back` do pagamento. | `src/lib/payments/mercadopago.ts` | R10 |

## 1b. Decisões que são do Gabriel — o sistema não decide sozinho

Até o Gabriel responder, nada disto vira regra nem código:

- **Ciclos seguintes da custódia** e **moeda comprada** (custódia do 1º mês paga dentro da compra): o código de
  23/10/2026 aplica a regra do Gabriel ("a nota sai no evento do pagamento") a todo pagamento de fatura de
  custódia. Por isso há uma nota em cada pagamento mensal e uma na compra, sempre com o período do ciclo pago.
  Falta ele confirmar.
- **Consolidado no Admin:** o padrão é o demonstrativo, que não é nota fiscal e lista as NFS-e individuais, e a nota
  consolidada fiscal fica só para operações sem nota individual? (A lei impede duas notas para o mesmo serviço; o
  formato da tela é escolha dele.)
- **Taxa do Mercado Pago no depósito:** a empresa continua absorvendo, ou passa a descontar do cliente?

## 2. Perguntas ao contador

**Bloco A — bloqueiam a emissão automática:**

1. ~~**Tarifa de saque (R$ 5,00):**~~ — **respondida (11.04.01), ver §0.** qual subitem, código municipal, NBS e indicador de operação? (15.15 puxa para o
   regime de serviços financeiros; alternativas: dentro de 10.05, 11.04 ou 17.02.)
2. ~~**Taxa de retirada/devolução da moeda:**~~ — **respondida (11.04.01), ver §0.** 11.04.02 (carga, descarga, arrumação) ou outro?
3. ~~**Granularidade**~~ — **respondida pelo Gabriel em 23/10/2026**: a nota individual por fato é automática e é a
   prioridade; o consolidado por cliente e período sai sob demanda, pelo Admin (ver R2.2). **Fica para o contador:**
   (a) se o demonstrativo consolidado, que não é fiscal, basta para cliente e banco; (b) qual competência usar numa
   NFS-e consolidada fiscal das operações anteriores à automação, que não têm nota individual.
4. ~~**Competência da custódia**~~: **respondida pelo Gabriel em 23/10/2026**. A nota sai no pagamento, com a data e a
   hora do pagamento, e cobre o período do ciclo, que começa no aceite da moeda. Fatura não paga não gera nota nem
   imposto (ver R5.3). **Fica para o contador, só como confirmação:** a apuração do ISS, do PIS/COFINS e do IRPJ/CSLL
   acompanha essa data de pagamento?
5. ~~**`tpOper`**~~ — o contador confirmou o indicador de operação (100301/050101); o `tpOper` segue `5` (ver §0).
6. ~~**`indFinal`**~~ — **confirmado `0`** (ver §0). Texto anterior: Confirmar se a custódia de moeda de metal precioso cai na
   alínea "g" do art. 57 (incluída pela LC 227/2026). Se cair, o valor passa a 1.
7. ~~**Endereço na custódia:**~~ — **respondida: em todas as notas** (ver §0). emitir sempre com endereço (recomendado) ou sem, como na nota nº 1?
8. ~~e-CNPJ A1~~ — **temos** (recebido em 23/10/2026, válido até 04/08/2027; ver R14.1). ~~Inscrição municipal~~ — **respondida: 1.795.745/001-4** (ver §0). Texto anterior: a empresa
   está inscrita no cadastro municipal de BH (informar inscrição municipal) ou emite sem?

**Bloco B — classificação e escrituração:**

9. ~~**Frete:**~~ — **respondida: despesa do cliente** (ver §0). repasse fora da receita (leitura A) ou receita com custo dos Correios (leitura B, SC Cosit 144/2023)?
   Se A, que cláusula nos Termos sustenta o mandato?
10. **Norma aplicável:** NBC TG 1002 (microentidade) ou NBC TG completas? Define se a custódia precisa de diferimento.
11. **Escrituração completa + ECD** ou Livro Caixa? (Afeta distribuição de lucros acima da presunção e a retenção de
    10% acima de R$ 50 mil/mês por sócio, Lei 15.270/2025.)
12. **Regime de caixa ou competência** na apuração do Lucro Presumido.
13. **Subcontas por cliente ou participante (COD_PART)** na ECD; que formato de exportação ele quer receber.
14. **Taxa do Mercado Pago:** despesa com vendas, financeira ou custo do serviço? Taxa de depósito de cliente: a empresa
    absorve ou repassa?
15. **Correção de mês já apurado:** retificar a apuração do mês original ou lançar no mês corrente? Materialidade?
16. **IBS/CBS 2026:** confirmar dispensa de recolhimento (LC 214 art. 348 §1º) e se a empresa entra no cronograma de
    "plataforma digital".
17. **Lei 12.741:** fonte dos 11,33% federais (tabela IBPT? qual versão?).
18. **PIS/COFINS na nota:** CST 01 e regra de arredondamento por nota.
19. **Prazo de guarda** que ele exige (proposta: 10 anos) e e-Financeira (IN RFB 2.278/2025).
20. **Responsabilidade de plataforma digital pelo IBS/CBS a partir de 2027** (LC 214): vale para negociações entre
    pessoas físicas?

## 3. Perguntas ao Mercado Pago / conferências no painel

21. Taxas e prazos **configurados na nossa conta** (Seu negócio > Custos > Checkouts, caminho citado pela página
    oficial): crédito, Pix, saldo/Linha de Crédito, débito, boleto, assinaturas.
22. Tarifa do **Payouts** e do Pix enviado pela conta PJ.
23. A taxa **volta** no reembolso? Há custo fixo por chargeback?
24. O Mercado Pago emite **nota fiscal das tarifas** para o CNPJ? (Senão, o comprovante da despesa é o relatório de
    Liberações.)
25. Depósito no cartão seguido de saque por Pix fere a regra de "antecipação de dinheiro, autofinanciamento" dos Termos?
26. Valor mínimo aceito na assinatura (Preapproval) e no Pix.
27. **Prova prática:** um Pix de R$ 2,00 e um cartão de R$ 100,00 em produção, lendo `net_received_amount` e o
    relatório de Liberações — o número que sair é a taxa real da conta.

## 4. A validar na produção restrita da NFS-e (técnico)

28. URL base de produção do `POST /nfse` — confirma-se na primeira nota real (a emissão real está ligada desde 23/10/2026).
29. ~~Algoritmo de assinatura~~ — **RSA-SHA256/exc-c14n aceito** na produção restrita (23/10/2026).
30. ~~Formato de `cNBS`~~ — **9 dígitos sem pontos, aceito.** Continua aberto: o formato e dos parâmetros da API de alíquotas.
31. Limite de requisições (nenhum documentado).
32. Se a numeração da DPS pode ter buracos (só a regra E0014 de unicidade foi encontrada).
33. ~~Arredondamento~~ — **conferido centavo a centavo** contra as notas do contador (23/10/2026).
