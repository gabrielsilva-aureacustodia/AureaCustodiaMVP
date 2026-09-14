# Relatório de Execução — Agente B · Finalizações

```
Frente:         B — Cobrança e custódia
Branch base:    feat/b-cobranca-e-custodia
Sub-branches:   feat/b1-cobranca-reutilizavel, feat/b2-plano-de-custodia, feat/b3-retirada-e-financeiro (todas concluídas)
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

## 2. Sub-branch B2 — Plano de Custódia e Cobrança Mensal/Anual

**Status:** Concluída, testada e integrada com sucesso (`merge --no-ff` em `feat/b-cobranca-e-custodia`).

### 2.1 O que foi implementado

1. **B2.1 — Correção do defeito de contagem de moedas (`src/domain/custody.ts`):**
   - Criada função `moedasFaturaveis(user): Coin[]` que filtra estritamente moedas cujo recibo não tenha status `'Extinto'`.
   - `gerarFaturaParaUsuario` atualizada para faturar apenas moedas ativas sob custódia, impedindo cobrança indevida de moedas já retiradas fisicamente.

2. **B2.2 — Estrutura de tipos, migration 018 e repositório de planos (`src/domain/types.ts` e `src/server/db/`):**
   - Tipos de domínio: `ModalidadePlanoCustodia` ('mensal' | 'anual'), `StatusPlanoCustodia` ('aguardando_pagamento' | 'vigente' | 'cancelado'), `PlanoCustodia`.
   - Extensões em `FaturaCustodia` (`planoId`, `origem`: 'ciclo_mensal' | 'contratacao' | 'renovacao_anual'), `Envio` (`modalidadeEnvio`: 'PAC' | 'SEDEX'), `Seq` (`planoCustodia`) e `AppState` (`planosCustodia`).
   - Migration `018_planos_custodia.sql` com tabela `aurea.planos_custodia`, colunas `plano_id` e `origem` em `aurea.faturas_custodia`, e coluna `modalidade_envio` em `aurea.envios`.
   - Repositório `src/server/db/repositories/planos.ts` com suporte a PGlite/Postgres e fallback em memória.

3. **B2.3 — Regras de negócio e funções puras de domínio (`src/domain/plano-custodia.ts`):**
   - `valorDoPlano(modalidade, quantidade)`: Mensal R$ 2,00/moeda/mês (1x); Anual R$ 24,00/moeda/ano (até 12x).
   - `somarMeses`, `calcularPagoAte`, `competenciaCoberta`, `moedasCobertas`.
   - `gerarFaturaDoCiclo`: deduz moedas cobertas por planos vigentes ou em renovação anual, evitando faturamento duplicado.
   - `renovacaoAnualDevida`: identifica o 13º mês de planos anuais para cobrança da anuidade seguinte.
   - Testes unitários puros com 27 casos de teste (`src/domain/plano-custodia.test.ts`).

4. **B2.4 — Server Actions, conciliação e ledger contábil:**
   - Adicionado `nextPlanoCode` (sequencial `PLC-000001`).
   - `src/server/actions/plano-custodia.ts`:
     - `contratarPlanoCustodia(protocolo, modalidade)`: idempotente, gera plano e fatura pendente.
     - `pagarFatura`, `pagarFaturaComSaldo`, `iniciarPixFatura`, `iniciarCartaoFatura`.
     - `listarMinhasFaturas` e `listarMeusPlanos`.
   - `liquidarFaturaCustodia` em `src/server/payments/conciliacao.ts`: quita fatura, ativa/renova o plano, registra depósito contábil e reavalia inadimplência.
   - `derivar.ts`: quita faturas no banco e deriva lançamentos contábeis de custódia e estorno.

5. **B2.5 — Vinculação do plano na análise física com estorno de recusas:**
   - `alimentarPlanoNaAnalise`: ao aprovar moedas na análise física dos Correios, preenche `plano.moedaIds`.
   - Em caso de moedas recusadas com plano já pago, calcula estorno integral (`recusadas * valorPorMoeda`), credita imediatamente no saldo do cliente (`user.balance += estorno`) e registra em `plano.estornadoCents`.
   - Chamado tanto em `fecharAnalise` quanto em `advanceAnalysis`.

6. **B2.6 — Ciclo de faturamento e renovação anual:**
   - `processarCicloFaturamento` em `src/server/custodia/faturamento.ts` atualizado para chave composta `${email}#${competencia}#${origem}`.
   - Executa renovações anuais devidas antes do ciclo mensal, garantindo que moedas cobertas não sofram cobrança avulsa.
   - Tentativa de débito automático em saldo para ambas as origens.

