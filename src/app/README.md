# `src/app/` — rotas do App Router

Uma tela = uma URL. No monolito tudo era página única com `display:none` alternando
containers; aqui cada tela tem rota real e recarregar a página não perde onde você estava.

## Estrutura

```
app/
├── layout.tsx              Casca raiz: fontes, tema, providers globais
├── page.tsx                Login (Server Component + LoginForm)
├── globals.css             A folha de entrada — ver src/styles/README.md
├── (app)/                  Casco autenticado: sidebar + topbar
│   ├── layout.tsx            Guarda de sessão. Busca o estado e alimenta o AppProvider
│   ├── inicio/               1.0 Painel
│   ├── mercado/              1.1 Comprar moedas
│   ├── vender/               1.2 Colocar ativo à venda
│   ├── envios/               1.3 Enviar para custódia
│   ├── recibos/              1.4 Meus recibos NFT
│   │   └── [coinId]/           3.1 Certificado de um recibo
│   ├── graficos/             2.0 Mercado e auditoria
│   │   ├── auditoria/          2.2 Auditoria de estoque
│   │   └── comparacoes/        2.3 Comparação com BTC/ETH/USDT
│   └── conta/                3.0 Minha conta
│       ├── configuracoes/      3.2 Configurações e segurança
│       └── extrato/            3.3 Extrato da conta
└── api/
    ├── state/                GET do estado — o polling de 10s
    └── crypto/               Cotações BTC/ETH/USDT (CoinGecko, cache de 1h)
```

## O grupo `(app)`

Os parênteses fazem do `(app)` um **grupo de rota**: ele não aparece na URL, mas dá um
`layout.tsx` comum a tudo que está dentro. É onde mora o guarda de sessão — quem não está
autenticado é devolvido ao login antes de qualquer tela pintar.

`(app)/layout.tsx` também é quem **busca o estado no servidor** e o entrega ao
`AppProvider`, para que a primeira pintura já venha cheia em vez de piscar vazia.

## Server Component ou Client Component?

A regra prática deste projeto:

| Use Server Component quando… | Use Client Component quando… |
|---|---|
| A tela só lê dados e não tem interação | Há estado de formulário, filtro ou seleção |
| Precisa conferir sessão antes de pintar | A tela precisa acompanhar o ciclo de 10s |

Na prática, quase toda tela de `(app)` é Client Component: elas dependem do estado vivo que
o `AppProvider` mantém sincronizado. Uma tela server-side congelaria no instante da
requisição — que é justamente o que o ciclo de sincronização existe para evitar.

## O título das telas não está nas telas

Cada renderizador do monolito escrevia o próprio título dentro de `#pageTitle`. Aqui quem
monta o par título/subtítulo é `components/shell/Topbar.tsx`, **derivando-o do pathname**.

**Consequência prática:** ao criar uma rota nova, acrescente o título em
`tituloDaRota()` — senão a tela nasce com o título do painel.

## As rotas de API

| Rota | O que faz | Cuidado |
|---|---|---|
| `api/state` | Devolve o estado para o polling de 10s | `cache: 'no-store'` no cliente, `no-store` no servidor e `force-dynamic` na rota — **os três precisam concordar**, senão o CDN congela a resposta e a sincronização entre contas some |
| `api/crypto` | Série de cotações, revalidada a cada hora | Tem fallback simulado quando a CoinGecko falha |

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `(app)/layout.tsx` | **Toda tela autenticada.** É o guarda de sessão e a fonte do estado |
| `layout.tsx` (raiz) | Fontes, tema e providers de tudo |
| `globals.css` | A cascata inteira — ver `src/styles/README.md` |
| `api/state/route.ts` | A sincronização entre contas |
| Criar rota sem título na Topbar | A tela nasce com o título errado |

## Quem esta pasta usa

- `@/domain/*` para regra e formatação
- `@/server/*` **apenas** em Server Components e via Server Actions
- `@/components/*` para toda a UI

## Convenções

1. **Uma pasta por tela**, com `page.tsx` dentro
2. Rota nova ganha título em `Topbar.tsx` no mesmo commit
3. Client Component começa com `'use client'` na primeira linha
4. O comentário de bloco no topo diz **qual tela do MVP** o arquivo porta e o que mudou
