# Prompt — Agente A · Mercado e termos

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.
> Os três agentes (A, B e C) podem abrir no mesmo dia.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), como **Agente A** da rodada de finalizações de 13/09/2026.

**Sua missão:** o mercado cobra a taxa certa dos dois lados, a fila é justa e editável, e os
Termos de Uso do advogado vão para o site com o aceite registrado como prova.

Outros dois agentes trabalham ao mesmo tempo neste repositório — B (cobrança e custódia) e C
(painel Admin). Existe um contrato escrito de quem edita o quê, e ele não se negocia.

## Leia nesta ordem, antes de escrever qualquer linha

1. **`CLAUDE.md`** (raiz) — as regras do projeto
2. **`docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md`** — seções **0, 1, 2 e 3 inteiras**, e
   a **seção 4, que é a sua**
3. **`docs/publish_docs/PROTOCOLO_DO_AGENTE.md`** — as regras de sessão. A regra 5 e a lista
   "Nunca" estão desatualizadas, e **quem as reescreve é você, em A1.7**
4. **`RISCOS_ASSUMIDOS.md`** — em especial RA-06
5. Para A3, em `docs/finalizacoes/`: **`2026-09-13_minuta_termos_de_uso_v1.docx`** (a fonte da
   numeração), **`2026-09-13_minuta_termos_de_uso_v1.md`** (o texto para leitura),
   **`2026-09-13_minuta_comentarios_do_advogado.md`** e
   **`2026-09-13_minuta_pontos_para_os_socios.md`**

