# Os chats deste repositório (Áurea Custódia / Real Olímpico): o que fazia cada um e como recriar tudo em outra conta

```
Escrito em:  22/11/2026, pela Central de Organização
Escopo:      SÓ este repositório (C:\dev\AureaCustodiaMVP). Os chats cujo `cwd` é este repositório (foto de ~20:50: 69; hoje à noite o CSV tem 87 chats, incluindo o Processo Padrão que faltava) ou uma worktree dele (49 ativos, 20 arquivados).
Fonte:       lista de sessões do app (22/11/2026 ~20:50), docs/manutencao-2026-11 (01_CONTROLE, 02_MODELO_DOS_CHATS_DE_BRANCH, fichas A–M), INDICE_VEGA, memórias R11 e CLAUDE.md
Honestidade: não abri a transcrição de cada chat. As frentes A–L foram descritas pelas fichas, MDs de execução e memórias que elas mesmas escreveram;
             os 32 chats anteriores a 17/11 foram descritos pelo título e pelo MD do repositório que nasceu daquele trabalho. Onde só o título era conhecido, o texto diz isso.
```

## 1. A hierarquia (como existe de fato)

Neste repositório o método aplicado é o **Processo Eficiente de Branches 2.0** (`docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md`), de 17/11/2026. **Não há seções na barra lateral** (nenhum chat está num grupo): a árvore existe só no campo `startedBy` (quem iniciou quem) e nos títulos.

```
Controle: Manutenção Real Olímpico -- Pendências | Controle   (e259126b, nível superior, manut-controle)
├── A · Segurança            (branch 823d5a09)  ├ Execução c05fcb02  ├ Auditoria 489d6747
├── B · 1º mês no envio      (branch ba95c62d)  ├ Execução c869252d  ├ Auditoria c46cdbec
├── C · E-mails              (branch 0cf44cb3)  ├ Execução 115fe71d  ├ Auditoria d3bb3d71  └ Específico 238a3f52
├── D · Cadastro com Google  (branch 424f5f88)  ├ Execução 77b11067  ├ Auditoria a4fe964d
├── E · PWA no iPhone        (branch dea20203)  ├ Execução eb865bf4  ├ Auditoria 007bd0f8  └ Específico 292f0638
├── F · Extrato = saldo      (8318fdf5, sem filhos)
├── G · Notas do cliente     (e0b00be1 e e0f19b80, sem filhos; duplicidade)
├── H · Cancelar envio e nota(branch c991dbd7)  ├ Execução 1ea197d6  ├ Auditoria 37094ced  └ Específico e8b83291
├── I · Número da moeda      (branch 2bb975f7)  ├ Execução ec9c65fd  ├ Auditoria a7378e0c
├── J · KPIs do conselho     (9dec9ee3, sem filhos)
├── K · Frete + R$ 4,00      (6ccba6ef, sem filhos)
├── L · Vídeos               (ce0440a7, sem filhos)
└── M · Auditoria de marketing: sem chat (adiada por ordem do Gabriel)
```

Regras de cima para baixo: todos em "ignorar permissões"; a branch de cada frente tem **worktree própria** (`claude/manut-<slug>`) a partir da `main` (base `9e21fe1`); os filhos (Execução, Auditoria, Específico) rodam **na mesma worktree** da branch; nenhum commit nas branches (o commit é do Controle, depois do merge por ondas); `git status` da pasta principal tem arquivos de outros agentes que ninguém toca (`.claude/launch.json`, `.agents/`, `docs/polimento/**`). Hoje `git worktree list` mostra 5 worktrees vivas (A, C, H, K e a G-802669); as demais foram higienizadas depois do merge.

## 2. Cruzamento com o Método Eficiente v2.2 (o que a árvore pede × o que existe aqui)

| Papel no método v2.2 | Existe aqui? | Quem faz hoje |
|---|---|---|
| Controle (rotina 5 min) | ✔ `e259126b` | ele mesmo, com `CronCreate` `*/5 * * * *` |
| Garantia de Execução (MD com o prompt exato) | **✗ nenhuma** | o equivalente são `00_MD_EXECUTIVO.md`, `01_CONTROLE.md` e as 13 fichas (decisão de 22/11: usar os planos de execução) |
| Polimento Distilla | ✗ | polimento estético foi outra onda (24–25/10, `docs/polimento/`) |
| Merge, Push, Deploy (15 min) | ✗ | o próprio Controle, por ondas (D, E, I, J, K, L → A, C, G → B, H → F), com o "ok" do Gabriel antes do push |
| Higienização (30 min) | ✗ | o Controle, só depois do merge, dos testes e do OK (memória `higiene-de-pastas-apos-merge`) |
| Relatórios | ✗ | o Controle devolve 5 relatórios por frente no fim; as Auditorias mantêm LOG e CONTINUIDADE |
| Processo Padrão (15 min) | ✗ | a Auditoria de cada frente (rotina de 3 min, ritual da Sintetica) |
| Tester | ✗ | conferência visual pela própria frente e pelo Controle em produção |
| Chat de tema | ✗ | não há nível entre o Controle e as branches |
| Branch (5 min) | ✔ 12 frentes (G tem 2 chats) | chat de branch de cada frente |
| Execução / Auditoria (3 min) / Específico | Execução e Auditoria em A, B, C, D, E, H, I; Específico em C, E, H; F, G, J, K, L sem filhos | chats de nível 3 |
| Worktree por branch | **Sim** (o método 2.0 usava); o v2.2 (20/11) proíbe worktree e branch nova | — |
| Nomes | `<Frente> · <o que faz>` (2.0), não `<SEÇÃO> \| <TEMA> \| <PAPEL>` | R12 da Sintetica |

Para aplicar o v2.2 aqui no futuro faltaria: uma seção na barra lateral, o Controle com o nome padrão, os chats de apoio (Polimento, Merge/Deploy, Relatórios, Tester, Higienização, Processo Padrão), as Garantias de Execução e pasta completa sem worktree. Isso é **decisão do Gabriel**; nada disso foi criado.

## 3. Como recriar tudo exatamente em outra conta

1. **Pré-requisitos:** o repositório `C:\dev\AureaCustodiaMVP` na `main` (base `9e21fe1` para recriar as frentes como foram, ou a `main` atual), o método da Sintetica em `C:\dev\Sintetica\processo\`, a skill `metodo-eficiente-v2-2` (para o v2.2) e a memória do repositório (pasta `05_memorias_da_conta/`, 47 arquivos, a copiar para `C:\Users\Gabriel\.claude\projects\C--dev-AureaCustodiaMVP\memory\`). Sem isso o chat novo para e avisa, em vez de afirmar leitura que não fez.
2. **Criar o Controle primeiro**, na pasta principal `C:\dev\AureaCustodiaMVP` (branch `main`), com o título `Manutenção Real Olímpico -- Pendências | Controle` e o nome curto `manut-controle`. Colar o "Prompt de partida do Controle" que está no fim de `docs/manutencao-2026-11/README.md` (lê `01_CONTROLE.md`, `00_MD_EXECUTIVO.md`, `02_MODELO_DOS_CHATS_DE_BRANCH.md` e o processo 2.0). Ele precisa estar em **"ignorar permissões" antes** de abrir qualquer frente: o Gabriel aprova a subida no cartão; um chat só cria filhos no mesmo modo ou abaixo. O Controle é de **nível superior**: se for aberto por outro chat, soltar com `detach_session`.
3. **O Controle abre as 12 frentes de uma vez** (`01_CONTROLE.md`, §3): uma chamada `start_session` por frente com `initiation: "user_asked"`, `context: "fresh"`, `use_worktree: true`, `permission_mode: "bypassPermissions"`, `name: "manut-<id>"`, `background` e `prompt` exatos do §3 do arquivo. Títulos, `branch_name` e "tem Específico?" por frente (nomes R12, ≤ 60 caracteres):

| ID | `branch_name` | Título do chat | Específico | Onda |
|---|---|---|---|---|
| A | manut-seguranca-senha | A · Segurança: senha nas ações sensíveis | sim | 2 |
| B | manut-primeiro-mes-no-envio | B · Cobrança: 1º mês de custódia no envio | não | 3 |
| C | manut-emails-de-movimentacao | C · E-mails: confirmação de compra e movimentação | sim | 2 |
| D | manut-cadastro-google | D · Cadastro: Google primeiro e demonstração | sim | 1 |
| E | manut-pwa-iphone | E · App: PWA funcionando no iPhone | sim | 1 |
| F | manut-extrato-igual-ao-saldo | F · Extrato: refletir o saldo real | não | 4 |
| G | manut-notas-do-cliente | G · Notas: NFS-e acessível ao cliente | sim | 2 |
| H | manut-cancelar-envio-e-nota | H · Cancelamento: envio, validação e nota | sim | 3 |
| I | manut-numero-da-moeda | I · Recibo: número da moeda | não | 1 |
| J | manut-kpis-do-conselho | J · KPIs: painel do conselho no admin | sim | 1 |
| K | manut-frete-mais-4 | K · Frete: acréscimo de R$ 4,00 | não | 1 |
| L | manut-armazenamento-videos | L · Vídeos: espaço e armazenamento barato | sim | 1 |

4. **Cada chat de branch** faz o Passo 0 da worktree, escreve `registro/<ID>.md`, abre os filhos **na mesma worktree** (`use_worktree: false`) com `name` e `title` no padrão `<Frente>: <o que faz>` e os prompts do §5 de `02_MODELO_DOS_CHATS_DE_BRANCH.md` (Execução, Auditoria, Específico), e liga a rotina de 5 minutos (§6.1). A Auditoria liga a de 3 minutos (§6.2). Todas via `CronCreate`, que **morre com a sessão e expira em 7 dias**: recriar quando expirar.
5. **Estado de cada frente ao recriar:** não recomece do zero. Cada chat novo lê primeiro o bloco `## RETOMADA` do seu MD de execução e o `--CONTINUIDADE.md` (pasta `01_continuidade/frentes/`), e a ficha em `02_planos_de_execucao/manutencao-2026-11/`. Frentes já mescladas na `main` (I, D, C, B, E, H, A, K, F, L, G, J, ver `docs/INDICE_VEGA.md` §6) só precisam de chat se houver pendência; os chats arquivados não se recriam.
6. **Ids mudam:** o `local_…` só existe na conta onde nasceu. O Controle anota o id devolvido por `start_session` em `registro/<ID>.md`; as frentes mandam a completude por esse id.
7. **Conferir no fim:** `list_sessions {"linked": true}` deve mostrar o Controle e os filhos; `git worktree list` as worktrees das frentes ainda abertas.

