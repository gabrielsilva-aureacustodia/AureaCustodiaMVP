# Relatório de Execução — Agente B

**Frente de Cadastro, Conta e Dinheiro / Custódia e Contábil**  
Branch: `feat/cadastro-financeiro`  
Repositório: `github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP`

---

## Sessões B-5 e B-6 — Faturamento mensal de custódia (`migration 010`), cron, inadimplência e DRE consolidada
**Data:** 11/09/2026  
**Status:** Concluída com sucesso

### 1. O que entrou
- **Taxa de custódia unificada no domínio (Decisão D-3, 10/09/2026):**
  - `src/domain/fees.ts`:
    - Adicionada constante oficial `CUSTODIA_MENSAL_POR_MOEDA_CENTS = 200` (R$ 2,00/moeda/mês).
    - Adicionada constante `CUSTODIA_ANUAL_POR_MOEDA_CENTS = 2400` (R$ 24,00/moeda/ano em até 12x).
    - Funções puras `custodiaMensalPorMoeda(qtd)` e `custodiaAnualPorMoeda(qtd)`.
    - `custodyFeeForCount` mantido como alias compatível direcionando para `custodiaMensalPorMoeda`.
  - `src/domain/types.ts`:
    - Adicionado `StatusFatura` ('paga' | 'pendente' | 'atrasada' | 'cancelada') e `FormaPagamentoFatura` ('saldo' | 'pix' | 'cartao').
    - Adicionada interface `FaturaCustodia` e campo `faturasCustodia?: FaturaCustodia[]` no `AppState`.
    - Adicionada flag `inadimplente?: boolean` na interface `User`.
- **Domínio de custódia e inadimplência (`src/domain/custody.ts` e `src/domain/custody.test.ts`):**
  - Funções puras: `competenciaAtual`, `calcularVencimentoFatura` (D+10 dias de tolerância), `gerarFaturaParaUsuario`, `verificarStatusFatura` e `isInadimplente`.
  - 12 testes unitários passando cobrindo cálculo por moeda ativa, tolerância e inadimplência.
- **DRE Consolidada com 4 fontes de receita (`src/domain/dre.ts` e `src/domain/dre.test.ts`):**
  - Adicionadas as contas `3.1.03` (*Receita de tarifas de saque*) e `3.1.04` (*Receita de tarifas de retirada física*) ao `PLANO_DE_CONTAS`.
  - Em `montarDre`: cálculo e segregação das quatro receitas (`receitaComissoes`, `receitaCustodia`, `receitaTaxaSaque`, `receitaTaxaRetirada`) totalizando `receitaBruta`.
  - Testes passando comprovando a segregação das 4 receitas no ledger.
- **Banco de Dados e Persistência (Migration 010):**
  - `src/server/db/migrations/010_faturamento_custodia.sql`:
    - Adição da coluna `inadimplente boolean NOT NULL DEFAULT false` na tabela `aurea.users`.
    - Criação da tabela `aurea.faturas_custodia` com restrições e unicidade `(user_email, competencia)`.
    - RLS ativado (`ENABLE ROW LEVEL SECURITY`).
  - `src/server/db/repositories/faturas.ts`: repositório com `carregarFaturas`, `inserirFatura`, `atualizarFatura`, `buscarFaturasPorUsuario` e `buscarFaturaPorId`.
  - `src/server/db/repositories/users.ts`: persistência e leitura da coluna `inadimplente`.
  - `src/server/db/diff.ts` e `src/server/db/repositories/state.ts`:
    - Operações de diff `fatura.inserir` e `fatura.atualizar`, normalização canônica e inclusão no `carregarEstado` e `executarOperacao`.
  - `src/server/db/derivar.ts`:
    - Quando fatura é quitada com saldo em conta (`user.balance -= valor`), gera lançamento contábil `custodia` com `sinal = -1`.
    - **Invariante contábil:** fechamento rigoroso em 0 centavos de ajuste espúrio.
  - `src/server/db/db.test.ts`: inclusão de `faturas_custodia` no `TRUNCATE`, verificação de RLS e teste de ciclo de vida completo no PGlite.
