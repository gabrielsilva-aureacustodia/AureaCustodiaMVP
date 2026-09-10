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


---

# Entrada 003 — 02/09/2026 · Frente B: o estado sai do blob e vira tabelas (M1)

```
Branch:  feat/banco-supabase · base main dd38a74
Sessão:  agente da frente B, em worktree separado (C:\dev\AureaCustodiaMVP-banco)
Estado:  typecheck ✅ · lint ✅ · 67 testes ✅ (1 pulado) · build ✅
Handoff: docs/HANDOFF_FRENTE_B_BANCO.md
```

## O que entrou

- `src/server/db/` — migration com 10 tabelas no schema `aurea` (RLS em todas), cliente
  `pg`, repositórios por tabela, planejador de diff puro, `lerEstado`/`mutarEstado`.
- `src/server/state.ts` — `getState()`/`mutateState()` com a **assinatura preservada**, usando
  tabelas quando há `POSTGRES_URL` e o `store/` antigo quando não há.
- `Trade.fee?` em `src/domain/types.ts` — comissão congelada (metade do RA-06).
- `npm run db:migrate` (`scripts/db-migrate.mjs`).
- **29 testes novos**, 13 deles contra um Postgres real embutido (PGlite). Primeira cobertura
  automatizada de `src/server/` — o RA-04 começa a ser pago.

## O que NÃO entrou, de propósito

- `matchOrders` continua o mesmo arquivo com os mesmos 38 testes. Não foi traduzido para SQL.
- As Server Actions não mudaram uma linha — o contrato das frentes funcionou.
- `src/server/store/` fica até a produção rodar sobre tabelas (RA-13.e).

## Achados

1. **H-03 — a senha do Supabase está no histórico público.** O commit `0a7d517` gravou
   `docs/PROXIMOS_PASSOS_SUPABASE.md` com a senha rotacionada em texto puro e foi para o
   `origin`. Removida do arquivo atual; **RA-12 subiu para 🔴**; a rotação é do Gabriel.
2. **H-04 — dois agentes na mesma pasta.** A frente A estava editando `auth.ts`, `session.ts`
   e `LoginForm.tsx` no mesmo diretório em que esta sessão começou. Resolvido com
   `git worktree`; recomendação registrada no handoff: um worktree por frente.
3. **H-05 — a primeira leitura de um banco vazio devolvia `Trade` sem `fee`** e a segunda
   com. Achado pelo teste de ida e volta; corrigido em `estado.ts` (`congelarComissoes`).
4. **`.env.local` com senha antiga** — a conexão local ao Supabase falhou com autenticação.
   O agente não aplicou a senha documentada (bloqueio de permissão, correto); fica com o
   Gabriel, junto com a rotação.

## Análise crítica

- O maior ganho é estrutural: **concorrência resolvida por construção** (`FOR UPDATE` em
  `seq`) e o histórico append-only garantido pelo planejador, não por disciplina.
- O maior risco residual é o **RA-13.d**: nada foi verificado contra o Supabase real nesta
  sessão. A suíte tem um modo `AUREA_DB_TEST_URL` que roda o mesmo conjunto contra o banco
  de verdade; é um comando do Gabriel.
- A fila única de escrita (RA-13.a) é a mesma garantia de antes, e é aceitável com sete
  sócios. Não confundir com "resolvido para sempre".

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| CD-08 (Postgres em produção) | Código pronto; **depende da variável na Vercel e da migration** |
| CD-09 (comissão congelada) | Metade paga: coluna e campo existem; extrato ainda recalcula — decisão dos sócios |
| RA-04 | Parcialmente pago (`db/` testado; `actions/` e `session.ts` não) |
| RA-08 | Pago por construção com `POSTGRES_URL` |
| RA-12 | **🔴 agravado** — rotação pendente |
| RA-13 (novo) | Cinco atalhos registrados, cada um com pagamento descrito |

---

*Fim da entrada 003. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

---

# Entrada 004 — 02/09/2026 e 03/09/2026 — EXECUÇÃO DA FRENTE C (MERCADO PAGO E CORREIOS)

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
   - `idempotencia.ts`: Controle obrigatório de idempotência com chave única por evento e TTL de 24h, garantindo que reenvios de webhook não executem crédito duplicado (**RA-07 / RA-14.a**).
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
   - 31 testes unitários e de integração com mocks (`mercadopago.test.ts`, `webhook.test.ts`, `idempotencia.test.ts`, `correios.test.ts`, `tracking.test.ts`, `cep.test.ts`, `route.test.ts`).
   - Suíte completa subiu de 38 para **69 testes passando 100%**.

## Correções de 03/09 (Sessão C-2)

