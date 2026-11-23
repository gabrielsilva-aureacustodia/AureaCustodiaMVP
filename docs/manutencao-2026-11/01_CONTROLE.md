# Chat de Controle — "Manutenção Real Olímpico -- Pendências | Controle"

```
Projeto:   Áurea Custódia / Real Olímpico — C:\dev\AureaCustodiaMVP (pasta principal, branch main, base 9e21fe1)
Papel:     o ÚNICO chat com quem o Gabriel conversa. Abre as frentes, vigia, faz check-up, merge, commit e (com o OK dele) push e deploy.
Modo:      "ignorar permissões" (bypassPermissions), como todos os chats abaixo dele.
Origem:    processo eficiente de branches 2.0 (docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md)
Estado:    arquivo de trabalho LOCAL, sem commit até o fim.
```

> O nome do chat é **"Manutenção Real Olímpico -- Pendências | Controle"**. O Gabriel colou o nome "Plataforma Parceiros -- LPs | Controle", que é de outro projeto; R12 manda o nome bater com o trabalho. Se ele quiser o outro, é um `set_session_title`.

## 1. Ordem de leitura (E11 — MDs primeiro, repositório só do que precisar)

1. `CLAUDE.md` (carrega sozinho) · `docs/diario/LEIA_PRIMEIRO_AGENTE.md` · `docs/INDICE_VEGA.md` (seções 1 e 5).
2. `docs/processo/PROCESSO_EFICIENTE_DE_BRANCHES_2.0.md` (o texto do Gabriel e a compreensão).
3. `docs/manutencao-2026-11/00_MD_EXECUTIVO.md` (os 16 itens, matriz de arquivos, contratos, decisões) e `02_MODELO_DOS_CHATS_DE_BRANCH.md`.
4. As 12 fichas em `docs/manutencao-2026-11/frentes/` (só o cabeçalho e o aceite agora; o resto cada frente lê).
5. O método da Sintetica, para fiscalizar sem reler tudo: `C:\dev\Sintetica\processo\00_INDICE.md`, `06_REGRAS_DO_GABRIEL_NA_INTEGRA.md`, `03_BRANCHES_E_COMMITS.md`, `04_RITUAL_DE_SESSAO.md`.
6. `git status -sb` e `git log -5` (uma vez). A pasta principal tem arquivos **de outros agentes sem commit** (`.claude/launch.json`, `.agents/`, `docs/polimento/**`): não os toque, não os apague, não os commite.

## 2. Setup (primeiros atos, nesta ordem)

0. **Modo de permissão primeiro.** O app só abre este chat no modo de quem o criou; o Gabriel aprova a subida para **"ignorar permissões"** num cartão. Confira com `get_session` (`"self"`) se `permissionMode` já é `bypassPermissions`. **Enquanto não for, só leia e faça os passos 1 e 2 — não abra frente nenhuma**: um chat só cria filhos no próprio modo ou abaixo, e filho criado antes ficaria sem "ignorar permissões". Volte a conferir a cada minuto (sem poll de modelo: leia o resultado do `get_session`). Se passar de 10 minutos sem a subida, avise o Gabriel e peça que ele eleve no menu de modo deste chat.
1. **Nome:** confira que o título do chat é o acima (`set_session_title` com `"self"` se não for).
2. **Registro do Controle:** escreva `docs/manutencao-2026-11/registro/_CONTROLE.md` com o seu `local_` (de `list_sessions`/`get_session`), a data e o horário. Os chats de branch usam esse id para mandar a completude.
3. **Rotina de 5 minutos** (seção 5) com `CronCreate` (`*/5 * * * *`, recorrente, expira em 7 dias — avise o Gabriel e recrie quando expirar). Ela dura **até terminarmos tudo**; ao fim, `CronDelete`.
4. **Abra as frentes** (seção 3). Todas juntas, em uma única rodada, exceto a **M**, que **não tem branch nem chat**: é a análise do tráfego pago, feita pelo chat de preparação com o Gabriel (ficha `frentes/M-*.md`). Não a abra e não a espere para mesclar nada.
5. **Primeiro relatório ao Gabriel** (seção 7): quem subiu, quem falhou, as perguntas D1 a D9 do executivo.

## 3. Como abrir uma frente (uma chamada `start_session` por frente, todas na mesma rodada)

Parâmetros fixos: `initiation: "user_asked"`, `context: "fresh"`, `use_worktree: true` (a worktree nasce de `main`, base `9e21fe1`), `permission_mode: "bypassPermissions"`, `name: "manut-<id>"`.
`background` (≥ 80 caracteres): *"Manutenção do Real Olímpico pedida pelo sócio Rogério (11/11/2026), prazo 30/11/2026. Processo eficiente de branches 2.0: Controle → chat de branch → Execução/Auditoria/Específico. Base 9e21fe1. Método base: C:\dev\Sintetica\processo."*
`prompt` (trocando `<ID>`, `<slug>`, `<local_ do Controle>`):

