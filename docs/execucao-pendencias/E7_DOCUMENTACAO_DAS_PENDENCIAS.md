# E7 · Documentação das pendências

```
Branch:                exec/e7-documentacao-das-pendencias
Base:                  origin/main que contém docs/execucao-pendencias/00_PLANO_MESTRE.md — o commit
                       de base feito pelo integrador ANTES do envio dos prompts (os documentos de
                       docs/execucao-pendencias/, o bloco oxc em vitest.config.mts, o teste
                       src/components/admin/entrada/EntradaDoPainel.test.ts e as seções sem trava
                       do RA-01)
Ordem de merge:        a ÚLTIMA (depois de E1 a E6); o índice é atualizado pela integração no mesmo commit
Worktree sugerido:     C:\dev\AureaCustodiaMVP-e7
Pendências de origem:  B-1, B-3, B-4, B-5, B-6, B-7, B-8 (publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md)
                       D-2, C-1, C-2, D-6 (publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md)
                       seções 1 a 4 de finalizacoes/PENDENCIAS_AGENTE_B.md (texto corrompido)
                       índice único de tudo o que continua aberto
RA reservados:         nenhum (esta branch não toma atalho: só documenta)
Migration reservada:   nenhuma
Relatório de saída:    docs/execucao-pendencias/relatorios/E7.md
```

> Revisado em 15/09/2026 contra a crítica de sobreposição (docs/execucao-pendencias/00_PLANO_MESTRE.md).

> **Para o Rogério.** Hoje as pendências da empresa estão espalhadas em cinco arquivos, escritos
> por três agentes diferentes, e vários itens que já foram resolvidos continuam marcados como
> abertos — um deles com o texto estragado, ilegível. Quando esta branch terminar, existe **uma
> página só** (`docs/PENDENCIAS_ABERTAS.md`) que diz o que falta, quem faz, o que fica esperando
> e como conferir; o que já foi feito aparece como feito, com a prova ao lado. Um ponto fica
> claro: o **pagamento de verdade pelo Mercado Pago ainda não está ligado**. O código está pronto
> desde 11/09, mas as chaves de produção não foram cadastradas no servidor do site — é um passo
> manual do Gabriel, descrito no fim deste documento.

---

## Objetivo final — pronto quando

1. `docs/finalizacoes/PENDENCIAS_AGENTE_B.md` é texto de novo:
   - `Select-String -Path docs\finalizacoes\PENDENCIAS_AGENTE_B.md -Pattern '[\x00-\x08\x0B\x0C\x0E-\x1F]'` não imprime nada;
   - `git diff --numstat origin/main -- docs/finalizacoes/PENDENCIAS_AGENTE_B.md` mostra números (hoje o Git o trata como binário: `Bin 0 -> 3283 bytes` no commit `63ead73`);
   - `git ls-files --eol docs/finalizacoes/PENDENCIAS_AGENTE_B.md` mostra `i/lf` (e não `i/-text`).
2. Em `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md`, B-1, B-3, B-4, B-5 e B-6 têm `✅ FEITO em dd/mm` no título e uma linha de evidência; B-7 e B-8 continuam abertos, com B-7 atualizado (evidência de que falta, os nomes das quatro variáveis, os endereços literais do site e do webhook e a indicação de que o passo a passo está no passo 5 de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`, onde o Gabriel copia os valores do próprio painel do Mercado Pago).
3. Em `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md`, D-2 está `✅ DECIDIDO em 11/09`, C-1 e C-2 têm o número certo de migration no título (011 e 012) e `✅ FEITO em 11/09`.
4. `docs/PENDENCIAS_ABERTAS.md` existe, no formato da tarefa 7, e **todo link relativo dele abre** (comando da tarefa 9 sem saída).
5. `docs/README.md` aponta para o índice; `docs/finalizacoes/README.md` não promete mais um `PENDENCIAS_AGENTE_A.md` que nunca existiu.
6. Nenhum arquivo fora da tabela "Pode editar" aparece em `git diff --name-only origin/main`.
7. `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` verdes (a branch não mexe em código; o ciclo prova que nada foi tocado por engano).
8. Branch enviada ao GitHub, sem merge na main, e relatório com a linha `E7 pronta para integração — <hash>`.

**Ordem de merge.** A E7 é mesclada **por último**, depois de E1 a E6. O índice nasce descrevendo o
estado anterior a elas (seção 2, "em execução na E<N>"); quem passa as linhas da seção 2 para a 4 e
marca os itens feitos nos arquivos de origem é a **integração, no mesmo commit** do merge da E7. A E7
não tenta prever o resultado das outras branches.

---

## O que o código faz hoje

Conferido em 15/09/2026, ao escrever este documento, na main `40bb8c8`. Esta branch não muda
comportamento nenhum; o diagnóstico é do **estado dos documentos** contra a prova real.

### Banco de produção — as migrations 001 a 025 estão aplicadas

`npm run db:check` (só leitura; acha sozinho o `.env.local` da pasta principal) respondeu:

```
✓ migrations aplicadas em "aurea": 001_inicial, … 013_remove_custody_charges, 014_comissao_dois_lados, … 023_notas_e_atribuicoes, 024_config_plataforma, 025_caixas_fisicas
✓ RLS ligada em todas as tabelas do schema
✓ nenhuma tabela em public
Pronto para uso.
```

As **datas** de aplicação vêm dos documentos, não do `db:check` (ele não imprime data):

| Migrations | Aplicadas em | Prova escrita |
|---|---|---|
| 007 a 013 | 11/09 | `docs/publish_docs/CHECKUP_11_09_2026.md:25` ("Durante o dia apliquei no Supabase as migrations 007 a 013") e o cabeçalho da linha 7 ("Supabase com as 13 migrations aplicadas"); mensagem do commit `bb975db` |
| 014 a 023 | 14/09 | `docs/finalizacoes/RELATORIO_AGENTE_C.md:434-440` (db:migrate antes do push de `4d35ee7`; db:check "001 a 023") |
| 024 e 025 | 14/09 | só o `db:check` de hoje; o registro escrito é o P-C3-01, que é da integração (não desta branch) |

### `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` — cinco itens feitos marcados como abertos

| Item | Linha | Situação no arquivo | Situação real |
|---|---|---|---|
| B-1 · migration 007 | 18 | 🟡 aberta | Feita em 11/09 (`007_cadastro_usuario` no db:check) |
| B-2 · recibo bloqueado por inadimplência | 31-40 | 🟡 aberta | **Não é desta branch** — em execução na E4 (o diagnóstico dela mostra defeitos vivos) |
| B-3 · migration 008 | 44 | 🟡 aberta | Feita em 11/09 (`008_compra_direta`) |
| B-4 · migration 009 | 57 | 🟡 aberta | Feita em 11/09 (`009_saques`) |
| B-5 · migration 010 | 71 | 🟡 aberta | Feita em 11/09 (`010_faturamento_custodia`) |
| B-6 · migrations 017-019 | 85 | 🟡 aberta | Feita em 14/09 — o próprio Agente C registrou em `docs/finalizacoes/PENDENCIAS_AGENTE_C.md:412-413` (P-M-03) e não editou o arquivo da B |
| B-7 · Mercado Pago de produção | 101-110 | 🟡 aberta | **Continua aberta** — ver abaixo |
| B-8 · juros do parcelamento | 114-121 | 🟡 aberta | Continua aberta (decisão dos sócios; nenhum registro de decisão nos documentos) |

O arquivo foi escrito em 14/09 (commit `63ead73`) acrescentando B-6 a B-8, e B-1 a B-5 ficaram
com o 🟡 de antes, embora já estivessem aplicadas desde 11/09.

### B-7 — o pagamento de verdade ainda não está ligado

Evidência, em ordem:

1. **O commit `2cc7194` (11/09, "liga o pagamento de verdade") ligou o código, não as chaves.** Ele
   fez `src/server/actions/payments.ts` voltar a respeitar `MP_SANDBOX` e encerrou o RA-01; a
   própria mensagem termina com: *"Fica faltando so o bloco 1, que e do Gabriel: as chaves do
   painel. O tutorial esta em docs/tutoriais/TUTORIAL_MERCADO_PAGO.md"*.
2. `docs/publish_docs/CHECKUP_11_09_2026.md:148-156` põe "As chaves do Mercado Pago" em "Seu, com o
   Rogério presente (amanhã)".
3. `docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md:1567` (13/09) ainda fala das credenciais
   "que já estão no seu roteiro de amanhã".
4. **Na Vercel, ambiente Production, não existe nenhuma variável `MP_*`.** `vercel env ls production
   --cwd C:\dev\AureaCustodiaMVP` listou 19 variáveis (SUPABASE_*, POSTGRES_*, KV_*, AUREA_*,
   SESSION_SECRET, AUREA_ESTACAO_TOKEN) e nenhuma de `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
   `MP_SANDBOX`, `NEXT_PUBLIC_APP_URL` ou `CRON_SECRET`.
5. O `.env.local` da pasta principal também não tem nenhuma linha `MP_*` (conferido só pelo nome).
6. O que falta é cadastrar as credenciais na Vercel. O passo a passo está no **passo 5** de
   `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` (versionado, sem valor secreto): ali o
   Gabriel copia a credencial de acesso de produção e a assinatura secreta do webhook **do próprio
   painel do Mercado Pago**. Esses valores não existem em arquivo nenhum — nem em `docs/privado/` —
   e nenhum entra no repositório; este documento e os arquivos que a E7 edita trazem só os nomes
   `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `MP_SANDBOX`.

Dois achados que mudam o texto do B-7:

- **Falta `NEXT_PUBLIC_APP_URL` na lista.** `src/lib/payments/cobranca.ts:140` usa
  `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` como endereço de volta do Checkout Pro.
  Sem a variável, o cliente que paga em produção volta para `localhost`. O tutorial lista as quatro
  (`docs/tutoriais/TUTORIAL_MERCADO_PAGO.md:190-195`); o B-7 lista só três.
- **O endereço de exemplo do tutorial está errado.** `TUTORIAL_MERCADO_PAGO.md:169` e `:174` e
  `.env.example:94` usam `https://aurea-custodia.vercel.app`, que responde **404** (não é este
  projeto). O endereço que responde 200 com o site é `https://aurea-custodia-mvp.vercel.app`, e
  `https://aurea-custodia-mvp.vercel.app/api/webhooks/mercadopago` responde 405 a GET — a rota existe
  e só aceita POST, como deve. `https://aureacustodia.com.br` não respondeu (código 000).
