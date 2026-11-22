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