- **Idempotência desacoplada (RA-14.a):** Interface `RepositorioIdempotencia` criada com adaptador `RepositorioIdempotenciaMemoria` e ponto de extensão pronto para a tabela `aurea.payment_events` do Postgres na C-3.
- **Evento sem ID responde 400:** `processarPayloadWebhook` não gera chaves artificiais; payloads anômalos ou sem identificador de evento (`{}`) recebem HTTP 400 imediatamente.
- **Assinatura HMAC obrigatória:** Validação ativada em todos os ambientes (`validarAssinaturaWebhookMercadoPago`), normalização de `dataId` em minúsculas conforme especificação do MP, e testes com HMAC real e caso de rejeição 401 para assinatura adulterada.
- **Registro de dívidas:** Registro de RA-14.a até RA-14.e adicionado a `RISCOS_ASSUMIDOS.md`, `.env.example` atualizado com todas as novas variáveis, e referências ajustadas.

## Verificação e Qualidade

- `npm test`: 11 arquivos e 69 testes verdes.
- `npm run typecheck`: `tsc --noEmit` limpo com zero erros.
- `npm run lint`: ESLint com zero erros e zero avisos.
- `npm run build`: Next.js 15 compilado com sucesso gerando todas as 21 rotas estáticas e dinâmicas.

---

*Fim da entrada 004. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

---

# Entrada 005 — 03/09/2026 · Frente B (2ª sessão): a branch sai do disco e a virada ganha roteiro

```
Branch:  feat/banco-supabase — PUBLICADA em origin nesta sessão
Base:    main dd38a74 · commits 119aff8 (M1) + o desta entrada
Estado:  typecheck ✅ · lint ✅ · 69 testes ✅ (1 pulado) · build ✅
Banco:   ❌ nada rodou contra o Supabase — senha do .env.local segue recusada

Nota de numeração: a entrada 004 fica reservada para a frente C, que renumera a
sua (hoje também marcada como 003) nesta faixa. Esta entrada pula para 005 para
não criar uma segunda colisão.
```

## O que entrou

- **A branch foi publicada.** Até hoje a fundação das outras duas frentes existia num
  único disco. `git push -u origin feat/banco-supabase` resolveu o risco mais barato de
  todos.
- **`npm run db:check`** (`scripts/db-check.mjs`): diagnóstico somente leitura que responde,
  num comando, se o cutover pode acontecer — senha, migration, tabelas, RLS, tabela em
  `public` e se o blob antigo ainda existe. Sai com código 1 quando falta algo.
- **`scripts/env-local.mjs`**: acha o `.env.local` mesmo rodando num git worktree.
- **`docs/CUTOVER_BANCO_PRODUCAO.md`**: o roteiro da virada, com a ordem obrigatória e a
  tabela de sintomas.
- **`docs/prompts/AGENTE_B2_POS_PRODUCAO.md`**: o prompt do passo 9, com a lista de
  pré-condições que precisam estar verdadeiras antes de remover o caminho de volta.
- `engines.node` para `>=20.12`, exigido por `process.loadEnvFile`.

## Achados

1. **H-06 — `npm run db:migrate` não funcionaria no worktree.** O `.env.local` é ignorado
   pelo Git e não viaja entre worktrees; o comando procurava só na pasta em que rodava e
   morria dizendo que a variável não estava definida, quando ela estava viva um diretório
   ao lado. **Era o próximo comando que o Gabriel ia rodar.** Corrigido: procura nos dois
   lugares e imprime qual arquivo usou.
2. **H-07 — a documentação chamava `src/server/store/` de "rede de segurança", e não é.**
   Com `POSTGRES_URL` definida o adaptador de blob nunca é selecionado; remover a variável
   manda a aplicação para Redis ou memória, não para o blob. O rollback correto é o Instant
   Rollback da Vercel para o build anterior. Corrigido em três documentos e no RA-13.
3. **H-08 — o comando de conferência não era conferido.** `db:check` decide se a virada
   acontece, e um erro de digitação na SQL dele só apareceria no cutover. A função
   `diagnosticar` passou a ser exportada e é exercitada pela suíte contra o Postgres
   embutido nos dois cenários — banco pronto e banco sem migration.
4. **A conexão continua recusando a senha**, confirmado hoje pelo próprio `db:check`.

## Análise crítica

- **O que esta sessão fez foi diminuir a distância entre "o código está pronto" e "a
  produção está de pé".** Nenhuma linha do motor mudou; o que mudou foi a chance de o
  próximo comando do Gabriel falhar por um motivo que não tem nada a ver com o trabalho.
- **O RA-13.d continua sendo o maior risco residual, e ele não se resolve escrevendo.** O
  critério "duas compras simultâneas" segue provado apenas contra um Postgres de uma
  conexão só. A prova custa um comando e depende da senha.
- A tentação nesta sessão era começar a Fase 2 (remover o `store/`). Seria erro: enquanto a
  produção não rodar sobre tabelas, o caminho antigo é o único deploy que funciona.

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| Branch B publicada | ✅ `origin/feat/banco-supabase` |
| RA-12 (senha no histórico público) | 🔴 aberto — rotação é do Gabriel |
| RA-13.d (nada verificado contra o Supabase) | 🟠 aberto — depende da senha |
| RA-13.e (`store/` no repositório) | 🟡 aberto — sai só depois da virada |
| Cutover de produção | ⏳ roteiro pronto, execução com o Gabriel |
| CD-09 (extrato ler `t.fee`) | ⏳ decisão dos sócios |