## 4. O Controle

#### Manutenção Real Olímpico -- Pendências | Controle (`e259126b`)

*Nome:* `manut-controle` · *iniciado por:* — (nível superior) · *pasta:* pasta completa · *última atividade:* 2026-11-19 03:15 UTC

É o **Controle** da manutenção do Real Olímpico pedida pelo sócio Rogério em 11/11/2026 (16 itens, 12 frentes A–L, prazo 30/11). É o único chat com quem o Gabriel conversa: abriu as frentes (uma chamada `start_session` por frente, com worktree própria a partir da `main`, base `9e21fe1`), vigiava tudo numa rotina de 5 minutos que escreve `docs/manutencao-2026-11/registro/_QUADRO.md`, fazia o check-up, o merge por ondas (D, E, I, J, K, L na onda 1; A, C, G na 2; B e H na 3; F na 4), o commit e, com o OK do Gabriel, o push e o deploy.

Ele é de **nível superior** (foi aberto por outro chat e solto com `detach_session`), em "ignorar permissões" como todos os filhos. O desenho está em `docs/manutencao-2026-11/01_CONTROLE.md`; a frente M (auditoria de tráfego pago) não tem chat, foi adiada por ordem do Gabriel. Ao fim devolve o relatório do que deu certo e errado por item do Rogério e a lista de ações manuais do Gabriel (variável na Vercel, teste no iPhone, cancelamento da nota real, perguntas ao contador).

Cruzamento com o Método v2.2: faz sozinho os papéis de Controle, Merge/Push/Deploy, Relatórios e Higienização. O título usa `--` (nome copiado de outro projeto e adaptado pelo próprio Controle, R12) e não o padrão `<SEÇÃO> | Controle`.

## 5. As frentes A a L (cada chat)

| Id | Título | Nome | Pai | Worktree | Arquivado |
|---|---|---|---|---|---|
| `489d6747` | A · Segurança: auditoria de regras e logs | `manut-a-audit` | A · Segurança: senha nas ações sensíveis | manut-seguranca-senha-606459 | sim |
| `c05fcb02` | A · Segurança: execução da senha nas ações | `manut-a-exec` | A · Segurança: senha nas ações sensíveis | manut-seguranca-senha-606459 | sim |
| `823d5a09` | A · Segurança: senha nas ações sensíveis | `manut-a` | Manutenção Real Olímpico -- Pendências \| Controle | manut-seguranca-senha-606459 | sim |
| `ba95c62d` | B · Cobrança: 1º mês de custódia no envio | `manut-b` | Manutenção Real Olímpico -- Pendências \| Controle | manut-primeiro-mes-no-envio-1ff25c | sim |
| `c46cdbec` | B: Auditoria — 1º mês de custódia no envio | `b-auditoria-1-m-s-de-cus` | B · Cobrança: 1º mês de custódia no envio | manut-primeiro-mes-no-envio-1ff25c | sim |
| `c869252d` | B: Execução — 1º mês de custódia no envio | `b-execu-o-1-m-s-de-cust` | B · Cobrança: 1º mês de custódia no envio | manut-primeiro-mes-no-envio-1ff25c | sim |
| `d3bb3d71` | C · Auditoria: e-mails de movimentação | `c-auditoria` | C · E-mails: confirmação de compra e movimentação | manut-emails-de-movimentacao-c46333 | não |
| `0cf44cb3` | C · E-mails: confirmação de compra e movimentação | `manut-c` | Manutenção Real Olímpico -- Pendências \| Controle | manut-emails-de-movimentacao-c46333 | não |
| `238a3f52` | C · Específico: custo do e-mail por mês | `c-especifico` | C · E-mails: confirmação de compra e movimentação | manut-emails-de-movimentacao-c46333 | não |
| `115fe71d` | C · Execução: e-mails de movimentação | `c-execucao` | C · E-mails: confirmação de compra e movimentação | manut-emails-de-movimentacao-c46333 | não |
| `77b11067` | D · Cadastro: Google primeiro (execução) | `manut-d-exec` | D · Cadastro: Google primeiro e demonstração | manut-cadastro-google-8d269f | sim |
| `424f5f88` | D · Cadastro: Google primeiro e demonstração | `manut-d` | Manutenção Real Olímpico -- Pendências \| Controle | manut-cadastro-google-8d269f | sim |
| `a4fe964d` | D · Cadastro: auditoria de regras e logs | `manut-d-audit` | D · Cadastro: Google primeiro e demonstração | manut-cadastro-google-8d269f | sim |
| `dea20203` | E · App: PWA funcionando no iPhone | `manut-e` | Manutenção Real Olímpico -- Pendências \| Controle | manut-pwa-iphone-eb49d6 | sim |
| `007bd0f8` | E: Auditoria do PWA no iPhone | `manut-e-audit` | E · App: PWA funcionando no iPhone | manut-pwa-iphone-eb49d6 | sim |
| `eb865bf4` | E: PWA no iPhone — execução | `manut-e-exec` | E · App: PWA funcionando no iPhone | manut-pwa-iphone-eb49d6 | sim |
| `292f0638` | E: Pesquisa iOS e leitura da produção | `manut-e-esp` | E · App: PWA funcionando no iPhone | manut-pwa-iphone-eb49d6 | sim |
| `8318fdf5` | F · Extrato: refletir o saldo real | `manut-f` | Manutenção Real Olímpico -- Pendências \| Controle | manut-extrato-igual-ao-saldo-51a2a8 | não |
| `e0b00be1` | G · Notas: NFS-e acessível ao cliente | `manut-g` | Manutenção Real Olímpico -- Pendências \| Controle | manut-notas-do-cliente-4e152f | não |
| `e0f19b80` | G · Notas: NFS-e acessível ao cliente (2) | `manut-g-2` | Manutenção Real Olímpico -- Pendências \| Controle | manut-notas-do-cliente-802669 | não |
| `c991dbd7` | H · Cancelamento: envio, validação e nota | `manut-h` | Manutenção Real Olímpico -- Pendências \| Controle | manut-cancelar-envio-e-nota-9f78d5 | sim |
| `37094ced` | H: audita regras da frente cancelar envio | `h-audita-regras-da-frent` | H · Cancelamento: envio, validação e nota | manut-cancelar-envio-e-nota-9f78d5 | sim |
| `1ea197d6` | H: executa cancelar envio e nota fiscal | `h-executa-cancelar-envio` | H · Cancelamento: envio, validação e nota | manut-cancelar-envio-e-nota-9f78d5 | sim |
| `e8b83291` | H: pesquisa caso Rogério e API Correios | `h-pesquisa-caso-rog-rio` | H · Cancelamento: envio, validação e nota | manut-cancelar-envio-e-nota-9f78d5 | sim |
| `2bb975f7` | I · Recibo: número da moeda | `manut-i` | Manutenção Real Olímpico -- Pendências \| Controle | manut-numero-da-moeda-3dedde | sim |
| `a7378e0c` | I: Auditoria do recibo com número da moeda | `manut-i-audit` | I · Recibo: número da moeda | manut-numero-da-moeda-3dedde | sim |
| `ec9c65fd` | I: Recibo mostra o número da moeda (execução) | `manut-i-exec` | I · Recibo: número da moeda | manut-numero-da-moeda-3dedde | sim |
| `9dec9ee3` | J · KPIs: painel do conselho no admin | `manut-j` | Manutenção Real Olímpico -- Pendências \| Controle | manut-kpis-do-conselho-7a21c4 | não |
| `6ccba6ef` | K · Frete: acréscimo de R$ 4,00 | `manut-k` | Manutenção Real Olímpico -- Pendências \| Controle | manut-frete-mais-4-c9a96a | não |
| `ce0440a7` | L · Vídeos: espaço e armazenamento barato | `manut-l` | Manutenção Real Olímpico -- Pendências \| Controle | manut-armazenamento-videos-b83e5d | não |

#### A · Segurança: auditoria de regras e logs (`489d6747`)

*Nome:* `manut-a-audit` · *iniciado por:* A · Segurança: senha nas ações sensíveis · *worktree:* manut-seguranca-senha-606459 · *arquivado* · *última atividade:* 2026-11-18 15:08 UTC

