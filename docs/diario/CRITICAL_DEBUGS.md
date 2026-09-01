# Critical Debugs — Áurea Custódia

**Documento vivo · reescrito a cada leitura do repositório · lista de tarefas do agente**

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP · branch main
Commit:      8e0f0a5
Gerado em:   28/08/2026
Fonte:       repositório · documentos do projeto · painel Vercel (a confirmar)
Itens:       11 abertos — 2 críticos, 3 altos, 5 médios, 1 baixo
```

> **Como usar.** O agente lê este documento **depois** do Ritual de Sessão. Cada item traz
> sintoma, causa, consequência, correção passo a passo e teste de aceite. Item sem teste de
> aceite não entra aqui — correção sem critério de pronto é correção que volta.
>
> **Item resolvido sai deste documento.** O registro de que existiu fica no
> `VERSION_COMPARISON_DAILY.md`, que é append-only.

---

## Índice por gravidade

| ID | Título | Gravidade | Esforço |
|---|---|---|---|
| **CD-00** | `SESSION_SECRET` pode não existir em produção | **Crítica** | 10 min |
| **CD-01** | `.env.example` e guia apontam para chave de estado antiga | **Crítica** | 20 min |
| **CD-02** | Encerrar a lista de divergências autorizadas do port | Média | 40 min |
| **CD-03** | Motor de casamento de ordens sem nenhum teste versionado | Alta | 3–4 h |
| **CD-04** | Barreira servidor/cliente é apenas um comentário | Alta | 5 min |
| **CD-05** | Dependência `xlsx` fora do registro npm | Alta | 15 min |
| **CD-06** | Não existe configuração de ESLint | Média | 30 min |
| **CD-07** | Não existe integração contínua | Média | 1 h |
| **CD-08** | Persistência ativa em produção é desconhecida | Média | 15 min |
| **CD-09** | Comissão do extrato é recalculada, não congelada | Média | decisão |
| **CD-10** | Branch `Useful-Data` órfã e não mesclável | Baixa | 10 min |

---

# CD-00 — `SESSION_SECRET` pode não existir em produção

```
Gravidade:  CRÍTICA
Bloqueia:   qualquer uso da plataforma com dado que não seja de teste
Evidência:  src/server/session.ts, linhas 33-56
```

**O sintoma.** Nenhum. O aplicativo funciona normalmente. A única evidência é uma linha nos
Runtime Logs da Vercel, na primeira requisição após um cold start:

```
[aurea] SESSION_SECRET não definida — usando segredo de desenvolvimento,
que é público neste repositório.
```

**A causa.** `sessionSecret()` lê `process.env.SESSION_SECRET`. Não encontrando, devolve a
constante `DEV_SECRET`, que vale `'aurea-dev-secret-trocar-em-producao'` e está escrita no
código-fonte, linha 38.

Esse valor é fixo de propósito — se fosse aleatório por processo, todo reinício do
`next dev` deslogaria quem estivesse testando. A decisão é correta para desenvolvimento e
catastrófica se vazar para produção.

**A consequência.** O cookie de sessão é o e-mail do usuário acompanhado de um HMAC-SHA256.
Quem conhece o segredo calcula a assinatura de qualquer e-mail e entra como qualquer usuário
— inclusive para publicar ordem de venda em nome de terceiro.

**Agravante desta data:** o repositório esteve público em 28/08/2026 para permitir a leitura
remota. Durante esse período, o `DEV_SECRET` foi legível por qualquer pessoa na internet.

**A correção.**

1. Vercel → projeto → **Settings** → **Environment Variables**
2. Verificar se `SESSION_SECRET` existe. Existindo, com valor não vazio: **item encerrado**,
   o `DEV_SECRET` público nunca esteve em uso.
3. Não existindo, gerar:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Criar a variável `SESSION_SECRET` com esse valor, marcando **Production**, **Preview** e
   **Development**. Salvar.
5. **Deployments** → deploy mais recente → `⋯` → **Redeploy**. Variável de ambiente só entra
   em vigor em build novo.
6. Avisar os sócios que precisarão entrar de novo. Trocar o segredo invalida todas as sessões
   abertas — que é exatamente o efeito desejado.

**Melhoria estrutural (opcional agora, obrigatória antes de cliente real).** Fazer o app se
recusar a subir em produção sem a variável, em vez de degradar em silêncio:

```typescript
// em src/server/session.ts, dentro de sessionSecret()
if (!fromEnv && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET é obrigatória em produção')
}
```

Item 1.3 do Bloco 1 de `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`.

**Teste de aceite.** Runtime Logs da Vercel, após um cold start, **sem** a linha de aviso
sobre `SESSION_SECRET`.

---

# CD-01 — `.env.example` e guia apontam para a chave de estado antiga

```
Gravidade:  CRÍTICA (potencial) · o dano só ocorre em configuração específica
Bloqueia:   confiabilidade do onboarding de qualquer desenvolvedor novo
Evidência:  .env.example linha 36 · docs/GUIA_CLAUDE_CODE_AUREA.md linha 144
            versus src/domain/constants.ts linha 25
