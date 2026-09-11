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