- **Serviço de Faturamento, Server Actions e Cron Job:**
  - `src/server/custodia/faturamento.ts`:
    - `processarCicloFaturamento`: loop mensal idempotente, varredura de usuários, emissão de faturas, débito automático em saldo, régua de tolerância e marcação de inadimplência.
    - `pagarFaturaCustodiaComSaldo`: quitação manual de fatura pendente com saldo disponível e desmarcação automática de inadimplência.
  - `src/server/actions/custody.ts`: inclusão da Server Action `pagarFaturaCustodia`.
  - `src/app/api/cron/faturamento/route.ts`: endpoint do cron protegido por `CRON_SECRET`.
  - `vercel.json`: agendamento configurado `"0 8 1 * *"` para `/api/cron/faturamento`.
- **Documentação e Tutoriais:**
  - `docs/tutoriais/TUTORIAL_FATURAMENTO_CUSTODIA.md`: guia detalhado das regras de faturamento, invariante contábil, inadimplência e cron.
  - `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`: item B-5 registrado para a migration 010.

### 2. O que foi testado e como
- **Testes de Taxas e Domínio (`src/domain/fees.test.ts` e `src/domain/custody.test.ts`):** 16 testes unitários.
- **Testes de Serviço (`src/server/custodia/faturamento.test.ts`):** 5 testes cobrindo débito automático, pendência por saldo insuficiente, idempotência, vencimento e quitação com saldo.
- **Testes da DRE Consolidada (`src/domain/dre.test.ts`):** 6 testes validando o reconhecimento das 4 fontes de receita.
- **Testes de Integração em Banco Real PGlite (`src/server/db/db.test.ts`):** 25 testes passando incluindo a migration 010, RLS e persistência de faturas.

---

## Sessão B-4 — Saque de recursos (`migration 009`), liquidação manual (RA-30) e relatórios
**Data:** 11/09/2026  
**Status:** Concluída com sucesso

### 1. O que entrou
- **Taxa e prazo de saque no domínio:**
  - `src/domain/fees.ts`: exportada a constante oficial `TAXA_SAQUE_FIXA_CENTS = 500` (R$ 5,00).
  - `src/domain/dates.ts`: adicionada a constante `PRAZO_SAQUE_DIAS = 3` e a função pura `calcularDataLimiteSaque` (com retorno de timestamp e data formatada DD/MM/AAAA).
  - `src/domain/types.ts`: tipo `StatusSaque` ('solicitado' | 'em_processamento' | 'pago' | 'falhou'), interface `Saque` e campo `saques?: Saque[]` no `AppState`.
  - `src/domain/ledger.ts`: expansão de `LedgerTipo` com `'saque' | 'taxa_saque' | 'taxa_retirada'`, e geradores puros `lancamentoDeSaque` (-valorLiquido) e `lancamentoDeTaxaSaque` (-taxa).
  - `src/domain/statement.ts`: adicionado `'Saque'` a `StatementKind`, campo `sacado` em `StatementTotals`, mapeamento dos saques no extrato do usuário (`userStatement`) e acumulação nos totais.
- **Banco de dados e persistência (Migration 009):**
  - `src/server/db/migrations/009_saques.sql`: criação da tabela `aurea.saques` com restrições (`valor_total > taxa`, `taxa = 500`, `valor_liquido = valor_total - taxa`), índices por usuário e status, e atualização do `CHECK` de tipos em `aurea.ledger_entries`.
  - `src/server/db/repositories/saques.ts`: repositório completo com `carregarSaques`, `inserirSaque`, `atualizarSaque` e `buscarSaquePorId`.
  - `src/server/db/diff.ts`: normalização de saques, operações `saque.inserir` e `saque.atualizar`, e inclusão no planejamento de diff.
  - `src/server/db/repositories/state.ts`: carregamento de saques via `carregarSaques` em `carregarEstado` e execução das operações de saques em `executarOperacao`.
  - `src/server/db/derivar.ts`: geração atômica dos lançamentos contábeis `saque` (-líquido) e `taxa_saque` (-R$ 5,00) a partir de saques novos, e registro de auditoria.
  - **Invariante contábil comprovada:** Débito de saldo = `-(valorLiquido + taxa)`. A diferença fecha em 0 centavos, com exatamente zero lançamentos de `ajuste` espúrio.