```

**O sintoma.** Nenhum erro, nenhum log, nenhuma tela quebrada. O mercado simplesmente para de
respeitar a separação entre tipos de moeda: um comprador de Direitos Humanos passa a comprar
Bandeira Olímpica, e vice-versa.

**A causa, em três fatos encadeados.**

**Fato 1.** O código define o padrão da chave de estado assim:

```typescript
// src/domain/constants.ts, linha 25
export const STORE_KEY: string = process.env.AUREA_STORE_KEY ?? 'aurea-market-v6'
```

**Fato 2.** O `.env.example` termina com:

```
AUREA_STORE_KEY="aurea-market-v5"
```

E o guia de onboarding, em `docs/GUIA_CLAUDE_CODE_AUREA.md` linha 144, manda o
desenvolvedor novo escrever exatamente isso no `.env.local`.

**Fato 3.** Documentos v5 do estado foram gravados **antes** do mercado multi-ativo. Neles,
`SellOffer`, `BuyOrder` e `Trade` **não têm o campo `tipoMoeda`**.

**A consequência, e por que é pior que um erro comum.** A função `garantirFormato()` em
`src/server/state.ts` preenche apenas `deposits`. Ela não normaliza ordens antigas. Então
uma ordem v5 chega ao motor de casamento com `tipoMoeda: undefined` — e a comparação que
protege a separação de mercados é:

```typescript
offer.tipoMoeda === bid.tipoMoeda
```

Com as duas pontas `undefined`, a comparação é **verdadeira**. Duas ordens antigas casam
entre si como se fossem do mesmo ativo. Uma Direitos Humanos de R$ 450 e uma Bandeira de
R$ 285 entram na mesma fila, e a moeda cara é vendida pelo preço da barata.

Isso está diagnosticado na seção 8.1 de `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md` — mas o
`.env.example` que **causa** o cenário continua no repositório.

**Quando o dano acontece de verdade.** Em desenvolvimento local com store em memória, nunca:
o banco nasce vazio e semeia no formato novo, e o nome da chave é irrelevante. O dano exige
que o `.env.local` com v5 esteja apontado para o banco compartilhado (Postgres ou Redis) — o
que é exatamente o que acontece quando alguém liga o ambiente local ao banco de preview para
depurar um problema de produção.

**A correção.** Três arquivos.

**Arquivo 1 — `.env.example`.** Substituir o bloco final:

```diff
 # --- Dados ---------------------------------------------------------------
-# Chave do estado compartilhado. Trocar o sufixo (v5 -> v6) força um reinício
-# limpo dos dados de teste em todos os dispositivos, como no MVP original.
-AUREA_STORE_KEY="aurea-market-v5"
+# Chave do estado compartilhado.
+#
+# DEIXE COMENTADA. Sem esta variável, o código usa o padrão de
+# src/domain/constants.ts (hoje 'aurea-market-v6'), que é sempre o valor certo
+# para o formato de estado da versão atual.
+#
+# Defini-la à mão só faz sentido para forçar um reinício limpo dos dados de
+# teste (incrementando o sufixo) ou para separar bancos de preview e produção.
+# Apontá-la para uma versão ANTERIOR é um defeito: ordens gravadas antes do
+# mercado multi-ativo não têm `tipoMoeda`, e duas delas casam entre si porque
+# `undefined === undefined` é verdadeiro. Ver docs/diario/CRITICAL_DEBUGS.md,
+# item CD-01.
+#
+# AUREA_STORE_KEY="aurea-market-v6"
```

**Arquivo 2 — `docs/GUIA_CLAUDE_CODE_AUREA.md`, Parte 2, linha 144.** Substituir:

```diff
 ```
 SESSION_SECRET="cole-aqui-o-valor-gerado-abaixo"
-AUREA_STORE_KEY="aurea-market-v5"
 ```
