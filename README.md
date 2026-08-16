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
- mediana de 24h como valor estimado do recibo
- só "Entrega da Bandeira Olímpica" é negociável
- dinheiro sempre em **centavos inteiros**
- senhas em **texto puro** — continua sendo ambiente de teste (ver *Pendências*)

### As duas divergências autorizadas

O port é fiel inclusive nos defeitos, com exatamente três exceções, revisadas e aprovadas
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

**O botão de vender em "Minhas moedas" voltou aos 44px no celular.** A correção nº 6 do
diagnóstico mobile estabeleceu 44px como alvo mínimo de toque, mas
`.acct-row .a-actions .btn{min-height:38px}` derrubava isso por ser mais específico
(0,3,0 contra 0,1,0) — justamente no botão mais clicado da tela de conta no celular. O
override saiu de `responsive.css` em vez de ganhar o valor duplicado, então o alvo herda a
regra geral e não sobram dois números para divergir. O único efeito visual é a terceira
linha do cartão ficar 6px mais alta.

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
│   ├── market.ts      Casamento de ordens, lotes, indicadores
│   ├── selectors.ts   Leituras derivadas do estado
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
├── lib/             Integrações externas: CoinGecko, jsPDF, SheetJS.
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
- **`pw-toggle` (olho de revelar senha) tem 40×40**, abaixo do mínimo de 44px. A área
  efetiva é maior porque o botão fica dentro de um input com `padding-right:48px`, mas o
  alvo em si não atinge o mínimo. Herdado do original. A correção sem efeito visual é o
  mesmo truque que `responsive.css` já usa no `.switch`: um `::before` com `inset:-2px`
  amplia o toque para 44×44 sem mexer no desenho, e cabe dentro do padding do input.
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
