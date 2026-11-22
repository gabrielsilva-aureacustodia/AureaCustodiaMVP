# Execução — Agente B · Ledger, auditoria, DRE e exportação (M4 + M7)

```
Escrito em: 03/09/2026, madrugada
Para:       o Gabriel e o próximo agente da frente B
Estado:     código no main local · typecheck, lint e testes verdes nos arquivos desta frente
Complementa: docs/EXECUCAO_FINAL_AGENTE_B.md (a virada de produção continua sendo a seção 4 de lá)
```

> **O que esta sessão entregou.** A estrutura contábil que o plano chamava de M4 (ledger e
> trilha de auditoria) e M7 (DRE sob Lucro Presumido) — mais a camada de relatórios com
> API, exportação CSV/XLSX e integração com Google Sheets e Excel. Tudo em código; o que
> falta é configuração (variáveis) e o cutover que já estava pendente.

---

# 1. Em uma frase

**Toda movimentação de saldo agora vira lançamento imutável com hash encadeado, na mesma
transação que grava a mutação; a DRE lê a receita desses lançamentos; e cada relatório tem
uma URL que o Sheets e o Excel leem sozinhos** — sem que nenhuma Server Action tenha
mudado.

Para o Rogério: a plataforma passou a ter um livro-caixa que ninguém consegue editar sem
deixar marca, uma DRE que se monta sozinha a partir dele, e um jeito de o contador puxar
tudo para a planilha dele.

---

# 2. O que entrou

## 2.1 Banco — migration `003_ledger_dre_auditoria.sql` (6 tabelas, schema `aurea`, RLS)

| Tabela | O que guarda | Escrita |
|---|---|---|
| `ledger_entries` | Um lançamento por movimentação: conta, tipo, valor, sinal, **saldo após**, referência, `hash_anterior`, `hash` | append-only, por `estado.ts` |
| `audit_log` | Uma linha por mutação de estado e por exportação: ator, ação, contas afetadas, resumo das operações | append-only |
| `parametros_contabeis` | As alíquotas (nascem **nulas**) | pela tela, pelo contador |
| `contas_contabeis` | Plano de contas mínimo (upsertado do domínio) | automático |
| `lancamentos_manuais` | Despesas/receitas fora da plataforma; correção por estorno | pela tela |
| `exportacoes` | Quem exportou o quê, quando, por onde | pelas rotas |

`TABELAS_ESPERADAS` do `db:check` passou de 13 para **19**.

## 2.2 Domínio — três módulos puros, 22 testes novos

| Arquivo | O que faz |
|---|---|
| `src/domain/hash.ts` | SHA-256 puro (FIPS 180-4, conferido contra `node:crypto`) e a fórmula **congelada** do hash encadeado |
| `src/domain/ledger.ts` | Tipos de lançamento, derivação de negociação/depósito/custódia/abertura, `encadear`, `verificarCadeia`, `saldoPorSoma` |
| `src/domain/dre.ts` | Parâmetros (bp, nulos por padrão), plano de contas, períodos, `montarDre` com análise básica |

## 2.3 Servidor

- `src/server/db/derivar.ts` — deriva do **diff** o que vai para o ledger e a auditoria. Saldo
  que mudar sem negociação, depósito ou abertura vira `ajuste` visível, nunca some.
- `src/server/db/estado.ts` — passo 5 do ciclo: grava ledger e auditoria na mesma transação,
  atrás da mesma trava. Ator vem da sessão (`state.ts`), ou `sistema`.
- `src/server/db/repositories/ledger.ts`, `auditoria.ts`, `contabil.ts`.
- `src/server/relatorios/` — os doze relatórios, CSV/XLSX no servidor, push para o Sheets.
- `src/server/actions/contabil.ts` — lançar, estornar, alíquota, sincronizar, verificar cadeia.
- `src/app/api/relatorios/` — índice, `<nome>[.csv|.xlsx]`, `tudo.xlsx`, `sheets` (POST).

## 2.4 Tela

- `/relatorios` (só administradores): período, indicadores, oito abas, exportação, Sheets.
- Item "Relatórios" no menu, título na Topbar, `admin` no `AppProvider`.

## 2.5 Documentos

`docs/API_RELATORIOS.md`, `docs/INTEGRACAO_GOOGLE_SHEETS.md`, READMEs das pastas novas, RA-16.

---

# 3. Os invariantes que os testes afirmam

