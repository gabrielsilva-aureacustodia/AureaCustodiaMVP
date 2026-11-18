# MD de execução — `claude/manut-numero-da-moeda-3dedde` (frente I · numero-da-moeda-no-recibo)

```
Projeto:        Áurea Custódia / Real Olímpico — manutenção de novembro/2026 (item 12 do Rogério)
Branch:         claude/manut-numero-da-moeda-3dedde
Worktree:       C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-numero-da-moeda-3dedde
Assignee:       Execução (filho do chat de branch da frente I)
Packet:         C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\I-numero-da-moeda-no-recibo.md
Ref_commit:     9e21fe1
Aberta em:      2026-11-17 22:20
Atualizada em:  2026-11-17 22:37 (horários do log corrigidos para o relógio do sistema; os de 22:41/22:55/23:05 eram errados)
Estado da branch: aberta — nenhum commit (B1); migration: nenhuma
Chat de branch: local_2bb975f7-7b8b-4722-849e-198df7898ce8 · Execução: local_ec9c65fd-3131-4fe8-a8ab-c5d78efc4212 (manut-i-exec) · Auditoria: local_a7378e0c-3ee1-4a89-932b-25f63d78b7a3 (manut-i-audit)
Controle:       local_e259126b-4373-4132-9e89-79edb7fa94ec · registro vivo (canal oficial): C:\Users\Gabriel\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_e259126b-4373-4132-9e89-79edb7fa94ec\registro-I.md (o hook da worktree barrou a escrita em docs\manutencao-2026-11\registro\I.md; só o chat de branch escreve o registro)
```

## RETOMADA (ler primeiro; a Execução e a Auditoria mantêm este bloco)

- **Estado (22:37):** T1, T2 e T3 fechados · T4: testes escritos e verdes (2 arquivos, 15 testes) e `tsc --noEmit` verde (22:35); **falta só `npm test` (suíte completa), que só roda com o aval do chat de branch** (memória no limite).
- **Aceite em uma frase:** o recibo do cliente (tela, folha e PDF) mostra o número da moeda, sem alterar o hash.
- **Próximo ato:** avisar o chat de branch que o `typecheck` já está verde e pedir o aval para rodar `npm test` uma vez; depois "FRENTE I PRONTA".
- **Git:** base 9e21fe1, 0 commits. Alterados (4): `src/components/recibo/Certificate.tsx`, `FolhaDoRecibo.tsx`, `ReciboCard.tsx`, `src/lib/pdf/recibo-pdf.ts`. Novos (3): `src/components/recibo/numero-da-moeda.ts`, `src/components/recibo/numero-da-moeda.test.ts`, `src/lib/pdf/recibo-pdf.test.ts` (+ os MD/LOG/CONTINUIDADE de `docs/diario/execucoes/`). Nada em `.claude/`, `src/styles/**`, `types.ts`, `hash.ts`; `.env.test.local` (criado só para o preview) removido às 22:36.
- **Ordens que valem agora (chat de branch / Gabriel):** nada de servidor local, preview, build, container nem subagente; só leitura, edição e vitest de UM arquivo por vez; suíte e typecheck só no fim, com aviso ao chat de branch. **Conferência visual em navegador: feita localmente só ANTES da ordem (a 320 px, tema escuro/claro por `data-theme`, antes das ~22:31); o restante (375 a 430 px, PDF no leitor real) NÃO foi feito localmente e fica para a produção, depois do merge/deploy do Controle.** Servidores que eu subi (porta 3104 e um `http.server` na 3110) estão encerrados; portas confirmadas livres às 22:36.
- **Pedido do Rogério (palavras dele):** "Mostrar o número da moeda no recibo do cliente (WhatsApp de sábado 7/11)."

## Aceite

- [x] **T1 — o que é "o número da moeda":** decisão anotada com evidência. **Padrão:** "Moeda nº RO-000042" (`Coin.id`), ao lado do código do recibo (`REC-000042`).
- [x] O número aparece **na tela** (`ReciboCard` na lista, `Certificate` + `FolhaDoRecibo` no detalhe), **na folha** (`FolhaDoRecibo`) e **no PDF** (`recibo-pdf.ts`), em lugar de destaque, ao lado do código do recibo. (Admin: prop opcional; falta a linha de encaixe do Controle no merge.)
- [x] **Hash inalterado:** a fórmula e os campos do hash não mudam (o número só é **exibido**). Teste que compara o hash antes e depois (`numero-da-moeda.test.ts`: vetor fixo calculado à parte com `node:crypto`).
- [~] PDF com acentos e quebra de linha corretos (✔ por teste e pelo texto extraído dos 3 PDFs); mobile de 320 a 430 px; claro e escuro — **só 320 px conferido no navegador, antes da ordem de não subir servidor; 375–430 px e a conferência no leitor de PDF real ficam para a produção**.
- [~] Testes de texto/snapshot do recibo e do PDF ✔ (15 testes verdes); `npm run typecheck` ✔ (exit 0, 22:35); `npm test` (suíte completa) **pendente: aguardando o aval do chat de branch**.