7. **B2.7 — Frontend do wizard de envio e tela de faturas:**
   - Wizard de envios (`src/app/(app)/envios/page.tsx` e `WizardSteps.tsx`):
     - Trilha expandida para 5 passos: Moeda, Protocolo, Plano, Correios, Análise.
     - Passo 3 exibe cartões interativos de Plano Mensal (R$ 2,00/mês) e Plano Anual (R$ 24,00/ano, badge "Mais escolhido" e "12x sem juros").
     - `PainelPagamento` integrado inline (Saldo, Pix ou Cartão) e botão secundário "Pagar depois" (avança direto para a postagem mantendo fatura pendente).
     - Salva `modalidadeEnvio` ('PAC' | 'SEDEX') no protocolo.
     - Retomada inteligente: envios sem plano abrem no passo 3; com plano, no passo 4; demais etapas, no passo 5.
   - Tela Minha Conta › Faturas (`src/app/(app)/conta/faturas/page.tsx`):
     - Componente `FaturasCustodia.tsx` com visualização de faturas (status Paga, Pendente, Em atraso, Cancelada) e botão "Pagar fatura" acionando o `PainelPagamento`.
     - Aba de planos de custódia ativos, vigência, moedas cobertas e estornos.
     - Atalho adicionado em Minha Conta (`src/app/(app)/conta/page.tsx`).

8. **B2.8 — Débito automático recorrente no Mercado Pago:**
   - `ativarDebitoAutomatico` em `src/lib/payments/mercadopago.ts` com integração via `POST /preapproval` (e modo simulado em ambiente de teste).
   - `liquidarAssinaturaCustodia` em `src/server/payments/conciliacao.ts` atualizando `plano.assinaturaId`, vigência e faturas.

---

## 3. Sub-branch B2 — Testes e Verificação

- **Typecheck:** `npm run typecheck` → 0 erros.
- **Vitest:** `npm test` → 53 arquivos de teste, 414 testes passando, 1 pulado.
- **Build de produção:** `npm run build` → 27 rotas compiladas e estáticas/dinâmicas geradas com sucesso.
- **Sub-branch B2 mesclada em `feat/b-cobranca-e-custodia` com commit de merge `--no-ff`.**

---

## 4. Sub-branch B3 — Retirada Física e Financeiro

**Status:** Concluída, testada e integrada com sucesso (`merge --no-ff` em `feat/b-cobranca-e-custodia`).

### 4.1 O que foi implementado

1. **B3.1 — Retirada em duas fases (`solicitarRetirada` e `pagarRetirada`):**
   - Na **Fase 1 (solicitação)**:
     - `solicitarRetirada` cria o registro com status `'solicitada'`, congela o endereço e gera o código de retirada.
     - **Não** exige saldo prévio e **não** extingue o recibo de custódia preventivamente (o cliente pode pagar depois).
     - Enquanto estiver em `'solicitada'`, a moeda é excluída de `availableCoinsForSell` no marketplace.
     - O cliente pode cancelar a solicitação antes do pagamento via `cancelarSolicitacaoRetirada`, liberando a moeda de volta ao mercado.
   - Na **Fase 2 (pagamento)**:
     - Pagamento disponível por **Saldo em conta**, **Pix** ou **Cartão de crédito** (com até 2x para modalidade segura e 1x para modalidade comum).
     - Ações dedicadas: `pagarRetiradaComSaldo`, `iniciarPixRetirada`, `iniciarCartaoRetirada` e despachante unificado `pagarRetirada`.
     - Ao confirmar o pagamento: o recibo de custódia é extinto imediatamente (`coin.recibo.status = 'Extinto'`), o status avança para `'paga'`, e o prazo D+30 é **recalculado a partir da data de confirmação do pagamento (`agora`)**, e não da data da solicitação.

2. **B3.2 — Migration 019 e repositório de retiradas (`aurea.retiradas`):**
   - Criada migration `src/server/db/migrations/019_retirada_paga.sql`:
     - Adicionadas colunas `forma_pagamento text`, `payment_intent_ref text` e `parcelas integer NOT NULL DEFAULT 1`.
   - Atualizado repositório `src/server/db/repositories/retiradas.ts` para persistir e mapear os novos campos e suportar recálculo de `data_limite_d30`.

