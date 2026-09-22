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

**A chave do estado é versionada** (`STORE_KEY`, hoje `aurea-market-v6`). Mudança no
formato de `AppState` sobe a versão em vez de migrar: o banco de teste recomeça do
seed, e isso é aceito porque o dado é de demonstração. A v6 nasceu do mercado
multi-ativo — `SellOffer`, `BuyOrder` e `Trade` passaram a ter `tipoMoeda`, e um
registro da v5 sem esse campo ficaria preso no livro sem nunca casar.

**Com `POSTGRES_URL`, toda mutação também grava o ledger e a trilha de auditoria** na mesma
transação (`src/server/db/derivar.ts`, migration 003): lançamentos append-only com hash
SHA-256 encadeado (`src/domain/hash.ts`, `ledger.ts`). Saldo que mudar sem negociação,
depósito ou conta nova vira um lançamento `ajuste` visível — nunca some. A DRE
(`src/domain/dre.ts`) lê a receita desses lançamentos e **não tem alíquota nenhuma em
código**: os percentuais vêm de `aurea.parametros_contabeis`, preenchida pelo contador. Os
relatórios saem por `/relatorios` (só administradores) e por `/api/relatorios/*` —
contrato em `docs/API_RELATORIOS.md`, integração com Sheets/Excel em
`docs/INTEGRACAO_GOOGLE_SHEETS.md`.

**O painel administrativo vive em `/admin`** (route group `src/app/(admin)/`, frente C), com
layout, provider e CSS próprios — não carrega o `AppState` do cliente — e a mesma sessão do app,
sem segundo login. **O link da equipe é `/painel`** (`src/app/painel/`): sem sessão ou com conta fora
da equipe, `/admin/*` manda para lá, e nunca para `/entrar` ou `/inicio` — foi assim que o painel
publicado pareceu não existir em 14/09/2026 (RA-48). Quem pode o quê são papéis e permissões no banco (migration 020; catálogo em
`src/domain/admin/permissoes.ts`, upsertado pelo código): o menu esconde, mas **a página e cada
Server Action de `src/server/actions/admin/` conferem a permissão por conta própria**, e toda ação
do painel grava `admin.<area>.<verbo>` em `audit_log`. Quem está em `AUREA_ADMIN_EMAILS` (ou, sem
ela, nas contas do seed) e a tabela de membros não conhece entra como `dev` — nada tranca a equipe
para fora (RA-40). `/relatorios` redireciona para a Central de Resultados
(`/admin/resultados/*`), e as rotas `/api/relatorios/*` continuam no mesmo endereço. O atendimento
por WhatsApp (`/admin/cs`) fala com o provedor pela interface de `src/lib/mensageria/` — sem as
variáveis da Evolution, as respostas ficam registradas só no painel —, e as ações da ficha do
usuário (`/admin/usuarios/[email]`) não fazem conta própria: ajuste de saldo é o lançamento `ajuste`
que o ledger já deriva, e login, senha e bloqueio passam pelo Supabase Auth com a chave de serviço,
só no servidor. A bancada web (`/admin/bancada`) fecha a análise **pelo mesmo serviço da estação**
(`src/server/estacao/analise.ts`) — a fórmula do hash não muda —, e `/admin/configuracao` edita
taxas, catálogo e parâmetros que o site inteiro passa a ler (seção abaixo). O mapa das rotas e
permissões está em `src/app/(admin)/README.md`; o desenho, em `docs/PLANO_EXECUCAO_ADMIN.md`.

**Persistência é plugável** (`src/server/store/`) e escolhida por variável de ambiente,
nesta ordem: Postgres (`POSTGRES_URL`/`DATABASE_URL`) → Redis (`KV_REST_API_*` ou
`UPSTASH_REDIS_REST_*`) → memória. Só o Postgres resolve concorrência de verdade
(`SELECT … FOR UPDATE`). Em serverless sem banco externo o estado se recria a cada
cold start.

## Regras de negócio e os valores padrão combinados com os sócios

