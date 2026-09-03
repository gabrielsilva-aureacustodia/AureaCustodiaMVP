# Arquitetura e organização de pastas

**O mapa do repositório e o contrato entre as pastas**

```
Atualizado em: 01/09/2026
Vale para:     toda edição a partir desta data
```

> **Por que este documento existe.** A partir de 01/09/2026 o repositório passa a receber
> edições de **vários agentes ao mesmo tempo**, em chats separados, cada um numa feature.
> Isso só funciona se cada um souber, antes de editar, o que a pasta que ele vai tocar
> sustenta — e o que quebra se ele mexer no lugar errado.
>
> Cada pasta relevante tem seu próprio `README.md`. Este documento é o índice deles e a
> regra que os governa.

---

## As camadas, e a regra que as separa

```
src/domain/     Regra de negócio PURA. Sem React, sem Next, sem I/O, sem async.
src/server/     Só roda no servidor. Persistência, sessão, Server Actions.
src/app/        Rotas do App Router (uma tela = uma URL).
src/components/ UI. Client Components.
src/lib/        Integrações externas (CoinGecko, jsPDF, SheetJS, exportadores).
src/styles/     CSS global por área.
```

### A direção das dependências

Esta é a regra que mantém tudo em pé. **As setas nunca apontam para trás:**

```
components/ ──┐
              ├──> domain/     (pode importar)
app/       ───┤
              └──> server/     (só Server Components e Server Actions)

server/    ──────> domain/     (pode importar)

domain/    ──────> (nada)      não importa de NENHUMA outra pasta do projeto
```

**Três consequências práticas:**

1. **`domain/` não importa de lugar nenhum.** É o que permite testá-lo em Node puro, sem
   React e sem banco — e é o que vai permitir traduzi-lo para outra linguagem um dia.
2. **Nada de `@/server/*` em Client Component.** Não é mais só regra escrita: o
   `import 'server-only'` faz o build quebrar apontando o arquivo culpado.
3. **`components/` nunca importa `server/`**, salvo as Server Actions, que são o único
   contrato de escrita.

---

## Índice dos READMEs por pasta

| Pasta | README | O que sustenta |
|---|---|---|
| `src/domain/` | [README](../src/domain/README.md) | Regra de negócio, motor de mercado, extrato — **superfície protegida** |
| `src/server/` | [README](../src/server/README.md) | Sessão, estado, o ponto único de escrita |
| `src/server/actions/` | [README](../src/server/actions/README.md) | As Server Actions — **superfície protegida** |
| `src/server/store/` | [README](../src/server/store/README.md) | Persistência plugável — **superfície protegida** |
| `src/server/db/` | [README](../src/server/db/README.md) | O estado em tabelas, o ledger e a trilha — **superfície protegida** |
| `src/server/relatorios/` | [README](../src/server/relatorios/README.md) | DRE, relatórios, exportação e Google Sheets |
| `src/app/api/relatorios/` | [README](../src/app/api/relatorios/README.md) | A API dos relatórios — contrato em [`API_RELATORIOS.md`](API_RELATORIOS.md) |
| `src/components/relatorios/` | [README](../src/components/relatorios/README.md) | O painel `/relatorios` |
| `src/app/` | [README](../src/app/README.md) | Rotas e telas |
| `src/components/` | [README](../src/components/README.md) | UI, uma subpasta por área |
| `src/lib/` | [README](../src/lib/README.md) | Integrações externas e exportadores |
| `src/styles/` | [README](../src/styles/README.md) | CSS global, e a ordem que não pode mudar |
| `docs/` | [README](README.md) | Documentação viva do projeto |

---

## A superfície protegida

Quatro conjuntos de arquivos exigem **parada e decisão dos sócios** antes de mudar. Fora
deles, é desenvolvimento normal e não precisa de autorização especial.