| Invariante | Onde |
|---|---|
| Soma do ledger de cada conta = saldo, ao centavo, inclusive depois da semeadura | `db.test.ts` |
| Cadeia de hashes confere; adulterar uma linha do meio é detectado | `ledger.test.ts`, `db.test.ts` |
| O mesmo dado produz o mesmo hash (valor fixado no teste) | `ledger.test.ts` |
| A DRE lê a comissão **gravada**, não recalcula | `dre.test.ts`, `db.test.ts` |
| Alíquota ausente → linha zerada **e pendência declarada** | `dre.test.ts` |
| Mutação que não grava nada não deixa rastro; conta nova ganha `saldo_inicial` | `db.test.ts` |
| Estorno some da DRE junto com o estornado | `db.test.ts` |
| CSV com BOM, `;`, vírgula decimal; XLSX de ida e volta; JWT RS256 verificável | `exportar.test.ts`, `jwt.test.ts` |

`npm test`: **18 arquivos, 145 testes** desta frente e das anteriores passam. Dois testes de
rotas da frente C (`api/admin/conciliacao`, `api/envios/etiqueta`) falham porque chamam
`cookies()` fora de requisição — são arquivos da frente C, em andamento no mesmo diretório
nesta madrugada, e não desta entrega.

---

# 4. O que falta — em ordem, com verificação

Legenda: 🤖 o agente faz · 👤 depende do Gabriel · ⛔ bloqueia

## 4.1 ⛔ 👤 O cutover de produção (inalterado)

A seção 4 de `docs/EXECUCAO_FINAL_AGENTE_B.md` continua valendo, com uma diferença: a
migration agora tem **três** arquivos. Esperado do `npm run db:migrate`:

```
+ 001_inicial
+ 002_pagamentos_rastreio
+ 003_ledger_dre_auditoria
✓ nenhuma tabela em public
```

E o `db:check` só aprova com as 19 tabelas. **Publicar o `main` sem a 003 aplicada derruba
toda mutação** (a gravação do ledger falha e a transação inteira volta), inclusive login com
registro de acesso — exatamente o risco da 001, pelo mesmo motivo.

## 4.2 👤 Variáveis novas na Vercel (3 minutos)

| Variável | Para quê | Obrigatória? |
|---|---|---|
| `AUREA_RELATORIOS_TOKEN` | Leitura por URL (Sheets/Excel) | Não — sem ela, só sessão de admin |
| `AUREA_ADMIN_EMAILS` | Quem vê `/relatorios` | Não — sem ela, as 7 contas do seed |
| `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | O push para o Sheets | Não — sem elas, o botão diz o que falta |

Passo a passo em `docs/INTEGRACAO_GOOGLE_SHEETS.md`.

## 4.3 👤 O contador preenche as alíquotas (10 minutos, uma vez)

`/relatorios` → aba **Alíquotas**. Até lá a DRE mostra imposto zerado com a pendência escrita.
**Não preencher por conta própria:** a contradição Presumido × Simples do `CLAUDE.md` é dele.

## 4.4 🤖 Verificar em produção, depois do deploy

```bash
curl -s -H "Authorization: Bearer $AUREA_RELATORIOS_TOKEN" https://aurea-custodia-mvp.vercel.app/api/relatorios/contas | head -c 600
```

Esperado: JSON com sete linhas e `Diferenca: 0` em todas. Depois, `/relatorios` logado como
sócio: indicadores preenchidos, aba Livro-razão com a semeadura, botão "Verificar integridade"
respondendo "Ledger íntegro".

## 4.5 🟡 Decisões que pedem o "sim" dos sócios

| Decisão | O que muda |
|---|---|
| **CD-09** — o extrato ler `t.fee` | Uma linha em `statement.ts`. O ledger já usa o valor gravado; o extrato da conta ainda recalcula |
| **`genHash()` do recibo → `hash.ts`** | O SHA-256 existe; trocar o hash simulado do recibo NFT pelo determinístico (RA-05) muda o texto de recibos já emitidos — precisa de regra de transição |
| **Custódia debitada do saldo** | Hoje é `sinal 0` (registrada, não cobrada). Passar a debitar é regra de negócio nova |
| **Papel de administrador no banco** | Some com o M2 (Supabase Auth) — até lá, variável ou seed |

## 4.6 🟡 Próxima sessão da frente B (depois do cutover)

1. Parametrizar `src/server/relatorios/dados.ts` pelo `Executor` e testar a montagem dos
   relatórios contra o PGlite (RA-16.c).
2. Testes das rotas de `/api/relatorios` (autorização por sessão, token e recusas).
3. Sessão B-2 (remover `src/server/store/`) — `docs/prompts/AGENTE_B2_POS_PRODUCAO.md`, com a
   migration de limpeza agora numerada **004**.

---

# 5. O que NÃO fazer

- ❌ Publicar o `main` sem aplicar a **003** em produção (4.1)
- ❌ Editar uma linha de `ledger_entries` ou `audit_log` — a cadeia quebra e a tela acusa
- ❌ Pôr alíquota em código, mesmo "provisória"
- ❌ Mudar `CAMPOS_DO_LANCAMENTO` ou a fórmula de `hash.ts` sem migration de recálculo
- ❌ Mudar nome de coluna de relatório sem avisar quem tem planilha apontando para ele
