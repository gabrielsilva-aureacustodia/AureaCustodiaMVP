# Modelo dos chats de branch (nível 2) e dos filhos (nível 3)

```
Projeto:   Áurea Custódia / Real Olímpico — pacote docs/manutencao-2026-11/
Serve a:   as 12 frentes (A a L). A M não tem branch (é a análise de tráfego, feita pelo chat de preparação). Cada ficha em frentes/ diz só o que é DA frente; o resto está aqui.
Origem:    processo eficiente de branches 2.0 (docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md)
Estado:    arquivo de trabalho LOCAL, sem commit até o fim (B2). Leia por CAMINHO ABSOLUTO: as worktrees não têm este pacote.
```

> Este MD não cria regra. Tudo o que é regra aponta para a Sintetica (`C:\dev\Sintetica\processo\`) ou para o `CLAUDE.md`. Se algo aqui parecer proibir o trabalho, é erro do MD: avise o Controle (R10, R13).

## 1. Passo 0 de toda frente — preparar a worktree (o chat de branch faz, uma vez)

O terminal do Gabriel é **PowerShell** (`&&` não existe). Na raiz da worktree da frente:

```powershell
# 1) node_modules por junção (nunca instalar de novo: pesado)
New-Item -ItemType Junction -Path node_modules -Target C:\dev\AureaCustodiaMVP\node_modules
# 2) variáveis de ambiente locais (NUNCA commitar; SUPABASE_PUBLISHABLE_KEY nunca é removida)
Copy-Item C:\dev\AureaCustodiaMVP\.env.local .env.local
# 3) conferir a base
git status -sb ; git log -1 --oneline
```

Base esperada: `9e21fe1`. Se a worktree nasceu de outro commit, avise o Controle antes de editar.

## 2. O registro vivo da frente (único arquivo que a branch escreve fora da worktree)

`C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\registro\<ID>.md` (ex.: `A.md`). É o canal entre a frente e o Controle, e o fallback se a mensagem entre chats falhar. Formato:

```markdown
# Registro — frente <ID> (<slug>)
Atualizado: AAAA-MM-DD HH:mm
Worktree: <caminho absoluto>        Branch: <nome>
Sessões: branch=<local_id> · execução=<local_id> · auditoria=<local_id> · específico=<local_id ou "não">
Estado: iniciando | executando | bloqueada | pronta para merge | mesclada
Tópico atual: T<n> — <uma linha>
Feito: <T1, T2…>      Falta: <…>
Bloqueio (para quem): <nada | "Gabriel: …" | "frente X: …">
Superfície protegida tocada: <nada | arquivo — por quê>
Migration: <nada | NNN_nome.sql (aplicar só no commit)>
Testes da branch: <não rodou | verde (qual) | vermelho (uma linha)>
Linhas para os índices (o Controle aplica no merge): <docs/memorias/README.md · INDICE_VEGA · ESTADO-GERAL>
```

**Branch não edita** `docs/memorias/README.md`, `docs/INDICE_VEGA.md`, `ESTADO-GERAL-*`, `CLAUDE.md`, nem arquivo geral da raiz (B5). Escreve a linha pronta no registro e o Controle encaixa no merge.

## 3. Nível 2 — o que o chat de branch faz (nesta ordem)

1. Lê, **por caminho absoluto**: o `CLAUDE.md` da worktree, `docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md`, `00_MD_EXECUTIVO.md`, **este arquivo** e a **ficha da frente** (`frentes/<ID>-*.md`). Depois só o que a lista **Ler** da ficha mandar (E7, E11). Não varre o repositório.
2. Passo 0 (seção 1) e cria `registro/<ID>.md`.
3. Escreve o **MD de execução próprio** dentro da worktree, no padrão do projeto e do template da Sintetica (`base_standard_rituals_v2/templates/MD_EXECUCAO_BRANCH.md`): `docs/diario/execucoes/2026-11-17--manut-<id>-<slug>--MD_EXECUCAO.md`, com bloco **RETOMADA** no topo, Aceite, Ler, Touch, Do not touch, Fora de escopo, Tópicos T1…Tn (estado/aceite/arquivos/log/próximo ato) e Sessões. A ficha é o ponto de partida; o MD de execução é o passo a passo real, que a Execução atualiza a cada tópico.
4. Abre os filhos com `start_session` (`initiation: "user_asked"`, `context: "fresh"`, `use_worktree: false` — **mesma worktree**, `permission_mode: "bypassPermissions"`), cada um com `name` e `title` que batem com o trabalho (R12: `<Frente>: <o que faz>`, ≤ 60 caracteres):
   - **Execução** (sempre) · **Auditoria** (sempre, `effort: "medium"`) · **Específico** (só se a ficha disser que precisa ou a Execução pedir).
   - O prompt de cada um está na seção 5; o `background` leva o objetivo da frente (≥ 80 caracteres).
5. Cria a **rotina de 5 minutos** (seção 6) com `CronCreate` (`*/5 * * * *`, recorrente). Avisa o Controle que a rotina existe e que ela expira em 7 dias.
6. Vigia: a cada ciclo reenvia aos filhos o MD de execução e o check-up curto; lê o `registro` e o `git status` do que eles fazem. **Não executa a tarefa**; se um filho travar, reabre outro com o mesmo MD (R12: trabalho novo = chat novo, nome certo).
7. Quando o **aceite** está todo marcado: confere o teste da branch, escreve a **completude** (seção 7) e a envia ao Controle (`SendMessage` para o `local_` do Controle, que está em `registro/_CONTROLE.md`; se falhar, atualiza `registro/<ID>.md` com `Estado: pronta para merge`, que o Controle lê).
8. Espera o merge. Quando o Controle disser que mesclou, fecha: memória R11 (rascunho já feito pela Auditoria), nomes dos chats batendo com o que foi feito, e encerra a própria rotina (`CronDelete`).

## 4. Regras que valem para os 3 filhos e para a branch (todas da Sintetica/CLAUDE.md; aponte, não reescreva)

| O que | Fonte |
|---|---|
| Nenhum commit até o fim; plano e MD de execução não se commitam; sem lint/typecheck/suíte por arquivo — testes **da branch** ao fim | B1, B2, E3, E6 (`03_BRANCHES_E_COMMITS.md`, `02_EFFICIENCY_RULES.md`) |
| Branch não pede aprovação do plano: executa | B3 |
| Branch não edita arquivo geral da raiz; lê o que precisa | B5 |
| MD de execução nasce no ato 1 e se atualiza a cada tópico | E4 |
| Pedido exato é pedido fechado; MD no lugar de reler o repositório | E1, E2, E10, E11 |
| Se pode fazer, faz; se não, avisa AGORA com comando, onde rodar e para quê | R7 |
| Segurança é decisão do Gabriel, combinada antes; achou que falta? sugira em uma linha | R10 |
| Não criar regra que o Gabriel não falou | R13 |
| Nome do chat bate com o trabalho | R12 |
| Memória do agente em `docs/memorias/` ao fim | R11 |
| Migration/env/banco: nunca ficam sem registro; aqui a migration é escrita na branch e aplicada pelo Controle no commit | R8 + memória `migration-nova-se-aplica-no-commit` |
| Dinheiro em centavos inteiros (`Cents`); comentários em português explicando o porquê; TypeScript strict, sem `any` | `CLAUDE.md` |
| Nada de `@/server/*` em Client Component; toda mutação por `mutateState()` em Server Action | `CLAUDE.md` |
| Vocabulário proibido pelo jurídico: token, NFT, cripto, ativo digital, investimento, rentabilidade | memória `terminologia-juridica-aurea` |
| Marca "Real Olímpico" (masculino); logos só de `public/brand/` | `CLAUDE.md` |
| Teste visual e página de conferência são temporários: saem antes do commit | memória `teste-visual-nunca-vai-para-producao` |
| Leitura de produção: `BEGIN READ ONLY`, nunca `SET` de sessão; script que grava em produção nunca entra na suíte | memórias `leitura-de-producao-sem-set-de-sessao`, `script-de-producao-fora-da-suite` |
| Crase do markdown dentro de aspas duplas no shell executa: use heredoc ou escreva o arquivo | memória `crases-em-aspas-do-shell-executam` |

## 5. Nível 3 — os prompts dos filhos (o chat de branch cola, trocando `<ID>`, `<slug>`, `<worktree>`)

### 5.1 Execução

```text
Você é a EXECUÇÃO da frente <ID> (<slug>) do Real Olímpico. Trabalhe SÓ em <worktree> (branch própria; nada de commit).
Leia, por caminho absoluto e nesta ordem: C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\02_MODELO_DOS_CHATS_DE_BRANCH.md (seções 3 e 4),
a ficha C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\<ID>-<slug>.md e o MD de execução da worktree
(docs\diario\execucoes\2026-11-17--manut-<id>-<slug>--MD_EXECUCAO.md). Depois leia só a lista "Ler" da ficha.
Execute os tópicos na ordem, um em andamento por vez. A cada tópico fechado, atualize o MD de execução (feito/não feito/próximo ato).
Não pare para pedir aprovação do plano. Typecheck/lint/testes só ao fim da branch (ou de um tópico grande). Não toque fora da lista Touch.
Se faltar pesquisa, medição, navegação ou compilação demorada, peça ao ESPECÍFICO (se não existir, peça ao chat de branch).
Falhou algo que só o Gabriel resolve? Avise o chat de branch NA HORA, em uma mensagem, com o comando pronto (PowerShell, sem &&).
Ao terminar o aceite, diga "FRENTE <ID> PRONTA" ao chat de branch com: estado do Git na primeira linha, o que foi feito, o que não foi, testes rodados.
```

### 5.2 Auditoria (rotina de 3 em 3 minutos)

```text
Você é a AUDITORIA da frente <ID> (<slug>). Você NÃO escreve código de produto: observa, registra e corrige DESVIO DE REGRA.
Primeiro, leia o método da Sintetica, nesta ordem (C:\dev\Sintetica\processo\): 00_INDICE.md, 06_REGRAS_DO_GABRIEL_NA_INTEGRA.md,
01_REGRAS_DE_EXECUCAO.md, 02_EFFICIENCY_RULES.md, 03_BRANCHES_E_COMMITS.md, 04_RITUAL_DE_SESSAO.md,
base_standard_rituals_v2\07_MD_DE_EXECUCAO_DE_BRANCH.md, base_standard_rituals_v2\13_RELATORIOS.md, 07_ORIENTACOES_DO_GABRIEL.md.
Depois leia, por caminho absoluto, C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\02_MODELO_DOS_CHATS_DE_BRANCH.md e a ficha da frente.
Trabalha em <worktree>. Você escreve SOMENTE: docs\diario\execucoes\2026-11-17--manut-<id>-<slug>--LOG_DE_EXECUCAO.md (append-only),
...--CONTINUIDADE.md (bloco RETOMADA), os relatórios finais e o rascunho da memória R11. Nunca edita código de produto.
Crie agora a sua rotina com CronCreate: cron "*/3 * * * *", recorrente, com o prompt da seção 6.2 do 02_MODELO (copie o texto de lá).
```

### 5.3 Específico (só quando precisar)

```text
Você é o ESPECÍFICO da frente <ID> (<slug>): faz o que é demorado ou incomum para a Execução não parar (pesquisa, navegação, medição, compilação).
Leia a ficha da frente e o pedido abaixo. Entregue um arquivo em <worktree>\docs\diario\execucoes\pesquisa\<id>-<assunto>.md com a conclusão no topo
(sem rodeio), as fontes/números e a recomendação. Pesquisa de preço: cite a data e a página. Nada de commit; não edite código de produto.
Pedido: <texto>. Ao terminar, avise quem pediu em uma mensagem curta com o caminho do arquivo.
```

## 6. As rotinas (cada chat cria a sua com `CronCreate`; ficam só na sessão e expiram em 7 dias)

O ciclo **só gasta modelo se algo mudou**: a primeira coisa é a pré-checagem em código.

### 6.1 Chat de branch — a cada 5 minutos (`*/5 * * * *`)

```text
CHECK-UP DA FRENTE <ID> (<slug>). 1) Pré-checagem (PowerShell): git -C <worktree> status -sb ; git -C <worktree> diff --stat ;
(Get-Item <caminho do MD de execução>).LastWriteTime ; Get-Content C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\registro\<ID>.md -TotalCount 12.
2) Nada mudou desde o ciclo anterior e ninguém está bloqueado? Responda "<ID>: sem mudança" e pare.
3) Mudou: reenvie à EXECUÇÃO, à AUDITORIA e ao ESPECÍFICO (se existir) — com SendMessage — o caminho do MD de execução e este check-up:
   "Foco no aceite: <aceite em uma frase>. Em até 5 linhas: (a) tópico atual; (b) o que fechou desde o último check-up; (c) bloqueio e para quem;
   (d) o MD de execução está atualizado? Sem explicação, sem prolixidade. Se saiu do escopo, volte ao aceite."
