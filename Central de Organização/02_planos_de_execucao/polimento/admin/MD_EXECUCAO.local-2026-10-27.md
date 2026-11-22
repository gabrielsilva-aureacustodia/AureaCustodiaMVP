# MD de execução — `feat/admin-real-olimpico` (Frente 5 — Painel administrativo)

```
Worktree:   C:\dev\AureaCustodiaMVP-admin   (node_modules = junção; remover só com git worktree remove)
Base:       main @ d0398d5 (24/10/2026)
Agente:     Claude Code (ou outro de código), aberto pelo Gabriel nesta pasta
Depende:    contrato de tokens da Frente 1 (commit "Contrato de tokens:" em feat/brandbook-real-olimpico)
Merge:      no chat orquestrador, ordem 1 → 2 → 3 → 4 → 5
Porta:      npm run dev (autoPort; se ocupada, 3105)
```

## Regras de eficiência (Regras_eficiencia_de_sessao_v1.1) — prevalecem sobre o resto deste documento
- **Leia só:** `CLAUDE.md`; `docs/Regras_eficiencia_de_sessao_v1.1.md`; `docs/diario/RITUAL_DE_SESSAO_RESUMO.md`;
  `src/app/(admin)/README.md` (mapa de rotas e permissões); `docs/PLANO_EXECUCAO_ADMIN.md`;
  `docs/EXECUCAO_FINAL_AGENTE_C.md`; `src/domain/admin/permissoes.ts` (**só leitura**, catálogo de permissões);
  `src/app/(admin)/**`, `src/app/painel/**`, `src/components/admin/**`, `src/styles/admin.css`. Frontend:
  `C:\dev\aprendizado_frontend\{RITUAIS.md,AGENTS.md}`, `20_mais_sites_e_repos_estudados.md`,
  `33_bibliotecas_componentes_cli_mcp.md`, `34_apostilas_design_grafico_e_malha.md`,
  `35_licoes_aplicacao_k2con_rodadas_5_6.md` (§5 tabela larga, §6 nome acessível), `toolkits/direcao-de-design/**`,
  `toolkits/pesquisa-na-vm/README.md`, `ferramentas/{auditoria-botoes-campos.py,auditoria-tabelas-largas.py}`,
  `topicos/29-checklist-qa-final.md`, `topicos/35-ux-acoes-formularios-celular-desktop.md`. Modelo K2CON (painel
  administrativo de parceiros): `C:\dev\K2CON\docs\arquitetura\DESIGN_SYSTEM.md` (checklist B4b). Depois do merge da
  Frente 1: `docs/marca/BRANDBOOK_REAL_OLIMPICO.md` e `docs/polimento/brandbook/RECOMENDACOES_AS_FRENTES.md`.
- **Prioridade:** (1) inventário (rotas, permissões, ações, auditoria); (2) benchmarking; (3) casco do admin (menu
  agrupado por tarefa, cabeçalho, busca/atalhos, gaveta mobile) e `/admin` inicial (alertas: saques pendentes,
  inadimplência, fila da bancada); (4) operação diária: `saques`, `bancada`, `logistica`, `moedas`, `usuarios`, `cs`;
  (5) gestão: `resultados/*`, `configuracao`, `equipe`; (6) tokens novos.
- **Segmentação:** um agente só nesta branch. Sem subagentes.
- **MD de execução:** este arquivo; atualizar "Sessões" a cada grupo de telas fechado.
- **Verificação:** typecheck, lint, test, build só no fim. **Commits:** nenhum (o orquestrador commita no merge).
- **Tipo da branch:** execução.

## Regras que não se negociam
- **JAMAIS remover** função, regra de negócio, alíquota, taxa, dado, relatório, auditoria, usuário, papel ou permissão.
  Mexer na disposição, no fluxo e na facilidade de uso, sim; melhorar uma função, pode; excluir, nunca.
- **Toda página e toda Server Action de `src/server/actions/admin/` continuam conferindo a permissão por conta
  própria**; o menu só esconde. Toda ação continua gravando `admin.<area>.<verbo>` em `audit_log`. Esta frente não
  edita `src/server/**` — se uma melhoria de UX exigir mudança lá, vai para `PROPOSTAS_BACKEND.md`.
- `/painel` continua sendo o link da equipe; sem sessão ou fora da equipe, `/admin/*` manda para `/painel`, nunca para
  `/entrar` ou `/inicio` (RA-48). Quem está em `AUREA_ADMIN_EMAILS` entra como `dev` (RA-40).
