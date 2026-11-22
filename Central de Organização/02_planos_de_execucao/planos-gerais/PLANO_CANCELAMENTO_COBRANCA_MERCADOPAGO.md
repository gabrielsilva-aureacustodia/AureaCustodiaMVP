# Plano de Execução — Cancelamento e Ajuste de Cobrança no Mercado Pago

```
Data de elaboração: 21/09/2026
Status:              PLANO ARQUITETURAL PARA DECISÃO DOS SÓCIOS (NÃO IMPLEMENTAR)
Autor:               Equipe de Engenharia / Antigravity
Contexto:            Regra de transferência de custódia na venda de moedas (decisão de 21/09/2026)
```

---

## 1. Contexto e Diagnóstico Atual

### 1.1 A Nova Regra de Negócio
Em 21/09/2026, foi consolidada a regra operacional de que **a custódia física acompanha a moeda e não o usuário**:
- Ao vender uma moeda em custódia no marketplace, o vendedor encerra sua obrigação de custódia sobre aquele ativo.
- O comprador herda a responsabilidade de custódia pelos **meses restantes** daquele ciclo anual (ex.: venda no 2º mês transfere 11 meses restantes a R$ 2,00/mês = R$ 22,00 em até 11 parcelas).
- No domínio interno (`src/domain/custodia-transferencia.ts`), a transferência já está completamente equacionada:
  1. O plano do vendedor tem a moeda removida e, se ficar sem moedas ativas, é marcado como `status: 'encerrado'`.
  2. As faturas internas futuras do vendedor que ainda estavam como `pendente` são canceladas (`status: 'cancelada'`).
  3. É gerado um novo plano para o comprador (`origem: 'transferencia'`, `status: 'aguardando_pagamento'`) com sua respectiva fatura pendente.

### 1.2 O Descompasso com o Gateway (Mercado Pago)
Embora o modelo de dados possua o campo `PlanoCustodia.assinaturaId`, ele **nunca foi preenchido**. Hoje, a cobrança por cartão de crédito opera da seguinte forma:
- Ação `iniciarCartaoFatura` (`src/server/actions/plano-custodia.ts`) gera uma preferência do **Checkout Pro** via `criarPreferenciaCheckoutPro` (`src/lib/payments/mercadopago.ts`).
- No Checkout Pro, o pagamento com cartão de crédito é processado como uma **venda à vista com parcelamento ao emissor**:
  - O Mercado Pago cobra o valor total (ex.: R$ 24,00 pelo plano anual) do cartão de crédito do cliente no momento da aprovação.
  - O parcelamento (em até 12 parcelas) é uma transação financeira entre o cliente e o banco emissor do cartão.
  - O lojista (AUREA CUSTODIA LTDA) recebe a liquidação integral no gateway (descontadas as taxas de intermediação).
- **Consequência direta**: **Não existe "próxima parcela" agendada no gateway para ser cancelada**. A cobrança já ocorreu por inteiro.

---

## 2. As Duas Saídas Possíveis

Diante dessa realidade financeira, há duas abordagens viáveis para resolver o cancelamento perante o Mercado Pago quando o usuário vende uma moeda antes do término do período contratado.

```
                                  Venda da Moeda
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        [ SAÍDA 1: PREAPPROVAL ]                [ SAÍDA 2: CHECKOUT PRO ]
       Assinaturas Recorrentes                   Parcelado à Vista Mantido
                    │                                       │
     Cobrança mensal no gateway             Valor cobrado 100% no ato
                    │                                       │
     PUT /preapproval/{id} cancela          Acerto via Estorno Proporcional
        cobranças futuras no MP              ou Crédito em Saldo na Plataforma
```

---

### SAÍDA 1 — Migração da Custódia para Assinaturas Recorrentes (Mercado Pago Preapproval API)

Nesta arquitetura, a custódia em cartão abandona o modelo de compra única parcelada no Checkout Pro e passa a utilizar a API de Assinaturas (*Preapproval*) do Mercado Pago.

#### Como Funciona
1. **Contratação**:
   - Ao contratar o plano anual (ou mensal), a plataforma cria um plano de assinatura via `POST /preapproval_plan` ou gera uma intenção de débito recorrente via `POST /preapproval`.
   - O cliente cadastra o cartão de crédito no gateway, que agenda débitos recorrentes mensais (ex.: R$ 2,00 por mês ao longo de 12 meses no anual, ou R$ 3,00 por mês no mensal).
   - O identificador retornado pelo gateway é gravado em `PlanoCustodia.assinaturaId`.