---

*Fim da entrada 005. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

---

# Entrada 006 — 03/09/2026, madrugada · Frente B: ledger, auditoria, DRE e relatórios (M4 + M7)

```
Branch:   main (trabalho direto no diretório principal, em paralelo com a frente C)
Estado:   typecheck, lint e testes verdes nos arquivos desta frente · build depende de um
          arquivo da frente C em andamento (src/server/payments/conciliacao-ledger.ts)
Relatório: docs/EXECUCAO_AGENTE_B_LEDGER_DRE.md
```

## O que entrou

- **Migration 003** (`ledger_entries`, `audit_log`, `parametros_contabeis`, `contas_contabeis`,
  `lancamentos_manuais`, `exportacoes`), todas em `aurea`, RLS, append-only onde importa.
  `TABELAS_ESPERADAS` do `db:check`: 13 → **19**.
- **Domínio puro:** `hash.ts` (SHA-256 FIPS 180-4, fórmula congelada), `ledger.ts`
  (derivação, encadeamento, verificação), `dre.ts` (Lucro Presumido, parâmetros nulos por
  padrão, plano de contas, análise). 22 testes novos.
- **O ledger é derivado do diff dentro de `mutarEstado`** (`derivar.ts`): negociação →
  compra/venda/comissão; depósito; conta nova → saldo_inicial; custódia com sinal zero; o
  resto → `ajuste` visível. Na mesma transação, atrás da mesma trava, com `ultimoHash`. A
  semeadura ganha ledger completo com aberturas calculadas para fechar no saldo do seed.
- **Ator na auditoria** sem mudar a assinatura de `mutateState`: `state.ts` lê a sessão e
  cai em `sistema` fora de requisição.
- **`src/server/relatorios/`:** doze relatórios como tabelas, CSV/XLSX no servidor, push
  para o Google Sheets por conta de serviço (JWT RS256 sem SDK), sincronização registrada.
- **`/api/relatorios/*`** (índice, `<nome>[.csv|.xlsx]`, `tudo.xlsx`, POST `sheets`) com
  sessão de admin ou `AUREA_RELATORIOS_TOKEN`.
- **`/relatorios`** (Server Component com guarda de admin) + `RelatoriosPainel` (oito abas),
  item no menu, `admin` no `AppProvider`.
- **Docs:** `API_RELATORIOS.md`, `INTEGRACAO_GOOGLE_SHEETS.md`, `EXECUCAO_AGENTE_B_LEDGER_DRE.md`,
  READMEs de todas as pastas tocadas, RA-16 e ATALHOS em quatro pastas.

## Achados

1. **A suíte já tinha dois testes vermelhos antes desta sessão**, em arquivos que a frente C
   estava criando no mesmo diretório (`api/admin/conciliacao`, `api/envios/etiqueta`):
   chamam `cookies()` fora de requisição. Não são desta frente e ficaram como estavam.
2. **`npm run typecheck` acusa `src/server/payments/conciliacao-ledger.ts`** (frente C, em
   andamento). Todos os arquivos desta frente passam em typecheck e lint isolados.
3. A ordem "migration antes do merge" agora vale para a **003** com a mesma força da 001:
   sem ela, toda mutação falha ao gravar o lançamento.

## Análise crítica

- A escolha de derivar o ledger do diff, e não das ações, é o que permitiu entregar M4 sem
  tocar na superfície protegida — e é o que garante que o livro fecha por construção. O
  custo é o `ajuste` (RA-16.g): uma ação futura que mexa em saldo por caminho novo não quebra,
  mas deixa uma linha que alguém precisa explicar.
- A DRE sem alíquota é a única forma honesta de falar de imposto enquanto a contradição
  Presumido × Simples é do contador. A tela mostra a pendência, não esconde.
- O maior risco residual continua sendo o cutover (RA-13.d), agora com uma migration a mais.

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| M4 (ledger + auditoria) | ✅ em código, testado no PGlite |
| M7 (DRE + exportação) | ✅ em código; alíquotas pendentes do contador |
| Integração Sheets/Excel | ✅ em código; variáveis pendentes do Gabriel (RA-16.d) |
| Cutover de produção | ⏳ inalterado — seção 4 de `EXECUCAO_FINAL_AGENTE_B.md`, com a 003 |
| CD-09 (extrato ler `t.fee`) | ⏳ decisão dos sócios; ledger e DRE já leem |
| RA-05 (hash do recibo) | 🟠 metade paga: SHA-256 existe, recibo ainda simulado |

---

*Fim da entrada 006. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

# Entrada 007 — Fechamento Gold Standard da Frente C (Pagamentos, Correios, Auditoria e Conciliação)

```
Data:         03/09/2026
Hora:         09:20
Autor:        Agente C (feat/pagamentos-correios / main)
Assunto:      Etiqueta Postal, Cotação de Frete com Seguro, Conciliação Gateway × Ledger e Auditoria
```

## O que foi feito nesta sessão