+
+Não defina `AUREA_STORE_KEY`: sem ela, o código usa o padrão correto da versão
+atual do formato de estado.
```

**Arquivo 3 — `.claude/commands/publicar.md`, linha 59.** O exemplo de rotação envelheceu:

```diff
-> 3. Incremente o número: `aurea-market-v5` → `aurea-market-v6`
+> 3. Incremente o número a partir do padrão atual de
+>    `src/domain/constants.ts` — hoje `aurea-market-v6` → `aurea-market-v7`
```

**Melhoria estrutural (recomendada, não obrigatória).** Fazer `garantirFormato()` cumprir o
que o nome promete: descartar ordens sem `tipoMoeda` e registrar quantas foram descartadas.
Assim o defeito deixa de depender de configuração correta. É a recomendação da própria
seção 8.1.

**Teste de aceite.**

```bash
grep -rn "aurea-market-v5" . --exclude-dir=.git --exclude-dir=node_modules
```

Só pode devolver as ocorrências **históricas** dentro de
`docs/MUDANCAS_MERCADO_MULTI_ATIVO.md` (linhas 128 e 348), que descrevem a migração já
ocorrida e devem permanecer. Nenhuma ocorrência em `.env.example`, no guia ou em
`publicar.md`.

---

# CD-02 — Encerrar a lista de divergências autorizadas

```
Gravidade:  MÉDIA — reclassificada de ALTA por decisão do operador em 28/08/2026
Bloqueia:   nada · encerra a manutenção de um controle cuja função já foi cumprida
Evidência:  README.md linhas 71 e 73 · .claude/commands/commit.md linha 56 e Passo 4
```

## A decisão que mudou este item

Este item nasceu como "acertar a contagem". A decisão do operador em 28/08/2026 mudou o
enunciado: **a lista não deve ser corrigida para continuar viva — deve ser encerrada.**

O raciocínio é correto e vale registrar. A lista existia para uma finalidade única: provar
que a refatoração do monolito `aurea-mvp-teste.html` para Next.js foi fiel, exceto em pontos
revisados e aprovados. Essa prova tinha prazo. **O monolito deixou de ser a referência** no
momento em que o repositório passou a receber funcionalidade que nunca existiu nele — o
mercado multi-ativo, o extrato, o depósito. Manter uma lista de desvios em relação a um
documento que ninguém mais consulta é manutenção sem destinatário.

**Uma correção factual, porque ela muda a ação.** Não são "arquivos criados na conversão" que
se possa apagar. É **uma seção do `README.md`** (linhas 71 a 105) mais **um passo dentro do
`/commit`** (Passo 4). Apagar arquivo não resolve; o que se faz é selar a seção e redirecionar
o passo.

## O sintoma que motivou o item

Quatro números para a mesma lista:

| Onde | Número |
|---|---|
| `README.md` linha 71 — título | **duas** |
| `README.md` linha 73 — texto | **cinco** |
| `README.md` — a lista em si | **5 itens** |
| `.claude/commands/commit.md` linha 56 | **seis** |

Reconstrução da origem, pelo histórico do Git:

| Commit | Data | O que aconteceu | Total |
|---|---|---|---|
| `8c02b68` | 15/08 22:03 | Criou a seção com título "duas" e duas divergências reais | 2 |
| `0d8af21` | 15/08 22:28 | Acrescentou o alvo de toque de 44px | 3 |
| `1d1f507` | 16/08 00:14 | Acrescentou `buyLot` e o olho de revelar senha | 5 |
| `99ee09c` | 19/08 02:25 | `/commit` criado partindo de seis | 6 |

O parágrafo foi atualizado de "duas" para "cinco" pelo caminho. **O título nunca foi.** E a
sexta — a mudança de concorrência do commit `466eddd` (`globalThis`) somada à trava
`SELECT … FOR UPDATE` do adaptador Postgres — nunca foi escrita.

## O ponto que não pode ser perdido no encerramento

Encerrar a lista **não é encerrar o rastreamento**. São coisas diferentes, e confundi-las
deixa um buraco.

O que a lista fazia, e que continua sendo necessário: registrar, com data e motivo, toda
mudança de **comportamento** na camada que sustenta a plataforma. O que muda é a referência.
Antes era "difere do monolito". De agora em diante é "difere da versão anterior em produção".

**Quem herda a função:** o `VERSION_COMPARISON_DAILY.md`, que é append-only, tem data e hora
em cada entrada e já registra correções e reestruturações por leitura. Ele faz o mesmo
trabalho, com referência móvel em vez de fixa, e sem manutenção manual — porque nasce da
leitura diária.

**O que passa a ser a constante protegida** — o que você chamou de esqueleto que segura o
site em pé:

| Superfície | Por que é o esqueleto |
|---|---|
| `src/domain/constants.ts`, `fees.ts`, `market.ts` | Os números combinados com os sócios e o motor que os aplica |
| `src/domain/types.ts` | O modelo de dados. Mudança aqui obriga rotação de `AUREA_STORE_KEY` |
| Contrato de `src/server/store/types.ts` | O que garante que trocar Postgres por Redis não muda comportamento |
| As 5 Server Actions | Todo caminho pelo qual dinheiro e titularidade se movem |

Mudança nessas quatro superfícies continua exigindo parada e decisão. **Mudança em qualquer
outro lugar é desenvolvimento normal e não precisa de autorização especial.** É exatamente
essa distinção que a lista de divergências não fazia — ela tratava um botão de 44px com o
mesmo peso de um defeito no motor de casamento.

## A correção

**Passo 1 — completar antes de selar.** Acrescentar o sexto item à lista, no mesmo formato dos
outros. São seis linhas, uma vez só. **Lista selada com buraco conhecido é pior que lista
nenhuma**, porque quem consultar amanhã vai acreditar que ela está completa:

> **A concorrência deixou de ser "última gravação vence" sob Postgres.** O monolito gravava o
> estado inteiro por cima do anterior; duas ações no mesmo segundo perdiam uma, em silêncio. O
> adaptador Postgres (`src/server/store/postgres.ts`, 141–155) abre transação e tranca a linha
> com `SELECT … FOR UPDATE` antes de ler, então a segunda escrita espera a primeira terminar e
> enxerga o resultado dela. Sob Redis e sob memória o comportamento antigo permanece. A
> correção do `globalThis` (`src/server/store/memory.ts`, 19–36) é a metade local do mesmo
> problema: sem ela, dois grafos de bundle mantinham dois estados divergentes no mesmo
> processo de desenvolvimento.

**Passo 2 — selar a seção.** No `README.md`, trocar o título da linha 71 e acrescentar a nota
de encerramento logo abaixo:

```markdown
### As seis divergências autorizadas do port  ·  LISTA ENCERRADA EM 28/08/2026