- A bancada web fecha a análise pelo mesmo serviço da estação (`src/server/estacao/analise.ts`); a fórmula do hash não muda.
- `/admin/configuracao` continua editando taxas, catálogo, limites, prazos e canais — com o histórico
  (`config_historico`) e a publicação de versão da Tabela de Taxas e dos Termos. Os campos e validações não mudam.
- Saque: aprovar, pagar por fora, conferir e recusar exigem `saques.pagar`; ver a fila, `saques.ver`.
- DRE e resultados: sem alíquota em código; os percentuais vêm de `parametros_contabeis`. NFS-e: só exibição.
- Superfície protegida intocada (`src/domain/**`, `src/server/**`, `api/`, migrations). Terminologia jurídica e marca
  como no `CLAUDE.md`.

## Entregas
1. `docs/polimento/admin/INVENTARIO.md` — cada rota de `(admin)` e `painel`, a permissão que a página confere, cada
   botão/ação, a Server Action que chama, a permissão dela e o verbo de auditoria. Lista de verificação do fim.
2. `docs/polimento/admin/BENCHMARK.md` — painéis de finanças, trading, contabilidade, marketplace, leilões e
   coleção (Stripe Dashboard, Mercado Pago, Shopify Admin, Conta Azul, QuickBooks, Xero, Linear, Retool/Refine/React
   Admin, Intercom/Zendesk para o CS, painéis de consignação de casas de leilão como Heritage/Catawiki, sistemas de
   registro de acervo de museus como Collective Access): navegação, densidade, filtros, ações em lote, fila de
   trabalho, confirmação de ação sensível, trilha de auditoria visível, mobile. Capturas pela VM (sessão `ro-admin`;
   telas logadas só onde houver demo pública), **comparação explícita com os métodos do repositório de frontend**,
   decisões no fim.
3. Redesenho do casco e de todas as telas (tabelas largas com 1ª coluna fixa; filtros na URL quando já existirem;
   confirmação com objeto no nome — "Confirmar: pagar o saque de R$ X a Fulano"; estados vazio/erro/carregando;
   componente de marcação sem `"use client"` quando possível).
4. `docs/polimento/admin/PROPOSTAS_BACKEND.md` — melhorias que mexeriam em regra, permissão, ação ou dado, cada uma
   com o porquê explicável ao Rogério. Nada aplicado.
5. `src/app/(admin)/README.md` atualizado se a disposição das rotas na tela mudar (as URLs não mudam).

## Touch
UI de `src/app/(admin)/**` e `src/app/painel/**`, `src/components/admin/**`, `src/styles/admin.css`, `docs/polimento/admin/**`.

## Do not touch
`src/domain/**` (inclusive `admin/permissoes.ts`), `src/server/**`, `api/`, migrations, `tokens.css`, `base.css`,
`src/components/ui/**`, `src/brand/**` (Frente 1), landing e plataforma (Frentes 3 e 4), `responsive.css` (Frente 4 —
regra mobile do admin vai no `admin.css`).

## Sessões

### S1 — 25/10/2026 (Claude Code, Opus 5.5)

**Abertura.** `git status`: só `docs/polimento/` não rastreado; `git log -3`: d0398d5, 8601395, 89aeb52. Porta 3105.
**Achado que mudou o plano de teste:** o `.env.local` da worktree aponta para o **Supabase de produção** (com
`AUREA_STORE_KEY` separada só para o estado) e tem as credenciais reais de Correios, Mercado Pago e do certificado da
NFS-e; o login é só pelo Supabase Auth, e a senha `12345678` do seed foi recusada. Clicar em "pagar saque", "emitir
etiqueta" ou "reprocessar NFS-e" ali teria efeito real. Por isso o servidor de teste desta frente sobe por um lançador
no scratchpad (`dev-sem-banco.mjs`, config `admin-dev` do `.claude/launch.json` da pasta principal) que **zera no
processo** `POSTGRES_URL*`, `SUPABASE_*`, `MP_*`, `CORREIOS_*`, `NFSE_*`, `KV_*`/`UPSTASH_*` (o `@next/env` não
sobrescreve variável já definida), com `SESSION_SECRET` de teste e `AUREA_ADMIN_EMAILS=gabrielsilva@testeaurea.com.br`;
a sessão de teste é um cookie assinado com esse segredo de teste. Tudo em memória: nada sai da máquina.