1. **Rota de Etiqueta e Declaração de Conteúdo Postal (`/api/envios/etiqueta/[protocolo]`):**
   - Criação de rota HTTP com saída em HTML printável e JSON com dados do remetente, dados da Central de Custódia da Áurea na Av. Paulista, modalidade `PAC` ou `SEDEX`, código de barras e declaração de conteúdo obrigatória (*"Moeda comemorativa / colecionável"*).
   - Teste unitário cobrindo autenticação e emissão.

2. **Wizard de Envio Postal com Seleção PAC/SEDEX e Busca de CEP (LGPD):**
   - Seleção explícita de modalidade (`PAC` ou `SEDEX` com seguro).
   - Server Action `consultarCepEnvio` e `cotarFreteEnvio` em `src/server/actions/custody.ts` com cálculo de prazo e estimativa de frete.
   - Botão para impressão direta da etiqueta no Passo 3 do Wizard.

3. **Conciliação Financeira Gateway × Ledger & Auditoria Executiva:**
   - Criação de `src/server/payments/conciliacao-ledger.ts` e endpoint `/api/admin/conciliacao` cruzando saldo em custódia, depósitos aprovados, receitas arrecadadas (taxas de custódia e comissões de corretagem) e integridade 1:1 do lastro.
   - Painel integrado na página `/graficos/auditoria` exibindo em tempo real métricas financeiras da empresa e a esteira de moedas físicas em trânsito e em perícia na Central de Custódia.

4. **Saneamento e Qualidade Total:**
   - Correção defensiva de contexto de sessão em `src/server/session.ts` para testes fora de request scope.
   - Adicionado `listarTodasIntencoes` no repositório de pagamentos.
   - 143 testes passando em 23 suítes Vitest.
   - 0 erros em `npm run typecheck` e 0 erros em `npm run lint`.
   - Build de produção (`next build`) gerando todas as 21 rotas estáticas e dinâmicas com sucesso.

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| Gateway Mercado Pago (Pix/Checkout Pro) | ✅ Concluído com HMAC e idempotência |
| Correios (Etiquetas, PAC/SEDEX, CEP, Cron) | ✅ Concluído e integrado |
| Conciliação Gateway × Ledger | ✅ Concluído com API e painel na auditoria |
| Suíte de Testes | ✅ 143 testes verdes (23 suítes) |
| Build e Tipagem | ✅ 100% verde |

---

# Entrada 008 — 03/09/2026 · Validação de CEP e arquitetura Vercel/HostGator

```
Branch:   main
Escopo:   corrigir a validação encontrada pelo checklist e consolidar a operação de domínio
Estado:   validações executadas no fechamento desta sessão
```

## Achado e correção

- O teste de entrada inválida revelou que `consultarCep('123')` passava pelo fallback como
  CEP válido. A função chamava `normalizarCep` antes de validar; o normalizador completa
  zeros à esquerda e sempre produz oito caracteres.
- `consultarCep` agora conta os dígitos reais da entrada antes da normalização e rejeita
  qualquer valor que não possua exatamente oito dígitos.
- A mudança não persiste CEP, não altera PAC/SEDEX, preço, prazo, seguro, declaração de
  conteúdo nem qualquer número de negócio.

## Decisão operacional documentada

- O site permanece em `aurea-custodia-mvp.vercel.app` durante a configuração inicial.
- A Vercel continuará hospedando o Next.js.
- A HostGator manterá o registro dos domínios, a Zona DNS e as caixas humanas, sem hospedar
  o site.
- O Resend ficará isolado em `auth.aureacustodia.com.br` quando o SMTP transacional for
  ativado, sem substituir os MX das caixas HostGator/Titan.
- O roteiro canônico é `docs/GUIA_VERCEL_HOSTGATOR_EMAIL_E_DOMINIOS.md`.

---

*Fim da entrada 008. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

# Entrada 009 — 06/09/2026 · Fechamento da Branch A (login e landing)

```
Branch:   feat/auth-landing
Base:     main local em 657dd9f
Escopo:   cadastro Supabase, Google OAuth, mocks automáticos e landing pública
```

- A branch foi rebaseada sobre a `main`; o conflito previsto de `LoginForm.tsx` foi
  resolvido preservando o login Supabase.
- Cadastro por e-mail e Google agora provisiona, depois da confirmação, R$ 5.000,00 e seis
  moedas fictícias por `mutateState()`.
- O login ganhou Google OAuth e a troca de senha passou a atualizar o Supabase Auth.
- `/criar-conta`, `/entrar-demo`, `SignupForm.tsx` e `actions/signup.ts` foram removidos;
  o RA-15 foi pago.
- O RA-17 registra a contingência das contas históricas somente para ambientes sem Auth.
- Foram adicionados testes de configuração, callback e idempotência do provisionamento.
- A entrega detalhada vive em `docs/RELATORIO_FINAL_BRANCH_A_LOGIN_LANDING.md`.

---

*Fim da entrada 009. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

# Entrada 010 — 10/09/2026 · Retrato consolidado e abertura da frente E (estação)