- `.env.example:89` ainda diz *"Só 'false' liga produção — e isso depende do RA-01"*; o RA-01 foi
  encerrado em 11/09 (`RISCOS_ASSUMIDOS.md:117-118`). Frase desatualizada que um agente leria como
  trava.

### Achado sem arquivo de origem — `CRON_SECRET` ausente em produção

`src/app/api/cron/faturamento/route.ts:18-22` e `src/app/api/cron/shipping/route.ts:26-30` exigem
`Authorization: Bearer <CRON_SECRET>` quando `NODE_ENV === 'production'`. A Vercel só manda esse
cabeçalho quando a variável existe no projeto — e ela não existe em Production (item 4 acima). Logo,
os dois agendamentos de `vercel.json` (rastreio diário às 09:00 UTC e faturamento de custódia no dia
1 às 08:00 UTC) recebem 401 em produção. Nenhum dos cinco arquivos de pendência registra isso; entra
no índice como **N-01**, dono Gabriel. A E7 **não** mexe nas rotas.

**Aviso que vai junto do N-01, no índice e no passo manual:** sem a variável, o faturamento mensal de
custódia nunca rodou em produção. **Com `CRON_SECRET` cadastrada, o ciclo do dia 1 passa a gerar e
debitar faturas** das contas com moeda custodiada — inclusive as de teste dos sócios. A E4 isenta as
contas da equipe do bloqueio por pendência, então conta de sócio com saldo curto não fica sem vender
nem retirar por causa disso; o débito da fatura, porém, acontece.

### `docs/finalizacoes/PENDENCIAS_AGENTE_B.md` — texto destruído por escape do PowerShell

O arquivo foi gravado por uma string entre aspas duplas do PowerShell, onde a crase é caractere de
escape. Resultado conferido byte a byte:

| No arquivo | Era | Linhas |
|---|---|---|
| `0x0C` (form feed) no lugar de `` `f `` | `` `feat/…` ``, `` `forma_pagamento` ``, `` `false` `` | 17, 34, 48 |
| `0x08` (backspace) no lugar de `` `b `` | ` ```bash ` | 19 |
| `0x00` (nulo) no lugar de `` `0 `` | `` `017_…` ``, `` `018_…` ``, `` `019_…` `` | 25, 29, 33 |
| `0x07` (sino) no lugar de `` `a `` | `` `aurea.…` ``, `` `alimentarPlanoNaAnalise` `` | 26, 28, 30, 31, 32, 34, 70 |
| uma crase só no lugar de três | as cercas ` ``` ` dos blocos de código | 3, 8, 19, 22 |
| crase simples sumida antes de letra comum | todo código em linha (`parcelas_max`, `main`, `MP_ACCESS_TOKEN`…) | várias |
| `\r\n` só na última linha | `\n` | 70 |

A versão íntegra das mesmas informações está em `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md:85-121`
(B-6 a B-8) e nas migrations `src/server/db/migrations/017_cobrancas_gateway.sql`,
`018_planos_custodia.sql` e `019_retirada_paga.sql` — é contra elas que se reconstrói.

### `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md`

| Item | Linha | No arquivo | Real |
|---|---|---|---|
| D-2 · prazo da retirada | 18-27 | 🟡 aberta | **Decidida em 11/09**: D+30 é o prazo operacional da Áurea e o trânsito dos Correios corre por fora, sem número prometido — `docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md:520` ("D-2 · O prazo de postagem — ✅ DECIDIDO em 11/09/2026"), `CHECKUP_11_09_2026.md:137`, commit `2cc7194`. `PRAZO_RETIRADA_DIAS` segue 30 (`src/domain/retirada.test.ts:45-46`) |
| C-1 | 31-44 | título diz "migration 009", corpo diz `011_retiradas.sql`, 🟡 | Feita em 11/09 (`011_retiradas`). A numeração mudou no merge `cc3c95c` — `CHECKUP_11_09_2026.md:97-98` ("As da C viraram 011 e 012") |
| C-2 | 48-61 | título diz "migration 010", corpo diz `012_retiradas_ledger.sql`, 🟡 | Feita em 11/09 (`012_retiradas_ledger`) |
| D-6 | 67-78 | ✅ FEITO em 10/09 | Já certo. Evidência no código: `src/lib/shipping/correios.ts:31-39` (`ENDERECO_CENTRAL_AUREA`, Caixa Postal 7990, CEP 30315-970), entrou no commit `c0ad95f` (10/09), que está na main. Nada a fazer |

### `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`

D-6, A-3, A-2 e A-1 já estão como `✅ FEITO`. Sobra **A-4**, que está **em execução na E4** — o
diagnóstico da E4 mostra defeitos vivos no preço de custódia informado ao cliente, e marcar o item
depois do merge é tarefa da integração. **A E7 não edita este arquivo.**

### Outros textos desatualizados que um agente leria errado

- `docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md:17-19`: *"quatro já foram fechadas em 10/09/2026;
  duas continuam abertas (D-2 … e D-6 …)"* — a seção 5 do mesmo arquivo (linhas 505, 520, 561) diz que
  as seis foram fechadas entre 10 e 11/09.
- `docs/finalizacoes/README.md:11`: promete `PENDENCIAS_AGENTE_A.md`, que nunca existiu (`git log --all
  -- docs/finalizacoes/PENDENCIAS_AGENTE_A.md` vazio).
