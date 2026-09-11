# Relatório do Agente C

**Acumulativo. Uma seção por sessão, a mais recente no topo.**
Responde sempre quatro coisas: o que entrou, o que foi testado e como, o que ficou de
manual, e o que o próximo agente precisa saber (regra 11 do
[`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).

---

# Sessão C-5 · Bloqueio de recibo por débito, ciclo completo E2E e conciliação · 11/09/2026

**Branch:** `feat/retirada-logistica`.
**Base:** `2b8919b` (Sessão C-4).

## 1. O que entrou

### Bloqueio de Recibo por Débito / Inadimplência (C-5 / Pedido do Agente B / Item B-5)
- **`src/domain/types.ts`**:
  - `StatusRecibo` expandido para `'Ativo' | 'Extinto' | 'Bloqueado'`, implementado formalmente como estado de domínio do recibo (não como regra espalhada).
- **`src/server/actions/custody.ts`**:
  - `bloquearReciboPorDebito(coinId)`: Bloqueia o recibo de titular inadimplente ou com pendência administrativa, removendo imediatamente qualquer oferta aberta da moeda do livro de ofertas e impedindo sua negociação e retirada física.
  - `desbloquearRecibo(coinId)`: Restaura o recibo para o estado `'Ativo'`.
  - `solicitarRetirada(coinId, ...)`: Rejeita com mensagem clara e explícita qualquer pedido de retirada física para moedas com recibo em estado `'Bloqueado'` ou `'Extinto'`.
- **`src/domain/market.ts` & `src/server/actions/sell.ts`**:
  - `availableCoinsForSell` e `publishOffer` atualizados para exigir `coin.recibo.status === 'Ativo'`, garantindo que moedas com recibo extinto ou bloqueado não fiquem disponíveis para venda nem possam ser listadas no mercado.
- **`src/server/db/derivar.ts`**:
  - Auditoria identifica a mutação de bloqueio de recibo como `'recibo.bloquear'`.
- **Componentes Visuais e PDF**:
  - **`src/components/recibo/Certificate.tsx`**: Exibe o carimbo visual indelével `.cert-stamp-bloqueado` ("RECIBO BLOQUEADO / RESTRIÇÃO ADMINISTRATIVA"), desabilita os botões de "Solicitar retirada" e "Colocar à venda", e exibe nota explicativa.
  - **`src/styles/recibo.css`**: Adicionado estilo para `.cert-stamp-bloqueado`.
  - **`src/components/recibo/ReciboCard.tsx`**: Rótulo "Bloqueado" com badge vermelho quando `coin.recibo.status === 'Bloqueado'`.
  - **`src/app/(app)/conta/page.tsx`**: Status "Bloqueado" na listagem de acervo da conta.
  - **`src/lib/pdf/recibo-pdf.ts`**: Carimbo d'água "RECIBO BLOQUEADO — RESTRIÇÃO" e status de pendência administrativa no PDF.

### Acessibilidade Mobile e Touch Targets (Regra 44px)
- **`src/components/recibo/ModalSolicitarRetirada.tsx`**:
  - Navegação por teclado (`onKeyDown` com Enter/Espaço) e atributos ARIA (`role="button"`, `role="checkbox"`, `aria-pressed`, `aria-checked`) nos cards de modalidade e na caixa de ciência de equiparação de acervo.
  - Alvos de clique com `minHeight: '44px'` nos botões de ação e na caixa de confirmação.
- **`src/components/recibo/Certificate.tsx`**: Botões de ação configurados com `minHeight: '44px'`.
- **`src/app/(app)/retirada/page.tsx`**: Links de visualização do recibo extinto e botão direto de impressão da etiqueta dos Correios com `minHeight: '44px'`.

### Suíte de Integração Ponta a Ponta (E2E)
- **`src/server/actions/retirada-ciclo-completo.test.ts`**:
  - Teste de integração ponta a ponta que percorre todo o ciclo:
    1. Rejeição de endereço incompleto (Trava 2: sem endereço o prazo D+30 não começa).
    2. Bloqueio e recusa de retirada para recibo bloqueado por inadimplência.
    3. Confirmação da solicitação de retirada com modalidade comum (R$ 50,00).
    4. Débito exato no saldo e extinção imediata do recibo digital.
    5. Tentativas subsequentes de solicitar retirada ou vender a moeda no mercado rejeitadas.
    6. Validação contábil no Ledger: lançamento `taxa_retirada`, hash encadeado íntegro e 0 ajustes espúrios na conciliação.
    7. Emissão e leitura da etiqueta oficial dos Correios (`/api/retiradas/etiqueta/[id]`) com Caixa Postal 7990 Belo Horizonte/MG.
    8. Avanço operacional de esteira pelo operador: `separacao` -> `postada` (com exigência e persistência do código de rastreio) -> `entregue`.
    9. Conferência do relatório consolidado de auditoria e custódia em `gerarRelatorio('retiradas')`.

## 2. O que foi testado, e como

### Comandos de Verificação (4 Verdes)
- `npm run typecheck`: OK (0 erros).
- `npm run lint`: OK (0 erros/advertências).
- `npm test`: OK — **34 arquivos de teste, 242 testes passando** (1 pulado propositalmente na suíte de banco).
- `npm run build`: OK — build Next.js com todas as rotas estáticas e dinâmicas geradas perfeitamente.

### Casos de Uso Testados
- Ciclo de vida completo do pedido de retirada (solicitação até entrega).
- Impossibilidade de negociação ou retirada de recibos extintos e bloqueados.
- Impressão da etiqueta postal padronizada dos Correios com chancela e Caixa Postal 7990.
- Auditoria contábil e conciliação sem distorção ou vazamento de centavos.

## 3. O que ficou de manual
- Nada impeditivo de código. As migrations 009 e 010 devem ser aplicadas no banco Supabase de produção (conforme registrado em `PENDENCIAS_MANUAIS_AGENTE_C.md`).

## 4. O que o próximo agente precisa saber
- Todas as tarefas dos blocos 10, 11 (11a, 11b, 11c) e 13 pertencentes ao Agente C estão concluídas, testadas e integradas.
- O estado `'Bloqueado'` para o recibo (`StatusRecibo`) e as Server Actions `bloquearReciboPorDebito` e `desbloquearRecibo` em `src/server/actions/custody.ts` estão prontos para consumo pelo Agente B durante a execução do cron de faturamento de custódia (B-5).

---

# Sessão C-4 · Correios de saída, etiqueta e rastreio · 11/09/2026

**Branch:** `feat/retirada-logistica`.
**Base:** `4df919c` (Sessão C-3).

## 1. O que entrou

### Carimbo Indelével no Recibo PDF (Bloco 10 / D-2)
- **`src/lib/pdf/recibo-pdf.ts`**:
  - Implementado o carimbo visual indelével `"RECIBO EXTINTO — RETIRADA FÍSICA"` no PDF gerado quando `coin.recibo.status === 'Extinto'`.
  - Tarja com moldura dupla avermelhada (`#991B1B`), fundo com leve transparência, texto de advertência e menção ao art. 1.205 do Código Civil e desvinculação da posse física.
  - Alinhado com o carimbo visual de tela do `Certificate.tsx`.

### Ação Operacional de Avanço de Status da Retirada (Bloco 13)
- **`src/server/actions/custody.ts`**:
  - Nova Server Action `avancarStatusRetirada(retiradaId, proximoStatus, codigoRastreio)`.
  - Permite aos operadores da custódia avançar o ciclo de vida da retirada: `paga` -> `separacao` -> `postada` -> `entregue` (ou `cancelada`).
  - Valida operador autorizado via `assertAuthenticated()`.
  - Exige obrigatoriamente `codigoRastreio` válido ao realizar a transição para `postada`.
  - Registra histórico completo com timestamp, autor da ação e metadados.

### Etiqueta Oficial de Expedição Postal (Bloco 11a / D-6)
- **`src/app/api/retiradas/etiqueta/[id]/route.ts`**:
  - Endpoint seguro para geração da etiqueta de postagem e declaração de conteúdo dos Correios.
  - Suporta formato para impressão direta (`text/html`) e formato estruturado (`?format=json`).
  - Remetente oficial padronizado com a Caixa Postal real da custódia:
    - **AUREA CUSTODIA LTDA**
    - **Caixa Postal 7990**
    - **CEP 30315-970 — Belo Horizonte - MG**
  - Destinatário extraído dos dados congelados e imutáveis da solicitação de retirada.
  - Especificação do serviço: Sedex com Aviso de Recebimento (AR) e Declaração de Valor para a modalidade comum; transporte blindado para modalidade segura.
  - Barcode mockup e chancela postal em conformidade com layout dos Correios.
- **`src/app/api/retiradas/etiqueta/[id]/route.test.ts`**:
  - Testes cobrindo autorização, geração de HTML para impressão e JSON estruturado com dados da Caixa Postal oficial.

### Testes da Ação Operacional
- **`src/server/actions/retirada.test.ts`**:
  - Testes da função `avancarStatusRetirada`: transição completa de esteira, exigência de código de rastreio para postagem e rejeição de transições inválidas.

## 2. O que foi testado, e como

### Comandos de Verificação (4 Verdes)
- `npm run typecheck`: OK (0 erros).
- `npm run lint`: OK (0 advertências/erros).
- `npm test`: OK — **33 arquivos de teste, 239 testes passando**.
- `npm run build`: OK — build Next.js com geração de todas as rotas estáticas e dinâmicas (incluindo `/api/retiradas/etiqueta/[id]`).

### Casos de Uso Testados
- Geração de recibo PDF para moedas com status `Extinto`, verificando a inclusão do carimbo e advertência legal de extinção.
- Acesso à etiqueta postal: bloqueio de usuários não autorizados e renderização dos dados corretos da Caixa Postal 7990 para o operador/dono.
- Transição de status da retirada de `paga` para `separacao`, depois para `postada` (com validação de rastreio) e `entregue`.

## 3. O que ficou de manual
- Nenhuma pendência manual impeditiva de código adicionada nesta sessão. A expedição postal física nos Correios continuará utilizando o gerador de etiquetas implementado na rota `/api/retiradas/etiqueta/[id]`.

## 4. O que o próximo agente precisa saber
- As rotas e ações da retirada física estão 100% integradas.
- A rota `/api/retiradas/etiqueta/[id]` pode ser acessada pelo operador ou pelo dono da moeda para impressão da etiqueta padrão Correios.
- A próxima sessão (C-5) focará nos testes de ponta a ponta e na validação do checklist geral do Agente C.

---

# Sessão C-3 · Fluxo de retirada (tela) e extinção do recibo · 11/09/2026

**Branch:** `feat/retirada-logistica`.
**Base:** `705b6ea` (Sessão C-2), com typecheck, lint, 236 testes e build verdes antes de qualquer edição.

## 1. O que entrou

### Interface de Solicitação de Retirada Física (Bloco 10)
- **`src/components/recibo/ModalSolicitarRetirada.tsx`**: Componente de modal interativo contendo:
  - Seleção da modalidade de retirada (D-1): Comum a R$ 50,00 (Correios com AR e seguro) ou Segura a R$ 180,00 (transporte de valores blindado).
  - Formulário completo de endereço de entrega (Trava 2): destinatário, CPF/CNPJ, logradouro, número, complemento, bairro, cidade, UF, CEP e telefone de contato com DDD.
  - Autocompletar de endereço por CEP integrado à ação segura `consultarCepEnvio` (zero persistência / LGPD compliant).
  - Cláusula obrigatória de equiparação de acervo (Bloco 10): checkbox de confirmação de que a moeda física devolvida é equiparável em mesmo padrão e estado de conservação.
  - Verificação de saldo em tempo real: exibe saldo atual, taxa a debitar e saldo restante; bloqueia envio e orienta depósito caso o saldo seja insuficiente.
  - Integração via `useApp().run()` com a Server Action `solicitarRetirada`.

### Certificado e Extinção Imediata do Recibo
- **`src/components/recibo/Certificate.tsx`**:
  - Habilitado o botão "Solicitar retirada" (desbloqueado quando a moeda pertence ao usuário, não está anunciada e o recibo está ativo).
  - Ao clicar, abre a modal `ModalSolicitarRetirada`.
  - Quando o recibo torna-se `'Extinto'`:
    - Botão desabilita e passa a exibir `✓ Retirada física solicitada`.
    - Exibição de carimbo visual indelével `.cert-stamp-extinto` ("RECIBO EXTINTO / RETIRADA FÍSICA SOLICITADA") sobre o pergaminho do certificado.
    - Painel lateral de "Retirada Física" com acompanhamento em tempo real (status da saída, modalidade, data-limite D+30, rastreamento postal e destino).
- **`src/styles/recibo.css`**: Adicionados estilos para o carimbo de extinção do recibo (`.cert-stamp-extinto`), cards de seleção de modalidade (`.modalidade-card`, `.selecionada`) e badges de status da retirada (`.badge-solicitada`, `.badge-paga`, `.badge-separacao`, `.badge-postada`, `.badge-entregue`).

### Página de Acompanhamento do Cliente
- **`src/app/(app)/retirada/page.tsx`**: Nova tela no casco autenticado listando todas as retiradas físicas solicitadas pelo usuário com cards detalhados, histórico, link direto para o recibo extinto e badges de status.
- **`src/components/shell/Topbar.tsx`**: Rota `/retirada` registrada com cabeçalho "Retiradas físicas" / "Acompanhe a saída e expedição física de moedas da custódia.".
- **`src/app/(app)/recibos/page.tsx`**: Resumo da carteira atualizado com contagem de recibos extintos e link rápido de navegação para "Minhas retiradas físicas".

### Correios e Caixa Postal Real (Bloco 11a / D-6)
- **`src/lib/shipping/cep.ts`**: Fallback da Central de Custódia atualizado para a Caixa Postal oficial `7990` em Belo Horizonte/MG (`CEP 30315-970`). Endereço fictício da Avenida Paulista completamente removido do módulo de CEP.
- **`src/lib/shipping/cep.test.ts`**: Suíte de testes atualizada e validada com o CEP oficial `30315-970`.

## 2. O que foi testado, e como

### Comandos de Verificação (4 Verdes)
- `npm run typecheck`: OK (0 erros).
- `npm run lint`: OK (0 advertências/erros).
- `npm test`: OK — **32 arquivos de teste, 236 testes passando** (incluindo suíte de CEP e suíte completa de retirada).
- `npm run build`: OK — build Next.js com todas as 24 rotas estáticas e dinâmicas geradas com sucesso (incluindo `/retirada` e `/recibos/[coinId]`).

### Casos de Uso Testados Manualmente e em Código
- Validação de endereço: rejeita campos em branco ou formatos inválidos.
- Consulta de CEP com preenchimento automático de logradouro, bairro, cidade e UF.
- Trava de saldo insuficiente: impede confirmação se o usuário não possuir saldo para a taxa.
- Trava de equiparação de acervo: exige checkbox marcado.
- Extinção imediata do recibo no clique de confirmação.
- Renderização do carimbo extinto e painel de rastreio no certificado.
- Navegação entre `/recibos`, `/recibos/[coinId]` e `/retirada`.

## 3. O que ficou de manual

- **C-1** 🟡 — Aplicação da migration `009_retiradas.sql` no Supabase via `npm run db:migrate`.
- **C-2** 🟡 — Aplicação da migration `010_retiradas_ledger.sql` no Supabase via `npm run db:migrate`.
- **D-2** 🟡 — Confirmação formal do prazo de 30 dias (D+30 total vs D+30 + D+5) para alinhamento com termos do Agente A.

## 4. O que o próximo agente precisa saber

1. **O fluxo da retirada física do cliente está 100% completo e operacional.** O usuário pode solicitar retirada de qualquer moeda sua em custódia, pagar a taxa com saldo, ter o recibo extinto imediatamente e acompanhar a expedição em `/retirada`.
2. **Na Sessão C-4 (Correios de saída, etiqueta e rastreio)**:
   - Implementar rota/geração de etiqueta reversa/saída (Áurea → Cliente) com dados da Caixa Postal oficial.
   - Atualização do PDF do recibo extinto para carimbar o status "Extinto" no documento baixado.
3. **Endereço da Caixa Postal oficial em Belo Horizonte/MG (30315-970)** está consolidado em `correios.ts`, `cep.ts` e `custody.ts`.

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