```
Branch:   feat/auth-landing (idêntica em conteúdo à main; origin/main tem 6 merges de fork a mais)
Escopo:   ritual de sessão executado, leitura de todas as execuções anteriores e plano
          executivo do software de análise de moedas
Estado:   nenhum código de produção alterado nesta entrada — a sessão produziu documento
```

## Verificação da base

Rodado no início da sessão, antes de qualquer escrita:

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ limpo |
| `npx vitest run` | ✅ 27 arquivos · 161 testes · 1 pulado |
| `npm run build` | ✅ verde, 20 rotas |
| `git status` | limpo |

**Achado de sincronização, sem consequência:** `origin/main` está seis commits à frente da
branch local, e os seis são merges das pull requests 1 a 6 vindas do fork
`gabrielsilva-sintetica`. O `git diff HEAD origin/main` é vazio: as árvores são idênticas.
É o método de publicação via fork funcionando como documentado em
`docs/METODO_PUBLICACAO_VIA_FORK.md`, não divergência a resolver.

## O retrato das cinco frentes, hoje

Releitura de todas as entradas 001 a 009 e dos relatórios de execução por frente:

| Frente | Estado | O que sustenta a leitura |
|---|---|---|
| **A — banco e ledger** | Entregue | Estado em tabelas no Supabase (M1), ledger append-only com hash encadeado, DRE sem alíquota em código, relatórios em `/relatorios` e `/api/relatorios/*` |
| **B — login e landing** | Entregue | Cadastro Supabase, Google OAuth, landing pública, travas de login removidas em 06/09 |
| **C — pagamentos e Correios** | Entregue | Mercado Pago com webhook assinado, conciliação fechada para administradores, rastreio por cron diário |
| **D — logística** | Entregue junto com a C | Etiqueta, CEP validado antes da normalização, painel de envios |
| **E — estação de análise** | **Não começou** | Era a única frente bloqueada por decisão (D7), e é o assunto desta sessão |

Ou seja: quatro das cinco frentes estão de pé, e o que falta para a plataforma fazer sentido
ponta a ponta é justamente a bancada — o ponto onde a moeda física vira ativo digital.

## A decisão desta sessão: destravar a frente E sem esperar o D7

O questionário `docs/referencia/QUESTIONARIO_D7_ESTACAO.md` está sem resposta formal desde
01/09. Em vez de manter a frente parada, o plano executivo adota padrão recomendado para as
cinco decisões e deixa cada uma sobrescrevível.

**Duas das cinco já estavam respondidas pelo código, e ninguém tinha percebido:**

- **D7a (quando o número da moeda é reservado):** já é *depois* do veredito. `nextCoinCode`
  só roda quando `advanceAnalysis` chega em "Recibo emitido". A sequência já nasce sem
  buracos.
- **D7d (como duas estações não pegam o mesmo número):** já é atômico. `mutateState()` roda
  dentro de `SELECT … FOR UPDATE` no adaptador Postgres. A sugestão de criar
  `CREATE SEQUENCE` trocaria uma garantia que funciona por outra equivalente.

Isso reduz o D7 de cinco perguntas para três, e nenhuma das três impede a primeira moeda de
ser analisada.

## Achados técnicos desta leitura

**1. O `tsconfig.json` da raiz vai engolir a pasta da estação.** O `include` é
`["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`. No minuto em que
`estacao/` existir com código de Electron, o `npm run typecheck` da raiz tenta compilá-lo com
a configuração do Next — e o build da Vercel quebra pelo mesmo motivo. O primeiro commit da
frente E precisa acrescentar `"estacao/**"` ao `exclude` e ao `ignores` do
`eslint.config.mjs`, **antes** de qualquer arquivo de Electron entrar. Achado antes de custar
um deploy quebrado.

**2. O hash da estação não precisa de código novo.** `src/domain/hash.ts` já tem SHA-256
encadeado escrito à mão, testado contra os vetores do FIPS 180-4 e contra o `node:crypto`, e
puro justamente para rodar nos dois lados. A frente E acrescenta a lista de campos, não o
algoritmo. Isso muda a estimativa da frente E para baixo.

**3. A autorização máquina-a-máquina também já tem molde.** `src/server/relatorios/acesso.ts`
faz comparação em tempo constante de token via `Authorization: Bearer`. A estação copia esse
padrão em vez de inventar autenticação.

**4. A frente E força `STORE_KEY` de v6 para v7.** Peso, veredito, operador e caminho de
vídeo são campos novos em `AppState`. Pela regra da casa, formato novo sobe a versão em vez
de migrar, e o banco de teste recomeça do seed. Aceito — sete contas de sócios, dado de
demonstração — mas precisa ser avisado antes do deploy, não descoberto depois.

## Análise crítica

O que esta sessão fez de melhor foi **procurar as respostas no código antes de pedi-las ao
Gabriel**. Duas das cinco decisões do D7 estavam implementadas há semanas; mantê-las na fila
de perguntas custava tempo dele para confirmar algo que já era verdade.

O que ficou de fora, de propósito: nenhuma linha de código foi escrita. A frente E toca a
superfície protegida (`types.ts`, `custody.ts`, `STORE_KEY`), e a regra do repositório é
plano aprovado antes de edição que atravessa arquivos.

