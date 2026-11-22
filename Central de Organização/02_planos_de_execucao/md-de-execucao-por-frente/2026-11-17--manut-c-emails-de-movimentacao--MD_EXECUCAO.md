# MD de execução — `claude/manut-emails-de-movimentacao-c46333` (frente C · e-mails de movimentação)

```
Projeto:           Áurea Custódia / Real Olímpico — manutenção de novembro/2026 (item 3 do Rogério)
Branch:            claude/manut-emails-de-movimentacao-c46333
Worktree:          C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-emails-de-movimentacao-c46333
Assignee:          chat de branch C (filhos: execução, auditoria, específico)
Packet:            C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\C-emails-de-movimentacao.md
Ref_commit:        9e21fe1
Aberta em:         2026-11-17
Atualizada em:     2026-11-17 22:48
Estado da branch:  aberta (nenhum commit — B1)
Prazo:             30/11/2026   ·   Onda de merge: 2   ·   Migration reservada: 053 (só se precisar)
```

## RETOMADA
- **Estado (17/11, Execução):** **T1 a T5 FEITOS.** Código em `src/server/emails/`, gancho em `db/estado.ts` e `state.ts`, `idempotencyKey` em `src/lib/email/`, migration 053 escrita (NÃO aplicada). Typecheck e lint verdes; 111 testes de `emails` verdes; suíte vizinha (53 arquivos) verde depois de um ajuste na lista de tabelas de `db.test.ts`; `npm run build` rodou uma vez, verde, como RELATO (build oficial: roda na bateria pós-merge do Controle; ver "Fechamento da branch" abaixo). **Falta fora da Execução:** a chave do Resend na Vercel (Gabriel), aplicar a migration 053 (Controle, no commit) e as linhas de encaixe E1–E4. Filhos: Execução (esta), Auditoria (`local_d3bb3d71…`), Específico (`local_238a3f52…`, T1 entregue).
- **Decisões do T2 em uma linha cada:** gancho = `mutarEstado` grava fila `aurea.emails_pendentes` (migration 053) na mesma transação + `state.ts` agenda o envio (espelho do NFS-e); retirada fora do diff → função exportada + 2 linhas de encaixe; cron **não** precisa ser tocado (1 linha opcional); depósito = **sempre**; saque não é da central; Pix vem do diff e A só chama para senha/e-mail; validade de 24 h da fila; sem provedor = `simulado` e não retenta.
- **Registro vivo (valendo, confirmado pelo Controle):** `C:\Users\Gabriel\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_e259126b-4373-4132-9e89-79edb7fa94ec\registro-C.md` (o hook barra a pasta principal). O Controle lê dali.
- **Decisão do Controle sobre o saque:** NÃO duplicar e NÃO editar `src/server/saques/avisos.ts` nem as ações; os três e-mails de saque seguem como estão. A central cobre as demais movimentações do D7 (ver armadilha 1).
- **Id do chat de branch C:** `local_0cf44cb3-a685-483e-85c2-6645d2495df0`. Controle: `local_e259126b-4373-4132-9e89-79edb7fa94ec`.
- **Git:** `claude/manut-emails-de-movimentacao-c46333` sobre `9e21fe1`, **0 commits**; modificados: `src/lib/email/index.ts`, `src/lib/email/tipos.ts`, `src/server/db/estado.ts`, `src/server/state.ts`, `src/server/db/sql-injecao.baseline.json` (1 entrada), `src/server/db/db.test.ts` (1 tabela na lista esperada); novos: `src/server/emails/`, migration 053, estes MDs e a pesquisa do T1.
- **Próximo ato (um):** avisar o chat de branch ("FRENTE C PRONTA"), com o aviso de que **`RESEND_API_KEY` e `EMAIL_REMETENTE` não existem na Vercel** (roteiro pronto na seção 6 de `PESQUISA_CUSTO_EMAIL.md`).
- **Bloqueio humano:** a chave do Resend (só o Gabriel cria) — sem ela nenhum e-mail sai em produção (cai no modo registro local).
- Os pacotes de ficha e modelo ficam **fora do Git**; leia por caminho absoluto em `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\`.

## Aceite (da ficha, em uma frase: o cliente recebe um e-mail curto e claro a cada movimentação importante, e o Gabriel sabe quanto isso custa por mês)

- [x] **Custo (feito pelo Específico)** — `PESQUISA_CUSTO_EMAIL.md`: hoje **R$ 0,00** (≈ 130 e-mails/mês, pico de 37/dia; Resend gratuito cobre 3.000/mês e 100/dia); recomendação: ficar no Resend gratuito e subir para o Pro (US$ 20 ≈ R$ 115,70/mês) só quando o pico passar de 100/dia ou o mês de 3.000. Titan da HostGator só como reserva. Requisito original: preço de hoje (data + página de cada fonte) de Resend e de duas alternativas (ex.: Amazon SES, Brevo); volume mensal estimado do que o sistema já registra (negociações + depósitos + saques + faturas + envios por mês, leitura `BEGIN READ ONLY`); custo mensal em 3 cenários; recomendação em uma frase. Número sem fonte não entra.
- [x] **E-mails transacionais (D7) — código feito; saque já existia; retirada e segurança dependem das linhas E1–E4:** compra, venda, depósito confirmado, saque (pedido, pago, recusado), envio postado e recebido, moeda aceita ou recusada na análise, fatura paga, retirada postada e o evento de segurança da frente A (troca de senha, e-mail ou Pix). Respeita a preferência do cliente (`toggleNotif`) **só nos avisos opcionais**; compra, venda, saque e segurança saem sempre.
- [x] **Ponto central de disparo (`mutarEstado` grava a fila na mesma transação; `state.ts` agenda o envio depois da resposta; nenhuma Server Action editada):** o e-mail nasce **depois do commit** da mutação, a partir do mesmo diff do ledger/NFS-e (`derivar.ts`, `diff.ts`) ou de um módulo novo `src/server/emails/` chamado por um único ponto comum. **C não edita Server Action de outra frente.**
- [x] **Idempotência** (chave única na fila + reserva atômica + cabeçalho do Resend como segunda camada; falha vira registro) (reprocessar o mesmo evento não manda duas vezes — chave por evento) e **falha de e-mail nunca derruba a operação** (melhor esforço + registro do erro).
- [x] Texto (um por tipo, testado) em português, curto, marca **Real Olímpico** (masculino), sem token/NFT/cripto/ativo digital/investimento/rentabilidade; **nada sensível** (Pix e dados mascarados); link para a conta.
- [x] **VERIFICADO: a variável NÃO existe na Vercel** (`RESEND_API_KEY` e `EMAIL_REMETENTE` ausentes em todos os ambientes; sem registros do Resend no DNS) — **o Gabriel precisa criar; roteiro na seção 6 da pesquisa; a frente só é declarada pronta COM este aviso.** Sem `RESEND_API_KEY` o provedor cai no modo console de `src/lib/email/index.ts`. **Dizer ao Gabriel, por leitura, se a variável está na Vercel** (`docs/RESEND_O_QUE_EXECUTAR_MANUALMENTE.md`); se faltar, entregar o comando pronto e **não** declarar a frente pronta sem avisar.
- [x] Testes (111 em `src/server/emails/`): montagem de cada e-mail, idempotência, mascaramento, preferência do cliente.

## Ler (e só isto — E7, E11)

- `src/lib/email/README.md`, `index.ts`, `tipos.ts` — o provedor (Resend ou registro local), `enviarEmail`, `MensagemDeEmail { para, assunto, texto, html? }`, `ResultadoDeEnvio { ok, id?, erro?, simulado? }`.
- `src/server/saques/avisos.ts`, `src/server/mercado/aviso-de-reserva.ts`, `src/server/atendimento/avisos.ts` — os avisos que já existem (padrão: depois da transação, try/catch, nunca derruba).
- `src/server/db/derivar.ts`, `src/server/db/diff.ts`, `src/server/db/estado.ts` (só `mutarEstado`), `src/server/state.ts` — onde `antes`/`depois` do estado são comparados e onde `agendarEmissaoNfse()` já é chamado depois da mutação.
- `src/domain/ledger.ts` — mapa de eventos (`LedgerTipo`, `lancamentosDeTrade`, `lancamentoDeDeposito`, `lancamentoDeSaque`, `lancamentoDeFrete`…).
- `docs/RESEND_O_QUE_EXECUTAR_MANUALMENTE.md`, `docs/CONFIGURACAO_BRANCH_A_SUPABASE_GOOGLE_RESEND.md` (seção 5) — como ligar o Resend.
- `src/server/actions/account.ts` — **só** `toggleNotif` (e `src/domain/types.ts` linhas ~101-106 para o formato de `settings`).

## Touch

- `src/lib/email/**`
- `src/server/emails/**` (novo)
- **Um** ponto de gancho central (`src/server/state.ts` e/ou `src/server/db/estado.ts`/`derivar.ts`; se conflitar no merge, o Controle encaixa)
- Testes novos (`src/server/emails/*.test.ts`, `src/lib/email/*.test.ts`)
- Migration `053_*.sql` **só se** o desenho precisar (escrita na branch, **não aplicada** — o Controle aplica no commit)
- Arquivos de trabalho em `docs/diario/execucoes/` (este MD, log, continuidade, pesquisa)

## Do not touch

- Server Actions de qualquer frente (A, B, H e demais), incluindo `account.ts` além de **ler** `toggleNotif` — C não edita ação.
- Landing, `src/domain/**` (superfície protegida e domínio puro: nada de e-mail lá dentro).
- `docs/memorias/README.md`, `docs/INDICE_VEGA.md`, `ESTADO-GERAL-*`, `CLAUDE.md`, qualquer arquivo geral da raiz (B5) — a linha pronta vai ao `registro/C.md`.
- `.env.local` nunca vai a commit; `SUPABASE_PUBLISHABLE_KEY` nunca é removida.

## Fora de escopo

Newsletter e e-mail de marketing, WhatsApp, SMS, notificação push. Nada de alterar regra de negócio, taxa, cobrança ou fiscal (decisão do Gabriel).

## Decisões pendentes e padrões

- **D7** (lista de eventos): o padrão é a lista do aceite; mudar é editar **uma tabela** no módulo.
- **Mapa evento → preferência** (a Execução propõe no T2 e o Gabriel pode mudar numa linha): as chaves existentes são `notifEnvios` ("Atualizações de envios e custódia", padrão ligado), `notifNegociacoes` ("Negociações e ofertas", padrão ligado), `notifNovidades` (padrão desligado). Proposta de partida: **sempre** = compra, venda, saque (pedido/pago/recusado), segurança; **`notifEnvios`** = envio postado/recebido, moeda aceita/recusada, fatura paga, retirada postada; **`notifNegociacoes`** = depósito confirmado (se a Execução achar melhor, vira "sempre"; anotar a razão).

## Armadilhas já vistas na leitura (a Execução confirma no T2; a Auditoria vigia)

1. **Duplicidade com o aviso de saque que já existe — DECIDIDO pelo Controle (17/11 22:45).** `avisarClienteDoSaque` (em `src/server/saques/avisos.ts`) já manda pedido/pago/recusado, chamado por ações de outras frentes. **A central NÃO dispara saque**: o catálogo declara os três como "cobertos por `saques/avisos.ts`" (e um teste confere que a derivação de eventos **não** emite saque, para ninguém duplicar sem querer). **Não editar** `avisos.ts` nem as ações. Se a unificação (preferência, idempotência e máscara também no saque) valer a pena, a Execução escreve em `registro-C.md` a **linha de encaixe pronta** (qual chamada trocar por qual) e o Controle aplica no merge. Pontos a olhar nesses três já existentes, para a linha de encaixe: ele mostra o destino do Pix em claro só no e-mail da **equipe** (não do cliente) — o do cliente não traz chave; confirmar no T2 que nada sensível sai.
2. **Reserva pós-paga** (`aviso-de-reserva.ts`) é outro e-mail e **não está na lista D7**: continua como está. O e-mail de "compra" sai quando a negociação se completa (`Trade` criado), não quando a reserva é aberta.
3. **Troca de senha não passa pelo estado** (vai pelo Supabase Auth): não aparece em `antes`/`depois`. O aviso de segurança da A precisa de uma **função exportada** de `src/server/emails/` que a A chama em uma linha (contrato com a A; o Controle encaixa no merge). Troca de Pix/e-mail pode, se estiver no estado, ser detectada pelo diff — conferir.
4. **O `.env.local` local tem `POSTGRES_URL`** (aponta para o banco real). Teste e verificação do T4 **não** podem mutar o banco real: usar a suíte (estado de teste/memória/PGlite), sem Docker (memória `sem-docker-local`). Leitura de produção só com `BEGIN READ ONLY` (memória `leitura-de-producao-sem-set-de-sessao`).
5. **Dois armazenamentos:** com Postgres o gancho está em `mutarEstado`; sem ele (Redis/memória) o caminho é o `store.mutate` de `state.ts`. O gancho precisa funcionar nos dois, ou declarar por que um não precisa (T4 "sai no ambiente local em modo console").
6. **Dinheiro em centavos (`Cents`)**, formatado por `brl()` de `@/domain/money`; datas por `@/domain/dates`. Nenhum `float`.
7. **Link da conta:** `NEXT_PUBLIC_APP_URL` (padrão `http://localhost:3000`), como em `avisos.ts`. Em produção o site é `https://realolimpico.com.br`.

## Tópicos

### T1 — Custo de e-mail (Específico) + volume por leitura

Estado: **FEITO pelo Específico (`c-especifico` = `local_238a3f52-7880-47db-b4a1-ebc0d0b6a589`) em 17/11** — a Execução não fez este tópico, só o conferiu e registrou o resultado abaixo.
Aceite deste tópico: `PESQUISA_CUSTO_EMAIL.md` com a conclusão no topo; preço de hoje com data e página de cada fonte (Resend, Amazon SES, Brevo; outra só se melhor; **e, por pedido direto do Gabriel em 17/11, o Titan Email da HostGator, plano Essentials, que ele já tem** — o que o plano oferece para envio automático: SMTP, limites, política de uso, entregabilidade, qual domínio atende, riscos em função serverless; conclusão "serve / só volume pequeno / não". É ESTUDO: nenhum adaptador SMTP é implementado agora); volume mensal estimado a partir de leitura `BEGIN READ ONLY` (negociações, depósitos, saques, faturas pagas, envios, retiradas, **por mês**) e quantos e-mails isso gera por cliente e no total; 3 cenários (volume de hoje, 10×, 100×) com custo mensal em R$ e US$ (cotação com data); recomendação em uma frase; **se `RESEND_API_KEY` e `EMAIL_REMETENTE` estão na Vercel** (leitura pelo Vercel MCP ou `vercel env ls`, sem imprimir valor) e se o domínio de envio está verificado.
Arquivos deste tópico: `docs/diario/execucoes/pesquisa/C-custo-de-email.md` (Específico) — a cópia final `PESQUISA_CUSTO_EMAIL.md` vai para `docs/diario/execucoes/`. Também confirmar (data + página) se o Resend aceita cabeçalho `Idempotency-Key` e por quanto tempo vale — alimenta o T2.
Log:
- 17/11 — Execução pediu ao Específico: preços (Resend, SES, Brevo) com data/página, volume por leitura `BEGIN READ ONLY` (negociações, depósitos, faturas pagas, envios, análises, retiradas, por mês), 3 cenários, recomendação, `RESEND_API_KEY`/`EMAIL_REMETENTE` na Vercel e domínio verificado, e `Idempotency-Key` do Resend (validade). Volume por tipo alimenta o texto "quantos e-mails por mês cada tipo gera".
- 17/11 — **Entregue pelo Específico** em `docs/diario/execucoes/PESQUISA_CUSTO_EMAIL.md` (cópia de trabalho em `pesquisa/C-custo-de-email.md`). Conclusões: custo hoje R$ 0,00 (≈ 130 e-mails/mês, pico 37/dia; Resend grátis = 3.000/mês e 100/dia); ficar no Resend e subir para o Pro (US$ 20) só acima de 100/dia ou 3.000/mês; **`RESEND_API_KEY` e `EMAIL_REMETENTE` não existem na Vercel** e o DNS não mostra o Resend; `Idempotency-Key` aceito pelo Resend, **validade de 24 h** (por isso a garantia real é a chave única da fila); plano Hobby da Vercel guarda logs por 1 h (por isso o erro de envio vai para a coluna `ultimo_erro` da fila). Em novembro os 25 envios "recebidos" são todos cadastro sem envio — o desenho já filtra (`cadastro_sem_envio` não gera "recebemos o seu envio").
- Ressalva para o volume: a pesquisa contou **1 e-mail por envio analisado**; o código manda **1 por moeda fechada na bancada** (a bancada fecha uma moeda por vez). Pode passar um pouco da estimativa (envio com várias moedas), mas o limite do Resend grátis (100/dia) segue longe; se o Gabriel quiser 1 por envio, é decisão de produto (uma linha no catálogo + agrupamento).
Próximo ato deste tópico: nenhum (fechado; item 1 do aceite marcado).

### T2 — Desenho do ponto central e do catálogo de eventos

Estado: **FECHADO em 17/11/2026** (Execução confirmou o rascunho do chat de branch contra o código; abaixo está o desenho final, com as correções marcadas "corrigido")
Aceite deste tópico: bloco **"Desenho"** neste MD com gancho, catálogo, idempotência, máscara/texto e desfecho do saque e da segurança. Sem código ainda — **cumprido**.
Arquivos deste tópico: este MD.
Log:
- 17/11 — Execução leu `db/estado.ts`, `state.ts`, `db/diff.ts`, `nfse/agendar.ts`, `saques/avisos.ts`, `lib/email/*`, `shipping/rastreios.ts`, `actions/admin/logistica.ts` (só `marcarRetiradaPostadaManual`), `domain/types.ts` e `db/repositories/state.ts`. Rascunho confirmado no essencial; cinco correções e quatro perguntas fechadas (ver "Correções" e "Perguntas fechadas").
- Pedido do T1 enviado ao Específico (`local_238a3f52…`) — mensagem em fila.
Próximo ato deste tópico: nenhum (fechado). Próximo tópico: T3.

#### DESENHO (fechado)

**1. Onde o gancho nasce — e por quê.** `mutarEstado` (`src/server/db/estado.ts:74`) já tem na mão, dentro da transação, `antes` (travado) e `state` (depois), e já grava ledger e pedidos de NFS-e a partir deles. O e-mail copia o desenho da NFS-e, que é a prova de que ele funciona em produção: **derivar na transação → gravar na fila → enviar depois da resposta → o que falhar, a fila reenvia**. Dois toques, juntos formam "um gancho":
- `estado.ts`, dentro do `if (!semeadura)` do bloco `ops.length > 0`, logo depois do NFS-e: `emailsPedidos = await enfileirarEmails(tx, eventosDeEmail(antes, state, agora), agora)`; `mutarEstado` passa a devolver também `emailsPedidos` (campo novo; os chamadores atuais ignoram campo a mais).
- `state.ts`, na linha ao lado de `if (r.nfsePedidas > 0) agendarEmissaoNfse()`: `if (r.emailsPedidos > 0) agendarEnvioDeEmails()`.
Por que aqui e não em cada Server Action: são dezenas de ações (de várias frentes) e o webhook/cron que mutam estado; só `mutarEstado` as vê todas, e é a única que já tem o antes e o depois lado a lado. **Superfície protegida: nenhuma** (`state.ts` e `estado.ts` não estão na lista de `CLAUDE.md`; anotado na ficha como "gancho central").
- **Corrigido (rascunho dizia "`mutarEstado` devolve a lista de eventos"):** devolve só a **contagem**, como `nfsePedidas`. A lista fica na fila, e quem despacha a lê do banco — assim o envio sobrevive a reinício do servidor e é reenviado.
- **Sem Postgres** (Redis/memória — só desenvolvimento): o ramo `store.mutate` de `state.ts` não tem transação nem fila. Lá o mutator guarda `antes = structuredClone(state)` antes de `fn`, deriva os eventos depois dela e, quando `store.mutate` volta, envia **direto** (`despacharAgora`), com a chave guardada num `Set` em memória do processo. É o que faz "sai em modo console" valer no ambiente local (T4). Declarado: sem fila durável, mas esse ramo só existe fora de produção (produção tem `POSTGRES_URL`).

**2. A derivação (função pura, sem I/O).** `eventosDeEmail(antes, depois, agora): EventoDeEmail[]` em `src/server/emails/eventos.ts`. **Corrigido:** ela lê `antes`/`depois` direto, **não** a lista `ops` (o rascunho previa `ops`): `ops` só serve de porteiro (`ops.length > 0 && !semeadura`, já é o `if` do NFS-e). Um `EventoDeEmail` é `{ chave, tipo, para, sempre, dados }`: `dados` é um objeto pequeno de **fatos já prontos** (valores em centavos, nomes, códigos, datas, e-mail e Pix **já mascarados**) — o texto é montado depois a partir deles, e nada sensível entra na fila.

**3. O catálogo (D7) — uma tabela em `src/server/emails/catalogo.ts`; mudar um evento é mudar uma linha.**

| Tipo | Como detectar | Para | Preferência | Chave de idempotência | Fatos do texto |
|---|---|---|---|---|---|
| `compra` | `depois.trades` além de `antes.trades.length`; **agrupa por comprador** dentro da mesma mutação | `trade.buyer` | **sempre** | `compra:<comprador>:<índice do 1º trade do grupo>` | qtd, tipo da moeda, valor das moedas, comissão (`feeComprador`), custódia do 1º mês (fatura `origem:'compra'` da mesma mutação), total pago |
| `venda` | idem, **agrupa por vendedor** | `trade.seller` | **sempre** | `venda:<vendedor>:<índice do 1º trade do grupo>` | qtd, tipo, valor, comissão (`feeVendedor`), líquido recebido |
| `deposito` | `depois.deposits` além de `antes.deposits.length`, só `origem === 'deposito'` | `deposit.userEmail` | **sempre** (ver "Perguntas fechadas") | `deposito:<índice>` | valor, método (Pix/cartão), data |
| `envio_postado` | `envio.etapaAtual` de `Protocolo gerado` → `Envio postado` (no `depois`, comparando com o mesmo protocolo em `antes`) | `envio.userEmail` | `notifEnvios` | `envio-postado:<protocolo>` | protocolo, qtd, código de rastreio, link `/envios` |
| `envio_recebido` | `etapaAtual` passa a `Recebido pela custódia` vindo de etapa anterior | `envio.userEmail` | `notifEnvios` | `envio-recebido:<protocolo>` | protocolo, qtd, "entra na fila de análise" |
| `moeda_aceita` | `depois.analises` novas com `veredito:'aprovada'`; agrupa por `protocoloEnvio` na mesma mutação | dono do envio (`Envio.userEmail`; se não há `Envio`, o dono da moeda `codigoMoeda`) | `notifEnvios` | `analise:<protocolo da 1ª análise do grupo>` | qtd, códigos das moedas, tipo, "1º mês já pago" quando há fatura de entrada paga na mesma mutação, link `/recibos` |
| `moeda_recusada` | idem, `veredito:'recusada'` | idem | `notifEnvios` | `analise:<protocolo da 1ª análise do grupo>` | qtd, tipo, **motivo da recusa** (`motivoRecusa`), link `/envios` |
| `fatura_paga` | `faturasCustodia` com `status:'paga'` agora e não antes, **exceto** fatura que nasce já paga com `origem:'compra'` (já dita no e-mail da compra) ou `origem:'entrada_no_acervo'` (já dita no da moeda aceita) | `fatura.userEmail` | `notifEnvios` | `fatura-paga:<id da fatura>` | valor, qtd de moedas, competência, forma de pagamento, link `/conta/faturas` |
| `retirada_postada` | **fora do diff** (ver "Correções" 2) — função exportada | `retirada.userEmail` | `notifEnvios` | `retirada-postada:<id>` | id, moeda, rastreio, link `/retirada` |
| `seguranca_senha`, `seguranca_email` | **fora do diff** (Supabase Auth) — função exportada, chamada pela frente A | o próprio cliente (no troca de e-mail: o endereço **antigo**) | **sempre** | `seguranca-<tipo>:<para>:<instante>` | quando, "se não foi você…" |
| `seguranca_pix` | `cadastro.dadosBancarios.chavePix` de um valor para **outro valor** (primeira gravação não conta) | o próprio cliente | **sempre** | `seguranca-pix:<e-mail>:<agora>` | quando, chave **mascarada** (`terminada em 1234`) |
| `saque_pedido`, `saque_pago`, `saque_recusado` | **nenhum** — coberto por `src/server/saques/avisos.ts` | — | sempre (lá) | — | — |

A regra "sempre" é uma coluna da tabela (`sempre: true`); a regra da preferência é uma função `deveEnviar(tipo, settings)` que lê `settings.notifEnvios`/`notifNegociacoes` (ausente = padrão ligado, como `selectors.ts:86`). **A preferência é decidida na derivação** (puro, testável): evento que o cliente desligou **nem entra na fila**; quem ligar depois não recebe retroativo.

**4. Idempotência e fila — migration 053 (só escrita, NÃO aplicada).** Tabela `aurea.emails_pendentes`: `id bigserial PK`, `chave text NOT NULL UNIQUE`, `tipo`, `para`, `dados jsonb`, `criado_em`, `enviado_em NULL`, `simulado boolean`, `tentativas int`, `ultimo_erro text`, `reservado_ate bigint NULL`. Três camadas:
1. **Chave única** — `INSERT … ON CONFLICT (chave) DO NOTHING`, **na mesma transação** da mutação: reprocessar o mesmo evento não cria segunda linha; se a mutação desfaz, o e-mail some junto (nada de aviso de coisa que não aconteceu).
2. **Reserva atômica no despacho** — `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) SET reservado_ate = agora+2 min, tentativas = tentativas+1 RETURNING` (o mesmo `reivindicar` da fila de NFS-e): o `after()` de uma mutação e outro disparo nunca pegam a mesma linha. Depois do provedor, marca `enviado_em` (ou grava `ultimo_erro` e deixa a linha voltar). Desiste depois de **5 tentativas**.
3. **`Idempotency-Key` do Resend**, valendo a `chave`, para a janela "enviou e o servidor caiu antes de marcar". Entra como campo opcional `idempotencyKey` em `MensagemDeEmail` (`src/lib/email/**`, está no Touch). **A confirmar pelo Específico** (T1, item 6) por quanto tempo a chave vale; **não é a garantia** — a garantia são as camadas 1 e 2.
Duas regras que o rascunho não tinha: (a) **validade de 24 h** — linha pendente há mais de 24 h é marcada `ultimo_erro='expirado'` e nunca enviada (e-mail de uma compra de anteontem, entregue hoje, só confunde; e evita a enxurrada quando a chave do Resend finalmente entrar na Vercel); (b) **sem provedor configurado** (`simulado: true`), a linha é marcada enviada **com `simulado = true`** e não é retentada — o texto foi para o log do servidor, que é o comportamento de hoje (`lib/email/index.ts:75`).

**5. Despacho.** `src/server/emails/despachar.ts`: `despacharPendentes(executar, enviar = enviarEmail)` — recebe o executor e o envio **por parâmetro** (mesmo desenho de `mutarEstado`), o que deixa a suíte rodar no PGlite e com um provedor falso. `agendar.ts`: `agendarEnvioDeEmails()` espelha `agendarEmissaoNfse()` (`after()`, no-op em `NODE_ENV==='test'`). Falha de e-mail **nunca** derruba a operação: o despacho roda depois da resposta, dentro de `try/catch`, e erro vira `ultimo_erro` na linha + `console.error`.

**6. Texto, marca e máscara.** `modelos.ts`: uma função pura por tipo, `(dados) => { assunto, texto }` (sem `html` no começo: texto puro vale em todo cliente; o provedor já aceita `html` se um dia o Gabriel quiser). Assinatura "Real Olímpico" (masculino), tratamento pelo primeiro nome como em `saques/avisos.ts`, valores por `brl()` (`@/domain/money`), datas por `@/domain/dates`, link por `NEXT_PUBLIC_APP_URL` (padrão `http://localhost:3000`) + a rota certa (`/conta`, `/conta/faturas`, `/envios`, `/recibos`, `/retirada` — todas existem). `mascara.ts`: `mascararEmail` (`m***@dominio.com`) e `mascararChavePix` (`terminada em 1234`; chave que é e-mail usa `mascararEmail`). Uma varredura de vocabulário proibido (token, NFT, cripto, ativo digital, investimento, rentabilidade) roda sobre **todos os textos montados**, no T5.

**7. Saque — desfecho da armadilha 1.** Os três e-mails de saque seguem **só** em `saques/avisos.ts`. A central **não** os dispara: o catálogo os lista como `coberto por saques/avisos.ts` e um teste confere que `eventosDeEmail` não emite nada para `saque.inserir`/`saque.atualizar`. Lido o arquivo: o e-mail **do cliente** não traz a chave Pix (diz "sua chave Pix cadastrada"); só o da **equipe** mostra o destino em claro, e isso é de propósito (quem paga precisa ler). **Linha de encaixe do saque: nenhuma** — unificar (preferência/idempotência/máscara) não muda o aceite e o saque já sai sempre.

**8. Contrato com a frente A (segurança).** Exportado de `@/server/emails`:
`avisarSeguranca({ tipo: 'senha' | 'email', para: string, quando?: number, complemento?: string }): Promise<void>` — nunca lança, grava na fila e agenda o envio. A chama **em uma linha, depois de a troca dar certo**. **Pix não precisa de chamada da A:** a troca vem do diff do estado (`cadastro.dadosBancarios.chavePix`), e a A **não deve** chamar para Pix (senão sairia dois e-mails). Para a troca de e-mail, `para` é o endereço **antigo**.

#### CORREÇÕES AO RASCUNHO (o que o código desmentiu)

1. **"`mutarEstado` devolve a lista"** → devolve só a contagem; a lista vive na fila (item 1).
2. **Retirada: o diff NÃO a enxerga — confirmado.** `carregarEstado` não carrega retiradas (a tabela `aurea.retiradas` tem repositório próprio, `shipping/retiradas.ts`), e `state.retiradas` só existe dentro da mutação que a empurra (por isso `rastreios.ts:140` faz `lista.findIndex… idx < 0 → return`). As duas únicas passagens para `postada` são `rastreios.ts` (`avancarRetirada`, job diário) e `actions/admin/logistica.ts:367` (`marcarRetiradaPostadaManual`), e **nenhuma** das duas muda a retirada pelo diff: a primeira só chama `mutateState` para espelhar em `state.retiradas` quando a retirada "mora no estado" (`idsNoEstado`), o que nunca acontece com o estado carregado do banco; a segunda grava só no repositório. Solução: função exportada `avisarRetiradaPostada(retirada)` em `src/server/emails/` (grava a linha de fila numa transação curta com a mesma chave `retirada-postada:<id>` e agenda o envio) + **duas linhas de encaixe** (seção "Linhas de encaixe" abaixo). Sem os encaixes, só o e-mail de retirada postada deixa de sair; os outros nove independem.
3. **Envio postado/recebido: o diff VÊ — confirmado.** Os dois avanços do rastreio diário passam por `mutateState` (`rastreios.ts:249` e `:278`) e a bancada também; o rascunho tinha a dúvida "(rastreio diário fora do diff)" — não procede para o envio. O guarda `origem !== 'cadastro_sem_envio'` evita e-mail de "envio postado" de moeda cadastrada pela equipe (não há postagem).
4. **Trade e Deposit sem `id` — confirmado**; chave por posição (`antes.trades.length + i`), estável porque as listas são append-only (`caudaNova` falha se encolherem). Acrescentado: **agrupar por comprador/vendedor na mesma mutação** — o casamento é "uma unidade por volta", então uma compra de 5 moedas são 5 `Trade`, e 5 e-mails seriam ruído.
5. **Fatura paga: três origens, dois silêncios.** `FaturaCustodia.origem` existe (`types.ts:834`). Fatura que nasce já paga com `origem:'compra'` ou `'entrada_no_acervo'` (custódia recebida fora) **não** gera e-mail próprio — já está dita no e-mail da compra e no da moeda aceita. Todas as outras (ciclo, contratação, entrada paga depois pelo cliente) geram.

#### PERGUNTAS FECHADAS

- **Retirada fora do diff** → fechado: função exportada + 2 linhas de encaixe (acima).
- **Cron** → **não exige tocar o cron.** O despacho processa **toda a fila pendente** a cada disparo, então a próxima mutação reenvia o que falhou, e a validade de 24 h limita o estrago. Uma linha no cron (`await despacharEmailsPendentes()` em `/api/cron/faturamento`) é **reforço recomendado, não bloqueante** — entra em "Linhas de encaixe" como opcional.
- **Preferência do depósito** → **sempre.** Razão: é dinheiro entrando na conta; quem pagou um Pix e não vê aviso tem a dúvida pior do produto, e nenhuma das duas chaves do cliente descreve isso ("Atualizações de envios e custódia"; "Negociações e ofertas"). Para mudar: `sempre: false` + `preferencia: 'notifNegociacoes'` na linha `deposito` do catálogo. Anotado para o Gabriel poder reverter numa linha (decisão de comunicação com o cliente, sem efeito em dinheiro).
- **Envio postado pelo rastreio diário** → o diff vê (item 3 das correções).
- **Análise por moeda gera um e-mail por mutação**, não um por pacote: a bancada fecha uma moeda por vez, então um envio de 5 moedas pode gerar até 5 e-mails ao longo do dia. É o que o aceite pede ("moeda aceita ou recusada"); se o Gabriel achar demais, a saída é uma linha no catálogo (agrupar por dia ou só mandar quando o envio chega a `Recibo emitido`) — **registrado como decisão possível, não tomada**.

### T3 — Módulo `src/server/emails/` + modelos + idempotência

Estado: **FEITO — código e testes verdes (17/11, 22:41)**
Aceite deste tópico: testes verdes do módulo — **uma função pura por e-mail** (entra o fato, sai `{ assunto, texto, html? }`), a função que decide **quem recebe e se a preferência deixa** (`deveEnviar(evento, usuario)`), `mascararPix`/`mascararEmail`, a derivação de eventos a partir de `antes`/`depois`, a chave de idempotência, e o despachante com melhor esforço (falha vira registro, nunca exceção). Migration `053` escrita, **não aplicada**.
Arquivos deste tópico: `src/server/emails/**`, `src/lib/email/**` (se o provedor precisar de `Idempotency-Key`/`html`), `supabase`/`scripts` da migration conforme o padrão de `scripts/db-migrate.mjs`.
Log:
- 17/11 — Escritos em `src/server/emails/`: `tipos.ts` (12 tipos de e-mail + fatos), `catalogo.ts` (a tabela D7 + `deveEnviar`), `mascara.ts`, `eventos.ts` (derivação pura), `modelos.ts` (um texto por tipo), `fila.ts` (SQL da fila), `despachar.ts` (despacho com provedor e executor injetados + ramo sem banco), `gancho.ts`, `agendar.ts`, `despacho.ts`, `avisos.ts` (`avisarSeguranca`, `avisarRetiradaPostada`), `index.ts`. Migration `src/server/db/migrations/053_emails_pendentes.sql` (NÃO aplicada). `idempotencyKey` opcional em `src/lib/email/tipos.ts` e cabeçalho `Idempotency-Key` em `src/lib/email/index.ts`.
- **Ajustes do desenho na hora de codar (a tabela do T2 ficou assim):** (1) a fila usa uma coluna `status` ('pendente' | 'enviado' | 'simulado' | 'expirado' | 'desistido') em vez do booleano `simulado` + `ultimo_erro='expirado'` do rascunho; (2) novo `gancho.ts`: a derivação roda em `try/catch` e a gravação na fila roda num **SAVEPOINT** — se a migration 053 ainda não estiver aplicada, a mutação (negociação, ledger, NFS-e) commita do mesmo jeito e só o aviso é pulado; (3) o despacho espera 5 min depois de uma falha e desiste na 5ª tentativa.
- **Fronteira do provedor limpa (pedido do Gabriel, 17/11, Titan Email):** `src/server/emails/` só fala com `enviarEmail` (de `@/lib/email`) e com os tipos `MensagemDeEmail`/`ResultadoDeEnvio`; nenhuma referência ao Resend dentro do módulo (conferido por busca). Trocar de provedor depois não toca nos modelos nem na fila. **Adaptador SMTP (Titan) = ~70 linhas num arquivo novo `src/lib/email/smtp.ts` + ~6 linhas em `provedorDeEmail()` para escolher por variável de ambiente; depende de biblioteca SMTP — `nodemailer` NÃO está no `package.json` (conferido), então seria dependência nova — só se o Gabriel escolher.** A fila `emails_pendentes` e a idempotência por chave própria valem para qualquer provedor (SMTP não tem `Idempotency-Key`; o cabeçalho só é mandado ao Resend). Não implementado, por ser estudo; o veredito do Específico é "Titan só como reserva de volume pequeno" (seção 2-A da pesquisa), e usá-lo exigiria mexer no SPF de `aureacustodia.com.br` — decisão do Gabriel.
- Desvio anotado: `src/server/db/sql-injecao.baseline.json` ganhou UMA entrada (`src/server/emails/fila.ts` → `S`, o nome do schema validado por `nomeDoSchema`) — o guarda de SQL reprovava a suíte sem ela. Encaixe E5, já aplicado nesta worktree.
Próximo ato deste tópico: nenhum (fechado).

### T4 — Ligação no ponto central (um gancho)

Estado: **FEITO (17/11, 22:41)**
Aceite deste tópico: um gancho único em `state.ts`/`estado.ts`; e-mail sai no ambiente local em **modo console** quando uma mutação de teste acontece (prova por teste que roda a mutação e lê o registro local); nenhuma Server Action editada; se o gancho conflitar no merge, anotar no registro para o Controle.
Arquivos deste tópico: o gancho (1–2 linhas) + o teste de integração.
Log:
- 17/11 — `src/server/db/estado.ts`: `import { pedirEmailsDaMutacao }`, `mutarEstado` devolve `emailsPedidos` (campo novo) e chama `pedirEmailsDaMutacao(tx, antes, state, agora)` dentro do `if (!semeadura)`, logo depois do NFS-e. `src/server/state.ts`: `if (r.emailsPedidos > 0) agendarEnvioDeEmails()` ao lado do NFS-e; no ramo sem banco, o mutator guarda `antes = structuredClone(state)`, deriva os eventos depois de `fn` e, quando `store.mutate` volta, `await enviarSemFila(emails)` (modo console no ambiente local). **Nenhuma Server Action editada.** Superfície protegida: nada (`state.ts`/`estado.ts` não estão na lista de CLAUDE.md; anotado aqui como a ficha pede).
- Prova por teste (`fila-no-banco.test.ts`, PGlite): mutação com negociação enfileira compra + venda na mesma transação; mutação que lança não deixa linha; mutação sem relevância não pede e-mail; semeadura não pede; o despacho entrega a cada provedor falso e marca enviada; no ramo sem banco, `despacharAgora` entrega e lembra a chave. **Não rodei `npm run dev` com o banco real** (o `.env.local` tem a POSTGRES_URL de produção): a prova do "modo console" é por teste, e o ramo sem banco só existe fora de produção.
Próximo ato deste tópico: nenhum (fechado).

### T5 — Preferência do cliente + mascaramento + suíte

Estado: **FEITO (17/11, 22:41) — falta só o fechamento da branch (typecheck, lint, build)**
Aceite deste tópico: testes cobrindo (a) cada e-mail montado, (b) idempotência (mesmo evento duas vezes = um envio), (c) mascaramento (Pix e e-mail nunca saem inteiros), (d) preferência (`notifEnvios`/`notifNegociacoes` desligadas = não envia os opcionais; compra/venda/saque/segurança saem sempre), (e) falha do provedor não derruba a mutação. Varredura de vocabulário proibido nos textos novos. `npm run typecheck`, `npm test` (os testes de `emails`/`email` e a suíte vizinha) e `npm run build` **só ao fim da branch**.
Arquivos deste tópico: `src/server/emails/*.test.ts`, `src/lib/email/*.test.ts`.
Log:
- 17/11 — 5 arquivos de teste em `src/server/emails/`, **111 testes verdes** (`npx vitest run src/server/emails --no-file-parallelism`): `mascara.test.ts` (Pix e e-mail nunca inteiros), `catalogo.test.ts` (a tabela D7; sempre × opcional; cada opcional por UMA chave; saque coberto por outro módulo), `eventos.test.ts` (derivação: compra/venda agrupadas, depósito, envio postado/recebido, análise, fatura paga com os dois silêncios, Pix, saque NÃO gera evento, destinatário ausente), `modelos.test.ts` (12 textos × saudação/assinatura/link, **vocabulário proibido**, curto, fuso de Brasília, sem token em link, sem Pix inteiro), `fila-no-banco.test.ts` (17 testes no PGlite: transação, idempotência, falha do provedor, exceção, dados malformados, simulado, expiração de 24 h, corrida de dois despachos, Pix mascarado no banco, falta da migration 053).
- Os testes de banco precisam de **memória**: rodando em paralelo com outros arquivos na máquina cheia de sessões, um worker do Vitest morreu ("Worker exited unexpectedly"); sem paralelismo entre arquivos passa. Anotado para a suíte inteira do fim da branch.
Próximo ato deste tópico: typecheck, lint e build ao fim da branch; depois "FRENTE C PRONTA" ao chat de branch.

## Linhas de encaixe (arquivos de OUTRA frente — a Execução NÃO edita; o chat de branch leva ao registro e o Controle aplica no merge)

Todas são opcionais para a **compilação** (cada uma só liga um e-mail ou reforça o reenvio) mas as marcadas **necessária** são o que faz o e-mail correspondente existir em produção.

| # | Arquivo | Onde | Linha pronta | Efeito | Status |
|---|---|---|---|---|---|
| E1 | `src/server/shipping/rastreios.ts` | em `atualizarRastreiosPendentes`, no laço das retiradas, logo depois de `if (feito.postada) resumo.retiradasPostadas += 1` (~linha 308) | `if (feito.postada) await avisarRetiradaPostada(ret.id)` — com `import { avisarRetiradaPostada } from '@/server/emails'` | e-mail "retirada postada" quando o job diário avança `separacao → postada` | **necessária** (retirada postada pelo job) |
| E2 | `src/server/actions/admin/logistica.ts` | em `marcarRetiradaPostadaManual`, logo depois de `await gravarRetirada(atualizada)` (~linha 372) | `await avisarRetiradaPostada(atualizada.id)` — com o mesmo import | e-mail "retirada postada" quando a equipe marca a postagem à mão no painel | **necessária** (retirada postada à mão) |
| E3 | `src/app/api/cron/faturamento/route.ts` | no fim da rodada (depois do que já roda, dentro de `try/catch`) | `await despacharEmailsPendentes()` — com `import { despacharEmailsPendentes } from '@/server/emails'` | reenvia e-mail que falhou e não teve mutação depois | opcional (recomendada) |
| E4 | frente A (ação de troca de senha e a de troca de e-mail, depois de sucesso) | uma linha em cada | `await avisarSeguranca({ tipo: 'senha', para: email })` e `await avisarSeguranca({ tipo: 'email', para: emailAntigo })` — com `import { avisarSeguranca } from '@/server/emails'`; **Pix não precisa de chamada** (vem do diff) | e-mail de segurança | **necessária** (contrato com a A) |
| E5 | `src/server/db/sql-injecao.baseline.json` | uma entrada `"src/server/emails/fila.ts": ["S"]` (ordem alfabética) | a mesma regra do teste: interpolação do nome do schema revisada | a suíte não reprova a fila nova | **JÁ APLICADA nesta worktree** (único diff do arquivo: essa entrada); no merge, se outra frente também adicionou entradas, é só conferir a ordem alfabética |
| E6 | `src/server/db/db.test.ts` | lista de tabelas esperadas, entre `'documentos_legais',` e `'envios',` | `'emails_pendentes',` (com o comentário da migration 053) | a suíte do banco conhece a tabela nova | **JÁ APLICADA nesta worktree** (aprovada pelo Controle); no merge, conflito de lista com migrations 054–058 se resolve mantendo todas as linhas em ordem alfabética |

Os nomes `avisarRetiradaPostada`, `avisarSeguranca` e `despacharEmailsPendentes` são o **contrato exportado** de `@/server/emails` (T3 os implementa com esses nomes e assinaturas; se mudarem, atualizar esta tabela).

## Fechamento da branch (17/11/2026)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` (typecheck) | **verde** (saída 0) |
| ESLint em `src/server/emails`, `db/estado.ts`, `state.ts`, `src/lib/email` | **limpo** |
| `npx vitest run src/server/emails --no-file-parallelism` | **111/111 verdes** |
| Suíte vizinha (`src/server/db, actions, saques, mercado, estacao, shipping, emails`, `src/lib`; 53 arquivos, 677 testes) | 1 falha, **corrigida**: `db.test.ts` lista as tabelas do schema e a `emails_pendentes` (migration 053) entrou nela — uma linha na lista; arquivo relido: 32 verdes, 1 pulado |
| `sql-injecao.test.ts` | verde depois da entrada única no baseline (E5) |
| `npm run build` | **RELATO, não repetir:** rodou **uma vez**, saída 0, com `POSTGRES_URL`/`DATABASE_URL` esvaziadas no comando para nada tocar o banco real — **sem liberação formal do Controle** (as ordens de memória chegaram a esta sessão depois). **Build oficial: roda na bateria pós-merge do Controle (Onda 2).** Nada mais de build nesta branch |
| Suíte inteira (`npm test`) | **não rodada** (a máquina cheia de sessões derrubou um worker em paralelo; só a vizinha, sem paralelismo entre arquivos). Roda na bateria pós-merge do Controle, com `--no-file-parallelism` se a memória apertar |

Typecheck, lint, os 111 testes e a suíte vizinha também foram rodados **sem liberação formal do Controle**; ficam registrados como **RELATO** e **não serão repetidos**. Daqui em diante, nesta branch: só vitest de UM arquivo por vez com `--maxWorkers=1` e eslint só dos arquivos da C; nenhum build, `npm run dev`, preview, container ou servidor local (regra permanente do Gabriel). Nunca subi servidor, Docker nem navegador: os testes de banco rodam em PGlite dentro do processo do Vitest. Conferido às 22:5x: nenhum processo `node` desta worktree ficou de pé.

### Arquivos (lista exata, 0 commits, base `9e21fe1`)

**Modificados (6):** `src/lib/email/index.ts`, `src/lib/email/tipos.ts`, `src/server/db/estado.ts`, `src/server/state.ts`, `src/server/db/sql-injecao.baseline.json`, `src/server/db/db.test.ts`.
**Novos:** `src/server/emails/` (`tipos.ts`, `catalogo.ts`, `mascara.ts`, `eventos.ts`, `modelos.ts`, `fila.ts`, `despachar.ts`, `gancho.ts`, `agendar.ts`, `despacho.ts`, `avisos.ts`, `index.ts` e 5 testes: `mascara`, `catalogo`, `eventos`, `modelos`, `fila-no-banco`), `src/server/db/migrations/053_emails_pendentes.sql`, e os MDs `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--{MD_EXECUCAO,LOG_DE_EXECUCAO,CONTINUIDADE}.md`, `PESQUISA_CUSTO_EMAIL.md` e `pesquisa/`.

**Touch adicional (aprovado pelo Controle, uma linha cada):**
- `src/server/db/sql-injecao.baseline.json` — `+ "src/server/emails/fila.ts": ["S"]` (interpolação do nome do schema validado por `nomeDoSchema`; entrada em ordem alfabética).
- `src/server/db/db.test.ts` — na lista de tabelas esperadas, entre `'documentos_legais',` e `'envios',`: um comentário `// Migration 053 — a fila de e-mails de movimentação (...)` e `'emails_pendentes',`. **Conflito de merge:** outras frentes com migrations 054–058 que acrescentem tabela mexem nessa mesma lista; a resolução é manter as linhas de todas, em ordem alfabética (é só inserção, sem apagar nada).

**Superfície protegida tocada:** nenhuma das listadas no `CLAUDE.md` (`constants.ts`, `fees.ts`, `market.ts`, `types.ts`, contrato de `store/types.ts`, Server Actions). Tocados `src/server/db/estado.ts` (`mutarEstado`: chama `pedirEmailsDaMutacao` dentro de `if (!semeadura)` e devolve `emailsPedidos`) e `src/server/state.ts` (`mutateState`: agenda o envio depois do commit e, sem banco, envia direto) — são o gancho único e vão à lista de encaixe do Controle. **Migration 053: escrita, NÃO aplicada.**

**Linha para os índices** (`docs/memorias/`, `INDICE_VEGA`, `ESTADO-GERAL` — a Execução não os edita; o Controle aplica): *"Frente C — e-mails de movimentação (17/11/2026): `src/server/emails/` (catálogo de 12 e-mails, derivação a partir do diff de `mutarEstado`, fila `aurea.emails_pendentes` — migration 053 —, idempotência por chave única, `avisarSeguranca` e `avisarRetiradaPostada` exportados); custo R$ 0 hoje, Resend gratuito; **falta `RESEND_API_KEY`/`EMAIL_REMETENTE` na Vercel**; relatório em `docs/diario/execucoes/PESQUISA_CUSTO_EMAIL.md`."*

Limitações conhecidas (não são bugs a consertar sem combinar):
- **Idempotência do Resend vale 24 h**; a garantia contra duplicidade é a chave única da fila. Se o texto de um e-mail for remontado diferente dentro das 24 h (deploy que muda o modelo no meio de uma retentativa), o Resend responde 409; o código trata como falha comum (até 5 tentativas, depois `desistido` com o erro registrado em `ultimo_erro`) — nunca manda duplicado.
- **Migration 053 não aplicada** (regra: o Controle aplica no commit). Enquanto não for, o gancho tem SAVEPOINT: a mutação (compra, venda, ledger, NFS-e) commita normalmente e só o aviso é pulado.
- **Sem chave do Resend** o provedor escreve no log e a fila marca `simulado` (não retenta, para não disparar tudo quando a chave chegar).
- Análise da bancada: **1 e-mail por moeda fechada** (a pesquisa de custo contou 1 por envio) — decisão de produto possível, não tomada.

**Alerta de memória do Controle (17/11):** RAM quase esgotada, 15 sessões ativas. Desde que a ordem chegou a esta sessão, só leitura e edição de MD; nada mais é rodado (ver a regra acima). Se algo cair com erro 1455, registrar aqui e esperar, sem reabrir em laço.

## Sessões

### Sessão 2026-11-17 (Execução)

Tipo: execução
Feito: T2 fechado (desenho final, 5 correções, 4 perguntas fechadas); T3 (módulo `src/server/emails/`, migration 053, `idempotencyKey` no `src/lib/email/`), T4 (gancho em `estado.ts` e `state.ts`) e T5 (111 testes) escritos e verdes; T1 conferido (feito pelo Específico); typecheck, lint, suíte vizinha e build verdes; "Linhas de encaixe" E1–E5 escritas (E5 aplicada); aceite marcado.
Não feito: aplicar a migration 053 (Controle, no commit); linhas E1–E4 em arquivos de outras frentes; chave do Resend na Vercel (Gabriel); suíte inteira; commit (não é da Execução).
Bloqueios para o humano: **`RESEND_API_KEY` e `EMAIL_REMETENTE` não existem na Vercel** — roteiro na seção 6 de `PESQUISA_CUSTO_EMAIL.md`.
Teste rodado? sim (ver "Fechamento da branch").
Próximo ato (um): avisar o chat de branch "FRENTE C PRONTA".

### Sessão 2026-11-17 (chat de branch)

Tipo: branch (coordenação)
Feito: passo 0 da worktree (junção de `node_modules`, `.env.local` copiado — sem `RESEND_API_KEY`; base `9e21fe1`); lidos CLAUDE.md, processo 2.0, executivo, modelo dos chats, ficha C, os arquivos "Ler" principais; escritos `registro/C.md` e este MD.
Feito depois (22:50–23:05): rotina de 5 min criada; decisões do Controle aplicadas (registro em `registro-C.md` na pasta de notas, saque fora do escopo, vagas); rascunho do T2 escrito; filhos abertos por pedido direto do Gabriel — Execução `local_115fe71d-e6fe-4884-bcf3-e9cf5a3889d6`, Auditoria `local_d3bb3d71-fa0f-4890-a8bc-dce39c85cb62`, Específico `local_238a3f52-7880-47db-b4a1-ebc0d0b6a589`.
Não feito: nada de código; T1 a T5.
Bloqueios para o humano: nenhum por ora. A ver: `RESEND_API_KEY` na Vercel (T1).
Teste rodado? não (só ao fim da branch).
Próximo ato (um): abrir Execução, Auditoria e Específico na mesma worktree.
