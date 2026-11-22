# MD de execução — `feat/landing-real-olimpico` (Frente 3 — Landing e páginas públicas)

```
Worktree:   C:\dev\AureaCustodiaMVP-landing   (node_modules = junção; remover só com git worktree remove)
Base:       main @ d0398d5 (24/10/2026)
Agente:     Claude Code (ou outro de código), aberto pelo Gabriel nesta pasta
Depende:    contrato de tokens da Frente 1 (commit "Contrato de tokens:" em feat/brandbook-real-olimpico)
            e ativos da Frente 2 (C:\dev\AureaCustodiaMVP-assets\public\visuais\)
Merge:      no chat orquestrador, ordem 1 → 2 → 3 → 4 → 5
Porta:      npm run dev (autoPort; se ocupada, 3103)
```

## Regras de eficiência (Regras_eficiencia_de_sessao_v1.1) — prevalecem sobre o resto deste documento
- **Leia só:** `CLAUDE.md`; `docs/Regras_eficiencia_de_sessao_v1.1.md`; `docs/diario/RITUAL_DE_SESSAO_RESUMO.md`;
  `docs/EXECUCAO_LANDING_REDESIGN.md`, `docs/ENTREGA_AUTH_LANDING.md`, `docs/pesquisa_benchmark_plataformas.md`,
  `docs/pesquisa_benchmark_fase2.md`; `src/app/page.tsx`; `src/components/{landing,login,legal}/**`; a UI de
  `src/app/{entrar,cadastrar,taxas,termos,privacidade,suporte,academy}/**`; `src/styles/{landing,login,legal,tokens}.css`.
  Frontend: `C:\dev\aprendizado_frontend\{RITUAIS.md,AGENTS.md}`, `15_templates_landing_estudados.md`,
  `16_shadcn_reactbits_layers_estudados.md`, `17_sites_e_repos_similares_estudados.md`,
  `34_apostilas_design_grafico_e_malha.md`, `35_licoes_aplicacao_k2con_rodadas_5_6.md`, `toolkits/direcao-de-design/**`,
  `toolkits/pesquisa-na-vm/README.md`, `topicos/29-checklist-qa-final.md` e os tópicos que esses citarem.
  Depois do merge da Frente 1: `docs/marca/BRANDBOOK_REAL_OLIMPICO.md` e `docs/polimento/brandbook/RECOMENDACOES_AS_FRENTES.md`.
- **Prioridade:** (1) inventário (números e provas que não mudam); (2) benchmarking; (3) arquitetura de blocos + copy;
  (4) implementação da landing; (5) páginas públicas no mesmo sistema; (6) tokens novos e ativos.
- **Segmentação:** um agente só nesta branch. Sem subagentes.
- **MD de execução:** este arquivo; atualizar "Sessões" a cada tópico fechado.
- **Verificação:** typecheck, lint, test, build só no fim. **Commits:** nenhum (o orquestrador commita no merge).
- **Tipo da branch:** execução.

## Regras que não se negociam
- **Nenhum número, prova real de dado, taxa, conceito ou função da plataforma muda.** Valor que hoje vem de constante
  ou de `src/server/config/` continua vindo de lá — nunca digitado no JSX.
- Superfície protegida intocada (`src/domain/**`, `src/server/**`, Server Actions, `api/`, migrations). As páginas de
  entrar/cadastrar mantêm os mesmos formulários, ações, campos e fluxos (Supabase Auth, Google, nova senha, callback).
- Logos só de `public/brand/`; sem anéis olímpicos; marca Real Olímpico no masculino; CNPJ e AUREA CUSTODIA LTDA onde já
  aparecem; termos e privacidade: só layout, nunca o texto jurídico.
- Terminologia jurídica: proibido token, NFT, cripto, ativo digital, ativo, investimento, investidor, corretora,
  rentabilidade, retorno (exceção: falar de terceiros, como BTC ou bolsa). Aprovado: recibo, item, moeda, marketplace,
  potencial de valorização, valor estimado. Posicionamento: não é corretora, não é instituição financeira, não é investimento.