**Grupo 1 — inventário e benchmark (fechado).** `INVENTARIO.md` (rotas × permissão × botão × action × verbo da
trilha); auditorias adaptadas em `auditoria/` com os números "antes". `BENCHMARK.md` com a VM `ro-admin` (18 alvos;
Heritage e Catawiki deram 403; React Admin e CollectiveAccess pedem login de demonstração — não entramos), comparação
com o repositório de frontend e as decisões D1–D12. VM desligada.

**Grupo 2 — casco e Central de trabalho (fechado).** `navegacao.tsx` (três grupos por tarefa, rótulos únicos),
`AdminTopbar.tsx` (migalha nas fichas, busca, menu da conta), `BuscaDoPainel.tsx` (novo, Ctrl+K e `/`),
`AdminSidebar.tsx` (tema e sair viraram `<button>`), `layout.tsx` (pular para o conteúdo, `main#conteudo`),
`loading.tsx` (novo), `inicio/PainelInicial.tsx` ("Pede ação agora" × "Em dia"), `admin.css` (bloco "Polimento").
Teste no navegador: a topbar quebrava "Sair" em segunda linha → tema/voltar/sair foram para o menu da conta; no celular
o chip ficou só com o avatar; a gaveta media 1190 px por causa do `align-self` da barra fixa → corrigido.
**Cookie:** outro agente em outra porta de `localhost` grava `aurea_session` com outro segredo (cookie não separa
porta); os testes desta frente rodam em `http://127.0.0.1:3105`.

**Grupo 3 — operação e gestão (fechado).** `ConfirmarAcao.tsx` (novo): confirmação no lugar com o objeto no botão.
Aplicada em: saques (aprovar/reenviar; "Confirmar: pagar o saque de R$ X a Fulano"; recusa diz o valor total
devolvido), logística (cancelar etiqueta; `window.confirm` removido), registros (excluir com objeto, cancelar plano),
ficha do usuário (creditar/debitar com saldo antes→depois; desativar/reativar), equipe (tirar acesso de membro, excluir
papel), contábil (estornar lançamento nº N), notas fiscais (enviar fila / reprocessar recusadas, com a contagem).
Tabelas: `scope="col"` em 226 cabeçalhos, `<caption>` escondida nas 44, 1ª coluna fixa por uma regra só. Gestão:
`resultados/layout.tsx` + `SubnavGestao.tsx` (leva o período junto). Ficha do usuário: abas logo após o resumo, ações
na coluna da direita (≥1280 px) com "Zona de perigo"; configuração (aba Operacional) com "Nesta página"; bancada com a
fila primeiro e os cadastros sem envio no fim; filtros de usuários, acervo e logística com "Filtrar …" secundário,
"Limpar filtros (N)" só com filtro e gaveta "Filtros (N)" no celular; vazios por motivo nas listas principais; dicas
de teclado (`autoComplete="off"`, `inputMode`, `spellCheck`) nos formulários de dado de terceiro.

**Grupo 4 — documentação e fechamento (fechado).** `PROPOSTAS_BACKEND.md` (P1–P8, para o Rogério), READMEs de
`src/app/(admin)/` e `src/components/admin/` atualizados (URLs iguais), INVENTARIO §7 (depois) e §8 (fechamento),
lançador de teste guardado em `ferramentas/` (a entrada que eu tinha posto no `.claude/launch.json` da pasta principal
foi retirada; a do `landing-dev`, de outra frente, ficou como estava).

#### Feito
- Casco: menu em 3 grupos por tarefa, migalha nas fichas, busca Ctrl+K e `/`, menu da conta, pular para o conteúdo,
  gaveta mobile conferida, `loading.tsx`.
- Central de trabalho: "Pede ação agora" (saques, bancada, retiradas, faturas atrasadas, cadeia do livro-razão) com o
  botão do próximo passo; "Em dia" para o que está zerado; seções antigas mantidas.
- Confirmação com objeto em toda ação sensível; nenhum `window.confirm`.
- 44 tabelas com 1ª coluna fixa, legenda e `scope`; vazios por motivo; filtros com gaveta no celular e "Limpar filtros (N)".
- Gestão com faixa própria levando o período; ficha do usuário em duas colunas com Zona de perigo; bancada com a fila
  primeiro; configuração com "Nesta página".
- Nada removido: mesmas rotas, permissões nas páginas, Server Actions, argumentos e verbos de trilha (INVENTARIO).

