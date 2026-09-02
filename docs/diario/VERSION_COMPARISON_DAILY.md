# Version Comparison Daily — Áurea Custódia

**Documento perpétuo · APPEND-ONLY · memória longa do projeto**

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP
Criado em:   28/08/2026
```

> **Regras deste arquivo.**
>
> 1. Entrada nova sempre no **fim**, com cabeçalho de data e hora da leitura.
> 2. **Nunca editar entrada anterior.** Correção se faz com entrada nova apontando para a
>    antiga.
> 3. Foco em **features, correções de defeito e reestruturações** — a lista de cada arquivo
>    alterado é assunto da Leitura Diária, não deste documento.
> 4. Toda entrada precisa da seção "Análise crítica do que entrou". Entrada sem análise
>    crítica é registro de contabilidade, não de engenharia.

---

# Entrada 001 — 28/08/2026, 18:30 — LINHA DE BASE

```
Leitura:        remota, clone completo
Commit:         8e0f0a5 "Abre o marketplace para mais de um tipo de moeda"
Commit anterior lido: nenhum — esta é a primeira leitura
Cobertura:      histórico completo, ecde6cb → 8e0f0a5 (13 commits)
Período:        15/08/2026 19:26 → 19/08/2026 04:14
Autor único:    gabrielsilva-aureacustodia
```

## Por que esta entrada é diferente das próximas

Não existe versão anterior para comparar. Esta entrada estabelece a **linha de base**:
percorre o histórico inteiro do repositório, do primeiro commit ao atual, e registra o que
existe hoje. As entradas seguintes comparam apenas com a leitura imediatamente anterior.

## A linha do tempo em três fases

O histórico de 13 commits se organiza em três fases distintas, separadas por intervalos de
dias.

### Fase 1 — Fundação (15/08, 19:26 → 22:03)

Nascimento do repositório e refatoração do monolito.

| Commit | Hora | O que fez | Volume |
|---|---|---|---|
| `ecde6cb` | 19:26 | Initial commit | 1 arquivo |
| `d384127` | 21:47 | **Refatora o MVP monolítico para Next.js modular (fase 1: fundação)** | 45 arquivos, +10.134 |
| `9399ead` | 21:50 | Corrige divergências da conferência cruzada da fundação | 7 arquivos, +63/−42 |
| `224d42d` | 22:01 | **Corrige dois defeitos herdados do MVP, autorizados pelos sócios** | 3 arquivos, +83/−7 |
| `8c02b68` | 22:03 | Registra as divergências autorizadas no README | 1 arquivo, +27 |

**A mudança estrutural da fase.** O monolito `aurea-mvp-teste.html` (2.816 linhas num arquivo
só) virou aplicação Next.js modular. Três consequências que definem tudo o que veio depois:

1. **`window.storage` foi substituído por persistência plugável.** A API de armazenamento
   que o MVP usava **só existe no ambiente de artefatos** — nenhum navegador oferece, nenhuma
   hospedagem fornece. Estava registrado como "o parágrafo mais importante" da Seção 4.2 do
   documento técnico. No lugar entraram três implementações (memória, Redis, Postgres) com
   seleção automática por variável de ambiente.
2. **A regra de negócio saiu do navegador.** No MVP a lógica rodava no cliente, onde qualquer
   pessoa com o console aberto podia alterá-la. Passou a ser Server Action, revalidada no
   servidor.
3. **Uma tela virou uma URL.** O MVP era página única com `display:none` alternando
   containers.

**As duas primeiras divergências autorizadas** (`224d42d`), ambas defeitos herdados corrigidos
com aprovação dos sócios:

- **`parsePrice` errava 100x em silêncio.** O original apagava todos os pontos antes de tratar
  a vírgula: `250.00` digitado no padrão americano virava R$ 25.000,00, num campo de texto
  livre cujo valor vira ordem de venda real.
- **`matchOrders` permitia compra fantasma.** O motor movia o dinheiro e só então chamava
  `transferCoin`, ignorando o retorno. Se a oferta apontasse para moeda fora do inventário do
  vendedor, o saldo trocava de mãos e a moeda não — com o histórico registrando uma
  negociação que não aconteceu.

### Fase 2 — Telas e correções (15/08 22:28 → 16/08 00:14)

| Commit | Hora | O que fez | Volume |
|---|---|---|---|
| `0d8af21` | 22:28 | Devolve o alvo de toque de 44px ao botão de vender | 2 arquivos, +21/−11 |
| `ea0a5f3` | 22:49 | **Fase 2: as 12 telas, as Server Actions e as rotas do App Router** | 44 arquivos, +7.663 |
| `466eddd` | 22:49 | **Corrige perda de estado do store em memória entre grafos de bundle** | 1 arquivo, +27/−5 |
| `d93508f` | 23:35 | Fixa o preset da Vercel e corrige as instruções de deploy | 2 arquivos, +38/−4 |
| `1d1f507` | 00:14 | **Fecha as duas últimas correções de defeito herdado** | 3 arquivos, +54/−16 |

**A correção do `globalThis`** (`466eddd`) merece registro próprio. O store em memória
mantinha o `Map` no escopo do módulo. Em desenvolvimento, o Next.js compila grafos de bundle
separados, e o mesmo módulo acabava instanciado duas vezes no mesmo processo — com dois
estados divergentes. Ancorar em `globalThis`, que é único por processo e atravessa a fronteira
de bundle, resolve o problema local.

**Registro importante:** essa correção **não resolve concorrência em produção**. Isso exige o
Postgres com `SELECT … FOR UPDATE`, já implementado em `src/server/store/postgres.ts`, linhas
141–155.

**Divergências 3, 4 e 5:**

- **Alvo de toque de 44px em "Minhas moedas"** — `.acct-row .a-actions .btn{min-height:38px}`
  derrubava o mínimo por ser mais específico (0,3,0 contra 0,1,0), justamente no botão mais
  clicado da tela de conta no celular.
- **`buyLot` também permitia compra fantasma** — o mesmo defeito do `matchOrders`, num
  caminho de código separado (compra direta de lote).
- **O olho de revelar senha chegou aos 44px** — `::before` com `inset:-2px`, ampliando só a
  área de toque, sem efeito visual.

### Fase 3 — Processo e mercado multi-ativo (19/08, 02:25 → 04:14)

Três dias de intervalo. Retomada com foco em processo antes de feature.

| Commit | Hora | O que fez | Volume |
|---|---|---|---|
| `99ee09c` | 02:25 | **Versiona o contexto e o checklist de commit do Claude Code** | 3 arquivos, +698 |
| `f40c6ef` | 03:01 | **Adiciona o comando /publicar e os requisitos para cliente real** | 2 arquivos, +439 |
| `8e0f0a5` | 04:14 | **Abre o marketplace para mais de um tipo de moeda** | 35 arquivos, +2.787/−276 |

**A camada de processo** (`99ee09c` e `f40c6ef`) é a mudança de maturidade mais relevante do
repositório, e não gerou uma linha de código de produto:

- `CLAUDE.md` — contexto permanente carregado em toda sessão: regras de negócio protegidas,
  restrições de marca, travas regulatórias, pendências que não devem ser "consertadas" por
  conta própria
- `.claude/commands/commit.md` — checklist de sete passos que para no primeiro que falhar
- `.claude/commands/publicar.md` — rotina de publicação com a pergunta que evita o desastre
  ("o formato de `types.ts` mudou?")
- `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md` — 24 itens em três blocos, com veto explícito ao
  lançamento comercial enquanto o Bloco 1 estiver aberto

**O mercado multi-ativo** (`8e0f0a5`) é a primeira leva de funcionalidade que **não** vem do
monolito:

| Feature | O que mudou |
|---|---|
| Moeda dos Direitos Humanos | R$ 1 de 1998, tiragem de 600.000 — a menor do Plano Real. Faixa de R$ 380 a R$ 520, derivada de cotação real de lojas numismáticas |
| Um livro de ordens por ativo | A regra "só a Bandeira é negociável" caiu. Quem responde agora é `isNegociavel(tipo)`, não `tipo === COIN.name` |
| Indicadores por tipo | Média de 7 dias, mediana de 24h e séries de gráfico passaram a ser recortadas por tipo — sem isso, uma DH de R$ 450 entraria na média de uma Bandeira de R$ 285 |
| Pastas e seletor de tipo | Lista corrida virou pastas por categoria. Lote misto é recusado no servidor |
| Depósito em conta (simulado) | Teto de R$ 100.000 por operação. Sem Pix, cartão ou boleto |
| Extrato da conta | Tela nova em `/conta/extrato`, com exportação CSV e XLSX |
| Chave de estado | `aurea-market-v5` → `aurea-market-v6` |

## O que existe hoje — retrato da linha de base

```
100 arquivos versionados · 12.590 linhas em src/ · 13 commits · 2 branches
Stack: Next.js 15 · React 19 · TypeScript strict · Vercel
```

**13 rotas:** `/` login, `/inicio`, `/mercado`, `/vender`, `/envios`, `/recibos`,
`/recibos/[coinId]`, `/graficos`, `/graficos/auditoria`, `/graficos/comparacoes`, `/conta`,
`/conta/configuracoes`, `/conta/extrato`

**5 Server Actions:** `account`, `auth`, `custody`, `market`, `sell`

**3 adaptadores de persistência:** memória, Redis, Postgres

**Integração externa real:** CoinGecko, com histórico de 30 dias, cache compartilhado e
fallback declarado na tela

**Exportações reais:** PDF do recibo (jsPDF), XLSX da auditoria e do extrato (SheetJS), CSV do
extrato

## Análise crítica do que entrou

Varredura ativa sobre o estado atual. Cada achado virou item no `CRITICAL_DEBUGS.md`.

| Categoria | Achado | Item |
|---|---|---|
| **Erro crítico** | `SESSION_SECRET` pode não existir em produção; o app degrada em silêncio para um segredo público | CD-00 |
| **Erro crítico** | `.env.example` e o guia de onboarding apontam para `aurea-market-v5`, enquanto o código está em v6. Ordens v5 sem `tipoMoeda` casam entre si porque `undefined === undefined` | CD-01 |
| **Divergência** | Contagem de divergências autorizadas em três números diferentes: título "duas", texto "cinco", lista com 5, `/commit` "seis". A sexta não está escrita em lugar nenhum | CD-02 |
| **Ausência de rede** | Nenhum teste versionado. As 34 verificações do motor rodaram em diretório temporário e foram apagadas | CD-03 |
| **Barreira frágil** | A proteção contra importar `@/server/*` de Client Component é um comentário, não um mecanismo. `server-only` não está instalado | CD-04 |
| **Dependência frágil** | `xlsx` vem de `cdn.sheetjs.com`, fora do registro npm. Reproduzido erro 403 nesta leitura — falha ali derruba todo o build | CD-05 |
| **Arquivo faltando** | `package.json` declara `"lint": "next lint"`, mas não existe `.eslintrc*` nem `eslint.config.*` na raiz | CD-06 |
| **Sem automação** | Nenhum `.github/`. Build e typecheck rodam só por disciplina humana | CD-07 |
| **Contradição de fonte** | Documento de mudanças diz Redis (Vercel KV); o plano do projeto diz Neon Postgres. Não é possível saber qual está ativo sem o painel | CD-08 |
| **Risco contábil latente** | Comissão do extrato é recalculada a cada leitura, não congelada no `Trade`. Mudança de taxa alteraria o passado | CD-09 |
| **Armadilha** | Branch `Useful-Data` órfã, saída do `Initial commit`, sem aplicação, não mesclável | CD-10 |

### Achados que NÃO viraram item

**Registrados pelo próprio repositório e conscientes:** senhas em texto puro, hash do recibo
simulado, ausência de termos de uso versionados, integrações ausentes (Pix, Correios, Google,
e-mail transacional). Todos estão em `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md` como bloqueantes
de cliente real, não como defeitos a corrigir agora.

**Autocrítica já escrita:** os itens 8.1 a 8.10 de `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`.
Deles, apenas o 8.3 (comissão recalculada) subiu para o Critical Debugs, por ter consequência
contábil. Os demais são dívida consciente com diagnóstico já registrado.

### Observação sobre a qualidade do registro existente

Digno de nota nesta linha de base: o repositório contém uma seção de **autocrítica** escrita
pelo próprio autor da última entrega, listando o que ficou pior e o que faria diferente. Isso
é raro, e é o que tornou possível montar esta análise em uma leitura. Boa parte dos achados
acima não foi descoberta: foi **encontrada já escrita** e apenas promovida a tarefa.

## Recomendações de alteração no Ritual de Sessão

**Esta leitura criou o Ritual de Sessão do zero** (versão base 1.0), incorporando:

1. Passo 3 do ritual passa a avisar sobre o comportamento do `npm install` com o CDN da
   SheetJS (CD-05)
2. Passo 5 passa a instruir que `AUREA_STORE_KEY` fique **ausente ou comentada**, invertendo
   a instrução do guia antigo (CD-01)
3. Parte 6 nasce vazia por enquanto: a tabela de divisão de frentes entre agentes, preparada
   para a fase multi-IA

## Estado dos itens críticos ao fim desta entrada

| Item | Estado |
|---|---|
| CD-00 a CD-10 | **Todos abertos** — nenhum resolvido nesta leitura |

---

*Fim da entrada 001. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

# Entrada 002 — 01/09/2026 — EXECUÇÃO DOS CRITICAL DEBUGS

```
Leitura:        local, na máquina de trabalho, verificada contra a Vercel (CLI)
Commit base:    8e0f0a5 "Abre o marketplace para mais de um tipo de moeda"
Commits novos:  ed623ad → (este) — sessões 0 a 8 do plano de execução
Plano seguido:  docs/PLANO_EXECUCAO_CRITICAL_DEBUGS.md
Autor:          gabrielsilva-aureacustodia (Claude Code)
```

## O que entrou

| Sessão | Item | Commit | Resultado |
|---|---|---|---|
| 0 | H-01 + H-02 (achados novos) | `ed623ad` | Clone aninhado do repositório removido; rituais versionados em `docs/diario/`; `AGENTS.md` vira ponteiro para o `CLAUDE.md` |
| 1 | CD-01 | `7b1dc84` | `.env.example`, guia e `/publicar` deixam de instruir `aurea-market-v5` |
| 2 | CD-04 + CD-00 (melhoria) + CD-01 (melhoria) | `84b3eee` | `server-only` em `state.ts`, `session.ts` e `store/index.ts` (prova negativa executada: import indevido quebra o build); produção recusa subir sem `SESSION_SECRET`; `garantirFormato()` descarta ordens v5 sem `tipoMoeda` com aviso no log |
| 3 | CD-05 | `d1cfba2` | `xlsx` vendorizado em `vendor/` (2,3 MB); lockfile sem nenhuma menção ao CDN; `npm ci` do zero comprovado offline do CDN |
| 4 | CD-03 | `53cc908` | Vitest + **38 testes** em `src/domain/` (motor, parsePrice, extrato, seed); prova negativa: comparação de tipo invertida derruba 8 testes; `npm test` entra no `/commit` |
| 5 | CD-06 | `6acce7f` | `eslint.config.mjs` (flat config); `npm run lint` roda sem assistente, saída 0 |
| 6 | CD-07 | `c466d36` | CI no GitHub Actions: lint → typecheck → test → build, Node 24, `npm ci` |
| 7 | CD-02 | `8b41db7` | Sexto item (concorrência sob Postgres) escrito e lista **selada**; `/commit` Passo 4 aponta para a superfície protegida; `CLAUDE.md` alinhado |
| 8 | CD-10 | (este) | `.docx` recuperado para `docs/referencia/`; exclusão da branch remota pendente do push |

## Verificações que encerraram itens SEM código

- **CD-00 encerrado**: `SESSION_SECRET` existe na Vercel (Production + Preview), conferido
  pelo CLI em 01/09. O `DEV_SECRET` público nunca esteve em uso em produção.
- **CD-08 respondido**: a persistência ativa em produção é **Redis (Vercel KV)** — existem
  `KV_REST_API_*`/`REDIS_URL`, não existem `POSTGRES_URL`/`DATABASE_URL`. A migração para
  Postgres virou decisão de agenda (recomendada junto com o CD-09, para um único reset).
- **CD-05, nuance**: o CDN da SheetJS respondeu 200/2,4 MB em 01/09 — o 403 de 28/08 foi
  transitório, o que confirma a intermitência em vez de negá-la.

## Achados novos desta execução

1. **H-01 — clone completo do repositório dentro do repositório** (`AureaCustodiaMVP/`,
   com `.git` próprio, mesmo commit, limpo). Removido após conferência. Era o risco de
   corrigir o CD-01 na cópia errada e commitar um "resolvido" que não resolve.
2. **H-02 — `docs/diario/` não existia**, embora o Ritual e o CD-01 apontassem para lá.
   Os rituais estavam numa pasta solta não versionada. Corrigido na Sessão 0.
3. **Credencial do GitHub trocada na máquina**: o Credential Manager do Windows guarda
   `git:https://github.com` da conta `gabrielsilva-sintetica`, sem permissão no
   repositório. O push está bloqueado até o operador reautenticar — todos os commits
   desta entrada estão locais até lá.

## Análise crítica do que entrou

- **O maior ganho é o CD-03**: o motor de casamento tem rede versionada pela primeira
  vez, com prova negativa executada. O maior risco residual é o mesmo de antes em outra
  escala: `src/server/` continua sem teste (o `server-only` do CD-04 impede inclusive
  importar esses módulos numa suíte Node comum — limitação registrada no
  `vitest.config.mts`).
- **A ordem do plano divergiu do PRIMEIRAS_ACOES_DO_DIA** (CD-03 antecipado, CD-02
  adiado) com critério explícito: o que bloqueia produto vem antes do que arruma
  documentação.
- **Um débito das sessões**: a proteção de branch do GitHub (exigir CI verde) é passo
  manual do operador, e a exclusão da branch `Useful-Data` depende do push. Nenhum dos
  dois está concluído nesta entrada.

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| CD-00, CD-01, CD-02, CD-03, CD-04, CD-05, CD-06, CD-07 | **Resolvidos** |
| CD-10 | Resolvido na máquina; exclusão da branch remota pendente do push |
| CD-08 | Respondido (Redis KV); migração a Postgres é decisão de agenda |
| CD-09 | Aberto — decisão dos sócios (comissão congelada no `Trade`) |

---

*Fim da entrada 002. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

# Entrada 003 — 02/09/2026 — EXECUÇÃO DA FRENTE C (MERCADO PAGO E CORREIOS)

```
Leitura:        local, na branch feat/pagamentos-correios
Commit base:    dd38a74 "Organiza as tres frentes paralelas com contrato de propriedade e prompts"
Branch:         feat/pagamentos-correios
Módulos:        M5 (Mercado Pago / Webhooks / Idempotência) e M6 (Correios / PAC e SEDEX / Rastreio)
Autor:          gabrielsilva-aureacustodia (Antigravity / Agente C)
```

## O que entrou

1. **Módulo `src/lib/payments/`**:
   - `types.ts`: Contrato de tipos com `Cents` estritamente inteiro, métodos Pix, Checkout Pro e estruturas de webhook.
   - `mercadopago.ts`: Cliente `server-only` para criação de preferências de depósito e cobranças Pix instantâneas (QR Code base64 + Copia e Cola), com fallback determinístico para desenvolvimento/testes.
   - `webhook.ts`: Validação de assinatura HMAC-SHA256 (`x-signature` + `x-request-id`) com proteção contra ataques de timing e replay (janela de timestamp).
   - `idempotencia.ts`: Controle obrigatório de idempotência com chave única por evento e TTL de 24h, garantindo que reenvios de webhook não executem crédito duplicado (**RA-07 pago**).
   - `README.md` e `ATALHOS.md`: Documentação de arquitetura e notas de risco.

2. **Módulo `src/lib/shipping/`**:
   - `types.ts`: Tipo estrito `ModalidadeEnvio = 'PAC' | 'SEDEX'`, proibição total de Carta Comum e constante obrigatória `DESCRICAO_CONTEUDO_PADRAO = 'Moeda comemorativa / colecionável'`.
   - `correios.ts`: Cálculo de frete PAC e SEDEX com seguro ad valorem e declaração de valor, emissão de pré-postagens e etiquetas, com validação e recusa em tempo de execução de modalidades não autorizadas.
   - `tracking.ts`: Rastreamento SRO em lote preparado para rotinas agendadas (Cron) com cache local.
   - `cep.ts`: Consulta de CEP em conformidade com a LGPD (zero retenção de histórico de busca em banco de dados).
   - `README.md` e `ATALHOS.md`: Documentação de arquitetura e restrições postais.

3. **Rotas de API (`src/app/api/`)**:
   - `src/app/api/webhooks/mercadopago/route.ts`: Endpoint receptor com validação HMAC, verificação de idempotência (retorno 200 com status `already_processed` para reenvios) e resposta imediata.
   - `src/app/api/cron/shipping/route.ts`: Endpoint protegido por `CRON_SECRET` para atualização de rastreamento em lote.

4. **Testes Automatizados (Vitest)**:
   - 29 novos testes unitários e de integração com mocks (`mercadopago.test.ts`, `webhook.test.ts`, `idempotencia.test.ts`, `correios.test.ts`, `tracking.test.ts`, `cep.test.ts`, `route.test.ts`).
   - Suíte completa subiu de 38 para **67 testes passando 100%**.

## Verificação e Qualidade

- `npm test`: 11 arquivos e 67 testes verdes.
- `npm run typecheck`: `tsc --noEmit` limpo com zero erros.
- `npm run lint`: ESLint com zero erros e zero avisos.
- `npm run build`: Next.js 15 compilado com sucesso gerando todas as 21 rotas estáticas e dinâmicas.

---

*Fim da entrada 003. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*