- **Server Actions de Saque em `src/server/actions/account.ts`:**
  - `solicitarSaque(valorCents)`: valida sessão, dados bancários cadastrados (`temDadosBancarios(u)`), valor mínimo (R$ 5,01), saldo suficiente, debita saldo imediatamente e registra saque no estado.
  - `listarMeusSaques()`: lista histórico de saques do usuário logado ordenados por data.
  - `confirmarLiquidacaoSaque(saqueId, comprovanteRef)`: confirmação operacional da transferência Pix pelo sócio (RA-30).
  - `rejeitarSaque(saqueId, motivo)`: cancelamento/recusa com estorno integral imediato do saldo para a conta do usuário e auditoria.
- **Interface e Experiência do Cliente:**
  - `src/components/account/AccountModals.tsx`:
    - `ModalSaque`: modal completo com valor dinâmico, exibição do saldo disponível, cálculo instantâneo da taxa fixa (R$ 5,00) e do valor líquido, destino bancário com atalho para edição, data de liquidação prevista D+3 e validações amigáveis de saldo.
    - Se o usuário não tiver dados bancários cadastrados, apresenta aviso orientador com botão direto para cadastrar.
    - Mantido `ModalSaqueInfo` como alias para retrocompatibilidade.
  - `src/app/(app)/conta/page.tsx`:
    - Botão "Sacar" conectado à `ModalSaque` e ao fluxo guiado de cadastro bancário.
    - Painel visual de saques em andamento com valor líquido, previsão D+3 e status atual.
  - `src/app/(app)/conta/extrato/page.tsx`:
    - Filtro `'Saques'` adicionado aos filtros da tela.
  - `src/lib/export/statement-export.ts`:
    - Adicionado indicador `'Total sacado'` na aba Resumo do extrato XLSX.
- **Relatórios Operacionais e Fila de Liquidação (RA-30):**
  - `src/server/relatorios/dados.ts`: implementado relatório `'saques'` (`Solicitações de saque`) com todas as colunas exigidas e valores em reais.
  - `docs/API_RELATORIOS.md`: documentação atualizada com a nova rota `/api/relatorios/saques`.
  - `docs/tutoriais/TUTORIAL_GATEWAY_SAQUE.md`: tutorial detalhado do procedimento operacional do sócio para conferência de fila, realização de Pix de mesma titularidade estrita e confirmação/estorno na plataforma.

### 2. O que foi testado e como
- **Testes das Server Actions (`src/server/actions/saque.test.ts`):**
  - 7 testes cobrindo rejeição sem sessão, validação de valor (inteiro, > 500, positivo), trava por ausência de dados bancários, trava de saldo insuficiente, débito de saldo e gravação de prazo D+3, confirmação de liquidação com comprovante e rejeição com estorno integral de saldo.
- **Testes de Contabilidade e Invariante do Ledger (`src/server/db/derivar.test.ts`):**
  - Comprova a geração atômica dos lançamentos `saque` e `taxa_saque` e garante 0 centavos de ajuste.
- **Testes de Diff e Persistência em Banco Real (`src/server/db/diff.test.ts` e `src/server/db/db.test.ts`):**
  - Testes do diff para `saque.inserir` e `saque.atualizar`.
  - Teste de ciclo de vida completo no PGlite (Postgres WebAssembly): criação, aplicação da migration 009 com RLS, inserção, alteração de status e recarga idêntica.
- **Testes de Relatórios (`src/server/relatorios/saques.test.ts`):**
  - Validação da estrutura de colunas, conversão de centavos para reais e formatação de dados bancários.
