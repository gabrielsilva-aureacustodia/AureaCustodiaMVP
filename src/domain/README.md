# `src/domain/` — regra de negócio pura

**A camada mais protegida do repositório.** Aqui vivem os números combinados com os sócios
e o motor que os aplica.

## A regra que define esta pasta

**Nada aqui importa de nenhuma outra pasta do projeto.** Sem React, sem Next, sem I/O, sem
`async`, sem `process.env` (com uma exceção anotada). O estado entra por parâmetro e sai
como retorno.

Isso não é purismo: é o que permite testar em Node puro, sem banco e sem navegador — e é o
que vai permitir traduzir esta pasta para outra linguagem no dia em que a migração para
Java acontecer.

## Arquivos

| Arquivo | O que faz | Protegido |
|---|---|---|
| `types.ts` | **A fonte da verdade do modelo de dados.** Todo tipo do domínio | ⚠️ |
| `constants.ts` | Catálogo de moedas, contas de teste, taxas, faixas de valor, `STORE_KEY` | ⚠️ |
| `fees.ts` | Comissão de negociação e faixas de custódia anual | ⚠️ |
| `market.ts` | **O motor de casamento de ordens**, lotes e indicadores | ⚠️ |
| `money.ts` | Centavos ↔ exibição em BRL. `parsePrice` e `brl` | |
| `dates.ts` | `Timestamp` ↔ `dd/mm/aaaa`, e o início do dia local | |
| `codes.ts` | Geradores de `RO-000001`, `NFT-000001`, `RO-ENV-0001` e do hash | |
| `selectors.ts` | Leituras derivadas: auditoria, séries de gráfico, preferências | |
| `statement.ts` | O extrato de UMA conta (não confundir com a auditoria pública) | |
| `seed.ts` | As 7 contas fictícias, o acervo e ~1 mês de negociações | |
| `hash.ts` | SHA-256 puro e a fórmula **congelada** do hash encadeado do ledger (M4) | ⚠️ |
| `ledger.ts` | Os lançamentos do livro-razão: derivação, encadeamento, verificação da cadeia (M4) | ⚠️ |
| `dre.ts` | A DRE sob Lucro Presumido: parâmetros (nulos por padrão), plano de contas, períodos, análise (M7) | ⚠️ |

### Testes

| Arquivo | Cobre |
|---|---|
| `market.test.ts` | Um livro por tipo, aritmética do dinheiro, prioridade preço-tempo, oferta órfã |
| `money.test.ts` | `parsePrice` — a divergência autorizada nº 1 do port |
| `statement.test.ts` | O extrato fecha com o saldo ao centavo |
| `seed.test.ts` | Invariantes do seed (faixas e propriedades, nunca valores sorteados) |
| `hash.test.ts` | Vetores oficiais do SHA-256 e conferência contra `node:crypto` |
| `ledger.test.ts` | Soma do ledger = saldo; adulteração detectada; hash fixado (muda = migration) |
| `dre.test.ts` | Receita lida do ledger; alíquota ausente zera e declara; aritmética inteira; adicional de IRPJ |
| `testing/fixtures.ts` | Fábricas de estado usadas pelos testes. **Não é código de produção** |

`npm test` roda todos. **São 52 casos nesta pasta e todos precisam passar antes de qualquer
commit.**

### `hash.ts`, `ledger.ts` e `dre.ts` — por que são protegidos

- A fórmula do hash (`CAMPOS_DO_LANCAMENTO` em `ledger.ts`, `textoParaHash` em `hash.ts`)
  está gravada em toda linha de `aurea.ledger_entries`. Mudá-la exige migration de recálculo.
- `dre.ts` **não tem alíquota nenhuma**, de propósito; os números vêm de
  `aurea.parametros_contabeis`, preenchida pelo contador. Pôr um percentual aqui é mudar o
  produto — e criar passivo fiscal.
- O plano de contas (`PLANO_DE_CONTAS`) é a única fonte da verdade; o banco o recebe por
  upsert. Conta nova entra aqui, e só aqui.

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `types.ts` | Tudo. E **obriga rotação de `AUREA_STORE_KEY`** — o TypeScript aponta os arquivos, mas não avisa do banco |
| `constants.ts` | Catálogo, seed, telas de mercado e venda, valor exibido dos recibos |
| `fees.ts` | Todo cálculo de comissão e de custódia — **muda o produto, não o código** |
| `market.ts` | Quem compra de quem e por quanto. Exige os 38 testes verdes |
| `money.ts` | Toda entrada de preço da plataforma |
| `seed.ts` | O ambiente de demonstração inteiro |

## Regras inegociáveis

1. **Dinheiro é `Cents`, inteiro, sempre.** Nunca `float` para valor monetário. A conversão
   para texto acontece num lugar só: `brl()`.
2. **`AppState` é serializável em JSON por construção.** Nada de `Date`, `Map`, `Set` ou
   `undefined` dentro dele — os três adaptadores de persistência gravam o objeto inteiro.
3. **Prioridade preço-tempo dentro de cada tipo de moeda.** Um livro de ordens por ativo.
4. **Comentários em português explicando o *porquê*.** O padrão da casa é comentário de
   bloco no topo dizendo qual trecho do monolito o arquivo substitui e qual armadilha evita.

## Quem depende desta pasta

Praticamente todo o repositório: `src/server/*`, `src/app/*` e `src/components/*` importam
de `@/domain/*`. **Nenhum deles é importado de volta.**

## O que muda com o Supabase

O motor **não será reescrito em SQL**. Ele passa a rodar dentro de uma transação, sobre um
`AppState` parcial carregado com `SELECT … FOR UPDATE` — preservando os 38 testes. Ver
[`docs/DECISOES_D1_D9_E_PLANO.md`](../../docs/DECISOES_D1_D9_E_PLANO.md), seção D1.