O que continua desconfortável: as três perguntas abertas do D7 — destino da moeda recusada,
estrutura física do cofre e existência de reanálise — não travam a primeira análise, mas
ficam caras se forem respondidas com duzentas cápsulas já guardadas. Elas estão na seção 9 do
plano executivo, e valem uma conversa curta com o Rogério antes da Fase 2.

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| CD-08 — persistência de produção no Postgres | Aberto (decisão) |
| CD-09 — comissão do extrato recalculada, não congelada | Aberto (decisão dos sócios) |
| D7 — cinco decisões da estação | **Reduzido a três**, e nenhuma bloqueia a Fase 0 |
| Frente E | Plano executivo escrito: `docs/PLANO_EXECUTIVO_ESTACAO.md` |
| Base do repositório | typecheck ✅ · testes ✅ · build ✅ |

---

*Fim da entrada 010. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

# Entrada 011 — 10/09/2026 · A estação de análise sai do papel (frente E)

```
Branch:   feat/auth-landing
Escopo:   as cinco decisões do D7 respondidas, e a bancada construída
Estado:   typecheck ✅ · 192 testes ✅ · build ✅ · ponta a ponta contra o banco de teste ✅
```

## As cinco decisões do D7, fechadas

Gabriel respondeu as três que sobravam. Com as duas que o próprio código já respondia
(entrada 010), o questionário aberto desde 01/09 está encerrado.

| | Decisão |
|---|---|
| **D7a** | O número da moeda é reservado DEPOIS do veredito — já era o que o código fazia |
| **D7b** | Envio inteiro de uma vez; sem aprovação parcial |
| **D7c** | Papel único: quem analisa é quem aprova |
| **D7d** | O contador travado que já existe (`SELECT … FOR UPDATE`) |
| **D7e** | Endereço é a caixa física, digitada pelo operador |

**Moeda recusada é devolvida ao cliente, com frete por conta dele. Não existe reanálise por
enquanto.**

A resposta do D7e veio com uma foto do cofre real, e ela decidiu mais do que a pergunta: as
cápsulas ficam em caixinhas de acrílico rotuladas `Caixa EB 001`. O **EB é Entrega da
Bandeira** — o rótulo já carrega o tipo da moeda. O formato adotado no código é esse mesmo,
e ele cresce sozinho para outros tipos (`DH-001`) sem virar outro esquema.

## O que entrou

**O domínio.**
- `src/domain/analise.ts` — `CAMPOS_DA_ANALISE` (quinze campos, ordem congelada),
  `hashDaAnalise()`, `encadearAnalise()`, `conferirCadeia()` e `nextAnaliseCode()`.
  O algoritmo NÃO é novo: reaproveita `hashEncadeado()` de `hash.ts`, que já era SHA-256
  puro conferido contra os vetores do FIPS 180-4.
- `src/domain/analise.test.ts` — **vetor congelado**: dois hashes escritos à mão em
  hexadecimal, conferidos contra o `node:crypto`, não contra o próprio código sob teste.
- `types.ts` ganhou `Analise`, `VereditoAnalise`, `AppState.analises` e `Seq.analise`.

**A persistência.** Migration 004, tabela `aurea.analises` (append-only, com RLS),
repositório próprio, e o diff planejando `analise.inserir` pelo mesmo caminho de `trades` e
`deposits`.

**O servidor.** `src/server/estacao/` com acesso por token em tempo constante, a fila, a
abertura e o fechamento. Cinco rotas em `/api/estacao/*`.

**A bancada.** `estacao/` — Electron em JavaScript puro, sem etapa de build, empacotado como
`.exe` portátil. Câmera, gravação em disco, peso, veredito, fila offline.

## Três decisões da execução que divergiram do plano — e por quê

**1. A `STORE_KEY` NÃO subiu para v7, e o banco de teste não foi apagado.** O plano previa
isso e avisava que o acervo de demonstração se perderia. Na hora ficou claro que a regra não
se aplicava: subir a versão existe para mudança que deixa **registro velho preso** — foi o
caso da v6 com `tipoMoeda`, em que uma ordem antiga ficava no livro sem nunca casar.
Acrescentar uma lista vazia não é esse caso. `garantirFormato()` preenche `analises: []`
quando falta, a migration é inteiramente aditiva, e nenhum registro antigo fica inválido.
Aplicar a regra literalmente teria custado o acervo dos sete sócios sem ganho nenhum.

**2. `advanceAnalysis` não foi tocada.** Ela continua servindo à demonstração pela tela, com
`genHash()`. A estação é um caminho novo e paralelo que escreve o mesmo estado pela mesma
transação. Assim o RA-05 é pago onde importa — na moeda que existe de verdade — sem mexer em
Server Action que já funciona.

**3. O valor de entrada da moeda da bancada não é sorteado.** `advanceAnalysis` sorteia
dentro da faixa de referência quando não há mercado, e ali isso é aceitável porque a tela é
demonstração. A moeda da bancada existe de verdade: ela nasce com a mediana do tipo ou, sem
mercado, com o **meio** da faixa. Valor sorteado num recibo de custódia é um número que
ninguém consegue explicar ao cliente que perguntar de onde veio.