Chat de **auditoria** (nível 3, rotina de 3 minutos) da frente **A · Segurança: confirmação por senha nas ações sensíveis**: lê o que a Execução e o Específico fazem, monta o LOG de execução e o MD de CONTINUIDADE, confere o ritual e corrige quebra de regra. Não escreve código de produto. Pede a senha (ou, em conta só de Google, um código por e-mail) para sacar, comprar, vender, trocar senha, e-mail, Pix ou dados e pedir retirada. Grava o evento `seguranca.*` em `audit_log`, fecha o RA-50 em `definirNovaSenha`, tem interruptor em `src/server/auth/reautenticacao-config.ts`, módulo `src/server/auth/reautenticacao*.ts`, modal em `src/components/seguranca/` e avisos de troca de senha/e-mail por `avisarSeguranca`. Mesclada na onda 2.

#### A · Segurança: execução da senha nas ações (`c05fcb02`)

*Nome:* `manut-a-exec` · *iniciado por:* A · Segurança: senha nas ações sensíveis · *worktree:* manut-seguranca-senha-606459 · *arquivado* · *última atividade:* 2026-11-18 02:12 UTC

Chat de **execução** (nível 3) da frente **A · Segurança: confirmação por senha nas ações sensíveis**: escreve o código e atualiza o MD de execução (bloco RETOMADA) a cada tópico fechado, sem sair do `touch` da ficha, sem commit na branch (o commit é do Controle). Pede a senha (ou, em conta só de Google, um código por e-mail) para sacar, comprar, vender, trocar senha, e-mail, Pix ou dados e pedir retirada. Grava o evento `seguranca.*` em `audit_log`, fecha o RA-50 em `definirNovaSenha`, tem interruptor em `src/server/auth/reautenticacao-config.ts`, módulo `src/server/auth/reautenticacao*.ts`, modal em `src/components/seguranca/` e avisos de troca de senha/e-mail por `avisarSeguranca`. Mesclada na onda 2.

#### A · Segurança: senha nas ações sensíveis (`823d5a09`)

*Nome:* `manut-a` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-seguranca-senha-606459 · *arquivado* · *última atividade:* 2026-11-18 15:08 UTC

Frente **A · Segurança: confirmação por senha nas ações sensíveis**, chat de **branch** (nível 2), filho do Controle. Prepara a worktree (Passo 0: junção de `node_modules`, `.env.local` sem commit, confere a base), escreve o registro vivo, abre os filhos na mesma worktree, mantém a rotina de 5 minutos e entrega a completude ao Controle. Pede a senha (ou, em conta só de Google, um código por e-mail) para sacar, comprar, vender, trocar senha, e-mail, Pix ou dados e pedir retirada. Grava o evento `seguranca.*` em `audit_log`, fecha o RA-50 em `definirNovaSenha`, tem interruptor em `src/server/auth/reautenticacao-config.ts`, módulo `src/server/auth/reautenticacao*.ts`, modal em `src/components/seguranca/` e avisos de troca de senha/e-mail por `avisarSeguranca`. Mesclada na onda 2.

#### B · Cobrança: 1º mês de custódia no envio (`ba95c62d`)

*Nome:* `manut-b` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-primeiro-mes-no-envio-1ff25c · *arquivado* · *última atividade:* 2026-11-18 01:57 UTC

Frente **B · Cobrança: 1º mês de custódia no envio**, chat de **branch** (nível 2), filho do Controle. Prepara a worktree (Passo 0: junção de `node_modules`, `.env.local` sem commit, confere a base), escreve o registro vivo, abre os filhos na mesma worktree, mantém a rotina de 5 minutos e entrega a completude ao Controle. Frete e primeiro mês de custódia viram uma cobrança só no envio; a compra já cobrava em todas as vias. A recusa devolve o mês das moedas recusadas (estorno de custódia), mas a NFS-e do mês não é cancelada (decisão fiscal aberta com o contador). Contratos B↔H (o 1º mês liga ao protocolo do envio) e B→F (todo movimento de saldo tem evento no ledger). Onda 3.

#### B: Auditoria — 1º mês de custódia no envio (`c46cdbec`)

*Nome:* `b-auditoria-1-m-s-de-cus` · *iniciado por:* B · Cobrança: 1º mês de custódia no envio · *worktree:* manut-primeiro-mes-no-envio-1ff25c · *arquivado* · *última atividade:* 2026-11-18 01:57 UTC

Chat de **auditoria** (nível 3, rotina de 3 minutos) da frente **B · Cobrança: 1º mês de custódia no envio**: lê o que a Execução e o Específico fazem, monta o LOG de execução e o MD de CONTINUIDADE, confere o ritual e corrige quebra de regra. Não escreve código de produto. Frete e primeiro mês de custódia viram uma cobrança só no envio; a compra já cobrava em todas as vias. A recusa devolve o mês das moedas recusadas (estorno de custódia), mas a NFS-e do mês não é cancelada (decisão fiscal aberta com o contador). Contratos B↔H (o 1º mês liga ao protocolo do envio) e B→F (todo movimento de saldo tem evento no ledger). Onda 3.

#### B: Execução — 1º mês de custódia no envio (`c869252d`)

*Nome:* `b-execu-o-1-m-s-de-cust` · *iniciado por:* B · Cobrança: 1º mês de custódia no envio · *worktree:* manut-primeiro-mes-no-envio-1ff25c · *arquivado* · *última atividade:* 2026-11-18 01:46 UTC

Chat de **execução** (nível 3) da frente **B · Cobrança: 1º mês de custódia no envio**: escreve o código e atualiza o MD de execução (bloco RETOMADA) a cada tópico fechado, sem sair do `touch` da ficha, sem commit na branch (o commit é do Controle). Frete e primeiro mês de custódia viram uma cobrança só no envio; a compra já cobrava em todas as vias. A recusa devolve o mês das moedas recusadas (estorno de custódia), mas a NFS-e do mês não é cancelada (decisão fiscal aberta com o contador). Contratos B↔H (o 1º mês liga ao protocolo do envio) e B→F (todo movimento de saldo tem evento no ledger). Onda 3.

#### C · Auditoria: e-mails de movimentação (`d3bb3d71`)

*Nome:* `c-auditoria` · *iniciado por:* C · E-mails: confirmação de compra e movimentação · *worktree:* manut-emails-de-movimentacao-c46333 · *ativo* · *última atividade:* 2026-11-18 01:53 UTC

Chat de **auditoria** (nível 3, rotina de 3 minutos) da frente **C · E-mails de confirmação de compra e movimentação**: lê o que a Execução e o Específico fazem, monta o LOG de execução e o MD de CONTINUIDADE, confere o ritual e corrige quebra de regra. Não escreve código de produto. Fila no banco com chave única (`emails_pendentes`, migration 053), envio pelo Resend (plano gratuito), saque fora da central de e-mails, sem servidor local. Falta a variável `RESEND_API_KEY` na Vercel. Há um plano novo só na worktree, `TAREFAS_QUE_DEPENDEM_DO_ENVIO--PLANO.md`. Onda 2.

#### C · E-mails: confirmação de compra e movimentação (`0cf44cb3`)

*Nome:* `manut-c` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-emails-de-movimentacao-c46333 · *ativo* · *última atividade:* 2026-11-18 21:44 UTC

Frente **C · E-mails de confirmação de compra e movimentação**, chat de **branch** (nível 2), filho do Controle. Prepara a worktree (Passo 0: junção de `node_modules`, `.env.local` sem commit, confere a base), escreve o registro vivo, abre os filhos na mesma worktree, mantém a rotina de 5 minutos e entrega a completude ao Controle. Fila no banco com chave única (`emails_pendentes`, migration 053), envio pelo Resend (plano gratuito), saque fora da central de e-mails, sem servidor local. Falta a variável `RESEND_API_KEY` na Vercel. Há um plano novo só na worktree, `TAREFAS_QUE_DEPENDEM_DO_ENVIO--PLANO.md`. Onda 2.

#### C · Específico: custo do e-mail por mês (`238a3f52`)

*Nome:* `c-especifico` · *iniciado por:* C · E-mails: confirmação de compra e movimentação · *worktree:* manut-emails-de-movimentacao-c46333 · *ativo* · *última atividade:* 2026-11-18 01:42 UTC

Chat **específico** (nível 3) da frente **C · E-mails de confirmação de compra e movimentação**: pesquisa o custo do provedor de e-mail por mês (resultado em `docs/diario/execucoes/PESQUISA_CUSTO_EMAIL.md`; conclusão: Resend gratuito cobre o volume).

#### C · Execução: e-mails de movimentação (`115fe71d`)

*Nome:* `c-execucao` · *iniciado por:* C · E-mails: confirmação de compra e movimentação · *worktree:* manut-emails-de-movimentacao-c46333 · *ativo* · *última atividade:* 2026-11-18 01:49 UTC

Chat de **execução** (nível 3) da frente **C · E-mails de confirmação de compra e movimentação**: escreve o código e atualiza o MD de execução (bloco RETOMADA) a cada tópico fechado, sem sair do `touch` da ficha, sem commit na branch (o commit é do Controle). Fila no banco com chave única (`emails_pendentes`, migration 053), envio pelo Resend (plano gratuito), saque fora da central de e-mails, sem servidor local. Falta a variável `RESEND_API_KEY` na Vercel. Há um plano novo só na worktree, `TAREFAS_QUE_DEPENDEM_DO_ENVIO--PLANO.md`. Onda 2.

#### D · Cadastro: Google primeiro (execução) (`77b11067`)