> **Registro histórico.** Esta lista cobre o período de refatoração do monolito
> `aurea-mvp-teste.html` para Next.js, concluído no commit `8e0f0a5`. Ela provava que o port
> foi fiel, exceto nos seis pontos abaixo, todos revisados e aprovados pelos sócios.
>
> **Está encerrada e não recebe itens novos.** O monolito deixou de ser referência quando o
> repositório passou a receber funcionalidade que nunca existiu nele. Mudanças de
> comportamento a partir daqui são registradas em `docs/diario/VERSION_COMPARISON_DAILY.md`,
> que é append-only e tem data e hora por entrada.
>
> O que continua exigindo decisão dos sócios antes de mudar é a superfície protegida descrita
> na seção "Regras de negócio" do `CLAUDE.md` — não mais a comparação com o monolito.
```

**Passo 3 — corrigir o texto da linha 73**, trocando "cinco exceções" por "seis exceções",
para que a lista selada fique internamente coerente.

**Passo 4 — redirecionar o `/commit`.** O Passo 4 do checklist hoje manda registrar a
divergência no README. Isso vira um passo apontando para um artefato encerrado, que é a pior
forma de checklist: aquele que pede uma ação impossível e por isso é ignorado. Substituir por:

```markdown
Mudou comportamento de alguma superfície protegida — `src/domain/constants.ts`, `fees.ts`,
`market.ts`, `types.ts`, o contrato de `src/server/store/types.ts` ou qualquer Server Action?

- **Sim** → pare, explique a mudança e confirme a decisão antes de commitar. Se autorizada,
  ela será registrada na próxima entrada do `VERSION_COMPARISON_DAILY.md`.
- **Não** → siga. Mudança fora dessas superfícies é desenvolvimento normal.

A lista de divergências do port está encerrada desde 28/08/2026 e não recebe itens novos.
```

**Passo 5 — alinhar o `CLAUDE.md`**, se ele mencionar a lista como controle ativo.

## Teste de aceite

- [ ] A seção do `README.md` tem seis itens, título com "seis", e a nota de encerramento com data
- [ ] Nenhum arquivo do repositório instrui a acrescentar item à lista
- [ ] O `/commit` Passo 4 aponta para a superfície protegida, não para a lista
- [ ] A superfície protegida está nomeada em um lugar só, e os outros arquivos apontam para ele

---

# CD-03 — Motor de casamento de ordens sem nenhum teste versionado

```
Gravidade:  ALTA
Bloqueia:   qualquer alteração segura em src/domain/ · a futura migração para Java
Evidência:  ausência de runner no package.json · docs/MUDANCAS_MERCADO_MULTI_ATIVO.md, seção 8.4
```

**O sintoma.** Nenhum, até alguém alterar o motor. Aí o sintoma é uma negociação errada em
produção, descoberta por conferência manual ou por reclamação.

**A causa.** A seção 8.4 do documento de mudanças registra com todas as letras: as 34
verificações do motor rodaram numa compilação isolada, num diretório temporário, e **foram
apagadas**. Não há Vitest, não há Jest, não há script `test` no `package.json`.

**A consequência.** O código que decide **quem compra de quem, por quanto e com que
comissão** não tem rede. Qualquer alteração em `src/domain/market.ts` é feita no escuro.

Agravante estratégico: `src/domain/` é justamente a pasta que será traduzida quase linha a
linha para Java quando a migração acontecer (seção 3.2 de
`docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`). **Traduzir código sem teste é reescrever no
escuro** — e sem os testes não há como provar que a versão Java se comporta como a versão
TypeScript.

**A correção.**

**Passo 1 — instalar o runner.**

```bash
npm install --save-dev vitest
```

Vitest e não Jest: roda TypeScript sem configuração extra, é rápido o bastante para entrar
no `/commit` sem tornar o commit lento, e não exige transpilação separada.

**Passo 2 — script no `package.json`.**

```diff
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "lint": "next lint",
-    "typecheck": "tsc --noEmit"
+    "typecheck": "tsc --noEmit",
+    "test": "vitest run",
+    "test:watch": "vitest"
   },
