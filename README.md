# AureaCustodiaMVP

Plataforma de trading da Áurea Custódia, em formato MVP simplificado para publicação imediata.

Refatoração do MVP monolítico (`aurea-mvp-teste.html`, 2.816 linhas num arquivo só) para
**Next.js 15 (App Router) + TypeScript**, pronta para publicar na **Vercel**.

| | |
|---|---|
| **Empresa** | AUREA CUSTODIA LTDA — CNPJ 68.071.452/0001-06 |
| **Origem** | `../aurea-mvp-teste.html` (v4) |
| **Documentação de referência** | `../Aurea_Custodia_Documento_Tecnico_MVP.md` · `../Aurea_Custodia_Mapa_de_Telas_e_Rotas.md` · `../Aurea_Custodia_Diagnostico_Mobile.md` |

---

## Subir o projeto

```bash
npm install
```

```bash
npm run dev
```

Abre em `http://localhost:3000`. Sem nenhuma variável de ambiente o app **funciona**: usa o
store em memória e semeia as 7 contas de teste (senha `12345678`). O estado se perde quando o
processo reinicia — para persistir, veja *Persistência* abaixo.

---

## O que mudou em relação ao MVP

### 1. O `window.storage` morreu, e era ele que segurava tudo

O MVP dependia de uma API de armazenamento compartilhado que **só existe no ambiente de
artefatos** — nenhum navegador oferece, nenhuma hospedagem fornece. Era o item registrado na
Seção 4.2 do documento técnico como "o parágrafo mais importante".

No lugar entrou uma **interface de persistência plugável** (`src/server/store/`), com três
implementações e seleção automática por variável de ambiente. O ponto único de troca que o
MVP preparou de propósito (`loadState`/`saveState`) virou `src/server/state.ts`.

### 2. A regra de negócio saiu do navegador

No MVP a lógica rodava no cliente, onde qualquer pessoa com o console aberto podia alterá-la.
Agora toda mutação é uma **Server Action** (`src/server/actions/`) que revalida no servidor:
posse da moeda, saldo, existência da oferta. O cliente pede; quem decide é o servidor.

### 3. Uma tela = uma URL

O MVP era página única, com `display:none` alternando containers e nenhuma URL por tela.
Agora cada tela tem rota real — o que a Seção 8 do mapa de rotas já propunha para produção.

### 4. As logos saíram do JavaScript

Eram dois data-URIs base64 de 41 mil caracteres dentro do bundle. Viraram arquivos em
`public/brand/` (11 KB + 19 KB), servidos com cache.

### O que **não** mudou (de propósito)

Isto é um **port fiel**. Mesmas regras, mesmos números, mesmas mensagens:

- comissão de 0,5% + R$ 1,00 **por moeda** negociada
- faixas de custódia anual R$ 5 / 15 / 25 / 30 / 60
- casamento de ordens por prioridade preço-tempo, uma unidade por volta
- mediana de 24h como valor estimado do recibo (agora calculada **por tipo de moeda**)
- dinheiro sempre em **centavos inteiros**
- senhas em **texto puro** — continua sendo ambiente de teste (ver *Pendências*)

### As seis divergências autorizadas do port · LISTA ENCERRADA EM 28/08/2026

> **Registro histórico.** Esta lista cobre o período de refatoração do monolito
> `aurea-mvp-teste.html` para Next.js, concluído no commit `8e0f0a5`. Ela provava que o port
> foi fiel, exceto nos seis pontos abaixo, todos revisados e aprovados pelos sócios.
>
> **Está encerrada e não recebe itens novos.** O monolito deixou de ser referência quando o
> repositório passou a receber funcionalidade que nunca existiu nele. Mudanças de
> comportamento a partir daqui são registradas em `docs/diario/VERSION_COMPARISON_DAILY.md`,
> que é append-only e tem data e hora por entrada.
>
> O que continua exigindo decisão dos sócios antes de mudar é a **superfície protegida**
> descrita no `CLAUDE.md`: `src/domain/constants.ts` + `fees.ts` + `market.ts` +
> `types.ts`, o contrato de `src/server/store/types.ts` e as Server Actions — não mais a
> comparação com o monolito.