*Nome:* `manut-d-exec` · *iniciado por:* D · Cadastro: Google primeiro e demonstração · *worktree:* manut-cadastro-google-8d269f · *arquivado* · *última atividade:* 2026-11-18 01:46 UTC

Chat de **execução** (nível 3) da frente **D · Cadastro: Google primeiro e demonstração**: escreve o código e atualiza o MD de execução (bloco RETOMADA) a cada tópico fechado, sem sair do `touch` da ficha, sem commit na branch (o commit é do Controle). `/cadastrar` e `/entrar` com o botão grande do Google no topo e e-mail/senha recolhidos; vídeo de demonstração e a constante que o liga só depois do deploy. Onda 1.

#### D · Cadastro: Google primeiro e demonstração (`424f5f88`)

*Nome:* `manut-d` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-cadastro-google-8d269f · *arquivado* · *última atividade:* 2026-11-18 01:48 UTC

Frente **D · Cadastro: Google primeiro e demonstração**, chat de **branch** (nível 2), filho do Controle. Prepara a worktree (Passo 0: junção de `node_modules`, `.env.local` sem commit, confere a base), escreve o registro vivo, abre os filhos na mesma worktree, mantém a rotina de 5 minutos e entrega a completude ao Controle. `/cadastrar` e `/entrar` com o botão grande do Google no topo e e-mail/senha recolhidos; vídeo de demonstração e a constante que o liga só depois do deploy. Onda 1.

#### D · Cadastro: auditoria de regras e logs (`a4fe964d`)

*Nome:* `manut-d-audit` · *iniciado por:* D · Cadastro: Google primeiro e demonstração · *worktree:* manut-cadastro-google-8d269f · *arquivado* · *última atividade:* 2026-11-18 01:47 UTC

Chat de **auditoria** (nível 3, rotina de 3 minutos) da frente **D · Cadastro: Google primeiro e demonstração**: lê o que a Execução e o Específico fazem, monta o LOG de execução e o MD de CONTINUIDADE, confere o ritual e corrige quebra de regra. Não escreve código de produto. `/cadastrar` e `/entrar` com o botão grande do Google no topo e e-mail/senha recolhidos; vídeo de demonstração e a constante que o liga só depois do deploy. Onda 1.

#### E · App: PWA funcionando no iPhone (`dea20203`)

*Nome:* `manut-e` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-pwa-iphone-eb49d6 · *arquivado* · *última atividade:* 2026-11-18 01:56 UTC

Frente **E · App: PWA funcionando no iPhone**, chat de **branch** (nível 2), filho do Controle. Prepara a worktree (Passo 0: junção de `node_modules`, `.env.local` sem commit, confere a base), escreve o registro vivo, abre os filhos na mesma worktree, mantém a rotina de 5 minutos e entrega a completude ao Controle. Diagnóstico do PWA no iOS (`docs/pwa/DIAGNOSTICO_PWA.md`, roteiro em `ROTEIRO_IPHONE_REAL.md`): iOS 26+ sem requisito de instalabilidade, cookies copiados uma vez ao adicionar à tela (iOS ≥17.2), chave "Abrir como app web", produção igual ao código; o login Google dentro do app só um aparelho real decide. Onda 1.

#### E: Auditoria do PWA no iPhone (`007bd0f8`)

*Nome:* `manut-e-audit` · *iniciado por:* E · App: PWA funcionando no iPhone · *worktree:* manut-pwa-iphone-eb49d6 · *arquivado* · *última atividade:* 2026-11-18 01:55 UTC

Chat de **auditoria** (nível 3, rotina de 3 minutos) da frente **E · App: PWA funcionando no iPhone**: lê o que a Execução e o Específico fazem, monta o LOG de execução e o MD de CONTINUIDADE, confere o ritual e corrige quebra de regra. Não escreve código de produto. Diagnóstico do PWA no iOS (`docs/pwa/DIAGNOSTICO_PWA.md`, roteiro em `ROTEIRO_IPHONE_REAL.md`): iOS 26+ sem requisito de instalabilidade, cookies copiados uma vez ao adicionar à tela (iOS ≥17.2), chave "Abrir como app web", produção igual ao código; o login Google dentro do app só um aparelho real decide. Onda 1.

#### E: PWA no iPhone — execução (`eb865bf4`)

*Nome:* `manut-e-exec` · *iniciado por:* E · App: PWA funcionando no iPhone · *worktree:* manut-pwa-iphone-eb49d6 · *arquivado* · *última atividade:* 2026-11-18 01:51 UTC

Chat de **execução** (nível 3) da frente **E · App: PWA funcionando no iPhone**: escreve o código e atualiza o MD de execução (bloco RETOMADA) a cada tópico fechado, sem sair do `touch` da ficha, sem commit na branch (o commit é do Controle). Diagnóstico do PWA no iOS (`docs/pwa/DIAGNOSTICO_PWA.md`, roteiro em `ROTEIRO_IPHONE_REAL.md`): iOS 26+ sem requisito de instalabilidade, cookies copiados uma vez ao adicionar à tela (iOS ≥17.2), chave "Abrir como app web", produção igual ao código; o login Google dentro do app só um aparelho real decide. Onda 1.

#### E: Pesquisa iOS e leitura da produção (`292f0638`)

*Nome:* `manut-e-esp` · *iniciado por:* E · App: PWA funcionando no iPhone · *worktree:* manut-pwa-iphone-eb49d6 · *arquivado* · *última atividade:* 2026-11-18 01:42 UTC

Chat **específico** (nível 3) da frente **E · App: PWA funcionando no iPhone**: pesquisa de iOS/WebKit e leitura da produção para o diagnóstico do PWA no iPhone, para não parar o executor.

#### F · Extrato: refletir o saldo real (`8318fdf5`)

*Nome:* `manut-f` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-extrato-igual-ao-saldo-51a2a8 · *ativo* · *última atividade:* 2026-11-18 21:50 UTC

Frente **F · Extrato igual ao saldo**, chat de branch único (sem filhos: a Branch executa). O extrato do cliente passa a fechar com o saldo real: `src/domain/statement.ts`, coluna "Saldo depois", reserva no topo, CSV/XLSX com `Saldo_Depois`. O invariante (saldo = extrato) está em `statement-invariante.test.ts` e **deve ser reexecutado depois de qualquer frente que crie ou devolva dinheiro** (B, H). Limite conhecido: oferta de compra pré-paga já gasta cai em "Saldo anterior e ajustes". Análise em `…--ANALISE_EXTRATO_X_SALDO.md`. Onda 4 (depois de B e H).

#### G · Notas: NFS-e acessível ao cliente (`e0b00be1`)

*Nome:* `manut-g` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-notas-do-cliente-4e152f · *ativo* · *última atividade:* 2026-11-18 21:42 UTC

Frente **G · Notas fiscais acessíveis ao cliente** (primeiro chat, worktree `manut-notas-do-cliente-4e152f`). Tela `/conta/notas` (`src/app/(app)/conta/notas/`), consulta só-leitura `src/server/nfse/consulta.ts`, ações `src/server/actions/notas.ts`, PDF auxiliar `src/lib/pdf/nota-pdf.ts`, leitor do XML `src/domain/nfse/xml-da-nota.ts`, botão "Ver nota" em `/conta/faturas`; risco RA-62. Chat de branch único, sem filhos. Há um segundo chat da mesma frente (`e0f19b80`): **duplicidade** que o Controle precisa decidir qual vale.

#### G · Notas: NFS-e acessível ao cliente (2) (`e0f19b80`)

*Nome:* `manut-g-2` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-notas-do-cliente-802669 · *ativo* · *última atividade:* 2026-11-18 22:00 UTC

Frente **G · Notas fiscais acessíveis ao cliente (2)**, segundo chat da mesma frente, worktree `manut-notas-do-cliente-802669` (a que ainda existe no `git worktree list`). Mesmo escopo do chat `e0b00be1`; foi aberto depois e é o que tem a worktree viva. Ver o MD de execução da G, que tem bloco RETOMADA de 152 linhas.

#### H · Cancelamento: envio, validação e nota (`c991dbd7`)

*Nome:* `manut-h` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-cancelar-envio-e-nota-9f78d5 · *arquivado* · *última atividade:* 2026-11-18 15:14 UTC

Frente **H · Cancelamento: envio, validação e nota**, chat de **branch** (nível 2), filho do Controle. Prepara a worktree (Passo 0: junção de `node_modules`, `.env.local` sem commit, confere a base), escreve o registro vivo, abre os filhos na mesma worktree, mantém a rotina de 5 minutos e entrega a completude ao Controle. Cancelar envio não postado pelo cliente, pela equipe e pela bancada; frete, 1º mês, nota e etiqueta voltam juntos (migration 056, corte D-H5 em `src/domain/envios.ts`, `src/domain/cancelar-envio.ts`, mapa em `docs/MAPA_DO_CANCELAMENTO.md`). Decisão D-H1: envio já postado e cancelado não devolve o frete (culpa dos Correios). Caso Rogério (envio e NFS-e de R$ 30) em `…--H-…--CASO_ROGERIO.md`. É a frente mais urgente: o contador pede cancelar a nota dentro do mês. Onda 3.

#### H: audita regras da frente cancelar envio (`37094ced`)

*Nome:* `h-audita-regras-da-frent` · *iniciado por:* H · Cancelamento: envio, validação e nota · *worktree:* manut-cancelar-envio-e-nota-9f78d5 · *arquivado* · *última atividade:* 2026-11-18 05:15 UTC