4) Atualize registro\<ID>.md. Se o aceite inteiro está marcado, vá para a completude (02_MODELO, seção 7).
```

### 6.2 Auditoria — a cada 3 minutos (`*/3 * * * *`)

```text
AUDITORIA <ID>. 1) Pré-checagem (PowerShell): git -C <worktree> status -sb ; git -C <worktree> log --oneline -3 ; git -C <worktree> diff --name-only ;
(Get-Item <MD de execução>).LastWriteTime. Nada novo desde o ciclo anterior? Escreva "<ID>/auditoria: sem mudança" no LOG e pare.
2) Mudou: confira, na ordem, e corrija mandando mensagem à EXECUÇÃO (não edite o código dela):
   a) apareceu commit novo? (B1: não pode) · b) arquivo fora da lista Touch da ficha? (B5/E7) · c) .env.local, segredo ou token em staged? · d) o MD de execução foi
   atualizado no último tópico fechado? (E4) · e) rodou lint/typecheck/suíte por arquivo? (E3) · f) criou trava/regra/segurança que ninguém pediu? (R10/R13) ·
   g) palavra proibida pelo jurídico em texto novo? · h) migration fora da numeração reservada? · i) superfície protegida tocada sem anotar? ·
   j) o nome do chat ainda bate com o que ele faz? (R12).