| Superfície | Por que é o esqueleto |
|---|---|
| `src/domain/constants.ts`, `fees.ts`, `market.ts` | Os números combinados com os sócios e o motor que os aplica |
| `src/domain/types.ts` | O modelo de dados. Mudança aqui obriga rotação de `AUREA_STORE_KEY` |
| `src/domain/hash.ts`, `ledger.ts`, `dre.ts` | A fórmula do hash gravada em toda linha do ledger; a DRE sem alíquota em código |
| Contrato de `src/server/store/types.ts` | O que garante que trocar de banco não muda comportamento |
| As Server Actions | Todo caminho por onde dinheiro e titularidade se movem |

O `README.md` de cada pasta marca esses arquivos com ⚠️.

---

## Regras para edição simultânea por vários agentes

### 1. Uma frente por agente, uma branch por frente

**Nunca dois agentes na mesma pasta ao mesmo tempo.** A tabela de quem está onde vive na
Parte 6 de [`diario/RITUAL_DE_SESSAO.md`](diario/RITUAL_DE_SESSAO.md) e é atualizada
**antes** de dar acesso a um agente novo, não depois.

### 2. Leia o README da pasta antes de editar

Ele diz o que a pasta sustenta, quem depende dela e o que quebra. É mais barato ler trinta
linhas do que descobrir a dependência pelo build vermelho.

### 3. Ao criar arquivo novo numa pasta, atualize o README dela

Um README que não lista o arquivo novo é pior que README nenhum, porque o próximo agente
vai confiar nele.

### 4. Mudança estrutural é feita em etapas verificáveis

Mover ou renomear pasta acontece **um passo por vez**, com `npm run typecheck`,
`npm test` e `npm run build` verdes entre um passo e outro. Nunca como um movimento grande
e único de arquivos — é assim que se derruba o site num commit.

### 5. Toda pasta nova nasce com README

Sem exceção. Pasta sem README é pasta que o próximo agente vai editar no escuro.

---

## Quais pastas se tocam

O mapa das dependências reais entre áreas. Serve para responder "se eu mexer aqui, o que
mais pode quebrar?".

| Se você mexer em… | Confira também… | Por quê |
|---|---|---|
| `domain/types.ts` | `domain/*`, `server/*`, `components/*` | É a fonte da verdade do modelo — o TypeScript vai apontar, mas a rotação de `AUREA_STORE_KEY` não |
| `domain/constants.ts` | `domain/seed.ts`, `domain/market.ts`, telas de mercado e venda | Catálogo, faixas de valor e negociabilidade |
| `domain/market.ts` | `server/actions/market.ts`, `sell.ts`, `domain/market.test.ts` | O motor; qualquer mudança precisa dos 38 testes verdes |
| `server/store/types.ts` | os três adaptadores (`memory`, `redis`, `postgres`) | Contrato comum — mudar um sem os outros cria divergência silenciosa entre bancos |
| `server/actions/*` | as telas que as chamam | São o contrato de escrita; assinatura mudou, a tela quebra |
| `components/market/*` | `app/(app)/mercado`, `app/(app)/vender` | Componentes compartilhados pelas duas telas |
| `styles/globals.css` | **toda a aplicação** | A ordem dos imports é a cascata; `responsive.css` precisa ser o último |

---

## Estrutura que virá com o Supabase

Registrada aqui para os agentes já saberem onde as coisas vão nascer, e para ninguém
inventar um lugar diferente:

```
src/server/db/          Camada de repositório: consultas ao Supabase
  ├── schema.sql          O schema, versionado
  ├── migrations/         Migrations numeradas
  └── repositories/       Uma por agregado (users, coins, offers, trades, ledger)

src/lib/payments/       Mercado Pago: cobrança, split, webhook
src/lib/shipping/       Correios: etiqueta, rastreio, modalidade
src/lib/storage/        Supabase Storage: URLs assinadas
```

Cada uma nasce com seu `README.md`, pela regra 5.
