# Leitura Diária do Repositório — DETALHADO

```
Projeto:              Áurea Custódia / Real Olímpico
Repositório:          github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP
Branch:               main
Commit (HEAD):        8e0f0a5 "Abre o marketplace para mais de um tipo de moeda"
Commit anterior lido: nenhum — primeira leitura
Gerado em:            28/08/2026, 18:30
Método:               clone completo remoto
Fonte:                repositório · documentos do projeto
```

---

## 1. Escopo desta leitura

Primeira leitura do repositório. Não há leitura anterior para comparar, então a cobertura é o
**histórico completo**: 13 commits, de `ecde6cb` (15/08/2026 19:26) a `8e0f0a5` (19/08/2026
04:14), todos do mesmo autor.

O detalhamento comparativo por fase está na **entrada 001 do
`VERSION_COMPARISON_DAILY.md`** e não é repetido aqui. Este documento cobre o que a outra
não cobre: o **inventário do que existe**, arquivo por arquivo e configuração por
configuração, para servir de referência de estrutura nas próximas leituras.

---

## 2. Inventário estrutural

### 2.1 Números

```
Arquivos versionados:   100
Linhas em src/:      12.590 (.ts + .tsx)
Commits:                 13
Branches:                 2 (main · Useful-Data)
Tamanho do clone:      1,9 MB
```

### 2.2 Árvore de primeiro nível

```
.claude/          2 comandos customizados + launch.json
docs/             3 documentos (927 linhas)
public/brand/     2 logos .webp
src/              a aplicação
CLAUDE.md         contexto permanente do agente
README.md         divergências, deploy, pendências
.env.example      variáveis de ambiente documentadas
next.config.mjs   cabeçalhos de segurança + pg externo
package.json      6 dependências, 7 devDependencies
tsconfig.json
vercel.json       fixa framework: nextjs
```

### 2.3 `src/` por camada

| Camada | Arquivos | Papel |
|---|---|---|
| `src/domain/` | 10 | Regra de negócio pura. Sem React, sem Next, sem I/O, sem async |
| `src/server/` | 10 | Persistência, sessão, Server Actions. Só servidor |
| `src/app/` | 17 | Rotas do App Router + 2 rotas de API |
| `src/components/` | 22 | UI, organizada por área |
| `src/lib/` | 5 | Integrações externas |
| `src/styles/` | 11 | CSS global por área |

**`src/domain/` — 10 arquivos, a pasta mais importante do repositório**

| Arquivo | Papel |
|---|---|
| `types.ts` | O modelo de dados inteiro — fonte da verdade |
| `constants.ts` | Parâmetros de negócio: comissão, catálogo, contas, `STORE_KEY` |
| `money.ts` | Centavos ↔ exibição em BRL, incluindo o `parsePrice` corrigido |
| `dates.ts` | Timestamp ↔ dd/mm/aaaa |
| `codes.ts` | `RO-000001`, `NFT-000001`, `RO-ENV-0001` e o hash simulado |
| `fees.ts` | Comissão de negociação e faixas de custódia |
| `market.ts` | Casamento de ordens, um livro por tipo, lotes, indicadores |
| `selectors.ts` | Leituras derivadas do estado |
| `statement.ts` | Extrato de uma conta |
| `seed.ts` | Dados fictícios das 7 contas |

**Por que esta pasta merece atenção especial:** é JavaScript puro, sem React, sem Next e sem
entrada e saída. É a pasta que se traduz quase linha a linha quando a migração para Java +
Spring acontecer — registrado na seção 3.2 de `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`. O
resto se descarta.

**`src/server/` — 10 arquivos**

```
store/
  types.ts       contrato da persistência
  memory.ts      Map ancorado em globalThis
  redis.ts       Vercel KV ou Upstash · última gravação vence
  postgres.ts    SELECT … FOR UPDATE · única camada que resolve concorrência
  index.ts       seleção automática por variável de ambiente
state.ts         getState / mutateState — o ponto único de troca
session.ts       cookie httpOnly assinado com HMAC-SHA256
actions/         account · auth · custody · market · sell
```

### 2.4 As 13 rotas