## Achados

**A armadilha do `tsconfig` era real e foi paga antes de custar.** O `include` da raiz é
`**/*.ts`. `"estacao"` entrou no `exclude` e `'estacao/**'` no `ignores` do ESLint **no
primeiro commit da frente**, antes de qualquer arquivo de Electron existir.

**A migration 004 precisou ser aplicada à mão no Supabase.** A rota da fila devolveu 500 até
`npm run db:migrate` rodar. Vale para o deploy: **aplicar a migration antes de publicar**.
Ela é aditiva, então rodar antes do deploy é seguro — o código antigo simplesmente não
enxerga a tabela nova.

**Duas coisas foram desenhadas hoje para não custar caro depois.** O campo `aprovador` já
está na fórmula do hash, repetindo o `operador` — quando a segregação de função chegar, a
fórmula não muda e nenhum recibo emitido é invalidado. E o `validadoEm` sai do relógio do
servidor: **não existe campo de horário na entrada da rota**, e é essa ausência que garante
que o hash não dependa do relógio do notebook.

## O que foi verificado de verdade

Contra o banco de teste real, com o servidor local:

- 401 sem chave, 401 com chave errada, 200 com a certa, 503 quando falta a variável
- A fila devolveu o envio com o nome do cliente
- Abrir duas vezes seguidas: idempotente, sem erro
- Peso digitado em gramas (27 em vez de 27000): 400 apontando o campo e sugerindo a causa
- Quantidade diferente da do envio: 422
- Fechar com 1 aprovada e 1 recusada: moeda criada com `nft.hash` igual ao hash da análise,
  recusada sem moeda e com motivo gravado, corrente encadeada do GENESIS
- Fechar de novo: 409, sem emitir moeda duas vezes

O dado de teste foi removido do banco ao fim, com as posições do inventário e a cobrança de
custódia restauradas.

## Atalhos registrados

RA-20 (executável sem assinatura), RA-21 (papel único), RA-22 (endereço digitado) e RA-23
(vídeo não obrigatório) entraram em `RISCOS_ASSUMIDOS.md` e em `estacao/ATALHOS.md`.

O RA-23 é o que merece leitura: vídeo obrigatório significaria que uma câmera com cabo solto
ou uma internet caída **impedem a moeda de ser analisada** — com a moeda já fora da cápsula,
na mesa. A gravação é prova; a análise é operação. Travar a operação na prova inverte a
prioridade. No lugar da trava, o campo entra no hash, e a ausência do vídeo fica permanente
e visível.

## Análise crítica

O que ficou bom: o hash não foi reimplementado. A estação não calcula hash nenhum — quem
calcula é o servidor, com o relógio dele. Isso elimina por construção a classe de bug mais
provável desta frente, que seria duas implementações divergirem em algum detalhe de
normalização.

O que ficou pela metade, de propósito: o upload do vídeo tem código pronto e testado no
caminho de erro (503 quando falta configuração), mas nunca subiu um arquivo — falta criar o
balde e cadastrar `SUPABASE_SERVICE_ROLE_KEY`. É dependência externa, não código.

O que continua desconfortável: nenhuma moeda foi analisada com hardware real. Câmera com
anel de foco manual, microscópio e balança ainda não foram comprados. A primeira análise de
verdade vai revelar coisas de ergonomia de bancada que nenhuma leitura de código revela.

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| D7 — as cinco decisões da estação | **Fechado** em 10/09/2026 |
| RA-05 — hash do recibo simulado | **Pago para moeda da bancada**; moeda do seed continua simulada, e é honesto que continue |
| Frente E | Fases 0, 1, 2 e 4 entregues. Fase 3 espera o balde do Supabase |
| CD-08 — persistência de produção no Postgres | Aberto (decisão) |
| CD-09 — comissão do extrato recalculada | Aberto (decisão dos sócios) |
| Base do repositório | typecheck ✅ · 192 testes ✅ · build ✅ |

---

*Fim da entrada 011. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*

# Entrada 012 — 10/09/2026, tarde · A bancada rodando de verdade, e o que o teste revelou

```
Branch:   feat/auth-landing
Escopo:   testar o executável com hardware real e corrigir o que aparecesse
Estado:   typecheck ✅ · lint ✅ · 192 testes ✅ · executável validado com a webcam USB
```

## O que esta entrada acrescenta à 011

A entrada 011 registrou a construção. Esta registra o **teste com máquina e câmera de
verdade** — e ele encontrou seis defeitos que a leitura de código não encontraria. Cinco
deles teriam aparecido na primeira análise da bancada.

O método importa: a tela foi dirigida por **protocolo de depuração do Chromium**, avaliando
JavaScript dentro do programa empacotado. Foi assim que se descobriu que meu próprio teste
estava errado — ele conferia `el.hidden`, o atributo, quando o que importa é o que a tela
mostra.

## Os seis defeitos

