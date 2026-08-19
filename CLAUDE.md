# CLAUDE.md — Áurea Custódia / Real Olímpico

Contexto permanente deste repositório. Carregado automaticamente em toda sessão do
Claude Code. Leia antes de qualquer alteração.

## O que é este projeto

Plataforma da **AUREA CUSTODIA LTDA** (CNPJ 68.071.452/0001-06), nome fantasia
**Real Olímpico**: custódia física de moedas comemorativas olímpicas, marketplace de
negociação e, no futuro, crédito com garantia. Ambiente ainda é **MVP de teste** com
7 contas de sócios — não há cliente real.

Stack: **Next.js 15 (App Router) + React 19 + TypeScript strict**, publicado na Vercel.
Origem: refatoração do monolito `aurea-mvp-teste.html` (2.816 linhas num arquivo só).

## Comandos

```bash
npm install          # dependências
npm run dev          # servidor local em http://localhost:3000
npm run build        # build de produção (roda ANTES de todo commit)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

**Antes de qualquer commit: rodar `npm run build` e `npm run typecheck`.** O build da
Vercel falha no mesmo lugar; falhar localmente custa 10 segundos, falhar lá custa um
deploy quebrado.

Login de teste: qualquer e-mail semeado em `src/domain/seed.ts`, senha `12345678`.

## Arquitetura — as três camadas e a regra que as separa

```
src/domain/     Regra de negócio PURA. Sem React, sem Next, sem I/O, sem async.
src/server/     Só roda no servidor. Persistência, sessão, Server Actions.
src/app/        Rotas do App Router (uma tela = uma URL).
src/components/ UI. Client Components.
src/lib/        Integrações externas (CoinGecko, jsPDF, SheetJS).
src/styles/     CSS global por área.
```

**Regra inviolável:** nada de `@/server/*` pode ser importado por um Client Component.
Esses módulos carregam segredos de ambiente e falam com Postgres/Redis; puxá-los para o
bundle do navegador vaza credenciais. O aviso está no topo de `src/server/state.ts`.

**Toda mutação de estado passa por `mutateState()`** (`src/server/state.ts`), dentro de
uma Server Action em `src/server/actions/`. O cliente pede; quem decide é o servidor.
No monolito a regra rodava no navegador e qualquer pessoa com o console aberto comprava
de graça — não regredir para isso.

**Persistência é plugável** (`src/server/store/`) e escolhida por variável de ambiente,
nesta ordem: Postgres (`POSTGRES_URL`/`DATABASE_URL`) → Redis (`KV_REST_API_*` ou
`UPSTASH_REDIS_REST_*`) → memória. Só o Postgres resolve concorrência de verdade
(`SELECT … FOR UPDATE`). Em serverless sem banco externo o estado se recria a cada
cold start.

## Regras de negócio que não podem mudar sem decisão dos sócios

- Comissão: **0,5% + R$ 1,00 por moeda** negociada (`FEE_PCT`, `FEE_FIXED`).
- Custódia anual por faixas: **R$ 5 / 15 / 25 / 30 / 60**.
- Casamento de ordens por **prioridade preço-tempo**, uma unidade por volta.
- **Mediana de 24h** como valor estimado do recibo.
- Só **"Entrega da Bandeira Olímpica"** é negociável no marketplace.
- **Dinheiro sempre em centavos inteiros** (`Cents`). Nunca `float` para valor monetário.

Esses números vivem em `src/domain/constants.ts` e `src/domain/fees.ts`. Alterar
qualquer um deles altera o produto — confirmar com o Gabriel antes.

## Restrições de marca, jurídico e regulatório

- **Logos:** usar exclusivamente `/brand/logo-aurea.webp` e `/brand/logo-real-olimpico.webp`.
  Nunca gerar, redesenhar ou substituir por alternativa.
- **Anéis olímpicos não podem aparecer** em arte de moeda (risco de PI do COB).
- O rótulo **"código simulado"** no QR do recibo é deliberado e não sai. Não há
  blockchain: o recibo é comprovante de custódia, propositalmente fora do enquadramento
  VASP (Res. BCB 519–521/2026). **Não sugerir tokenização, NFT on-chain ou DApp** — a
  decisão pela arquitetura centralizada está registrada em relatório e tem base
  regulatória (IN RFB 1888/2019).
- **LGPD:** fotos e dados pessoais exigem política de retenção antes de qualquer cliente
  real. Etiquetas de envio com endereço não podem ir para armazenamento público.

## Pendências conhecidas (não são bugs a "consertar" sem combinar)

- **Senhas em texto puro.** É a Etapa 2 planejada (bcrypt + sessões). O repositório é
  privado por isso.
- **Hash do recibo é simulado.** Substituir por hash determinístico encadeado (SHA-256)
  é item de roadmap, não improviso.
- Sem termos de uso com aceite versionado nem política de privacidade.
- Sem Pix/cartão, Correios/Melhor Envio, login Google, e-mail transacional.
- Contradição tributária em aberto (Lucro Presumido × Simples com Fator R) — **não
  codificar lógica de imposto** até o contador definir.

## Convenções de código

- **Comentários em português**, explicando o *porquê*, não o *quê*. O padrão do
  repositório é comentário de bloco no topo do arquivo dizendo qual trecho do monolito
  ele substitui e qual armadilha ele evita. Manter esse padrão.
- **TypeScript strict.** Sem `any`. Tipos do domínio em `src/domain/types.ts` — essa é a
  fonte da verdade do modelo de dados.
- **CSS global por área**, com os nomes de classe do monolito preservados (`.btn`,
  `.panel`, `.nav-item`). Não são CSS Modules e não devem virar. `responsive.css`
  precisa ser o **último** import de `globals.css` — a cascata depende disso.
- Alvo mínimo de toque no celular: **44px**.
- Import alias: `@/` aponta para `src/`.

## Como trabalhar comigo (Claude) neste repositório

1. **Planeje antes de editar.** Em mudança que toca mais de um arquivo, descreva o plano
   e espere aprovação.
2. **Uma tarefa por sessão.** Terminou, commitou, `/clear` e começa a próxima.
3. **Não refatore o que não foi pedido.** Este é um port fiel; divergências do monolito
   foram autorizadas uma a uma e estão listadas no README.
4. **Toda decisão precisa ser explicável ao Rogério**, sócio não técnico. Se a explicação
   só funciona em jargão, a explicação está incompleta.
5. Antes de commitar: `npm run build` e `npm run typecheck`.
6. **Nunca commitar `.env.local`**, segredo, token ou credencial. Se um segredo vazar
   para o histórico, avise em vez de tentar reescrever o histórico sozinho.

## Documentos de referência do projeto

- `README.md` deste repositório — divergências autorizadas, deploy e pendências.
- Relatório de Decisão de Arquitetura e Cibersegurança (decisão centralizada, stack).
- Documento Técnico do MVP HTML (mapa do monolito de origem).