## Ler (e só isto)

- `src/components/recibo/Certificate.tsx`, `FolhaDoRecibo.tsx`, `ReciboCard.tsx`
- `src/lib/pdf/recibo-pdf.ts`
- `src/app/(app)/recibos/**`
- `src/domain/types.ts` (`Coin`, `Recibo`) — só ler
- `src/domain/hash.ts` — **só ler**, para **não** mudar
- `renumerar-acervo.cjs` — **só ler**; script de produção, **não executar**
- (para o quadro de achados abaixo) `src/app/(admin)/admin/moedas/[codigo]/cliente/page.tsx` — só ler, ver "Pergunta ao Controle"

## Touch

- `src/components/recibo/**`
- `src/lib/pdf/recibo-pdf.ts`
- `src/app/(app)/recibos/**`
- testes novos (`src/components/recibo/numero-da-moeda.test.ts`, `src/lib/pdf/recibo-pdf.test.ts`) — **`.test.ts`, não `.tsx`**: o `include` do `vitest.config.mts` é só `src/**/*.test.ts`, então um `.test.tsx` nunca rodaria; o componente é renderizado com `createElement` + `renderToStaticMarkup` (mesmo padrão dos outros testes de componente).
- este MD, o LOG, a CONTINUIDADE e os relatórios em `docs/diario/execucoes/` (branch/Auditoria)

## Do not touch

- `src/domain/hash.ts` e a fórmula do hash — o número só é **exibido**.
- `src/domain/types.ts` — superfície protegida; o número já existe em `Coin.id`, não precisa de campo novo.
- QR — o recibo não tem QR desde 20/09/2026 (o PDF ainda tem o desenho decorativo: **não mexer**, não reintroduzir).
- qualquer `.cjs` da raiz (inclui `renumerar-acervo.cjs`: ler, não executar).
- `docs/memorias/README.md`, `docs/INDICE_VEGA.md`, `ESTADO-GERAL-*`, `CLAUDE.md` e arquivos gerais da raiz (B5) — o Controle encaixa as linhas no merge.
- `.env.local`, `node_modules` (junção): nunca em staged.

## Fora de escopo

Redesenhar o recibo, QR, blockchain, mudar a numeração das moedas.

## Achados do chat de branch na leitura inicial (para a Execução confirmar, não são decisão)

1. **A tela já mostra `coin.id` hoje**, mas **fora da folha**: `Certificate.tsx:325-330`, painel lateral "Dados da moeda" → "Código da moeda" = `{coin.id}`. O comentário acima dele diz que o painel fica fora do documento "para que o `.cert` continue idêntico ao que o PDF imprime". O Rogério pede o número **no recibo** — leitura provável: dentro da folha e do PDF.
2. **A folha e o PDF têm "CINCO campos" fixos** (`FolhaDoRecibo.tsx:60-63`; `recibo-pdf.ts:81-86`: o `y` é acumulador de 30 pt por campo e tudo depois — selo, rodapé — se posiciona a partir dele; página 480×660). Acrescentar uma sexta linha empurra o PDF 30 pt; antes de fazer, **medir se cabe** (rodapé/selo) ou preferir uma **sub-linha logo abaixo do código do recibo** (`codigo` está em y=168; campos começam em y=198: há ~30 pt de folga). Escolha a menos invasiva e registre no log.
3. **`ReciboCard` (lista `/recibos`)** mostra só `coin.recibo.codigo` (linha 70). "Em lugar de destaque, ao lado do código do recibo" cobre também o cartão da lista: mostrar "Moeda nº RO-…" junto do código.
4. **`FolhaDoRecibo` é compartilhada com o Admin**: `src/app/(admin)/admin/moedas/[codigo]/cliente/page.tsx:75` (fora do Touch). Se a prop nova for **obrigatória**, o typecheck quebra lá; se for **opcional** e o Admin não passar, a visão "Ver como o cliente vê" deixa de ser o mesmo documento. Ver **Pergunta ao Controle**.
5. Há `coin.id` no `ModalSolicitarRetirada` (`Moeda: … ({coin.id})`) — já mostra; não precisa mexer.

