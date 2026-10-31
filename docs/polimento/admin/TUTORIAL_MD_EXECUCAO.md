# MD de execução — `feat/aurea-tutorial-admin` (Frente 3 — tutorial do painel)

```
Worktree:   /workspace/aurea/wt/tutorial-admin   (npm ci próprio; sem junção nem symlink)
Branch:     feat/aurea-tutorial-admin            base origin/main @ d29727a (decisão do Gabriel, 30/10/2026)
Agente:     Claude Code (bot "ÁUREA · Polimento, tutorial do Admin e check-up")
Merge:      push e PR ficam com o Gabriel
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
- (corrigido) No celular o passo "Buscar ou ir para…" não fala mais de Ctrl K.
- Axe não foi rodado sobre a camada do tutorial (o do cliente já tinha sido; o balão e as dicas são os mesmos componentes).
- Conteúdo: os textos descrevem as telas pelo inventário e pelo código lido; **nenhum texto passou por revisão de linguagem** (não há pedido a workers: nenhuma peça visual foi necessária). Se o Gabriel quiser revisão, é pedido a `pedidos_workers.md`.

## Pendências e propostas (não aplicadas)
- Subir `VERSAO_DO_TUTORIAL_ADMIN` (v1 → v2) faz toda a equipe rever o tour — é o botão de "refazer para todos".
- Link "Refazer o tour guiado" já existe dentro do painel de dicas.
- Sincronizar o progresso entre aparelhos exigiria servidor (tabela ou migration): decisão do Gabriel; hoje é por navegador.
