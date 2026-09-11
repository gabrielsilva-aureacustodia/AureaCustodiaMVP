# `src/server/db/migrations/` — o schema, versionado

Um arquivo `.sql` por mudança de estrutura, com prefixo numérico que define a ordem.
Aplicados por `npm run db:migrate` (Supabase) e por `../migrar.ts` (testes). A tabela
`aurea.schema_migrations` registra o que já entrou; rodar de novo não reaplica.

| Arquivo | O que faz |
|---|---|
| `001_inicial.sql` | As 10 tabelas do M1 no schema `aurea`, índices, chaves estrangeiras, `CHECK`s, a linha única de `seq` e RLS em todas |
| `002_pagamentos_rastreio.sql` | Frente C: `payment_events` (idempotência), `payment_intents`, `rastreios` |
| `003_ledger_dre_auditoria.sql` | M4/M7: `ledger_entries` (append-only, hash encadeado), `audit_log`, `parametros_contabeis`, `contas_contabeis`, `lancamentos_manuais`, `exportacoes`. Só cria tabelas; os catálogos vêm de `src/domain/dre.ts` |
| `004_analise_estacao.sql` | Frente E: `analises` (a bancada) e o contador `RO-ANL-0001` em `seq` |
| `005_renomeia_recibos.sql` | `aurea.nfts` vira `aurea.recibos` (D-4, 10/09/2026). Renomeia a tabela preservando dados, chaves e a FK; recria com o nome novo se ela não existir, e religa o RLS |
| `006_prefixo_rec.sql` | Reescreve o prefixo dos códigos de recibo já gravados, de `NFT-` para `REC-` (D-4) |
| `007_cadastro_usuario.sql` | Frente B: cadastro formal progressivo do cliente (CPF, endereço, dados bancários) |
| `008_compra_direta.sql` | Frente B: compra direta no mercado via gateway, com lançamento contábil |
| `009_saques.sql` | Frente B: `saques` (D+3, taxa fixa) e a restrição de tipos do ledger com `saque` e `taxa_saque` |
| `010_faturamento_custodia.sql` | Frente B: `faturas_custodia`, cobrança mensal e inadimplência |
| `011_retiradas.sql` | Frente C: `retiradas`, a máquina de estados da saída física da moeda |
| `012_retiradas_ledger.sql` | Frente C: fecha a restrição de tipos do ledger com a **união** das três frentes. Ver a nota dentro do arquivo |
| `013_remove_custody_charges.sql` | Derruba `custody_charges`, o mecanismo antigo de custódia (D-3 concluída, 11/09/2026). Sobe `STORE_KEY` para v8 |

A próxima é a **014**. A limpeza do passo 9 do M1 continua pendente — ver
`docs/prompts/AGENTE_B2_POS_PRODUCAO.md`.

> **Aprendizado da queda de 11/09/2026 — leia antes de rodar `db:migrate`.**
> Aplicar migration **antes** de o código correspondente estar publicado derruba a aplicação
> inteira. Foi o que aconteceu: a `013` derrubou `custody_charges` enquanto a produção ainda
> servia um código que a lia, e o site voltou uma exceção de servidor em toda rota.
> **`git push` e `db:migrate` são um passo só, nessa ordem.** Rodar a migration só para poder
> testar local é legítimo — o que não pode é o dia terminar com o banco à frente do código
> publicado.

> **Aprendizado do merge de 11/09/2026.** As frentes B e C, trabalhando em paralelo, criaram
> uma `009` e uma `010` cada, sem ver a outra. Pior: as duas reescreveram a mesma restrição
> `ledger_entries_tipo_check`, e a que rodasse por último apagaria os tipos da outra.
> **Antes de escolher um número, confira as outras branches vivas**, e nunca reescreva uma
> restrição declarando só os valores da sua frente — declare a lista inteira.

## Regras

- **Nunca edite uma migration já aplicada.** Crie `002_…`. O registro em `schema_migrations`
  impede a 001 de rodar de novo, e uma 001 diferente da que está no banco é história
  reescrita.
- **Sempre `aurea.` explícito** nos nomes. Assim o arquivo pode ser colado no editor SQL do
  Supabase sem nunca cair em `public`. A troca de schema para ambiente local
  (`AUREA_DB_SCHEMA`) é feita pelo aplicador, por substituição textual.
- **Toda tabela nova nasce com `ENABLE ROW LEVEL SECURITY`**, sem política.
- **Dinheiro é `bigint`.** Nunca `numeric`, nunca `real`.
- **Idempotente** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) sempre que a SQL permitir.

## Como aplicar no Supabase

```bash
npm run db:migrate
```

Usa `POSTGRES_URL_DIRECT` (porta 5432 — o pooler de transação recusa DDL). Lê `.env.local`
se a variável não estiver no ambiente. Ao final, avisa se encontrar qualquer tabela em
`public`.