O port é fiel inclusive nos defeitos, com exatamente seis exceções, revisadas e aprovadas
pelos sócios. Quem comparar o comportamento com `aurea-mvp-teste.html` vai achar só estas:

**`parsePrice` deixou de errar 100x.** O original apagava todos os pontos antes de tratar a
vírgula, então `250.00` digitado no padrão americano virava R$ 25.000,00 em silêncio, num
campo de texto livre cujo valor vira ordem de venda real. A regra agora olha o último grupo
depois do ponto: 3 dígitos é milhar (`1.500` → R$ 1.500,00), 1 ou 2 é decimal (`250.00` →
R$ 250,00). Havendo vírgula, ela manda — todo formato brasileiro dá o mesmo resultado de antes.

**`matchOrders` não permite mais compra fantasma.** O motor movia o dinheiro e só então
chamava `transferCoin`, ignorando o retorno: se a oferta apontasse para uma moeda fora do
inventário do vendedor, o saldo trocava de mãos e a moeda não, com o histórico registrando
uma negociação que não aconteceu. A transferência passou a vir antes; falhando, a oferta
órfã sai do livro sem mover saldo nem gravar negociação.

**`buyLot` também não permite mais compra fantasma.** O mesmo defeito existia na compra
direta de um lote, num caminho de código separado do motor. Como aqui a compra é de N
moedas de uma vez, o resultado é por unidade: cada oferta órfã é descartada sozinha, sem
contaminar as boas do mesmo lote, e o comprador paga apenas pelo que recebeu. Se o lote
inteiro for órfão, nada de saldo nem de histórico — e as ofertas mortas saem do livro de
qualquer forma, para não reaparecerem ao próximo comprador.

**O botão de vender em "Minhas moedas" voltou aos 44px no celular.** A correção nº 6 do
diagnóstico mobile estabeleceu 44px como alvo mínimo de toque, mas
`.acct-row .a-actions .btn{min-height:38px}` derrubava isso por ser mais específico
(0,3,0 contra 0,1,0) — justamente no botão mais clicado da tela de conta no celular. O
override saiu de `responsive.css` em vez de ganhar o valor duplicado, então o alvo herda a
regra geral e não sobram dois números para divergir. O único efeito visual é a terceira
linha do cartão ficar 6px mais alta.

**O olho de revelar senha do login chegou aos 44px.** O `.pw-toggle` era desenhado em 40×40
e ficava abaixo do mínimo. Ganhou um `::before` com `inset:-2px` — a mesma técnica que o
`.switch` já usava — que amplia só a área de toque. O botão continua desenhado em 40×40,
não há efeito visual nenhum, e os 2px extras cabem dentro do `padding-right:48px` do input,
então o campo de senha segue clicável.

**A concorrência deixou de ser "última gravação vence" sob Postgres.** O monolito gravava o
estado inteiro por cima do anterior; duas ações no mesmo segundo perdiam uma, em silêncio. O
adaptador Postgres (`src/server/store/postgres.ts`, 143–155) abre transação e tranca a linha
com `SELECT … FOR UPDATE` antes de ler, então a segunda escrita espera a primeira terminar e
enxerga o resultado dela. Sob Redis e sob memória o comportamento antigo permanece. A
correção do `globalThis` (`src/server/store/memory.ts`, 19–36, commit `466eddd`) é a metade
local do mesmo problema: sem ela, dois grafos de bundle mantinham dois estados divergentes no
mesmo processo de desenvolvimento.

---

## Mercado multi-ativo, depósito e extrato (agosto/2026)

Primeira leva de funcionalidades que **não** vem do monolito. Aprovada pelos sócios; o
que ela muda no produto está aqui.

### A Moeda dos Direitos Humanos entrou, e com ela um segundo mercado

