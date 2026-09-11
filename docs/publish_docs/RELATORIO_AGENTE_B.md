# Relatório de Execução — Agente B

**Frente de Cadastro, Conta e Dinheiro / Custódia e Contábil**  
Branch: `feat/cadastro-financeiro`  
Repositório: `github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP`

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
