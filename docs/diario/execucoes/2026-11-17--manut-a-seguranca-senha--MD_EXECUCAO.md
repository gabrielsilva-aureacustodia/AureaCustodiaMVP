# MD de execução — `claude/manut-seguranca-senha-606459` (frente A · segurança: senha nas ações sensíveis)

```
Projeto:        Áurea Custódia / Real Olímpico — manutenção de novembro/2026 (pedido do Rogério, item 1)
Branch:         claude/manut-seguranca-senha-606459
Worktree:       C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-seguranca-senha-606459
Assignee:       Execução da frente A (chat de branch: A · Segurança)
Packet:         docs/manutencao-2026-11/frentes/A-seguranca.md (leitura por caminho absoluto; o pacote está fora do Git)
Ref_commit:     9e21fe1
Aberta em:      2026-11-17
Atualizada em:  2026-11-17 23:1x (T1 a T5 e RA-50 fechados pela Execução; testes verdes arquivo a arquivo)
Estado da branch: aberta — nenhum commit (B1)
Migration reservada: 051 (só se precisar; escrita na branch, aplicada pelo Controle no commit)
```

## RETOMADA (quem abrir isto agora lê só este bloco)

- **Aceite em uma frase:** quem invadir uma conta não consegue sacar, comprar, vender, nem trocar senha, e-mail ou Pix sem a senha (ou o código) do dono.
- **Tópico atual:** nenhum aberto — T1 a T5 e o RA-50 **concluídos**. Testes rodados em 17/11 (liberação do Controle de 22:52, `--maxWorkers=1`, um arquivo por vez): módulo, varredura do servidor, ações com a guarda real, eventos, laço do diálogo, varredura das telas, RA-50 e os 12 testes de ação adaptados — **todos verdes** (números no fim do log do T3 e no T4/RA-50). Eslint só dos arquivos da A: 0 erros. **`tsc --noEmit` (um, autorizado): verde, 0 erros** (a 1ª rodada achou uma colisão de nome em `AccountModals.tsx`, corrigida). **Não rodado, é do Controle no merge:** `eslint src`, build e a suíte inteira.
- **Próximo ato (um):** nenhum desta sessão. Do Controle: `typecheck` + suíte + build no merge; conferência de tela e do link de recuperação real **depois do deploy**; encaixar `avisarSeguranca` (frente C) nas três linhas indicadas no T5. Do Gabriel: modelo "Magic Link" do Supabase com `{{ .Token }}` (conta Google).
- **REGRA PERMANENTE (Gabriel, via Controle, 17/11):** nada de `npm run dev`, preview, container ou servidor local de teste. Tudo vai direto para produção; a conferência de tela acontece **depois do merge e do deploy do Controle**. No T4 o modal e a ligação são montados por código e provados só com vitest (e `typecheck`, quando liberado). Nenhum servidor foi aberto por esta sessão.
- **Git:** `claude/manut-seguranca-senha-606459` sobre `9e21fe1`, sem commit. `node_modules` é junção da pasta principal; `.env.local` copiado (ignorado pelo Git).
- **Decisões padrão até o Gabriel mudar (D3 e D8):** pedir senha **sempre** em saque e em troca de Pix, senha, e-mail e dados; em compra e venda, **janela de 5 minutos**; retirada física de moedas também pede; conta que só entra com Google confirma por **código de 6 dígitos no e-mail**. O valor da janela mora numa constante em **um** arquivo.
- **Não fazer:** TOTP, captcha, limite de tentativas criado por nós (R10 — o Supabase já limita o login; registrar como fato), bloqueio por dispositivo ou IP. Nada em `src/domain/**`.

## Aceite

- [x] **Estudo** `ESTUDO_REAUTENTICACAO.md` (até 2 páginas, linguagem de sócio): a ameaça (conta invadida troca senha e Pix e saca), as opções (senha atual a cada ação · senha com janela curta · código por e-mail · conta só Google), a recomendação, o atrito para o cliente e o custo.
- [x] **Módulo único** `src/server/auth/reautenticacao.ts`: confere a senha atual contra o Supabase Auth **sem trocar a sessão do cliente** (cliente sem persistência de sessão, chave publicável) e guarda a prova numa janela curta (cookie assinado ou estado de sessão). Conta que **só entra com Google** (sem senha) confirma por **código de 6 dígitos no e-mail**, de validade curta.
- [x] (exceção: `verificarTrocaEmail` só lê e não tem guarda; quem troca, `updatePersonal`, tem — ver T3) **Guarda de uma linha** na entrada de cada ação sensível: `solicitarSaque`, `changePassword`, `verificarTrocaEmail`, `updatePersonal` e `salvarCadastro` (quando muda Pix ou dado pessoal), `buyLot`, `publishBid`, `iniciarCompraDireta`, oferta pré-paga (`reserva.ts`), `publishOffer`, `sellToBid`, e `solicitarRetirada` (D8).
- [~] (código e laço provados por vitest; **foco, Esc, 44 px e claro/escuro só se conferem na tela, depois do deploy** — regra permanente, sem servidor local) **Um modal só** (`src/components/seguranca/ModalConfirmarSenha.tsx`, Client Component): a ação devolve `{ ok:false, precisaSenha:true }`, o modal abre, o cliente confirma e a ação é reenviada **sem recarregar a tela**. Foco preso, Esc fecha, alvo de toque 44 px, claro e escuro.
- [x] Toda troca de senha, e-mail ou Pix emite um **evento de segurança** gravado em `audit_log` (contrato A→C: a frente C envia o aviso por e-mail; sem C, fica só no log).
- [x] **Nenhum caminho sensível sem guarda:** teste que lista as exportações sensíveis e **falha** se uma estiver sem a chamada.
- [~] Testes: módulo (senha certa/errada, janela vencida, conta só Google, código vencido), ações com e sem confirmação — **feitos e verdes, arquivo a arquivo**. `tsc --noEmit` rodou uma vez (verde). `npm test` (suíte inteira) e build: do Controle no merge, por ordem de RAM.

## Ler (e só isto) — nesta ordem de prioridade

1. `CLAUDE.md` (da worktree) · `RISCOS_ASSUMIDOS.md` (só as linhas de senha, sessão e Google)
2. `src/server/auth/README.md`, `client.ts`, `config.ts`, `provisioning.ts` · `src/server/session*.ts` (`session.ts`, `session-core.ts`)
3. As ações sensíveis, só a função e o que ela chama: `src/server/actions/account.ts` (`changePassword` l.116, `verificarTrocaEmail` l.159, `updatePersonal` l.213, `salvarCadastro` l.443, `solicitarSaque` l.580), `auth.ts` (`login`, `definirNovaSenha`), `market.ts` (`buyLot` l.170, `publishBid` l.304), `sell.ts` (`publishOffer` l.103, `sellToBid` l.443), `payments.ts` (`iniciarCompraDireta` l.174), `reserva.ts` (`pagarReservaComSaldo` l.78, `iniciarPagamentoReserva` l.178, `iniciarOfertaPrePaga` l.285, `publicarOfertaPrePagaComSaldo` l.407), `custody.ts` (**só** `solicitarRetirada` l.865)
4. `src/components/account/AccountModals.tsx`, `ModalCadastro.tsx` (onde o cliente troca Pix) · `src/server/db/derivar.ts` (como `audit_log` é gravado)
5. Para o Específico: o pedido está na seção "Específico" abaixo; as fontes são externas (OWASP, Supabase) — sempre com data e página.

> Os números de linha acima são da base `9e21fe1`; confirme antes de usar.

## Touch