- Sem depoimento, cliente ou número inventado.

## Entregas
1. `docs/polimento/landing/INVENTARIO.md` — cada bloco atual, cada número/prova/taxa e a origem dela no código.
2. `docs/polimento/landing/BENCHMARK.md` — landings de finanças, trading, contabilidade, marketplace, leilões e
   coleção/arte/história (Stripe, Mercury, Nubank, Robinhood, Public, StockX, Heritage Auctions, Sotheby's, Christie's,
   Catawiki, PCGS, Numista, Royal Mint, museus digitais; Masterworks só como UX). Por referência: 1ª dobra, ordem dos
   blocos, prova de confiança, CTA, movimento, mobile. Capturas pela VM (`toolkits/pesquisa-na-vm/vm.sh`, sessão
   `ro-landing`), **comparação explícita com os métodos do repositório de frontend**, decisões no fim.
3. Landing nova em `src/components/landing/**` + `landing.css`: liberdade total de ordem, layout, cor e copy (skill
   `legibilidade-flesch-kincaid` no copy).
4. Páginas públicas no mesmo sistema visual.
5. `docs/polimento/landing/PROPOSTAS_BACKEND.md` se houver sugestão de regra/backend (sem aplicar).

## Touch
`src/app/page.tsx`, `src/components/{landing,login,legal}/**`, UI de `src/app/{entrar,cadastrar,taxas,termos,privacidade,suporte,academy}/**`,
`src/styles/{landing,login,legal}.css`, `public/landing/**` (se precisar), `docs/polimento/landing/**`.

## Do not touch
`src/domain/**`, `src/server/**`, `api/`, migrations, `tokens.css`, `base.css`, `src/components/ui/**`, `src/brand/**`
(Frente 1), plataforma e admin (Frentes 4 e 5), `responsive.css` (Frente 4 — regra mobile da landing vai no `landing.css`),
`public/visuais/**` (Frente 2 — só referenciar).

## Sessões

### Sessão 1 — 25/10/2026 (Claude Code, Opus 5.5)

**Ritual de abertura.** `git status`: só `docs/polimento/` não rastreado; `git log -3`: d0398d5, 8601395, 89aeb52;
branch `feat/landing-real-olimpico`. Dev em **3103** (config `landing-dev` em `.claude/launch.json` da pasta principal,
`npm --prefix … run dev -- -p 3103`). Contrato de tokens da Frente 1: **ainda não existe** (`git log
feat/brandbook-real-olimpico --grep "Contrato de tokens"` vazio, conferido 3×) → trabalhei com os tokens atuais.

**Tópicos fechados**
1. Inventário → `INVENTARIO.md` (31 itens com origem).
2. Benchmark → `BENCHMARK.md` (16 alvos; VM `ro-landing`, 7 bloqueados lidos no navegador; VM desligada).
3. Arquitetura + copy: Flesch-BR **75,0** (fundamental II), contra 47,7 do texto antigo. Nova ordem: herói (cofre +
   moeda + recibo) → Mercado agora → é/não é → mercado → 4 passos → segurança (foto, pilares, espécime, tabela) →
   taxas + simulador → história → dúvidas → citação + chamada → rodapé.
4. Landing: `LandingPage.tsx` (reescrito), `PublicHeader.tsx`, `PublicFooter.tsx`, `ReciboIlustrado.tsx`,
   `MercadoAgora.tsx`, `PictureResponsiva.tsx`, `visuais.ts`, `textoDasTaxas.ts` (novos), `FeeSimulator.tsx` (contas
   do domínio + tabela vigente), `CoinSpecimenViewer.tsx` (sem 'use client', só anverso), `src/app/page.tsx` (taxas
   vigentes em paralelo), `landing.css` (sistema `.pub-*`; bloco de auth/registro preservado).