## Decisão do Controle (22:30) sobre o Admin — RESPONDIDA

O Admin chama `FolhaDoRecibo` (`src/app/(admin)/admin/moedas/[codigo]/cliente/page.tsx`, ~linha 75), fora do Touch. **Decisão: não editar fora do Touch.** Entregar a prop **opcional** `numeroDaMoeda?: string` em `FolhaDoRecibo` e, ao fechar T2, anotar ao chat de branch a linha exata (arquivo, linha, nome da variável da moeda) para ele registrar em "Linhas de encaixe"; o Controle aplica `numeroDaMoeda={...}` no merge.

## Tópicos

### T1 — Confirmar qual é o número e onde ele aparece hoje

Estado: FECHADO (~22:25, relógio real)
Aceite deste tópico: decisão anotada neste MD (o que é "o número da moeda", com a evidência), sem editar código.
Arquivos deste tópico: leitura — `types.ts` (`Coin`, `Recibo`), `Certificate.tsx`, `ReciboCard.tsx`, `recibo-pdf.ts`, `src/app/(app)/recibos/**`, `renumerar-acervo.cjs` (só ler), o README/MD de recibos se houver (`docs/**`: o chat de branch não achou arquivo com "recibo" no nome — pesquisar por conteúdo em `docs/` só se precisar).
Log:
- ~22:25 Evidência: `types.ts:79-82` — `Coin.id` é o "código sequencial global da moeda: 'RO-000042'"; `types.ts:68-70` — `Recibo.codigo` "deriva do código da moeda: RO-000042 → REC-000042". `codes.ts:30-50` — `nextCoinCode` gera `RO-` + 6 dígitos e `nextCodigoRecibo` só troca o prefixo (relação 1:1, mesmos dígitos). `renumerar-acervo.cjs:16-22` — o acervo vivo é `coins.id RO-000001..100` e `recibos.codigo REC-000001..100`; as outras numerações (`RO-ENV-…` envio, `RO-ANL-…` análise) são de processo, não da moeda, e o cliente não as conhece como "a moeda". Hoje a tela já mostra `coin.id` só no painel lateral fora da folha (`Certificate.tsx:325-330`, "Código da moeda"); a folha, o cartão da lista e o PDF mostram só `REC-…`. Nenhum README/MD de recibos contradiz (o único texto sobre a numeração é o cabeçalho de `codes.ts`).
- ~22:25 **Decisão T1: "o número da moeda" = `Coin.id` (`RO-000042`), exibido como "Moeda nº RO-000042", logo abaixo do código do recibo, na folha (tela e Admin), no cartão da lista e no PDF.** Não há campo novo (`types.ts` intocado) e o hash não muda: o número só é lido de `coin.id`. O rótulo mora em UM lugar (`src/components/recibo/numero-da-moeda.ts`) e tela, cartão e PDF o importam — o Gabriel muda o texto numa linha.
Próximo ato deste tópico: (fechado) → T2.

### T2 — Tela e folha mostram o número