2. **Cancelamento na Venda**:
   - Quando `transferirCustodiaDaMoeda` encerra o plano do vendedor, uma rotina de integração chama a API do Mercado Pago:
     ```http
     PUT /preapproval/{assinaturaId}
     Authorization: Bearer <MERCADOPAGO_ACCESS_TOKEN>
     Content-Type: application/json

     {
       "status": "cancelled"
     }
     ```
   - O Mercado Pago cessa imediatamente os agendamentos das cobranças dos meses subsequentes.

#### Prós da Saída 1
- **Fidelidade à percepção do usuário**: O vendedor realmente deixa de ver as parcelas futuras na fatura do seu cartão. Não há necessidade de explicar por que as parcelas continuam caindo e por que ele recebeu estorno/crédito.
- **Cancelamento limpo**: Não envolve estornos retroativos parciais nem cálculos de devolução de tarifas de adquirente.

#### Contras e Riscos da Saída 1
- **Risco de Inadimplência Recorrente**: A cada mês há uma nova transação. Se o cartão do cliente expirar, for clonado, cancelado ou atingir o limite no 4º mês, a cobrança falha. A empresa fica com a moeda sob custódia física sem ter recebido o pagamento.
- **Complexidade de Integração**: Requer implementar e manter:
  - Criação de planos de assinatura (`preapproval_plan`).
  - Webhook de eventos de assinatura (`subscription_authorized`, `subscription_preapproval`, `payment` de renovação recorrente).
  - Fluxo de retentativa de cobrança e notificação de falha de débito.
- **Recebimento Não Antecipado**: A plataforma perde a vantagem de receber o valor integral da anuidade no D+0/D+14.

---

### SAÍDA 2 — Manutenção do Parcelamento à Vista (Checkout Pro) com Devolução Proporcional

Nesta arquitetura, preserva-se o Checkout Pro exatamente como funciona hoje. O cliente contrata o plano anual por R$ 24,00 e parcela em até 12x no cartão. Quando vende a moeda antes do prazo, a empresa acerta os meses não utilizados.

#### Como Funciona
Como o valor total já foi liquidado pelo gateway, o acerto financeiro dos meses restantes pode ocorrer por duas vias:

#### Sub-opção 2A: Estorno Parcial via API do Mercado Pago
1. Ao encerrar o plano na venda, calcula-se o montante não utilizado:
   $$\text{valorEstorno} = \text{mesesRestantes} \times \text{valorMensalidade}$$
   *(Ex.: 11 meses restantes de um anual de R$ 24,00 $\rightarrow$ R$ 22,00)*.
2. A plataforma chama o endpoint de estorno do Mercado Pago referenciando o `paymentId` original:
   ```http
   POST /v1/payments/{paymentId}/refunds
   Authorization: Bearer <MERCADOPAGO_ACCESS_TOKEN>
   X-Idempotency-Key: <CHAVE_IDEMPOTENCIA>
   Content-Type: application/json

   {
     "amount": 22.00
   }
   ```
3. O Mercado Pago processa o estorno parcial e lança o crédito na fatura do cartão do vendedor.

#### Sub-opção 2B: Crédito em Saldo na Plataforma (Reembolso Interno)
1. Em vez de chamar a API bancária de estorno do cartão, a plataforma credita o valor dos meses restantes no **saldo em conta** (`balance`) do vendedor:
   ```typescript
   vendedor.balance += valorProporcionalCents
   // Registra lançamento 'ajuste' ou 'estorno_custodia' no ledger append-only
   ```
2. O vendedor pode usar esse saldo para comprar novas moedas no marketplace ou solicitar saque via Pix para sua conta corrente (taxa fixa de saque de R$ 5,00 conforme Tabela de Taxas).

#### Prós da Saída 2
- **Segurança de Receita e Inadimplência Zero**: A custódia física está 100% paga desde o primeiro dia. O cliente nunca entra em inadimplência no meio do contrato anual.
- **Aderência à Infraestrutura Atual**: Já está homologada, testada e em funcionamento (`iniciarCartaoFatura`, conciliação via webhook de pagamentos do Checkout Pro).
- **Sem atrito de adesão**: O Checkout Pro é familiar ao consumidor brasileiro, com alta taxa de conversão.

#### Contras e Riscos da Saída 2
- **Regras de Estorno de Cartão (na Opção 2A)**:
  - O Mercado Pago impõe prazo limite para estornos (tipicamente até 90 a 180 dias após a transação). Se uma moeda for vendida no 10º mês, o estorno via gateway pode ser recusado por expiração da janela permitida pela bandeira do cartão.
  - A tarifa de intermediação do Mercado Pago cobrada na transação original pode não ser estornada proporcionalmente pelo gateway, gerando perda operacional de centavos para a custodiante.