- `src/server/auth/reautenticacao*.ts` (novo) · `src/components/seguranca/**` (novo) · `src/styles/` (**um** arquivo novo de CSS, importado antes de `responsive.css`)
- Uma linha de guarda em cada ação listada (`account.ts`, `market.ts`, `sell.ts`, `payments.ts`, `reserva.ts`) e **uma** em `custody.ts` (`solicitarRetirada`)
- Ligação do modal nas telas que disparam as ações (T4): só as chamadas/ajustes mínimos em `src/components/account/AccountModals.tsx`, `ModalCadastro.tsx` e nos componentes de compra/venda/saque/retirada que invocam as ações — **anote cada arquivo em "Arquivos deste tópico" do T4 antes de editar**; se um deles for dono de outra frente (ver matriz da seção 3 do executivo), peça ao chat de branch.
- Testes novos ao lado dos módulos (`*.test.ts`).
- **Ampliado pelo chat de branch às 22:5x (aprovado pelo Controle, com condições):** `src/components/providers/AppProvider.tsx` (**só** dentro de `run()`, mais o estado do diálogo: o hook, o `{dialogo}` e uma linha de import) e `src/server/actions/auth.ts` (**só** a guarda de `definirNovaSenha`; mais um import). **Por quê:** (1) `run()` atende quase toda tela; interceptar ali é uma rede de segurança — ação sensível chamada por `run()` que uma tela esqueça de embrulhar em `confirmar(...)` ainda abre o diálogo em vez de falhar calada; (2) `definirNovaSenha` trocava a senha SEM a atual para qualquer sessão aberta do mesmo e-mail (RA-50), driblando a guarda do `changePassword`. Decisão e alternativa da (2) na seção "RA-50" abaixo.
- **Testes existentes de ação adaptados ao bloqueio de senha (E7, `src/server/actions/*.test.ts`): `account`, `oferta-prepaga`, `saque`, `moeda-nao-duplica-entre-operacoes`, `compra-direta`, `compra-direta-comissao-comprador`, `casamento-executa-de-verdade`, `ordens`, `retirada-ciclo-completo`, `cadastro-completo-exige-negociar`, `retirada`, `bloqueio-por-debito`** — +2 linhas cada (comentário e `vi.mock` da guarda); mais `auth.test.ts` (mock de `getSession` e testes novos de RA-50). Motivo: a guarda real lê `cookies()`, que fora de uma requisição lança erro; esses arquivos provam a regra de negócio da ação, não a senha (a senha tem testes próprios). Nenhuma asserção existente foi tocada.
- **Telas fora da lista literal da ficha, tocadas só na ligação do modal** (hook + `confirmar(...)` + `{dialogo}`; o que cada uma mudou, em linhas +/-): `app/(app)/compras/page.tsx` +6/-1 · `app/(app)/mercado/page.tsx` +20/-5 · `app/(app)/vender/page.tsx` +6/-1 · `components/market/ModalOfertaPrePaga.tsx` +9/-3 · `components/market/ReservasEmAberto.tsx` +8/-2 · `components/recibo/ModalSolicitarRetirada.tsx` +8/-2 (**arquivo de área vizinha, da frente I — recibo; conferi que a I ainda não o editou**; diff mínimo, só a ligação) · `components/account/AccountModals.tsx` +21/-6 · `components/account/ModalCadastro.tsx` +25/-18 (parte do -18 é reindentação da chamada embrulhada).
- `docs/diario/execucoes/**` (este MD, log, continuidade, pesquisa) · `docs/memorias/2026-11-17--claude-code--manut-seguranca-senha.md` (rascunho R11, escrito pela Auditoria)

## Do not touch

- `src/domain/**` — superfície protegida (`constants.ts`, `fees.ts`, `market.ts`, `types.ts`). Se uma guarda parecer exigir mudança aí, **pare e avise o chat de branch**.
- `src/server/store/types.ts` (contrato do store) · `src/lib/email/**` (frente C) · `src/components/login/**`, `src/app/entrar/**`, `src/app/cadastrar/**` (frente D) · o resto de `custody.ts` (frente B).
- `docs/memorias/README.md`, `docs/INDICE_VEGA.md`, `ESTADO-GERAL-*`, `CLAUDE.md`, qualquer arquivo geral da raiz (B5): a linha vai para o `registro/A.md` e o Controle encaixa no merge.
- `.env.local`, qualquer segredo. Nunca commitar.

## Fora de escopo

Autenticador por aplicativo (TOTP), captcha, limite de tentativas criado por nós (**registre como fato**: o Supabase já limita o login e o envio de e-mails; não criamos trava — R10), bloqueio por dispositivo ou IP. Aviso por e-mail das trocas é da frente C (A só grava o evento em `audit_log`).

## Específico (sim)

Pesquisa pedida: padrão de reautenticação ("step-up") do OWASP; como chamar `signInWithPassword` no servidor **sem** substituir a sessão (cliente com `persistSession: false`, `autoRefreshToken: false`, chave publicável); OTP por e-mail do Supabase (`signInWithOtp` / `verifyOtp`) e limites de envio; como saber se a conta tem senha (provedor `email` em `identities`/`app_metadata.providers`) ou só Google. Entrega com **fontes e data** em `docs/diario/execucoes/pesquisa/a-reautenticacao-step-up.md`, conclusão no topo.

## Tópicos

### T1 — Estudo e decisão do desenho

