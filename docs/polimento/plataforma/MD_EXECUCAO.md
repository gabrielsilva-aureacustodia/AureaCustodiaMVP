# MD de execução — `feat/plataforma-real-olimpico` (Frente 4 — Plataforma do cliente)

```
Worktree:   C:\dev\AureaCustodiaMVP-plataforma   (node_modules = junção; remover só com git worktree remove)
Base:       main @ d0398d5 (24/10/2026)
Agente:     Claude Code (ou outro de código), aberto pelo Gabriel nesta pasta
Depende:    contrato de tokens da Frente 1 (commit "Contrato de tokens:" em feat/brandbook-real-olimpico)
            e ativos da Frente 2 (C:\dev\AureaCustodiaMVP-assets\public\visuais\)
Merge:      no chat orquestrador, ordem 1 → 2 → 3 → 4 → 5
Porta:      npm run dev (autoPort; se ocupada, 3104)
```

## Regras de eficiência (Regras_eficiencia_de_sessao_v1.1) — prevalecem sobre o resto deste documento
- **Leia só:** `CLAUDE.md`; `docs/Regras_eficiencia_de_sessao_v1.1.md`; `docs/diario/RITUAL_DE_SESSAO_RESUMO.md`;
  `docs/CATALOGO_DE_FEATURES.md`, `docs/PLANO_EXECUTIVO_FRONTEND_PLATAFORMA.md`, `docs/PLANO_EXECUTIVO_FASE2_FRONTEND.md`,
  `docs/pesquisa_benchmark_plataformas.md`, `docs/pesquisa_benchmark_fase2.md`, `docs/EXECUCAO_TUTORIAL_ONBOARDING.md`;
  `src/styles/README.md`; `src/app/(app)/**`; `src/components/{account,charts,custody,home,market,pagamento,recibo,reports,sell,shell,svg,tutorial}/**`;
  os CSS do Touch. Frontend: `C:\dev\aprendizado_frontend\{RITUAIS.md,AGENTS.md}`, `17_sites_e_repos_similares_estudados.md`,
  `20_mais_sites_e_repos_estudados.md`, `33_bibliotecas_componentes_cli_mcp.md`, `34_apostilas_design_grafico_e_malha.md`,
  `35_licoes_aplicacao_k2con_rodadas_5_6.md`, `toolkits/direcao-de-design/**`, `toolkits/pesquisa-na-vm/README.md`,
  `ferramentas/{auditoria-botoes-campos.py,auditoria-tabelas-largas.py}`, `topicos/29-checklist-qa-final.md`,
  `topicos/35-ux-acoes-formularios-celular-desktop.md` e os tópicos que esses citarem. Depois do merge da Frente 1:
  `docs/marca/BRANDBOOK_REAL_OLIMPICO.md` e `docs/polimento/brandbook/RECOMENDACOES_AS_FRENTES.md`.
- **Prioridade:** (1) inventário (telas, ações, Server Actions, âncoras do tutorial); (2) benchmarking; (3) shell
  (menu, cabeçalho, gaveta mobile) e `/inicio`; (4) `/mercado`, `/vender`, `/compras`; (5) `/conta/**`, `/recibos/**`,
  `/envios`, `/retirada`, `/relatorios`; (6) tutorial migrado; (7) tokens novos e ativos.
- **Segmentação:** um agente só nesta branch. Sem subagentes.
- **MD de execução:** este arquivo; atualizar "Sessões" a cada grupo de telas fechado.
- **Verificação:** typecheck, lint, test, build só no fim. **Commits:** nenhum (o orquestrador commita no merge).
- **Tipo da branch:** execução.

## Regras que não se negociam
- **Nenhuma feature some, nenhuma regra muda, nenhuma função nova desnecessária.** Reorganizar blocos, sim; excluir, nunca.
- Superfície protegida intocada: `src/domain/**`, `src/server/**` (inclusive `actions/`), `api/`, migrations, contrato
  de `src/server/store/types.ts`. Página só muda a apresentação, nunca o que busca ou chama no servidor.
- Nada de `@/server/*` em Client Component. Dinheiro em centavos (`Cents`), formatado pelas funções que já existem.
- Avisos de regra continuam visíveis e corretos: `AvisoDebitoCustodia` ("Custódia a pagar", também em `/vender`),
  `LinhaCustodiaNaCompra` ("Custódia (1º mês)" com o (i)), depósito **simulado** dito na tela, prazos e travas.
