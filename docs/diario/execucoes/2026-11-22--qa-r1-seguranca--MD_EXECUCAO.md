# MD de execução — QA Davi 22-11 | R1 Segurança e dados

## RETOMADA (ler primeiro)
- **Estado:** B01 corrigido no código (visão por usuário) e testado; A08 virou pergunta; CSP em modo relatório e cookie Supabase Secure escritos; causa provável do 418 corrigida (fuso das datas); A09 só com texto proposto. **Nada commitado, nada no ar, sem build local.**
- **Falta (não é deste chat):** commit/deploy pelo Merge/Deploy; Tester com 2 contas de teste do repositório (view-source + `/api/state`); decisões do Gabriel (ver abaixo); logs da Vercel e contagem de clientes reais (incidente §5).
- **Garantia:** `docs/manutencao-2026-11/garantias/GARANTIA_DE_EXECUCAO__Relatorio_QA_Davi_22-11.md` · Plano R1: `PLANO_HIPERDETALHADO__…` · Incidente: `INCIDENTE_B01_22-11.md` · A09: `A09_PROPOSTA_BANNER_COOKIES.md`.

## Confirmação antes de editar
B01 existia hoje: `(app)/layout.tsx` passava `initialState={state}` e `/api/state` devolvia `{ state }` inteiro (ambos desde `ea0a5f3`, 15/08/2026).