- **Comunicação com o Cliente (na Opção 2B)**:
  - Exige transparência na tela e nos Termos de Uso: o cliente precisa saber que, ao vender a moeda, o parcelamento no cartão continua sendo debitado pelo banco dele, mas o valor dos meses não utilizados é imediatamente creditado no saldo de sua conta na plataforma.

---

## 3. Matriz Comparativa para Decisão

| Critério | Saída 1: Preapproval (Assinatura Recorrente) | Saída 2A: Estorno Parcial no Cartão | Saída 2B: Reembolso em Saldo na Conta |
|---|---|---|---|
| **Complexidade Técnica** | Alta (novo fluxo de adesão, webhooks e gestão de falhas) | Média (endpoint de refund idempotente) | Baixa (mutação interna com lançamento no ledger) |
| **Risco de Inadimplência** | **Alto** (rejeições de cartão mês a mês) | **Nulo** (já pago no ato) | **Nulo** (já pago no ato) |
| **Prazo Limite da Operação** | Sem limite de tempo (cancela a qualquer mês) | Limitado a 90–180 dias pelas bandeiras | Sem limite de tempo (válido em qualquer mês) |
| **Custo com Taxas de Gateway** | Taxa debitada mensalmente sobre cada micro-pagamento | Gateway pode reter taxa da transação inicial | Taxa da transação inicial amortizada normalmente |
| **Percepção do Usuário** | Excelente (parcelas somem da fatura) | Boa (crédito lançado na fatura do cartão) | Boa (saldo liberado de imediato na plataforma) |
| **Impacto no MVP** | Exigiria refatoração substancial de pagamentos | Exige tratamento de exceção para vendas após 90 dias | Alinhado à arquitetura de saldo e ledger do MVP |

---

## 4. Recomendação Técnica da Engenharia

> [!IMPORTANT]
> **Recomendação**: Adotar a **Saída 2B (Crédito em Saldo na Plataforma)** para o estágio atual do MVP, com evolução planejada para **Saída 2A (Estorno Automático com fallback para Saldo)** em versão posterior.

### Justificativa:
1. **Eliminação do Risco de Custódia Inadimplente**: Para uma custodiante de ativos físicos valiosos (moedas comemorativas olímpicas), ter um cliente inadimplente no meio do ano enquanto a moeda está no cofre gera um custo operacional e jurídico desproporcional. A anuidade quitada no ato protege a empresa.
2. **Robustez e Simplicidade Operacional**: A plataforma já possui a infraestrutura contábil do ledger (`src/domain/ledger.ts`, `src/domain/dre.ts`) e o sistema de saldo do usuário. Creditar os meses restantes no saldo do vendedor:
   - Funciona em 100% dos casos, inclusive se a moeda for vendida no 11º mês (quando as bandeiras de cartão já bloqueariam estornos).
   - Não depende de chamadas síncronas a gateways externos durante o fechamento de uma negociação no marketplace.
   - Devolve a liquidez imediatamente ao usuário vendedor para reinvestir na plataforma ou sacar.
3. **Clareza nos Termos e na Interface**:
   - Uma simples cláusula nos Termos de Uso e um aviso na tela de confirmação de venda: *"Os meses restantes do seu plano anual de custódia (R$ 22,00) foram creditados instantaneamente no seu saldo disponível Real Olímpico"*.

---

## 5. Roteiro para Quando os Sócios Baterem o Martelo

Quando a diretoria (Gabriel e Rogério) escolher o caminho definitivo:

### Se a escolha for a Saída 1 (Preapproval):
1. Criar módulo `src/lib/payments/preapproval.ts` com métodos `criarPlanoRecorrente`, `criarAssinatura` e `cancelarAssinatura`.
2. Adicionar webhook handler em `src/app/api/webhooks/mercadopago/route.ts` para processar eventos do tópico `subscription_preapproval`.
3. Preencher `PlanoCustodia.assinaturaId` na ativação da assinatura.
4. Em `src/domain/custodia-transferencia.ts`, emitir evento/tarefa de cancelamento chamando `PUT /preapproval/{id}` ao encerrar o plano do vendedor.

### Se a escolha for a Saída 2B (Crédito em Saldo — Recomendada):
1. Em `transferirMoedaVendida` (`src/domain/market.ts`), ao detectar encerramento de plano com meses restantes pagos, creditar o valor proporcional no `seller.balance`.
2. Registrar o lançamento correspondente no ledger (`derivarLancamentos`), mantendo a DRE contábil perfeitamente equilibrada.
3. Exibir o crédito detalhado no extrato da conta (`userStatement`).
