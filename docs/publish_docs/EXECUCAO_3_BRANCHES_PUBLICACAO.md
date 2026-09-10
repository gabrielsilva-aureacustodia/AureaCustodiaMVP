# Execução em 3 branches — publicação oficial

**Quem faz o quê, em que ordem, e o que cada agente entrega ao terminar**

```
Escrito em: 10/09/2026
Depende de: PLANO_EXECUTIVO_PUBLICACAO.md (o quê e o porquê)
            PROTOCOLO_DO_AGENTE.md (o como — as onze regras, leitura obrigatória)
Base:       main em 31558c4
```

> **Ordem de leitura para um agente que acaba de abrir a sessão:**
> 1. `PROTOCOLO_DO_AGENTE.md` — as onze regras
> 2. `PLANO_EXECUTIVO_PUBLICACAO.md` — seções 1, 3 e 5 no mínimo
> 3. A sua seção neste arquivo, e **só** a sua
>
> Ler a seção de outro agente não é proibido, mas **editar arquivo do território dele é**.

---

# 1. Por que três branches, e por que a Fase 0 não é uma delas

A renomeação de terminologia (bloco 1 do plano executivo) toca 25 arquivos espalhados por
toda a interface, e um deles — `src/components/nft/Certificate.tsx` — é justamente onde o
Agente C precisa ligar o botão de retirada. Renomear um arquivo enquanto outro agente o
edita produz conflito que o Git não resolve sozinho: ele vê arquivo apagado de um lado e
arquivo modificado do outro.

Por isso:

```
                 ┌─ FASE 0 (sequencial, meio dia, só o Agente A, direto na main) ─┐
main 31558c4 ───►│  renomeação · endereço real · lacre · nomes fora da vitrine    │───► main+F0
                 └───────────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
        feat/juridico-textos-dominio   feat/cadastro-financeiro   feat/retirada-logistica
              (Agente A)                    (Agente B)                 (Agente C)
                    │                         │                         │
                    │                         └──── merge 1º ───────────┤
                    │                                                   │
                    │                              merge 2º ────────────┘
                    │
                    └──── merge 3º (por último: varre a terminologia do texto novo)
                                              │
                                              ▼
                                    domínio oficial · publicação
```

**Enquanto A executa a Fase 0, B e C leem e planejam. Não editam código.** Isso não é tempo
perdido: os dois precisam desse tempo para escrever os planos de sessão e as perguntas.

---

# 2. Territórios — quem pode editar o quê

Conflito de merge é sempre falha de fronteira, nunca acidente. A regra é simples: **se o
arquivo não está no seu território, você não edita — você abre um item na sua pendência
pedindo que o dono edite.**

| Território | Dono | Arquivos |
|---|---|---|
| Textos legais e institucionais | **A** | `src/app/termos/`, `src/app/privacidade/`, `src/app/academy/`, `src/components/legal/`, `src/components/landing/`, `src/styles/legal.css`, `src/styles/landing.css` |
| Rótulos e navegação | **A** | `src/components/shell/`, `src/components/home/` |
| Vitrine e livro de ordens (privacidade) | **A** | `src/components/market/`, `src/app/(app)/mercado/page.tsx` |
| Cadastro, conta e dinheiro | **B** | `src/server/actions/account.ts`, `src/server/actions/payments.ts`, `src/app/(app)/conta/`, `src/components/account/`, `src/lib/payments/`, `src/server/payments/` |
| Custódia mensal e contábil | **B** | `src/domain/fees.ts`, `src/domain/dre.ts`, `src/server/actions/contabil.ts`, `src/app/api/cron/faturamento/` |
| Retirada e logística | **C** | `src/server/actions/custody.ts`, `src/app/(app)/envios/`, `src/app/(app)/retirada/`, `src/components/custody/`, `src/lib/shipping/`, `src/server/shipping/` |
| Recibo (componente e PDF) | **C** *(depois da Fase 0)* | `src/components/recibo/`, `src/lib/pdf/`, `src/app/(app)/recibos/` |