```

**Passo 3 — configuração mínima.** Criar `vitest.config.ts` na raiz:

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

O alias `@` é obrigatório: sem ele, os imports de `@/domain/...` não resolvem no teste.

**Passo 4 — recriar as 34 verificações.** Criar `src/domain/market.test.ts`. **A lista do que
cada verificação cobre está escrita na seção 7 do
`docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`** — é transcrição, não invenção. Os casos mínimos, na
ordem de importância:

| # | Caso | Por que é o mais importante |
|---|---|---|
| 1 | Bid de Direitos Humanos a R$ 450 **não** consome oferta de Bandeira a R$ 285 | É a regra inteira do mercado multi-ativo |
| 2 | Mesmo tipo casa: comprador paga cheio, vendedor recebe líquido, comissão confere ao centavo | É o dinheiro |
| 3 | Empate de preço: quem publicou antes leva | Prioridade preço-tempo |
| 4 | Preço maior ganha de quem chegou antes | Prioridade preço-tempo |
| 5 | Dois livros executando em paralelo sem contaminação | Isolamento entre ativos |
| 6 | Oferta órfã (moeda fora do inventário do vendedor) não move saldo nem grava negociação | É a divergência autorizada nº 2 e nº 3 |
| 7 | `avg7` e `medianSellPrice` isolam os tipos | Indicadores por ativo |
| 8 | `parsePrice`: `250.00` → R$ 250,00 e `1.500` → R$ 1.500,00 | É a divergência autorizada nº 1 |
| 9 | Extrato fecha com o saldo real | Consistência contábil |

**Passo 5 — integrar ao `/commit`.** Em `.claude/commands/commit.md`, Passo 3, acrescentar
`npm test` entre o typecheck e o build:

```diff
 ```bash
 npm run typecheck
+npm test
 npm run build
 ```
```

**Teste de aceite.** `npm test` roda e passa. Depois, prova negativa: inverter
deliberadamente o sinal da comparação de `tipoMoeda` em `src/domain/market.ts`, rodar
`npm test`, e **confirmar que o caso 1 falha**. Reverter. Teste que não falha quando deveria
não é teste.

---

# CD-04 — A barreira servidor/cliente é apenas um comentário

```
Gravidade:  ALTA
Bloqueia:   nada hoje · previne vazamento de credencial amanhã
Evidência:  src/server/state.ts linhas 1-11 · src/server/session.ts linhas 1-8
Esforço:    5 minutos — a melhor relação esforço/risco do documento
```

**O sintoma.** Nenhum, até acontecer. E quando acontece, o sintoma é a string de conexão do
Postgres dentro do JavaScript servido ao navegador.

**A causa.** Os dois módulos de servidor abrem com um aviso em maiúsculas dizendo para nunca
importá-los de um Client Component. O próprio comentário admite a fragilidade:

> *"O idiomático seria `import 'server-only'` no topo, que quebra o build ao primeiro import
> indevido — mas o pacote não está no `package.json` e a instalação está fora do escopo desta
> fase. Até lá, este aviso é a barreira."*

Comentário não é barreira. É pedido de gentileza para quem estiver lendo — e, com múltiplos
agentes trabalhando no repositório, muitos não vão ler o topo do arquivo antes de escrever um
import.

**A consequência.** Um único `import { getState } from '@/server/state'` dentro de um
componente marcado `'use client'` arrasta para o bundle do navegador o adaptador Postgres,
a leitura de `process.env` e o `SESSION_SECRET`. Não há erro: o build passa, a página
carrega, e as credenciais ficam legíveis em "ver código-fonte".

**A correção.**

```bash
npm install server-only
```

Depois, acrescentar como **primeira linha executável** dos dois arquivos, logo abaixo do
comentário de bloco:

```typescript
import 'server-only'
```

Arquivos: `src/server/state.ts` e `src/server/session.ts`. Vale acrescentar também em
`src/server/store/index.ts`, que é por onde as credenciais de banco entram.

Feito isso, atualizar o comentário de bloco dos arquivos, que hoje diz que o pacote não está
instalado — comentário que descreve uma realidade passada é pior que comentário nenhum.

**Como o pacote funciona.** `server-only` não tem código: é um pacote que declara uma
condição de exportação que só resolve no ambiente de servidor. Importado de um Client
Component, o bundler não encontra o módulo e **o build quebra**, com mensagem explícita
apontando o arquivo culpado.

**Teste de aceite.** Prova positiva e negativa:

1. `npm run build` continua passando.
2. Acrescentar temporariamente `import '@/server/state'` no topo de um componente `'use
   client'` qualquer, rodar `npm run build`, e **confirmar que quebra**. Remover.

---

# CD-05 — Dependência `xlsx` fora do registro npm

```
Gravidade:  ALTA (disponibilidade)
Bloqueia:   nada hoje · pode bloquear todo deploy em qualquer dia
Evidência:  package.json · reproduzido em 28/08/2026 com erro 403
```

**Nota de esclarecimento.** Isto **não tem relação** com as planilhas XLSX do projeto — nem
com o modelo financeiro, nem com a planilha de exemplo do banco de dados. Trata-se da
**biblioteca de programação** que gera arquivos Excel dentro da aplicação: a exportação da
auditoria de estoque (`src/lib/xlsx/audit-export.ts`) e a exportação do extrato
(`src/lib/export/statement-export.ts`).

**O sintoma.** `npm install` falha, e com ele todo build local e todo deploy na Vercel:

```
npm error code E403
npm error 403 Forbidden - GET https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Reproduzido em 28/08/2026 durante a leitura remota do repositório.

**A causa.** No `package.json`:

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

A SheetJS retirou o pacote do registro público do npm em 2023 e passou a distribuir pelo
próprio CDN. Isso é decisão do fornecedor, não erro do projeto — mas cria uma dependência de
disponibilidade que o registro do npm normalmente absorve.

**A consequência.** Toda instalação depende de **um servidor específico**, de um fornecedor
único, estar no ar e acessível. Se o CDN cair, se a rede tiver proxy corporativo, ou se a
Vercel tiver bloqueio de saída para aquele domínio, o build falha por inteiro — não degrada,
não perde só a exportação de planilha: **não builda**.

Cenário concreto: correção urgente em produção, `git push`, build falha por causa de um CDN
de terceiro. O ambiente fica na versão anterior e a correção não sobe.

**A correção — decidida em 28/08/2026: trazer a biblioteca para dentro do repositório.**

A decisão do operador foi: perder a exportação de planilha não é crítico, mas se existe
solução simples que garanta a suavidade do processo, ela é preferível. Existe, e é o
**caminho B** abaixo. Os outros dois ficam registrados como alternativas descartadas, com o
motivo.

### Caminho B — versionar o pacote no repositório ✅ ESCOLHIDO

Baixe o `.tgz` uma vez, guarde-o no repositório e aponte o `package.json` para o caminho
local. A partir daí, `npm install` não sai para a internet atrás dele.

```bash
mkdir -p vendor
curl -fL -o vendor/xlsx-0.20.3.tgz https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
ls -lh vendor/xlsx-0.20.3.tgz        # confira que baixou de verdade
```

O `-f` faz o `curl` falhar com erro em vez de gravar uma página de erro dentro do arquivo —
sem ele, um CDN fora do ar produz um `.tgz` de 2 KB contendo HTML, e o defeito só aparece na
instalação seguinte.

No `package.json`:

```diff
-    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
+    "xlsx": "file:vendor/xlsx-0.20.3.tgz"
```

Regenere o lockfile e valide:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Regenerar o `package-lock.json` não é opcional.** Ele guarda a URL antiga; sem regenerar,
o `npm ci` da Vercel e da futura CI continua tentando o CDN, e a correção não teria efeito
justamente onde importa.

Confira que o arquivo entra no commit — o `.gitignore` atual não exclui `vendor/`, mas vale
verificar antes de empurrar:

```bash
git status --short vendor/
git add vendor/xlsx-0.20.3.tgz package.json package-lock.json
```

**Custo:** alguns megabytes versionados, uma vez. **Ganho:** instalação e deploy deixam de
depender de servidor de terceiro. É o padrão que a própria SheetJS recomenda para ambiente
controlado.

**Quando repetir:** só ao atualizar a versão da biblioteca. Baixe o `.tgz` novo, troque o
caminho, regenere o lockfile.

### Caminho A — aceitar e documentar ❌ descartado

Registrar o risco no `README.md` e, havendo falha de build, promover o deploy anterior pelo
painel. Custo zero, risco residual permanente. Descartado porque o caminho B custa quinze
minutos e elimina o risco em vez de administrá-lo.

### Caminho C — substituir a biblioteca ❌ descartado

Avaliar `exceljs` ou `write-excel-file`, ambas no registro npm. Exigiria reescrever dois
exportadores e revalidar a saída. Descartado: a exportação funciona, e reescrever código que
funciona por motivo de logística é troca ruim.

**Teste de aceite.**

```bash
rm -rf node_modules
npm install --loglevel=http 2>&1 | grep -i "sheetjs" ; echo "saída: $?"
```

Não pode haver nenhuma linha mencionando `cdn.sheetjs.com`. Depois, `npm run build` passando
e a exportação de auditoria e de extrato gerando arquivo abrível no Excel — o teste real é a
planilha abrir, não o build passar.

---

# CD-06 — Não existe configuração de ESLint

```
Gravidade:  MÉDIA
Bloqueia:   CD-07 (não há o que rodar na CI)
Evidência:  package.json declara "lint": "next lint" · nenhum .eslintrc* ou eslint.config.* na raiz
```

**O sintoma.** `npm run lint` não roda a verificação: abre um assistente interativo pedindo
para escolher uma configuração. No terminal, parece só chato. Em ambiente automatizado, o
comando trava esperando entrada que nunca vem.

**A causa.** `eslint` e `eslint-config-next` estão nas devDependencies, mas **não existe
arquivo de configuração**. Sem ele, `next lint` entra no modo de inicialização.

Some-se: `next lint` está descontinuado no Next 15 em favor da CLI do ESLint direta.

**A consequência.** A verificação de estilo e de erro comum simplesmente não acontece. Num
projeto com TypeScript strict, boa parte é capturada pelo compilador — mas não tudo:
`useEffect` sem dependência, variável não usada, import circular e as regras específicas de
React Hooks passam batidas.

**A correção.**

**Passo 1** — criar `eslint.config.mjs` na raiz:

```javascript
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'vendor/**'],
  },
]
```

**Passo 2** — instalar o compatibilizador:

```bash
npm install --save-dev @eslint/eslintrc
```

**Passo 3** — trocar o script:

```diff
-    "lint": "next lint"
+    "lint": "eslint ."
```

**Passo 4** — rodar e **não corrigir tudo de uma vez**. A primeira execução provavelmente
devolve dezenas de avisos herdados do port. Registre a contagem, corrija o que for erro real,
e silencie o resto com regra explícita — nunca com `// eslint-disable` espalhado.