- O rótulo **"código simulado"** do QR do recibo não sai. Sem anéis olímpicos na arte da moeda (`components/svg`).
- Terminologia jurídica: proibido token, NFT, cripto, ativo digital, ativo, investimento, investidor, corretora,
  rentabilidade, retorno (exceção: `/mercado/comparacoes`, que descreve o mercado externo). Marca Real Olímpico.
- CSS global por área, nomes de classe do monolito, sem CSS Modules; `responsive.css` (seu) continua o último import.
  Toque mínimo 44px.

## Entregas
1. `docs/polimento/plataforma/INVENTARIO.md` — cada rota de `(app)`, cada botão/ação e a Server Action ou rota que ela
   chama, cada aviso de regra, e cada âncora/seletor que o tutorial (`src/components/tutorial/**`) usa. É a lista de
   verificação do fim.
2. `docs/polimento/plataforma/BENCHMARK.md` — apps de finanças, trading, contabilidade, marketplace, leilões e
   coleção/arte (Nubank, Inter, XP, Robinhood, Mercury, QuickBooks, Conta Azul, StockX, eBay, Catawiki, Heritage,
   Sotheby's, PCGS Set Registry, Numista; Coinbase/Binance só como UX de livro de ofertas): dashboard, acervo, livro
   de ofertas, compra/venda, extrato, faturas, comprovantes, estados vazios, mobile. Capturas pela VM (sessão `ro-app`),
   **comparação explícita com os métodos do repositório de frontend**, decisões no fim.
3. Redesenho tela a tela (tabela larga com 1ª coluna fixa; nome acessível único por destino; componente de marcação
   sem `"use client"` quando possível; estados vazio/erro/carregando).
4. **Tutorial migrado:** âncoras e passos atualizados junto com os blocos; tour inteiro rodando nas rotas novas, desktop e celular.
5. `docs/polimento/plataforma/PROPOSTAS_BACKEND.md` se houver sugestão de regra/backend (sem aplicar).

## Touch
UI de `src/app/(app)/**`, `src/components/{account,charts,custody,home,market,pagamento,recibo,reports,sell,shell,svg,tutorial}/**`,
`src/styles/{shell,home,market,wizard,recibo,reports,account,pagamento,tutorial,responsive}.css`, `docs/polimento/plataforma/**`.

## Do not touch
`src/domain/**`, `src/server/**`, `api/`, migrations, `tokens.css`, `base.css`, `src/components/ui/**`, `src/brand/**`
(Frente 1), landing e páginas públicas (Frente 3), `(admin)`, `components/admin`, `admin.css` (Frente 5),
`public/visuais/**` (Frente 2 — só referenciar).

## Sessões

### Sessão 1 — 25/10/2026 (Claude Code, Opus 5.5)

**Ritual de abertura.** `git status`: só `docs/polimento/` não rastreado; `git log -3`: d0398d5, 8601395, 89aeb52.
Servidor local na **porta 3104** (a 3000 estava livre, mas as outras quatro frentes rodam em paralelo — porta própria
por frente, armadilha do tópico 35). Ambiente de teste isolado, sem tocar no código protegido:
- `.env.development.local` / `.env.test.local` (ignorados pelo Git, só desta worktree) zeram `POSTGRES_URL`,
  Supabase, Mercado Pago, Correios e NFS-e: o `.env.local` desta pasta aponta para o banco de PRODUÇÃO e liga a
  NFS-e real — clicar "comprar" no teste emitiria nota de verdade.
- O servidor sobe com `NODE_ENV=test` (o Next nem lê o `.env.local` nesse modo) e um `--require` de um script do
  scratchpad que semeia o store em memória com as 7 contas do seed (`seedState()`): fora de teste o estado nasce
  vazio desde 20/09 e o login passa pelo Supabase Auth de produção, que não pode ser usado aqui.
- Sessão de teste: cookie `aurea_session` assinado com um `SESSION_SECRET` descartável, só desta worktree.
  Com isso a senha `12345678` do CLAUDE.md **não é o caminho** (registrado: ela não vale desde 20/09/2026).

**Auditorias (antes).** As duas ferramentas originais de `aprendizado_frontend/ferramentas/` são presas às classes
da K2CON e não acham nada aqui ("0 de 44 telas", nenhuma tabela). Foram adaptadas em
`docs/polimento/plataforma/ferramentas/*-ro.py` (mesma lógica, classes do Real Olímpico). Números do antes estão no
INVENTARIO.md §Auditorias.

**Grupo (a) — shell e /inicio: FEITO.**
- `components/shell/Sidebar.tsx`: menu agrupado (Visão geral · Negociar · Meu acervo · Conta), item aceso nas
  subpáginas (`aria-current="location"`), tema e sair viraram `<button>` (eram `<div onClick>`); `SidebarProvider`
  aceita `desktopMinPx` (o /admin continua em 1080, o cliente passa 1024).
- `components/shell/Topbar.tsx`: "Saldo" escrito ao lado do número, tema `<button role="switch">`, "Sair da conta"
  `<button>`.
- `app/(app)/layout.tsx`: classe `.app-cliente` no casco (o redesenho não vaza para o /admin) e `desktopMinPx={1024}`.
- `/inicio` sem `"use client"`; ordem nova: `ResumoDaConta` (novo, só apresentação do que o AppProvider já tem) →
  atalhos (`HomeBlocks`, 3 colunas) → mercado de hoje (`HomeStats` + `BlocosDeMoedas`). Títulos h2 por seção.
- CSS: casco e primitivos da plataforma em `shell.css` (chips, KPIs, vazio, carregando, tabela de 1ª coluna fixa,
  opções, "Nesta página", `.sr-only`); Início em `home.css`; media queries em `responsive.css` (as duas de
  `home.css` foram para lá). No celular a `.topbar` gruda no topo (`.topbar-container{display:contents}`).
- Verificado no navegador: desktop 1366 e 375px, gaveta abre e fecha, cabeçalho gruda ao rolar.

**Inventário e benchmark: FEITOS** — `INVENTARIO.md` (rotas, ações → Server Actions, avisos de regra, contrato de
âncoras do tutorial, auditorias "antes") e `BENCHMARK.md` (VM `ro-app` com 18 alvos × 2 larguras, 9 bloqueados por 403
e cobertos pelo navegador embutido; demo logado da Mercury; brief e 12 decisões com referência). VM desligada.

**Pedido do Gabriel no meio da sessão (25/10/2026):** "tome liberdade para remodelar… faça algo novo mesmo… sem mexer
em features e bancos". A branch do Antigravity já está no main (merge 343333e: `FeeSimulator`, `CoinSpecimenViewer` da
landing); os dois são da landing (textos e moeda fixos), então serviram de referência visual, não de componente.