- Comissão de negociação: **0,5% + R$ 1,00 por moeda**, cobrada de **ambos os lados**
  (comprador e vendedor) (`TAXAS_PADRAO` em `src/domain/fees.ts`, com `FEE_PCT` e `FEE_FIXED`
  derivados em `constants.ts`). Em uma negociação de R$ 200,00: o comprador paga R$ 202,00, o
  vendedor recebe R$ 198,00 e a Áurea retém R$ 4,00.
- Custódia: **um plano só, mensal**, R$ 2,00 por moeda por mês
  (`custodiaMensalPorMoeda: 200`), sem prazo mínimo e sem parcelamento — decisão dos sócios de
  21/09/2026, que substituiu a de horas antes. O **ciclo mensal** (`origem: 'ciclo_mensal'`) cobra
  o mesmo preço de quem guarda moeda sem plano vigente. No cartão a cobrança é **recorrente**
  (Preapproval do Mercado Pago, `PlanoCustodia.assinaturaId`), renovada todo mês sem o cliente
  voltar à tela; zerado o acervo, a assinatura é cancelada.
  **Histórico, porque a regra mudou quatro vezes em quatro dias e o código guarda cicatrizes:**
  existiram o plano de 24 meses (aposentado em 20/09), o anual de R$ 24,00 e um mensal de R$ 3,00
  (ambos em 21/09), e a transferência proporcional da custódia na venda — em que o comprador
  herdava os meses restantes. **Nada disso vale mais.** Quem compra moeda em custódia simplesmente
  paga o próximo mês, como qualquer outra moeda que guarde. `ModalidadePlanoCustodia` ainda aceita
  `'anual'` no union por causa de linhas antigas no banco; nenhum caminho de código cria uma.
  A antiga tabela anual de faixas (R$ 5/15/25/30/60) foi aposentada.
- Casamento de ordens por **prioridade preço-tempo**, uma unidade por volta,
  **dentro de cada tipo de moeda** (um livro de ordens por ativo — bid de um tipo
  nunca casa com oferta de outro).
- **Mediana de 24h** como valor estimado do recibo, calculada **por tipo**.
- São negociáveis **"Entrega da Bandeira Olímpica"** e **"Direitos Humanos"**
  (decisão dos sócios, agosto/2026). Quem responde "este tipo pode ir ao
  mercado?" é `isNegociavel(tipo, catalogo)` em `src/domain/constants.ts`, com o
  catálogo vigente de `aurea.tipos_moeda` — nunca uma comparação com `COIN.name`, que
  era o atalho válido enquanto havia um ativo só.
- **Dinheiro sempre em centavos inteiros** (`Cents`). Nunca `float` para valor monetário.
- **Depósito em conta é simulado** e limitado a `DEPOSITO_MAX` (R$ 100.000 por
  operação). Não há Pix, cartão nem conciliação — a tela precisa dizer isso.

Esses números são o **padrão** e vivem em `src/domain/constants.ts` e `src/domain/fees.ts`
(`TAXAS_PADRAO`, `COIN_TYPES`, `DEPOSITO_MAX`). Desde a C3 (migration 024), **a equipe os edita em
`/admin/configuracao`** — taxas, catálogo de tipos (inclusive quem é negociável), limite de
depósito, prazos e canais de atendimento —, e o servidor lê o vigente por `src/server/config/`:
linha gravada no banco sobrepõe o padrão, e sem linha vale o código. Toda mudança fica em
`aurea.config_historico` e publica versão nova da Tabela de Taxas ou dos Termos. Mudar um valor
pela tela é a funcionalidade pedida, não alteração da superfície protegida; mudar o **padrão no
código** ou a regra de casamento continua sendo mudança de produto.

## Restrições de marca, jurídico e regulatório