#### Não feito (motivo)
- **Tokens novos da marca:** o commit "Contrato de tokens:" ainda não existe em `feat/brandbook-real-olimpico`
  (conferido no início e no fim). O redesenho usa só os nomes atuais de `tokens.css`; quando o contrato chegar, a troca
  é de nome de variável em `admin.css` (bloco "Polimento").
- **Clicar ações de linha** (pagar saque, etiqueta, excluir registro, estornar, quitar fatura) e **ver papel restrito
  barrado na tela:** o servidor de teste não tem banco (de propósito, ver acima) e a memória começa sem contas nem
  papéis. Coberto por leitura do código e pelos testes de permissão; P8 propõe um banco de teste com semente.
- **Ações em lote, contadores no menu, visões salvas, histórico por moeda, roteamento do CS, erro por campo:** pedem
  servidor → `PROPOSTAS_BACKEND.md`.
- **Capturas logadas de React Admin e CollectiveAccess:** pedem senha (demo/demo) em site de terceiro; não entramos.
  Heritage e Catawiki responderam 403 à VM.

#### Testes
`npm run typecheck` ✓ · `npm run lint` ✓ (0 erro, 17 avisos antigos fora desta frente) · `npm test` ✓ (148 arquivos,
1383 passaram, 1 pulado) · `npm run build` ✓. Navegador em `127.0.0.1:3105`: 21 rotas 200; RA-48 (fora da equipe e sem
sessão → `/painel`); desktop 1440 e 375 px, claro e escuro; sem erro de console; sem rolagem lateral a 375 px.
Auditorias antes × depois em INVENTARIO §7 (1ª coluna fixa 0 → 44; legenda 0 → 44; `window.confirm` 2 → 0).

#### Próximo
1. Merge (orquestrador). 2. Quando a Frente 1 commitar o contrato de tokens: `git merge feat/brandbook-real-olimpico`
e trocar as variáveis do bloco "Polimento" de `admin.css` pelos papéis novos. 3. Gabriel decide as propostas P1–P8.

**A branch está pronta para o merge.**

### S2 — 25/10/2026 (rodada 2: remodelagem com liberdade de disposição)

Pedido do Gabriel: "mais liberdade… remodelar bem o Admin para o melhor nível possível… reorganizar páginas, blocos…
só não mexe em features e bancos de dados". Régua escrita antes de mexer: `BRIEF_DE_DESIGN.md` (modelo
`toolkits/direcao-de-design`). Decisões D13–D22 no `BENCHMARK.md` §5; o que mudou de lugar no `INVENTARIO.md` §9.

**Dados de demonstração para enxergar as telas:** `ferramentas/gerar-estado-demo.test.ts` gera o `seedState()` do
projeto + 4 saques, e o lançador o carrega no store em memória (`preload-estado-demo.mjs`). Nada do servidor foi tocado.
Passo a passo em `ferramentas/README.md`.

#### Feito
- `Pecas.tsx` (novo): `Secao`, `Indicador`, `Selo`, `Abas`, `Vazio`; camada "Remodelagem" em `admin.css` (densidade,
  menos movimento, h2 de seção, abas sublinhadas, duas zonas, `<Cartao>` com o desenho do indicador).
- Central de trabalho em duas zonas (fila + seção da variante | contexto), fila de saques e "Ir para" na largura toda.
- Saques com abas por situação; Financeiro com barra de período/exportação, indicadores, gráfico de receita mês a mês
  (`GraficoMensal.tsx`, cor validada com a skill dataviz), DRE e receita por linha em duas zonas.
- Logística, Notas fiscais e Equipe com abas; Configuração em "ajustes" (seções à esquerda).
- Usuários com indicadores-link e selos; ficha do cliente com cartão de identidade; ficha da moeda com identidade,
  duas zonas e **linha do tempo de proveniência**; topbar das fichas diz "Ficha do cliente/da moeda".
- Indicadores e Uso com "Nesta página" e títulos h2.
- Celular: indicadores em 2 colunas, abas rolando de lado, padding menor; sem rolagem lateral a 375 px nas telas
  conferidas.

#### Não feito (motivo)
- CS, Bancada e Contábil mantiveram a disposição (só herdaram a camada visual): a CS e o Contábil dependem do banco para
  mostrar conteúdo, e a bancada já estava em fila | procedimento — sem dado para avaliar uma mudança maior com segurança.
- Tokens novos: o commit "Contrato de tokens:" ainda não existe em `feat/brandbook-real-olimpico`.