**Grupo (b) — /mercado, /compras, /vender: FEITO.**
- /mercado: bloco NOVO "Cotação por moeda" (um cartão por tipo: menor venda, maior oferta de compra, última negociação,
  "Ver no livro" que ajusta os filtros); livro em 2 colunas iguais com chips por tipo e faixa de valor em `<details>`;
  números da plataforma sob o gráfico; "Comparação simples" com `<Link>`; esqueleto ao carregar; modal de compra sem
  inline. `MinhasOfertas` em lista, "Executadas recentemente" recolhida com contagem; `LotCard`/`BidRow` com nome
  acessível único.
- /compras: o quê → quanto (lado a lado) → como pagar (`.opcao[aria-pressed]`) → total → ação; pós-pago continua
  comentado; `ReservasEmAberto` sem inline.
- /vender: 2 colunas (anúncio | escolha das moedas), explicações abaixo; termos como checkbox real; motivo do botão
  desabilitado escrito; "Selecionar todas/Limpar" viraram botões; vazio do `CoinPicker` com link para Envios.

**Grupo (c) — /conta/**, /recibos/**, /envios, /retirada, comparações: FEITO.** (/relatorios é só redirect para o
/admin — Frente 5.)
- /conta: cartão de saldo com Depositar (primária) e Sacar; contadores ao lado; atalhos `button`/`Link`; foto da moeda
  não vaza mais do círculo (defeito anterior do `<img>` de 100px).
- /conta/extrato, /conta/custodia, /conta/faturas, /conta/configuracoes, /recibos, /recibos/auditoria: tabelas em
  `.tabela-fixa` com `th scope="row"`; selos com ícone (`.selo`); abas de verdade nas faturas; "Nesta página" na
  custódia; cancelar plano em zona de perigo com 2 etapas; 5 primárias de Configurações viraram contornadas.
- /conta/aceites/[id]: `<main>` aninhado virou `<div>`; cores literais do comprovante viraram tokens do certificado.
- /recibos/[coinId]: ações em ordem de uso (PDF, vender, retirada por último) com motivos ligados.
- /retirada: NOVA jornada em etapas (`<ol>`: solicitada → paga → separação → postada → entregue).
- /envios: ~80 estilos inline viraram classes; rótulos `<label>`; cartão do plano é `<button aria-pressed>`; trilha
  de passos é `<ol aria-current="step">`; histórico com chips e selos por token.
- Modais: conversor (`scratchpad/estilos_para_classes.py`) trocou os `style={{}}` por utilitários `u-*` (mesmos
  valores); depósito mostra o limite por operação sempre.
- `npx tsc --noEmit`: limpo (rodado uma vez no meio, antes do teste de clique, por segurança).

**Tokens da Frente 1: FEITO.** `git merge feat/brandbook-real-olimpico` (avanço rápido, 4 commits, contrato de tokens
2088297) sem conflito — nenhum arquivo em comum. Aplicado o §0.2 das RECOMENDACOES: 94 cores de texto passaram para
`--ro-primaria-texto`/`--ro-perigo-texto`/`--ro-sucesso-texto`; `pagamento.css` (28 literais), sombras e carimbos do
certificado sem nenhuma cor literal (todos os 9 CSS da frente com 0 literais); `.topbar-alert-btn` com 44 px; menu com
`LogoEmblema` 40 px + nome escrito; selos, chips, KPIs e tabelas lendo os papéis `--ro-*`.

**Ativos da Frente 2:** existem em `C:\dev\AureaCustodiaMVP-assets\public/visuais\` (sem commit, merge antes da
Frente 4). **Não copiados** — só referenciados: spots `onboarding-vazio-sem-ordens/sem-itens`, `spot-retirada-fisica`,
`spot-etiqueta-frete`, `spot-custodia-a-pagar` nos 9 estados vazios; `cenarios-faixa-abertura-painel` (AVIF/WebP) atrás
do resumo da conta no Início. Até o merge da Frente 2, as imagens dão 404 sem quebrar nada (`alt=""`, decorativas).

**Pedido ao Antigravity:** `PEDIDO_ANTIGRAVITY.md` (moedas sem anéis, anverso, ¾ para recibos, 3 spots novos, faixa
clara do Início) — para o Gabriel colar.

### Fechamento da sessão 1

**Feito:** inventário, benchmark (VM desligada: `PAROU ro-app`), redesenho das 16 rotas de `(app)` (/relatorios é só
redirect para o /admin), tutorial migrado e testado, tokens da Frente 1, ativos da Frente 2 referenciados, auditorias
antes × depois (INVENTARIO §5), propostas (PROPOSTAS_BACKEND.md, 9 itens, nada aplicado).

**Não feito (motivo):**
- Trocar meus primitivos (`.vazio`, `.selo`, `.carregando`, `.chip`) pelos componentes `<EstadoVazio>`, `<Selo>`,
  `<Esqueleto>` da Frente 1 — chegaram no fim da sessão; os primitivos já leem os mesmos papéis `--ro-*` e o markup é o
  mesmo padrão. Próximo passo natural depois do merge.
- `ModalCadastro` e `ModalSolicitarRetirada` só tiveram os estilos inline trocados por utilitários; os campos não
  ganharam `inputMode`/`autoComplete` (26 restantes) — o cadastro é formulário de dado pessoal e merece uma rodada
  própria com o tópico 35 passo 3.
- Lista de retiradas com dados (lê do Postgres) e "Cancelar solicitação" (usa `window.confirm`): não vistos no teste.

**Testes (25/10/2026):** `tsc --noEmit` limpo; `eslint .` 0 erros / 17 avisos (todos já existiam no main; 4 em
arquivos desta frente: imports e constantes sem uso em `vender/page.tsx` e `CoinArt.tsx`, deixados como estavam);
`vitest run` 149 arquivos, 1.387 testes passando (1 pulado); `npm run build` ok. Navegador: INVENTARIO §6.

**Ambiente de teste:** só arquivos locais ignorados pelo Git (`.env.development.local`, `.env.test.local`) e a receita
em `ferramentas/README.md`. Nenhum atalho entrou no código; nada novo para `RISCOS_ASSUMIDOS.md`.

**Próximo:** merge na ordem 1 → 2 → 3 → **4** → 5; depois do merge da Frente 2, conferir os spots e a faixa do Início
no navegador; decidir PROPOSTAS P1–P5 com o Gabriel.

**A branch `feat/plataforma-real-olimpico` está pronta para o merge** (sem commit, como combinado: o orquestrador
commita).

### Sessão 1, continuação — pedidos do Gabriel (25/10/2026)
- **CLAUDE.md corrigido** (o Gabriel apontou trechos desatualizados): saiu a regra dos anéis olímpicos (ele nunca a pediu);
  "depósito simulado" e "código simulado no QR" saíram — **nada no sistema é simulado**; login e `STORE_KEY` atualizados
  (Supabase Auth, estado vazio, `aurea-market-v8`); pendências antigas que já foram resolvidas (senha em texto puro, hash
  simulado, sem termos/aceite, sem Google/e-mail) saíram. O CLAUDE.md não estava no Touch da frente — mexido a pedido direto.
- **/vender:** moeda com custódia não paga fica fora da seleção, com o aviso "Custódia não paga" nela e "Ver como pagar"
  (abre a `ModalCustodiaNaoPaga`, que já existia). `CoinPicker` ganhou a classe `.sem-custodia`. PROPOSTAS P1–P4 encerradas.