## Os três arquivos compartilhados, e como se mexe neles

`src/domain/types.ts`, `src/server/db/migrar.ts` e `RISCOS_ASSUMIDOS.md` são inevitavelmente
tocados pelos três. Regras:

- **`types.ts`** — cada agente acrescenta **apenas ao fim** do arquivo, num bloco próprio
  marcado com comentário `/* === Publicação · Agente X === */`. Ninguém reordena nem
  reformata o que já existe. Conflito de anexo no fim é o mais fácil de resolver que existe.
- **Migrations** — numeração reservada: **A = 004**, **B = 005 a 008**, **C = 009 a 011**.
  Nunca reutilizar número, nunca editar migration de outro agente.
- **`RISCOS_ASSUMIDOS.md`** — faixas de RA reservadas (regra 9 do protocolo), e cada agente
  acrescenta **no fim** do arquivo.

---

# 3. Fase 0 — sequencial, Agente A, direto na `main`

**Duração:** meio dia. **Branch:** `main` (é mudança mecânica e reversível; ir por branch
aqui só atrasaria os outros dois).

## Prompt de abertura

```
Leia docs/publish_docs/PROTOCOLO_DO_AGENTE.md e a seção 1 de
docs/publish_docs/PLANO_EXECUTIVO_PUBLICACAO.md.

Execute a Fase 0 descrita na seção 3 de
docs/publish_docs/EXECUCAO_3_BRANCHES_PUBLICACAO.md.

Sem editar nada ainda: me mostre primeiro a lista completa de arquivos e linhas
que você vai tocar, separada em Camada 1 (texto visível) e Camada 2
(identificadores). Espere minha aprovação.
```

## As quatro tarefas

**F0.1 — Camada 1: terminologia visível.** Substituir em todo texto que o cliente lê.
Mapa de substituição:

| De | Para |
|---|---|
| `NFT`, `recibo NFT`, `certificado NFT` | `recibo`, `recibo de custódia` |
| `Ativo` (rótulo de coluna/seletor) | `Item` ou `Moeda`, conforme o contexto |
| `ativo digital`, `token` | `recibo` |
| `Carteira` (se aparecer no sentido cripto) | `Minha conta` |

Arquivos conhecidos, do levantamento de 10/09/2026: `src/components/shell/Topbar.tsx` (2),
`src/components/shell/Sidebar.tsx` (2), `src/components/nft/NftCard.tsx` (2),
`src/components/nft/Certificate.tsx` (2), `src/components/home/HomeBlocks.tsx` (1),
`src/components/custody/Timeline.tsx` (1), `src/components/sell/CoinPicker.tsx`,
`src/components/sell/SellerBidRow.tsx`, `src/app/(app)/recibos/page.tsx` (3),
`src/app/(app)/recibos/[coinId]/page.tsx` (1), `src/app/(app)/vender/page.tsx` (2),
`src/app/(app)/mercado/page.tsx` (1), `src/app/(app)/conta/page.tsx` (1),
`src/app/(app)/envios/page.tsx` (1), `src/app/(app)/graficos/auditoria/page.tsx` (2).
**Confira com `grep` — a lista pode ter mudado.**

**F0.2 — Camada 2: identificadores** *(aprovado em D-4, 10/09/2026 — faça)*.
`Nft` → `Recibo`, `Coin.nft` → `Coin.recibo`, `NftStatus` → `StatusRecibo`,
`src/components/nft/` → `src/components/recibo/`, `src/lib/pdf/nft-receipt.ts` →
`src/lib/pdf/recibo-pdf.ts`, `src/styles/nft.css` → `src/styles/recibo.css`.
**Consequências obrigatórias:** subir `STORE_KEY` para `'aurea-market-v7'` em
`src/domain/constants.ts`, migration **004** renomeando a coluna, e o import de
`recibo.css` mantido na mesma posição dentro de `globals.css` — `responsive.css` continua
sendo o **último**, a cascata depende disso.

