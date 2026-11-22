# MD de execução — `feat/brandbook-real-olimpico` (Frente 1 — Brandbook e tokens)

```
Worktree:   C:\dev\AureaCustodiaMVP-brandbook  (node_modules = junção para o checkout principal; remover só com git worktree remove)
Base:       main @ d0398d5 (24/10/2026)
Agente:     Claude Code (ou outro de código), aberto pelo Gabriel nesta pasta
Merge:      no chat orquestrador (checkout principal), ordem 1 → 2 → 3 → 4 → 5
Porta:      npm run dev (autoPort; se 3000 estiver ocupada, use 3101)
```

## Regras de eficiência (Regras_eficiencia_de_sessao_v1.1) — prevalecem sobre o resto deste documento
- **Leia só:** `CLAUDE.md`; `docs/Regras_eficiencia_de_sessao_v1.1.md`; `docs/diario/RITUAL_DE_SESSAO_RESUMO.md`;
  `src/styles/{README.md,tokens.css,base.css}`; `src/app/{globals.css,layout.tsx}`; `src/components/ui/**`; `public/brand/`
  (olhar as imagens); `docs/pesquisa_benchmark_plataformas.md` e `docs/pesquisa_benchmark_fase2.md` (não refazer).
  Frontend: `C:\dev\aprendizado_frontend\{MANIFESTO.md,RITUAIS.md,AGENTS.md}`, `toolkits/direcao-de-design/**`,
  `design/README.md` + os conceitos de `design/conceitos/` que citar, `34_apostilas_design_grafico_e_malha.md`,
  `35_licoes_aplicacao_k2con_rodadas_5_6.md`, `toolkits/pesquisa-na-vm/README.md`. Modelo K2CON:
  `C:\dev\K2CON\docs\arquitetura\{BRIEF_DE_DESIGN.md,DESIGN_SYSTEM.md}`,
  `C:\dev\K2CON\docs\diario\execucoes\arquivo\feat-design-system-k2con--MD_EXECUCAO.md`.
- **Prioridade:** (1) benchmarking curto → paleta, tipografia, tokens → **commit de contrato**; (2) Brandbook completo;
  (3) `base.css` e `src/components/ui/**` repaginados; (4) `src/brand/` pronto para virar package.
- **Segmentação:** um agente só nesta branch. Sem subagentes.
- **MD de execução:** este arquivo. Atualize a seção "Sessões" a cada tópico fechado.
- **Verificação:** typecheck, lint, test e build só no fim da branch.
- **Commits:** só dois, locais, **sem push**: (a) o **contrato de tokens** — mensagem começando com
  `Contrato de tokens:` — assim que paleta, fontes e `tokens.css` estiverem prontos, porque as frentes 3, 4 e 5 fazem
  `git merge feat/brandbook-real-olimpico` a partir dele (exceção da regra "commit só no fim": afeta a execução local das
  outras); (b) o final da frente. O push e o merge no `main` são do orquestrador.
- **Tipo da branch:** execução.

## Contexto
O Gabriel pediu o polimento estético completo do Real Olímpico em 5 branches independentes, usando o repositório
`C:\dev\aprendizado_frontend` do mesmo jeito que no K2CON. Esta frente é a **base das outras**: define a lógica de
branding — **logo intacta**, mas cores, estilo e fontes melhorados e padronizados num **Brandbook muito bem definido**,
guardado no repositório e organizado para, no fim do polimento, virar um **package próprio do Real Olímpico** (como o
`@k2con/ui`). As outras frentes: 2 Ativos (Antigravity, lê a seção "Pedidos para a Frente 2" do seu brandbook direto
desta pasta), 3 Landing, 4 Plataforma, 5 Admin.

## Regras que não se negociam
- Superfície protegida intocada: `src/domain/**`, `src/server/**`, Server Actions, migrations. Nenhum número, taxa,
  regra ou dado muda.
