# Tutorial — Faturamento Mensal de Custódia e Inadimplência

```
Para:        Gabriel / Sócios da Áurea Custódia
Escrito em:  11/09/2026
Tempo:       5 minutos
Módulo:      Faturamento de Custódia e DRE Consolidada (Agente B - Sessões B-5 e B-6)
```

> **O que este fluxo faz.** Implementa o faturamento mensal recorrente de custódia de moedas sob guarda
> da Áurea, com cobrança automática em saldo, tolerância de 10 dias, emissão de faturas e bloqueio
> preventivo por inadimplência.
>
> **Decisão D-3 dos Sócios (10/09/2026).** A precificação antiga de faixas anuais (R$ 5 a R$ 60) foi
> substituída pela regra unificada de **R$ 2,00 por moeda por mês** (`CUSTODIA_MENSAL_POR_MOEDA_CENTS = 200`)
> ou plano anual de **R$ 24,00 por moeda por ano** parcelado em até 12x sem desconto.

---

## 1. Visão Geral do Ciclo de Faturamento

```
[ Início do Mês · Cron Agendado: 0 8 1 * * ]
                 │
                 ▼
       GET /api/cron/faturamento
     (Autenticado via CRON_SECRET)
                 │
                 ▼
     Varredura de Usuários com Moedas Ativas
                 │
                 ├── Sem moedas sob guarda ────► Nenhuma fatura emitida
                 │
                 └── Com moedas sob guarda ────► Calcula: N × R$ 2,00
                                                        │
         ┌──────────────────────────────────────────────┴──────────────────────────────────┐
         ▼                                                                                 ▼
[ user.balance >= valor ]                                                        [ user.balance < valor ]
         │                                                                                 │
         ▼                                                                                 ▼
• Debita saldo do usuário imediatamente                                          • Fatura emitida como 'pendente'
• Fatura gravada com status: 'paga'                                              • Prazo de vencimento: D+10 dias
• Forma de pagamento: 'saldo'                                                    • Cliente pode pagar via Pix/cartão ou com saldo posterior
• Lançamento contábil: 'custodia' (-valor, sinal -1)                             • Sem débito forçado de saldo
• Invariante do ledger fecha com 0 centavos de ajuste                             • Após D+10 sem pagamento: status 'atrasada' e user.inadimplente = true
```

---

## 2. Regras de Negócio e Travas de Segurança

1. **Tarifa Oficial Unificada (Decisão D-3):** R$ 2,00 por moeda guardada por mês.
   Calculada exclusivamente sobre moedas ativas em custódia (`user.coins.filter(c => !c.transferido)`).
2. **Idempotência Garantida:** Cada fatura possui unicidade garantida no banco de dados
   por `CONSTRAINT faturas_usuario_competencia_uniq UNIQUE (user_email, competencia)`.
   Rodar o cron múltiplas vezes na mesma competência nunca duplica cobranças nem faturas.
3. **Invariante Contábil no Débito de Saldo:** Quando o pagamento ocorre via saldo em conta,
   a mutação atômica debita o saldo do cliente e gera um lançamento no ledger de tipo `custodia`
   com `sinal = -1`, mantendo o livro-razão perfeitamente equilibrado e sem qualquer lançamento de ajuste espúrio.
4. **Régua de Cobrança e Inadimplência:**
   - **Dias 1 a 10 (Período de Tolerância):** Fatura permanece com status `pendente`. O usuário não é considerado inadimplente.
   - **Após o Dia 10:** Caso continue não paga, a fatura muda automaticamente para `atrasada` e a conta do cliente é marcada como `inadimplente = true`.
   - **Efeito da Inadimplência:** O Agente C consome a marcação `isInadimplente(user)` para bloquear solicitações de retirada física e transferências de custódia (Cláusulas 3 e 4 dos Termos de Uso).
   - **Desbloqueio Imediato:** Assim que todas as faturas em atraso forem quitadas, o status `user.inadimplente` volta automaticamente para `false`.

---

## 3. Quatro Fontes de Receita na DRE Consolidada (Bloco 9)

O relatório financeiro e a DRE da plataforma (`src/domain/dre.ts`) reconhecem e segregam
as **quatro fontes de receita** oficiais no livro-razão:

| Código | Conta Contábil | Tipo no Ledger | Descrição |
|---|---|---|---|
| **3.1.01** | Receita de comissões de corretagem | `comissao` | 0,5% + R$ 1,00 retidos do vendedor em cada negociação de lote ou moeda |
| **3.1.02** | Receita de custódia | `custodia` | R$ 2,00 por moeda por mês faturados no ciclo mensal de guarda |
| **3.1.03** | Receita de tarifas de saque | `taxa_saque` | Tarifa fixa de R$ 5,00 retida no momento do saque de saldo do cliente |
| **3.1.04** | Receita de tarifas de retirada física | `taxa_retirada` | Tarifa operacional de processamento e logística para retirada física da moeda |

Nenhuma alíquota tributária entra fixa em código: parâmetros tributários (Lucro Presumido, IRPJ, CSLL, PIS, COFINS, ISS)
são configurados pelo contador na tabela `aurea.parametros_contabeis`.

---

## 4. Configuração Operacional na Vercel

O agendamento automático está registrado no `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/shipping",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/faturamento",
      "schedule": "0 8 1 * *"
    }
  ]
}
```

Para disparar manualmente o faturamento em ambiente de homologação ou produção:
```bash
curl -X GET "https://sua-url.vercel.app/api/cron/faturamento" \
  -H "Authorization: Bearer <SEU_CRON_SECRET>"
```