O catálogo ganhou a **R$ 1 de 1998, cinquentenário da Declaração Universal dos Direitos
Humanos** — bimetálica, 27 mm, 7,84 g, tiragem de **600.000**, a menor do Plano Real. As
sete contas de teste nascem com 1 a 3 delas, recortadas do total que cada conta já tinha
(a contagem por conta não mudou, e portanto a faixa da taxa de custódia também não).

Os valores simulados ficam entre **R$ 380 e R$ 520**, com histórico girando em torno de
R$ 450. A faixa vem de cotação real de lojas numismáticas em agosto/2026 (~R$ 350 em MBC,
~R$ 590 em Soberba, ~R$ 600 em FC), estreitada para o centro porque a plataforma não
classifica estado de conservação.

**A regra "só a Bandeira é negociável" caiu.** Passam a ser negociáveis ela e a Direitos
Humanos. Quem responde a pergunta é `isNegociavel(tipo)` — não mais uma comparação com
`COIN.name`.

### Um livro de ordens por ativo

A prioridade **preço-tempo continua idêntica**: compras da mais alta para a mais baixa,
vendas da mais barata para a mais cara, empate resolvido por quem chegou primeiro, uma
unidade por volta. A única regra nova é uma linha: a oferta de venda compatível precisa ter
o mesmo `tipoMoeda` do bid.

Em português para o Rogério: **cada moeda tem sua própria fila.** Quem quer comprar
Direitos Humanos entra na fila da Direitos Humanos, e uma oferta de Bandeira Olímpica — por
mais barata que esteja — nunca é vendida para ele. Dentro de cada fila, quem oferece mais
compra primeiro; empatou no preço, ganha quem chegou antes.

Consequência disso: **média de 7 dias, mediana de 24 h e as séries dos gráficos passaram a
ser por tipo.** Sem isso, uma Direitos Humanos de R$ 450 entraria na mesma média de uma
Bandeira de R$ 285 e o gráfico do Real Olímpico mostraria uma alta que nunca aconteceu.

### As moedas viraram pastas