- **Logo:** só os arquivos de `public/brand/` (`logo-real-olimpico-marca.webp` e `-emblema.webp` na interface); nunca
  gerar, redesenhar ou substituir. Sem anéis olímpicos.
- Marca **Real Olímpico**, no masculino; AUREA CUSTODIA LTDA onde há CNPJ, contrato e objeto postal.
- Terminologia jurídica: proibido token, NFT, cripto, ativo digital, ativo, investimento, investidor, corretora,
  rentabilidade, retorno (para a própria plataforma). Aprovado: recibo, item, moeda, marketplace, potencial de
  valorização, valor estimado.
- CSS global por área, nomes de classe do monolito (`.btn`, `.panel`, `.nav-item`), sem CSS Modules; `responsive.css`
  sempre o último import de `globals.css`. Toque mínimo 44px. TypeScript strict, comentários em português explicando o porquê.

## Entregas
1. **`docs/polimento/brandbook/BENCHMARK.md`** — pesquisa detalhada de marcas e design systems de finanças, trading,
   contabilidade, marketplace, leilões e exposição de itens de coleção/artísticos/históricos (sugestão: Stripe, Nubank,
   XP/BTG, Robinhood, Carbon, Primer, StockX, Heritage Auctions, Sotheby's, Christie's, Catawiki, PCGS/NGC, Numista,
   Royal Mint, Rijksmuseum, British Museum). Por referência: paleta, uso de dourado/metal, tipografia, densidade, tom,
   claro/escuro. **Comparação explícita com os métodos do repositório de frontend** (espinha de tokens, conceitos de
   `design/`, doc 34). Capturas pela VM do Colab (`toolkits/pesquisa-na-vm/vm.sh`, sessão `ro-brand`; desligar só a sua),
   fora do Git; no MD só números e conclusões. Decisões no fim, cada uma com a referência que a sustenta.
2. **`docs/marca/BRANDBOOK_REAL_OLIMPICO.md`** (+ `docs/marca/README.md`): essência e tom; logo (uso dos dois recortes,
   área de proteção, tamanho mínimo, fundos permitidos, proibições); paleta (primitivos + papéis semânticos, claro e
   escuro, **contraste AA medido**); tipografia (famílias via `next/font`, escala fluida, pesos); grade, espaçamento,
   raio, sombra, elevação; iconografia; ilustração e fotografia de moeda; movimento (com `prefers-reduced-motion`); voz e
   vocabulário (com a lista jurídica); componentes base e estados.
   Seção obrigatória **"Pedidos para a Frente 2 (ativos)"**: paleta em hex, materiais, luz, ângulos, referências
   (fotos reais de `public/moedas/`) e a lista de ativos que a marca precisa (moedas em alta, macro de relevo, texturas,
   frames de animação, OG, estados vazios, ilustrações de tutorial).
3. **`src/brand/`** estruturado como package futuro: `README.md`, tokens, `fontes.ts`, componentes de logo, `index.ts`
   — sem quebrar o build. `src/styles/tokens.css` passa a ler dele. **Todo nome de variável atual continua existindo**
   (alias dos papéis novos), para nenhuma tela das outras frentes quebrar. `--cert-*` e `--coin-*` só mudam com motivo
   escrito.
4. Fontes novas em `src/app/layout.tsx` se o benchmarking justificar (`next/font`, pesos mínimos, `.variable` no `<html>`).
5. `base.css` e `src/components/ui/**` (botão, campo, painel, modal, toast…) repaginados.
6. `docs/polimento/brandbook/RECOMENDACOES_AS_FRENTES.md`: o que cada frente (3, 4, 5) deve ajustar no seu CSS por
   causa dos tokens novos.

## Touch
`src/styles/{tokens.css,base.css,README.md}`, `src/app/layout.tsx` (só fontes/tema), `src/app/globals.css` (só import
novo), `src/components/ui/**`, `src/brand/**` (novo), `docs/marca/**`, `docs/polimento/brandbook/**`.