**F0.3 — Aviso de lacre.** Em `src/app/(app)/envios/page.tsx:401`, trocar
*"Envie a moeda em seu lacre original, ou em recipiente/plástico/caixa segura"* por texto
que peça **apenas envelope lacrado**. Rever também `src/components/shell/Topbar.tsx:95`
(*"Moedas físicas recebidas, lacradas e vinculadas"*).

**F0.4 — Nomes de contraparte fora da vitrine.** `src/components/market/LotCard.tsx:90`
(`Vendedor: {sellerName}`), `src/components/market/BidRow.tsx:61` (`Comprador: {buyerName}`)
e as passagens de prop em `src/app/(app)/mercado/page.tsx:357-393`. Manter **"você"** quando
for a oferta do próprio usuário — isso é informação dele sobre ele. Para os demais, **D-5
decidiu anonimato total**: `Vendedor #A93F` / `Comprador #A93F`, derivado do id da oferta.

## Como testar a Fase 0

```bash
npm run typecheck && npm run lint && npm test && npm run build
grep -rn "NFT\|token\|cripto\|ativo digital\|investimento" src/ --include="*.tsx"
npm run dev
```

Com o `dev` no ar, percorrer as **doze telas autenticadas** — início, mercado, vender,
recibos, um recibo aberto, envios, conta, extrato, configurações, gráficos, comparações,
auditoria — e confirmar: nenhuma palavra proibida, nenhum nome de contraparte, nenhum erro
no console.

## Entregáveis da Fase 0

- Commit na `main`: `Adota a terminologia aprovada pelo juridico e fecha a vitrine`
- `docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md` criado, já com o item **D-6**
  (endereço real dos Correios, dono Gabriel)
- Entrada em `RISCOS_ASSUMIDOS.md` **somente se** a Camada 2 ficar pela metade

## ⛔ Ponto de parada

D-4 já foi decidida: **faça as duas camadas**. O ponto de parada que resta é outro — se a
Camada 2 quebrar mais de um teste que você não consiga explicar em uma frase, **pare,
entregue a Camada 1 e registre o resto como RA-24**. Camada 1 sozinha já libera B e C.

---

# 4. Agente A — `feat/juridico-textos-dominio`

**Missão:** que ninguém consiga apontar uma palavra errada no site, e que o site esteja no
endereço certo.

**Nasce de:** `main` já com a Fase 0.

```bash
git checkout main; if ($?) { git pull; git checkout -b feat/juridico-textos-dominio }
```

## A-1 · Termos de uso e política de privacidade

**Entrada:** o texto do Felipe, prometido para **12/09/2026**. Enquanto não chegar, A-1
trabalha na **estrutura** e no aceite; o texto entra por cima.

- Reescrever `src/app/termos/page.tsx` (hoje versão `RASCUNHO-0.1-2026-09-02`) com as sete
  cláusulas operacionais da seção 4/bloco 2 do plano executivo.
- Reescrever `src/app/privacidade/page.tsx` incluindo os campos novos do cadastro do
  Agente B: CPF, data de nascimento, endereço, telefone, dados bancários — cada um com
  finalidade, base legal e prazo de retenção.
- Versão nova: `1.0-2026-09-DD`. A versão é registrada no aceite e **nunca é reciclada**.

**Teste:** as duas páginas abrem deslogado, o texto passa a legibilidade de leigo (use a
skill `legibilidade-flesch-kincaid`), e os links do rodapé funcionam.

## A-2 · Aceite por blocos

Felipe pediu *check* por trecho; Gabriel pediu que sejam poucos. **Alvo: 4 a 6 caixas.**
Sugestão de recorte:

1. A moeda devolvida não é a mesma moeda depositada
2. Prazos: D+3 para dinheiro, D+30 para a moeda
3. Custos de retirada e de saque são do cliente
4. Débito pode bloquear recibo e a moeda pode servir de garantia
5. A Áurea não é corretora, não é instituição financeira, não é plataforma de ativos digitais
6. Tratamento de dados pessoais (LGPD)

