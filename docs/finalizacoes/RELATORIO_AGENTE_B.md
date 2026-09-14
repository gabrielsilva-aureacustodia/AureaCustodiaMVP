# Relatório de Execução — Agente B · Finalizações

```
Frente:         B — Cobrança e custódia
Branch base:    feat/b-cobranca-e-custodia
Sub-branch:     feat/b1-cobranca-reutilizavel
Data:           14/09/2026
```

---

## 1. Sub-branch B1 — Cobrança Reutilizável

**Status:** Concluída e testada com sucesso.

### 1.1 O que foi implementado

1. **B1.0 — Credenciais do Mercado Pago por ambiente (`src/lib/payments/mercadopago.ts`):**
   - `getMercadoPagoAccessToken()` atualizado para respeitar estritamente `MP_SANDBOX`.
   - Quando `MP_SANDBOX=true` (ou padrão): prioriza `MP_ACCESS_TOKEN_TEST || MP_ACCESS_TOKEN`.
   - Quando `MP_SANDBOX=false` (produção): exige estritamente `MP_ACCESS_TOKEN`.
   - Sem credencial válida para o ambiente selecionado, retorna `null` e aciona o simulador determinístico com `simulado: true`.
   - Cobertura de testes unitários para as 4 combinações de variáveis de ambiente (`src/lib/payments/mercadopago.test.ts`).

2. **B1.1 — Cobrança genérica reutilizável (`src/lib/payments/cobranca.ts`):**
   - Definida a interface `PedidoDeCobranca` com `externalReference`, `userEmail`, `valorCents`, `titulo`, `descricao`, `parcelasMax` e `voltarPara`.
   - Implementadas `criarCobrancaPix` e `criarCobrancaCartao(parcelasMax)`.
   - `criarPreferenciaDeposito` e `criarPixDeposito` em `mercadopago.ts` refatoradas para delegar diretamente para o novo módulo genérico sem alteração de assinaturas existentes.
   - Testes unitários cobrindo parcelas, back_urls e resposta simulada (`src/lib/payments/cobranca.test.ts`).

3. **B1.2 — Consulta com dados financeiros completos (`src/lib/payments/types.ts` e `mercadopago.ts`):**
   - Contrato de `DetalhesPagamento` estendido com:
     - `valorLiquidoCents`: valor líquido recebido pela Áurea (`transaction_details.net_received_amount`).
     - `tarifaCents`: taxa retida pelo gateway (`valorCents - valorLiquidoCents`).
     - `totalPagoCents`: total pago pelo cliente (`transaction_details.total_paid_amount`).
     - `parcelas`: número de parcelas (`installments`).
     - `valorParcelaCents`: valor de cada parcela (`transaction_details.installment_amount`).
     - `dataLiberacao`: timestamp estimado da liberação dos fundos (`money_release_date`).
   - `consultarPagamentoMercadoPago` atualizada para preencher os novos campos tanto na API real quanto no simulador.

4. **B1.3 — Migration 017 e repositório de recebimentos (`aurea.recebimentos_gateway`):**
   - Criada migration `src/server/db/migrations/017_cobrancas_gateway.sql`:
     - Coluna `parcelas_max integer NOT NULL DEFAULT 1` em `aurea.payment_intents`.
     - Atualizada constraint `payment_intents_tipo_operacao_check` com os tipos: `'deposito'`, `'compra_direta'`, `'plano_custodia'`, `'fatura_custodia'`, `'assinatura_custodia'`, `'retirada'`.
     - Criada tabela `aurea.recebimentos_gateway` com índices em `payment_id`, `external_reference`, `user_email` e `competencia`, com RLS ativado.
   - Criado repositório `src/server/payments/recebimentos.ts`:
     - `gravarRecebimento`: inserção idempotente (`ON CONFLICT (payment_id) DO NOTHING`).
     - `buscarRecebimentoPorPaymentId`, `listarRecebimentosPorCompetencia`, `listarTodosRecebimentos`.
     - Adaptador em memória com fallback para testes sem banco.
   - Testes em PGlite cobrindo migration, RLS, constraint de tipo de operação e idempotência (`src/server/db/payments.test.ts`, `recebimentos.test.ts` e `db.test.ts`).

5. **B1.4 — Despachante de conciliação e separação financeira (`src/server/payments/conciliacao.ts`):**
   - `conciliarPagamento` refatorado para usar despachante `LIQUIDADORES: Record<TipoOperacaoPagamento, Liquidador>`:
     - `deposito`: `liquidarDeposito` (credita saldo e gera registro em `deposits`).
     - `compra_direta`: `liquidarCompraDireta` (transfere moedas, credita vendedor e gera `Trade`).
     - `fatura_custodia`, `plano_custodia`, `assinatura_custodia`, `retirada`: tratadores de salvaguarda creditando em saldo até que B2/B3 sejam integrados.
   - Após a mutação atômica do estado (`mutateState`), registra o recebimento detalhado em `aurea.recebimentos_gateway` com `valorBruto`, `tarifaGateway`, `valorLiquido`, `parcelas` e `competencia` (UTC, RA-30, RA-32).

6. **B1.5 — Componente visual reutilizável (`src/components/pagamento/` e CSS):**
   - Criado `src/styles/pagamento.css` e importado em `src/app/globals.css` imediatamente após `account.css`.
   - Criado `src/components/pagamento/PainelPagamento.tsx` e `src/components/pagamento/index.ts`:
     - 3 abas acessíveis: Saldo em conta, Pix, Cartão (até `parcelasMax`x).
     - Alvos de toque de no mínimo 44px (`min-height: 44px`).
     - Saldo insuficiente avisa o valor faltante mas mantém as abas de Pix e Cartão disponíveis.
     - Polling automático a cada 5s via `consultarStatusCobranca`.
     - Tratamento transparente para modo simulado.
   - `ModalDeposito` em `src/components/account/AccountModals.tsx` refatorada para utilizar `<PainelPagamento />`.

7. **B1.6 — Server Action de consulta de status (`src/server/actions/payments.ts`):**
   - Criada Server Action `consultarStatusCobranca(externalReference)`.
   - Validação de sessão e propriedade da intenção (usuário só consulta intenções próprias).
   - Testes unitários passando (`src/server/actions/payments.test.ts`).

---

## 2. Testes e Verificação

- **Typecheck:**
  `npm run typecheck` → 0 erros.
- **Suite de testes unitários e de integração:**
  `npm test` → 51 arquivos de teste aprovados, 368 testes passando, 1 teste pulado (PGlite).
- **Build de produção:**
  `npm run build` → Next.js 15 compilado com sucesso, todas as rotas estáticas e dinâmicas geradas.

---

## 3. Riscos Registrados

- **RA-30**: Gravação de `recebimentos_gateway` fora da transação de estado (`AppState`).
- **RA-32**: Competência contábil de pagamentos calculada em UTC (`competenciaAtual(aprovadoEm)`).
- Documentados em `RISCOS_ASSUMIDOS.md` e `src/lib/payments/ATALHOS.md`.

---

B1 pronta para main