### Sessão 1, continuação — polimento pelo Brandbook e merge (25/10/2026)
Pedido do Gabriel: "veja as atualizações na branch de Brandbook e faça o melhor polimento… ao terminar já faça o merge
disso e depois uma rodada de melhorias usando todo o nosso repo de frontend".
- Branch atualizada com `feat/brandbook-real-olimpico` até `7a84858` (fast-forward; catálogo `src/brand/ativos.ts`,
  `<CartaoMoeda>`, `<FaixaAbertura>`, `<ImagemDaMarca>`, `<EstadoVazio ilustracao>`).
- **Início:** a faixa de abertura virou `.ro-faixa .ro-guilloche` (escura nos dois temas, saldo em `.ro-valor`); a foto
  `cenarios-faixa-abertura-painel` saiu — está **pendente** no catálogo (canais de cor trocados na rodada 3).
- **Primitivos da Frente 4 trocados pelos componentes da Frente 1:** 14 vazios → `<EstadoVazio>` (ilustrações pelo
  catálogo, com a versão `-escuro` quando existe); selos, pills e badges → `<Selo tom>` (status de custódia, plano,
  fatura, moeda, auditoria, configurações, minhas ofertas) e o novo `<SeloDaRetirada>` (nome da etapa em português em
  vez de "SEPARACAO"); carregamento → `<Esqueleto>` com `aria-busy`; tabelas → `.ro-tabela` (a `.tabela-fixa` ficou só
  com a 1ª coluna presa e o cabeçalho de linha).