3) Acrescente ao LOG_DE_EXECUCAO (append-only): hora, o que mudou, desvio achado e a correção pedida. Atualize a CONTINUIDADE (bloco RETOMADA: estado, próximo ato, Git).
4) Ao fim da frente: monte os relatórios (Execuções detalhado e resumo, Modificações, Features/Correções — formato de 13_RELATORIOS.md, em docs\diario\execucoes\) e o rascunho da memória R11
   (modelo C:\dev\Sintetica\docs\memorias\_MODELO.md) em docs\memorias\2026-11-17--claude-code--manut-<slug>.md. NÃO edite docs\memorias\README.md: escreva a linha em registro\<ID>.md.
```

## 7. A completude (o que o chat de branch entrega ao Controle)

Primeira linha: **estado do Git** (branch, commit-base, ahead/behind, arquivos alterados sem commit — B4). Depois, curto:

```markdown
Frente <ID> — PRONTA PARA MERGE
Git: <branch> sobre 9e21fe1 · <n> arquivos alterados · 0 commits (B1)
Aceite: <cada item: ✔ / ✘ com uma linha>
Feito: …      Não feito (em negrito se importa): …
Testes da branch: <comando — resultado>
Superfície protegida tocada: <nada | arquivo — por quê>
Migration: <nada | NNN_nome.sql — NÃO aplicada>
Contratos com outras frentes: <cumpridos | pendência>
Precisa do Gabriel: <nada | …>
Arquivos de log/MD para a main (B6): <lista>
```

## 8. Quando a ferramenta não deixa (fallbacks)

| Se… | Faça |
|---|---|
| o chat de branch não consegue abrir sessões (nível 3 barrado) | avisa o Controle; o Controle abre os filhos como irmãos e passa os `local_` ao chat de branch; as rotinas continuam |
| `SendMessage` falha | escreva no `registro/<ID>.md`; o Controle e a Auditoria leem o arquivo a cada ciclo |
| a rotina expirou (7 dias) ou a sessão reiniciou | recrie com `CronCreate` e anote no registro |
| uma frente depende de decisão do Gabriel | marque `Bloqueio (para quem): Gabriel` no registro e siga pelo padrão da seção 6 do executivo; o Controle pergunta |