Chat de **auditoria** (nível 3, rotina de 3 minutos) da frente **H · Cancelamento: envio, validação e nota**: lê o que a Execução e o Específico fazem, monta o LOG de execução e o MD de CONTINUIDADE, confere o ritual e corrige quebra de regra. Não escreve código de produto. Cancelar envio não postado pelo cliente, pela equipe e pela bancada; frete, 1º mês, nota e etiqueta voltam juntos (migration 056, corte D-H5 em `src/domain/envios.ts`, `src/domain/cancelar-envio.ts`, mapa em `docs/MAPA_DO_CANCELAMENTO.md`). Decisão D-H1: envio já postado e cancelado não devolve o frete (culpa dos Correios). Caso Rogério (envio e NFS-e de R$ 30) em `…--H-…--CASO_ROGERIO.md`. É a frente mais urgente: o contador pede cancelar a nota dentro do mês. Onda 3.

#### H: executa cancelar envio e nota fiscal (`1ea197d6`)

*Nome:* `h-executa-cancelar-envio` · *iniciado por:* H · Cancelamento: envio, validação e nota · *worktree:* manut-cancelar-envio-e-nota-9f78d5 · *arquivado* · *última atividade:* 2026-11-18 02:08 UTC

Chat de **execução** (nível 3) da frente **H · Cancelamento: envio, validação e nota**: escreve o código e atualiza o MD de execução (bloco RETOMADA) a cada tópico fechado, sem sair do `touch` da ficha, sem commit na branch (o commit é do Controle). Cancelar envio não postado pelo cliente, pela equipe e pela bancada; frete, 1º mês, nota e etiqueta voltam juntos (migration 056, corte D-H5 em `src/domain/envios.ts`, `src/domain/cancelar-envio.ts`, mapa em `docs/MAPA_DO_CANCELAMENTO.md`). Decisão D-H1: envio já postado e cancelado não devolve o frete (culpa dos Correios). Caso Rogério (envio e NFS-e de R$ 30) em `…--H-…--CASO_ROGERIO.md`. É a frente mais urgente: o contador pede cancelar a nota dentro do mês. Onda 3.

#### H: pesquisa caso Rogério e API Correios (`e8b83291`)

*Nome:* `h-pesquisa-caso-rog-rio` · *iniciado por:* H · Cancelamento: envio, validação e nota · *worktree:* manut-cancelar-envio-e-nota-9f78d5 · *arquivado* · *última atividade:* 2026-11-18 01:39 UTC

Chat **específico** (nível 3) da frente **H · Cancelamento: envio, validação e nota**: pesquisa do caso do Rogério (envio e NFS-e de R$ 30 em produção, só leitura) e da API dos Correios para cancelar a pré-postagem.

#### I · Recibo: número da moeda (`2bb975f7`)

*Nome:* `manut-i` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-numero-da-moeda-3dedde · *arquivado* · *última atividade:* 2026-11-18 01:50 UTC

Frente **I · Recibo: número da moeda**, chat de **branch** (nível 2), filho do Controle. Prepara a worktree (Passo 0: junção de `node_modules`, `.env.local` sem commit, confere a base), escreve o registro vivo, abre os filhos na mesma worktree, mantém a rotina de 5 minutos e entrega a completude ao Controle. Recibo (tela, cartão e PDF) mostra "Moeda nº RO-000042" (`Coin.id`), hash SHA-256 intacto. Conferência visual no navegador só a 320 px; falta conferir em produção. Onda 1.

#### I: Auditoria do recibo com número da moeda (`a7378e0c`)

*Nome:* `manut-i-audit` · *iniciado por:* I · Recibo: número da moeda · *worktree:* manut-numero-da-moeda-3dedde · *arquivado* · *última atividade:* 2026-11-18 01:39 UTC

Chat de **auditoria** (nível 3, rotina de 3 minutos) da frente **I · Recibo: número da moeda**: lê o que a Execução e o Específico fazem, monta o LOG de execução e o MD de CONTINUIDADE, confere o ritual e corrige quebra de regra. Não escreve código de produto. Recibo (tela, cartão e PDF) mostra "Moeda nº RO-000042" (`Coin.id`), hash SHA-256 intacto. Conferência visual no navegador só a 320 px; falta conferir em produção. Onda 1.

#### I: Recibo mostra o número da moeda (execução) (`ec9c65fd`)

*Nome:* `manut-i-exec` · *iniciado por:* I · Recibo: número da moeda · *worktree:* manut-numero-da-moeda-3dedde · *arquivado* · *última atividade:* 2026-11-18 21:43 UTC

Chat de **execução** (nível 3) da frente **I · Recibo: número da moeda**: escreve o código e atualiza o MD de execução (bloco RETOMADA) a cada tópico fechado, sem sair do `touch` da ficha, sem commit na branch (o commit é do Controle). Recibo (tela, cartão e PDF) mostra "Moeda nº RO-000042" (`Coin.id`), hash SHA-256 intacto. Conferência visual no navegador só a 320 px; falta conferir em produção. Onda 1.

#### J · KPIs: painel do conselho no admin (`9dec9ee3`)

*Nome:* `manut-j` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-kpis-do-conselho-7a21c4 · *ativo* · *última atividade:* 2026-11-18 22:01 UTC

Frente **J · KPIs: painel do conselho no admin**, chat de branch único. `/admin/resultados/kpis?aba=negocio|aquisicao|gasto`, domínio puro `src/domain/kpis.ts` (sem fonte = `null`, nunca zero), entrada manual do gasto de marketing em `src/server/admin/marketing.ts` e `src/server/actions/admin/marketing.ts` (com `contabil.lancar` e trilha `admin.marketing.*`), migration 057 `marketing_gastos`. A proposta e a lista do conselho estão em `docs/kpis/PROPOSTA_DE_KPIS.md`. Já mesclada na `main` (commit `2974350`).

#### K · Frete: acréscimo de R$ 4,00 (`6ccba6ef`)

*Nome:* `manut-k` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-frete-mais-4-c9a96a · *ativo* · *última atividade:* 2026-11-18 21:52 UTC

Frente **K · Frete: acréscimo de R$ 4,00**, chat de branch único. O frete cobrado passa a ser o preço do contrato dos Correios **mais R$ 4,00** (pedido do Rogério, item 11): parâmetro `acrescimoDoFreteCents` (padrão 400, editável em `/admin/configuracao`), `src/lib/shipping/acrescimo*.ts`, sem migration; `Envio.frete.valorCents` é o total e `valorContratoCents`/`acrescimoCents` guardam as partes. **Aberto:** o contador ainda não disse como esse acréscimo se classifica (pergunta nº 21 em `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md`) e o Gabriel precisa aprovar o texto da tela. Tem versão mais nova só na worktree (`…--MD_EXECUCAO__WORKTREE_frete.md`).

#### L · Vídeos: espaço e armazenamento barato (`ce0440a7`)

*Nome:* `manut-l` · *iniciado por:* Manutenção Real Olímpico -- Pendências | Controle · *worktree:* manut-armazenamento-videos-b83e5d · *ativo* · *última atividade:* 2026-11-18 21:54 UTC

Frente **L · Vídeos: espaço e armazenamento barato**, chat de branch único, sem código de produto: mede o espaço dos vídeos de autenticidade e projeta custo e preços de alternativas. Entrega `docs/RELATORIO_ARMAZENAMENTO_VIDEOS.md` e `scripts/medir-armazenamento.mjs` (medição só leitura do balde `analises`). Ainda sem decisão do Gabriel sobre a troca de armazenamento.

## 6. Os outros chats do repositório (anteriores a 17/11 ou avulsos), do mais antigo ao mais novo