| URL | Tela | Origem no desenho |
|---|---|---|
| `/` | Login | — |
| `/inicio` | Painel Real Olímpico | 1.0 |
| `/mercado` | Comprar moeda | 1.1 |
| `/vender` | Vender ativo | 1.2 |
| `/envios` | Enviar para custódia | 1.3 + 4.1 + 4.2 |
| `/recibos` | Meus recibos NFT | 1.4 |
| `/recibos/[coinId]` | Certificado do recibo | 3.1 |
| `/graficos` | Mercado e auditoria | 2.0 |
| `/graficos/auditoria` | Auditoria de estoque | 2.2 |
| `/graficos/comparacoes` | Comparações BTC/ETH/USDT | 2.3 |
| `/conta` | Minha conta | 3.0 |
| `/conta/configuracoes` | Configurações e segurança | 3.2 |
| `/conta/extrato` | Extrato da conta | 3.3 — não vem do monolito |

**Telas do desenho aprovado sem rota correspondente:** 4.3 Retirada · 5.0 Investimentos ·
5.1 Áurea Academy · 5.2 Crédito com garantia · e a página de tutoriais com aceite contratual
decidida na reunião de 08/07/2026.

### 2.5 Rotas de API

| Rota | Papel |
|---|---|
| `/api/state` | Polling de 10 segundos — é como cada sessão enxerga o que as outras fizeram |
| `/api/crypto` | Cotações BTC/ETH/USDT, com fallback simulado que nunca lança exceção |

---

## 3. Configuração

### 3.1 `package.json`

**Dependências de produção (6):**

| Pacote | Versão | Observação |
|---|---|---|
| `next` | ^15.5.23 | |
| `react` / `react-dom` | 19.0.0 | Versão fixa, sem `^` |
| `pg` | 8.13.1 | Versão fixa. Marcado como `serverExternalPackages` no `next.config.mjs` |
| `jspdf` | ^4.2.1 | Recibo em PDF |
| `xlsx` | URL do CDN da SheetJS | **Fora do registro npm — ver CD-05** |

**devDependencies (7):** `typescript` 5.7.2, `@types/*`, `eslint` ^9.39.5,
`eslint-config-next` ^15.5.23.

**Scripts:** `dev`, `build`, `start`, `lint`, `typecheck`. **Não há `test`.**

**`engines`:** `"node": ">=20"` — mas o npm do Claude Code exige ≥ 22. Registrado no Ritual.

**`overrides`:** `postcss` ^8.5.26 e `sharp` ^0.35.3 — forçados, provavelmente por aviso de
segurança em dependência transitiva.

### 3.2 `next.config.mjs`

```javascript
reactStrictMode: true
poweredByHeader: false                    // não anuncia o framework
serverExternalPackages: ['pg']            // impede o bundler de resolver drivers opcionais
headers: X-Content-Type-Options: nosniff
         X-Frame-Options: DENY
         Referrer-Policy: strict-origin-when-cross-origin
```

Três cabeçalhos de segurança configurados. **Ausentes:** `Content-Security-Policy` e
`Strict-Transport-Security`. Nenhum dos dois é urgente em ambiente de teste; ambos entram
antes de cliente real, junto com o WAF previsto no item 2.3 do documento de pré-lançamento.

### 3.3 `.gitignore`

```
node_modules/ · .next/ · out/ · build/ · .DS_Store · *.pem
.env · .env*.local
.vercel · *.tsbuildinfo · next-env.d.ts
```

**Correto.** `.env.local` está coberto pelo padrão `.env*.local`.

### 3.4 `.env.example` — contém defeito

Documenta a ordem de precedência da persistência corretamente. **Mas a última linha define
`AUREA_STORE_KEY="aurea-market-v5"`, enquanto o código está em v6.** Ver CD-01.

### 3.5 `vercel.json`

Fixa `"framework": "nextjs"`. Existe porque o preset errado no painel produz um sintoma
enganoso: `public/` responde 200 e **toda rota dá 404** com `X-Vercel-Error: NOT_FOUND`.

---

## 4. Camada de processo

Diferencial deste repositório: existe processo versionado, não só código.

### 4.1 `CLAUDE.md` — 158 linhas

Carregado automaticamente em toda sessão do Claude Code. Contém:

- Comandos e a regra de rodar build + typecheck antes de todo commit
- As três camadas e a regra inviolável (`@/server/*` fora do cliente)
- **Regras de negócio que não podem mudar sem decisão dos sócios**, com os números explícitos
- Restrições de marca, jurídico e regulatório
- Pendências conhecidas, marcadas como "não são bugs a consertar sem combinar"
- Convenções de código
- Cinco regras de como o agente deve trabalhar no repositório

### 4.2 `.claude/commands/commit.md` — 7 passos

Inventário → varredura de segurança → typecheck + build → conferência de regra de negócio →
commit → push → fechamento. **Para no primeiro que falhar.**