**Teste de aceite.** `npm run lint` executa sem interação e devolve código de saída 0 ou uma
lista de problemas conhecidos e registrados.

---

# CD-07 — Não existe integração contínua

```
Gravidade:  MÉDIA
Bloqueia:   nada tecnicamente · remove a única rede automática do processo
Evidência:  ausência de .github/ no repositório
Depende de: CD-03 e CD-06
```

**O sintoma.** Um push com typecheck quebrado chega à Vercel, o build falha lá, e o ambiente
que os sócios testam fica na versão anterior sem que ninguém seja avisado.

**A causa.** Build e typecheck rodam **apenas** por disciplina humana, através do `/commit`.
A disciplina é boa e está escrita — mas disciplina é exatamente o que falha às duas da manhã,
na sexta, quando alguém quer "só ajustar um texto".

**A consequência.** Além do risco operacional, há um custo estratégico: um histórico de CI
verde é evidência de maturidade de processo, e é o tipo de artefato que a due diligence do
parceiro bancário examina.

**A correção.** Criar `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Conferir tipos
        run: npm run typecheck

      - name: Rodar testes
        run: npm test

      - name: Build de produção
        run: npm run build
```

**Ordem deliberada:** typecheck primeiro porque é o mais rápido; testes depois; build por
último porque é o mais lento. Falha cedo economiza minuto de execução em toda falha.

`npm ci` e não `npm install`: respeita o `package-lock.json` exatamente e falha se o lock
estiver dessincronizado do `package.json` — o que é uma verificação a mais, de graça.

**Depois de funcionar**, ativar a proteção de branch: GitHub → Settings → Branches → Add
rule para `main` → **Require status checks to pass before merging**.

**Teste de aceite.** Abrir um PR com erro de tipo deliberado e confirmar que a CI reprova
antes de qualquer merge. Corrigir e confirmar que passa.

---

# CD-08 — Persistência ativa em produção é desconhecida

```
Gravidade:  MÉDIA (informação) · pode ser ALTA dependendo da resposta
Bloqueia:   qualquer decisão sobre concorrência
Evidência:  docs/MUDANCAS_MERCADO_MULTI_ATIVO.md seção 9 versus plano do projeto
```

**O sintoma.** Nenhum hoje. Com volume, negociações que desaparecem: duas ações no mesmo
segundo, uma se perde em silêncio.

**A causa.** Contradição direta entre as fontes:

- `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`, seção 9, tabela de riscos: *"Persistência hoje é
  **Redis (Vercel KV)**, não Postgres"*
- O plano do projeto e as decisões registradas falam em **Neon Postgres** como banco de
  produção.

**A consequência.** As três camadas têm garantias diferentes:

| Camada | Concorrência | Adequação |
|---|---|---|
| Postgres | `SELECT … FOR UPDATE` — serializa de verdade | Única aceitável com cliente real |
| Redis | Última gravação vence | Aceitável com 7 sócios |
| Memória | Estado se recria a cada cold start | Inaceitável em qualquer produção |

O adaptador Postgres **já está implementado e testado** em `src/server/store/postgres.ts`.
Se a produção está em Redis, o que falta é uma variável de ambiente — não código.

**A correção.**

1. Vercel → projeto → **Settings** → **Environment Variables**. Procurar, nesta ordem de
   precedência (`src/server/store/index.ts`, linhas 34–50):
   - `POSTGRES_URL` ou `DATABASE_URL` → Postgres ativo
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN` → Redis (Vercel KV)
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` → Redis (Upstash)
   - nenhuma → **memória**, o pior caso

2. **Confirmação cruzada, independente do painel.** Runtime Logs, após um cold start. A linha
   `[aurea] Nenhuma persistência configurada — usando store EM MEMÓRIA` significa que nada
   está ligado.

3. Estando em Redis e havendo Neon Postgres provisionado: acrescentar `POSTGRES_URL` com a
   string de conexão do Neon, marcando Production e Preview, e fazer Redeploy. O Postgres tem
   precedência automática — nenhuma alteração de código.

4. **Antes de trocar, avisar os sócios:** trocar de camada de persistência significa começar
   de um banco vazio, que semeia do zero. Saldos, anúncios e senhas trocadas voltam ao seed.

**Teste de aceite.** Runtime Logs sem o aviso de memória, e o painel confirmando qual camada
está ativa. Registrar a resposta no `README.md`, seção Persistência, para a pergunta não
precisar ser feita de novo.