```text
Você é o CHAT DE BRANCH da frente <ID> (<slug>) do Real Olímpico, filho do chat de Controle (<local_ do Controle>).
Leia e siga, por caminho absoluto, C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\02_MODELO_DOS_CHATS_DE_BRANCH.md (a seção 3 é o seu papel)
e a ficha C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\<ID>-<slug>.md. Faça o que está lá, na ordem, sem pedir aprovação do plano.
O pacote está fora do Git (sem commit): leia pelo caminho absoluto, não copie para a worktree.
```

| ID | `branch_name` | Título do chat (R12, ≤ 60) | Específico? | Onda de merge |
|---|---|---|---|---|
| A | `manut-seguranca-senha` | A · Segurança: senha nas ações sensíveis | sim (padrões de reautenticação, código por e-mail) | 2 |
| B | `manut-primeiro-mes-no-envio` | B · Cobrança: 1º mês de custódia no envio | não | 3 |
| C | `manut-emails-de-movimentacao` | C · E-mails: confirmação de compra e movimentação | sim (custo do provedor) | 2 |
| D | `manut-cadastro-google` | D · Cadastro: Google primeiro e demonstração | sim (gravar a demonstração) | 1 |
| E | `manut-pwa-iphone` | E · App: PWA funcionando no iPhone | sim (diagnóstico iOS/WebKit) | 1 |
| F | `manut-extrato-igual-ao-saldo` | F · Extrato: refletir o saldo real | não | 4 |
| G | `manut-notas-do-cliente` | G · Notas: NFS-e acessível ao cliente | sim (leitura de produção e DANFSe) | 2 |
| H | `manut-cancelar-envio-e-nota` | H · Cancelamento: envio, validação e nota | sim (Correios e achar o caso em produção) | 3 |
| I | `manut-numero-da-moeda` | I · Recibo: número da moeda | não | 1 |
| J | `manut-kpis-do-conselho` | J · KPIs: painel do conselho no admin | sim (definição dos KPIs) | 1 |
| K | `manut-frete-mais-4` | K · Frete: acréscimo de R$ 4,00 | não | 1 |
| L | `manut-armazenamento-videos` | L · Vídeos: espaço e armazenamento barato | sim (preços) | 1 |
| M | — | **não abrir**: sem branch. A análise do tráfego pago (gerenciador de anúncios, só leitura) é feita pelo chat de preparação, quando o Gabriel liberar o navegador; o resultado chega em `entregas/ANALISE_DE_TRAFEGO.md`. **ADIADA por ordem do Gabriel (17/11): fica por último; a melhoria do site com base na auditoria de marketing será uma branch específica que ele abrirá depois. No relatório final, "adiada — branch própria depois"** | — | fora das ondas |

Depois de cada `start_session`, anote o `local_` devolvido em `registro/<ID>.md` (só o Controle escreve a linha de sessão do chat de branch; o resto o chat de branch preenche). Se uma frente falhar ao abrir, **diga** ao Gabriel e tente de novo uma vez; não suba a frente "pela metade".

## 4. Prioridades e dependências (o que o Controle protege)

- **H é a mais urgente do pacote** (nota fiscal: o contador pede cancelar dentro do mês). Se faltar capacidade, H e B têm preferência.
- **B ↔ H**, **B/H → F**, **D ↔ E**, **A → todos** e **C → todos** são contratos (executivo, seção 4). O Controle não deixa uma frente decidir sozinha sobre o que é do contrato de outra.
- Frente que pedir edição em arquivo do `touch` de outra: o Controle decide o encaixe no merge (não a frente).
- Frente que tocar **superfície protegida**: o Controle lista no check-up e leva ao Gabriel antes do merge.

## 5. A rotina do Controle — a cada 5 minutos (`*/5 * * * *`)

```text
ROTINA DO CONTROLE. 1) Pré-checagem em código (PowerShell): Get-ChildItem C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\registro |
   Select Name,LastWriteTime ; Get-Content cada registro (só as 12 primeiras linhas) ; mcp list_sessions {"linked": true}.
2) Nada mudou desde o ciclo anterior? Escreva "Controle: sem mudança" no quadro (registro\_QUADRO.md, uma linha com a hora) e pare.
3) Mudou: monte o quadro (uma tabela de 12 linhas: frente · estado · tópico · bloqueio · testes · Git), atualize registro\_QUADRO.md e:
   a) frente "bloqueada": resolva (outro chat de branch, contrato, encaixe) ou leve ao Gabriel; b) frente "pronta para merge": faça o CHECK-UP (seção 6);
   c) chat de branch parado/falhou: reabra com o mesmo MD (R12: nome novo se o trabalho mudou); d) rotina de algum chat expirou: peça que recrie.
4) Só fale com o Gabriel quando houver decisão, bloqueio dele ou entrega. Sem prolixidade: tabela + até 5 linhas.
```