## Mapa de leituras de `state.*` em componentes (todas conferidas)
- **Só dado da própria conta** (continuam funcionando com a visão): AvisoDebitoCustodia, FaturasCustodia, ResumoDaCustodia, CancelarEnvio, BlocosDeMoedas, ResumoDaConta, MinhasOfertas, ModalEditarLote, Certificate, CoinPicker, Topbar, conta/*, envios, compras, vender, recibos/[coinId], extrato.
- **Liam `state.users` de todos → trocadas por `state.publico`:** HomeStats e mercado (total de moedas), recibos/page (estoque por tipo), recibos/auditoria (estoque, saldo, taxas, comissões, envios).
- **Livro/histórico público (mantido, e-mail de terceiros vira pseudônimo):** sellOffers, buyOrders, trades; `vendedoresPausados` (ação de bloqueio) também pseudonimizada.
- Rotas/ações de servidor (`/api/rastreios`, etiqueta, `custody.ts`) leem o estado completo no servidor e não o devolvem.

## Tópicos
| Tópico | Estado | Arquivos |
|---|---|---|
| B01 visão por usuário | feito, testado | `src/domain/estado-do-usuario.ts` (+ `.test.ts`, 9 testes), `src/server/estado-do-usuario.ts`, `(app)/layout.tsx`, `api/state/route.ts`, `api/state/conta-desativada.test.ts`, `server/actions/bloqueio-por-debito.ts`, `types.ts` (campo `publico`, `EstoquePublico`, `ResumoPublico`), HomeStats, mercado/page, recibos/page, recibos/auditoria/page |
| Incidente | escrito | `garantias/INCIDENTE_B01_22-11.md` |
| A08 | **pergunta ao Gabriel** — a tela de auditoria segue mostrando saldo/receita da empresa (agora via `publico.auditoria`, sem dado de terceiro). Se for ocultar: trocar por checagem de `admin` em `resumoPublico`. | — |
| CSP | `Content-Security-Policy-Report-Only` em `next.config.mjs`; não bloqueia. Passo seguinte: ler violações no console logado e só então trocar para bloqueante (e nonce no lugar de `unsafe-inline`). | `next.config.mjs` |
| Cookie `sb-…-auth-token` Secure | em produção `secure: true` no `jar.set` do cliente Supabase | `src/server/auth/client.ts` |
| Erro React 418 | causa provável: `fdate/fdatetime` usavam o fuso da máquina (servidor UTC × navegador Brasília). Fixado `America/Sao_Paulo`. **Confirmar no navegador logado em Mercado/Compras/Recibos** — não consegui reproduzir sem servidor. | `src/domain/dates.ts`, `ResumoDaConta.tsx` |
| A09 | texto proposto, **não ligado** | `garantias/A09_PROPOSTA_BANNER_COOKIES.md` |

## Superfície protegida tocada (autorizada pelo plano R1)
- `src/domain/types.ts`: só **acréscimo** em `AppState` (`publico?`) e dois tipos novos. Nenhum campo existente mudou. (O arquivo tem também uma alteração da T5 no `Trade`, não minha.)
- Server Actions: nenhuma mudou de contrato; só `situacaoDoBloqueioPorPendencia` devolve pseudônimos nos `vendedoresPausados` (próprio e-mail intacto).
- `constants.ts`, `fees.ts`, `market.ts`, contrato de `store/types.ts`: não tocados.

## Verificação (local, sem build)
- `npx tsc --noEmit`: limpo.
- vitest: `estado-do-usuario.test.ts` (9), `api/state` (2), `session-core` (barreira de import — por isso o segredo do pseudônimo vem de `process.env.SESSION_SECRET`, não de session-core), `bloqueio-por-debito`, `dates`/`dias-uteis`, `components/home`: passam.
- Teste obrigatório: payload serializado da visão de A não contém e-mail/CPF/Pix/banco/endereço/telefone/senha/rastreio/depósito de B (e vice-versa), nem e-mail de terceiros em ofertas, lances, negociações.

## Riscos / cuidados para o Merge/Deploy
- Arquivos que outros chats também editam: `src/domain/types.ts`, `src/domain/dates.ts` (R3: dias úteis). `git add` por caminho; conferir `git diff` desses dois antes.
- Após o deploy: abrir `/inicio`, `/mercado`, `/compras`, `/recibos`, `/recibos/auditoria` com conta de teste e ver que carregam (números de estoque e auditoria preenchidos); view-source sem o e-mail de outra conta de teste.
- A rotina de 5 min por CronCreate não foi armada: a execução coube numa só sessão e terminou sem espera.

## Perguntas ao Gabriel
1. A08 — manter saldo/receita da empresa visíveis a todo cliente, ou só equipe?
2. A09 — banner de cookies e citar a Meta na Política (texto em `A09_PROPOSTA_BANNER_COOKIES.md`).
3. Incidente — comunicação à ANPD/titulares (com o jurídico); quantos clientes reais havia na janela; logs da Vercel.

## Resposta à Auditoria (22/11)
- Teste de payload: já existia (`src/domain/estado-do-usuario.test.ts`); ampliado com reservas (só as minhas, outra ponta e `oferta.seller` pseudonimizados) e com a outra ponta das minhas negociações. Cobre fee/coinIds/pagoAntecipado saindo, `pass` removido, cadastro/Pix/banco/endereço de terceiros ausentes.
- `publico.estoque.reciboCodigo`: **não é segredo.** É o código sequencial público (`REC-000042`), o mesmo que a auditoria já mostrava a todo cliente e que a planilha exportada já continha ("o certificado é público: quem tem o código consulta" — `selectors.ts`). O que autentica é o hash SHA-256, que **não** vai no estoque, e a leitura do certificado exige ser o dono (`recibos/[coinId]` dá 404 a quem não é). Conclusão: exposição aceita, sem dono associado.
- A08, comunicação ANPD/LGPD art. 48 e checagem de logs de acesso: registradas como perguntas ao Gabriel (seção "Perguntas ao Gabriel" acima e `INCIDENTE_B01_22-11.md` §5).

## Item a item, com arquivo:linha (22/11, pedido da Auditoria)
| Item | Onde |
|---|---|
| B01 — regra da visão | `src/domain/estado-do-usuario.ts:42` (`estadoDoUsuario`), `:117` (`resumoPublico`); pseudônimo HMAC em `src/server/estado-do-usuario.ts` |
| B01 — layout | `src/app/(app)/layout.tsx:80` |
| B01 — `/api/state` | `src/app/api/state/route.ts:62` |
| B01 — ação de bloqueio | `src/server/actions/bloqueio-por-debito.ts:34` |
| B01 — telas via `publico` | `HomeStats.tsx:39`, `mercado/page.tsx:221`, `recibos/page.tsx:66`, `recibos/auditoria/page.tsx:56-61` |
| B01 — teste | `src/domain/estado-do-usuario.test.ts` (11 testes) |
| A08 | `recibos/auditoria/page.tsx:61` (`publico.auditoria`) — pergunta ao Gabriel, não ocultado |
| CSP | `next.config.mjs:10` (política) e `:44` (cabeçalho Report-Only) |
| Cookie Secure | `src/server/auth/client.ts:29` |
| React 418 | `src/domain/dates.ts:23,27,33-34` (fuso fixo); `ResumoDaConta.tsx:45` |
| A09 | `docs/manutencao-2026-11/garantias/A09_PROPOSTA_BANNER_COOKIES.md` (não ligado) |

Perguntas ao Gabriel (todas abertas): A08 (receita/saldo da empresa visível a todo cliente?), A09 (banner de cookies e Meta na Política), ANPD/LGPD art. 48 (comunicar? com o jurídico), checagem dos logs de acesso da Vercel e contagem de clientes reais na janela.

## Varredura de outras rotas + teste de regressão (decisão do Gabriel: resolver e impedir recorrência)
Decisão registrada pelo Controle: sem comunicação à ANPD/titulares e sem jurídico (ver `INCIDENTE_B01_22-11.md` §7) — as perguntas A09/A08 seguem abertas; a de ANPD está **encerrada pelo Gabriel**.

**Varredura (grep em `src/app/**`, route handlers, server components, ações):** nenhum outro caminho entrega estado de terceiros.
| Quem lê `getState()` em `src/app` | O que sai |
|---|---|
| `(app)/layout.tsx:80`, `api/state/route.ts:62` | `visaoDoUsuario` |
| `cadastrar`, `entrar`, `page.tsx` (raiz) | nada: só `state.users[session]` para redirecionar |
| `(app)/recibos/[coinId]/page.tsx` | só o `coinId`; 404 para moeda alheia |
| `api/envios/etiqueta/[protocolo]` | filtra pelo dono ou permissão `logistica.etiquetas` |
| `api/rastreios` | filtra pelos protocolos do dono |
| `(admin)/admin/bancada`, `configuracao` | páginas do painel; contagens/fila, com permissão conferida na página |
| `server/mercado/destaques.ts` (landing) | só agregados (`destaqueDeMercado`), sem ofertas individuais |
Server Actions: nenhuma devolve `AppState`/`users`/`trades` inteiros (as ocorrências em `custody.ts` são varreduras internas dentro de `mutateState`). Props `state={...}`/`initialState=` em componentes: só o `initialState` do layout (visão).

**Teste de regressão:** `src/server/estado-nao-vaza.test.ts` (6 testes), varredura estática do código:
1. todo `initialState={...}` tem de ser `visaoDoUsuario(...)`;
2. nenhum arquivo faz `JSON.stringify(state|estado|getState())` (exceto a comparação do AppProvider);
3. nenhuma rota/página devolve `{ state }` sem a visão; `api/state` precisa conter `state: visaoDoUsuario(state, session)`;
4. páginas/layouts do `(app)` não passam `state={state}` a componente;
5. **lista fechada** das rotas/páginas de `src/app` que chamam `getState()` — a nova quebra o teste e obriga a pergunta "isto devolve dado de outra conta?";
6. Client Component não importa `@/server/state` nem `@/server/estado-do-usuario`.
Provado que pega: com uma rota temporária `NextResponse.json({ state })` o teste falhou (rota removida em seguida). tsc limpo; 30 testes dos arquivos de estado/sessão passam.

## A09 banner + CSP bloqueante + cookie Secure (pedido do Gabriel via Controle, 22/11 — "nada fica aguardando decisão")
Depósito mínimo: Gabriel não quer mínimo; fica como está (R$ 0) — nada feito.
| Item | O que ficou | Onde |
|---|---|---|
| Banner de cookies | faixa com texto da proposta; "Recusar" e "Aceitar" com o mesmo peso; "Saiba mais" → `/privacidade`; só aparece se `META_PIXEL_ID` existe e fora das áreas sem rastreio | `src/components/cookies/BannerDeCookies.tsx`, `useConsentimento.ts`, `src/styles/cookies.css` (import em `globals.css`), montado em `src/app/layout.tsx` |
| Escolha | localStorage `ro-cookies` + cookie `ro_cookies` (1 ano, SameSite=Lax, Secure em https) para o servidor ler | `src/lib/cookies/consentimento.ts` |
| Pixel só após Aceitar | `MetaPixel` trata `pixelId` como null até "aceito": não carrega `fbevents.js`, não grava `_fbp`, não manda PageView; se recusa depois, `fbq('consent','revoke')` | `src/components/meta/MetaPixel.tsx` |
| API de Conversões só após Aceitar | `registrarCadastroNaMeta` não envia sem `ro_cookies=aceito`; o cadastro segue normal e devolve o ID | `src/server/meta/cadastro.ts` |
| CSP bloqueante | cabeçalho `Content-Security-Policy` (não mais Report-Only), política em `src/lib/seguranca/csp.mjs` com origens deduzidas do código: Meta (`connect.facebook.net`, `*.facebook.com`), Supabase (`*.supabase.co`, wss, mídia assinada), Mercado Pago (`*.mercadopago.com`, `*.mlstatic.com`, `*.mercadolibre.com`); sem `form-action` (login Google redireciona); `unsafe-eval` só em dev; `unsafe-inline` continua (Next sem nonce) | `next.config.mjs`, `src/lib/seguranca/csp.mjs`, `csp.d.mts` |
| Cookie `sb-*` Secure | confirmado: único ponto que os grava é `src/server/auth/client.ts:29` (`secure:true` em produção); quem já tinha o cookie só renova depois de sair e entrar | — |
| Testes | `src/lib/seguranca/csp.test.ts` (6), `src/lib/cookies/consentimento.test.ts` (4), `src/server/meta/consentimento.test.ts` (3: sem escolha/recusado/aceito); `src/server/meta` e `src/lib/meta` seguem verdes; tsc e eslint limpos | — |

**Riscos reais a conferir no ar (não consegui ver sem navegador):** (1) a CSP bloqueante pode derrubar alguma origem que só aparece em tela que não li (checar console em Início, Mercado, pagamento Pix/cartão, bancada com vídeo, login Google, PDF/XLSX); se algo quebrar, o ajuste é uma linha em `csp.mjs`. (2) Rollback imediato: trocar a chave em `next.config.mjs` para `Content-Security-Policy-Report-Only`. (3) A Política de Privacidade (texto jurídico versionado) **não** foi alterada: ainda não cita cookies/Meta — RA-61 atualizado dizendo isso.