- `docs/publish_docs/PROTOCOLO_DO_AGENTE.md:111-125` (regra 8): "só ele escreve nele". As frentes A, B e
  C encerraram; sem uma frase nova, a E7 parece violar a regra ao marcar itens nos arquivos de B e C.
- Em `docs/finalizacoes/PENDENCIAS_AGENTE_C.md` (arquivo que a E7 **não** edita — é da integração):
  o passo 4 do P-C1-02 (linha 51-52) diz que `/admin` manda para `/inicio`, mas desde `40bb8c8` manda
  para `/painel` (`src/server/admin/acesso.ts:113,128,130`); o parágrafo "Se quiser usar o e-mail real"
  (linhas 54-56) ficou superado pelo RA-48 (`EMAILS_FIXOS_DA_EQUIPE`, `src/domain/admin/permissoes.ts:185`);
  P-C2-03 já tem `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` em Production (item 4 do B-7); P-C3-01
  está aplicada. A E7 **registra esses quatro pontos no índice e no relatório** para a integração
  atualizar, e não toca no arquivo.

---

## Tarefas

### 1. Abrir o worktree e conferir a base

```powershell
git -C C:\dev\AureaCustodiaMVP fetch origin
```

```powershell
git -C C:\dev\AureaCustodiaMVP worktree add C:\dev\AureaCustodiaMVP-e7 -b exec/e7-documentacao-das-pendencias origin/main
```

Dentro de `C:\dev\AureaCustodiaMVP-e7`:

```powershell
npm install; if ($?) { npm run typecheck }; if ($?) { npm test }; if ($?) { npm run build }
```

Se a base já falhar antes de qualquer edição, pare e diga isso no relatório (regra 1 do protocolo).
Confira que `src/app/painel/page.tsx` existe — é a prova de que a base tem a entrada do painel — e que
`docs/execucao-pendencias/00_PLANO_MESTRE.md` existe (prova do commit de base feito pelo integrador
antes do envio dos prompts). `docs/execucao-pendencias/README.md` e `relatorios/README.md` já existem
na base; a branch só cria o próprio `relatorios/E7.md`.

**Contagem de base da suíte:** 86 arquivos de teste, 741 testes passando e 1 pulado. A E7 não
acrescenta teste, então o esperado é exatamente isso. A E7 não sobe servidor de desenvolvimento (se
precisar, só na porta 3107, com `npm run dev -- -p 3107`); rode a suíte com ele parado. Arquivo que
"sumiu" da contagem é worker morto: rode de novo só ele com `npx vitest run <arquivo>` e registre no
relatório.

### 2. Reconferir as provas e guardar a saída para o relatório

Nada é marcado como feito sem ter sido conferido **nesta sessão**. Rode e copie a saída para o
relatório (sem valor de segredo — os comandos abaixo não imprimem nenhum):

```powershell
npm run db:check
```

Esperado: a linha `✓ migrations aplicadas em "aurea":` terminando em `025_caixas_fisicas`.

```powershell
vercel env ls production --cwd C:\dev\AureaCustodiaMVP
```

Esperado hoje: nenhuma linha começando com `MP_`, `NEXT_PUBLIC_APP_URL` ou `CRON_SECRET`;
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` e `SUPABASE_STORAGE_BUCKET` presentes. **Se alguma `MP_*`
aparecer**, o Gabriel cadastrou entre a escrita deste documento e a sua sessão: B-7 passa a "variáveis
cadastradas em dd/mm; falta conferir a cobrança" e o índice muda junto. **Este comando não é
obrigatório:** ele depende da CLI da Vercel autenticada. Se ela não estiver autenticada nesta sessão,
ou se o comando for barrado por permissão, não contorne: escreva no relatório e no índice "não
conferido nesta sessão" e mantenha a evidência de 15/09 citada acima.

```powershell
foreach ($u in 'https://aurea-custodia-mvp.vercel.app/', 'https://aurea-custodia.vercel.app/', 'https://aurea-custodia-mvp.vercel.app/api/webhooks/mercadopago') { try { $r = Invoke-WebRequest -Uri $u -Method Get -UseBasicParsing -MaximumRedirection 0; "$u -> $($r.StatusCode)" } catch { "$u -> $($_.Exception.Response.StatusCode.value__)" } }
```

Esperado: 200, 404, 405.

```powershell
git log --oneline -1 2cc7194; git log --oneline -1 bb975db; git log --oneline -1 c0ad95f; git merge-base --is-ancestor c0ad95f origin/main; if ($?) { "c0ad95f na main" }
```

Nenhum valor de credencial entra em arquivo desta branch, e nenhum arquivo dela aponta para arquivo
privado: o B-7 cita os nomes das variáveis e aponta para o passo 5 de
`docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`, onde o Gabriel copia os valores do painel do
Mercado Pago.

### 3. Reescrever `docs/finalizacoes/PENDENCIAS_AGENTE_B.md` (commit 1)

**Por quê:** o Git trata o arquivo como binário e qualquer leitor (pessoa ou agente) lê nome de
tabela errado (`urea.retiradas`, `eat/b-cobranca…`, `alse`).

**Como** — com a ferramenta de escrita de arquivo do agente (Write/Edit), **nunca** com
`Set-Content`/`Out-File`/`"..."` do PowerShell, que é o que corrompeu. UTF-8 sem BOM, fim de linha LF.
Reescreva o arquivo inteiro mantendo a estrutura das quatro seções e o cabeçalho, com estas
reconstruções exatas:

- linhas 3 e 8: ` ``` `; linha 17: ``Após o merge de `feat/b-cobranca-e-custodia` na branch `main`:``;
  linhas 19-22: bloco ` ```bash ` com `npm run db:migrate` e `npm run db:check`;
- seção 1, conferida contra as migrations 017-019 e contra o B-6:
  - ``1. **`017_cobrancas_gateway.sql` (B1)**:`` — coluna `` `parcelas_max integer NOT NULL DEFAULT 1` `` em
    `` `aurea.payment_intents` ``; `` `payment_intents_tipo_operacao_check` `` com `` `'deposito'` ``,
    `` `'compra_direta'` ``, `` `'plano_custodia'` ``, `` `'fatura_custodia'` ``, `` `'assinatura_custodia'` ``,
    `` `'retirada'` `` (confira a lista em `017_cobrancas_gateway.sql:14` e seguintes — vale o que está no
    SQL); tabela `` `aurea.recebimentos_gateway` `` com índices e RLS ligada;
  - ``2. **`018_planos_custodia.sql` (B2)**:`` — `` `aurea.planos_custodia` ``; colunas `` `plano_id text` `` e
    `` `origem text` `` em `` `aurea.faturas_custodia` ``; `` `modalidade_envio text` `` em `` `aurea.envios` ``;
  - ``3. **`019_retirada_paga.sql` (B3)**:`` — `` `forma_pagamento text` ``, `` `payment_intent_ref text` `` e
    `` `parcelas integer NOT NULL DEFAULT 1` `` em `` `aurea.retiradas` ``;
- seção 2, tabela: `` `MP_ACCESS_TOKEN` `` | "Credencial de acesso de produção" (sem valor nem prefixo de valor);
  `` `MP_WEBHOOK_SECRET` `` | "Chave secreta do webhook de produção"; `` `MP_SANDBOX` `` | `` `false` ``;
  nota: ``O código já garante que `MP_SANDBOX=false` use só a credencial de produção (B1.0,
  `src/lib/payments/mercadopago.ts:32-39`).``
- seção 4: `` `src/domain/fees.ts` ``, `` `src/domain/retirada.ts` ``, `` `alimentarPlanoNaAnalise` ``.

Troque as palavras proibidas que o original tinha em texto corrido ("Token de produção" → "Credencial
de acesso de produção"; "RLS ativado" → "RLS ligada"). O **nome** da variável `MP_ACCESS_TOKEN` fica:
é o nome que o código lê.

E acrescente o estado de cada seção, no estilo de `PENDENCIAS_AGENTE_C.md` (citação logo abaixo do
título, o item não some):

- seção 1 → `> ✅ **FEITO em 14/09**, pelo Agente C, antes do push do merge 4d35ee7 (RELATORIO_AGENTE_C.md, "Banco de produção e publicação"). Conferido de novo em dd/mm por npm run db:check: 017_cobrancas_gateway, 018_planos_custodia e 019_retirada_paga aplicadas.` (com crases nos nomes);
- seção 2 → `> 🟡 **ABERTA** — é o B-7 de docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md, que tem a lista completa e a evidência de dd/mm.` Acrescente `NEXT_PUBLIC_APP_URL` | `https://aurea-custodia-mvp.vercel.app` à tabela;
- seção 3 → `> 🟡 **ABERTA** — é o B-8 (decisão dos sócios).`;
- seção 4 → uma linha: ``O pedido da frente C à B sobre `conciliacao.ts` e `estacao/analise.ts` (P-C3-03) está em execução na E2 (`exec/e2-cobranca-com-configuracao-vigente`); a integração atualiza esta linha no merge.``