**1. A janela de configuração ficava presa na tela.** `.modal { display: flex }` vence o
`[hidden]` do navegador. O atributo estava correto e a janela aparecia mesmo assim, tapando
o programa inteiro. **Quem descobriu foi o Gabriel, mandando um print** — nenhum teste
automático pegaria, porque todos liam o atributo. Corrigido com `[hidden] { display: none
!important }` no topo do CSS.

**2. `MediaRecorder.start()` recusando fluxo sem áudio.**
`isTypeSupported('video/webm')` devolve `true` e o `start()` lança `NotSupportedError` mesmo
assim: o formato genérico deixa o Chromium escolher um contêiner que espera trilha de áudio,
e a bancada grava só imagem. **E falhava em silêncio** — o botão não mudava e nenhuma
mensagem aparecia, o que faria o operador conduzir a análise inteira achando que gravava.

**3. `deviceId: { exact }` com id velho.** O identificador de uma câmera não é estável: muda
ao reconectar a webcam noutra porta USB e entre sessões. A mensagem na tela era "confira se
o cabo USB está conectado", com o cabo conectado.

**4. `input[type=number]` descartando a vírgula.** O operador digita `27,05`, como o display
da balança mostra, e o Chromium devolve string vazia. O programa acusava "digite o peso" para
quem tinha acabado de digitar.

**5. O travamento da pilha de captura do Windows — o mais grave.** Com a webcam USB
conectada, `enumerateDevices()` e `getUserMedia()` **travavam**: mais de vinte segundos sem
responder, e o travamento **sobrevivia a reiniciar o programa**. A lista de câmeras ficava
vazia e nada acusava erro. A causa é o **MediaFoundation**, a pilha moderna e padrão do
Chromium, com o driver de câmera desta máquina. Forçando o **DirectShow**, a mesma máquina
enumerou as três câmeras em **747 ms** e gravou de todas.

**6. Vídeo em 640x480.** Sem pedir resolução, o Chromium entrega o mínimo — pouco para
enxergar relevo de moeda. Passou a pedir `ideal: 1920x1080`: a USB da bancada entrega 1080p,
a do notebook entrega 720p.

## O que foi verificado funcionando

Contra o banco real, com servidor local, dirigindo a tela por protocolo:

- Conectou, fila com o nome do cliente, procedimento abriu, fase avançou no site
- **Gravou pela webcam USB `KE-WB1080P2` em 1920x1080**, VP9, arquivo de 974 KB com
  assinatura WebM válida no disco
- Peso `27,05` virou 27050 mg; uma moeda aprovada em `EB-001` posição 7, outra recusada com
  motivo
- Fechou: moeda criada com o hash da análise no recibo, recusada sem moeda, corrente
  encadeada do GENESIS
- **Fila offline:** com o site apontado para uma porta morta, a análise foi para o disco e a
  tela disse "sobe sozinha quando a internet voltar"; ao religar, subiu e o contador zerou

## Achados de infraestrutura

**O balde `analises` foi criado pelo Gabriel e está privado** (`public = false`), sem limite
de tamanho nem restrição de tipo. Conferido no banco.

**A tentativa de criar o balde por SQL foi bloqueada** pelo classificador de segurança da
ferramenta. Não foi contornada; em vez disso o comando pronto foi entregue ao Gabriel, que o
executou. Fica como precedente: quando uma ação minha é bloqueada, a saída é entregar o
comando, não procurar outro caminho.

**A frente E não está publicada.** `origin/main` não tem nenhum arquivo de `estacao/` nem de
`api/estacao/`, e `https://aurea-custodia-mvp.vercel.app/api/estacao` responde 404. É o que
impede mandar o executável aos sócios hoje: eles abririam e veriam "Sem conexão".

## Análise crítica

O que ficou bom: **nenhum destes seis apareceria numa revisão de código**. Cinco só
aparecem executando, e um só apareceu porque um humano olhou a tela. Vale como método para
as próximas frentes com interface — dirigir o programa de verdade, e conferir o que a tela
mostra, não o que o estado diz.

O que ficou desconfortável: o defeito 5 é de ambiente, não de código. Forçar o DirectShow
resolve nesta máquina e pode não ser o certo numa futura com câmera que só fale
MediaFoundation. O escape existe (`"capturaModerna": true` no `estacao.json`), mas é o tipo
de decisão que se descobre errada só no dia.

O que continua pendente: o upload do vídeo nunca subiu um arquivo de verdade — falta a
`SUPABASE_SERVICE_ROLE_KEY`, que só o Gabriel obtém. O caminho de erro está testado; o de
sucesso, não.

## Estado dos itens ao fim desta entrada

| Item | Estado |
|---|---|
| Frente E — programa da bancada | Funcionando, validado com câmera real |
| Frente E — publicação | **Não publicada**: rotas dão 404 em produção |
| Upload de vídeo | Código pronto; falta a chave de serviço |
| RA-20 a RA-23 | Registrados |
| Base do repositório | typecheck ✅ · lint ✅ · 192 testes ✅ |

---

*Fim da entrada 012. A próxima entrada será acrescentada abaixo desta linha, sem alterar
nada acima.*