## 6. Check-up, merge, commit, push, deploy (só o Controle faz)

**Check-up de uma frente que subiu "pronta para merge"** (confira com o que está em disco, não só com o relato):
1. `git -C <worktree> status -sb` e `diff --name-only` ⊆ lista **Touch** da ficha; **nenhum commit** na branch (B1); sem `.env.local`, segredo ou token.
2. O MD de execução, o LOG, a CONTINUIDADE e o rascunho de memória existem; o aceite da ficha está todo marcado.
3. Teste da branch rodado e verde (o chat de branch diz qual). Se vermelho: volta para a frente — suíte vermelha não é pendência (memória `suite-vermelha-nao-e-pendencia`).
4. Superfície protegida e migration anotadas. Migration numerada **dentro da faixa reservada** (executivo, seção 4).

**Merge** (agente separado = o Controle, na pasta principal, **na ordem das ondas** do executivo, seção 7):
- `git merge --no-ff <branch>` por frente; conflito: **para**, não resolve fora do `touch` (packet de reconciliação).
- Depois de cada onda: `npm run typecheck`, `npm test`, `npm run build`. Depois da onda 3, rode o teste de invariante da F (saldo = extrato).
- Aplique as migrations **na ordem numérica**, junto com o commit (`npm run db:migrate`, com a variável direta; nunca `SET` de sessão em leitura de produção).
- Encaixe as **linhas para os índices** dos registros: `docs/memorias/README.md`, `docs/INDICE_VEGA.md`, `ESTADO-GERAL-*`.
- **Commit** completo (skill `/commit`), com a atribuição de co-autoria vigente. Só MD → direto, sem build.

**Push e deploy (decisão D9 do executivo, padrão adotado):** antes do push, o Controle mostra ao Gabriel o resultado dos testes, a lista de frentes mescladas, as migrations aplicadas e o que **não** foi testado, e pede **um** "ok". Com o ok: `gh auth switch --user gabrielsilva-aureacustodia`, push, e skill `/publicar` (deploy conferido em https://realolimpico.com.br). Se o Gabriel já disse "pode publicar" na conversa, não pergunte de novo (R9).

**Higiene** (só depois do merge, dos testes e do OK dele): logs e MDs vão para a `main` **antes** de apagar worktree ou branch (B6); MD de execução de branch mesclada vai para `docs/diario/execucoes/arquivo/`; `git worktree remove` + apagar a branch local **perguntando antes** (memória `higiene-de-pastas-apos-merge`).

## 7. O que o Controle devolve ao Gabriel

- **Agora (primeiro relatório):** quais frentes subiram (nome, `local_`, worktree), qual falhou, quais rotinas estão ativas, e as perguntas **D1 a D9** com o padrão adotado em cada uma.
- **Durante:** o quadro curto, só quando houver decisão ou entrega.
- **No fim — relatório completo do que deu certo e do que deu errado**, por item do Rogério (os 16), em linguagem de negócio (formato `13_RELATORIOS.md`, "Features/Correções"): *Agora o usuário consegue* / *Deixou de acontecer* / *Ainda não* — mais o relatório técnico de execuções (ordem real, arquivos, testes, bloqueios), o de modificações estruturais e a lista de **ações manuais do Gabriel** (variável na Vercel, teste no iPhone, cancelamento da nota real, perguntas ao contador).

## 8. Item 5 do Rogério (fornecedores de internet e IA) — operacional, sem branch

O Controle cria `docs/manutencao-2026-11/OPERACIONAL_FORNECEDORES.md`: tabela com fornecedor · para que serve · onde sai a fatura · ciclo/vencimento · valor (**o Gabriel preenche**) · quem paga. Fornecedores conhecidos pelos MDs do projeto (`docs/SETUP_CONTAS_E_SERVICOS.md`, `docs/INDICE_VEGA.md` seção 5): Vercel, Supabase, Resend, Mercado Pago, Correios (contrato Platinum 1), registro de domínio e DNS, WhatsApp/Evolution, Meta (anúncios), Google Workspace e os provedores de IA. O Controle **não** paga nada, **não** acessa fatura de cobrança e **não** inventa valor: entrega a tabela pronta e a lista de "enviar ao Rogério até o dia X" para o Gabriel preencher.

## 9. Operação em produção que fica com o Controle (H)

Quando a frente H entregar o cancelamento: o Controle encontra, **só por leitura** (`BEGIN READ ONLY`), o envio e a NFS-e de R$ 30 do Rogério, mostra ao Gabriel **o que será desfeito** (envio, plano/fatura, nota, saldo, etiqueta) e só executa pelo painel depois do "sim" dele. Nota fiscal e saldo de cliente não se desfazem sem ele ver.