- **Projeto Aurea** (`54e9b8c9`; pasta completa; última atividade 2026-09-02 06:35). **Projeto Aurea** (02/09): primeiro chat do projeto depois do port do monolito. Origem do padrão de organização de 01/09 (subpastas isoladas, README em cada pasta; memória `organizacao-do-repositorio`).
- **Análise da Branch A para publicação** (`d3b04b08`; pasta completa; última atividade 2026-09-06 06:35). **Análise da Branch A para publicação** (06/09): análise da branch de login e landing antes de publicar; `docs/RELATORIO_FINAL_BRANCH_A_LOGIN_LANDING.md`.
- **Plano executivo: software análise de moedas** (`8e3d0f36`; pasta completa; última atividade 2026-09-10 22:22). **Plano executivo: software análise de moedas** (10/09): a Estação (app Electron da bancada de análise) e seu contrato de rotas; `docs/PLANO_EXECUTIVO_ESTACAO.md`, `estacao/CONTRATO.md`.
- **Aurea publicação oficial** (`72033433`; pasta completa; última atividade 2026-09-10 22:45). **Aurea publicação oficial** (10/09): plano de publicar o produto; `docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md`.
- **Fase 0 publicação Áurea Custódia** (`02a32854`; pasta completa; última atividade 2026-09-11 21:08). **Fase 0 publicação Áurea Custódia** (11/09): primeira fase da publicação oficial; `docs/prompts/PUBLICACAO_FASE_0.md`.
- **Backend Branch B execution** (`c8642a94`; pasta completa; última atividade 2026-09-12 15:47). **Backend Branch B execution** (12/09): agente B (banco e pagamentos): Supabase, Mercado Pago, ledger/DRE; `docs/prompts/AGENTE_B_BANCO_BACKEND.md`, `HANDOFF_FRENTE_B_BANCO.md`, `EXECUCAO_AGENTE_B_LEDGER_DRE.md`.
- **Plano de execução painel Admin** (`74c8a4a2`; pasta completa; última atividade 2026-09-14 03:26). **Plano de execução painel Admin** (14/09): o desenho do painel administrativo que gerou `docs/PLANO_EXECUCAO_ADMIN.md`.
- **Painel administrativo Áurea Custódia** (`78eae569`; pasta completa; última atividade 2026-09-15 12:17). **Painel administrativo Áurea Custódia** (15/09): execução do `/admin` (RBAC, bancada, CS, equipe, logística, resultados); `docs/PLANO_EXECUCAO_ADMIN.md`, `src/app/(admin)/README.md`.
- **Análise de branches E1-E7 e consumo de tokens** (`57a60a76`; pasta completa; última atividade 2026-09-15 18:08). **Análise de branches E1-E7 e consumo de tokens** (15/09): onda E1–E8 de pendências (`docs/execucao-pendencias/`, relatórios E1…E8) e o custo em tokens de rodá-las.
- **Controle** (`7a3fc5fb`; pasta completa; última atividade 2026-09-18 04:54). **Controle** (18/09): chat de controle da época das ondas A/B/C; `docs/PENDENCIAS_ABERTAS.md` (18/09, hoje defasado) e `docs/execucao-pendencias/00_PLANO_MESTRE.md`.
- **Tarefas manuais faltantes e configuração Mercado Pago** (`144b6698`; pasta completa; última atividade 2026-09-18 06:02). **Tarefas manuais faltantes e configuração Mercado Pago** (18/09): o que o Gabriel precisava cadastrar e as credenciais do Mercado Pago; `docs/EXECUCOES_MANUAIS_PENDENTES.md`, `docs/SETUP_CONTAS_E_SERVICOS.md`. A regra hoje é: tarefa manual só o que existe numa tela de terceiro.
- **Tabela de custos MercadoPago** (`c8ceca10`; pasta completa; última atividade 2026-09-22 22:27). **Tabela de custos MercadoPago** (22/09): custos e taxas do Mercado Pago para formar o preço; `docs/fiscal-contabil/` (taxas do Mercado Pago).
- **Moedas no Mercado e blocos home** (`926314a9`; pasta completa; última atividade 2026-10-02 00:58). **Moedas no Mercado e blocos home** (02/10): página de mercado e blocos da tela inicial; `docs/execucao/AG3_PAGINA_MERCADO.md` e `AG6_INICIO_BLOCOS.md`.
- **Reenviar e-mail do cliente no painel** (`f2fad6cd`; pasta completa; última atividade 2026-10-02 01:09). **Reenviar e-mail do cliente no painel** (02/10): botão do admin para reenviar o e-mail ao cliente; `docs/EXECUCAO_ADMIN_REENVIAR_EMAIL.md`.
- **Normalização de e-mail para evitar duplicação** (`1f1d6a12`; pasta completa; última atividade 2026-10-02 01:09). **Normalização de e-mail para evitar duplicação** (02/10): impedir conta duplicada por variação de e-mail; `docs/EXECUCAO_CONTA_SEM_DUPLICACAO.md`.
- **Tutorial onboarding guiado** (`e29bb397`; pasta completa; última atividade 2026-10-02 18:02). **Tutorial onboarding guiado** (02/10): tutorial de primeiros passos no app; `docs/EXECUCAO_TUTORIAL_ONBOARDING.md`.
- **Logo do Real Olímpico** (`fffd4101`; pasta completa; última atividade 2026-10-07 17:12). **Logo do Real Olímpico** (07/10): logos de `/brand/` (`logo-real-olimpico-marca.webp` e `-emblema.webp`). Regra: usar só esses arquivos, nunca redesenhar.
- **Real Olímpico publication setup** (`64ab8c83`; pasta completa; última atividade 2026-10-21 21:34). **Real Olímpico publication setup** (21/10): publicação sob a marca Real Olímpico (domínio `realolimpico.com.br`, e-mail, marca no site).
- **Integração API Correios** (`18b2c2a2`; pasta completa; última atividade 2026-10-22 17:40). **Integração API Correios** (22/10): Correios por contrato (Platinum 1, API CWS): frete pelo preço do contrato, pré-postagem, etiqueta oficial, rastreio; `docs/EXECUCAO_CORREIOS_CWS.md`, `src/lib/shipping/README.md`.
- **Integração APIs GOV notas fiscais** (`bd56c79f`; pasta completa; última atividade 2026-10-23 13:26). **Integração APIs GOV notas fiscais** (23/10): NFS-e Nacional (DPS, assinatura XMLDSig, Sefin com TLS mútuo, fila `nfse_emissoes`, migrations 044/045); `docs/fiscal-contabil/`.
- **Brandbook e tokens do Real Olímpico** (`9c63d87c`; pasta completa; última atividade 2026-10-25 12:47). **Brandbook e tokens do Real Olímpico** (25/10): frente "brandbook" do polimento: tokens, fontes, catálogo de ativos (`src/brand/`) e `docs/marca/BRANDBOOK_REAL_OLIMPICO.md`.
- **Painel administrativo Real Olímpico** (`beee6814`; pasta completa; última atividade 2026-10-25 12:49). **Painel administrativo Real Olímpico** (25/10): frente "admin" do polimento; `docs/polimento/admin/` (brief de design, benchmark, inventário, propostas de backend, auditoria de botões e tabelas).
- **Polimento plataforma Real Olímpico** (`8b720db2`; pasta completa; última atividade 2026-10-25 12:49). **Polimento plataforma Real Olímpico** (25/10): frente "plataforma" do polimento (telas logadas do cliente); `docs/polimento/plataforma/` (MD_EXECUCAO, benchmark, inventário, pedido ao Antigravity).
- **Landing Real Olímpico — Redesign** (`bb848857`; pasta completa; última atividade 2026-10-25 13:48). **Landing Real Olímpico — Redesign** (25/10): frente "landing" do polimento de 24–25/10; `docs/EXECUCAO_LANDING_REDESIGN.md` e `docs/polimento/landing/`.
- **Formulário convite café da manhã** (`9c502b50`; pasta completa; última atividade 2026-10-27 14:30). **Formulário convite café da manhã** (27/10): formulário de convite para um café da manhã do lançamento. Pelo título; sem MD próprio localizado.
- **Real Olímpico design polish** (`d6d00061`; pasta completa; última atividade 2026-10-27 14:52). **Real Olímpico design polish** (27/10): continuação do polimento estético de 24–25/10 (landing, brandbook, ativos, plataforma, admin); `docs/polimento/`.
- **Higienização de repositório** (`c096945e`; pasta completa; última atividade 2026-10-28 00:16). **Higienização de repositório** (28/10): limpeza de pastas, branches e worktrees do repositório; ritual `higiene-de-pastas-apos-merge` (só depois do merge, dos testes e do OK do Gabriel).
- **Fly.io backend deployment** (`05c243ff`; pasta completa; última atividade 2026-11-03 14:39). **Fly.io backend deployment** (03/11): conversa sobre publicar um backend na Fly.io. Pelo título; este repositório publica na Vercel, sem backend Fly (o Fly é do IOCUS).
- **Problema de cobranças de custódia** (`d20b3c81`; pasta completa; última atividade 2026-11-03 20:36). **Problema de cobranças de custódia** (03/11): travou a moeda do Sidnei em 01/11 e cobrou do Rogério a renovação de um envio sem moeda; resultou na **regra única da custódia** (`src/domain/custodia-da-moeda.ts`, `quitar-fatura.ts`) e em `docs/ALTERACOES_2026-11-03_CUSTODIA_REGRA_UNICA.md`.
- **PWA Aurea Custodia** (`76217ed7`; pasta completa; última atividade 2026-11-05 03:19). **PWA Aurea Custodia** (05/11): PWA instalável com atualização automática (commit `2b48b04`); `docs/pwa/MD_EXECUCAO.md`. Falta teste em aparelho real, que virou a frente E.
- **Mensagem de convite Real Olímpico** (`5864a9da`; pasta completa; última atividade 2026-11-06 17:47). **Mensagem de convite Real Olímpico** (06/11): texto de convite para os primeiros clientes/sócios. Pelo título; sem MD próprio localizado.
- **Real Olímpico apresentação interativa** (`40b7ead2`; pasta completa; última atividade 2026-11-07 11:20). **Real Olímpico apresentação interativa** (07/11): origem do site de apresentação em 5 partes (`C:\dev\RealOlimpico-Apresentacao`, Vercel `real-olimpico-apresentacao`; a parte 5 é exceção de vocabulário, ver memória `site-de-apresentacao-real-olimpico`).
- **Organização de projetos na Sintetica** (`232e472f`; pasta completa; última atividade 2026-11-10 01:33). **Organização de projetos na Sintetica** (10/11): organização dos projetos do Gabriel no repositório da Sintetica; existe um chat igual nos repositórios IOCUS e K2CON. Origem do método de processo em `C:\dev\Sintetica\processo` e da ficha `C:\dev\Sintetica\contexto\projetos\aurea-custodia.md`.
- **Facilitação de modificações cadastrais no Admin** (`b9a90eba`; pasta completa; última atividade 2026-11-10 19:28). **Facilitação de modificações cadastrais no Admin** (10/11): deixar a equipe corrigir dados cadastrais de usuários na ficha (`/admin/usuarios/[email]`). Pelo título; sem MD próprio localizado.
- **Painel: saldo de clientes (terceiros)** (`c4c7bedb`; painel-saldo-clientes-a79d70; última atividade 2026-11-15 02:06). **Painel: saldo de clientes (terceiros)** (`saldo-clientes-painel`, worktree `painel-saldo-clientes-a79d70`, filho de `c02be4ed`): painel do admin com o saldo que a empresa guarda de clientes. Tarefa avulsa, fora das frentes A–L.
- **Correções pós-evento de lançamento** (`c02be4ed`; pasta completa; última atividade 2026-11-15 02:18). **Correções pós-evento de lançamento** (15/11): ajustes depois do evento de lançamento, em que o Rogério vendeu moeda em mãos com o mês de custódia embutido no preço (origem da caixa "Primeiro mês de custódia já pago", `Envio.primeiroMesPago`, migration 050). Abriu o chat `saldo-clientes-painel`.
- **Configuração pixel META no site** (`3622b458`; pasta completa; última atividade 2026-11-15 20:09). **Configuração do pixel da Meta no site** (15/11): Pixel e API de Conversões no ar e comprovados em 15/11 (`docs/META_PIXEL.md` e `META_PIXEL_RELATORIO_2026-11-14.md`; memória `meta-pixel-capi-estado-e-teste` explica como testar o evento do servidor sem prejudicar a campanha).
- **Aurea Custodia site maintenance tasks** (`58ed3bed`; pasta completa; última atividade 2026-11-18 01:20). **Chat de preparação da manutenção** (18/11, "Aurea Custodia site maintenance tasks"): leu os 16 itens do Rogério, escreveu o pacote `docs/manutencao-2026-11/` (executivo, controle, modelo de branch, 13 fichas) e preparou o Controle. É a frente M (análise de tráfego pago) que ele faria com o Gabriel; adiada. Não está na árvore de frentes.