O Passo 4 é o mais específico do projeto: se o diff tocar `constants.ts`, `fees.ts` ou
`market.ts`, o agente **para e pergunta**, porque esses arquivos contêm números combinados
com os sócios.

### 4.3 `.claude/commands/publicar.md` — 7 passos

Contém a pergunta que evita o desastre: **"o formato de `types.ts` mudou?"** Se mudou, é
preciso rotacionar `AUREA_STORE_KEY` antes de publicar, porque `getState()` devolve o
documento gravado sem validar formato e sem migrar — o código novo espera o campo novo,
encontra `undefined`, e a tela quebra **em produção, sem ter quebrado localmente**, já que
local usa memória e semeia limpo a cada `npm run dev`.

### 4.4 `docs/` — 927 linhas

| Documento | Linhas | Conteúdo |
|---|---|---|
| `GUIA_CLAUDE_CODE_AUREA.md` | 469 | Instalação, Git, Vercel, automação. Contém o defeito do CD-01 na linha 144 |
| `MUDANCAS_MERCADO_MULTI_ATIVO.md` | 458 | Registro técnico do último commit, com **autocrítica de 11 itens** |
| `PRE_LANCAMENTO_CLIENTES_REAIS.md` | — | 24 itens em três blocos, com veto explícito ao lançamento |

---

## 5. Verificações executadas nesta leitura

| Verificação | Resultado |
|---|---|
| `git clone` | OK — 100 arquivos, 1,9 MB |
| `git log` completo | OK — 13 commits, autor único |
| Varredura de segredo em arquivo versionado | **Nenhum segredo real encontrado.** `DEV_SECRET` é intencional e está documentado, mas é exposição enquanto o repositório estiver público |
| Busca por `TODO`/`FIXME`/`HACK` | Nenhum. As pendências estão em documento, não em comentário — prática melhor que a comum |
| Busca por `Math.random` | 20 ocorrências. Todas legítimas (seed, códigos de lote, série simulada) **exceto** `codes.ts` linha 23, o hash do recibo, que é simulado por decisão registrada |
| Consistência de imports | Sem import quebrado detectado por inspeção estática |
| `npm install` | **Falhou** — 403 em `cdn.sheetjs.com`. Limitação do ambiente de leitura, mas revelou o CD-05 |
| `npm run build` | **Não executado** — bloqueado pela falha anterior |

**Consequência da última linha:** o estado do build é pergunta em aberto até ser rodado numa
máquina com acesso ao CDN. É o Passo 4 do Ritual de Sessão.

---

## 6. Contradições entre fontes

| # | Contradição | Resolução |
|---|---|---|
| 1 | Contagem de divergências: 2 × 5 × 6 | Vale o histórico do Git → 6. CD-02 |
| 2 | `.env.example` v5 × código v6 | Vale o código → v6. CD-01 |
| 3 | Persistência: doc diz Redis, plano diz Neon Postgres | Só o painel resolve. CD-08 |
| 4 | Stack backend: relatório diz Java + Spring, repositório é Next.js | **Não é contradição** — o relatório fala do destino final; o repositório é a fase atual. Está conciliado na seção 3.2 do documento de pré-lançamento |
| 5 | Regime tributário: Lucro Presumido × Simples Nacional | Não afeta código hoje. Bloqueia qualquer lógica de imposto |

---

## 7. Recomendações de alteração no Ritual de Sessão

Esta leitura **criou** o Ritual de Sessão (versão base 1.0). As decisões incorporadas:

| # | Alteração | Origem |
|---|---|---|
| 1 | Passo 5 instrui que `AUREA_STORE_KEY` fique ausente ou comentada — inverte a instrução do guia antigo | CD-01 |
| 2 | Passo 3 avisa sobre a falha possível do `npm install` no CDN da SheetJS | CD-05 |
| 3 | Passo 4 (typecheck + build antes de editar) ganha destaque como o passo mais pulado | Boa prática |
| 4 | Parte 0 acrescenta contexto mínimo para agente que nunca abriu o projeto | Fase multi-IA |
| 5 | Parte 6 cria a tabela de divisão de frentes entre agentes, hoje com uma linha | Fase multi-IA |
| 6 | Cuidados permanentes ganham o item sobre lógica de imposto | Contradição 5 |

---

## 8. Estado ao fim da leitura

```
Itens no Critical Debugs:    11 abertos (2 críticos, 4 altos, 4 médios, 1 baixo)
Itens resolvidos hoje:        0
Ritual de Sessão:             criado, versão base 1.0
Version Comparison:           entrada 001 (linha de base) registrada
Próxima leitura:              comparará contra o commit 8e0f0a5
```