## Do not touch
`src/domain/**`, `src/server/**`, rotas `api/`, migrations, CSS e componentes de tela (`landing`, `login`, `legal`,
`shell`, `home`, `market`, `admin`…) — são das frentes 3–5.

## Fechamento
`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; conferir no navegador 3–4 telas em desktop e 375px,
claro e escuro (login de teste: e-mail de `src/domain/seed.ts`, senha `12345678`); commit final local sem push; VM
desligada; seção "Sessões" com Feito / Não feito (motivo) / Testes / Próximo. Proposta de regra ou backend vai para
`docs/polimento/brandbook/PROPOSTAS_BACKEND.md`, sem aplicar: o orquestrador pergunta ao Gabriel no fim.

## Sessões

### S1 — 25/10/2026 — Claude Code (Opus 5.5)

**Abertura (ritual).** `git status`: só `docs/polimento/` não rastreado; branch `feat/brandbook-real-olimpico` @ d0398d5
(= main). `.env.local` presente. `npm run dev`: conferido no fechamento (porta 3101) — regra 6 da eficiência. VM
`ro-brand` aberta na 1ª ação; extrator próprio de "DNA visual" (`vm_marca.py`, no scratchpad, fora do Git) disparado em
19 alvos × 2 larguras.

**Achado de partida:** 16 variáveis CSS são **usadas e nunca definidas** (`--border`, `--text-main`, `--shadow-sm/md/lg`,
`--card-bg`, `--ff-serif`, `--gold-tint-30`, `--gold-subtle`, `--card-subtle`, `--bg-subtle`, `--bg-card-subtle`,
`--bg-card-hover`, `--bg-card`, `--bg-alt`, `--danger`) — em `pagamento.css`, `account.css`, `login.css`, `recibo.css`,
`legal.css`, `admin.css` e em 6 componentes. O contrato de tokens passa a defini-las como alias de papel.

**Contrato de tokens — FECHADO, commit `2088297`** (local, sem push; as frentes 3, 4 e 5 fazem
`git merge feat/brandbook-real-olimpico` a partir dele). Arquivos: `src/brand/{tokens.css,tokens.ts,fontes.ts,index.ts,
componentes/Logo.tsx,__tests__/tokens.test.ts}`, `src/styles/tokens.css` (aliases), `src/app/globals.css` (1 import),
`src/app/layout.tsx` (fontes). Verificação: `vitest src/brand` 4/4, `typecheck` e `build` verdes. Fontes: Newsreader +
Inter. Nenhum nome legado removido (o teste congela a lista).

**Frente 2 (Antigravity)** já entregou `public/visuais/**` na worktree `AureaCustodiaMVP-assets` (sem commit). A paleta
dela (#081226, #C9A24B, #8FA0BD) bate com o contrato. Três ativos mostram os anéis olímpicos (render do reverso da
Bandeira, par do herói, OG padrão); o Gabriel decidiu em 25/10/2026 que isso **não é problema** ("ignora esse problema do
CLAUDE.md") — registrado no Brandbook §8.3 e, para o CLAUDE.md, em `PROPOSTAS_BACKEND.md` (P1).

**Mudança de escopo do Gabriel (25/10/2026):** liberdade total para remodelar marca, componentes e cores (logo intacta;
features e banco intocados) e pedir ativos 4K ao Antigravity por prompt. Escolha registrada: as **telas** continuam com
as frentes 3–5 (editam os mesmos arquivos em paralelo; remodelar aqui geraria conflito em cascata) — esta frente entrega
o sistema completo e a direção de cada página (`RECOMENDACOES_AS_FRENTES.md`), e os pedidos ao Antigravity.

#### Fechamento S1

**Feito**
- `BENCHMARK.md`: 18 referências medidas (9 na VM, 9 no navegador embutido com o mesmo script — 7×403, 1×HTTP/2, 1×timeout),
  comparação explícita com os métodos do aprendizado_frontend, auditoria da espinha de tokens, decisões D1–D12.
- Contrato de tokens (`2088297`), descrito acima.
- `docs/marca/BRANDBOOK_REAL_OLIMPICO.md` (15 seções, contraste medido, §13 "Pedidos para a Frente 2" com inventário do
  que ela já entregou e o que falta), `docs/marca/README.md`, `docs/marca/PEDIDOS_ANTIGRAVITY.md` (prompt-mestre + 9
  pedidos 4K em JSON).
- `src/styles/base.css` repaginado (mesmos nomes de classe; botão metal, campo AA, foco universal, modal que assenta,
  `.btn-ghost/-danger/-sm/-lg`), `src/brand/componentes.css` (padrões `.ro-*`), `src/components/ui/{Selo,Aviso,
  EstadoVazio,Esqueleto}.tsx` (Server Components), `src/brand/README.md`, `src/styles/README.md`.
- `RECOMENDACOES_AS_FRENTES.md` e `PROPOSTAS_BACKEND.md` (P1–P7, nada aplicado).
- Conta de teste `brandbook.visual@testeaurea.com.br` criada no Supabase Auth (pedido do Gabriel); credenciais só no
  `.env.local` (`RO_TESTE_*`).

**Não feito (motivo)**
- Conferência das telas **logadas**: o `.env.local` desta máquina não tem `SUPABASE_PUBLISHABLE_KEY`, e na Vercel ela é
  "sensível" (ilegível pela API) — nenhuma conta entra no `npm run dev`. Marcador vazio deixado no `.env.local`; falta o
  Gabriel colar o valor (P4).
- Capturas de tela no fechamento: a janela do app estava minimizada e o pane não desenhou; a verificação foi feita por
  medição no DOM (abaixo). Capturas de antes (escuro e claro, `/entrar` e `/taxas`) foram vistas durante a sessão.
- Vitrine `/marca`: exige rota pública em `src/server` (P2).
- Telas reorganizadas: ficam com as frentes 3–5 (escolha acima).

**Testes rodados (25/10/2026)**
- `npm run typecheck` ✅ · `npm run lint` ✅ 0 erros (17 avisos pré-existentes em `src/server`, nenhum nos arquivos desta
  frente) · `npm test` ✅ 149 arquivos, 1387 testes (1 pulado) · `npm run build` ✅.
- Navegador (dev na 3101): `/`, `/entrar`, `/cadastrar`, `/taxas` em 1024 e 375 px, escuro e claro — Newsreader e Inter
  carregadas, `h1` em Newsreader, fundo/texto resolvidos por tema (claro `#f7f5f0`/`#0d1b35`), `.btn-outline` no claro em
  `#7a5d1c`, campos com 44 px e borda `#8a7444`, **sem rolagem horizontal a 375 px**, console sem erro. Achado para a
  Frente 3: 5 botões da landing abaixo de 44 px (anotado nas recomendações).
- VM `ro-brand` desligada (`PAROU ro-brand`); a 1ª sessão tinha sido reciclada pelo Colab no meio da captura e foi reaberta.
- Varredura de segredo nos arquivos novos: nada encontrado.

**Commits** (locais, sem push): `2088297` (contrato de tokens) e `31699c0` (final). Este MD fica fora do Git (arquivo
de trabalho da orquestração).

#### Complemento S1 — telas logadas (25/10/2026)
- O Gabriel enviou a `SUPABASE_PUBLISHABLE_KEY`; gravada no `.env.local` do principal e das 5 worktrees (memória
  `chave-supabase-nunca-sai-do-env`). Login com a conta de teste funcionou.
- A sessão caía em 10 s em `localhost:3101`: cookie de `localhost` é compartilhado entre portas e outras frentes
  logavam/deslogavam no mesmo navegador. Em `127.0.0.1:3101` ficou estável (proposta P8).
- Medido em `/inicio`, `/mercado`, `/recibos`, `/conta` — escuro 1024 px e claro 375 px: sem rolagem lateral; escuro sem
  texto abaixo do AA; no claro só reprovam os textos que ainda usam `--gold` nas telas da Frente 4 (`.ubal`, links da barra
  de aviso, `.tour-etapa`, 2,20–2,40:1) — troca já prevista no §0.2 das recomendações, agora com os pontos medidos. O
  `.empty` do `base.css` mede 5,14:1 (o 3,89 da 1ª leitura era artefato do `color-mix`).
- Observado e não alterado: `/api/state` devolve dados de outras contas (P9).

**Próximo**
- Orquestrador: merge desta branch primeiro (contrato `2088297` + commit final `31699c0`), depois Frente 2, depois 3/4/5.
- Gabriel: colar `SUPABASE_PUBLISHABLE_KEY` no `.env.local` (P4); decidir P1–P7; colar o prompt de
  `docs/marca/PEDIDOS_ANTIGRAVITY.md` no Antigravity.


#### Complemento S1 — conferência da rodada 2 da Frente 2 (25/10/2026)
14 ativos gerados + ícones conferidos contra os pedidos (portões 3 e 4). Aprovados: macro de perfil (ressalva: uma
moeda só), veludo (ressalva: manchas), 5 spots, OG do recibo, ícones. **Reprovados 6** por moeda inventada: os dois ¾
transparentes, lacre de custódia (também código de barras e texto legível), faixa de abertura (também nítida), OG da
Bandeira ("ENTTTREGA") e OG dos Direitos Humanos. Regra nova no Brandbook §8.1 (moeda legível só por composição sobre a
foto real) e prompt da rodada 3 em `docs/marca/PEDIDOS_ANTIGRAVITY.md` §3. Detalhe por ativo: Brandbook §13.4.1.

#### Complemento S1 — rodada 3 da Frente 2 e componentes que usam os ativos (25/10/2026)
- Rodada 3 conferida (Brandbook §13.4.2): desenho das moedas fiel, mas canais BGR/RGB trocados nos 6 ativos compostos
  (anel azul); lacre reprovado de novo; extras aprovados. Correção pedida em `PEDIDOS_ANTIGRAVITY.md` §4.
- Novos: `src/brand/ativos.ts` (catálogo com situação de cada ativo), `src/brand/componentes/ImagemDaMarca.tsx`,
  `src/components/ui/{CartaoMoeda,FaixaAbertura}.tsx`, `<EstadoVazio ilustracao>`, CSS em `componentes.css`,
  `src/brand/__tests__/ativos.test.ts`.
- Conferido no navegador com página TEMPORÁRIA `src/app/(app)/marca-teste/` e cópia dos SVG/veludo em `public/visuais/`
  (fora do Git): claro, escuro, 375 px. Corrigidos na hora: ênfase e centavos da faixa usavam cor do tema claro.
  **Página e cópias apagadas antes do commit** (conferido por `git status` e busca pelos textos de exemplo); regra
  gravada na memória `teste-visual-nunca-vai-para-producao`.

#### Complemento S1 — rodada 3b conferida (25/10/2026)
5 renders compostos liberados no catálogo (cor medida + fidelidade olhada + visto no `<CartaoMoeda>`), 11 spots com
versão escura ligados no `ILUSTRACOES`; lacre reprovado pela 3.ª vez, fica pendente com proposta de troca pela
`jornada-cena-03-cofre` (Brandbook §13.4.3). Conferência com página TEMPORÁRIA `marca-teste` + cópias em
`public/visuais/`, **apagadas antes do commit** (conferido).

#### Complemento S1 — lacre retirado (25/10/2026)
Decisão do Gabriel: o `cenarios-lacre-de-custodia` sai; no lugar, `jornada-cena-03-cofre`. Removido do catálogo
`src/brand/ativos.ts` (com comentário do porquê), registrado no Brandbook §13.4.3/§13.5/§15, nas recomendações à
Frente 3 (e no wizard da Frente 4) e marcado como retirado no pedido da rodada 3b.