- **Aviso de custódia** no desenho `.ro-aviso` (aviso/perigo), mantendo `.note`/`.warn-box` — âncora do tutorial.
- **Recibo:** cartão `.ro-cartao .ro-cartao-moeda` com a moeda na `.ro-vitrine-luz` e o selo ao lado do valor. O
  `<CartaoMoeda>` não foi usado porque só aceita as duas moedas negociáveis e o recibo mostra qualquer tipo do acervo.
- **Destrutivo = `.btn-danger`** só onde há confirmação (cancelar retirada; confirmar cancelamento do plano).
  Cancelar oferta no mercado não tem confirmação hoje e continua contornado — pôr confirmação seria comportamento novo.
- Tipografia: título da página em `--ro-tipo-titulo-1` na serifa; `.secao-titulo` e `.eyebrow` como sobretítulo.
- CSS morto removido: `.selo-*`, `.pill.r`, `.badge-retirada/*`, `.btn-perigo`, `.vazio-arte`, barras `i` do carregando.

**Testes:** `tsc` limpo; `eslint .` 0 erros / 15 avisos; `vitest` 1.392 passando (1 pulado); `npm run build` ok;
navegador em `http://172.26.224.1:3104`: Início, Recibos, Minha custódia, Retirada, Faturas, Auditoria, Conta, Vender,
Mercado, Extrato, Envios e Configurações sem erro de console; claro e escuro conferidos.