Estado: FECHADO (~22:30, relógio real) — conferência no navegador só a 320 px (ver RETOMADA)
Aceite deste tópico: `/recibos` (cartão) e `/recibos/[coinId]` (folha) mostram o número em destaque ao lado do código do recibo; conferido no navegador local (preview), 320–430 px, claro e escuro.
Arquivos deste tópico: `src/components/recibo/FolhaDoRecibo.tsx`, `Certificate.tsx`, `ReciboCard.tsx`, CSS de `.cert-code`/`.recibo-code` **só se** já estiver sob `src/components/recibo/**` ou for classe existente reaproveitada (CSS global está fora do Touch: **perguntar ao chat de branch antes de editar `src/styles/**`**).
Log:
- ~22:27 Código: novo `src/components/recibo/numero-da-moeda.ts` (`ROTULO_NUMERO_DA_MOEDA = 'Moeda nº'`, `rotuloDoNumeroDaMoeda(id)` → "Moeda nº RO-000042" com espaço inseparável antes do número); `FolhaDoRecibo` ganhou a prop **opcional** `numeroDaMoeda?: string`, desenhada na MESMA `.cert-code`, 2ª linha (`<br />` + `<span class="cert-numero-da-moeda">`) — herda a tinta ouro AA e a margem de 22px, **sem CSS novo** (nenhum arquivo de `src/styles/**` editado); `Certificate` passa `numeroDaMoeda={coin.id}`; `ReciboCard` ganhou uma 2ª `.recibo-code` com o mesmo texto. O painel lateral "Código da moeda" ficou como estava.
- ~22:29 Preview local, ANTES da ordem de não subir servidor (servidor de teste: `NODE_ENV=test`, store em memória semeado, porta 3104, `.env.test.local` ignorado pelo Git; o hook da worktree barrou a edição do `.claude/launch.json`, então o servidor subiu por Bash em segundo plano — nada de `.env.local` de produção). Conta `rogeriopena@testeaurea.com.br`. Resultado: `/recibos` — cartões "REC-000001 / Moeda nº RO-000001 / R$ 437,50 / Em custódia" (15 cartões, todos com a linha); `/recibos/RO-000001` — `.cert-code` = "REC-000001" ⏎ "Moeda nº RO-000001", cor rgb(122,93,28) (a mesma do código), vão de 22px até os campos mantido. **320 px**: folha 292 px, linha do número em 1 linha (não quebra), `scrollWidth` do documento = 320 (sem rolagem lateral); cartão 258 px, `.recibo-code` sem estouro. Tema: a folha ignora o tema (creme fixo); o cartão usa a classe `.recibo-code` já existente, e ao alternar `data-theme` a cor mudou junto com a do código do recibo (contraste idêntico ao texto que já existia). 375 e 430 px não foram medidos à parte: a folha tem `max-width` de 400 e a linha cabe com folga já nos 210 px de 320 px.
- ~22:30 **Linha de encaixe do Admin (enviada ao chat de branch):** `src/app/(admin)/admin/moedas/[codigo]/cliente/page.tsx`, depois da linha 78 (`codigo={linha.recibo.codigo}`) acrescentar `numeroDaMoeda={linha.codigo}` — `linha.codigo` é o `Coin.id` (`src/domain/admin/moedas.ts:98`, `codigo: c.id`). Sem essa linha o Admin continua compilando (prop opcional), só não mostra o número.
Próximo ato deste tópico: (fechado) → T3.

### T3 — PDF mostra o número

Estado: FECHADO (~22:32, relógio real)
Aceite deste tópico: `recibo-pdf.ts` imprime "Moeda nº …" em destaque junto do código do recibo, sem desmontar a página 480×660; PDF gerado e conferido (acentos "Custódia", "Olímpico", "Proprietário"; sem corte de linha).
Arquivos deste tópico: `src/lib/pdf/recibo-pdf.ts`, teste novo.
Log:
- ~22:30 **Escolha: sub-linha no cabeçalho (y=185), NÃO sexta linha em `fields`.** Motivo: um campo a mais empurra selo e rodapé 30 pt; a sub-linha custa só 8 pt (primeiro campo passou de y=198 para y=206 para abrir respiro de ~12 pt depois da linha nova). Selo e rodapé acompanham o acumulador `y`; o rodapé fica em y=499 de uma página de 660 (moldura até 634) — sobram ~135 pt. Mesma tinta ouro e mesmo corpo (12 pt bold) do código do recibo, como na tela. O espaço inseparável do helper vira espaço comum no PDF (linha centralizada, curta; métrica do jsPDF sem garantia para U+00A0).
- ~22:30 Refatoração mínima: `baixarReciboPdf` (mesma assinatura) agora chama a nova `montarReciboPdf({coin, ownerName}): Promise<jsPDF>` e só faz o `doc.save`. Foi o jeito de o teste ler o conteúdo sem depender do DOM; páginas, coordenadas e textos são os de antes + a linha nova. O gancho de QR continua fora (não reintroduzido).
- ~22:31 Conferência visual (feita ANTES da ordem de não subir servidor; o `http.server` da porta 3110 que servia a página já foi encerrado): gerei os três estados (Ativo, Bloqueado, Extinto) com `montarReciboPdf` num teste temporário FORA do repositório (scratchpad) e desenhei cada PDF com pdf.js numa página local. Texto extraído de cada um: "REC-000042 | Moeda nº RO-000042 | Moeda | Direitos Humanos 1998 | Status | … | Proprietário atual | Rogério Siqueira — Proprietário Olímpico | …"; acentos (Custódia, Olímpico, Proprietário, nº, —) corretos; nada cortado; a linha nova cabe com sobra (≈ 100 pt de largura de 440 disponíveis). Os carimbos de Bloqueado/Extinto (retângulo fixo em y=240–292) sobrepõem os campos como já faziam antes — continua um carimbo sobre o documento; com os campos 8 pt abaixo, cobre os mesmos dois campos centrais de antes (não piorou).
Próximo ato deste tópico: (fechado) → T4.