**Prova:** os três comandos do item 1 de "Objetivo final" e a leitura do arquivo renderizado
(nenhum `urea`, `eat/`, `alse`, `limentar` sobrando):

```powershell
Select-String -Path docs\finalizacoes\PENDENCIAS_AGENTE_B.md -Pattern '\burea\.|\beat/|\balse\b|\blimentar|\borma_' -CaseSensitive
```

Esperado: nenhuma saída.

Commit: `Conserta o texto corrompido das pendencias da frente B`

### 4. Marcar os itens feitos em `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` (commit 2)

**Regra de convivência com a E4:** o bloco do **B-2 (linhas 31-40) fica byte a byte igual**. Nada
muda de seção (não mover item de "Abertas" para outra seção): marcar **no lugar**, para que as
mudanças da E7 e uma eventual da E4 não caiam no mesmo trecho.

- Abaixo da linha 12 (`Item resolvido **não some**…`), acrescentar um parágrafo: ``Desde 15/09, com as
  frentes A, B e C encerradas, os itens resolvidos ficam no lugar, marcados no título. A lista do que
  continua aberto, de todos os arquivos, está em [`../PENDENCIAS_ABERTAS.md`](../PENDENCIAS_ABERTAS.md).``
- B-1, B-3, B-4, B-5: trocar o `🟡` do título por `✅ FEITO em 11/09` e pôr logo abaixo do título:
  `> Aplicada em 11/09 (CHECKUP_11_09_2026.md, seção 1). Conferida em dd/mm por npm run db:check: <nome da migration> na lista.`
- B-6: `✅ FEITO em 14/09`, com `> Aplicadas em 14/09 pelo Agente C antes do push de 4d35ee7 (RELATORIO_AGENTE_C.md, "Banco de produção e publicação"; PENDENCIAS_AGENTE_C.md, P-M-03). Conferidas em dd/mm por npm run db:check.`
- B-7 (fica 🟡): logo abaixo do título, citação com a evidência da tarefa 2 (data da conferência, ou
  "não conferido nesta sessão" se a CLI da Vercel não estava autenticada; "nenhuma variável MP_* no
  ambiente Production da Vercel" na última conferência; o commit `2cc7194` ligou o código e deixou as
  credenciais com o Gabriel). Na tabela, "O que falta" passa a listar **quatro** variáveis e o webhook.
  Acrescentar, abaixo da tabela, só os nomes e o que não é credencial:

  - variáveis (Production): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX` — passo a passo no passo 5
    de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` (os valores o Gabriel copia do painel do
    Mercado Pago; nenhum entra no repositório);
  - `NEXT_PUBLIC_APP_URL`, com o valor:

    ```
    https://aurea-custodia-mvp.vercel.app
    ```

  - endereço do webhook de produção (a configuração no painel do Mercado Pago está no mesmo passo 5 do tutorial):

    ```
    https://aurea-custodia-mvp.vercel.app/api/webhooks/mercadopago
    ```

  "Como conferir" passa a ser: (1) se a CLI da Vercel estiver autenticada,
  `vercel env ls production --cwd C:\dev\AureaCustodiaMVP` lista as quatro (opcional); (2) depois do
  Redeploy, `https://aurea-custodia-mvp.vercel.app/admin/configuracao?aba=integracoes` mostra
  "Pagamento (Mercado Pago)" ligado e a observação `Modo: produção (MP_SANDBOX=false).`
  (`src/domain/admin/integracoes.ts:87`); (3) **pelo gateway, com credencial**: um depósito de R$ 1,00
  por Pix abre o QR do Mercado Pago e não a modal do simulador; **sem credencial** (estado de hoje), o
  mesmo depósito abre a modal do simulador, porque sem `MP_ACCESS_TOKEN` o
  `src/server/actions/payments.ts` responde pelo simulador — é assim que se confere o fluxo enquanto as
  variáveis não existem.
- B-8: sem mudança de conteúdo.

**Prova:** `git diff origin/main -- docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` não tem nenhuma
linha entre `### B-2` e o `---` seguinte.

### 5. Marcar os itens em `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md` (commit 2)

- Mesmo parágrafo novo abaixo da linha 12.
- D-2: título `### D-2 · Prazo de retirada: D+30 total ou D+30 postagem + D+5 trânsito? ✅ DECIDIDO em 11/09`;
  abaixo: `> D+30 é o prazo operacional da Áurea para preparar e postar; o trânsito dos Correios corre por fora, sem número prometido. Decisão em PLANO_EXECUTIVO_PUBLICACAO.md, seção 5 ("D-2 · O prazo de postagem"), aplicada na tela, no certificado, nos termos e na Academy pelo commit 2cc7194. Desde a C3 os prazos da logística e dos Termos também se editam em /admin/configuracao, aba Operacional.`
- C-1: título `### C-1 · Aplicação da migration 011 no Supabase de produção ✅ FEITO em 11/09`; abaixo: `> O título dizia 009: a migration nasceu 009 e virou 011 no merge cc3c95c (CHECKUP_11_09_2026.md, seção 3.1). Aplicada em 11/09; conferida em dd/mm por npm run db:check (011_retiradas).`
- C-2: igual, com `012` e `012_retiradas_ledger`.
- D-6: nada.

Commit (tarefas 4 e 5 juntas): `Marca como feitas as pendencias manuais ja resolvidas, com evidencia`

### 6. Consertar os textos desatualizados que viram trava ou erro de colagem (commit 3)

| Arquivo | Linha | De | Para |
|---|---|---|---|
| `docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md` | 17-19 | "quatro já foram fechadas em 10/09/2026; duas continuam abertas (D-2 … e D-6 …)" | "as seis foram fechadas entre 10 e 11/09/2026 (seção 5)" — só essa frase; o resto do parágrafo fica |
| `docs/tutoriais/TUTORIAL_MERCADO_PAGO.md` | 169 | "É algo como `aurea-custodia.vercel.app`" | "É `aurea-custodia-mvp.vercel.app` (conferido em dd/mm, respondendo 200)" |
| `docs/tutoriais/TUTORIAL_MERCADO_PAGO.md` | 174 | `NEXT_PUBLIC_APP_URL = https://aurea-custodia.vercel.app` | `NEXT_PUBLIC_APP_URL = https://aurea-custodia-mvp.vercel.app` |
| `.env.example` | 89 | "Deixe ausente. Só 'false' liga produção — e isso depende do RA-01." | "Ausente = teste (padrão). 'false' liga produção; o RA-01 foi encerrado em 11/09." |
| `.env.example` | 94 | `# NEXT_PUBLIC_APP_URL="https://aurea-custodia.vercel.app"` | `# NEXT_PUBLIC_APP_URL="https://aurea-custodia-mvp.vercel.app"` |
| `docs/finalizacoes/README.md` | 11 | "`PENDENCIAS_AGENTE_A.md` · `_B.md` · `_C.md`" | "`PENDENCIAS_AGENTE_B.md` · `_C.md` (a frente A não abriu arquivo nesta rodada; o que ficou dela está em `../publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md`)"; e uma linha nova na tabela de conexões apontando para `../PENDENCIAS_ABERTAS.md` |
| `docs/publish_docs/PROTOCOLO_DO_AGENTE.md` | depois da 125 | — | Um parágrafo: "**Desde 15/09/2026**, com as frentes A, B e C encerradas, os arquivos de pendência dessas frentes são atualizados pela branch que resolver o item ou pela integração, e o índice [`../PENDENCIAS_ABERTAS.md`](../PENDENCIAS_ABERTAS.md) é a porta de entrada. Quem fecha um item marca `✅ FEITO em dd/mm` no arquivo de origem **e** na linha do índice, no mesmo commit." |
| `docs/EXECUCOES_MANUAIS_PENDENTES.md` | depois do bloco de cabeçalho (linha 10) | — | `> **Histórico de 03/09.** A lista viva do que continua pendente está em [PENDENCIAS_ABERTAS.md](PENDENCIAS_ABERTAS.md).` |

