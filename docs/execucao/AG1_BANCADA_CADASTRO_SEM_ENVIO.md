# AG1 — Cadastro sem envio na bancada (moeda entra na fila de análise)

Branch: `exec/ag1-bancada-cadastro-sem-envio`, a partir de `main` em `c520233`.
Sem dependência das outras branches. Pode rodar em paralelo com AG2, AG3 e AG4.

## O problema

Hoje existe um caminho só para pular etapas: **Cadastrar moeda sem envio**
(`src/server/estacao/cadastro-direto.ts`), que pula **tudo** — envio postal e
análise da bancada. A moeda nasce já com recibo, laudo e `statusFisico:
'Armazenado'`, com protocolo `RO-DIR-nnnn`.

Falta o caso do meio: a moeda **já está fisicamente no armazém**, mas ainda
**precisa ser analisada**. Hoje não há como colocá-la na fila da bancada sem
inventar um envio postal que não aconteceu.

## O que construir

Uma segunda opção no painel que cria o registro da moeda atrelado ao usuário e a
coloca **na fila de moedas a serem analisadas na bancada**, pulando **apenas** o
passo de envio. A análise, o laudo, o recibo e a corrente de hashes continuam
saindo pelo caminho normal da bancada.

### Nomes (decisão do Gabriel, 21/09/2026)

| Opção | Nome novo | O que pula |
|---|---|---|
| A que já existe (`cadastro-direto.ts`) | **Cadastro direto** | envio **e** análise |
| A nova, desta branch | **Cadastro sem envio** | só o envio |

Atenção: "cadastro sem envio" hoje é o rótulo da opção **antiga**. Os dois nomes
trocam de dono nesta branch — renomeie o rótulo, a permissão e os textos de tela
da antiga para "Cadastro direto" antes de criar a nova, senão as duas ficam com
o mesmo nome na mesma tela.

### Campos e comportamento

Os **mesmos campos** do formulário que já existe em
`src/components/admin/acervo/CadastroDiretoDeMoeda.tsx`, inclusive a opção de
cadastrar **mais de uma moeda de uma vez**.

A moeda precisa chegar à bancada **exatamente como chegaria de um envio**:

- protocolo de envio gerado pelo mesmo contador dos envios normais (não
  `RO-DIR-`, que é da opção antiga — ver `src/domain/codes.ts`);
- registro em `state.envios` atrelado ao usuário, com a quantidade e o tipo de
  moeda informados, no estado em que a fila da bancada o encontra;
- códigos de moeda numerados pela mesma sequência (`seq.coin`), para a bancada
  abrir e fechar a análise sem saber que a moeda não veio pelos Correios.

Registre em `Envio` (ou no campo equivalente) **de onde o registro veio**, do
mesmo jeito que `Analise.origem` distingue `'bancada'` de `'cadastro_direto'`:
meses depois, ninguém vai conseguir explicar um envio sem rastreio postal se o
sistema não disser que ele nasceu assim de propósito.

### Acesso

Ambas as opções — **Cadastro direto** e **Cadastro sem envio** — ficam
disponíveis para quem tem acesso de **Sócio**. Hoje a permissão
`acervo.cadastro_direto` é descrita como "Restrito a sócios e desenvolvimento"
(`src/domain/admin/permissoes.ts:49`). Crie a permissão irmã para a opção nova
(sugestão: `acervo.cadastro_sem_envio`), no mesmo módulo `acervo`, e conceda as
duas ao papel de sócio.

A permissão é conferida **na página e dentro da Server Action**, por conta
própria — esconder o menu não é controle de acesso. Toda ação grava
`admin.<area>.<verbo>` em `audit_log`, como as demais.

## Onde montar a tela

Nos mesmos dois lugares onde a opção antiga já está montada:

- `src/app/(admin)/admin/bancada/page.tsx`
- `src/app/(admin)/admin/usuarios/[email]/page.tsx` (aba Acervo)

## Ordem de leitura

1. `CLAUDE.md`
2. `src/server/estacao/cadastro-direto.ts` — a opção antiga, inteira; é o molde
3. `src/server/estacao/analise.ts` — como a bancada abre e fecha a análise de verdade
4. `src/server/admin/bancada.ts` — como a fila encontra um envio (`envioNaBancada`)
5. `src/server/actions/admin/bancada.ts` — `cadastrarMoedaDiretaNoPainel`, o padrão de Server Action com `comPermissao(...)` e auditoria
6. `src/components/admin/acervo/CadastroDiretoDeMoeda.tsx`
7. `src/domain/admin/permissoes.ts`
8. `src/domain/codes.ts` — geradores de protocolo e de código de moeda
9. `src/app/(admin)/README.md` — mapa de rotas e permissões

## Cuidados

- **A corrente de hashes não muda.** A moeda desta branch fecha análise pelo
  serviço normal da bancada, então a fórmula do hash é a mesma. Não escreva
  caminho paralelo de laudo.
- **Peso**: a moeda cadastrada sem envio precisa do peso padrão do catálogo
  (`CoinType.pesoPadraoMg`), nunca `0` — `pesoMg` entra na fórmula do hash e
  corrigir depois exige recalcular a corrente inteira desde o GENESIS.
- Campo novo em `Analise` ou `Envio` precisa entrar **também** em
  `src/server/db/diff.ts` (`normalizarAnalise` / `normalizarEnvio`) e no
  repositório correspondente. Campo que o `diff` não copia é campo que nunca
  gera `atualizar` — foi assim que a `origem` de 60 moedas ficou gravada errada.
- Migration nova em `src/server/db/migrations/`, numerada em sequência (a última
  é `032`), com o CHECK da coluna nova.

## Fechamento

`npm run typecheck`, `npm run lint`, `npm test` e `npm run build` — **uma vez
cada, no fim**. Não rode teste entre as etapas. Depois commit e push da branch.

Atalho assumido entra em `RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta, no
mesmo commit.