3. **B3.3 — Conciliação e Ledger contábil de retirada:**
   - Em `src/server/payments/conciliacao.ts`: implementado `liquidarRetirada`, que extingue o recibo, recalcula D+30, avança status para `'paga'` e registra entrada contábil em `s.deposits`.
   - Em `src/server/db/derivar.ts`: taxa de retirada (`taxa_retirada`) derivada no momento da transição para `'paga'` com `valorTaxaCents`, garantindo fechamento sem ajustes espúrios.

4. **B3.4 — Tarifas de gateway e DRE automática:**
   - Em `src/domain/dre.ts`: a conta `4.1.07` (*Despesas com gateway e tarifas financeiras*) foi configurada com `automatica: true`.
   - Popula automaticamente a partir de `aurea.recebimentos_gateway` (`tarifaGateway`), permitindo segregação total entre receita bruta, tarifas do Mercado Pago e valor líquido.

5. **B3.5 — Regime de competência contábil para custódia (`src/domain/competencia.ts`):**
   - Implementadas as funções puras de apropriação:
     - `mesNoPeriodo(mes, inicio, fim)`
     - `apropriacaoPlanoAnual(plano, inicio, fim)`: apropria 1/12 do plano anual por mês do período coberto, alocando o resíduo no 12º mês para fechar exatamente o valor total em centavos.
     - `receitaDeCustodiaNoPeriodo`: consolida receita de planos mensais e anuais por competência, evitando dupla contagem com faturas avulsas.
     - `calcularReceitaDiferida(plano)`: calcula saldo já apropriado, saldo a apropriar e meses restantes.
   - DRE atualizada para calcular a receita de custódia estritamente por competência contábil.
   - Cobertura com 9 testes unitários dedicados em `src/domain/competencia.test.ts`.

6. **B3.6 — 4 novos relatórios e documentação:**
   - Adicionados a `NOMES_RELATORIOS` e documentados em `docs/API_RELATORIOS.md`:
     1. `recebimentos-gateway`: registro de pagamentos pelo gateway Mercado Pago com bruto, tarifa e líquido.
     2. `planos-custodia`: lista analítica de planos contratados, vigência e moedas cobertas.
     3. `receita-diferida`: apropriação e saldos a apropriar de planos anuais.
     4. `faturas-custodia`: faturas emitidas com competência, origem, vencimento e status.
   - Implementados em `src/server/relatorios/dados.ts` e cobertos por testes em `src/server/relatorios/relatorios-b3.test.ts`.

7. **B3.7 — Interface do usuário:**
   - `src/components/recibo/ModalSolicitarRetirada.tsx`:
     - Modal em duas etapas com `<PainelPagamento />` integrado.
     - Botão "Pagar depois" para concluir o pedido sem bloquear o cliente sem saldo.
     - Exportado `ModalPagarRetirada` para pagamento posterior direto da lista de retiradas.
   - `src/app/(app)/retirada/page.tsx`:
     - Para retiradas aguardando pagamento (`status === 'solicitada'`), exibe botões "Pagar taxa" e "Cancelar solicitação" com confirmação.

---

## 5. Resumo Geral da Frente B

Todas as três sub-branches da Frente B foram concluídas, testadas e integradas com sucesso na branch base `feat/b-cobranca-e-custodia`:
- **B1**: Cobrança reutilizável (Mercado Pago, Pix, Cartão, PainelPagamento, migration 017 e separação financeira).
- **B2**: Planos de custódia mensal e anual (wizard de envio, migration 018, faturamento mensal, débito automático recorrente).
- **B3**: Retirada física em duas fases, regime de competência contábil, DRE com tarifas de gateway e 4 novos relatórios financeiros.

### Verificação Final Consolidada
- **Typecheck:** `npm run typecheck` → 0 erros.
- **Vitest:** `npm test` → 55 arquivos de teste, 433 testes passando, 1 teste pulado (PGlite condicional).
- **Build de Produção:** `npm run build` → 27 rotas geradas com sucesso sem erros.
- **Merge:** `feat/b3-retirada-e-financeiro` mesclada em `feat/b-cobranca-e-custodia` com `--no-ff`.