A lista corrida das telas de compra e venda virou **pastas por categoria** ("Moedas
Olímpicas", "Moeda dos Direitos Humanos"), com um **seletor de tipo** antes: é ele que diz
a que moeda o preço unitário se refere. Um anúncio continua sendo de **um tipo só** — lote
misto é recusado no servidor, porque um lote tem um preço unitário e misturar ativos ali
venderia a moeda cara pelo preço da barata.

### Depósito em conta (simulado)

Botão "Depositar" junto ao saldo em *Minha conta*. **Não há Pix, cartão nem boleto**: a
ação soma um número ao saldo e registra o aporte. Teto de **R$ 100.000 por operação**
(`DEPOSITO_MAX`) — anteparo de ambiente de teste, para um zero a mais digitado sem querer
não desfigurar o livro de ordens das outras seis contas. A regra roda no servidor: é a
ação que cria dinheiro, e é a última que poderia morar no navegador.

### Extrato da conta

Tela nova em `/conta/extrato`, com exportação em **CSV e XLSX**. Não confundir com a
auditoria pública (2.0): aquela é o estoque de todas as contas e **não leva dado de
proprietário**; esta é de uma conta só, com dinheiro, contraparte e comissão à vista.

Duas limitações estão escritas na própria tela, porque sem elas o extrato parece errado a
quem for conferir: a **taxa de custódia é registrada mas não é debitada** do saldo (não
existe ação de pagamento no MVP), e a plataforma guarda **apenas a cobrança vigente**, sem
histórico. O saldo inicial das contas de demonstração também não aparece como depósito.

**PDF e XML ficaram de fora.** CSV é texto e não precisa de biblioteca; XLSX reaproveita o
SheetJS que a auditoria já carrega. PDF exigiria uma segunda dependência pesada por um
documento que ninguém vai reimprimir. As linhas já saem prontas de `@/domain/statement`, e
o caminho está aberto se o contador pedir.

### O banco de teste foi zerado

`STORE_KEY` subiu para **`aurea-market-v6`**. Ofertas, ordens e negociações gravadas na v5
não têm `tipoMoeda`; um bid antigo sem tipo jamais casaria com nada e ficaria preso no livro
para sempre. No primeiro acesso após o deploy, saldos, anúncios abertos e senhas trocadas
das sete contas de teste voltam ao seed. É dado de demonstração — migrar custaria mais que
recomeçar.

---

## Persistência

A camada é escolhida sozinha, nesta ordem (`src/server/store/index.ts`):

| Prioridade | Variáveis | Store | Concorrência |
|---|---|---|---|
| 1 | `POSTGRES_URL` ou `DATABASE_URL` | Postgres | `SELECT … FOR UPDATE` — resolve de verdade |
| 2 | `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Redis (Vercel KV) | última gravação vence |
| 3 | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Redis (Upstash) | última gravação vence |
| 4 | *(nenhuma)* | Memória | some no cold start |

Copie `.env.example` para `.env.local` e preencha o que for usar.

> **Sobre "última gravação vence":** é a mesma semântica do MVP, registrada como limite
> conhecido na Seção 4.6 do documento técnico. Com 7 sócios testando é irrelevante. Com
> clientes reais, use Postgres.

> **Qual camada está ativa em produção (verificado em 01/09/2026, via CLI da Vercel):**
> **Redis (Vercel KV)** — o projeto tem `KV_REST_API_*` e `REDIS_URL`, e não tem
> `POSTGRES_URL`/`DATABASE_URL`. A migração para Postgres é o item CD-08 de
> `docs/diario/CRITICAL_DEBUGS.md`, recomendada junto com o CD-09 para pagar o custo do
> reset uma vez só.

---

## Publicar na Vercel

**A raiz deste repositório já é a raiz do projeto Next.** O `package.json` está no topo, ao
lado de `src/` e `public/`. Portanto:

| Configuração na Vercel | Valor correto |
|---|---|
| **Root Directory** | `./` — deixe **vazio**, não aponte para `APP` |
| **Framework Preset** | **Next.js** |
| **Build Command** | padrão (`next build`) |
| **Output Directory** | padrão — **não** defina `public` |

O `vercel.json` na raiz já fixa `"framework": "nextjs"`, então o preset correto vale mesmo
que o painel tenha ficado em "Other".

> **Como reconhecer que o preset está errado:** os arquivos de `public/` respondem 200
> (`/brand/logo-aurea.webp` abre), mas **toda rota dá 404 com `X-Vercel-Error: NOT_FOUND`**,
> inclusive `/`. Isso quer dizer que a Vercel publicou `public/` como site estático e não
> chegou a rodar o build do Next — nenhuma função serverless foi criada.

### Configuração obrigatória antes de usar

**1. Persistência — sem isso a plataforma não funciona na Vercel.**

Em *Storage*, crie um **KV** (ou conecte um Postgres) e ligue ao projeto; as variáveis
entram sozinhas. Não é otimização: em serverless cada requisição pode cair numa instância
diferente, e o store em memória vive dentro de UMA instância. Sem banco externo, um login
grava numa máquina e a leitura seguinte acontece em outra, que semeia dados novos — o
mercado muda sozinho entre um clique e outro.

**2. `SESSION_SECRET`** em *Settings → Environment Variables*:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sem ele o app usa um segredo de desenvolvimento que está neste repositório — qualquer
pessoa com acesso ao código forja um cookie e entra como qualquer usuário.

Os dois casos são denunciados no log da função (*Runtime Logs*) na primeira requisição.

O domínio `aureacustodia.com.br` já é da empresa — aponte em *Settings → Domains*.

---

## Estrutura

```
src/
├── domain/          Regra de negócio pura. Sem React, sem Next, sem I/O.
│   ├── types.ts       O modelo de dados inteiro — a fonte da verdade
│   ├── constants.ts   Parâmetros de negócio (comissão, catálogo, contas)
│   ├── money.ts       Centavos <-> exibição em BRL
│   ├── dates.ts       Timestamp <-> dd/mm/aaaa
│   ├── codes.ts       RO-000001 / NFT-000001 / RO-ENV-0001
│   ├── fees.ts        Comissão de negociação e faixas de custódia
│   ├── market.ts      Casamento de ordens (um livro por tipo), lotes, indicadores
│   ├── selectors.ts   Leituras derivadas do estado
│   ├── statement.ts   Extrato de UMA conta (não confundir com a auditoria)
│   └── seed.ts        Dados fictícios das 7 contas
│
├── server/          Só roda no servidor.
│   ├── store/         Persistência plugável (memory | redis | postgres)
│   ├── state.ts       getState / mutateState — o ponto único de troca
│   ├── session.ts     Cookie httpOnly assinado com HMAC
│   └── actions/       Server Actions: toda mutação de negócio
│
├── app/             Rotas do App Router.
│   ├── page.tsx       Login
│   ├── (app)/         Casco autenticado (sidebar + topbar)
│   └── api/           state (polling de 10s) e crypto (cotações)
│
├── components/      UI. Providers, casco, gráficos, e uma pasta por área.
├── lib/             Integrações externas: CoinGecko, jsPDF, SheetJS, exportadores.
└── styles/          CSS global por área. Ver nota abaixo.
```

### Rotas

| URL | Tela |
|---|---|
| `/` | Login |
| `/inicio` | 1.0 Painel Real Olímpico |
| `/mercado` | 1.1 Comprar moeda |
| `/vender` | 1.2 Vender ativo |
| `/envios` | 1.3 Enviar para custódia |
| `/recibos` | 1.4 Meus recibos NFT |
| `/recibos/[coinId]` | 3.1 Certificado do recibo |
| `/graficos` | 2.0 Mercado e auditoria |
| `/graficos/auditoria` | 2.2 Auditoria de estoque |
| `/graficos/comparacoes` | 2.3 Comparações com BTC/ETH/USDT |
| `/conta` | 3.0 Minha conta |
| `/conta/configuracoes` | 3.2 Configurações e segurança |
| `/conta/extrato` | 3.3 Extrato da conta (CSV / XLSX) |

### Nota sobre o CSS

Os estilos são **globais, divididos por área**, e preservam os nomes de classe do MVP
(`.btn`, `.panel`, `.nav-item`…). Não são CSS Modules — foi decisão deliberada: renomear
todas as classes durante um port multiplicaria o risco de divergência sem ganho de
comportamento. A modularidade aqui é por arquivo.

`responsive.css` precisa ser o **último** import de `globals.css` — a cascata dos dois
breakpoints (1080px e 560px) depende disso.

---

## Pendências herdadas

Estas vieram do MVP e continuam abertas — nenhuma é regressão da refatoração:

- **Senhas em texto puro.** É a Etapa 2 da migração (bcrypt + sessões). O cookie de sessão
  já é assinado, o que é metade do caminho. O repositório é privado justamente por isso.
- **Hash do NFT é simulado.** Não há blockchain, por decisão estratégica registrada: o
  recibo é comprovante de custódia, deliberadamente fora do enquadramento VASP
  (Res. BCB 519–521). O rótulo "código simulado" no QR existe por isso e não deve sair.
- **Hash determinístico + proveniência preservada** no recibo — item 1 da sequência do
  documento de requisitos NFT, ainda não implementado.
- **Sem termos de uso com aceite versionado nem política de privacidade/LGPD.** Entram
  antes de qualquer cliente real.
- **Integrações ausentes:** Pix/cartão (PSP nacional), Correios/Melhor Envio, login Google,
  e-mail transacional. O MVP já modela os objetos que essas APIs devolvem.
- **Contradição tributária em aberto:** planilha usa Lucro Presumido 16,33%; documento
  explicativo fala Simples Nacional com Fator R. Definir com o contador.