- **Verificação completa de integridade dos 4 Verdes:**
  - `npm run typecheck`: ✅ verde (0 erros)
  - `npm run lint`: ✅ verde (0 erros, 0 warnings)
  - `npm test`: ✅ 37 suítes, 251 testes passando
  - `npm run build`: ✅ 23 páginas estáticas e todas as rotas compiladas com sucesso

### 3. O que ficou de manual
- Registrar aplicação da migration `009_saques.sql` no Supabase antes do cutover em produção (`PENDENCIAS_MANUAIS_AGENTE_B.md`).
- Operação da fila manual de liquidação Pix em D+3 pelo sócio (RA-30), orientada por `docs/tutoriais/TUTORIAL_GATEWAY_SAQUE.md`.

### 4. O que o próximo agente precisa saber
- O fluxo de saque de recursos está 100% ativo, testado e auditado contabilmente.
- O cliente consegue tanto depositar e comprar quanto sacar seu saldo disponível a qualquer momento com prazo D+3.
- Na próxima sessão (B-5), implementaremos o Faturamento mensal de custódia (R$ 10,00 ou 0,1%), cobrança por cartão/Pix, régua D+30/D+60 e inadimplência.

---

## Sessão B-3 — Compra direta pelo gateway (`migration 008`)
**Data:** 11/09/2026  
**Status:** Concluída com sucesso

### 1. O que entrou
- **Migration `008_compra_direta.sql` em `src/server/db/migrations/`:**
  - Adiciona colunas `tipo_operacao text NOT NULL DEFAULT 'deposito'` e `metadata jsonb` à tabela `aurea.payment_intents`.
  - Permite distinguir no banco a finalidade de cada intenção de pagamento gerada no gateway.
- **Tipos e repositórios de pagamentos:**
  - `src/server/payments/tipos.ts`: exportada a interface `CompraDiretaIniciada` estendendo `DepositoIniciado` com `lotId`, `qty` e `tipoMoeda`.
  - `src/server/db/repositories/payments.ts`: adicionado `TipoOperacaoPagamento` ('deposito' | 'compra_direta'), atualizada interface `IntencaoDeposito` com `tipoOperacao` e `metadata`, e atualizadas as queries `inserirIntencao`, `buscarIntencao`, `reivindicarIntencao` e `listarTodasIntencoes`.
  - `src/server/payments/repositorios.ts`: persistência em memória atualizada com suporte a `tipoOperacao` e `metadata`.
- **Server Action `iniciarCompraDireta` em `src/server/actions/payments.ts`:**
  - Permite ao comprador gerar cobrança de compra direta de um lote via Pix ou Checkout Pro (sandbox).
  - Trava de cadastro formal do Bloco 6: exige `temCadastroCompleto(user)` antes de abrir a cobrança.
  - Validações de segurança: lote ativo no livro, vendedor diferente do comprador, quantidade válida, valor até o limite permitido.
  - Gera referência externa identificadora com prefixo `CMP-${randomUUID()}`.
  - Registra a intenção de compra direta com metadata (`lotId`, `qty`, `tipoMoeda`, `sellerEmail`, `unitPrice`).
- **Conciliação contábil do webhook em `src/server/payments/conciliacao.ts`:**
  - Identifica compras diretas pelo tipo de operação ou prefixo `CMP-`.
  - Se o lote estiver disponível:
    - Transfere a moeda (`transferCoin(seller, buyer, coinId)`).
    - Credita o vendedor pelo valor líquido (`price - tradeFee(price)`).
    - Registra a negociação em `state.trades` com comprador, vendedor, preço e quantidade.
    - Registra a entrada externa da compra em `state.deposits`, garantindo que o saldo livre do comprador permaneça inalterado e o livro contábil feche com 100% de consistência sem desvios (`ajustes`).
  - Se o lote não estiver mais disponível (corrida em que outro comprador levou o lote enquanto o Pix era pago):
    - Mecanismo anti-perda: credita o valor integral no saldo da conta do comprador (`buyer.balance += valor`) com lançamento em `state.deposits`, permitindo que o cliente use o dinheiro em outro lote ou solicite saque.