- **A marca do site é Real Olímpico** (decisão de 20/09/2026, enquanto corre o registro
  formal das marcas). Todo texto de interface, título de página, e-mail e material
  público diz **Real Olímpico** — e a concordância é **masculina** ("o Real Olímpico",
  "do Real Olímpico"), ao contrário da "Áurea Custódia", que era feminina. A **razão
  social continua AUREA CUSTODIA LTDA** e é ela que aparece onde há CNPJ, contrato,
  objeto postal e descritor de fatura de cartão: trocar esses pela marca faz o pacote
  ser recusado na agência e a cobrança não bater com o cadastro do adquirente.
  Identificadores internos **não** mudam — o schema `aurea.*` do Postgres, as variáveis
  `AUREA_*`, a `STORE_KEY` e os e-mails de semente `@testeaurea.com.br`.
- **Logos:** usar exclusivamente os arquivos de `/brand/`. `logo-aurea.webp` é a marca
  antiga, mantida só como histórico. `logo-real-olimpico.webp` é a **prancha de
  identidade inteira** (painel principal mais seis variações em miniatura) e não serve
  para a interface — dentro de um box de 72px vira borrão. A interface usa os dois
  recortes do painel principal dessa prancha: **`logo-real-olimpico-marca.webp`**
  (emblema + letreiro, 234x216, para o logo isolado) e
  **`logo-real-olimpico-emblema.webp`** (só o medalhão, quadrado, para quando o nome já
  está escrito ao lado). Constantes em `src/domain/constants.ts`.
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

- **Senhas em texto puro.** Some com a migração para Supabase Auth (módulo M2). O
  repositório está **público de propósito** durante o desenvolvimento, para facilitar
  leitura por agentes diversos — decisão do Gabriel, reversível. Ver RA-02 e RA-11 em
  `RISCOS_ASSUMIDOS.md`.
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
3. **Não refatore o que não foi pedido.** A fase de port fiel terminou em 28/08/2026 e a
   lista de divergências do README está encerrada; o que exige parada e decisão dos
   sócios agora é a **superfície protegida** — `src/domain/constants.ts`, `fees.ts`,
   `market.ts`, `types.ts`, o contrato de `src/server/store/types.ts` e as Server
   Actions. Fora dela, é desenvolvimento normal.
4. **Toda decisão precisa ser explicável ao Rogério**, sócio não técnico. Se a explicação
   só funciona em jargão, a explicação está incompleta.
5. Antes de commitar um bloco funcional: `npm run build`, `npm run typecheck` e `npm test` — no fim da
   branch ou de um bloco grande, nunca a cada escrita.
6. **Nunca commitar `.env.local`**, segredo, token ou credencial. Se um segredo vazar
   para o histórico, avise em vez de tentar reescrever o histórico sozinho.
7. **Regras de eficiência de sessão** (`docs/Regras_eficiencia_de_sessao_v1.md`) valem para toda sessão
   e prevalecem sobre qualquer plano: pedido direto se atende sem nada além; o que um MD já responde não
   se relê no código; MD de execução atualizado a cada tarefa; revisão e melhoria só depois do merge;
   commits em blocos funcionais; todo plano de branch lista exatamente o que ler e a ordem de prioridade.

## Documentos de referência do projeto

- `README.md` deste repositório — histórico do port, deploy e pendências.
- `docs/diario/` — rituais de sessão, Critical Debugs e leituras diárias.
- `docs/PLANO_EXECUCAO_CRITICAL_DEBUGS.md` — o plano verificado dos itens acima.
- `RISCOS_ASSUMIDOS.md` (raiz) — **todo atalho de teste ou segurança tomado para entregar
  rápido.** Regra: atalho novo entra aqui E no `ATALHOS.md` da pasta afetada, no mesmo commit.
- `docs/EXECUCAO_POR_MODULO.md` — o passo a passo de cada módulo (M1 a M7).
- `docs/SETUP_CONTAS_E_SERVICOS.md` — o que o Gabriel precisa cadastrar.
- Relatório de Decisão de Arquitetura e Cibersegurança (decisão centralizada, stack).
- Documento Técnico do MVP HTML (mapa do monolito de origem).