`.env.example` é o único arquivo fora de `docs/` que a E7 toca, e só nessas duas linhas de comentário.

Commit: `Atualiza textos que ainda davam D-2, D-6 e o RA-01 como abertos e o endereco errado do site`

### 7. Criar o índice único `docs/PENDENCIAS_ABERTAS.md` (commit 4)

**Onde:** `docs/PENDENCIAS_ABERTAS.md`, na raiz de `docs/`, ao lado de `EXECUCOES_MANUAIS_PENDENTES.md`
(que ele substitui como porta de entrada). **Por que ali:** nenhuma das branches E1 a E6 escreve na
raiz de `docs/`, e o índice precisa sobreviver às pastas de rodada (`finalizacoes/`, `publish_docs/`,
`execucao-pendencias/`), que vão e vêm.

**Formato** (seguir esta estrutura; os links são relativos a `docs/`):

````markdown
# Pendências abertas — o índice único

```
Conferido em:  dd/mm/2026, na main <hash>
Fontes:        publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md · _B.md · _C.md
               finalizacoes/PENDENCIAS_AGENTE_B.md · finalizacoes/PENDENCIAS_AGENTE_C.md
               ../RISCOS_ASSUMIDOS.md (RA-24, RA-43 a RA-48)
Provas:        npm run db:check · vercel env ls production (se a CLI estiver autenticada) · git log
Regra:         quem fecha um item marca ✅ no arquivo de origem E move a linha para
               "Resolvidas" aqui, no mesmo commit. ID nunca é reaproveitado.
```

> **Para o Rogério.** (um parágrafo: o que ainda depende de pessoa, o que está sendo feito por
> agente, e que o pagamento de verdade é o principal item manual)

## 1. Com o Gabriel e os sócios
| ID | O que falta | Quem | O que fica esperando | Como conferir | Fonte |

## 2. Em execução nas branches de 15/09
| ID | O que falta | Branch | Riscos ligados | Fonte |

## 3. Para a integração atualizar nos arquivos de origem
| Onde | O que mudou | Prova |

## 4. Resolvidas — com a prova
| ID | Resolvida em | Prova | Fonte |

## 5. Informativos, sem ação
| ID | O que registra | Fonte |

