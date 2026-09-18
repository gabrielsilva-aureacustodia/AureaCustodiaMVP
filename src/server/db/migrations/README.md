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
| `014_comissao_dois_lados.sql` | Frente A: `fee_comprador` e `fee_vendedor` em `aurea.trades` (A1, RA-06) |
| `015_prioridade_e_historico_ofertas.sql` | Frente A: `prioridade_em` em `sell_offers` e `buy_orders`, tabela append-only `ofertas_historico` (A2, Decisão F-3) |
| `016_documentos_e_aceites.sql` | Frente A: `documentos_legais` e `aceites_documentos` com hash encadeado e RLS (A3) |

A próxima é a **017**. A limpeza do passo 9 do M1 continua pendente — ver
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

## Migrations da frente C — painel administrativo (020 a 025)

Reserva da seção 3.3 de `docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md`. Nenhuma depende de
tabela de outra frente, então entram na ordem em que as sub-branches chegarem à `main`.

| Arquivo | O que faz |
|---|---|
| `020_admin_rbac.sql` | C1: `admin_permissoes`, `admin_papeis`, `admin_papel_permissoes`, `admin_membros`. Só cria as tabelas — o catálogo e os papéis de sistema vêm de `src/domain/admin/permissoes.ts` na primeira leitura |
| `021_eventos_uso.sql` | C1: `eventos_uso`, o registro de uso da plataforma (append-only, sem IP nem user agent) |
| `022_cs_mensageria.sql` | C2: `cs_canais`, `cs_contatos`, `cs_conversas`, `cs_mensagens` — o WhatsApp do atendimento. `id_no_provedor` único contra webhook reentregue; telefone em E.164 canônico |
| `023_notas_e_atribuicoes.sql` | C2: `cs_notas`, `cs_etiquetas`, `cs_conversa_etiquetas`, `admin_notas_usuario` e `admin_situacao_contas` (ativar e desativar conta). Notas e situação são append-only |
| `024_config_plataforma.sql` | C3: `config_plataforma` (chave, valor `jsonb`, tipo `bp`/`centavos`/`inteiro`/`texto`, quem e quando), `config_historico` (append-only, valor antigo e novo) e `tipos_moeda` (o catálogo que `isNegociavel` consulta). **Nenhuma semeia valor**: sem linha, vale o padrão do código (`TAXAS_PADRAO`, `COIN_TYPES`); o catálogo é semeado pelo código ao abrir a aba |
| `025_caixas_fisicas.sql` | C3: `caixas` (código, rótulo, local, capacidade opcional, ativa). A ocupação não é coluna: sai das análises × moedas × retiradas |

## Migration 026 — o plano de custódia de 24 meses

| Arquivo | O que faz |
|---|---|
| `026_plano_bienal.sql` | Amplia o CHECK de `planos_custodia.modalidade` para aceitar `bienal`, o plano de 24 meses criado em 18/09/2026. `mensal` continua aceito porque está gravado nos planos antigos: tirar o valor do CHECK travaria qualquer UPDATE neles. O código não cria mais plano mensal |

Sem ela, a primeira contratação de plano de 24 meses falha por violação de constraint no meio
do fluxo de envio — o plano anual e o ciclo mensal continuam funcionando.

Todas as demais só **criam** tabelas: aplicadas antes do deploy, não quebram código nenhum; o código
publicado antes delas cai no bootstrap do ambiente (RA-40) e não grava registro de uso. Sem a
022 e a 023, `/admin/cs` e as notas da ficha de usuário mostram o aviso de tabela ausente. Sem a
024, o site cobra o padrão do código e a tela de configuração pede `npm run db:migrate`; sem a
025, a bancada web aceita qualquer código de caixa e o quadro de caixas fica vazio.
