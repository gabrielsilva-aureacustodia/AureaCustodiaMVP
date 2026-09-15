# Pendências manuais — Agente B

**O que só uma pessoa pode fazer, porque está fora do repositório.**
Arquivo exclusivo do Agente B (regra 8 do [`PROTOCOLO_DO_AGENTE.md`](PROTOCOLO_DO_AGENTE.md)).
Os Agentes A e C têm os seus; ninguém escreve no arquivo do outro.

> **Para o Rogério.** Cada linha aqui é uma coisa que o código não consegue resolver
> sozinho — depende de alguém abrir um site, preencher um cadastro, aplicar uma chave ou tomar uma decisão.
> Enquanto a linha estiver aberta, a parte da plataforma que depende dela não funciona de
> verdade, mesmo que a tela pareça pronta.

Item resolvido **não some**: é marcado `✅ FEITO em dd/mm`, para o próximo agente não refazer.

Desde 15/09, com as frentes A, B e C encerradas, os itens resolvidos ficam no lugar, marcados no título. A lista do que continua aberto, de todos os arquivos, está em [`../PENDENCIAS_ABERTAS.md`](../PENDENCIAS_ABERTAS.md).

---

## Abertas

### B-1 · Aplicar a migration 007 no Supabase de produção ✅ FEITO em 11/09

> Aplicada em 11/09 (CHECKUP_11_09_2026.md, seção 1). Conferida em 15/09 por npm run db:check: 007_cadastro_usuario na lista.

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

### B-3 · Aplicar a migration 008 no Supabase de produção ✅ FEITO em 11/09

> Aplicada em 11/09 (CHECKUP_11_09_2026.md, seção 1). Conferida em 15/09 por npm run db:check: 008_compra_direta na lista.

| | |
|---|---|
| **O que falta** | Executar a migration `008_compra_direta.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando o SQL no editor do Supabase |
| **O que está bloqueado** | Persistência do campo `tipo_operacao` e `metadata` de intenções de pagamento para compras diretas em produção com Postgres conectado |
| **Como conferir que foi feito** | `npm run db:check` reporta `008_compra_direta` aplicada e colunas presentes em `aurea.payment_intents` |

A migration adiciona apenas as colunas `tipo_operacao` (com default `'deposito'`) e `metadata` (jsonb anulável) na tabela `aurea.payment_intents`. Totalmente inócua e retrocompatível com as linhas existentes.

---

### B-4 · Aplicar a migration 009 no Supabase de produção ✅ FEITO em 11/09

> Aplicada em 11/09 (CHECKUP_11_09_2026.md, seção 1). Conferida em 15/09 por npm run db:check: 009_saques na lista.

| | |
|---|---|
| **O que falta** | Executar a migration `009_saques.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando o SQL no editor do Supabase |
| **O que está bloqueado** | Persistência da tabela de saques (`aurea.saques`) e novos tipos de lançamentos contábeis (`saque`, `taxa_saque`, `taxa_retirada`) em produção com Postgres conectado |
| **Como conferir que foi feito** | `npm run db:check` reporta `009_saques` aplicada e tabela `aurea.saques` presente |

A migration cria a tabela `aurea.saques` com restrições e índices, e atualiza a constraint de tipos no livro contábil (`aurea.ledger_entries`).
Operacionalmente, os saques entram no status `solicitado` com prazo D+3 úteis e são liquidados manualmente pelo sócio via Pix (RA-30), conforme detalhado em [`docs/tutoriais/TUTORIAL_GATEWAY_SAQUE.md`](../tutoriais/TUTORIAL_GATEWAY_SAQUE.md).

---

### B-5 · Aplicar a migration 010 no Supabase de produção ✅ FEITO em 11/09

> Aplicada em 11/09 (CHECKUP_11_09_2026.md, seção 1). Conferida em 15/09 por npm run db:check: 010_faturamento_custodia na lista.

| | |
|---|---|
| **O que falta** | Executar a migration `010_faturamento_custodia.sql` no banco Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando o SQL no editor do Supabase |
| **O que está bloqueado** | Persistência da tabela de faturas de custódia (`aurea.faturas_custodia`) e coluna `inadimplente` em `aurea.users` em produção com Postgres conectado |
| **Como conferir que foi feito** | `npm run db:check` reporta `010_faturamento_custodia` aplicada e tabela `aurea.faturas_custodia` presente |

A migration cria a tabela `aurea.faturas_custodia` com restrições e chave de unicidade `(user_email, competencia)`, adiciona a coluna `inadimplente` na tabela `aurea.users` e habilita RLS.
Totalmente inócua e retrocompatível com as contas existentes.

---