## 6. Riscos registrados ligados a pendências
| RA | Resumo | Situação | Branch |
(frase fixa acima da tabela: "Risco registrado é anotação, não portão: nenhum RA abaixo é
pré-requisito de publicação.")

## 7. Outras listas vivas (apontadas, não copiadas)
````

**Conteúdo** — linha a linha:

**Seção 1 · Com o Gabriel e os sócios**

| ID | O que falta | Quem | O que fica esperando | Como conferir | Fonte |
|---|---|---|---|---|---|
| B-7 | Cadastrar na Vercel (Production) `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX` e `NEXT_PUBLIC_APP_URL` = `https://aurea-custodia-mvp.vercel.app`; webhook de produção; Redeploy — passo a passo no passo 5 de `execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` (valores copiados do painel do Mercado Pago, fora do repositório) | Gabriel | Cobrança real por Pix e cartão; hoje cai no simulador | Aba Integrações diz `Modo: produção (MP_SANDBOX=false).`; depósito de R$ 1,00 abre o QR do Mercado Pago (sem credencial, abre o simulador); `vercel env ls production` lista as quatro, se a CLI estiver autenticada | `publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` (B-7) |
| B-8 | Decidir se a Áurea absorve os juros do parcelamento | Gabriel e Rogério | Texto do checkout ("sem acréscimo" ou com acréscimo) | Decisão escrita; se absorver, opção ligada no painel do Mercado Pago (passo 6 de `execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`) | idem (B-8) e `finalizacoes/PENDENCIAS_AGENTE_B.md` seção 3 |
| N-01 | Criar `CRON_SECRET` na Vercel (Production) e fazer Redeploy (passo 7 de `execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`). **Aviso:** com a variável, o faturamento mensal passa a gerar e debitar faturas de custódia (inclusive nas contas de teste dos sócios); a E4 isenta as contas da equipe do bloqueio por pendência | Gabriel | Rastreio diário e faturamento de custódia do dia 1 respondem 401 em produção (`src/app/api/cron/faturamento/route.ts:18-22`, `shipping/route.ts:26-30`) | `vercel env ls production` lista `CRON_SECRET` (se a CLI estiver autenticada); aba Integrações mostra "Tarefas agendadas" ligada (`src/domain/admin/integracoes.ts:131-135`, que já diz "As rotas de /api/cron recusam a chamada fora do ambiente de desenvolvimento"); execução do cron com 200 na Vercel | achado da E7 em dd/mm (sem arquivo de origem) |
| P-C2-02 | Escolher o provedor de WhatsApp e ligar o atendimento (Evolution: servidor, instância `aurea-cs`, webhook, quatro variáveis) | Gabriel | Mensagens de verdade em `/admin/cs` e o número em `/suporte` (P-C2-06) | Roteiro do próprio item | `finalizacoes/PENDENCIAS_AGENTE_C.md` (P-C2-02) |
| P-C1-02 | Conferir logado as quatro telas da Central de Resultados | Gabriel | Nada trava; é a prova visual | Roteiro do item — com a correção da seção 3 deste índice | idem (P-C1-02) |
| P-C3-02 | Conferir logado bancada, moedas, logística e configuração | Gabriel | Nada trava | Roteiro do item | idem (P-C3-02) |
| P-M-01 | Conferir logado `/inicio`, `/mercado`, `/admin/resultados/financeiro`, `/admin/usuarios` | Gabriel | Nada trava | Roteiro do item | idem (P-M-01) |
| P-M-02 | Atualizar a pasta principal (`C:\dev\AureaCustodiaMVP` está em `b359f27`, 50 commits atrás; avança sem conflito) | Gabriel | Nada no site | `git -C C:/dev/AureaCustodiaMVP log --oneline -1` mostra o hash da main | idem (P-M-02) |

**Seção 2 · Em execução nas branches de 15/09**

Frase fixa acima da tabela: "Estado anterior aos merges de E1 a E6. A integração passa cada linha para a
seção 4 no mesmo commit do merge da E7, que é mesclada por último."

| ID | O que falta | Branch | Riscos ligados | Fonte |
|---|---|---|---|---|
| P-C2-04 | Conta desativada recusada no login do catálogo, no login Supabase, no callback e na sessão já aberta | em execução na E1 (`exec/e1-portas-de-entrada-da-conta`) | RA-44 | `finalizacoes/PENDENCIAS_AGENTE_C.md` |
| P-C2-05 | Tela de nova senha no link de recuperação | em execução na E1 | RA-43 | idem |
| P-C2-09 | `settings.legalAcceptance` apagado na gravação do Postgres (`src/server/db/diff.ts`) | em execução na E1 | — | idem |
| P-C3-03 | Compra direta pelo gateway e valor de entrada da análise com a tabela e o catálogo vigentes | em execução na E2 (`exec/e2-cobranca-com-configuracao-vigente`) | RA-24, RA-47 | idem |
| P-C1-03 | Remover o painel antigo de relatórios | em execução na E3 (`exec/e3-limpeza-relatorios-antigos`) | — | idem |
| A-4 | Preço de custódia informado ao cliente | em execução na E4 (`exec/e4-custodia-preco-e-inadimplencia`) | — | `publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md` |
| B-2 | Recibo bloqueado por inadimplência na retirada e na venda | em execução na E4 | — | `publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` |
| QA-C1C2 | Análise, testes e melhorias de `/painel`, `/admin`, resultados, equipe, CS, usuários | E5 `exec/e5-qa-painel-resultados-equipe-cs-usuarios` | RA-40, RA-41, RA-42, RA-48 | plano da E5 |
| QA-C3 | Análise, testes e melhorias de bancada, moedas, logística, configuração | E6 `exec/e6-qa-painel-bancada-moedas-logistica-configuracao` | RA-45, RA-46 | plano da E6 |

**Seção 3 · Para a integração atualizar nos arquivos de origem** (a E7 não edita
`finalizacoes/PENDENCIAS_AGENTE_C.md`)

| Onde | O que mudou | Prova |
|---|---|---|
| P-C1-02, passo 4 | `/admin` sem acesso manda para `/painel`, não para `/inicio` | `src/server/admin/acesso.ts:113,128,130` (commit `40bb8c8`) |
| P-C1-02, "Se quiser usar o e-mail real" | O e-mail do Gabriel já é `dev` pelo código | `EMAILS_FIXOS_DA_EQUIPE`, `src/domain/admin/permissoes.ts:185` (RA-48) |
| P-C2-03 | `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` existem em Production; falta só olhar a aba Cadastro (passo 4 de `execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`) | `vercel env ls production` em dd/mm (ou a evidência de 15/09, se "não conferido nesta sessão") |
| P-C3-01 | 024 e 025 aplicadas | `npm run db:check` em dd/mm |

**Seção 4 · Resolvidas — com a prova**

| ID | Resolvida em | Prova | Fonte |
|---|---|---|---|
| B-1, B-3, B-4, B-5 | 11/09 | 007, 008, 009, 010 no `db:check` de dd/mm; `CHECKUP_11_09_2026.md` seção 1 | `publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` |
| B-6 e seção 1 de `finalizacoes/PENDENCIAS_AGENTE_B.md` | 14/09 | 017, 018, 019 no `db:check`; `RELATORIO_AGENTE_C.md` "Banco de produção e publicação" | idem e `finalizacoes/PENDENCIAS_AGENTE_B.md` |
| C-1, C-2 | 11/09 | 011, 012 no `db:check` | `publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md` |
| D-2 | 11/09 (decisão) | `PLANO_EXECUTIVO_PUBLICACAO.md` seção 5; commit `2cc7194` | idem |
| D-6 | 10/09 | `src/lib/shipping/correios.ts` (`ENDERECO_CENTRAL_AUREA`), commit `c0ad95f` | `PENDENCIAS_MANUAIS_AGENTE_A.md` e `_C.md` |
| A-1, A-2, A-3 | 10/09 | já marcadas no arquivo | `PENDENCIAS_MANUAIS_AGENTE_A.md` |
| P-C1-01, P-C2-01 | 14/09 | já marcadas no arquivo; `db:check` | `finalizacoes/PENDENCIAS_AGENTE_C.md` |
| P-C2-06, P-C2-07 | 14/09 | já marcadas no arquivo (falta só o número, que depende do P-C2-02) | idem |
| P-C3-01 | 14/09 | `db:check` (a marcar no arquivo pela integração) | idem |

**Seção 5 · Informativos** — P-C1-04 (gaveta `aurea_local_admin`; apagar é opcional), P-C2-08,
P-C3-04 (vídeo da bancada: as variáveis `SUPABASE_*` já estão em Production), P-M-03, seção 4 de
`finalizacoes/PENDENCIAS_AGENTE_B.md`.

**Seção 6 · Riscos ligados** — RA-24, RA-43, RA-44, RA-45, RA-46, RA-47, RA-48, cada um com o
título da tabela de `RISCOS_ASSUMIDOS.md:57-70`, a situação ("registrado", sem emoji de alarme novo)
e a branch que mexe nele (E1: RA-43, RA-44; E2: RA-24, RA-47; E6: RA-45, RA-46; E5: RA-48). Não
copiar o texto dos RA — só apontar.

**Seção 7 · Outras listas vivas** — `diario/CRITICAL_DEBUGS.md` (CD-08, CD-12, CD-13);
`finalizacoes/2026-09-13_minuta_pontos_para_os_socios.md` (respostas dos sócios à minuta);
`PRE_LANCAMENTO_CLIENTES_REAIS.md` (vale na fase de cliente real, não agora);
`EXECUCOES_MANUAIS_PENDENTES.md` (histórico de 03/09).

Acrescentar em `docs/README.md` **duas linhas, sem reordenar nada**: na árvore, logo abaixo da linha 16
(`EXECUCOES_MANUAIS_PENDENTES.md`), `├── PENDENCIAS_ABERTAS.md            📌 O índice único do que continua pendente, com dono e prova`;
e na tabela "Se você…", logo acima da linha 103, `| **Quer saber o que ainda está pendente, e de quem é** | `PENDENCIAS_ABERTAS.md` |`.

Commit: `Cria o indice unico das pendencias abertas`

### 8. Varredura de terminologia nos arquivos tocados

```powershell
git diff --name-only origin/main | ForEach-Object { Select-String -Path $_ -Pattern '\b(token|tokens|NFT|NFTs|cripto\w*|ativo digital|ativos?|investiment\w*|investidor\w*|corretora|rentabilidade|retorno)\b' }
```

Julgue pelo sujeito da frase: sobre a Áurea, o recibo, a moeda ou o marketplace, a palavra sai. O nome
literal de variável (`MP_ACCESS_TOKEN`) não casa com `\btoken\b` e fica. Linha pré-existente que você
não tocou fica como está.

### 9. Conferir os links do índice

```powershell
Select-String -Path docs\PENDENCIAS_ABERTAS.md -Pattern '\]\(([^)#]+)' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $p = Join-Path docs $_.Groups[1].Value; if (-not (Test-Path $p)) { "QUEBRADO: $p" } }
```

Esperado: nenhuma saída. Repita trocando o caminho para `docs\publish_docs\PENDENCIAS_MANUAIS_AGENTE_B.md`
com `Join-Path docs\publish_docs` e para `docs\publish_docs\PROTOCOLO_DO_AGENTE.md`.

### 10. Ciclo, push e relatório (commit 5)

```powershell
npm run typecheck; if ($?) { npm run lint }; if ($?) { npm test }; if ($?) { npm run build }
```

```powershell
git push -u origin exec/e7-documentacao-das-pendencias
```

Relatório em `docs/execucao-pendencias/relatorios/E7.md` (seção "Entrega"). Commit:
`Relatorio da E7: pendencias conferidas e indice unico`, e push de novo.

---

## Território

### Pode editar

| Caminho | Limite |
|---|---|
| `docs/PENDENCIAS_ABERTAS.md` | novo — só a E7 cria |
| `docs/finalizacoes/PENDENCIAS_AGENTE_B.md` | reescrita inteira (só a E7 edita nesta rodada) |
| `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` | todos os blocos **menos o B-2** (linhas 31-40 byte a byte iguais) |
| `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md` | parágrafo após a linha 12, D-2, C-1, C-2 |
| `docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md` | só a frase das linhas 17-19 |
| `docs/publish_docs/PROTOCOLO_DO_AGENTE.md` | só o parágrafo novo depois da linha 125 (regra 8) |
| `docs/tutoriais/TUTORIAL_MERCADO_PAGO.md` | só as linhas 169 e 174 |
| `docs/finalizacoes/README.md` | linha 11 e uma linha nova na tabela de conexões |
| `docs/README.md` | duas linhas novas (árvore e tabela), sem reordenar |
| `docs/EXECUCOES_MANUAIS_PENDENTES.md` | só a nota depois do cabeçalho |
| `.env.example` | só as linhas de comentário 89 e 94 |
| `docs/execucao-pendencias/relatorios/E7.md` | novo — o relatório |

### Não pode editar

| Caminho | Por quê / de quem é |
|---|---|
| `docs/finalizacoes/PENDENCIAS_AGENTE_C.md` | da integração (os quatro pontos vão na seção 3 do índice e no relatório) |
| `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md` | A-4 é da E4; o resto já está certo |
| Bloco B-2 de `PENDENCIAS_MANUAIS_AGENTE_B.md` | E4 |
| `RISCOS_ASSUMIDOS.md` e todo `ATALHOS.md` | E1 (RA-43, RA-44, RA-49, RA-50), E2 (RA-24, RA-47, RA-51), E4 (RA-52, RA-53), E5 (RA-54), E6 (RA-55). A E7 não toma atalho. A seção RA-01 de `src/server/actions/ATALHOS.md` já chega corrigida no commit de base: nada a fazer nela |
| `docs/diario/**` (inclusive `VERSION_COMPARISON_DAILY.md`, append-only, e `CRITICAL_DEBUGS.md`) | ritual de sessão; entrada nova ali colide com outras branches |
| `docs/finalizacoes/RELATORIO_AGENTE_*.md`, `PLANO_FINALIZACOES_3_BRANCHES.md`, as minutas | registro histórico da rodada anterior |
| `docs/execucao-pendencias/E*.md`, `docs/execucao-pendencias/README.md`, `docs/execucao-pendencias/relatorios/README.md` e os relatórios das outras branches | orquestração e integração |
| `CLAUDE.md`, `AGENTS.md` | nenhuma regra desta branch pede mudança |
| `src/**`, `scripts/**`, `estacao/**`, `vercel.json`, `package.json` | branch só de documentação — inclusive as rotas de cron do N-01 |
| `.env.local` (qualquer pasta) e `C:\dev\AureaCustodiaMVP\docs\privado\**` | não se lê nem se escreve |

### Arquivos compartilhados — regra de convivência

| Arquivo | Quem mais pode tocar | Regra |
|---|---|---|
| `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` | E4 (bloco B-2) | marcar no lugar, sem mover blocos; B-2 intocado |
| `docs/README.md` | ninguém nesta rodada, mas é arquivo de todos | só acrescentar as duas linhas, nas posições indicadas |
| `.env.example` | E1 a E6, se pedirem variável nova | só as linhas 89 e 94; nenhuma linha acrescentada |
| `docs/execucao-pendencias/relatorios/` | as sete branches | cada uma só o seu `E<N>.md`; README da pasta é da integração |

---

## Testes exigidos

Não há teste automatizado novo: nenhum arquivo de código muda. As provas são comandos, e todos entram
no relatório com a saída colada:

| Comando | O que prova |
|---|---|
| `Select-String … '[\x00-\x08\x0B\x0C\x0E-\x1F]'` em `finalizacoes/PENDENCIAS_AGENTE_B.md` | não sobrou caractere de controle |
| `git diff --numstat origin/main -- docs/finalizacoes/PENDENCIAS_AGENTE_B.md` e `git ls-files --eol …` | o Git voltou a ver texto, com LF |
| `Select-String … '\burea\.|\beat/|\balse\b|\blimentar|\borma_' -CaseSensitive` | nenhuma palavra mutilada sobrou |
| `git diff origin/main -- docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md` | o bloco B-2 não mudou |
| `npm run db:check` | cada migration marcada como feita está aplicada |
| `vercel env ls production --cwd C:\dev\AureaCustodiaMVP` (opcional: só com a CLI autenticada; senão "não conferido nesta sessão") | B-7 e N-01 continuam abertos (ou não) na data da sessão |
| `Invoke-WebRequest` nos três endereços | 200 / 404 / 405 — o endereço literal do B-7 é o certo |
| comando de links da tarefa 9 | nenhum link quebrado no índice |
| varredura de terminologia da tarefa 8 | nenhuma palavra proibida nova |
| `git diff --name-only origin/main` | só arquivos da tabela "Pode editar" |
| `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` | nada de código foi tocado por engano; `npm test` com 86 arquivos, 741 passando e 1 pulado, como a base |

---

## Regras que valem nesta branch

- **Palavras proibidas** em todo texto que você escrever (documento, título, commit): token, NFT,
  cripto, ativo digital, ativo, investimento, investidor, corretora, rentabilidade, retorno. O termo é
  "recibo"; o objeto é "moeda" ou "item"; a credencial do Mercado Pago é "credencial de acesso". Nome
  literal de variável (`MP_ACCESS_TOKEN`) fica, porque é o que o código lê. Julgue pelo sujeito da frase.
- **Risco registrado é anotação, não portão.** Nenhuma linha do índice diz "bloqueia a publicação" nem
  trata RA como liberação pendente. A coluna é "O que fica esperando".
- **Nenhuma trava nova**, nem em texto: não escrever "não pode ser ligado até…", "exige aprovação",
  "depende do RA-xx" para algo que o Gabriel já decidiu. Instrução escrita que contrarie decisão dele
  é desatualização a corrigir (é o caso do `.env.example:89`).
- **Valor literal e completo.** Endereço, nome de variável e valor que não é segredo vão inteiros, num
  bloco próprio, mesmo que já tenham aparecido antes. Nunca "a mesma URL de antes".
- **Credencial não entra no repositório**, que é público de propósito: os arquivos da E7 trazem só os
  nomes `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `MP_SANDBOX`, sem valor e sem apontar arquivo privado,
  e apontam para o passo 5 de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` (versionado, sem
  valor secreto), onde o Gabriel copia os valores do próprio painel do Mercado Pago — eles não existem
  em arquivo nenhum, nem em `docs/privado/`. Isso é dito uma vez, sem alerta.
- **Caminho de menu de painel externo** (Vercel, Mercado Pago, Supabase) não se descreve de memória:
  aponta-se o passo correspondente de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` (4 para o
  P-C2-03, 5 para o B-7, 6 para o B-8, 7 para o N-01) e só o nome das variáveis.
- **Pendência de outra branch se registra uma vez.** A-4 e B-2 (E4), P-C2-04/05/09 (E1), P-C3-03 (E2) e
  P-C1-03 (E3) entram no índice como "em execução na E<N>" e param aí — sem cobrar, sem reabrir, sem
  conferir código delas. Marcar esses itens como feitos nos arquivos de pendência é tarefa da
  integração; a E7 marca só o que já estava feito antes desta rodada.
- **Verificar antes de afirmar.** Todo "✅ FEITO" cita a prova conferida nesta sessão; o que não deu
  para conferir é escrito como não conferido.
- **Não mexer em DNS, e-mail, domínio, variável da Vercel ou painel externo.** A E7 só lê (`vercel env
  ls`, `db:check`, `Invoke-WebRequest`); cadastrar é do Gabriel.
- **Nunca abrir `.env.local` nem `docs/privado/`**, e nunca commitar segredo.
- **Arquivo se grava com a ferramenta de escrita do agente**, em UTF-8 sem BOM e LF — nunca por string
  do PowerShell com crase, que foi exatamente o que corrompeu o arquivo da B.
- **A branch não faz merge na main.** Ciclo antes de cada push: `npm run typecheck`; `npm run lint`;
  `npm test`; `npm run build`.
- **Ambiente:** Windows, PowerShell 5.1 — sem `&&`; use `;` e `if ($?) { … }`.
- **Documento em português**, explicando o porquê; "Para o Rogério" sem jargão.

---

## O que NÃO fazer

- Não marcar A-4 nem B-2 como feitos: estão em execução na E4, cujo diagnóstico mostra defeitos vivos.
- Não editar `docs/finalizacoes/PENDENCIAS_AGENTE_C.md` — nem para marcar o P-C3-01 ou o P-C2-03.
- Não mover itens entre as seções "Abertas" e "Resolvidas" dos arquivos de pendência (gera conflito com a
  E4); marcar no título.
- Não "consertar" as rotas de cron, o `cobranca.ts` ou qualquer código: o N-01 e o `NEXT_PUBLIC_APP_URL`
  se resolvem com variável de ambiente, e isso é do Gabriel.
- Não abrir arquivo privado de credenciais, não escrever valor de credencial em arquivo nenhum da branch
  e não pedir o valor ao Gabriel: ele o copia do painel do Mercado Pago no passo 5 de
  `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`.
- Não cadastrar variável na Vercel, não fazer Redeploy, não abrir o painel do Mercado Pago.
- Não criar README em `docs/execucao-pendencias/` nem em `relatorios/`: os dois já existem na base; a
  branch só cria o próprio `relatorios/E7.md`.
- Não escrever entrada no `VERSION_COMPARISON_DAILY.md` nem no `CRITICAL_DEBUGS.md`.
- Não reescrever os arquivos de pendência "para ficar mais bonito": cada mudança da E7 tem uma linha
  nas tarefas 3 a 7; o resto fica como está.
- Não apagar item nenhum — resolvido não some.
- Não usar `Set-Content`, `Out-File` ou here-string para gravar Markdown.

---

## Entrega

**Commits**, nesta ordem, cada um com a linha de coautoria do agente que executar (para Claude:
`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`):

1. `Conserta o texto corrompido das pendencias da frente B`
2. `Marca como feitas as pendencias manuais ja resolvidas, com evidencia`
3. `Atualiza textos que ainda davam D-2, D-6 e o RA-01 como abertos e o endereco errado do site`
4. `Cria o indice unico das pendencias abertas`
5. `Relatorio da E7: pendencias conferidas e indice unico`

**Push** da branch `exec/e7-documentacao-das-pendencias`, **sem merge na main**. A E7 é mesclada por
último, depois de E1 a E6, e a integração atualiza o índice (seção 2 para a 4, itens marcados nos
arquivos de origem) no mesmo commit desse merge. Se o push for barrado
por permissão, o relatório traz o comando pronto:

```powershell
git -C C:\dev\AureaCustodiaMVP-e7 push -u origin exec/e7-documentacao-das-pendencias
```

**Relatório** em `docs/execucao-pendencias/relatorios/E7.md`, com:

1. **O que foi feito** — arquivo por arquivo, com a lista dos itens marcados e a data usada em cada um.
2. **Testes** — a tabela de "Testes exigidos" com a saída real de cada comando.
3. **O que foi conferido e como** — `db:check` (linha das migrations), `vercel env ls production`
   (só os nomes, ou "não conferido nesta sessão"), os três códigos HTTP, os hashes `2cc7194`, `bb975db`,
   `c0ad95f`, `4d35ee7`.
4. **O que ficou para a integração** — os quatro pontos da seção 3 do índice, com a linha exata de
   `finalizacoes/PENDENCIAS_AGENTE_C.md` a mudar; e, no mesmo commit do merge da E7 (o último): mover as
   linhas da seção 2 para a seção 4 do índice conforme E1 a E6 entraram, e marcar A-4, B-2,
   P-C2-04/05/09, P-C3-03, P-C1-03 e P-C3-01 nos arquivos de origem.
5. **Riscos** — nenhum novo; B-7 e N-01 continuam abertos (uma frase cada, sem alarme; o N-01 com o
   aviso do faturamento).
6. **Passos manuais** — os da seção abaixo: nomes das variáveis e endereços literais; caminhos de painel
   apontados para os passos 4 a 7 de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`; valores de
   credencial em arquivo nenhum (o Gabriel os copia do painel do Mercado Pago).
7. A linha final: `E7 pronta para integração — <hash do último commit>`.

---

## Passos manuais que sobram para o Gabriel

Estes são registrados pela E7 no B-7 e no N-01 — **a E7 não executa nenhum deles**.

### B-7 · Ligar o Mercado Pago de produção

O passo a passo conferido, com os caminhos de menu da Vercel e do Mercado Pago, está no **passo 5** de
`docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md` (versionado, sem valor secreto). Ali o Gabriel
copia a credencial de acesso de produção e a assinatura secreta do webhook do próprio painel do Mercado
Pago; esses valores não existem em arquivo nenhum, nem em `docs/privado/`, e nenhum entra no
repositório. Aqui ficam só os nomes e os endereços.

**1.** Variáveis no ambiente **Production** da Vercel: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
`MP_SANDBOX` e `NEXT_PUBLIC_APP_URL`. O valor de `NEXT_PUBLIC_APP_URL`:

```
https://aurea-custodia-mvp.vercel.app
```

**2.** Webhook de produção do Mercado Pago, com o endereço:

```
https://aurea-custodia-mvp.vercel.app/api/webhooks/mercadopago
```

**3.** Redeploy do projeto na Vercel (variável nova só vale em build novo).

**4.** Conferir. Logado, `https://aurea-custodia-mvp.vercel.app/admin/configuracao?aba=integracoes`
mostra "Pagamento (Mercado Pago)" com `Modo: produção (MP_SANDBOX=false).`; pelo gateway, um depósito de
R$ 1,00 por Pix abre o QR do Mercado Pago. Sem as credenciais, o mesmo depósito abre a modal do
simulador (`src/server/actions/payments.ts` responde pelo simulador sem `MP_ACCESS_TOKEN`). Se a CLI da
Vercel estiver autenticada, também dá para conferir os nomes (opcional):

```powershell
vercel env ls production --cwd C:\dev\AureaCustodiaMVP
```

Esperado: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX` e `NEXT_PUBLIC_APP_URL` na lista.

**Como voltar atrás:** apagar `MP_SANDBOX` (ou mudar para `true`) e fazer Redeploy — o site volta ao
modo teste.

### N-01 · `CRON_SECRET` para os agendamentos rodarem em produção

**1.** Gerar o valor, no PowerShell, e guardar a saída:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2.** Variável `CRON_SECRET` no ambiente **Production** da Vercel, com a linha inteira que o comando
imprimiu, e Redeploy. O passo a passo conferido está no passo 7 de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`.

**Aviso antes de cadastrar:** com `CRON_SECRET`, o faturamento mensal de custódia (dia 1, 08:00 UTC)
passa a gerar e debitar faturas — inclusive nas contas de teste dos sócios, que hoje nunca foram
faturadas. A E4 isenta as contas da equipe do bloqueio por pendência, então nenhuma delas fica sem
vender ou retirar por isso; o débito da fatura acontece.

**3.** Conferir: no dia seguinte, a execução de `/api/cron/shipping` aparece com 200 no registro de
agendamentos do projeto na Vercel (onde fica: passo 7 do tutorial). Se a CLI da Vercel estiver autenticada,
`vercel env ls production --cwd C:\dev\AureaCustodiaMVP` lista `CRON_SECRET` (opcional).

### B-8 · Juros do parcelamento

Decisão dos sócios (Gabriel e Rogério): a Áurea absorve os juros ou o cliente paga. Se absorver, a
opção de parcelamento sem acréscimo se liga no painel do Mercado Pago — o passo a passo conferido está
no passo 6 de `docs/execucao-pendencias/TUTORIAL_MANUAL_GABRIEL.md`. Se o cliente pagar, nada a fazer no painel.

### P-M-02 · Atualizar a pasta principal

```powershell
git -C C:/dev/AureaCustodiaMVP pull --ff-only
```

Esperado: avança de `b359f27` para a main do GitHub sem conflito (`b359f27` já está dentro dela).
