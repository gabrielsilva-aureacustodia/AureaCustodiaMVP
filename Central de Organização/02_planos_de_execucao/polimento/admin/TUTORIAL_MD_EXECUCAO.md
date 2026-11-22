# MD de execução — `feat/aurea-tutorial-admin` (Frente 3 — tutorial do painel)

```
Worktree:   /workspace/aurea/wt/tutorial-admin   (npm ci próprio; sem junção nem symlink)
Branch:     feat/aurea-tutorial-admin            base origin/main @ d29727a (decisão do Gabriel, 30/10/2026)
Agente:     Claude Code (bot "ÁUREA · Polimento, tutorial do Admin e check-up")
Estado:     FECHADA em 30/10/2026 — PRs #15 e #17 mergeados na main (ver "Estado final")
```

## Decisões (Gabriel, 30/10/2026)
1. Base na `main`, não na branch do polimento: o tutorial entra em arquivos novos e no layout; se o PR #14 entrar antes, basta rebase.
2. O **tour abre sozinho só na primeira entrada de cada membro**. Nas telas, **apenas o botão "Ver tutorial desta página"**: sem tutorial automático por tela.
3. **Respeitar o papel** (dev, sócio, operação) e as regras do CLAUDE.md/AGENTS.md.

## O que foi feito
- **`src/domain/tutorial-admin.ts`** (puro, sem React): 17 "páginas" (as 15 telas do menu + ficha do cliente + ficha da moeda), passos do tour, dicas por página, chaves de localStorage.
  Todo passo e toda dica declara `exige` (basta UMA permissão, como `permiteItem` do menu) e, em poucos casos, `semAcesso` ("só acompanha, não aprova"). `passosDoTourAdmin(permissoes)` e
  `tutorialDaPaginaAdmin(pagina, permissoes)` devolvem só o que o membro alcança; página que ele não abre devolve `null` (e o botão não aparece). **Papel por permissão, nunca por nome**: um papel criado
  amanhã já recebe o tutorial certo. As etapas do tour são renumeradas por papel ("Etapa 1 de 3" para operação, não "1 de 5" com buracos).
- **`src/components/admin/TutorialAdmin.tsx`**: o maestro. Lê `useAdmin().membro.permissoes`, abre o tour se não há `ro-tutorial-admin:v1:<e-mail>:tour`, e mostra o botão e as dicas. A primeira dica de toda tela é o
  "para que serve" com o texto do próprio menu (`itemDaRota`), para uma tela sem dados não abrir o painel vazio. No celular, abre a gaveta do menu enquanto o passo aponta para o menu e rola o item do menu para a vista.
- **`src/components/tutorial/TourGuiado.tsx`** (único arquivo existente tocado, 20 linhas): `passo` virou o tipo estrutural `PassoDeTour` e ganhou `totalDeEtapas` (padrão = o do cliente). O comportamento do cliente não muda.
  `DicasDaPagina` e `dom.ts` serviram sem alteração; o CSS (`tutorial.css`) já era global.
- **`src/app/(admin)/admin/layout.tsx`**: monta `<TutorialAdmin />` dentro do `SidebarProvider`/`AdminProvider`.
- **`src/domain/tutorial-admin.test.ts`** (22 testes): cruza o tutorial com `GRUPOS_NAV` (toda tela do menu tem tutorial, com a mesma permissão), com os três papéis de sistema e com um papel só de leitura; garante que as chaves
  existem no catálogo, que nenhuma dica é órfã, ids únicos e que nenhum texto tem palavra proibida pelo jurídico, valor em reais ou percentual escritos à mão.

## Regras que o tutorial respeita
- Só leitura: não chama Server Action, não lê dado, não grava nada além da chave de localStorage (estado de interface). **Não toca em `permissoes.ts`, em conferência de página ou de Server Action.**
- O menu e o tutorial são conveniência; quem recusa de verdade continua sendo a página e a Server Action.
- Âncoras por seletor e texto (`Alvo`), sem `data-` novo nas telas: se uma tela mudar um título, a dica some, o tutorial nunca quebra a página. Ganchos usados: `href` do menu, `h2`/`h3` de seção, legendas de tabela, `.adm-main`.
- Texto sem número de taxa nem alíquota (a taxa vigente é a de `/admin/configuracao`; o imposto é o do contador). Marca "Real Olímpico"; nada de token/NFT/cripto/investimento/rentabilidade.

## O que cada papel de sistema vê
| Papel | Tour | Telas com botão |
|---|---|---|
| dev | 5 etapas (Central, Operação do dia, Gestão, Configuração incl. Equipe, Atalhos) | as 17 |
| sócio | 5 etapas, sem o passo de Equipe | 16 (sem Equipe e papéis; `admin.papeis`/`admin.membros` ficam de fora) |
| operação | 3 etapas (Central, Operação do dia só com Bancada, Logística e Auditoria de moedas, Atalhos) | Central, Bancada, Logística, Auditoria e a ficha da moeda |