- **Interface e fluxo de compra em `src/app/(app)/mercado/page.tsx` (`ConfirmarCompraModal`):**
  - Implementado o modelo pedido pelos sócios ("ou ele pode usar o que está na conta dele ou pode comprar por fora"):
    - Opção 1 (Saldo interno): exibe saldo disponível e permite pagar com saldo se houver fundos suficientes, ou avisa o déficit caso insuficiente.
    - Opção 2 (Gateway direto): botões "Pagar com Pix" e "Cartão ou boleto".
    - Intercepta com `ModalCadastro (motivo="compra")` se o usuário ainda não tiver cadastro formal completo, voltando automaticamente para o modal de confirmação após o salvamento.
    - Exibe QR Code e Pix Copia e Cola para pagamento imediato, com instruções de liquidação.
- **`ModalCadastro.tsx` em `src/components/account/`:**
  - Adicionado suporte ao motivo `'compra'`, apresentando texto contextualizado para a primeira compra na plataforma.

### 2. O que foi testado e como
- **Testes unitários da Server Action (`src/server/actions/compra-direta.test.ts`):**
  - 5 testes cobrindo: rejeição sem sessão, trava por ausência de cadastro formal completo, rejeição de anúncio inexistente, rejeição de compra do próprio anúncio, e sucesso na geração de Pix com prefixo `CMP-` e metadados no repositório.
- **Testes de conciliação contábil (`src/server/payments/conciliacao.test.ts`):**
  - 8 testes cobrindo: liquidação de compra direta com transferência de moedas e crédito líquido ao vendedor, fallback seguro com crédito em saldo quando o lote expira/some, e idempotência no webhook.
- **Testes de banco e migrations (`src/server/db/payments.test.ts`):**
  - 10 testes cobrindo a aplicação da migration 008 e persistência de `tipo_operacao` e `metadata`.
- **Verificação completa de integridade do projeto:**
  - `npm run typecheck`: ✅ verde sem erros
  - `npm run lint`: ✅ verde sem erros e sem warnings
  - `npm test`: ✅ 34 suítes, 237 testes passando
  - `npm run build`: ✅ 23 páginas estáticas e rotas compiladas com sucesso em produção
- **Varredura de terminologia proibida:**
  - 0 ocorrências de termos proibidos em texto visível ao cliente.

### 3. O que ficou de manual
- Registrar aplicação da migration `008_compra_direta.sql` no Supabase antes do cutover em produção (`PENDENCIAS_MANUAIS_AGENTE_B.md`).

### 4. O que o próximo agente precisa saber
- A compra direta pelo gateway está 100% implementada e conciliada com lançamentos contábeis equivalentes.
- A próxima sessão do Agente B é a **B-4 (Saque)**: taxa fixa de R$ 5,00, trava por dados bancários confirmados, prazo D+3, ledger contábil e auditoria.

---

## Sessão B-2 — Tela e travas do cadastro formal progressivo e trava do saque
**Data:** 10/09/2026  
**Status:** Concluída com sucesso

### 1. O que entrou
- **Regras e utilitários de domínio em `src/domain/cadastro.ts`:**
  - `temCadastroCompleto(user)`: valida presença de todos os dados cadastrais obrigatórios e dados bancários/Pix.
  - `temDadosBancarios(user)`: valida se há chave Pix válida ou conta bancária completa configurada.
  - Formatadores de máscara: `formatarCpf`, `formatarCep`, `formatarTelefone` e `descreverDadosBancarios`.
  - Módulo 100% puro, sem dependência de I/O ou React.