### B-6 · Aplicar migrations da rodada de finalizações (017, 018 e 019) no Supabase de produção ✅ FEITO em 14/09

> Aplicadas em 14/09 pelo Agente C antes do push de 4d35ee7 (RELATORIO_AGENTE_C.md, "Banco de produção e publicação"; PENDENCIAS_AGENTE_C.md, P-M-03). Conferidas em 15/09 por npm run db:check.

| | |
|---|---|
| **O que falta** | Executar as migrations `017_cobrancas_gateway.sql`, `018_planos_custodia.sql` e `019_retirada_paga.sql` no Supabase |
| **Quem pode fazer** | **Gabriel** via `npm run db:migrate` com a senha do banco, ou colando os scripts SQL no SQL Editor do Supabase |
| **O que está bloqueado** | Persistência dos recebimentos detalhados do gateway (`aurea.recebimentos_gateway`), planos de custódia (`aurea.planos_custodia`), vínculo de planos em faturas/envios, e dados de pagamento da retirada física em produção |
| **Como conferir que foi feito** | `npm run db:check` reporta 017, 018 e 019 aplicadas com sucesso |

Resumo das migrations:
- **017**: Coluna `parcelas_max` em `aurea.payment_intents`, novos tipos em check constraint, tabela `aurea.recebimentos_gateway` (RLS ativado).
- **018**: Tabela `aurea.planos_custodia`, colunas `plano_id` e `origem` em `aurea.faturas_custodia`, coluna `modalidade_envio` em `aurea.envios`.
- **019**: Colunas `forma_pagamento`, `payment_intent_ref` e `parcelas` em `aurea.retiradas`.

---

### B-7 · Configurar credenciais de produção do Mercado Pago na Vercel 🟡

> Conferido em 15/09 por vercel env ls production: nenhuma variável MP_* no ambiente Production da Vercel. O commit 2cc7194 (11/09) ligou o código e deixou as credenciais com o Gabriel.

| | |
|---|---|
| **O que falta** | Configurar as variáveis de ambiente de produção na Vercel (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX` e `NEXT_PUBLIC_APP_URL`) e o webhook de produção no Mercado Pago |
| **Quem pode fazer** | **Gabriel** via Vercel Dashboard e painel do Mercado Pago |
| **O que está bloqueado** | Cobrança real de clientes via Pix e Cartão em produção |
| **Como conferir que foi feito** | (1) se a CLI da Vercel estiver autenticada, `vercel env ls production --cwd C:\dev\AureaCustodiaMVP` lista as quatro (opcional); (2) depois do Redeploy, `https://aurea-custodia-mvp.vercel.app/admin/configuracao?aba=integracoes` mostra "Pagamento (Mercado Pago)" ligado e a observação `Modo: produção (MP_SANDBOX=false).` (`src/domain/admin/integracoes.ts:87`); (3) **pelo gateway, com credencial**: um depósito de R$ 1,00 por Pix abre o QR do Mercado Pago e não a modal do simulador; **sem credencial** (estado de hoje), o mesmo depósito abre a modal do simulador, porque sem `MP_ACCESS_TOKEN` o `src/server/actions/payments.ts` responde pelo simulador — é assim que se confere o fluxo enquanto as variáveis não existem. |

Abaixo, os nomes das variáveis e as configurações (nenhum valor de credencial entra no repositório):

- variáveis (Production): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX` — passo a passo no passo 5 de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` (os valores o Gabriel copia do painel do Mercado Pago; nenhum entra no repositório);
- `NEXT_PUBLIC_APP_URL`, com o valor:

```
https://aurea-custodia-mvp.vercel.app
```

- endereço do webhook de produção (a configuração no painel do Mercado Pago está no mesmo passo 5 do tutorial):

```
https://aurea-custodia-mvp.vercel.app/api/webhooks/mercadopago
```

Graças à entrega B1.0, o código agora isola estritamente produção (`MP_SANDBOX=false` usa exclusivamente `MP_ACCESS_TOKEN`).

---

### B-8 · Decidir e configurar absorção de juros de parcelamento no Mercado Pago 🟡

| | |
|---|---|
| **O que falta** | Decidir se a Áurea absorve os custos de parcelamento (sem acréscimo para o cliente) ou se o cliente paga os juros |
| **Quem pode fazer** | **Sócios (Gabriel e Rogério)** |
| **O que está bloqueado** | Experiência de checkout do cliente (exibir "em até 12x sem juros" para o plano anual ou com acréscimo da operadora) |
| **Como conferir que foi feito** | Se for absorvido pela Áurea: ativar no painel do Mercado Pago em *Seu negócio › Configurações › Tarifas e prazos / Parcelamento sem acréscimo* |