`src/server/auth/legal.ts` já registra versão e data/hora do aceite; estender para guardar
**quais blocos** foram marcados. **Não transformar isso em trava de login** — o aceite é
exigido para *operar*, na primeira movimentação, junto com o cadastro do Agente B (é a
trava 3 da seção 3.3, e é a única forma dela que existe).

**Teste:** conta nova não consegue depositar sem marcar as caixas; conta que já marcou não
vê a tela de novo; mudar a versão faz a tela reaparecer.

## A-3 · Academy e posicionamento na landing

- Rota nova `/academy`, pública, reusando `src/components/legal/LegalDocument.tsx`.
- Primeiro artigo: **"O que a Áurea é e o que a Áurea não é"** — o texto da seção 1.3 do
  plano executivo, escrito para leigo.
- Na landing (`src/components/landing/LandingPage.tsx`): inserir o posicionamento negativo e
  a história de origem (a coleção do Rogério), e retirar qualquer promessa de valorização.
- Link para `/academy` no rodapé e na navegação pública.

**Teste:** `/academy` abre deslogado, é responsiva, alvos de toque de 44px no celular.

## A-4 · Tutorial do domínio oficial

**Não executa nada ainda — só escreve o tutorial**, e escreve conferindo o painel de hoje.

`docs/tutoriais/TUTORIAL_DOMINIO_OFICIAL.md`, contendo:

1. **Antes de tudo:** exportar a zona DNS atual da HostGator e salvar o arquivo em
   `docs/tutoriais/zona-dns-antes-<data>.txt`. É o botão de desfazer.
2. Adicionar o domínio no projeto da Vercel — caminho **conferido na documentação vigente**,
   não de memória.
3. Os registros a criar, **com o valor literal completo** que a Vercel mostrar
   (`A` do apex e `CNAME` do `www`).
4. **A lista do que NÃO se toca, em destaque:** `MX`, `TXT`/SPF, DKIM, DMARC — são do Google
   Workspace, e mexer neles derruba o e-mail da empresa e o segundo fator do GitHub.
5. Como confirmar depois: consultar o nameserver, abrir o site pelo domínio, **e enviar e
   receber um e-mail de teste no `@aureacustodia.com.br`**.
6. Como voltar atrás.

Base: `docs/GUIA_VERCEL_HOSTGATOR_EMAIL_E_DOMINIOS.md`, **a ser conferido, não copiado**.

## A-5 · Varredura final (executada só depois dos merges de B e C)

- `grep` de terminologia proibida sobre **todo** o `src/`, incluindo o texto novo de B e C.
- Percorrer as telas novas (cadastro completo, saque, retirada) caçando palavra proibida,
  promessa de valorização e número apresentado sem a palavra "estimado".
- Conferir 44px de alvo de toque nas telas novas.
- Fechar `PENDENCIAS_MANUAIS_AGENTE_A.md`.

## A-6 · Publicação no domínio

Executa o tutorial A-4, **com o Gabriel presente**. Todo comando de painel que o agente não
puder executar vai para ele em bloco de shell pronto (regra 10 do protocolo).

## Entregáveis do Agente A

```
docs/tutoriais/TUTORIAL_DOMINIO_OFICIAL.md
docs/tutoriais/zona-dns-antes-<data>.txt
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_A.md
docs/publish_docs/RELATORIO_AGENTE_A.md
```

---

# 5. Agente B — `feat/cadastro-financeiro`

**Missão:** que o dinheiro entre, saia e seja cobrado — e que cada centavo tenha lançamento.

**Nasce de:** `main` já com a Fase 0.

```bash
git checkout main; if ($?) { git pull; git checkout -b feat/cadastro-financeiro }
```

## B-1 · Modelo do cadastro (migration 005)

- Interface `Cadastro` em `src/domain/types.ts`, no bloco do Agente B, **opcional** em
  `User` — conta sem cadastro continua entrando e navegando.
