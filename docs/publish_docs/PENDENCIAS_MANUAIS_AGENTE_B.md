# Pendências manuais — Agente B

**O que só uma pessoa pode fazer, porque está fora do repositório.**
Arquivo exclusivo do Agente B (regra 8 do [`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).
Os Agentes A e C têm os seus; ninguém escreve no arquivo do outro.

> **Para o Rogério.** Cada linha aqui é uma coisa que o código não consegue resolver
> sozinho — depende de alguém abrir um site, preencher um cadastro, aplicar uma chave ou tomar uma decisão.
> Enquanto a linha estiver aberta, a parte da plataforma que depende dela não funciona de
> verdade, mesmo que a tela pareça pronta.

Item resolvido **não some**: é marcado `✅ FEITO em dd/mm`, para o próximo agente não refazer.

---

## Abertas

### B-1 · Aplicar a migration 007 no Supabase de produção 🟡

| | |
|---|---|
| **O que falta** | Executar a migration `007_cadastro_usuario.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando o SQL no editor do Supabase |
| **O que está bloqueado** | Persistência do cadastro formal em produção com Postgres conectado |
| **Como conferir que foi feito** | `npm run db:check` reporta `007_cadastro_usuario` aplicada e colunas de cadastro presentes |

A migration adiciona apenas colunas anuláveis (`NULL`) na tabela `aurea.users`: `cpf`, `nome_completo`, `data_nascimento`, `telefone`, `endereco`, `dados_bancarios`, `cadastro_completado_em` e `cadastro_confirmado_em`, além do índice condicional em `cpf`. É totalmente inócua e retrocompatível com as contas existentes.

---

### B-2 · Bloqueio de recibo por inadimplência (coordenação com Agente C) 🟡

| | |
|---|---|
| **O que falta** | O Agente C deve respeitar a trava de inadimplência gerada pelo faturamento de custódia na hora de transferir ou retirar recibo |
| **Quem pode fazer** | **Agente C** (em `src/server/actions/custody.ts` e componentes de recibo) |
| **O que está bloqueado** | Fechamento integral do circuito de inadimplência (sessão B-5) |
| **Como conferir que foi feito** | Tentativa de retirada por cliente inadimplente exibe recibo bloqueado por débito |

O Agente B gerencia o faturamento e a marcação de inadimplência; por contrato de território, a ação e o componente do recibo pertencem ao Agente C.

---

### B-3 · Aplicar a migration 008 no Supabase de produção 🟡

| | |
|---|---|
| **O que falta** | Executar a migration `008_compra_direta.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando o SQL no editor do Supabase |
| **O que está bloqueado** | Persistência do campo `tipo_operacao` e `metadata` de intenções de pagamento para compras diretas em produção com Postgres conectado |
| **Como conferir que foi feito** | `npm run db:check` reporta `008_compra_direta` aplicada e colunas presentes em `aurea.payment_intents` |

A migration adiciona apenas as colunas `tipo_operacao` (com default `'deposito'`) e `metadata` (jsonb anulável) na tabela `aurea.payment_intents`. Totalmente inócua e retrocompatível com as linhas existentes.

---

### B-4 · Aplicar a migration 009 no Supabase de produção 🟡

| | |
|---|---|
| **O que falta** | Executar a migration `009_saques.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando o SQL no editor do Supabase |
| **O que está bloqueado** | Persistência da tabela de saques (`aurea.saques`) e novos tipos de lançamentos contábeis (`saque`, `taxa_saque`, `taxa_retirada`) em produção com Postgres conectado |
| **Como conferir que foi feito** | `npm run db:check` reporta `009_saques` aplicada e tabela `aurea.saques` presente |

A migration cria a tabela `aurea.saques` com restrições e índices, e atualiza a constraint de tipos no livro contábil (`aurea.ledger_entries`).
Operacionalmente, os saques entram no status `solicitado` com prazo D+3 úteis e são liquidados manualmente pelo sócio via Pix (RA-30), conforme detalhado em [`docs/tutoriais/TUTORIAL_GATEWAY_SAQUE.md`](../tutoriais/TUTORIAL_GATEWAY_SAQUE.md).

---

### B-5 · Aplicar a migration 010 no Supabase de produção 🟡

| | |
|---|---|
| **O que falta** | Executar a migration `010_faturamento_custodia.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando o SQL no editor do Supabase |
| **O que está bloqueado** | Persistência da tabela de faturas de custódia (`aurea.faturas_custodia`) e coluna `inadimplente` em `aurea.users` em produção com Postgres conectado |
| **Como conferir que foi feito** | `npm run db:check` reporta `010_faturamento_custodia` aplicada e tabela `aurea.faturas_custodia` presente |

A migration cria a tabela `aurea.faturas_custodia` com restrições e chave de unicidade `(user_email, competencia)`, adiciona a coluna `inadimplente` na tabela `aurea.users` e habilita RLS.
Totalmente inócua e retrocompatível com as contas existentes.


