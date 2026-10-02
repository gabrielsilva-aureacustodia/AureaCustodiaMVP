# Execução — Tutorial guiado (`tutorial/onboarding-guiado`)

Estado: **código pronto, sem commit e sem push.** Falta o teste manual no navegador (ver "O que não
foi verificado").

## Onde está o trabalho

Worktree `C:\dev\AureaCustodiaMVP-tutorial`, na branch `tutorial/onboarding-guiado` (a partir de
`3ec88c5`). O checkout principal (`C:\dev\AureaCustodiaMVP`) é compartilhado com outros agentes, que
trocam de branch por baixo; no começo desta tarefa parte das minhas edições em arquivos rastreados
sumiu por isso, e a branch passou a `landing/redesign-real-olimpico`. O worktree isola o trabalho.
`node_modules` do worktree é uma **junção** para o do checkout principal: ao remover o worktree, use
`git worktree remove` e **não** `rm -r node_modules` dentro dele.

## Pesquisa: biblioteca ou componente próprio

Conferido em 01/10/2026 (`gh api` e `npm view`):

| Biblioteca | Estrelas | Licença | Último push | Observação |
|---|---|---|---|---|
| [driver.js](https://github.com/kamranahmedse/driver.js) | ~26,9 mil | MIT | 18/07/2026 | Imperativa, sem React; foco em destacar elemento. |
| [react-joyride](https://github.com/gilbarbara/react-joyride) | ~7,9 mil | MIT | 09/07/2026 | Declarativa; suporta React até 19. |
| [shepherd.js](https://github.com/shipshapecode/shepherd) | ~13,8 mil | o GitHub não identifica (`NOASSERTION`) | 01/10/2026 | Licença a ler à mão antes de adotar. |

Reconhecidas como candidatas também: intro.js e reactour (não avaliadas a fundo: a licença do
intro.js é restritiva para uso comercial).

**Decisão: componente próprio, sem dependência nova.** Motivos, na ordem de peso:

1. **O pedido foge do que as bibliotecas fazem bem.** Duas camadas diferentes (uma que escurece e
   borra, outra que **não** escurece e deixa a tela clicável), tour que atravessa cinco rotas do
   Next, e um exemplo de custódia que só existe dentro do tour. As três bibliotecas são feitas para
   *um* passeio sobre *uma* página; trocar de rota no meio exige código de cola por fora, e o modo
   "sem escurecer" é gambiarra em todas.
2. **O exemplo de custódia precisa entrar no desenho das telas**, não em cima delas. Isso é um
   contexto React lido por dois componentes — nenhuma biblioteca ajuda.
3. **Custo de manter.** São ~700 linhas ao todo, sem pacote novo no `package-lock.json`, sem CSS de
   terceiros para brigar com `responsive.css` e sem dependência de licença para acompanhar. Os textos
   e a tradução (todas as bibliotecas trazem rótulos em inglês) já são nossos.
4. **O risco é baixo e reversível.** Se um dia o recurso crescer, trocar o `TourGuiado` por
   react-joyride muda um arquivo.

## O que foi construído

### Conteúdo e regras — `src/domain/tutorial.ts` (testado em `tutorial.test.ts`, 14 testes)

* **Passos do tour** (`passosDoTour`): boas-vindas + 5 etapas, na ordem pedida.
  1. **Mercado** — blocos de venda e de compra, e a **compra facilitada** (botão Comprar → confirmar
     com saldo ou com Pix/cartão, comissão da Tabela).
  2. **Compras** — fazer oferta, opções de pagamento (saldo e pré-pago), negociação automática,
     "sem obrigar a comprar".
  3. **Vendas** — anunciar, negociação automática + comissão do vendedor, e o passo "como você ainda
     não tem moedas, o próximo é Envios" (o texto muda se a conta já tem moeda).
  4. **Envios** — como funciona o envio físico, como embalar, e a **avaliação**: o recibo é o que
     libera negociar.
  5. **Custódia** — valores lidos da Tabela de Taxas (`taxas.custodiaMensalPorMoeda`) e de
     `custody.ts` (`DIAS_TOLERANCIA_FATURA`, `DIAS_CARENCIA_BLOQUEIO`); passos em **Envios** e
     **Minha conta** com a fatura de exemplo ligada; fecho.
* **Tutorial por página** (`tutorialDaPagina`): Início, Mercado, Compras, Vendas, Envios, Recibos e
  Minha conta — uma dica por botão/bloco relevante.
* **Tutoriais contextuais** (`tutoriaisContextuais`): disparam quando o elemento aparece na tela,
  em qualquer rota. Hoje: **Custódia a pagar** (depois que a moeda é aceita) e **Custódia vencida**.
* **Âncoras sem tocar nas telas** (`Alvo`): seletor CSS + texto contido (+ `subir` para o painel
  inteiro / `proximo` para o campo do rótulo). Nenhuma página recebeu `data-*`. Efeito colateral
  bom: **não edito `inicio/page.tsx`**, então não há colisão com a branch
  `interno/moedas-no-mercado-e-blocos-home`. Se uma tela mudar o texto, a dica some e nada quebra.
* **Fatura de exemplo** (`faturaDeExemplo`, `resumoComExemplo`): uma moeda pela tarifa vigente, prazo
  real de 30 dias.

### Interface — `src/components/tutorial/`

* `TutorialProvider.tsx` — maestro. Prioridade: tour > o que a pessoa pediu > automático. Montado em
  `src/app/(app)/layout.tsx`, dentro do `AppProvider`.
* `TourGuiado.tsx` — véu escuro com desfoque e **buraco** (`clip-path` evenodd) no elemento, contorno
  dourado, balão que se posiciona abaixo/acima/centro (e vira folha na base em celular). Botões
  **Voltar**, **Pular esta etapa**, **Pular tudo** (e Esc), **Próximo/Concluir**. A camada captura
  todo clique: durante o tour nada da tela é acionável.
* `DicasDaPagina.tsx` — **sem escurecer**: bolinhas numeradas nos elementos + painel com a lista,
  botão **Fechar tutorial** sempre visível e link **Refazer o tour guiado**.
* Botão fixo **"Ver tutorial desta página"** (canto inferior direito) em todas as telas que têm guia.
* `src/styles/tutorial.css` — importado antes de `responsive.css`, que continua o último.
  Alvos de toque de 44px; camadas z-index: botão 45, dicas 55, tour 90 (acima da gaveta do menu).

### Telas tocadas (3 arquivos, mudanças mínimas)

* `AvisoDebitoCustodia.tsx` e `ResumoDaCustodia.tsx`: somam a fatura de exemplo ao que desenham
  quando `useTutorial().exemplo` existe, com a marca **EXEMPLO DO TUTORIAL**.
* `layout.tsx` e `globals.css`: montagem e import do CSS.

### O exemplo não toca em nada real

A fatura vive só no contexto do tutorial. Não entra em `AppState`, não passa por `run()` nem por
Server Action, não gera cobrança, só existe enquanto o passo de custódia está na tela e some no
instante em que o passo muda ou o tour fecha. O véu bloqueia o clique em "Pagar agora".

## Quando cada coisa aparece

* **Tour:** primeira vez que a conta abre qualquer tela do app (chave `…:tour` ausente).
  Terminar ou pular grava a chave; **Refazer o tour guiado** apaga e recomeça.
* **Tutorial da página:** primeira visita de cada tela, ~1 s depois de abrir. Cada passo do tour
  marca a própria tela como já explicada (quem vê o tour em Mercado não recebe de novo as dicas de
  Mercado). Terminar ou pular o tour marca a tela atual também.
* **Contextual:** varredura a cada 2 s, só com nenhum outro tutorial aberto.
* **Progresso:** `localStorage`, chaves `ro-tutorial:<e-mail>:tour`, `…:pagina:<rota>` e
  `…:contexto:<id>`. **Sem tabela e sem migration.** Não foi preciso servidor; se a ideia de
  sincronizar entre aparelhos voltar, é decisão a combinar antes — aqui trocar de aparelho só
  repete o tutorial.

## Verificação

| Item | Resultado |
|---|---|
| `npm run build` | ok |
| `npm run typecheck` | ok |
| `npm run lint` | 0 erros (15 avisos antigos, nenhum nos arquivos novos) |
| `npm test` | 122 arquivos, 1031 testes passando |
| Testes novos | `src/domain/tutorial.test.ts` — rotas, chaves, valores reais, texto sem palavra proibida nem jargão, forma do tour, exemplo de custódia |

**Dois testes que já estavam vermelhos no HEAD limpo** (`conta/custodia/pagina.test.ts` e
`server/estacao/analise.test.ts`, caso B2.5) foram consertados aqui: usavam a competência
`2026-09` e dependiam do relógio, e falharam quando virou outubro. Agora fixam a data com
`vi.setSystemTime`. Nenhuma regra de negócio foi alterada.

## O que não foi verificado

**O teste manual no navegador não foi feito.** O login do app passa pelo Supabase Auth (a senha
`12345678` do `CLAUDE.md` já não vale: o atalho por catálogo local foi removido em 20/09/2026) e eu
não tenho credencial real. Tentei forjar o cookie de sessão assinado só para testar localmente, e o
ambiente bloqueou — corretamente: é contornar autenticação. Não insisti.

Roteiro para quem tiver login (servidor local: `npm run dev` no worktree):

1. **Usuário novo** — abra o navegador sem dados do site (ou apague `ro-tutorial:*` no
   `localStorage`) e entre. Deve abrir a boas-vindas escurecida; siga as 5 etapas. Confira: balões
   no lugar certo, **Voltar / Pular esta etapa / Pular tudo**, e na etapa 5 o aviso "Custódia a pagar
   — R$ 2,00 · EXEMPLO DO TUTORIAL" em Envios e o cartão "Minha custódia" em Minha conta. Ao fechar
   o tour o exemplo some e `/conta/faturas` continua vazio.
2. **Usuário que já viu tudo** — só o botão "Ver tutorial desta página" aparece; clique e confira
   as bolinhas e o "Fechar tutorial".
3. **Celular** (390 px) e **desktop**: balão como folha na base no celular, elemento rolado para
   cima, nada com menos de 44 px de toque.
4. **Contextual** — com uma conta que tenha fatura em aberto, o aviso "Sua moeda foi aceita" abre
   uma vez.

Pontos de atenção para esse teste, porque dependem da tela real:
* âncoras por texto: se alguma dica não aparecer, o texto da tela mudou e a âncora em
  `src/domain/tutorial.ts` precisa acompanhar;
* **Envios** de quem já tem envio em andamento não mostra o aviso de custódia no passo 1 — o balão
  da etapa 5 cai no centro, sem foco (comportamento previsto);
* o botão "Ver tutorial desta página" pode ficar sobre algum botão no canto inferior direito em
  telas muito compridas; mover para a barra superior é ajuste de uma linha de CSS.

## Para o merge

* Não há colisão em `inicio/page.tsx` (não foi editado). A Home recebeu dicas por âncora de texto
  (`.stats`, `.blocks h3`); se a outra branch trocar esses blocos, ajustar o caso `/inicio` em
  `tutorialDaPagina`.
* Nenhuma migration, nenhuma variável de ambiente, nenhuma dependência nova.
* Nada commitado, nada empurrado.