- Campos: `cpf`, `nomeCompleto`, `dataNascimento`, `telefone`, `endereco`
  (logradouro, número, complemento, bairro, cidade, UF, CEP), `dadosBancarios`
  (`chavePix` + `tipoChave`, ou banco/agência/conta/tipo), `completadoEm`, `confirmadoEm`.
- **Não criar campo de documento com foto.** O jurídico dispensou (bloco 6 do plano executivo).
- Migration **005** em `aurea.usuarios`, colunas anuláveis.
- Validação de CPF **de formato**, no domínio, com teste. Sem consulta a base externa.

**Teste:** unitário de validação de CPF (válido, inválido, com máscara, com todos os dígitos
iguais); conta antiga sem cadastro continua carregando.

## B-2 · Tela e travas do cadastro

- Modal em `src/components/account/`, disparado no **primeiro** depósito, compra direta ou
  saque — **nunca no login nem no cadastro inicial**.
- Reusar `consultarCepEnvio()` de `src/server/actions/custody.ts:331` para autocompletar o
  endereço a partir do CEP.
- Trava do saque: botão desabilitado **com o motivo escrito ao lado** e link para completar.
  Nunca esconder o botão — esconder faz o cliente achar que a função não existe.

**Teste manual, o roteiro exato:** conta nova → depositar → o modal aparece → fechar sem
preencher → o depósito **não** acontece → reabrir → preencher → depositar → funciona → sair
e entrar de novo → o modal **não** reaparece.

## B-3 · Compra direta pelo gateway (migration 006)

O mesmo botão de pagamento do depósito, dentro do fluxo de compra. Gabriel:
*"ou ele pode usar o que está na conta dele ou pode comprar por fora"* — e comprar por fora
é o melhor caminho comercial, porque dinheiro parado na mão da Áurea é responsabilidade que
ela não precisa assumir.

Reusar `iniciarDeposito()` de `src/server/actions/payments.ts:45` com referência externa que
identifique a compra. **A conciliação precisa saber distinguir depósito de compra direta** —
são lançamentos contábeis diferentes.

## B-4 · Saque — o bloco mais importante (migration 007)

- Ação `solicitarSaque(valorCents)` em `src/server/actions/account.ts`.
- Taxa fixa de **R$ 5,00**, debitada do valor sacado, com constante nomeada e teste próprio.
- Trava por dados bancários confirmados. **Sem eles, o prazo D+3 não começa a contar** — e a
  tela precisa dizer isso com essas palavras.
- Estados: `solicitado → em_processamento → pago` / `falhou`, com motivo em caso de falha.
- Data-limite calculada e exibida no momento do pedido ("previsto para 13/09/2026").
- Lançamento no ledger + trilha de auditoria, **na mesma transação**.
- Rota `/api/relatorios/saques` seguindo `docs/API_RELATORIOS.md` (bloco 13 do plano).

**Sobre a automação do Pix de saída:** antes de escrever a primeira linha, **abrir a
documentação vigente do gateway** e verificar se a API de transferência está disponível para
a conta da Áurea. Não deduzir de memória. Se não estiver disponível de imediato, o saque
nasce com **fila de liquidação manual** — o pedido entra, o prazo corre, um sócio paga pelo
aplicativo do banco e marca como pago. **O cliente não vê diferença e nada fica bloqueado.**
Isso vira **RA-30**, registrado nos dois lugares.

**Teste:** unitário da taxa e do cálculo da data-limite; roteiro manual com saldo
insuficiente, com valor zero, sem dados bancários e com dados bancários; conferir que o
ledger fecha.

## B-5 · Custódia mensal (migration 008) — ⚠️ superfície protegida

**Autorizado em D-3, 10/09/2026: substitui as faixas anuais, sem transição.**

- `src/domain/fees.ts`: `custodyFeeForCount()` **sai do código** e dá lugar a
  `custodiaMensalPorMoeda()`, com `R$ 2,00` como constante nomeada.
