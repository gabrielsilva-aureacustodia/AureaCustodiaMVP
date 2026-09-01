# Critical Debugs — Áurea Custódia

**Documento vivo · reescrito a cada leitura do repositório · lista de tarefas do agente**

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP · branch main
Base:        commit 8e0f0a5 + sessões 0–8 do plano de execução
Gerado em:   01/09/2026 — reescrito após a execução dos itens
Fonte:       repositório · Vercel (verificada por CLI) · docs/PLANO_EXECUCAO_CRITICAL_DEBUGS.md
Itens:       2 abertos — ambos DECISÃO, nenhum é código
```

> **Como usar.** O agente lê este documento **depois** do Ritual de Sessão. Cada item traz
> sintoma, causa, consequência, correção passo a passo e teste de aceite.
>
> **Item resolvido sai deste documento.** O registro de que existiu fica no
> `VERSION_COMPARISON_DAILY.md` — a Entrada 002 (01/09/2026) documenta a resolução de
> CD-00 a CD-07 e CD-10, com o commit de cada um.

---

## Índice

| ID | Título | Gravidade | Esforço |
|---|---|---|---|
| **CD-08** | Migrar a persistência de produção para Postgres | Média — DECISÃO | 30 min + reset |
| **CD-09** | Comissão do extrato é recalculada, não congelada | Média — DECISÃO DOS SÓCIOS | decisão + 2 h |

## Pendências operacionais herdadas das sessões (não são defeitos)

| O quê | Quem | Como |
|---|---|---|
| Reautenticar o GitHub na máquina | Operador | O Credential Manager guarda `git:https://github.com` da conta `gabrielsilva-sintetica`, sem permissão no repositório. Apagar a credencial (`cmdkey /delete:LegacyGeneric:target=git:https://github.com`) e fazer um `git push` — o navegador abre para autenticar com `gabrielsilva-aureacustodia` |
| Apagar a branch remota `Useful-Data` | Operador ou agente, após o push | `git push origin --delete Useful-Data` — o `.docx` já foi recuperado para `docs/referencia/` |
| Exigir CI verde na `main` | Operador | GitHub → Settings → Branches → regra para `main` → *Require status checks to pass*, após o primeiro run verde do workflow |
| `SESSION_SECRET` no ambiente Development da Vercel | Operador (opcional) | A variável existe em Production e Preview; Development ficou de fora. Só afeta `vercel dev` |

---

# CD-08 — Migrar a persistência de produção para Postgres

```
Gravidade:  MÉDIA hoje · ALTA com cliente real
Bloqueia:   nada tecnicamente — é decisão de agenda
Verificado: 01/09/2026, via CLI da Vercel
```

**A resposta que faltava, agora verificada.** A camada ativa em produção é **Redis
(Vercel KV)**: o projeto tem `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL` e
`REDIS_URL`, e **não** tem `POSTGRES_URL` nem `DATABASE_URL`. A resposta está registrada
na seção Persistência do `README.md`.

**A consequência.** Concorrência é "última gravação vence": duas ações no mesmo segundo
podem fazer uma desaparecer em silêncio. Aceitável com 7 sócios; inaceitável com cliente
real.

**A correção — quando decidida.** O adaptador Postgres já existe e usa
`SELECT … FOR UPDATE` (`src/server/store/postgres.ts`). Migrar é: provisionar um Postgres
(Neon), acrescentar `POSTGRES_URL` na Vercel (Production + Preview), Redeploy. A
precedência é automática — nenhum código.

**Custo:** o banco novo nasce vazio e semeia do zero — saldos, anúncios e senhas trocadas
voltam ao seed.

**Recomendação:** executar **junto com o CD-09**, que também exige reset (mudança em
`types.ts` → rotação de `AUREA_STORE_KEY`). Um reset em vez de dois.

**Teste de aceite.** Runtime Logs sem o aviso de memória; `POSTGRES_URL` presente;
uma compra concluída aparece no Postgres (`SELECT key FROM ...`), não no KV.

---

# CD-09 — Comissão do extrato é recalculada, não congelada

```
Gravidade:  MÉDIA hoje · ALTA no dia em que uma taxa mudar
Bloqueia:   nada tecnicamente — EXIGE DECISÃO DOS SÓCIOS antes de codar
Evidência:  src/domain/statement.ts · docs/MUDANCAS_MERCADO_MULTI_ATIVO.md seção 8.3
```

**O sintoma.** Latente. Aparece no dia em que `FEE_PCT` ou `FEE_FIXED` mudarem: o extrato
passa a mostrar comissões diferentes para negociações que já aconteceram. **O extrato muda
o passado.**

**Para o Rogério, sem jargão:** hoje o extrato calcula a comissão na hora de mostrar,
usando a taxa de agora. Se a taxa mudar um dia, um extrato impresso hoje e o mesmo extrato
impresso depois dirão valores diferentes para a mesma venda. Numa contestação, os dois
papéis são prova — e se contradizem.

**A causa.** `statement.ts` chama `tradeFee(t.price)` para cada venda. O `Trade` não grava
a comissão efetivamente cobrada. A decisão original é defensável (evita tela e execução
divergirem), e enquanto as taxas não mudam os dois valores são idênticos.

**Por que não pode ser corrigido sem decisão.** Gravar a comissão no `Trade` altera
`src/domain/types.ts` — superfície protegida, fonte da verdade do modelo de dados — e
obriga rotação de `AUREA_STORE_KEY`.

**A correção proposta, a levar aos sócios.**

1. Acrescentar `fee: Cents` ao tipo `Trade` em `src/domain/types.ts`
2. Gravar a comissão no momento da execução (`matchOrders`, `buyLot`, `sellToBid`)
3. Em `statement.ts`, usar `t.fee` quando existir; recalcular só para registros antigos
4. Rotacionar `AUREA_STORE_KEY` (v6 → v7) antes de publicar — é o Passo 3 do `/publicar`
5. Cobrir com teste: os testes de `statement.test.ts` já existem e ganham o caso novo

**Teste de aceite.** Executar uma negociação, alterar `FEE_PCT` para outro valor, reabrir
o extrato e confirmar que a comissão da negociação anterior **não mudou**. Reverter a
constante. (Com o Vitest instalado, este teste vira permanente em vez de manual.)

---

# Itens que NÃO estão neste documento, e por quê

São construção de produto ou decisão de negócio, não correção de defeito:

| Assunto | Onde está |
|---|---|
| As cinco frentes (ledger, login, gateway, Correios, estação) e suas decisões travadas | `docs/diario/FRENTES_DE_TRABALHO.md` |
| Bloqueantes de cliente real (senhas, termos, backup) | `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`, Bloco 1 |
| Acessibilidade, memoização, idempotência de depósito | `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`, seção 8 |

---

*Próxima reescrita: na leitura diária seguinte. Item resolvido sai; o registro fica no
`VERSION_COMPARISON_DAILY.md`.*