- **Componente `ModalCadastro.tsx` em `src/components/account/`:**
  - Modal do cadastro formal progressivo, acionado apenas quando há movimentação de dinheiro.
  - Coleta: CPF (validação instantânea por módulo 11), Nome Completo, Data de Nascimento, Telefone com DDD.
  - Endereço com busca automática de CEP via `consultarCepEnvio(cep)`: preenchimento instantâneo de logradouro, bairro, cidade e UF.
  - Dados bancários para saque: alternância entre Chave Pix (CPF, E-mail, Telefone, Aleatória) e Conta Bancária (Banco, Agência, Conta com dígito e Tipo de Conta).
  - Aviso explícito de privacidade e LGPD: menção formal de que fotos de documento (RG/CNH), selfies e biometria facial não são coletadas (dispensa jurídica de Felipe Moraes e Gabriel).
  - Submissão via Server Action `salvarCadastro()`.
- **Travas e integrações em `src/components/account/AccountModals.tsx`:**
  - `ModalDeposito`: defesa em profundidade que intercepta tentativas de depósito direto por usuário sem cadastro completo, oferecendo o botão para completar o cadastro.
  - `ModalDadosPessoais`: inclusão do cartão de status cadastral com atalho para edição no modal completo.
  - `ModalSaqueInfo`: modal informativo de prontidão para a etapa de saque (B-4), com confirmação da taxa fixa de R$ 5,00, prazo D+3 e destino bancário cadastrado.
- **Interface e trava de saque em `src/app/(app)/conta/page.tsx`:**
  - Botão **Depositar**: se `!temCadastroCompleto(me)`, abre `ModalCadastro` com redirecionamento automático para `ModalDeposito` após salvar.
  - Botão **Sacar** (Trava 1 / Regra 3.3 do Plano Executivo):
    - Botão visível permanentemente (nunca escondido).
    - Desabilitado se `!temDadosBancarios(me)`, acompanhado do aviso: *"Cadastre sua chave Pix ou dados bancários para liberar saques (prazo D+3)."* e link *"Cadastrar dados"* abrindo o modal.
    - Habilitado se os dados bancários estiverem preenchidos, abrindo `ModalSaqueInfo`.
- **Saneamento e independência de testes em `src/server/db/db.test.ts`:**
  - Removidas referências prematuras à tabela `retiradas` (pertencente à frente C / migration 009) que quebravam a execução da suíte de testes PGlite na branch `feat/cadastro-financeiro`.

### 2. O que foi testado e como
- **Testes unitários de domínio (`src/domain/cadastro.test.ts`):**
  - 14 testes cobrindo `temCadastroCompleto` (completude, ausência de campos, rejeição de telefones curtos, validação de endereço), `temDadosBancarios` (Pix vs conta tradicional) e funções de máscara/descrição.
- **Verificação completa de integridade do projeto:**
  - `npm run typecheck`: ✅ verde (0 erros de tipagem)
  - `npm run lint`: ✅ verde (0 erros, 0 warnings)
  - `npm test`: ✅ 33 suítes, 229 testes passando
  - `npm run build`: ✅ 23 páginas estáticas e rotas compiladas sem warnings
- **Varredura de terminologia proibida:**
  - `git grep -inE "NFT|token|cripto|ativo digital|investimento" -- src/domain/cadastro.ts src/domain/cadastro.test.ts src/components/account/ModalCadastro.tsx src/components/account/AccountModals.tsx "src/app/(app)/conta/page.tsx"`
  - 0 ocorrências de termos regulatórios proibidos em texto visível ao cliente.

### 3. O que ficou de manual
- Nenhuma pendência manual nova gerada na Sessão B-2.

### 4. O que o próximo agente precisa saber
- O cadastro progressivo está ativo e pronto para ser chamado em qualquer ponto de movimentação financeira.
- Na Sessão B-3 (Compra direta no gateway), se o usuário tentar comprar direto sem cadastro prévio, a mesma regra de trava progressiva deve ser acionada.
- Na Sessão B-4 (Saque), a ação `solicitarSaque` consumirá os dados bancários já validados e persistidos pelo cadastro.

---

## Sessão B-1 — Modelo do cadastro formal (`migration 007`)
**Data:** 10/09/2026  
**Status:** Concluída com sucesso