- Plano anual R$ 24,00 por moeda em até 12x — mesmo dinheiro parcelado, sem desconto.
- Fatura por cliente e por mês, detalhada por moeda.
- Cron mensal em `src/app/api/cron/faturamento/`, no molde do `/api/cron/shipping` que já
  existe e já está agendado no `vercel.json`.
- Cobrança do saldo em conta quando houver; pelo gateway quando não.
- Estado de inadimplência — é o gatilho das cláusulas 3 e 4 dos termos (bloqueio do recibo e
  moeda como garantia). **Implementar o estado e a marcação; o bloqueio efetivo do recibo é
  do Agente C**, porque é ele quem manda no recibo. Abrir item na pendência de B pedindo isso.
- Migrar as sete contas do seed para o modelo novo.

**Teste:** 1 moeda por 1 mês = R$ 2,00; 18 moedas por 12 meses = R$ 432,00; virada de mês;
cliente sem saldo; cliente que entrou no meio do mês.

## B-6 · DRE com as três receitas novas

Categorias de lançamento separadas para **custódia**, **taxa de saque** e **taxa de
retirada**, além da comissão que já existe. **Nenhuma alíquota em código** — o regime
tributário continua indefinido e isso não muda nesta rodada.

**Teste:** `src/domain/dre.test.ts` estendido; conferir na tela `/relatorios` que as quatro
linhas de receita aparecem separadas.

## Entregáveis do Agente B

```
docs/tutoriais/TUTORIAL_GATEWAY_SAQUE.md       (como o sócio liquida um saque manual)
docs/tutoriais/TUTORIAL_FATURAMENTO_CUSTODIA.md
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_B.md
docs/publish_docs/RELATORIO_AGENTE_B.md
```

## ⛔ Pontos de parada do Agente B

1. **D-3 já está fechada** (mensal substitui as faixas, sem transição). B-5 pode começar.
2. **API de transferência indisponível** → siga com a fila manual, registre RA-30, **não
   pare**.
3. **Sair do sandbox** → **não faça**. Depende de decisão dos sócios (RA-01) e dos termos
   assinados. Ligar dinheiro real sem isso é o único erro desta lista que não tem desfazer.

---

# 6. Agente C — `feat/retirada-logistica`

**Missão:** que a moeda consiga sair, com prazo, custo e rastreio.

**Nasce de:** `main` já com a Fase 0.

```bash
git checkout main; if ($?) { git pull; git checkout -b feat/retirada-logistica }
```

## C-1 · Modelo e máquina de estados da retirada (migration 009)

- Interface `Retirada` em `src/domain/types.ts`, no bloco do Agente C.
- Estados: `solicitada → paga → separacao → postada → entregue`, mais `cancelada`.
- Campos: recibo de origem, modalidade (`comum` | `segura`), valor cobrado, endereço
  congelado **no momento do pedido** (não referência ao cadastro — se o cliente mudar o
  endereço depois, a etiqueta já emitida não pode mudar sozinha), data-limite D+30,
  protocolo dos Correios.
- Máquina de estados como função pura testável em `src/domain/`, fora do servidor.

**Teste:** transições válidas e inválidas, todas com teste unitário.

## C-2 · Fluxo de retirada no servidor (migration 010)

Ação `solicitarRetirada(coinId, modalidade)` em `src/server/actions/custody.ts`, na ordem
exata do bloco 10 do plano executivo. Os dois pontos que não podem sair errados:

**O recibo é extinto no instante da confirmação**, junto com a saída da moeda do acervo
negociável — no mesmo `mutateState()`. Se ficarem em passos separados, existe um intervalo
em que o cliente tem recibo negociável **e** moeda a caminho. `NftStatus: 'Extinto'` já
existe em `src/domain/types.ts:52`, reservado para isto desde o começo.

**A trava de endereço**: sem endereço completo e confirmado, a ação recusa e **o prazo não
começa**. A tela diz isso com essas palavras.

Cobrança da taxa conforme **D-1**: **comum R$ 50,00** ou **segura R$ 180,00 em 2x**, valores
excludentes e fechados. Do saldo em conta, ou pelo gateway — nesse caso, coordenar com o
Agente B por item de pendência, não editando o território dele.

