# Relatório do Agente C

**Acumulativo. Uma seção por sessão, a mais recente no topo.**
Responde sempre quatro coisas: o que entrou, o que foi testado e como, o que ficou de
manual, e o que o próximo agente precisa saber (regra 11 do
[`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).

---

# Sessão C-2 · Fluxo no servidor, ledger de taxa de retirada e auditoria · 10/09/2026

**Branch:** `feat/retirada-logistica`.
**Base:** `c0ad95f` (Sessão C-1), com typecheck, lint, 228 testes e build verdes antes de qualquer edição.

## 1. O que entrou

### Ledger Contábil e Invariantes do Bloco 13
- **`src/domain/ledger.ts`**: Adicionado `'taxa_retirada'` ao tipo `TipoLancamentoLedger` e criada a função pura `lancamentoDeTaxaRetirada(...)` com sinal estrito `-1` (débito de BRL no saldo do usuário).
- **`src/server/db/migrations/010_retiradas_ledger.sql`**: Migration ajustando a constraint `CHECK` de `aurea.ledger_entries.tipo` para incluir `'taxa_retirada'`.
- **`src/server/db/derivar.ts`**: Atualizado o motor de reconciliação de estado para detectar se a alteração de saldo decorre de solicitação de retirada física com recibo extinto (`'taxa_retirada'`), evitando lançamentos espúrios de `'ajuste'` e vinculando na auditoria a ação `'retirada.solicitar'`.

### Repositório e Camada de Persistência
- **`src/server/db/repositories/retiradas.ts`**: Funções de repositório contra Postgres/PGlite com transações protegidas:
  - `inserirRetirada`
  - `atualizarRetirada`
  - `buscarRetiradaPorId`
  - `buscarRetiradasPorUsuario`
  - `buscarRetiradaPorCoinId`
  - `listarTodasRetiradas`
- **`src/server/shipping/retiradas.ts`**: Serviço de persistência no servidor (`IRepositorioRetiradas`) com resolução automática entre banco real (`PostgresRetiradas`) e fallback seguro para ambiente de teste/memória (`RepositorioRetiradasMemoria`).

### Server Actions de Custódia
- **`src/server/actions/custody.ts`**:
  - Implementada a Server Action `solicitarRetirada(coinId, modalidade, endereco)`:
    - Autenticação obrigatória via sessão.
    - Validação de propriedade da moeda pelo usuário solicitante.
    - Verificação de oferta de venda ativa no livro de ordens (recusa se a moeda estiver anunciada).
    - Validação estrita de status do recibo (recusa se já estiver `'Extinto'`).
    - Validação de endereço completo (Trava 2).
    - Validação e cálculo de saldo para débito da taxa correspondente (D-1: R$ 50 comum, R$ 180 segura).
    - Transição atômica e irreversível do recibo da moeda para `'Extinto'`.
    - Débito do saldo contábil da taxa e registro da retirada com prazo D+30 e histórico inicial.
  - Implementadas `obterMinhasRetiradas()` e `obterRetiradaPorCoin(coinId)`.
  - Corrigido o CEP da Central de Custódia para `30315-970` (Belo Horizonte/MG) conforme D-6.

### Relatórios do Painel de Custódia e Auditoria (Bloco 11)
- **`src/server/relatorios/dados.ts`**: Registrado o relatório `'retiradas'` na lista oficial de relatórios do sistema, acessível via `/api/relatorios/retiradas`, emitindo visão analítica completa de todas as retiradas para os sócios e auditores.

## 2. O que foi testado, e como

### Comandos de Verificação (4 Verdes)
- `npm run typecheck`: OK (0 erros).
- `npm run lint`: OK (0 advertências/erros).
- `npm test`: OK — **32 arquivos de teste, 236 testes passando** (14 testes unitários e de integração novos em `src/server/actions/retirada.test.ts` e testes de banco em `src/server/db/db.test.ts`).
- `npm run build`: OK — build Next.js bem-sucedido com todas as rotas estáticas e dinâmicas compiladas.

### Cobertura Específica de Testes
- **`src/server/actions/retirada.test.ts`**:
  - Solicitação bem-sucedida com débito da taxa e recibo tornando-se `'Extinto'` imediatamente.
  - Recusa de solicitação para usuário não autenticado.
  - Recusa se a moeda pertencer a outro usuário.
  - Recusa se a moeda estiver listada em oferta de venda (`sellOffers`).
  - Recusa se o recibo já estiver extinto (idempotência/proteção contra gasto duplo).
  - Recusa com endereço incompleto ou inválido (Trava 2).
  - Recusa se saldo em BRL for insuficiente para cobrir a taxa.
  - Testes de consulta (`obterMinhasRetiradas` e `obterRetiradaPorCoin`).
  - Emissão e estrutura do relatório em `relatorioRetiradas()`.
- **`src/server/db/db.test.ts`**:
  - Inserção, busca por id, busca por usuário e atualização de status em tabela Postgres via PGlite.

## 3. O que ficou de manual

- **C-1** 🟡 — Aplicação da migration `009_retiradas.sql` no banco Supabase.
- **C-2** 🟡 — Aplicação da migration `010_retiradas_ledger.sql` no banco Supabase (atualização da constraint CHECK do ledger para aceitar `taxa_retirada`).

## 4. O que o próximo agente precisa saber

1. **`solicitarRetirada` já é a Server Action pronta para o botão da tela.** Na Sessão C-3, basta ligá-la ao modal/formulário em `Certificate.tsx` / `ReciboModal.tsx` e às telas de listagem em `src/app/(app)/retirada/` ou `src/app/(app)/envios/`.
2. **O ledger reconhece a taxa sem ajuste espúrio.** Qualquer débito de taxa de retirada feito com recibo extinto gera lançamento com hash encadeado perfeito.
3. **A migration 010 complementa a 009.** Nenhuma alteração foi feita em arquivos dos Agentes A e B.

---

# Sessão C-1 · Modelo e máquina de estados da retirada · 10/09/2026

**Branch:** `feat/retirada-logistica`.
**Base:** `f7a5e8c`, com typecheck, lint, 197 testes e build verdes antes de qualquer edição.

## 1. O que entrou

### Modelo de Domínio e Tipos
- **`src/domain/types.ts`**: Adicionado bloco anexado estritamente ao final do arquivo (`/* === Publicação · Agente C === */`) com os tipos:
  - `ModalidadeRetirada`: `'comum' | 'segura'` (D-1)
  - `StatusRetirada`: `'solicitada' | 'paga' | 'separacao' | 'postada' | 'entregue' | 'cancelada'`
  - `EnderecoEntrega`: snapshot completo congelado do destinatário no ato da solicitação
  - `EventoHistoricoRetirada`: registro de cada transição de estado, motivo e autor
  - `Retirada`: interface agregadora do ciclo de vida da saída do item

### Regras de Negócio e Máquina de Estados Pura
- **`src/domain/retirada.ts`**: Camada de domínio pura (sem dependências de servidor, I/O ou React):
  - **Preços fechados (D-1)**: `TAXA_RETIRADA_COMUM_CENTS = 5000` (R$ 50,00) e `TAXA_RETIRADA_SEGURA_CENTS = 18000` (R$ 180,00). Sem float, centavos inteiros (`Cents`).
  - **Prazo isolado (D-2)**: `PRAZO_RETIRADA_DIAS = 30`. Prazo D+30 mantido em constante única.
  - **Trava de Endereço (Trava 2)**: `validarEnderecoRetirada()` exige destinatário, documento válido (11 ou 14 dígitos), logradouro, número, bairro, cidade, UF de 2 letras, CEP de 8 dígitos e telefone com DDD. Sem endereço válido, o pedido não nasce e o prazo D+30 não começa a contar.
  - **Máquina de Estados**: `podeTransicionarRetirada()` e `transicionarRetirada()`. Fluxo estrito imutável (`solicitada -> paga -> separacao -> postada -> entregue`), suportando cancelamento em `solicitada` e `paga`. Bloqueia saltos e regressões ilegais. Exige código de rastreamento postal para atingir o estado `postada`.

### Banco de Dados
- **`src/server/db/migrations/009_retiradas.sql`**:
  - Tabela `aurea.retiradas` com campos tipados, foreign keys para `aurea.coins(id)` e `aurea.users(email)`, checks de modalidade/status, campos de auditoria e índices.
  - Row Level Security (RLS) habilitada por padrão.
- **`src/server/db/db.test.ts`**: Atualizado para incluir `retiradas` no `TRUNCATE` de limpeza da suíte de testes PGlite e na asserção alfabética de tabelas protegidas.

### Resolução da Decisão D-6 (Correios)
- **`src/lib/shipping/correios.ts`**: `ENDERECO_CENTRAL_AUREA` atualizado com o endereço oficial fornecido no **Termo de Assinatura de Caixa Postal dos Correios**:
  - AUREA CUSTODIA LTDA
  - CNPJ: 68.071.452/0001-06
  - Caixa Postal 7990
  - AGF Bandeirantes (Av. dos Bandeirantes)
  - Belo Horizonte - MG, CEP 30315-970
  - O endereço fictício da "Avenida Paulista" foi completamente eliminado do código.

## 2. O que foi testado, e como

### Comandos de Verificação
- `npm run typecheck`: OK (0 erros de tipagem).
- `npm run lint`: OK (código em conformidade).
- `npm test`: OK — **32 arquivos de teste, 228 testes passando** (24 testes novos em `src/domain/retirada.test.ts`).
- `npm run build`: OK — compilação Next.js completa com geração estática das rotas.

### Testes Automatizados da Retirada (`retirada.test.ts`)
- Cálculo de taxa comum e segura (5000 e 18000 cents).
- Cálculo exato da data-limite D+30 em milissegundos.
- Validação estrita de cada campo do endereço (rejeição de campos em branco, CEP incorreto, UF inválida, telefone curto).
- Fluxo de ponta a ponta: `solicitada -> paga -> separacao -> postada -> entregue`.
- Rejeição de transição para `postada` sem código de rastreio.
- Rejeição de saltos ou regressões inválidas.
- Acúmulo imutável do histórico de eventos em cada etapa.

## 3. O que ficou de manual

Registrado em [`PENDENCIAS_MANUAIS_AGENTE_C.md`](PENDENCIAS_MANUAIS_AGENTE_C.md):
- **D-6** ✅ — **RESOLVIDO**: Caixa Postal 7990 em Belo Horizonte/MG configurada em `correios.ts`.
- **D-2** 🟡 — Definição se o prazo exibido é D+30 total ou D+30 + D+5. (Isolado em constante, não trava desenvolvimento).
- **C-1** 🟡 — Aplicação da migration `009_retiradas.sql` no Supabase via `npm run db:migrate`.

## 4. O que o próximo agente precisa saber

1. **A migration da retirada é a 009.** As faixas reservadas no plano executivo (Agente B = 007 a 008, Agente C = 009 a 011) estão preservadas.
2. **`retirada.ts` é 100% puro.** Qualquer integração com persistência, Server Actions ou envio de e-mails deve ser feita na camada `src/server/` (Sessão C-2).
3. **Endereço da Central de Custódia é a Caixa Postal 7990 em Belo Horizonte/MG.** Não recriar mock da Paulista em testes ou novas rotas.