Estado: CONCLUÍDO (17/11/2026)
Aceite deste tópico: `ESTUDO_REAUTENTICACAO.md` escrito (até 2 páginas, linguagem de sócio; sem jargão que o Rogério não entenda), com ameaça, quatro opções, recomendação, atrito e custo; desenho do módulo decidido numa lista curta no fim do estudo.
Arquivos deste tópico: `docs/diario/execucoes/pesquisa/a-reautenticacao-step-up.md` (feita pela Execução: o Específico `manut-a-esp` não existe) · `docs/diario/execucoes/ESTUDO_REAUTENTICACAO.md` (Execução; o Controle decide onde ele mora no merge — sugestão: `docs/seguranca/ESTUDO_REAUTENTICACAO.md`)
Log:
- Li a lista "Ler" inteira (account, auth, market, sell, payments, reserva, custody só `solicitarRetirada`, session, auth/*, AppProvider, derivar/auditoria/users).
- Descobertas que moldam o desenho: (1) quase toda tela chama a ação por `run()` do `AppProvider` — um ponto central para o modal; (2) `legal.ts` já assina cookie com `node:crypto` e `SESSION_SECRET` (precedente para a prova); `session-core` só pode ser importado por `session.ts`/middleware (teste), então a prova faz o HMAC por conta própria; (3) `updatePersonal` com e-mail novo em conta Google define senha nova e solta o vínculo Google — é o caminho de tomada de conta e precisa do código por e-mail; (4) `definirNovaSenha` (auth.ts) troca a senha sem pedir a atual para quem tem a sessão aberta (RA-50) — fora da lista Touch, pedi autorização ao chat de branch; (5) `renomearEmailUsuarioNoBanco` já grava `usuario.trocar_email` em `audit_log` (o evento novo é complementar, com nome `seguranca.*`).
- Fatos do Supabase/OWASP conferidos nas páginas oficiais em 17/11/2026 (arquivo de pesquisa).
Próximo ato deste tópico: — (fechado). Segue T2.

### T2 — Módulo de reautenticação + testes

Estado: CONCLUÍDO (17/11/2026) — `npx vitest run src/server/auth/reautenticacao.test.ts`: 41 testes verdes
Aceite deste tópico: `reautenticacao.ts` confere senha sem trocar a sessão; janela curta guardada em cookie assinado ou estado de sessão (constante da janela em um único arquivo); conta só Google confirma por código de 6 dígitos com validade curta; testes isolados: senha certa/errada, janela vencida, conta só Google, código vencido.
Arquivos deste tópico (todos novos):
- `src/server/auth/reautenticacao.ts` — a guarda `exigirReautenticacao(nivel)`, `confirmarComSenha`, `enviarCodigoPorEmail`, `confirmarComCodigo`, `metodoDeConfirmacao`, prova em cookie assinado.
- `src/server/auth/reautenticacao-config.ts` — as durações (5 min compra/venda; 1 min de folga no nível `sempre`; 10 min do código; 60 s entre códigos). ÚNICO arquivo da janela.
- `src/server/auth/reautenticacao-actions.ts` — as 3 Server Actions do modal (`confirmarSenhaAction`, `pedirCodigoPorEmailAction`, `confirmarCodigoAction`); nome casa com o glob `reautenticacao*.ts` da lista Touch.
- `src/components/seguranca/confirmacao.ts` — tipo `BloqueioDeConfirmacao` e `pedeConfirmacao()` (puro, sem `server-only`), compartilhado com o modal (`ActionResult` fica intocado: está em `domain/types.ts`, superfície protegida).
- `src/server/auth/reautenticacao.test.ts` — 41 testes.
Log:
- Prova = cookie `aurea_reauth` assinado (HMAC-SHA256, `SESSION_SECRET`, domínio `prova|` separado do cookie de sessão e do cookie do código). `session-core` não é importado (só `session.ts` e o middleware podem; há teste): o HMAC segue o precedente de `legal.ts`.
- Dois níveis: `janela` (5 min, reutilizável) e `sempre` (1 uso: a guarda apaga o cookie ao liberar; 1 min de folga). Níveis não se misturam (prova de compra nunca libera saque).
- Senha: `createClient` do supabase-js com `persistSession:false`, sem `cookies()`; sessão descartada com `signOut({scope:'local'})`. Chave publicável.
- Método (senha × código) decidido pelo servidor: provedor `email` na identidade (chave de serviço, `identidade.ts`) → senha; só Google → código. Sem a chave de serviço → senha.
- Código: `signInWithOtp({shouldCreateUser:false})` + `verifyOtp({type:'email'})`; prazo de 10 min conferido por cookie assinado com a hora do envio (o do Supabase é 1 h, do projeto inteiro).
- Limite de tentativas: NÃO criado (R10) — fato registrado no estudo e no topo do módulo.
Próximo ato deste tópico: — (fechado). Segue T3.

### T3 — Guardas nas ações + teste "nenhuma sem guarda"

Estado: CONCLUÍDO (17/11/2026, 23:0x) — testes rodados com a liberação do Controle (`npx vitest run --maxWorkers=1 <arquivo>`, um por vez): **todos verdes**. Resultados na lista "Testes rodados" do fim do T3.
Aceite deste tópico: uma linha de guarda na entrada de cada ação sensível da lista do aceite; teste que lista as exportações sensíveis e **falha** se alguma estiver sem a chamada; ações testadas com e sem confirmação.
Arquivos deste tópico:
- Guardas (uma chamada `exigirReautenticacao(...)` + `if (bloqueio) return bloqueio`, dentro da lista Touch): `src/server/actions/account.ts`, `market.ts`, `sell.ts`, `payments.ts`, `reserva.ts`, `custody.ts` (só `solicitarRetirada`).
- Testes novos: `src/server/auth/reautenticacao-guardas.test.ts` (varredura) · `src/server/actions/reautenticacao-acoes.test.ts` (as ações com a guarda REAL) · mais 7 casos de `senhaDigitada` em `src/server/auth/reautenticacao.test.ts`.
- 12 testes de ação **existentes** editados (+2 linhas cada, ver o motivo no log): `account`, `oferta-prepaga`, `saque`, `moeda-nao-duplica-entre-operacoes`, `compra-direta`, `compra-direta-comissao-comprador`, `casamento-executa-de-verdade`, `ordens`, `retirada-ciclo-completo`, `cadastro-completo-exige-negociar`, `retirada`, `bloqueio-por-debito` (`.test.ts`, todos em `src/server/actions/`).
Log:
- **Onde cada guarda entrou** (nível; regra: DEPOIS da conferência barata dos argumentos, ANTES de ler estado ou gravar — senão o cliente digitaria a senha para ouvir "informe um valor válido"): `solicitarSaque` (sempre, depois do valor mínimo) · `changePassword` (sempre, com `senhaDigitada`) · `updatePersonal` (sempre, duas guardas: a do caminho "só o nome" e a da troca de e-mail, esta depois das conferências de e-mail e antes de qualquer efeito no Supabase ou no banco) · `salvarCadastro` (sempre, **só** quando mexe num cadastro já gravado) · `solicitarRetirada` (sempre, D8) · `buyLot` (janela, 1ª linha) · `publishBid` (janela, depois das recusas de modalidade e pré-paga) · `publishOffer` (janela, depois do `return` mudo de seleção vazia) · `sellToBid` (janela) · `iniciarCompraDireta` (janela) · `pagarReservaComSaldo`, `iniciarPagamentoReserva`, `iniciarOfertaPrePaga`, `publicarOfertaPrePagaComSaldo` (janela).
- **Desvio da ficha — `verificarTrocaEmail` NÃO recebeu guarda.** Ela só confere se o e-mail novo é possível e devolve `requerSenha`; quem troca é `updatePersonal`, que tem a guarda. Pôr a guarda nas duas faria o cliente digitar a senha duas vezes. O teste de varredura vigia a isenção: se `verificarTrocaEmail` passar a gravar algo, o teste falha.
- **`changePassword` não pede a senha duas vezes:** a "senha atual" que a tela já tem é a confirmação (opção `senhaDigitada` da guarda: confere ali, no mesmo lugar único que confere senha, e não abre o modal). Conta que só entra com Google segue para o código. Consequência: `changePasswordContingencia` (caminho para ambiente sem Supabase Auth) **ficou inalcançável** — sem Supabase configurado a guarda recusa antes, com "A confirmação de segurança não está disponível neste ambiente." (fecha, não abre). Não removi a função (fora do pedido).
- **`salvarCadastro`:** primeiro preenchimento e reenvio do mesmo formulário não pedem nada; trocar Pix, banco, CPF, nome, nascimento, telefone ou endereço de um cadastro gravado pede. As duas pontas são normalizadas antes de comparar (espaços, UF, dígitos de CEP e telefone), senão o formulário reenviado ao confirmar pediria de novo.
- **Por que mexi em 12 testes existentes:** a guarda real chama `cookies()` de `next/headers`, que fora de uma requisição lança erro. Cada um desses arquivos testa a REGRA DE NEGÓCIO de uma ação (retirada, saque, compra etc.), não a senha; então ganharam duas linhas depois do `vi.mock('server-only')`: um comentário e `vi.mock('@/server/auth/reautenticacao', () => ({ exigirReautenticacao: async () => null }))`. Nenhuma asserção foi tocada. A senha tem testes próprios (módulo, varredura, ações com guarda real). A Auditoria conferiu o +2 linhas de cada um. `payments.test.ts`, `frete-envio.test.ts`, `plano-custodia.test.ts` e `auth.test.ts` não chamam ação guardada e ficaram como estavam.
- **Teste de varredura (`reautenticacao-guardas.test.ts`):** lê o código-fonte das 14 ações sensíveis e falha se a ação sumiu, se falta a chamada, se o nível está trocado, se a chamada não devolve o bloqueio, se a guarda vem DEPOIS de gravação/cobrança/troca no Supabase, ou (em `updatePersonal`, que tem duas) se a troca de login e a gravação no banco vêm antes da última guarda. Ação sensível nova entra na lista no mesmo commit.
- **Teste das ações com a guarda real (`reautenticacao-acoes.test.ts`):** sem prova, as 12 ações do nível certo pedem confirmação e o estado fica idêntico (foto antes/depois); troca de e-mail não chega ao Supabase; `sempre` gasta a prova no primeiro uso; `janela` libera várias vezes e vence aos 5 min; níveis não se misturam; prova de outra conta e cookie adulterado não valem; conta só Google recebe `metodo: 'codigo'` até quando digita senha; `changePassword` (certa/errada/curta/sessão intacta); `salvarCadastro` (primeiro, igual, Pix novo, telefone/endereço, erro de preenchimento).
- **Fato registrado (R10):** nenhum limite de tentativas criado por nós; Supabase limita 150 conferências de senha por 5 min por IP e 30 verificações de código por 5 min por IP.
- **Dois arquivos fora da lista Touch, pedidos e AUTORIZADOS pelo chat de branch às 22:5x (Controle aprovou):** `AppProvider.tsx` (rede central em `run()`, ver T4) e `auth.ts` (só a guarda de `definirNovaSenha`, ver "RA-50" abaixo). Nesse intervalo, o T4 já tinha ligado as telas uma a uma; a rede central veio por cima.
- **Rodada de testes:** feita depois da liberação do Controle de 22:52 (lista acima). Falha em teste novo é erro do teste ou da guarda: corrigir, nunca deixar vermelho (memória `suite-vermelha-nao-e-pendencia`).
- **Testes rodados (17/11, 23:02–23:06; liberação do Controle de 22:52; `--maxWorkers=1`, um arquivo por vez):**
  - `src/server/auth/reautenticacao.test.ts` — 48 testes verdes (41 do T2 + 7 de `senhaDigitada`)
  - `src/server/auth/reautenticacao-guardas.test.ts` — 77 verdes (a varredura; inclui as checagens do T5)
  - `src/server/actions/reautenticacao-acoes.test.ts` — 53 verdes (as ações com a guarda real; inclui o bloco do evento de segurança, T5)
  - Os 12 testes de ação adaptados: `account` 17 · `oferta-prepaga` 5 · `saque` 6 · `moeda-nao-duplica-entre-operacoes` 4 · `compra-direta` 6 · `compra-direta-comissao-comprador` 4 · `casamento-executa-de-verdade` 4 · `ordens` 6 · `retirada-ciclo-completo` 1 · `cadastro-completo-exige-negociar` 6 · `retirada` 21 · `bloqueio-por-debito` 27 — **todos verdes**.
  - Não rodados por ordem do Controle (rodam no merge): `tsc`/`typecheck`, `eslint src`, build, suíte inteira. O eslint **só dos arquivos da A** (um comando) deu 0 erros e 4 avisos, **nenhum meu**: `getState`/`mutateState` sem uso em `auth.ts` e `auth.test.ts`, e `MENSAGEM_ANUNCIO_PAUSADO` sem uso em `sell.ts` (já eram assim na base; conferi o diff).
Próximo ato deste tópico: — (fechado).

### T4 — Modal único e ligação nas telas

Estado: CONCLUÍDO (17/11/2026) — modal, hook, CSS, as 8 telas ligadas e a rede central em `AppProvider.run()`; testes do laço do diálogo (11) e da varredura das telas (3) **verdes**. Conferência de tela só depois do deploy (regra permanente: sem servidor local). `tsc --noEmit` verde (achou e corrigiu uma colisão de nome em `ModalDefinirSenhaTrocaEmail`).
Aceite deste tópico: `ModalConfirmarSenha.tsx` (Client Component) abre quando a ação devolve `{ ok:false, precisaSenha:true }`, o cliente confirma e a ação é reenviada **sem recarregar a tela**; foco preso, Esc fecha, alvo de toque 44 px, claro e escuro; ligado em saque, Pix, compra, venda, retirada e dados pessoais; **sem servidor local** (regra permanente de 17/11): provado por vitest (módulo e ações), conferência de tela depois do deploy do Controle (ver "Testar a tela" abaixo).
Arquivos deste tópico: `src/components/seguranca/ModalConfirmarSenha.tsx` (+ hook/helper no mesmo diretório), um CSS novo em `src/styles/` importado antes de `responsive.css`, e as telas que chamam as ações (listar aqui ao editar).
Lista fechada (feita ANTES de editar as telas; nenhuma é de outra frente — a matriz da seção 3 do executivo não cita nenhuma delas):
- Novos: `src/components/seguranca/ModalConfirmarSenha.tsx` · `src/components/seguranca/useConfirmarSenha.tsx` · `src/styles/seguranca.css`.
- Uma linha de `@import` em `src/app/globals.css` (antes de `responsive.css`; é onde o CSS novo precisa entrar).
- Telas ligadas ao hook (`const { confirmar, dialogo } = useConfirmarSenha()` + `run(() => confirmar(() => acao(...)))` + `{dialogo}` na tela): `src/components/account/AccountModals.tsx` (`ModalDadosPessoais`, `ModalDefinirSenhaTrocaEmail`, `ModalSenha`, `ModalSaque`) · `src/components/account/ModalCadastro.tsx` · `src/app/(app)/mercado/page.tsx` (`buyLot`, `iniciarCompraDireta`) · `src/app/(app)/compras/page.tsx` (`publishBid`) · `src/app/(app)/vender/page.tsx` (`publishOffer`) · `src/components/market/ModalOfertaPrePaga.tsx` · `src/components/market/ReservasEmAberto.tsx` · `src/components/recibo/ModalSolicitarRetirada.tsx`.
- Sem tela, só guarda no servidor: `sellToBid` e `iniciarPagamentoReserva` não têm chamador em nenhum componente (busca em `src/**/*.tsx`); ficam protegidas por quem chamar o endpoint direto.
Log:
- **Por que o diálogo NÃO usa o `ModalHost` do site:** o host guarda UM conteúdo por vez; abrir a confirmação por ele trocaria o modal de baixo e a pessoa perderia o valor do saque, o Pix novo ou a quantidade da compra. O diálogo é uma camada à parte (portal no `<body>`, z-index do modal + 5, abaixo do toast), reaproveita `.modal-bg`/`.modal`/`.btn`/`.tinput` (mesmos tokens claro/escuro, alvo de 44 px já vem deles) e, terminada a confirmação, a ação segue de onde parou — com o estado do modal de baixo intacto.
- **Por que um hook por tela e não um ponto central no `run()` do `AppProvider`:** há chamadas diretas que não passam pelo `run()` (`iniciarCompraDireta`, `iniciarOfertaPrePaga`, `salvarCadastro`) e o `AppProvider` está fora da lista Touch. Com o hook cada chamada declara que pode pedir confirmação, dentro do que a ficha autoriza. Se o chat de branch autorizar o `run()`, o hook continua valendo para as chamadas diretas.
- **Comportamento:** a ação é chamada; se vier `precisaSenha`, abre o diálogo (senha, ou código de 6 dígitos por e-mail para conta só Google, com "Enviar código", "Já tenho um código" e contagem de 60 s para reenviar); confirmada, a MESMA ação é reenviada uma vez (se ainda pedir confirmação — cookie recusado pelo navegador, por exemplo — a tela mostra erro em vez de abrir o diálogo em laço); cancelar (botão ou Esc) devolve `{ ok:false }` sem texto, e portanto sem toast. Foco: entra no campo, gira dentro da caixa, volta ao elemento anterior e é reposto depois de cada envio.
- **Limitação que já existia (não criada aqui):** a conta só Google que abre "Alterar senha" não tem senha atual para digitar; confirma por código e depois a própria ação recusa com "Senha atual incorreta.". Quem entra só com Google redefine a senha pelo fluxo de recuperação. Fora do pedido.
- **O laço "chama → pergunta → reenvia" é código puro, fora do React:** `executarComConfirmacao` mora em `src/components/seguranca/confirmacao.ts` (o hook só entrega a `perguntar`). Motivo: o vitest do projeto roda em nó, sem jsdom, e não monta componente; extraído, o laço se prova inteiro — passa direto quando não pede, reenvia uma vez, desistir devolve `{ ok:false }` sem texto, ainda pedindo depois de confirmado vira erro (nunca um segundo diálogo). Teste: `src/components/seguranca/confirmacao.test.ts`.
- **Teste de varredura das telas (`src/components/seguranca/telas-confirmam.test.ts`):** o irmão do teste do servidor. Lê todo `.tsx` de `src/components` e `src/app`, ignora comentários e falha se alguma chamada das 14 ações sensíveis não vier logo depois de `confirmar(() =>`, ou se o arquivo que a chama não usa `useConfirmarSenha()` e não desenha `{dialogo}`. Esquecer o `confirmar(` não dá erro de build nem de tipo: o cliente clicaria em "Confirmar saque" e nada aconteceria. Ação sensível nova entra na lista no mesmo commit.
- **Ajustes de comportamento feitos junto da ligação** (cada um evita um aviso de falha falso ou um diálogo perdido): (1) desistir da confirmação devolve `{ ok:false }` sem texto, então `ModalSaque`, `ModalCadastro`, `ModalOfertaPrePaga`, `ModalSolicitarRetirada` e o `cobrarDireto` da compra só mostram erro quando `res.error` existe; (2) `ConfirmarCompraModal` (mercado) não fecha mais **antes** da ação — fechar desmontaria o hook e o diálogo no meio da confirmação; agora fecha depois do resultado (sucesso ou erro com texto) e, ao desistir, fica aberto com o botão liberado (`enviando` impede o clique duplo); (3) `ReservasEmAberto` devolvia `null` sem reservas e perderia o diálogo aberto; devolve `dialogo` nesse caso; (4) os hooks ficam antes de qualquer `return` antecipado (`ModalSaque`, `ModalSolicitarRetirada`, `ReservasEmAberto`), por causa da ordem dos hooks do React.
- **Foco (sem teste de nó, conferir na tela):** ao abrir entra no campo; ao enviar com o campo desabilitado o foco é reposto quando o envio termina (efeito em `[etapa, ocupado]`, porque `.focus()` num campo desabilitado não faz nada); Tab e Shift+Tab giram dentro da caixa; Esc cancela, exceto durante o envio; ao fechar volta ao elemento que estava em foco.
- **Varredura de uso:** busca em `src/**/*.tsx` confirmou que as 12 ações com tela (as 14 menos `sellToBid` e `iniciarPagamentoReserva`) só são chamadas por dentro de `confirmar(...)`; a única linha sem `confirmar(` na mesma linha é o `salvarCadastro({` de `ModalCadastro.tsx` em várias linhas, que está dentro de `confirmar(() => salvarCadastro({...}))`. O teste novo acima passou a vigiar isso.
- **Rede central em `AppProvider.run()` (autorizada às 22:5x):** `run()` agora chama `confirmar(fn)` no lugar de `fn()` e o `AppProvider` desenha o `{dialogo}` (um `useConfirmarSenha()` seu). Ação que não pede nada passa direto; as telas que já embrulham a chamada nunca deixam um pedido em aberto chegar ali, porque o diálogo delas resolve antes. Serve às chamadas por `run()` de ação sensível que uma tela futura esqueça de embrulhar. As chamadas que **não** passam por `run()` (`iniciarCompraDireta`, `iniciarOfertaPrePaga`, `salvarCadastro`) seguem ligadas tela a tela — e o teste `telas-confirmam.test.ts` as vigia.
- **Testes rodados (17/11, 23:03):** `src/components/seguranca/confirmacao.test.ts` — 11 verdes; `src/components/seguranca/telas-confirmam.test.ts` — 3 verdes (na primeira rodada falhou por um `*/` dentro de um comentário `/** */` meu; corrigido, verde). O `ModalConfirmarSenha`, o hook e o `AppProvider` (`.tsx`, `<T,>`, portal) só se provam no `typecheck` do Controle e na conferência de tela depois do deploy.
- **Conferência de tela (só depois do deploy):** ver "Testar a tela (T4)" abaixo.
Próximo ato deste tópico: — (fechado).

### T5 — Evento de segurança em `audit_log` + testes finais

Estado: CONCLUÍDO (17/11/2026) — evento gravado nas três trocas; testes do tópico **verdes** (`reautenticacao-eventos.test.ts` 16, o bloco novo de `reautenticacao-acoes.test.ts` e da varredura, ver T3). `typecheck`, `eslint src`, build e suíte inteira: do Controle, no merge.
Aceite deste tópico: troca de senha, e-mail ou Pix grava evento de segurança em `audit_log` (contrato A→C); `npm run typecheck` e `npm test` verdes; a migration 051 só se de fato precisar (ex.: tabela para guardar o código por e-mail), escrita e **não aplicada** (o Controle aplica no commit).
Arquivos deste tópico: gravação em `audit_log` via o ponto que `src/server/db/derivar.ts` já usa; testes novos.
Log:
- **Contrato A → C (o que a frente C lê):** linha em `aurea.audit_log` com `acao LIKE 'seguranca.%'`. Três ações:
  - `seguranca.senha_alterada` — `detalhes: {}`;
  - `seguranca.email_alterado` — `detalhes: { de, para, senhaDefinida, googleDesvinculado }` (conta Google que troca o e-mail define senha nova e desvincula o Google: é o caminho de tomada de conta, por isso vai explícito);
  - `seguranca.pix_alterado` — `detalhes: { primeiroCadastro, campos: ['chavePix','tipoChavePix','banco','agencia','conta','tipoConta'] }` (só os campos que mudaram; **nomes, nunca valores**). `primeiroCadastro: true` é o primeiro preenchimento, que a C pode optar por não avisar.
  - Todas: `ator` e `entidadeId` = e-mail da conta **antes** da troca (é para onde o aviso deve ir: se a conta foi tomada, o e-mail novo já é do invasor); `entidade = 'conta'`; `usuariosAfetados` = esse e-mail (mais o novo, na troca de e-mail). Nunca entram: senha (antiga ou nova), código de confirmação, chave Pix, número de conta.
- **Onde:** `src/server/auth/reautenticacao-eventos.ts` (novo; `registrarEventoDeSeguranca`, `montarEventoDeSeguranca`, `camposBancariosAlterados`). Chamado só em `account.ts`, **depois** da troca que deu certo: `changePassword` (depois do `updateUser`), `updatePersonal` (depois do banco/`setSession`, só no caminho de e-mail; trocar só o nome NÃO é evento), `salvarCadastro` (depois do `mutateState`, só se Pix/banco mudou ou foi o primeiro preenchimento; nome, telefone e endereço pedem a senha mas não são evento).
- **Grava pelo ponto que a trilha já usa:** `registrarAuditoria` (`repositories/auditoria.ts`) dentro de `executarNoBanco`, só com `bancoConfigurado()`. Sem Postgres (memória/Redis) não há `audit_log` e a função não faz nada, como o resto da trilha.
- **A gravação nunca derruba a troca:** falha vira `console.warn` e a troca segue — a senha e o e-mail já mudaram no Supabase Auth, e desfazer por causa da trilha deixaria a pessoa sem acesso e sem aviso. Por isso o evento é gravado **depois**, em transação própria, e não dentro da `mutateState`: o Supabase Auth não entra em transação nossa, então "as duas commitam ou nenhuma" não existe para a senha. (Ficou como risco aceito: troca feita e linha perdida = sem aviso por e-mail; o log do servidor mostra o aviso.)
- **Já existe uma linha parecida no e-mail:** `renomearEmailUsuarioNoBanco` (`users.ts`, fora da lista Touch, não mexi) grava `usuario.trocar_email` na própria transação do rename. Foi mantida; a `seguranca.email_alterado` é a versão do contrato para a C filtrar tudo por um prefixo só. Uma troca de e-mail deixa as duas linhas.
- **Régua única de "mudou o Pix?":** `camposBancariosAlterados` (compara com espaços cortados e vazio = ausente) passou a servir à guarda de `salvarCadastro` **e** ao evento; saiu `assinaturaDosDadosBancarios` de `account.ts` (era a mesma conta feita à mão, num lugar só).
- **Migration 051: NÃO foi preciso.** `audit_log` (migration 003) já aceita qualquer `acao` em texto e `detalhes` em JSON; o código por e-mail não guarda nada em tabela (Supabase gera o código; o cookie assinado guarda a prova).
- **Onde a frente C encaixa o aviso por e-mail (`avisarSeguranca`, que mora só na branch da C e NÃO foi adicionado aqui, como o Controle mandou):** depois do sucesso, **na mesma linha em que hoje entra `registrarEventoDeSeguranca`** — em `changePassword` (depois do `updateUser`), em `updatePersonal` (depois do `setSession`, só no caminho de troca de e-mail) e em `salvarCadastro` (depois do `mutateState`, só quando o Pix muda). **Correção ao pedido:** o Controle falou em `verificarTrocaEmail`; essa ação só LÊ (confere se o e-mail novo é possível) — quem troca o e-mail é `updatePersonal`, então é nela que o aviso entra. Quem encaixar: o aviso de e-mail NÃO pode lançar nem derrubar a troca (mesmo princípio do evento), e na troca de e-mail deve ir para o e-mail ANTIGO (`conta`), que é o que ainda é do dono.
- **Testes (rodados em 17/11, 23:02: verdes):** `src/server/auth/reautenticacao-eventos.test.ts` (novo: nome com prefixo, ator/entidade/afetados, sem banco não grava, com banco um INSERT, falha do banco não lança, `camposBancariosAlterados` só com nomes) · bloco novo "evento de segurança" no fim de `src/server/actions/reautenticacao-acoes.test.ts` (ação certa emite uma vez com os detalhes certos; recusa, senha errada, guarda barrando, nome só, telefone/endereço, reenvio do mesmo cadastro: nada emitido; nenhum segredo em `JSON.stringify` das chamadas) · bloco novo em `src/server/auth/reautenticacao-guardas.test.ts` (varredura: a chamada existe, é única, tem o tipo certo e vem depois de toda gravação/troca da ação).
- **Fora do escopo, registrado:** (a) a redefinição de senha por link do e-mail (`definirNovaSenha`, `src/server/actions/auth.ts`) é troca de senha e **emite** `seguranca.senha_alterada` com `via: 'link_de_redefinicao'` (liberado depois pelo chat de branch; ver RA-50, abaixo); (b) troca de e-mail/senha feita pelo painel (`/admin/usuarios/[email]`) já grava `admin.*` na trilha do painel; (c) o filtro da trilha em `/admin/resultados` não tem atalho "Segurança" (digitar `seguranca.` no campo de ação já filtra, é busca por começo).
- **Rodada que sobra para o Controle, no merge:** `npm run typecheck` → `eslint src` → `npm test` (suíte inteira) → `npm run build`. A frente só rodou arquivo por arquivo, com `--maxWorkers=1` (ordem do Controle por causa da RAM).
Próximo ato deste tópico: — (fechado).

### RA-50 — `definirNovaSenha` (autorizado às 22:5x; guarda só nela, em `auth.ts`)

Estado: CONCLUÍDO (17/11/2026) — `sessao-de-recuperacao.test.ts` 10 verdes e `auth.test.ts` 18 verdes (9 testes novos: RA-50, interruptor e evento).
- **O buraco:** o comentário da função dizia que a autorização é "a sessão de recuperação", mas ela só conferia `getSessionEmail()` + `getUser()` do mesmo e-mail. Qualquer sessão logada comum — inclusive roubada — chamava a ação direto e trocava a senha SEM a atual, driblando a confirmação do `changePassword`.
- **Opção escolhida (a mais restritiva que NÃO quebra a tela de recuperação):** a troca sem a senha atual só vale se o token da sessão traz, na claim `amr`, um método de **link de e-mail** (`recovery`, e por garantia `otp` e `magiclink`) usado há no máximo **30 minutos** (`JANELA_DO_LINK_DE_RECUPERACAO_MS`, no arquivo único de durações). Sessão de quem entrou com senha (`password`) ou Google (`oauth`) é recusada com o mesmo texto do link vencido ("O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento."), a senha não muda e o servidor registra, em `console.warn`, só os NOMES dos métodos (nunca o token). Na dúvida (token ausente, ilegível, sem `amr`) bloqueia. A leitura do `amr` fica em `src/server/auth/sessao-de-recuperacao.ts` (puro), depois de o `getUser()` ter validado o token no Supabase.
- **O que NÃO está confirmado, e por que a lista tem três nomes:** a página de campos do JWT do Supabase (consultada em 17/11/2026, https://supabase.com/docs/guides/auth/jwt-fields) lista `recovery`, `otp` e `magiclink` como valores de `amr`, mas **não diz qual deles o link de recuperação grava**. Por isso os três valem. Se o link real gravar outro nome, a tela "nova senha" recusaria o cliente legítimo (fica seguro, não aberto). **Conferir em produção, com um link de recuperação real e conta de teste, assim que o Controle fizer o deploy** (o `console.warn` do servidor mostra os métodos que vieram, para ajustar a lista numa linha de `sessao-de-recuperacao.ts`). Se falhar, desligar o interruptor (abaixo) e avisar a frente A.
- **Alternativa que NÃO foi feita (decisão do Gabriel, R10):** pedir o **código de 6 dígitos por e-mail** depois do link, com o modal de confirmação. É mais forte (o link sozinho deixa de bastar) mas exige o modal dentro de `src/components/login/NovaSenhaForm.tsx`, que é da frente D e está fora do que esta frente pode editar. O atrito seria um passo a mais para quem esqueceu a senha. Registrado para a completude.
- **Atrito da opção escolhida:** quem abre o link e demora mais de 30 minutos para digitar a senha nova recebe "link expirou" e pede outro. Quem pede "esqueci a senha" e abre o link a tempo não deve ser afetado, desde que o link grave um dos três métodos (ponto a conferir no deploy, acima).
- **Para o Controle no merge:** o RA-50 (`RISCOS_ASSUMIDOS.md`, `src/server/actions/ATALHOS.md` e `src/server/auth/ATALHOS.md#ra-50`) passa de aberto para pago **com a ressalva de conferir o link real em produção**; esta frente não editou esses arquivos (raiz e fora da lista Touch).
- **INTERRUPTOR (pedido do chat de branch, a partir do alerta da Auditoria):** `EXIGIR_LINK_RECENTE_NA_NOVA_SENHA` em `src/server/auth/reautenticacao-config.ts` (nasce `true`), lido por `definirNovaSenha`. Em `false` a função volta ao comportamento antigo numa linha, sem ler o token — para o Controle desligar se, depois do deploy, o "esqueci minha senha" passar a recusar o cliente legítimo. **Desligar reabre o RA-50** (qualquer sessão aberta volta a trocar a senha sem a atual); é para ser temporário, só até ajustar a lista de métodos. Teste: `auth.test.ts` ("INTERRUPTOR desligado…").
- **Evento de segurança também neste caminho (pedido do chat de branch):** a troca bem-sucedida por link emite `seguranca.senha_alterada` com `detalhes: { via: 'link_de_redefinicao' }` (a recusa e os erros de senha fraca/igual/confirmação não emitem). Como nos outros caminhos, a gravação nunca derruba a troca.
- **O "esqueci minha senha" não se testa sem servidor local nem e-mail real:** por isso o roteiro de conferência pós-deploy está em "Para o Controle após o deploy", abaixo.

## Superfície protegida tocada (lista exata)

Server Actions (superfície protegida pela regra do `CLAUDE.md`), cada uma só com a linha de guarda e, quando indicado, o evento de segurança:
- `src/server/actions/account.ts` — guardas em `solicitarSaque`, `changePassword`, `updatePersonal` (duas), `salvarCadastro`; evento nas três trocas; `assinaturaDosDadosBancarios` trocada por `camposBancariosAlterados`.
- `src/server/actions/auth.ts` — **só** `definirNovaSenha`: a guarda do RA-50 (com o interruptor), o evento `seguranca.senha_alterada` e três imports (acima). +35/-2.
- `src/server/actions/market.ts` (`buyLot`, `publishBid`) · `sell.ts` (`publishOffer`, `sellToBid`) · `payments.ts` (`iniciarCompraDireta`) · `reserva.ts` (4 ações) · `custody.ts` (**só** `solicitarRetirada`).
- **Não tocados:** `src/domain/**` (`constants.ts`, `fees.ts`, `market.ts`, `types.ts`), `src/server/store/types.ts`, o resto de `custody.ts`, `src/lib/email/**`, `src/components/login/**`, `src/app/entrar|cadastrar`.
- **Migration:** nenhuma (a 051 reservada não foi usada; nada a aplicar).

## Linha para os índices (o Controle encaixa no merge; esta frente não toca `INDICE_VEGA.md`, `docs/memorias/README.md` nem `ESTADO-GERAL-*`)

`Frente A (segurança) — confirmação por senha (ou código por e-mail, conta só Google) em saque, compra, venda, troca de senha/e-mail/Pix/dados e retirada; evento seguranca.* em audit_log; RA-50 fechado em definirNovaSenha — módulo src/server/auth/reautenticacao*.ts, modal src/components/seguranca/, MD docs/diario/execucoes/2026-11-17--manut-a-seguranca-senha--MD_EXECUCAO.md, estudo docs/diario/execucoes/ESTUDO_REAUTENTICACAO.md.`

## Para o Controle após o deploy (roteiro curto; tudo em produção, com conta de teste, sem repetir senha no chat)

1. **"Esqueci minha senha" ponta a ponta (RA-50):** na tela de entrada pedir o link de "esqueci minha senha" para uma conta de teste → abrir o link do e-mail → na tela "nova senha" definir uma senha nova → sair → entrar com a senha nova. **Deve funcionar.**
2. **Se a tela "nova senha" recusar** ("O link de redefinição expirou ou já foi usado…"): abrir o log do servidor na Vercel e procurar a linha `[auth] definirNovaSenha recusada … Métodos no token:`. Ela mostra os nomes reais do `amr` (nunca o token). Então **desligar o interruptor** `EXIGIR_LINK_RECENTE_NA_NOVA_SENHA = false` em `src/server/auth/reautenticacao-config.ts`, publicar, e avisar a frente A com os nomes que apareceram (o ajuste definitivo é acrescentar o nome em `METODOS_DE_LINK_DE_EMAIL`, uma linha em `sessao-de-recuperacao.ts`). **Desligar reabre o RA-50**; deixar assim só até o ajuste.
3. **Modal de confirmação (T4):** saque, troca de Pix, compra, venda e retirada abrem o modal; foco preso, Esc cancela, botões de 44 px, claro e escuro; depois de confirmar a ação segue sozinha, sem recarregar.
4. **Conta só Google** (depois da pendência do Gabriel abaixo): o modal mostra "Enviar código", o campo de 6 dígitos e a contagem de 60 s para reenviar.
5. **Evento de segurança:** depois de trocar uma senha de teste (por "Alterar senha" e por "esqueci minha senha"), o e-mail de teste e o Pix, conferir em `/admin/resultados` (campo de ação, digitar `seguranca.`) as linhas `seguranca.senha_alterada`, `seguranca.email_alterado` e `seguranca.pix_alterado`.

## Arquivos fora do padrão Touch (criados ou ampliados — para o Controle conferir no merge)

- **Novos fora do glob `reautenticacao*.ts`:** `src/server/auth/sessao-de-recuperacao.ts` e `src/server/auth/sessao-de-recuperacao.test.ts` (RA-50; o glob da ficha cobria só `reautenticacao*`).
- **Ampliados pelo chat de branch (aprovados pelo Controle):** `src/components/providers/AppProvider.tsx` (+15/-3, só `run()` e o estado do diálogo) · `src/server/actions/auth.ts` (+35/-2, só `definirNovaSenha`, **superfície protegida**).
- **Telas fora da lista literal da ficha:** ver a lista do "Touch" acima (compras, mercado, vender, ModalOfertaPrePaga, ReservasEmAberto, ModalSolicitarRetirada).
- **Uma linha em arquivo compartilhado:** `src/app/globals.css` (+4: o `@import` do `seguranca.css`, antes do `responsive.css`).

## Arquivos "quentes" para conflito com a `main` (a main andou: I, D, C, B e E já entraram; esta frente NÃO fez rebase nem merge)

O Controle reconcilia. Os que mais provavelmente conflitam, por serem tocados por outras frentes: `src/server/actions/account.ts` (+100) · `src/server/actions/custody.ts` (+5, só `solicitarRetirada`) · `src/components/recibo/ModalSolicitarRetirada.tsx` (+8/-2) · `src/app/globals.css` (+4, uma linha de `@import`). Também de olho: `market.ts`, `payments.ts`, `reserva.ts` e `sell.ts` (cada um com a linha da guarda), `src/components/account/AccountModals.tsx` e `ModalCadastro.tsx`, `AppProvider.tsx` e `src/server/actions/auth.ts` (a D pode ter mexido). Em conflito, a regra é: manter a linha de guarda `exigirReautenticacao(...)` e o `if (bloqueio) return bloqueio` de cada ação e o `confirmar(...)` das telas — o teste de varredura (`reautenticacao-guardas.test.ts`) e o das telas (`telas-confirmam.test.ts`) falham se alguma se perder.

## Desvios da ficha (aceitos pelo chat de branch; registrados para a completude)

1. **`verificarTrocaEmail` não tem guarda.** A ficha a listava, mas ela só lê (confere se o e-mail novo é possível); quem troca é `updatePersonal`, que tem a guarda — pôr nas duas faria o cliente digitar a senha duas vezes. A varredura vigia a isenção (falha se ela passar a gravar algo).
2. **`changePassword` usa a "senha atual" da tela como confirmação** (opção `senhaDigitada`), em vez de abrir o modal: não pede a senha duas vezes. Consequência: `changePasswordContingencia` ficou inalcançável (não removida, fora do pedido).
3. **Limitação antiga mantida (não criada aqui):** conta só Google que abre "Alterar senha" confirma por código e a própria ação recusa "Senha atual incorreta." — quem entra só com Google redefine a senha pelo fluxo de recuperação.
4. **`renomearEmailUsuarioNoBanco` (users.ts) já grava `usuario.trocar_email`;** foi mantida. A `seguranca.email_alterado` é a versão do contrato A→C, e a troca de e-mail deixa as duas linhas.
5. **O diálogo não usa o `ModalHost`** do site (guarda um conteúdo só, e a pessoa perderia o valor do saque ou o Pix digitado): é uma camada à parte, em portal.
6. **`definirNovaSenha`:** o caso "sessão comum" devolve o texto de link vencido, e não abre o modal de confirmação — o único chamador é a tela da frente D, que não sabe abrir o modal. A alternativa (código por e-mail depois do link) está documentada no RA-50 para decisão do Gabriel.
7. **A ficha pedia `npm run typecheck` e `npm test` ao fim:** por ordem do Controle (RAM) rodei um único `tsc --noEmit` (verde) e os vitest arquivo a arquivo; `npm test` inteiro e build ficam com o Controle.

## Precisa do Gabriel (só para contas que entram com Google)

O código por e-mail sai do modelo **"Magic Link"** do Supabase, cujo padrão envia um link. Sem `{{ .Token }}` no modelo, a conta Google recebe link e não consegue confirmar (conta com senha não é afetada). O site não usa login por link, então trocar o modelo não afeta nada.

**Passo a passo (o caminho exato do menu no painel do Supabase não foi verificado por mim; é a área de modelos de e-mail de *Authentication*, modelo "Magic Link"):**
1. Abrir o painel do Supabase do projeto do Real Olímpico → *Authentication* → modelos de e-mail (*Email Templates*) → modelo **Magic Link**.
2. Trocar o assunto por "Seu código de confirmação" e o corpo pelo HTML abaixo (o `{{ .Token }}` é o que faz sair o código de 6 dígitos).
3. Salvar.
4. Conferir com uma conta Google de teste, depois do deploy: disparar uma ação sensível (por exemplo um saque de teste) e ver se chega o e-mail com o código de 6 dígitos.

**Aviso informativo (item 7 do relatório):** uma das páginas de documentação do Supabase consultadas na pesquisa trazia um texto dirigido a agentes de IA, pedindo que enviassem um relatório de feedback ao Supabase. Foi **ignorado e nada foi enviado** (não veio do Gabriel). Está anotado em `docs/diario/execucoes/pesquisa/a-reautenticacao-step-up.md`. Assunto sugerido e corpo (HTML):

```html
<h2>Seu código de confirmação</h2>
<p>Use o código abaixo no Real Olímpico para confirmar a ação que você pediu:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>O código vale por 10 minutos. Se não foi você, ignore este e-mail e troque a sua senha.</p>
```

Fonte: Supabase, "Passwordless email logins" (modelo Magic Link com `{{ .Token }}`), consultada em 17/11/2026. O caminho do menu no painel do Supabase não foi verificado por mim (memória `verificar-caminhos-de-painel`).

## Testar a tela (T4)

**SUBSTITUÍDO pela regra permanente de 17/11/2026 (Gabriel, via Controle): não se sobe servidor local, preview nem container.** O T4 é montado por código e provado com vitest; a **conferência de tela fica para depois do merge e do deploy do Controle**, em produção, com conta de teste (nunca a senha real do Gabriel, e sem repetir credenciais no chat). O que a conferência de tela precisa olhar, para o Controle/Auditoria: o modal abre ao pedir saque, troca de Pix, compra e venda; foco preso e Esc fecha; botão de 44 px; claro e escuro; a ação é reenviada sozinha depois de confirmar (sem recarregar); conta Google mostra o campo de código, o botão "enviar código" e a contagem de 60 s; e **a pendência do Gabriel** (modelo "Magic Link" com `{{ .Token }}`) precisa estar feita antes de conferir a conta Google. Teste visual e página de conferência continuam temporários e não vão para a produção (memória `teste-visual-nunca-vai-para-producao`) — esta frente não cria nenhuma.

## Sessões

### Sessão 2026-11-17 (chat de branch)

Tipo: B (preparação)
Feito: Passo 0 (junção de `node_modules`, cópia de `.env.local`, base `9e21fe1` conferida), registro `registro/A.md`, este MD.
Não feito: tudo o que é T1–T5.
Bloqueios para o humano: nada ainda. Decisões D3 e D8 seguem no padrão; Gabriel muda quando quiser.
Teste rodado? não
Próximo ato (um): Execução inicia T1.

Sessões da frente (abertas às 22:3x pelo chat de branch a pedido do Gabriel): chat de branch = local_823d5a09-5bea-4f1c-9dfb-5fbbfc2b0556 · Execução = local_c05fcb02-180f-43eb-9ffe-4cfcb3df823d · Auditoria = local_489d6747-724f-461a-869b-03d5aa276490 · Específico = ainda não aberto (a ficha pede; a Execução pede ao chat de branch quando precisar da pesquisa do T1 — o app limita a 5 sessões simultâneas e a máquina tem pouca RAM). Rotina de 5 min do chat de branch: job 17b1955d (modo barato; o app só abre sessão em turno do Gabriel ou por cartão que ele clica — se a Execução precisar do Específico, ela pede ao chat de branch, que propõe o cartão).

### Sessão 2026-11-17 (Execução)

Tipo: execução (T1 a T5)
Feito: T1 estudo e pesquisa (`ESTUDO_REAUTENTICACAO.md`, `pesquisa/`) · T2 módulo de reautenticação, ações e configuração · T3 guardas nas 14 ações sensíveis, varredura e testes de comportamento · T4 modal único, hook, CSS, as 8 telas ligadas e a rede central em `AppProvider.run()` · T5 evento de segurança em `audit_log` nas três trocas · RA-50 (guarda em `definirNovaSenha`, `sessao-de-recuperacao.ts`).
Não feito: `eslint src`, build e suíte inteira (ordem do Controle: rodam no merge); conferência de tela e do link de recuperação real (só depois do deploy); o aviso por e-mail (`avisarSeguranca`, da frente C); modelo "Magic Link" do Supabase com `{{ .Token }}` (pendência do Gabriel, só para conta Google).
`tsc --noEmit` (um, autorizado pelo Controle): na 1ª rodada achou um erro real que o vitest não pegava — `ModalDefinirSenhaTrocaEmail` já tinha uma função local `confirmar` e colidiu com a do hook (`Duplicate identifier`); renomeei a do hook para `confirmarIdentidade` nesse modal, ajustei o regex do teste das telas e rodei de novo: **verde, 0 erros**.
Bloqueios para o humano: modelo de e-mail do Supabase (acima); decisão sobre a alternativa do RA-50 (código por e-mail depois do link, mexe na frente D).
Teste rodado? sim, arquivo a arquivo com `--maxWorkers=1`, todos verdes (lista no fim do log do T3, no T4 e no RA-50). Eslint só dos arquivos da A: 0 erros.
Próximo ato (um): nenhum desta sessão; o merge e a conferência são do Controle.