### 1. O que entrou
- **Extensão de tipos em `src/domain/types.ts`:**
  - Bloco `/* === Publicação · Agente B === */` inserido estritamente ao final do arquivo.
  - Tipos: `TipoChavePix`, `TipoContaBancaria`, `DadosBancarios`, `Endereco`, `Cadastro`.
  - Reabertura/extensão de `interface User` com `cadastro?: Cadastro` (estritamente opcional).
  - Sem campos de selfie, foto de documento ou biometria (dispensados pelo jurídico).
- **Validação de CPF no domínio em `src/domain/cpf.ts`:**
  - Funções puras `validarCpf`, `limparCpf`, `formatarCpf` (algoritmo módulo 11 da Receita Federal, rejeição de sequências idênticas).
  - Sem dependência externa, determinístico e sem logs com dados pessoais (LGPD).
- **Migration `007_cadastro_usuario.sql` em `src/server/db/migrations/`:**
  - Adiciona colunas anuláveis (`NULL`) na tabela `aurea.users`: `cpf`, `nome_completo`, `data_nascimento`, `telefone`, `endereco` (jsonb), `dados_bancarios` (jsonb), `cadastro_completado_em`, `cadastro_confirmado_em`.
  - Criação de índice condicional `users_cpf_idx` em `aurea.users (cpf) WHERE cpf IS NOT NULL`.
- **Camada de persistência e diff de banco:**
  - `src/server/db/diff.ts`: adicionado `cadastro: Cadastro | null` à forma canônica `UserRegistro` e normalização em `normalizarUser`.
  - `src/server/db/repositories/users.ts`: leitura (`carregarUsers`), inserção (`inserirUser`) e atualização (`atualizarUser`) das colunas de cadastro.
  - `src/server/db/repositories/state.ts`: montagem de `u.cadastro` quando presente, omitindo quando nulo.
- **Server Actions em `src/server/actions/account.ts`:**
  - `salvarCadastro(input: CadastroInput)`: valida sessão, CPF, nome completo, data de nascimento, telefone com DDD, endereço completo e chave Pix ou dados bancários. Gravação atômica via `mutateState`.
  - `obterCadastro()`: leitura segura dos dados cadastrais do usuário autenticado.

### 2. O que foi testado e como
- **Validação de CPF (`src/domain/cpf.test.ts`):**
  - 7 testes automatizados passando (CPFs válidos com e sem máscara, DVs inválidos, sequências de dígitos repetidos, campos nulos/vazios/inválidos, formatação).
- **Integração com Postgres / PGlite (`src/server/db/db.test.ts`):**
  - 23 testes passando com a migration `007` executada do zero pelo PGlite.
  - Teste novo adicionado: `cadastro formal: persiste e recarrega dados cadastrais sem afetar contas sem cadastro`, comprovando a persistência íntegra de todos os campos e que contas antigas/seed continuam sem cadastro e operando normalmente.
- **Ações de servidor (`src/server/actions/account.test.ts`):**
  - 10 testes automatizados cobrindo rejeição de sessão expirada, CPF inválido, nome curto, data de nascimento malformatada, telefone inválido, endereço incompleto, ausência de Pix/banco, e caminhos felizes com Pix e com conta corrente tradicional.
- **Verificação completa de integridade do projeto:**
  - `npm run typecheck`: ✅ verde sem erros
  - `npm run lint`: ✅ verde sem erros
  - `npm test`: ✅ 33 suítes, 238 testes passando
  - `npm run build`: ✅ 23 páginas estáticas e rotas compiladas com sucesso

### 3. O que ficou de manual
- Registrar a pendência para aplicação da migration `007_cadastro_usuario.sql` no Supabase antes do cutover em produção (documentado em `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`).

### 4. O que o próximo agente precisa saber
- As contas existentes no seed (`ACCOUNTS`) continuam sem `cadastro` definido (`u.cadastro === undefined`).
- Para testar os gates da sessão B-2:
  - Uma conta sem cadastro pode ser detectada verificando se `!user.cadastro`.
  - A ação `salvarCadastro` já está pronta e disponível em `@/server/actions/account`.