#### Testes
`typecheck` ✓ · `lint` ✓ (0 erro) · `test` ✓ (1383/1 pulado) · `build` ✓. Navegador (dados de demonstração, 127.0.0.1:3105):
Central, Saques e abas, Financeiro (gráfico conferido com dados injetados no DOM, já que sem ledger ele fica vazio),
Usuários, ficha do cliente, Auditoria de moedas, ficha da moeda, Indicadores, Configuração — desktop 1440 e 375 px,
claro e escuro, sem rolagem lateral. Auditorias: `auditoria/*-rodada2.txt`.

#### Próximo
Merge pelo orquestrador; tokens da Frente 1 quando o contrato chegar; decisões P1–P8.

**A branch está pronta para o merge.**

### S3 — 25/10/2026 (controle financeiro + publicação)

Pedido do Gabriel: seção financeira com custos recorrentes (periodicidade, setor, conta), todos os custos, taxas do
Mercado Pago, impostos e receitas, visual. Decisões dele: lançar sozinho todo mês; setores editáveis no painel;
permissão `contabil.lancar`; nesta mesma branch; testar em produção (sem Docker) e reverter se der erro.

- Feito: migration 046 (aditiva), `src/domain/financeiro/{controle,analise}.ts` (+32 testes), repositório, serviço,
  Server Actions (`contabil.lancar`, trilha `admin.financeiro.*`), passo no job diário `/api/cron/faturamento`, tela
  `/admin/resultados/controle` (visão geral com cascata, receitas por tipo, custos por conta/setor, impostos com
  alíquota, tarifas MP por meio, notas, próximos 30 dias; recorrentes com sugestões e prévia; lançamentos; setores).
- Testes: typecheck ✓ · lint ✓ · `npm test` 1414 (1 pulado) ✓ · build ✓ · PGlite 8 testes do banco novo ✓.
- Publicado: commit `3f58ed4` em `main` (fast-forward de d0398d5, inclui as rodadas 1 e 2 do painel); `db:migrate`
  aplicou a 046 em produção; deploy `dpl_5VmdFtULjFFgreY2YEf7uDpmmaWp` no ar; sem erro de execução nos 30 min.
  `docs/polimento/` fica fora do commit (arquivo de trabalho do orquestrador).
- Falta: teste logado em produção (precisa do login do Gabriel no navegador). Reverter, se preciso: `git revert 3f58ed4`
  e push no `main` (a 046 é aditiva e pode ficar).

### S4 — 25/10/2026 (rodada 3: redesenho com o brandbook)

Pedido do Gabriel: "todo um redesenho da estrutura do Admin, usando da frente de brandbook, usando dos nossos repos de
frontend, tudo em nível de qualidade máxima e UX design de alto nível."

- Feito: merge local de `feat/brandbook-real-olimpico` (`065b327`, sem push); `admin.css` nos tokens `--ro-*` e com a
  camada "A MARCA NO PAINEL"; `Pecas.tsx` delegando para `Selo`/`EstadoVazio` da marca; `ConfirmarAcao` com
  `.btn-danger`/`.btn-ghost`; logo do menu com `<LogoEmblema>`; esqueleto da marca no `loading.tsx`; avisos de
  "sem banco" (`AvisoSemBanco` das telas de resultado, Atendimento, Equipe, Contábil) e o de alíquotas nulas como `<Aviso>`; selos nas filas de
  saques e de notas; fila de saques em cartões no celular; hierarquia de título sem salto em Configuração, Equipe e
  Logística. Decisões D23–D28 no BENCHMARK §6.
- Revisão pela skill `revisao-de-design` (medida no navegador, 12 telas): um `h1` por tela, `main` único, link "Pular
  para o conteúdo", 2 famílias (Newsreader + Inter) e mono só em código, **0 par de texto abaixo de 4,5:1** nos dois
  temas, nenhuma rolagem lateral a 375 px. Único achado (salto h1→h3) corrigido (D28). Bom: ênfase — uma ação primária
  por bloco, perigo só em ação irreversível.
- Nenhuma função, regra, taxa, dado, relatório, permissão ou trilha saiu; nada em `src/server/**`, `src/domain/**`,
  migrations ou arquivos da Frente 1.
- Testes: typecheck ✓ · lint ✓ (0 erro; 0 aviso nos arquivos tocados) · `npm test` 1417 (1 pulado) ✓ · build ✓.
  Auditorias: `auditoria/*-rodada3.txt` (0 `confirm()`; 46 tabelas, todas com legenda e cabeçalho fixo).
- Não feito: commit e push (esperam o Gabriel); o merge do brandbook existe só nesta worktree.