Se algum dos documentos 1 a 4 não estiver no seu worktree, leia da pasta principal
`C:\dev\AureaCustodiaMVP\`.

**Este plano é a aprovação do Gabriel para tudo o que está escrito nele.** Não pare para pedir
aprovação de passo que está no plano. Pergunte só quando surgir decisão que o plano não cobre — e,
enquanto espera, siga com o que não depende dela.

## Seu worktree e suas branches

Você trabalha numa pasta própria, para não trocar de branch debaixo dos outros agentes:

```bash
git -C C:/dev/AureaCustodiaMVP fetch origin
git -C C:/dev/AureaCustodiaMVP worktree add C:/dev/AureaCustodiaMVP-mercado -b feat/a-mercado-e-termos origin/main
cd C:/dev/AureaCustodiaMVP-mercado
npm install
git checkout -b feat/a1-comissao-dois-lados
```

O `.env.local` também não existe no worktree: `scripts/env-local.mjs` já o encontra para os
scripts de banco, e para `npm run dev` você copia o arquivo da pasta principal (ele continua
ignorado pelo Git). Os testes não precisam dele.

## Seu território

Mercado (`src/domain/market.ts`, `fees.ts`, `statement.ts`, as taxas de `constants.ts`,
`lancamentosDeTrade` em `ledger.ts`, `src/server/actions/market.ts` e `sell.ts`,
`src/app/(app)/mercado`, `vender`, `src/components/market/`, `AppProvider.tsx`, `Topbar.tsx`) e
termos (`src/domain/legal.ts`, `aceite.ts`, `documentos-legais/`, `src/server/auth/legal.ts`,
`config.ts`, `src/server/actions/auth.ts` e `legal.ts`, `src/app/termos`, `privacidade`,
`taxas`, `suporte`, `cadastrar`, `entrar`, `src/app/(app)/conta/configuracoes`,
`src/components/login/`, `src/components/legal/`).

A tabela completa está na seção 3.1 do plano. **Arquivo fora do seu território você não
edita** — escreve um item em `docs/finalizacoes/PENDENCIAS_AGENTE_A.md` pedindo que o dono edite.
Em particular: **a compra direta pelo gateway (`src/server/actions/payments.ts` e
`src/server/payments/`) é da frente B**, mesmo usando a sua função de comissão.

Em `src/domain/types.ts` você edita `SellOffer`, `BuyOrder` e `Trade` no lugar, e o resto só no
fim, num bloco `/* === Finalizações · Frente A === */`. Migrations: **014, 015 e 016**. Riscos
assumidos: **RA-24 a RA-29**.

## Suas três sub-branches, uma por vez

- **A1 — Comissão dos dois lados** (`feat/a1-comissao-dois-lados`, migration 014). Plano,
  seção 4, A1. `TabelaDeTaxas` e `TAXAS_PADRAO` em `fees.ts`; motor e três ações cobrando do
  comprador e do vendedor; livro-razão com quatro lançamentos; extrato lendo a comissão
  congelada; prévias na tela; **e o alinhamento da documentação de A1.7**. Numa negociação de
  R$ 200,00: comprador paga R$ 202,00, vendedor recebe R$ 198,00.
  **A1 é a primeira da rodada a entrar na `main`** — B e C esperam por ela. Faça-a primeiro e
  sem desvio.
- **A2 — Livro de ordens** (`feat/a2-livro-de-ordens`, migration 015). **Comece reproduzindo**
  (A2.1) — o casamento automático já existe e os testes passam; o defeito está no caminho.
  Depois: `prioridadeEm`, edição de compra e venda com a regra de perder a vez, "Minhas
  ofertas" com data, hora e posição na fila, aviso para quem teve a oferta executada, histórico
  da fila.
- **A3 — Termos oficiais** (`feat/a3-termos-oficiais`, migration 016). O texto do advogado como
  dado versionado com hash, `/termos`, `/taxas`, `/suporte`, registro formal de aceite com
  cadeia de hash, arbitragem com assinatura específica opcional, faixa de atualização não
  bloqueante.

## O ciclo de cada sub-branch

Ao terminar:

```bash
npm run typecheck
npm test
npm run build
git checkout feat/a-mercado-e-termos
git merge --no-ff feat/a1-comissao-dois-lados
git push origin feat/a-mercado-e-termos feat/a1-comissao-dois-lados
```

Escreva em `docs/finalizacoes/RELATORIO_AGENTE_A.md`: o que foi feito, os testes novos, o que
você clicou para conferir e o que apareceu, e a linha **"A1 pronta para main — merge <hash>"**.

**Você não faz merge na `main`.** Quem leva é o Gabriel. Antes de abrir a sub-branch seguinte:

```bash
git checkout feat/a-mercado-e-termos
git fetch origin
git merge origin/main
git checkout -b feat/a2-livro-de-ordens
```

## Três coisas que não podem sair erradas

**1. A comissão muda nos 16 pontos ao mesmo tempo, ou em nenhum.** A lista está no quadro
"Onde está hoje" de A1. Mudar o motor sem o livro-razão faz a diferença virar lançamento de
`ajuste`. O teste que prova: negociação pelo motor, por `buyLot` e por `sellToBid` **não gera
`ajuste`**.

**2. O texto do advogado não é reescrito.** Nem terminologia, nem concordância, nem referência
cruzada errada. Os pontos de texto já estão listados para voltar a ele. A varredura de palavras
proibidas vale para o texto de interface que **você** escreve, não para a minuta.

**3. Nada trava.** Decisão do Gabriel de 13/09: termos não bloqueiam cadastro, entrada nem
operação. A caixa pré-marcada sai e **nenhuma caixa obrigatória entra no lugar** — o aceite
geral é por clique no botão, com a frase ao lado. A arbitragem é opcional. A faixa de termos
atualizados é dispensável e não é modal.

## Regras que valem em cima de tudo

- **Nenhuma trava que o Gabriel não pediu**: nem *feature flag*, nem gate de ambiente, nem
  confirmação obrigatória, nem validação de formulário que impeça seguir.
- **Dinheiro em centavos inteiros.** Percentual em pontos-base inteiros.
- **Nada de `@/server/*` em Client Component.**
- **Tabela de prova é só `INSERT`**: `ofertas_historico` e `aceites_documentos` não têm `UPDATE`
  nem `DELETE` em repositório nenhum.
- **Toda regra nova de dinheiro, prazo ou fila tem teste no mesmo commit.**
- **Palavras proibidas em texto do produto**: token, NFT, cripto, ativo digital, ativo,
  investimento, investidor, corretora, rentabilidade, retorno. O termo é **recibo**. Exceções:
  a minuta do advogado e comparação com mercado externo.
- **Não expanda o escopo.** O que já funciona e não é requisito do plano, não se toca.
- **Não mexa em DNS, e-mail, domínio nem variável de ambiente.** Se precisar de valor novo, peça
  em `PENDENCIAS_AGENTE_A.md` com o **nome e o valor literal e completo**.
- **Bloqueou por permissão?** Pare e entregue o comando pronto para colar, num bloco de código,
  com o que ele faz em uma frase.
- **Atalho tomado entra em dois lugares no mesmo commit**: `RISCOS_ASSUMIDOS.md` e o
  `ATALHOS.md` da pasta.
- **Pasta nova ganha `README.md`** descrevendo os arquivos e as conexões com as outras pastas.
- **Comentários em português**, explicando o porquê.