**Merge (25/10/2026):** branch commitada (`6c7200c`) e mesclada no `main` local por fast-forward; o `origin/main` já
tinha os 2 commits do painel administrativo (Frente 5), integrados com merge sem conflito (`200c0a0`). No `main`:
`tsc` limpo, `eslint` 0 erros, 1.422 testes, build ok. **Sem push** — publicar fica com o Gabriel.

### Rodada de melhorias com o `aprendizado_frontend` (tópicos 29 e 35) — 25/10/2026
- **Formulários (tópico 35, passo 3):** cadastro formal e retirada com rótulo ligado ao campo (`htmlFor`/`id`) — na
  retirada os 10 campos **não tinham nome acessível nenhum**; teclado e preenchimento por campo (`type="tel"`,
  `inputMode` numérico/e-mail, `autoComplete` `name`/`bday`/`postal-code`/`address-*`, e `shipping …` no endereço de
  entrega, que pode ser de outra pessoa); CPF/CNPJ sem teclado numérico (CNPJ alfanumérico); chave Pix com o teclado
  do tipo escolhido. CPF inválido agora tem `aria-invalid` + `aria-describedby` na mensagem. Campos sem dica: 26 → 9
  (os 9 restantes não têm dica que sirva: número, complemento, banco, listas).
- **Validação sem JS (passo 3c):** `:user-invalid` e `aria-invalid` pintam a borda e o fundo de erro só depois que a
  pessoa sai do campo.
- **Modalidade da retirada:** os dois cartões eram `<div role="button">` com teclado feito à mão; viraram `<button
  aria-pressed>`.
- **axe-core 4.13 (WCAG 2.2 A/AA)** nas 13 rotas da área logada, nos dois temas, em desktop e 375 px, e nos modais de
  cadastro e retirada abertos. Achados e correções: tabelas que rolam de lado sem foco de teclado (7 →
  `tabIndex=0` + `role="region"` + nome) e `<dl>` inválido nos blocos de moeda do Início (a fonte da referência
  externa entrou no `<dd>`). Depois: **0 violações**. Um falso positivo de contraste no menu aparece se a medição
  roda durante a transição de tema — armadilha já registrada no tópico 35.
- Sem rolagem horizontal a 375 px; tutorial e âncoras intactos.

### Sessão 2 — 30/10/2026 (Claude Code, Sonnet 5.5) — polimento pelas cinco lentes do Distilla

Pedido do Gabriel (30/10/2026): o plano do Distilla não chegou, então a frente começou por conta própria e ajusta
quando ele chegar. Worktree `/workspace/aurea/wt/plataforma-cliente`, branch `polish/aurea-plataforma-cliente`, base
`main` @ `d29727a`. Escopo: `src/app/(app)`, componentes de UI e `src/styles/` (`responsive.css` por último). Fora
dele: `domain/`, `server/` (inclusive Server Actions e permissões), `api/`, migrations, dados, deploy, push na `main`.
Commits pelo `commit.md` (português, imperativo, sem `Co-Authored-By`).

**Ambiente.** `npm ci` só nesta worktree. Node 20.20 (o Supabase pede ≥ 22: só aviso `EBADENGINE`, sem efeito nos checks).

**Base medida antes de mexer:** typecheck ok · lint 0 erros / 16 avisos · test 1.456 passando e 1 timeout em
`banco.test.ts` que passa sozinho · build ok.

**Bloco 1 — inventário e benchmark atualizados** (`INVENTARIO.md` §7, `BENCHMARK.md` §6): o que mudou desde 25/10,
auditorias rodadas de novo, lista R1–R7 de residuais com a lente do Distilla de cada um.

**Lista de trabalho (ordem):** R1 `error.tsx` + `loading.tsx` do `(app)` · R2 confirmação própria no cancelamento da
retirada · R3 `✕` do `PhotoSlot` como botão de 44 px · R4 `dvh` no casco · R6 impressão do recibo · R7 dicas de teclado
nos campos que sobraram. R5 (`SellerBidRow` órfão) fica só registrado.

**Não medido nesta sessão** (precisa de servidor local com a receita de `ferramentas/README.md`): 375/768/1440, axe,
LCP/INP. Entram na verificação final.