<!-- m22:ini -->
## 8. Chats da Manutenção 22-11 e do QA do Davi (22/11/2026) [central-22/11]

Todos nascem do Controle [Pendências de manutenção do site](#local_e60062ca-6f76-4427-b0f8-5a8d5c7ed6b5), pasta completa, sem worktree, sem branch nova, NUNCA build local (Método Eficiente v2.2). Os ids `local_…` mudam entre contas.

| id | Chat | Papel | Rotina | Como recriar |
|---|---|---|---|---|
| `local_e60062ca-6f76-4427-b0f8-5a8d5c7ed6b5` | Pendências de manutenção do site | Controle | rotina de 5 min; decide merge, commit, índices | Chat novo na pasta completa; colar `Central de Organização/00_MD_PARA_OUTRA_SESSAO.md` e `docs/manutencao-2026-11/01_CONTROLE.md` |
| `local_a27216af-a775-4b4e-979c-d039e8ee40d0` | Manutenção 22-11 | T1 Financeiro e saldos | Branch | T1: saldo dos clientes, taxas pagas, migration 058, cadeia do ledger | T: Execução no turno; rotina de 3 min de auditoria do Controle | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--manut2-t1-financeiro…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_40a1dbab-fc6d-464a-9fbf-2845fc981204` | Manutenção 22-11 | T2 Isenção Áurea e PJ | Branch | T2: isenção Áurea/CEO e CPF ou CNPJ | T: Execução no turno; rotina de 3 min de auditoria do Controle | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--manut2-t2-isencao…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_70ef50cf-a0d9-400a-9c13-3f4d4d948300` | Manutenção 22-11 | T3 Balcão vídeos peso caixas | Branch | T3: vídeos, peso, posições, hashes | T: Execução no turno; rotina de 3 min de auditoria do Controle | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--manut2-t3-balcao…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_c020356b-87d1-4cc2-a9d8-c0891d2b0ae8` | Manutenção 22-11 | T4 Pendências do docx | Branch | T4: quadro dos 15 itens (só leitura) | T: Execução no turno; rotina de 3 min de auditoria do Controle | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--manut2-t4-docx…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_711cf8fa-6992-45cf-ab73-d2f0d8c394a5` | Manutenção 22-11 | T5 KPIs do conselho (5 do slide 3.1) | Branch | T5: KPIs do conselho, migration 059 | T: Execução no turno; rotina de 3 min de auditoria do Controle | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--manut2-t5-kpis…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_b475ca05-a67a-4a18-8673-a02f82ba311a` | Manutenção 22-11 | T6 PWA iPhone e login Google no app | Branch | T6: PWA no iPhone e login Google no app | T: Execução no turno; rotina de 3 min de auditoria do Controle | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--manut2-t6-pwa-iphone…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_58a21059-f34f-431c-b6ae-f40f223ae5ca` | Manutenção 22-11 | Tester | Tester | Tester: conferência visual logada | só em turno do Gabriel (navegador) | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--manut2-tester…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_a4087db9-9947-4518-84b4-ae4fceb8d90e` | QA Davi 22-11 | R1 Segurança e dados | Execução | R1: segurança e dados | Execução R: rotina de 3 min; Auditoria confere ao fim | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-r1-exec…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_8be63880-5d61-43d5-9264-b2e270e7fb37` | QA Davi 22-11 | R2 Cadastro e conta | Execução | R2: cadastro e conta | Execução R: rotina de 3 min; Auditoria confere ao fim | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-r2-exec…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_ae06dcfd-00bb-41fc-a1b0-d6df9dabecde` | QA Davi 22-11 | R3 Dinheiro e formulários | Execução | R3: dinheiro e formulários | Execução R: rotina de 3 min; Auditoria confere ao fim | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-r3-exec…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_e1b9d044-b226-4711-b92d-3c8ab1ca1247` | QA Davi 22-11 | R4 Texto legal e usabilidade | Execução | R4: texto legal e usabilidade | Execução R: rotina de 3 min; Auditoria confere ao fim | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-r4-exec…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_0b016b67-f208-46ea-9a74-5c997af7493c` | QA Davi 22-11 | R1 a R4 | Auditoria | Auditoria de R1–R4 | rotina de 3 min | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-auditoria…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_8792da9b-6732-4fbe-93a4-23259bd1f010` | QA Davi 22-11 | Polimento (Distilla) | Polimento | Polimento (Distilla) | depois do merge (Distilla) | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-polimento…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_42ffd257-365e-4056-8fc7-716dbc646904` | QA Davi 22-11 | Merge, Push, Deploy | Merge/Deploy | Merge, push e deploy | por ordem do Controle; commit só de MD vai direto | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-merge-deploy…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_4ef6a6e4-97aa-440d-a287-f83e252b0e47` | QA Davi 22-11 | Relatórios | Relatórios | Relatórios | ao fim de cada bloco | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-relatorios…` (ver `01_continuidade/manutencao-22-11/`) |
| `local_c3a2f593-603a-4d76-8048-8dbdf0069550` | QA Davi 22-11 | Higienização | Higienização | Higienização | depois do merge e dos testes | `start_session` a partir do Controle, `fresh`, pasta completa; brief = MD de execução `docs/diario/execucoes/2026-11-22--qa-higienizacao…` (ver `01_continuidade/manutencao-22-11/`) |

Nomes curtos (para `SendMessage`): `m2-t1-financeiro`, `m2-t2-isencao`, `m2-t3-balcao`, `m2-t4-docx`, `m2-t5-kpis`, `m2-t6-pwa-iphone`, `m2-tester`, `qa-r1-exec`, `qa-r2-exec`, `qa-r3-exec`, `qa-r4-exec`, `qa-auditoria`, `qa-polimento`, `qa-merge-deploy`, `qa-relatorios`, `qa-higienizacao`.
<!-- m22:fim -->

<!-- entregas22:ini -->
## 9. O que cada chat de 22/11 entregou (fechamento) [central-22/11]

| Nome curto | Papel | Entregou |
|---|---|---|
| `m2-t1-financeiro` | T1 | Saldo dos clientes, "Taxas pagas" na ficha, migration 058 (troca de e-mail não reescreve o ledger); cadeia do livro-razão refeita em produção (ids 493–624, só hashes). Commit `d570215`. |
| `m2-t2-isencao` | T2 | Isenção Áurea/CEO e CPF ou CNPJ (`isencao.ts`, `cpf.ts`); variáveis `NEXT_PUBLIC_AUREA_CONTA_*` na Vercel. Commits `1e6b775`, `06bfba3`. |
| `m2-t3-balcao` | T3 | Posição = lugar físico (18 reordenadas), peso padrão de Bandeira em 11 envios, gravador de vídeo, vídeos ligados. Commit `1e6b775`. |
| `m2-t4-docx` | T4 | Quadro dos 15 itens do docx × produção (só leitura). `QUADRO_ITENS_DOCX_22-11.md`. |
| `m2-t5-kpis` | T5 | KPIs do conselho (pagante, churn, margem por moeda, LTV) e `coin_ids` em cada negociação (migration 059). Commits `6c3f79f`, `66c0dd2`. |
| `m2-t6-pwa-iphone` | T6 | Login Google no app instalado (callback tolerante, aviso no login) e docs do PWA no iPhone. Commit `019947c`. |
| `m2-tester` | Tester | Varredura visual logada nas telas do cliente (375/768/1280, claro e escuro) e relatório `TESTER_22-11.md`. Achou: faixa de cookies cobrindo o tutorial, singular/plural, aceite no login Google; todos corrigidos. Fez o teste do cadastro por e-mail com o Gabriel digitando a senha (conta de teste apagada depois, cadeias de hash intactas): achou que a conta nascia confirmada mas a pessoa NÃO entrava; editou `auth.ts`, `RegisterForm.tsx` e o teste para entrar direto (commit `d84f795`). Falta repetir o cadastro com o Gabriel depois do deploy. |
| `qa-r1-exec` | R1 | B01 estado por usuário, cookie Secure, CSP bloqueante (relatório→bloqueio; #310 era artefato do painel oculto), faixa de cookies A09 com alvo de 44px. Commits `4c2df93`, `e97a19e`, `a4d5488`, `18630a9`, `f484c6f`, `5c9e7da`, `ee28f3b`. |
| `qa-r2-exec` | R2 | (B02 REVERTIDO pelo Gabriel em 22/11 à noite: conta nasce confirmada, sem limitação de cadastro; commit `91cccf2`.) Fez: E-mail pendente até confirmar (revertido), "esqueci minha senha", validação de nome/nascimento/telefone/Pix, aceite com erro visível. Commit `4026823`. |
| `qa-r3-exec` | R3 | Saque em dias úteis, validação do depósito, oferta sem saldo, ano travado, CEP, termos de publicação; A08/B09. Commits `6140f17`, `5a39b89`, `2d25296`. |
| `qa-r4-exec` | R4 | Termos 2.2, Arbitragem 2.2, Política 2.1, Tabela de Taxas 2.5, 404, textos; documentos legais gravados no banco por `scripts/publicar-documentos-legais.test.ts`. Commits `4b2f48f`, `f8ede77`, `a267335`, `e3f8958`, `895b924`, `81f2cfa`. |
| `qa-auditoria` | Auditoria | `AUDITORIA_QA_DAVI_22-11.md`: apontou 3 achados graves (teste do payload do B01; Termos 2.2 não publicar sem ordem; teste do aviso do Google), todos resolvidos (informado pelo Controle). |
| `qa-polimento` | Polimento | `POLIMENTO_QA_DAVI_22-11.md` (404 sóbrio, `184b3ea`). |
| `qa-merge-deploy` | Merge/Deploy | Publicou T5 e T6; R1 (`4c2df93`, `e97a19e`, `a4d5488`, `e6fdcc9`, `f484c6f`); R2 `4026823`; R3 `6140f17` e `2d25296`; R4 `4b2f48f`, `f8ede77`, `a267335`, `e3f8958`; `06bfba3` (banco.test) (informado pelo Controle). |
| `qa-relatorios` | Relatórios | `RELATORIO_STATUS_QA_DAVI_22-11.md` e texto do relatório (`44db26f`). |
| `m2-processo-padrao` | Processo Padrão | Rodou o ritual de sessão nas cópias da Central: `04_chats` seção 9 e `00_MD_PARA_OUTRA_SESSAO` seção 7 (separou o que o Controle informou do que conferiu); cron cancelado. Commit `65db7a9`. |
| `qa-higienizacao` | Higienização | Monitorou a árvore de trabalho e não agiu (nada apagado nem movido) (informado pelo Controle). |

Controle: `Pendências de manutenção do site` decidiu merges, commits e índices; pendências de 23/11 em `docs/manutencao-2026-11/PENDENCIAS_DE_EMAIL_PARA_AMANHA.md`.
<!-- entregas22:fim -->

## Atualização 22/11/2026 (21:55)
Chat Tester (`local_58a21059…`, m2-tester) recebeu a conferência final no ar; recusou testar o cadastro por e-mail (cria conta real, sem OK do Gabriel). Demais chats m2-*/qa-* ociosos.

## Atualização 22/11/2026 (22:20)
Tester (m2-tester) concluiu a varredura logada; falta só o cadastro por e-mail. qa-r2-exec removeu o login de a@a.co (linha em aurea.users e aceites ficam: cadeia de hash). Demais chats ociosos.

## 10. Estado de cada chat de 22/11 ao fim da noite, lido nas últimas mensagens de cada um [central-22/11-noite]

Como li: abri o fim de cada um dos 17 chats de hoje (última resposta do assistente) e conferi no Git, no banco (somente leitura) e na Vercel o que foi possível. **Não li a transcrição inteira de nenhum deles** (são de 79 a 897 mensagens cada). Onde o chat disse "não commitado", conferi o `git log`: o que ele chamava de pendente já está na `main`.

| Chat | Última palavra do chat | O que sobra (aberto de verdade) |
|---|---|---|
| T1 Financeiro | Push do `d570215`; deploy "pending" na hora; disse que ainda ia abrir o Financeiro em produção, ver o aviso da cadeia e a ficha do Rogério (Taxas pagas R$ 554,70) | **Não conferi** que o aviso da cadeia sumiu nem o valor da ficha. Conferência visual logada pendente |
| T2 Isenção | Corrigiu o teste do CPF/CNPJ (`banco.test.ts`), 60/60 | Variáveis `NEXT_PUBLIC_AUREA_CONTA_*` existem na Vercel (conferi). Contas Áurea/CEO sem taxa: sem teste logado |
| T3 Balcão | Reverso das 18 posições feito em produção (uma transação, hash refeito, 0 quebras); backup só na pasta de notas da sessão | 3 pesos ambíguos (RO-ENV-0014: 789 mg; RO-ENV-0003: 900 mg; RO-ENV-0048: 9 mg) só listados; 2 vídeos sem dono não apagados; **`corrigir-videos-e-posicoes.cjs` está sem rastreio no repositório e NÃO deve rodar sem `--so-videos`**; botão de vídeo na ficha do admin não conferido logado |
| T4 Docx | Quadro dos 15 itens: todos no ar; só leitura | Ver `01_continuidade/PENDENCIAS_DO_SISTEMA.md` (lista completa que ele montou) |
| T5 KPIs | Respostas do Gabriel aplicadas; 059 criada | Migration 059 **foi aplicada** pelo Merge/Deploy antes do push; negociações antigas ficam com a comissão por moeda em "—". Horizonte do LTV (12 meses) provisório; leitura do gasto pela API da Meta = pendência de marketing |
| T6 PWA | Callback tolerante e aviso do Google no app instalado; 122 testes | Só no aparelho: passos 4, 5 e 7 do roteiro do iPhone. **A tela de entrar não tem "Esqueci minha senha"** e o cliente não pede link: só a equipe envia (entra na tarefa de e-mail de 23/11) |
| R1 Segurança | Faixa de cookies com Saiba mais de 44 px publicada (`f484c6f`) | Nada. A faixa foi depois substituída pelo selo de cookies (`3219429`) por decisão do Gabriel |
| R2 Cadastro | Removeu o login de `a@a.co` no Supabase Auth; a linha em `aurea.users` e 3 aceites ficam (cadeia de hash) | B02 foi revertido (conta nasce confirmada). Se o Davi criou outras contas de QA, os e-mails são desconhecidos |
| R3 Dinheiro | Os 4 testes do frete dependiam do relógio (corte D-H5); corrigidos, 34 verdes | Nada |
| R4 Textos | Script de publicação dos documentos (não rodou sozinho) | Executado depois pelo Controle: no banco hoje Termos **2.3**, Arbitragem 2.2, Política 2.1, Taxas 2.5 |
| Auditoria | 3 achados graves resolvidos; cron apagado | Cookie PKCE sem `secure`/`httpOnly` (padrão da biblioteca, só anotado); erro React 418 não confirmado em navegador; validação de CPF/nome na Receita não aprovada |
| Polimento | Todas as sugestões entraram, medidas pelo Tester | Nada. Pergunta sobre a Arbitragem 2.2 na faixa de reaceite: por desenho (aceite próprio) |
| Merge/Deploy | Tudo publicado até `81f2cfa`, READY | Depois dele houve mais commits do Controle (abaixo) |
| Relatórios | `RELATORIO_STATUS_QA_DAVI` fechado | Atualizado pelo Controle depois (cookies, Termos 2.3, Google) |
| Higienização | Monitorou a árvore, não agiu; 17 itens sem rastreio na árvore | Itens sem rastreio de outras frentes continuam sem commit (ver abaixo) |
| Processo Padrão | Atualizou as cópias da Central e cancelou o cron | Linha dele faltava em `04_chats` e no CSV: acrescentada agora |
| Tester | Ver linha acima | Teste de cadastro por e-mail |

Commits do Controle depois de `81f2cfa`: `91cccf2` (B02 revertido, documento de e-mail, CPF por API), `e86252d` (achados do Tester), `3219429` (cookies presumidos e Termos 2.3), `0a9deae` (tutorial vira bolinha no celular), `3734866` (singular/plural), `978bc60` (Google não regrava aceite de conta existente), `22f6e80` e `162b06f` (docs), e `d84f795` (cadastro por e-mail entra direto na conta; editado pelo Tester, publicado pelo Merge/Deploy). Deploy do `d84f795` estava na fila quando escrevi: **READY não confirmado**. Termos 2.3 gravados no banco (conferido somente leitura).

Arquivos sem rastreio na árvore (nenhum é código do site; deixados como estão): `.agents/`, `corrigir-videos-e-posicoes.cjs`, `docs/polimento/**` (vários MD de outra frente), `docs/processo/`, mais `.claude/launch.json` modificado. Entrou por engano no commit `3219429` o script `scripts/apagar-contas-de-teste.mjs` (de outro agente; sem segredo).
