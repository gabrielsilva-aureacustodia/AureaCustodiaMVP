# Tutorial — Liquidação Manual de Saques (RA-30)

```
Para:        Gabriel / Sócios da Áurea Custódia
Escrito em:  11/09/2026
Tempo:       5 minutos
Módulo:      Saque de Recursos e Contabilidade (Agente B - Sessão B-4)
```

> **O que este fluxo faz.** Garante que o cliente possa retirar seu dinheiro da plataforma
> a qualquer momento, com débito imediato de saldo, tarifa fixa de R$ 5,00 e liquidação via
> Pix em até 3 dias úteis (D+3).
>
> **Por que a liquidação é manual (RA-30).** Gateways de pagamento (como Mercado Pago) em
> contas padrão ou sandbox não disponibilizam endpoint de Pix Out (transferência de saída)
> sem credenciamento formal de instituição de pagamento/BaaS. A Áurea assume a liquidação
> operacional em D+3: o sócio confere os pedidos na fila e efetua o Pix pelo aplicativo
> bancário da empresa, assegurando que nenhum cliente fique com dinheiro preso.

---

## 1. Visão Geral do Ciclo de Vida do Saque

```
[ Cliente solicita saque ]
         │
         ▼
  Validação de Saldo & Dados Bancários
         │
         ▼
  Débito imediato de saldo (user.balance)
  Lançamentos no ledger: 'saque' (-líquido) e 'taxa_saque' (-R$ 5,00)
  Criação do registro em aurea.saques (status: 'solicitado', prazo D+3)
         │
         ▼
  [ Fila de Liquidação do Sócio (RA-30) ]
         │
         ├── Transferência Pix realizada com sucesso ──► status: 'pago' (comprovante salvo)
         │
         └── Rejeição / Chave inválida no banco ──────► status: 'falhou' (saldo estornado)
```

---

## 2. Regras de Negócio e Travas de Segurança

1. **Tarifa Fixa:** `TAXA_SAQUE_FIXA_CENTS = 500` (R$ 5,00). O valor sacado mínimo é R$ 5,01.
   A taxa é debitada do valor sacado e reconhecida na contabilidade da plataforma.
2. **Mesma Titularidade Estrita:** O Pix só pode ser enviado para chave Pix ou conta bancária
   pertencente ao mesmo CPF cadastrado e confirmado do cliente. Nunca transferir para terceiros.
3. **Prazo D+3 Úteis:** 72 horas úteis a partir da solicitação. A data limite é gravada em
   `data_limite` (pulando finais de semana e feriados) e exibida na tela do cliente.
4. **Sem Ajuste Espúrio:** A saída de saldo (-valor bruto) casa exatamente com a soma dos
   lançamentos `saque` (-líquido) e `taxa_saque` (-500). A invariante contábil do ledger fecha
   em zero centavos.

---

## 3. Rotina Operacional do Sócio (Passo a Passo)

### Passo 1 — Consultar a fila de saques pendentes

Você pode consultar os saques pendentes por três caminhos:

1. **Pela API de Relatórios:**
   Acesse a rota autenticada de relatórios:
   `GET /api/relatorios/saques?formato=json` (ou `.csv` / `.xlsx`).
   Filtre os registros onde `Status = "solicitado"` ou `"em_processamento"`.

2. **Pelo Painel do Supabase:**
   Acesse a tabela `aurea.saques` e execute a query:
   ```sql
   SELECT id, user_id, valor_cents, taxa_cents, valor_liquido_cents,
          dados_bancarios, data_limite
   FROM aurea.saques
   WHERE status = 'solicitado'
   ORDER BY data_limite ASC;
   ```

3. **Pela Server Action de Sistema:**
   Função `listarMeusSaques()` chamada pela interface do cliente ou administrativa.

---

### Passo 2 — Efetuar a transferência Pix

1. Abra o aplicativo da conta bancária PJ da Áurea Custódia (Itaú, Inter ou Mercado Pago).
2. Selecione **Transferir via Pix**.
3. Insira a **Chave Pix** (ou dados de Agência/Conta) informada em `dados_bancarios`.
4. **Confirme o nome e CPF do destinatário:** Devem coincidir obrigatoriamente com o cadastro.
5. Digite o **Valor Líquido** (`valor_liquido_cents / 100`).
   *Exemplo:* Se o cliente solicitou R$ 100,00, a transferência deve ser de **R$ 95,00**.
6. Conclua a transferência e copie a **chave/código de autenticação da transação** (ex: `E1823612020260911...`).

---

### Passo 3 — Confirmar a liquidação no sistema

Para que o cliente veja o status como **Pago** e o histórico seja auditável:

1. Chame a Server Action `confirmarLiquidacaoSaque(saqueId, comprovanteRef)`:
   - `saqueId`: ID do saque (UUID gravado em `aurea.saques`).
   - `comprovanteRef`: Código da autenticação Pix do comprovante bancário.

2. Ou, alternativamente, execute no SQL do Supabase:
   ```sql
   UPDATE aurea.saques
   SET status = 'pago',
       comprovante_ref = 'E1823612020260911...',
       data_liquidacao = now()
   WHERE id = '<ID_DO_SAQUE>' AND status = 'solicitado';
   ```

---

### Passo 4 — O que fazer se a transferência falhar (Chave inválida / Erro bancário)

Se a chave Pix estiver cancelada ou a conta recusar o crédito:

1. Chame a Server Action `rejeitarSaque(saqueId, motivo)`:
   - O sistema altera o status para `'falhou'`, grava o `motivoFalha` e **estorna imediatamente**
     o valor bruto para o saldo do cliente (`user.balance`), com lançamento de auditoria.

2. O cliente é notificado na tela e pode atualizar sua chave Pix para solicitar novamente.

---

## 4. Auditoria e Conciliação

Toda a movimentação de saque gera lançamentos no livro contábil (`aurea.ledger_entries`):
- `tipo = 'saque'`: débito do valor líquido sacado.
- `tipo = 'taxa_saque'`: débito da tarifa fixa de R$ 5,00 retida pela plataforma.

No DRE e no Balanço da Áurea Custódia:
- O valor líquido sai da conta de custódia e vai para a conta bancária do cliente.
- A tarifa de R$ 5,00 é contabilizada como receita de serviços operacionais da Áurea.