---

# CD-09 — Comissão do extrato é recalculada, não congelada

```
Gravidade:  MÉDIA hoje · ALTA no dia em que uma taxa mudar
Bloqueia:   nada tecnicamente — EXIGE DECISÃO DOS SÓCIOS antes de codar
Evidência:  src/domain/statement.ts · docs/MUDANCAS_MERCADO_MULTI_ATIVO.md seção 8.3
```

**O sintoma.** Latente. Aparece no dia em que `FEE_PCT` ou `FEE_FIXED` mudarem: o extrato
passa a mostrar comissões diferentes para negociações que já aconteceram. **O extrato muda o
passado.**

**A causa.** `statement.ts` chama `tradeFee(t.price)` para cada venda, recalculando a comissão
a partir das constantes atuais. O objeto `Trade` não grava a comissão que foi efetivamente
cobrada.

A decisão original é defensável: não gravar evita que tela e execução divirjam, e enquanto as
taxas não mudam os dois valores são idênticos.

**A consequência.** Um extrato que muda retroativamente é problema contábil real, não
estético. Se um cliente imprimir o extrato hoje e reimprimir depois de uma mudança de tarifa,
os dois documentos divergem — sem que nada tenha acontecido com a conta dele. Numa
contestação, os dois documentos são prova, e eles se contradizem.

**Por que não pode ser corrigido sem decisão.** Gravar a comissão no `Trade` altera
`src/domain/types.ts`, que é a fonte da verdade do modelo de dados, e toca um número protegido
por decisão dos sócios. Segundo a regra do `/commit`, Passo 4, isso obriga a parar e
perguntar.

**A correção proposta, a levar aos sócios.**

1. Acrescentar `fee: Cents` ao tipo `Trade` em `src/domain/types.ts`
2. Gravar a comissão no momento da execução, em `src/server/actions/market.ts` e
   `src/server/actions/sell.ts`
3. Em `statement.ts`, usar `t.fee` quando existir e recalcular **apenas** para registros
   antigos que não o tenham
4. Mudança em `types.ts` **obriga rotação de `AUREA_STORE_KEY`** — é exatamente o caso que o
   `/publicar`, Passo 3, existe para detectar. Enquanto for ambiente de teste, rotacionar é a
   resposta correta. Ver também o item 1.1 do Bloco 1 de
   `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`.

**Teste de aceite.** Executar uma negociação, alterar `FEE_PCT` para um valor diferente,
reabrir o extrato e confirmar que a comissão da negociação anterior **não mudou**. Reverter a
constante.

---

# CD-10 — Branch `Useful-Data` órfã e não mesclável

```
Gravidade:  BAIXA
Bloqueia:   nada · é armadilha, não defeito
Evidência:  git ls-tree -r --name-only origin/Useful-Data
```

**O sintoma.** Quem der `checkout` nessa branch encontra um repositório sem aplicação: dois
arquivos apenas.

**A causa.** A branch saiu do `Initial commit`, antes de qualquer código existir, e contém:

```
Aurea_Custodia_Documento_Explicativo (2).docx
README.md
```

O diff contra `main` acusa 21.671 linhas de diferença — todas remoções. Ela nunca poderá ser
mesclada sem apagar o projeto inteiro.

**A consequência.** Risco baixo mas real: alguém, humano ou agente, dá `checkout` por engano,
não entende por que a pasta está vazia, e no pior caso tenta "consertar" mesclando.

Há ainda o detalhe do nome do arquivo: contém espaço e parênteses, o que quebra comando de
terminal sem aspas.

**A correção.**

1. Recuperar o documento e movê-lo para `docs/`, com nome normalizado, se ainda for útil:

```bash
git checkout origin/Useful-Data -- "Aurea_Custodia_Documento_Explicativo (2).docx"
mkdir -p docs/referencia
mv "Aurea_Custodia_Documento_Explicativo (2).docx" \
   docs/referencia/AUREA_DOCUMENTO_EXPLICATIVO.docx
```

2. Apagar a branch remota:

```bash
git push origin --delete Useful-Data
```

**Teste de aceite.** `git branch -a` mostrando apenas `main` e sua referência remota.

---

# Itens que NÃO estão neste documento, e por quê

Estes são reais e estão registrados em outro lugar. Não entram aqui porque **não são
correção de defeito** — são construção de produto ou decisão de negócio.

| Assunto | Onde está |
|---|---|
| Bloqueantes de cliente real (senhas, termos, backup, ambientes separados) | `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`, Bloco 1 |
| Telas de retirada, tutoriais com aceite, seguro no envio | Documento de retomada, Bloco D |
| Estação de validação física | Documento de retomada, Bloco E |
| Regime tributário, parecer jurídico, seguro, CAPEX físico | Documento de retomada, Bloco G |
| Acessibilidade, memoização, idempotência de depósito | `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`, seção 8 |

---

*Próxima reescrita deste documento: na leitura diária seguinte. Item resolvido sai; o registro
de que existiu fica em `VERSION_COMPARISON_DAILY.md`.*