## Verificação
- Base antes de mexer: lint 0 erros / 16 avisos; test 157 arquivos / 1.457 passando.
- Depois: typecheck ok · lint 0 erros / 16 avisos (os mesmos) · test 158 arquivos / 1.479 passando (1 pulado) · build ok.
- Navegador local isolado (`next start`, store em memória, `.env.test.local` ignorado, sessão `dev`), 1440 e 375 px: o tour **abre sozinho na 1ª entrada** e **não reabre na 2ª**; percorre os 16 passos com o foco no item do menu
  na tela (no celular com a gaveta aberta e fechada ao fim); **nenhuma tela abre tutorial sozinha**; o botão existe nas 16 URLs medidas; 0 erro de console.

## Não verificado (limites do ambiente)
- **Sem Postgres**, só o papel `dev` existe no navegador: os papéis sócio e operação foram verificados **pelos testes de domínio** (cruzando permissões reais de `PAPEIS_DE_SISTEMA`), não vistos na tela.
- Sem banco, várias telas abrem com "Ambiente sem banco de dados" (Atendimento, Uso, Contábil…): as âncoras de seção dessas telas (ex.: "Trilha de auditoria", abas do Contábil) **não foram vistas funcionando**; nelas a dica
  aparece sem a bolinha, e a primeira dica ("para que serve a tela") sempre aparece. Vale rever em ambiente com dados.
- (corrigido nesta rodada) O passo "Buscar ou ir para…" não fala de Ctrl K a 560 px ou menos, onde o painel esconde o atalho e deixa só o botão.
- (feito nesta rodada) Axe (WCAG A/AA e boa prática) sobre o tour (16 passos) e sobre as dicas (16 telas), em 1440 e 375 px, tema claro e escuro: 0 violações da camada do tutorial depois de trocar o `h4` do título por `h2`. Sobraram achados das próprias telas, idênticos com o botão fechado (`heading-order` em Bancada e Notas fiscais; `scrollable-region-focusable` em Indicadores, Financeiro e Equipe), que o PR #14 corrige.
- Conteúdo: os textos descrevem as telas pelo inventário e pelo código lido; **nenhum texto passou por revisão de linguagem** (não há pedido a workers: nenhuma peça visual foi necessária). A revisão está pedida em `/workspace/aurea-polimento/pedidos_workers.md` (T3-01, DeepSeek); o texto revisado entra só em `src/domain/tutorial-admin.ts`.

## Pendências e propostas (não aplicadas)
- Subir `VERSAO_DO_TUTORIAL_ADMIN` (v1 → v2) faz toda a equipe rever o tour — é o botão de "refazer para todos".
- Link "Refazer o tour guiado" já existe dentro do painel de dicas.
- Sincronizar o progresso entre aparelhos exigiria servidor (tabela ou migration): decisão do Gabriel; hoje é por navegador.

## Estado final (30–31/10/2026)

| PR | Branch | Merge commit | O que levou |
|---|---|---|---|
| #15 | `feat/aurea-tutorial-admin` | `29f3257` | tutorial do painel por papel: conteúdo em `tutorial-admin.ts`, `TutorialAdmin.tsx`, `TourGuiado` estrutural, 22 testes |
| #17 | `polish/aurea-tutorial-admin-ajustes` | `6a0b8ac` | título do tour e das dicas `h4` → `h2`; passo da busca sem Ctrl K a ≤ 560 px; **`VERSAO_DO_TUTORIAL` v2 → v3** (pedido do Gabriel: todos os clientes revêem o tour) |

- **Tutorial v3 (cliente):** só muda a chave do localStorage (`ro-tutorial:v3:<e-mail>:…`). Sem migration, sem mudança de dado. O tutorial do painel tem chave própria (`ro-tutorial-admin:v1`) e não foi afetado.
- **Produção:** o merge `6a0b8ac` gerou deploy `Production` com status `success`. Conferi pelo JS público de `realolimpico.com.br`: serve `"ro-tutorial:".concat("v3")` e o título do tour como `<h2>`. O código do painel fica atrás do login e não aparece nos arquivos públicos.
- **Axe** sobre o tour (16 passos) e as dicas (16 telas), 1440 e 375 px, temas claro e escuro: 0 violações da camada do tutorial depois do `h2`. As que sobraram eram das telas (Bancada, Notas fiscais, Indicadores, Financeiro, Equipe) e vieram corrigidas pelo PR #14.
- **Revisão de linguagem:** pedido T3-01 em `/workspace/aurea-polimento/pedidos_workers.md` (DeepSeek). O texto revisado, quando chegar, entra só em `src/domain/tutorial-admin.ts`, em PR próprio.

### O que NÃO foi visto na tela
- **Tour v3 do cliente em produção:** só o código foi conferido; ver o tour pede conta de cliente (credenciais de produção não liberadas).
- **Papéis sócio e operação:** nunca vistos no navegador (sem Postgres só existe `dev`); cobertos pelos testes de domínio com as permissões reais de `PAPEIS_DE_SISTEMA`.
- **Telas sem dado** (Atendimento, Uso, Contábil, fila de NFS-e, trilha): as âncoras de seção não foram vistas funcionando; a dica "para que serve a tela" aparece sempre.
- **Firefox e WebKit:** não medidos (download grande; ficaria para a VM do Colab).
- **Suíte de testes instável:** falhou 2 vezes em rodadas separadas (7 arquivos; depois 1 teste) e passou inteira na repetição, sem mudança de código. Causa não identificada.