5. Páginas públicas: `LegalDocument.tsx` (mesmo cabeçalho/rodapé), `legal.css` (capa + coluna), `AuthShell.tsx`
   (novo) em `LoginForm`, `RegisterForm`, `NovaSenhaForm` (só o casco; campos/ações iguais), `academy/page.tsx`
   (custódia vem da tabela vigente).
6. Ativos da Frente 2: usados `cenarios-*`, 4 `onboarding-spot-*`, guilloché. **Não usados**: fotos geradas de
   moeda (moeda é prova) e o OG (anéis olímpicos). Chave `FRENTE_2_MESCLADA` em `visuais.ts` (true; false = volta
   às fotos de `public/moedas`). Pedido de ativos novos: `PEDIDO_FRENTE_2.md`.

**Não feito (motivo)**
- Tokens semânticos novos: o commit da Frente 1 não existe.
- `middleware.ts` (liberar `visuais/`): fora da área → PROPOSTAS P1. **Sem isso, imagens da Frente 2 quebram para
  visitante.**
- Ativos da Frente 2 não copiados para a branch (regra); para conferir no navegador usei cópia temporária em
  `public/visuais/` + a linha do matcher, **ambas removidas no fechamento**.

**Testes (fechamento)**
- `npm run typecheck` ✅ · `npm run lint` ✅ 0 erros (17 avisos, todos preexistentes, nenhum em arquivo desta frente) ·
  `npm test` ✅ 148 arquivos, 1.383 testes · `npm run build` ✅ (`/` = 113 kB de First Load).
- Navegador (1440 e 375, claro e escuro): 8 páginas públicas, todos os links buscados (0 quebrados, 0 âncoras sem
  alvo, 0 nomes iguais para destinos diferentes, 1 `h1` e 1 `main` por página, 0 alvos de toque < 44px, 0 estouro
  horizontal a 375); simulador e FAQ clicados; varredura de termos proibidos (só negações; P9).
- Login de teste: formulário e Server Action ok; Supabase recusou a senha do seed (P10) — o caminho de sucesso não
  foi exercitado.
- Imagens da Frente 2 conferidas com cópia temporária + matcher liberado; os dois **desfeitos** antes do build.

**Próximo**: orquestrador mescla 1 → 2 → 3, aplica P1; quando o contrato de tokens existir, trocar os papéis locais
`--pub-*` de `landing.css` pelos semânticos da Frente 1.

### Sessão 2 — 25/10/2026 (mesmo agente) — conceito ampliado + movimento de alto nível

Pedidos do Gabriel: (1) o texto vende o CONCEITO — marketplace, ganhar dinheiro com colecionáveis, valorizar e
proteger, reserva de valor — e não só moedas, porque a marca vai além delas; (2) landing "muito superior", com
animações e componentes de alto nível, usando o repositório de frontend; (3) pedido de ativos à Antigravity.

**Feito**
- Copy: herói "Sua coleção protegida no cofre e pronta para virar dinheiro."; seção nova **Reserva de valor**
  (Proteja · Valorize · Ganhe dinheiro quando quiser, com "Não prometemos valorização"); Marketplace explicado;
  passos falam de "item"; 2 dúvidas novas ("Posso ganhar dinheiro…?", "Só aceitam moedas?"); cabeçalho, rodapé,
  telas de acesso e metadata em "itens de coleção". Flesch-BR do texto inteiro: **75,2**. Termos proibidos: só em
  negação.
- Movimento (`src/components/landing/movimento/`): `InclinacaoNoPonteiro` (herói em camadas 3D), `FaixaDeConceito`
  (marquee com botão de pausa), `Holofote` (pilares), `EmCena` + `DemoNegociacao` (demonstração do marketplace em
  laço só na tela), `JornadaPresa` ("Como funciona" preso na rolagem, tópico 09 receita B), `ContagemDeValor`
  (preços do "Mercado agora"). CSS: revelação do título por desfoque, carimbo "Guardada", brilho na moeda, deriva
  do guilloché, abertura da foto do cofre com `animation-timeline: view()` (só onde existe).