Ledger + trilha de auditoria na mesma transação. Rota `/api/relatorios/retiradas`.

**Teste:** recibo já extinto, moeda em oferta aberta no mercado, cliente sem saldo, cliente
sem endereço, dois pedidos simultâneos para a mesma moeda.

## C-3 · Tela da retirada

- Rota nova `src/app/(app)/retirada/`, e o botão de `Certificate.tsx:201` — hoje desabilitado
  — passa a levar para lá.
- Escolha da modalidade, com o custo de cada uma **e o porquê** ("a segura usa transporte de
  valores").
- **A confirmação da moeda equiparável aparece aqui**, na hora do pedido, não no aceite
  genérico do cadastro: *"a moeda devolvida será da mesma espécie e estado de conservação,
  mas não necessariamente a mesma unidade que você depositou"*. Esse é o risco número um que
  o próprio Felipe apontou; enterrar isso nos termos não protege ninguém.
- Data-limite calculada e exibida.
- Acompanhamento do estado, no molde da `Timeline` que já existe em
  `src/components/custody/`.

## C-4 · Correios de saída (migration 011)

- `src/lib/shipping/`: pré-postagem no sentido Áurea → cliente. O módulo hoje só cobre a
  entrada.
- Declaração de valor e AR obrigatórios — já é regra do módulo, mantenha.
- Etiqueta pela rota que já existe (`/api/envios/etiqueta/[protocolo]`).
- Rastreio pelo cron diário que já existe e já está agendado.
- **⚠️ LGPD:** etiqueta com endereço **não pode** ir para armazenamento público. Confira onde
  o arquivo é gravado antes de gerar a primeira.

**Bloqueado por D-6:** o endereço de origem em `src/lib/shipping/correios.ts:29` é fictício
(*Avenida Paulista, 1500 — Andar 14*). Sem o endereço real, **toda etiqueta gerada leva a
moeda do cliente para o lugar errado.** Abra o item na sua pendência e siga com o resto.

## C-5 · Bloqueio de recibo por débito

Pedido do Agente B (item B-5). Recibo de cliente inadimplente não pode ser negociado nem
retirado. **Implementar como estado do recibo, não como regra espalhada** — regra espalhada
por três telas sempre esquece a quarta.

## C-6 · Testes de ponta a ponta e varredura

Roteiro completo, com o `dev` no ar: entrar → abrir um recibo → pedir retirada → escolher
modalidade → pagar → **conferir que o recibo ficou extinto na mesma hora** → conferir que a
moeda sumiu do mercado → acompanhar o estado → gerar etiqueta → conferir o rastreio.

Depois: os quatro comandos verdes, console limpo em cada tela, `grep` de terminologia nos
arquivos tocados.

## Entregáveis do Agente C

```
docs/tutoriais/TUTORIAL_RETIRADA_OPERACIONAL.md   (o que o sócio faz quando um pedido entra)
docs/tutoriais/TUTORIAL_CORREIOS_CONTRATO.md      (o que falta contratar, com layout de hoje)
docs/publish_docs/PENDENCIAS_MANUAIS_AGENTE_C.md
docs/publish_docs/RELATORIO_AGENTE_C.md
```

## ⛔ Pontos de parada do Agente C

1. **D-2 continua aberta** (D+30 total, ou D+30 mais D+5 de trânsito) → deixe o prazo numa
   constante nomeada e isolada, para trocar num lugar só. **Não trava nada.**
2. **D-6 continua aberta** (endereço real de recebimento) → **nunca gere etiqueta de verdade**
   com o endereço fictício da Avenida Paulista. Nem para teste. Abra o item na sua pendência
   e siga com o resto do bloco.
3. **D-1 já está fechada**: comum R$ 50,00, segura R$ 180,00 em 2x. Não invente um terceiro
   valor nem some taxa administrativa por cima.

---

# 7. Integração e merge

## 7.1 A ordem, e por que ela é essa

```
1º  feat/cadastro-financeiro   (B)  →  main
2º  feat/retirada-logistica    (C)  →  main
3º  feat/juridico-textos-dominio (A) →  main
```

B primeiro porque C depende do estado de inadimplência que B cria. A por último porque B e C
escrevem texto novo de interface, e a última coisa que acontece antes da publicação é a
varredura de terminologia de A sobre esse texto novo.

## 7.2 O que cada merge exige

Antes de abrir o merge, na branch:

```bash
git fetch; if ($?) { git rebase origin/main }
npm run typecheck; if ($?) { npm run lint }
npm test; if ($?) { npm run build }
```

Os quatro verdes **depois** do rebase, não antes. Rebase que passa mas quebra o build é o
modo mais comum de um merge limpo virar produção quebrada.

## 7.3 Se o merge for bloqueado

Regra 10 do protocolo. O agente para e entrega ao Gabriel, em bloco de shell pronto para
PowerShell:

```powershell
cd C:\dev\AureaCustodiaMVP
git checkout main
git pull origin main
git merge --no-ff feat/cadastro-financeiro
npm run build
git push origin main
```

Junto vai **o que se espera ver**: `Merge made by the 'ort' strategy`, o build terminando em
`Compiled successfully`, e o push com `main -> main`.

## 7.4 Publicação final

Só depois dos três merges, com os quatro comandos verdes na `main`, com a lista de definição
de pronto da seção 7.3 do plano executivo inteira marcada, e **com o Gabriel presente**:
executar `docs/tutoriais/TUTORIAL_DOMINIO_OFICIAL.md`.

Confirmar de fato depois — abrir o site pelo domínio, e **enviar e receber um e-mail de
teste no `@aureacustodia.com.br`**. Não encerrar com "deve funcionar agora".

---

# 8. Quadro de dependências entre agentes

Cada linha é um ponto onde um agente precisa de outro. Todos se resolvem por **item na
pendência**, nunca editando o território alheio.

| Quem precisa | De quem | O quê | Quando |
|---|---|---|---|
| A (política de privacidade) | B | A lista final dos campos do cadastro | Antes de A-1 fechar |
| B (custódia inadimplente) | C | Bloqueio do recibo por débito | B-5 → C-5 |
| C (cobrança da retirada) | B | Cobrança pelo gateway | C-2 |
| A (varredura final) | B e C | Merge feito | A-5 |
| C | Gabriel | **D-2** — prazo D+30 total, ou D+30 mais D+5 | Antes de C-3 fechar a tela |
| C | Gabriel | **D-6** — endereço real de recebimento, literal e completo | Antes de C-4 gerar qualquer etiqueta |

---

# 9. Índice de tudo que esta execução produz

```
docs/publish_docs/
├── PLANO_EXECUTIVO_PUBLICACAO.md          o quê e o porquê
├── EXECUCAO_3_BRANCHES_PUBLICACAO.md      este arquivo — quem e quando
├── PROTOCOLO_DO_AGENTE.md                 como — as onze regras
├── PENDENCIAS_MANUAIS_AGENTE_A.md         o que só o Gabriel pode fazer (A)
├── PENDENCIAS_MANUAIS_AGENTE_B.md         idem (B)
├── PENDENCIAS_MANUAIS_AGENTE_C.md         idem (C)
├── RELATORIO_AGENTE_A.md                  o que foi feito e testado (A)
├── RELATORIO_AGENTE_B.md                  idem (B)
└── RELATORIO_AGENTE_C.md                  idem (C)

docs/tutoriais/
├── TUTORIAL_DOMINIO_OFICIAL.md            A
├── zona-dns-antes-<data>.txt              A — o botão de desfazer
├── TUTORIAL_GATEWAY_SAQUE.md              B
├── TUTORIAL_FATURAMENTO_CUSTODIA.md       B
├── TUTORIAL_RETIRADA_OPERACIONAL.md       C
└── TUTORIAL_CORREIOS_CONTRATO.md          C
```