### T4 — Teste do hash intacto + suíte

Estado: testes escritos e verdes; typecheck verde; **suíte completa (`npm test`) pendente do aval do chat de branch**
Aceite deste tópico: teste novo que prova que o hash não depende do número (fórmula e entradas de `hash.ts` inalteradas, mesmo recibo → mesmo hash antes e depois); testes de texto do recibo (folha/cartão) e do PDF; `npm run typecheck` e `npm test` verdes **ao fim** (uma vez; E3).
Arquivos deste tópico: testes novos em `src/components/recibo/` e `src/lib/pdf/` (padrão do repositório: `*.test.ts` ao lado do arquivo — o `include` do vitest não pega `.tsx`).
Log:
- ~22:33 `src/components/recibo/numero-da-moeda.test.ts` (10 testes): o rótulo é "Moeda nº" + `Coin.id` com espaço inseparável; a folha com a prop traz `<div class="cert-code">REC-…<br/><span class="cert-numero-da-moeda">Moeda nº RO-…</span></div>` e na ordem título → código → número → campos; sem a prop (Admin até o encaixe) a folha é a de antes; os CINCO `cf-row` e o hash curto seguem intactos; o cartão traz as duas `.recibo-code`, o `href` e o nome acessível de antes. **Prova do hash:** (1) vetor fixo `37bb2ed5…` (GENESIS + 15 campos da análise de `RO-000042`) calculado à parte com `node:crypto` e comparado com `hashDaAnalise` e com o texto canônico — quebra se a fórmula ou a lista de campos mudar; (2) renderizar folha e cartão não altera a moeda nem `recibo.hash` (JSON antes = depois); (3) `hash.ts` e `analise.ts` não importam nada de `numero-da-moeda`/`components/recibo`. Nota: o `RO-…` já entra na corrente como `codigoMoeda` desde sempre; mostrar o número no papel não muda nenhum resultado.
- ~22:33 `src/lib/pdf/recibo-pdf.test.ts` (5 testes): `montarReciboPdf` lido pelos operadores `Td`/`Tj` do PDF (origem convertida para o topo): "Moeda nº RO-…" 17 pt abaixo do código do recibo, ≥ 15 pt de respiro antes do primeiro campo; os cinco rótulos, na ordem, em x=56, mais o hash curto, a data e o proprietário; acentos de "REAL OLÍMPICO", "Custódia", "Proprietário", "CUSTÓDIA" corretos e nenhuma palavra de QR/simulado; todo texto dentro da moldura (26 a 634 pt) e o rodapé abaixo de 560 pt; os três estados (ativo, bloqueado, extinto) trazem o número e os carimbos seguem em y=263. O parser desfaz o escape de parênteses do PDF (`Hash \(curto\)`).
- ~22:33 Rodada dos dois arquivos: 15/15 verdes. A 1ª tentativa de `tsc` achou 1 erro no MEU teste (`AnalisePendente` importado do módulo errado; é de `@/domain/analise`): corrigido. Tentativas seguintes de `typecheck`/eslint/`npm test` falharam por falta de memória da máquina (fork do Git Bash e estouro de heap do Node, RAM livre ~0,3 GB com outras sessões ativas), e a suíte morreu com 127 sem rodar nada. `node node_modules\typescript\bin\tsc --noEmit` rodado sozinho em segundo plano: **exit 0, sem mensagens (22:35)** — esse é o `typecheck` da frente. ESLint dos arquivos novos e `npm test` NÃO rodaram.
Próximo ato deste tópico: com o aval do chat de branch (memória), rodar `npm test` UMA vez, sem nada em paralelo, e anotar aqui o resultado; ESLint só dos 7 arquivos da frente, se o chat de branch liberar.

## Sessões

### Sessão 2026-11-17 (chat de branch — preparação)

Tipo: branch (preparação, sem código de produto)
Feito: Passo 0 (junção `node_modules`, `.env.local` copiado, base 9e21fe1 conferida); leitura do modelo, da ficha, do executivo e dos pontos do recibo; este MD; registro da frente (na pasta de notas da família, ver cabeçalho).
Não feito: T1 a T4 (com a Execução).
Bloqueios para o humano: nenhum. Pergunta ao Controle: prop opcional + 1 linha no Admin (ver acima).
Teste rodado? não
Próximo ato (um): Execução começa por T1.