- Reduzir movimento: cada peça tem a sua saída (JS não liga; CSS só anima em `no-preference`; a jornada vira lista).
- `PEDIDO_FRENTE_2.md` reescrito: 7 entregas (OG sem anéis, herói retrato, 4 cenas da jornada, 3 spots da reserva,
  spots escuros, moldura + selo, vídeo do cofre em laço) com o prompt pronto.

**Testes**: typecheck ✅ · lint ✅ (0 erros; os 17 avisos de sempre) · test ✅ 148/1.383 · build ✅ (`/` = 116 kB,
+3 kB por todo o movimento). Navegador 1440 e 375: título, faixa, holofote, demonstração (quadros 4,6 s e 6,6 s
conferidos), jornada (passo 03 aceso a 60% da pista), contagem; 0 links quebrados, 0 nomes repetidos, 1 `h1`,
0 estouro a 375. **Não testado no navegador**: a emulação de "reduzir movimento" (o painel não emula a preferência;
os caminhos foram revisados no código). Cópia temporária dos ativos e linha do middleware desfeitas antes do build.

### Sessão 3 — 25/10/2026 — ativos da rodada 2, merge da main e publicação

- Ativos aprovados e ligados: cofre retrato (celular), 4 cenas da jornada, macro da serrilha (abre a Reserva),
  ícones da reserva e moldura/selo do recibo (máscara CSS), vídeo do cofre na chamada final (`VideoDeFundo`: só monta
  perto da tela, pausa fora dela, botão de pausar, sem vídeo em reduce/economia de dados), OG sem anéis.
  Reprovados: moedas "três quartos" e lacre (P12).
- `main` mesclada (Frentes 1, 4 e 5): sem conflito. Contrato de tokens adotado: papéis `--pub-*` apontam para
  `--ro-*`; exceções de tema claro apagadas; texto dourado/verde pelos papéis `-texto`; "corretagem" → "comissão de
  negociação" em /taxas e /suporte (texto da página, não do documento versionado).
- Imagens da Frente 2 lidas do catálogo `src/brand/ativos.ts` quando estão lá (P11 para o resto).
- Anéis olímpicos liberados (Brandbook §8.3): ficha da perícia volta a ter anverso/reverso, com a foto real.
- Testes: typecheck ✅ · lint ✅ (0 nos arquivos da frente) · test ✅ 153/1.422 · build ✅ (`/` = 120 kB).

### Sessão 4 — 25/10/2026 — publicação em produção

- Commits: 56ff581 (landing), 790c265 (merge da main), 9ca2137 (ativos rodada 2 + tokens), 095b050 (ativos da landing
  + `visuais/` no middleware), 2371edf (merge da Frente 1, catálogo rodada 3b), e3e881c (todos os ativos aprovados do
  catálogo em `public/visuais/`, 189 arquivos, 12 MB, sem PNG mestre). `main` avançada por fast-forward e publicada.
- O que estava pendente de merge e entrou: 2 commits de `feat/brandbook-real-olimpico`. A Frente 2 continua sem commit
  próprio (a pasta dela tem os mestres PNG e o JSON); os derivados que o site usa estão agora no repositório.
- Ambiente (Vercel, só existência): POSTGRES_URL e SESSION_SECRET em produção; AUREA_STORE_KEY só no Preview (produção
  usa o padrão do código). `types.ts` não mudou: sem rotação.
- Push feito com a conta `gabrielsilva-aureacustodia` (a ativa era a `sintetica`); conta ativa devolvida à `sintetica`.
- Ajustes pós-publicação (25/10/2026): foto da Segurança corrigida (`<picture>` em bloco; o clip-path da revelação
  apagava a caixa em linha) — af9d5b4, produção por 4b8fd06 (a Vercel deduplica commit enviado à branch e à main:
  publicar SÓ na main). Avisos de "imagem ilustrativa" removidos (15c1a4c); recibo só com "Código simulado" e faixa
  sem botão de pausa (b83d871), a pedido do Gabriel. Conferido na produção: foto carregada, faixa sem botão.
