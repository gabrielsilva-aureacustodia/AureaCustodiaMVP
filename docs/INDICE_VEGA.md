# INDICE_VEGA — mapa do repositório Áurea Custódia / Real Olímpico

```
Projeto:        AUREA CUSTODIA LTDA (CNPJ 68.071.452/0001-06) · marca Real Olímpico
Repositório:    C:\dev\AureaCustodiaMVP · origin gabrielsilva-aureacustodia/AureaCustodiaMVP (público de propósito, RA-11)
Gerado em:      2026-11-09, na main 2b48b04 (PWA, 05/11/2026)
Para quem:      o Vega (painel A2A da Sintetica) e qualquer agente que retome o trabalho sem perguntar
Como usar:      leia a seção 1 (30 segundos), depois só a seção que o pedido tocar. Nunca varra o repositório.
Verificado:     estrutura, migrations, commits e docs listados abaixo foram lidos em 09/11/2026.
                O que é "herdado" (estado de produção, testes, pendências) vem do MD citado e traz a data dele.
```

## 1. Em uma tela

- **O que é:** custódia física de moedas comemorativas olímpicas (cofre, recibo com hash SHA-256), marketplace entre clientes e, no futuro, crédito com garantia. Opera com gente real e dinheiro real (Mercado Pago, saques, faturas de custódia, NFS-e).
- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript strict, Supabase (Postgres + Auth), Vercel (gru1). Site: https://realolimpico.com.br.
- **Regra de ouro das camadas:** `src/domain` puro → `src/server` só servidor → `src/app` rotas → `src/components` UI. Nada de `@/server/*` em Client Component. Toda mutação passa por `mutateState()` dentro de Server Action.
- **Último marco:** 05/11/2026 PWA instalável (`2b48b04`); 03/11 custódia numa regra só (`b6f253e`); 31/10 Atendimento ao cliente (migration 048).
- **Estado do Git hoje:** `main` = `origin/main`, nenhuma branch por mesclar, um único worktree. Não commitados: `.claude/launch.json` (só reformatado + entradas de preview) e arquivos de `docs/polimento/**` e `.agents/` (ver seção 9).
- **Onde está o resto do estado vivo:** `docs/diario/execucoes/ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md` (bloco RETOMADA, próximo ato, pendências).
- **Decisão fiscal, de cobrança ou de regra de negócio não se toma sem o Gabriel** (CLAUDE.md).

## 2. Ordem de leitura de um agente novo

1. `CLAUDE.md` (regras vigentes, valores combinados, histórico das mudanças de regra) e `AGENTS.md` (aponta para o CLAUDE.md).
2. `docs/diario/LEIA_PRIMEIRO_AGENTE.md` (ritual de abertura e fechamento, atualizado em 09/11/2026).
3. `docs/diario/execucoes/ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md` (RETOMADA).
4. O MD da frente do pedido (seção 6) e **só depois** o código.
5. Memórias recentes: `docs/memorias/README.md`.
Pedido de pergunta simples ou alvo já indicado: responda só isso (Regras de eficiência v1.1, `docs/Regras_eficiencia_de_sessao_v1.1.md`).

## 3. Mapa de pastas

### Raiz
| Item | O que é |
|---|---|
| `CLAUDE.md`, `AGENTS.md` | Regras do repositório. CLAUDE.md é a fonte única; AGENTS.md só aponta |
| `README.md` | Histórico do port do monolito HTML, deploy, pendências |
| `RISCOS_ASSUMIDOS.md` | Todo atalho de teste ou segurança (RA-01 a RA-60). Atalho novo entra aqui **e** no `ATALHOS.md` da pasta afetada, no mesmo commit |
| `package.json` | Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test` (vitest run), `db:migrate`, `db:check` |
| `vercel.json` | Região gru1; crons diários `/api/cron/shipping` 09:00 UTC e `/api/cron/faturamento` 08:00 UTC |
| `*.cjs` na raiz (`limpar-*`, `renumerar-acervo`, `corrigir-peso-dos-laudos`, `mover-moedas-para-as-caixas-certas`, `regularizar-custodia-de-entrada`, `preencher-cobertura-das-faturas-antigas`, `estender-prazo-faturas`, `alinhar-videos`, `inspecionar-acervo`) | Scripts one-shot que **mexem em dados de produção**. Não são código da aplicação; não rodar sem o Gabriel; nunca entram na suíte (memória `script-de-producao-fora-da-suite`) |
| `.claude/` | `commands/` (`/commit`, `/publicar`), `launch.json` (servidores de preview) |
| `.agents/` | Kit do Antigravity (`rules/assets-web.md`, `skills/assets-web`, `workflows/gerar-asset.md`); **não versionado ainda** |
| `estacao/` | App Electron da bancada de análise (`CONTRATO.md` das rotas `/api/estacao/*`) |
| `vendor/` | Dependências vendorizadas (ex.: SheetJS) |
| `public/` | `brand/` (logos; só estes), `moedas/`, `visuais/` (ativos da landing), `pwa/` (ícones), `offline.html` |
| `scripts/` | `db-migrate.mjs`, `db-check.mjs`, `env-local.mjs`, `gerar-icones-pwa.mjs`, `faturar-custodia.test.ts` |

### `src/` (cada pasta tem README.md e, quando há atalho, ATALHOS.md)
| Pasta | Conteúdo-chave |
|---|---|
| `src/domain/` | Regra pura. **Superfície protegida:** `constants.ts`, `fees.ts`, `market.ts`, `types.ts`. Custódia: `custodia-da-moeda.ts` (regra única), `quitar-fatura.ts`, `ciclo-custodia.ts`, `cobranca-de-entrada.ts`, `custodia-da-compra.ts`, `bloqueio-por-debito.ts`, `custody.ts`. Contábil: `ledger.ts`, `hash.ts`, `dre.ts`. Subpastas `admin/` (permissões, caixas), `atendimento/` (casos), `nfse/` (códigos fiscais em `codigos.ts`), `documentos-legais/` |
| `src/server/` | `state.ts` (`mutateState`), `actions/` (cliente) e `actions/admin/` (bancada, casos, config, contabil, cs, emails, equipe, financeiro, fiscal, logistica, registros, saques, usuarios), `db/` (+ `migrations/` 001–049, `derivar.ts` = ledger e auditoria), `store/`, `auth/`, `admin/`, `payments/`, `saques/`, `custodia/`, `estacao/`, `relatorios/`, `config/`, `taxas/`, `documentos/`, `mercado/`, `shipping/`, `nfse/`, `atendimento/`, `session*.ts`, `cron-auth.ts`, `rotas-publicas.ts` |
| `src/app/` | `page.tsx` (landing), `entrar`, `cadastrar`, `termos`, `privacidade`, `taxas`, `suporte`, `academy`, `painel` (entrada da equipe), `(app)` (inicio, mercado, vender, compras, envios, recibos, relatorios, retirada, conta, atendimento), `(admin)/admin` (bancada, casos, configuracao, cs, equipe, logistica, moedas, resultados, saques, usuarios), `api/` (admin, atendimento, cron, crypto, envios, estacao, eventos, rastreios, relatorios, retiradas, state, webhooks), `manifest.ts`, `sw.js` (rota do service worker) |
| `src/components/` | `account admin atendimento charts custody home landing legal login market pagamento providers pwa recibo reports sell shell svg tutorial ui` |
| `src/lib/` | Integrações: `payments` (Mercado Pago), `shipping` (Correios CWS), `email` (Resend), `mensageria` (WhatsApp/Evolution), `pdf`, `export`, `xlsx`, `pwa`, `coingecko` |
| `src/styles/` | CSS global por área; `responsive.css` **sempre o último import** de `globals.css` |
| `src/brand/` | Tokens, fontes, catálogo de ativos (`ativos.ts`) e componentes do Brandbook |

### `docs/` (resumo; o que está vivo em negrito)
| Pasta/arquivo | Papel |
|---|---|
| **`docs/INDICE_VEGA.md`** | Este arquivo |
| **`docs/diario/`** | Rituais, Critical Debugs, leituras, comparação de versões, `FRENTES_DE_TRABALHO.md`, **`LEIA_PRIMEIRO_AGENTE.md`**, **`execucoes/`** (MD de execução por frente, com RETOMADA) |
| **`docs/memorias/`** | Memórias R11 por execução, com índice em `README.md` |
| `docs/polimento/` | Orquestração do polimento estético de 24/10 (landing, brandbook, assets, plataforma, admin) |
| `docs/atendimento/` | `DESENHO.md` e `EXECUCAO.md` do Atendimento ao cliente |
| `docs/pwa/MD_EXECUCAO.md` | PWA (04–05/11) |
| `docs/fiscal-contabil/` | NFS-e, regras contábeis, taxas do Mercado Pago, lacunas e perguntas ao contador |
| `docs/tutoriais/`, `docs/cowork/` | Roteiros manuais e para o Claude Cowork (painéis externos) |
| `docs/ALTERACOES_2026-*.md` | Mudanças de regra datadas (14/10 saques, 21/10 custódia na compra, 03/11 regra única) |
| `docs/PENDENCIAS_ABERTAS.md` | Índice de pendências **de 18/09** (defasado; ver seção 8) |
| `docs/EXECUCAO_*`, `execucao/AG1–AG11`, `execucao-pendencias/E1–E8`, `finalizacoes/`, `prompts/`, `publish_docs/` | Histórico de ondas de agentes (agentes A/B/C, E1–E8, AG1–AG11). Consulta, não ação |
| `docs/alteracoes/` | Registro por arquivo do Guilherme (a partir de 18/09) |
| `docs/referencia/`, `docs/marca/`, `docs/auditorias/`, `docs/checkup/` | Referência estática, marca, auditorias |
| `docs/privado/` | **Ignorada pelo Git**: certificados, backup do banco, credenciais. Nunca ler para citar valores |

## 4. Regras de negócio vigentes (resumo; texto e datas no CLAUDE.md)

| Tema | Regra | Onde no código |
|---|---|---|
| Comissão | 0,5% + R$ 1,00 por moeda, de **ambos os lados** | `TAXAS_PADRAO` em `src/domain/fees.ts` (editável em `/admin/configuracao`) |
| Custódia | R$ 2,00/moeda/mês, plano único mensal. **Uma data por moeda, "paga até"** (maior `coberturaAte` das faturas pagas do dono atual). Trava às 23:59 do dia da cobrança seguinte. Não existe renovação de plano nem cobrança no dia 1º | `src/domain/custodia-da-moeda.ts`, `quitar-fatura.ts` |
| Ciclo | Contado do aceite da moeda; compra recomeça o ciclo e já traz o 1º mês pago (`custoDeCompraPorMoeda`) | `ciclo-custodia.ts`, `custodia-da-compra.ts` |
| Negociar | Só com custódia paga (`custodiaImpedeNegociar`) | `custodia-da-moeda.ts` |
| Saque | Cliente pede, **equipe aprova** (`saques.pagar`); tarifa R$ 5,00; Pix automático desligado (`MP_PAYOUTS_ATIVO`) | `src/server/saques/`, `actions/admin/saques.ts` |
| NFS-e | Toda comissão e custódia **paga** gera pedido de nota na mesma transação; fatura em aberto nunca gera; frete é despesa do cliente (sem nota) | `src/server/nfse/`, `src/domain/nfse/codigos.ts`, migrations 044/045 |
| Frete | Correios Platinum 1 (CWS), cliente paga pelo preço do contrato sem margem | `src/lib/shipping/` |
| Dinheiro | Centavos inteiros (`Cents`), nunca float | `src/domain/` |
| Mercado | Prioridade preço-tempo por tipo de moeda; só "Entrega da Bandeira Olímpica" e "Direitos Humanos" negociáveis (`isNegociavel`) | `market.ts`, `constants.ts` |
| Depósito | Mercado Pago (Pix/cartão), teto `DEPOSITO_MAX` R$ 100.000, creditado na conciliação; origem gravada (migration 049) | `actions/payments.ts` |
| Marca | **Real Olímpico** (masculino); razão social só onde há CNPJ/contrato/descritor de cartão; logos só de `public/brand/`; vocabulário jurídico restrito (sem token, NFT, cripto, ativo digital, investimento, rentabilidade) | CLAUDE.md |
| Tributo | Sem lógica de imposto até o contador definir (Lucro Presumido × Simples) | `parametros_contabeis` no banco |

## 5. Banco de dados e infraestrutura

- **Postgres/Supabase**, schema `aurea.*`. Migrations em `src/server/db/migrations/` (001 a 049, lacuna 027–029 histórica); `npm run db:migrate` com `POSTGRES_URL_DIRECT`. **Migration nova se aplica no banco junto com o commit que a cria** (memória do Gabriel).
- Migrations recentes: 043 contrato Correios · 044/045 NFS-e · 046 controle financeiro · 047 fatura de ciclo por lote · 048 casos de atendimento · 049 origem do depósito.
- Ledger append-only com hash encadeado e `audit_log` gravados na mesma transação (`src/server/db/derivar.ts`).
- **Variáveis (só nomes; valores ficam na Vercel e em `.env.local`):** `SESSION_SECRET`, `POSTGRES_URL`/`POSTGRES_URL_DIRECT`, `SUPABASE_*`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_SANDBOX`, `MP_PAYOUTS_ATIVO`, `CRON_SECRET`, `AUREA_RELATORIOS_TOKEN`, `AUREA_ADMIN_EMAILS`, `AUREA_ESTACAO_TOKEN`, `NEXT_PUBLIC_APP_URL`, `AUREA_SITE_URL`, `RESEND_API_KEY`, `CORREIOS_*` (5), `NFSE_CERT_*`, variáveis da Evolution (`docs/cowork/04_WHATSAPP_EVOLUTION.md`). `SUPABASE_PUBLISHABLE_KEY` fica no `.env.local` de toda pasta e **nunca é removida**.
- Leitura de produção: `BEGIN READ ONLY`, nunca `SET` de sessão (o pooler vaza para o site).
- Contas: GitHub `gabrielsilva-aureacustodia` (origin) e `gabrielsilva-sintetica` (remote `fork`); Vercel produção em realolimpico.com.br. Atenção: a conta ativa do `gh` pode ser a da Sintetica.
- Preview local: `.claude/launch.json` (`aurea-dev` porta 3000). Tela logada sem banco: `docs/polimento/plataforma/ferramentas/README.md` e `docs/polimento/admin/ferramentas/`.

## 6. Frentes de trabalho (linha do tempo)

Fonte do detalhe: `docs/diario/execucoes/ESTADO-GERAL-2026-11-09--MD_EXECUCAO.md`.

| Data | Frente | Resultado | Leia |
|---|---|---|---|
| 15/08–28/08 | Port do monolito `aurea-mvp-teste.html` | Next.js, 5 frentes iniciais | `README.md`, `docs/diario/FRENTES_DE_TRABALHO.md` |
| 09/2026 | Agentes A/B/C (login+landing, banco+pagamentos, admin+Correios), E1–E8 | Supabase, Auth+Google, Mercado Pago, `/admin` com RBAC, ledger/DRE | `docs/finalizacoes/`, `docs/execucao-pendencias/` |
| 20/09 | Domínio oficial e marca Real Olímpico | realolimpico.com.br no ar | `docs/tutoriais/TUTORIAL_DOMINIO_OFICIAL.md` |
| 21/09–21/10 | Custódia mensal, ciclo por moeda, trava por débito, custódia na compra | regras do CLAUDE.md | `docs/ALTERACOES_2026-10-21_CUSTODIA_NA_COMPRA.md` |
| 14/10 | Saques só pela equipe | fila `/admin/saques` | `docs/ALTERACOES_2026-10-14_SAQUES_E_PERMISSOES.md` |
| 22–23/10 | NFS-e Nacional + controle contábil; Correios CWS | pedidos de nota na transação; frete por contrato | `docs/fiscal-contabil/`, `docs/EXECUCAO_CORREIOS_CWS.md` |
| 24–25/10 | Polimento estético (brandbook, ativos, landing, plataforma, admin), 5 frentes | landing e telas redesenhadas, publicadas em 25/10 | `docs/polimento/README.md` e `MD_EXECUCAO.md` de cada pasta |
| 30/10 | Balcão dos Correios; integrações Gov/Correios; auditoria final; polimento 2 + tutorial do admin + check-up | PRs #7 a #18 | `docs/memorias/2026-10-30--*` |
| 31/10 | Atendimento ao cliente (botão, `/atendimento`, `/admin/casos`) | migration 048 aplicada em produção (commit d009f6a) | `docs/atendimento/EXECUCAO.md` |
| 03/11 | Custódia numa regra só | `custodia-da-moeda.ts`, `quitar-fatura.ts`; plano por mês e cobrança do dia 1º saíram | `docs/ALTERACOES_2026-11-03_CUSTODIA_REGRA_UNICA.md` |
| 04–05/11 | PWA instalável com atualização automática | `2b48b04`; falta teste em aparelho real | `docs/pwa/MD_EXECUCAO.md` |
| 17/11 | Manutenção pedida pelo Rogério (16 itens, 12 frentes A–L); prazo 30/11 | Mescladas: I (número da moeda no recibo), D (cadastro com Google primeiro), C (e-mails de movimentação, migration 053 `emails_pendentes`), B (frete + 1º mês no envio), E (PWA no iPhone: diagnóstico e roteiro); pacote em `docs/manutencao-2026-11/` | `docs/manutencao-2026-11/README.md`, `docs/memorias/2026-11-17--*`, `docs/pwa/DIAGNOSTICO_PWA.md`, `docs/diario/execucoes/PESQUISA_CUSTO_EMAIL.md`, `src/server/emails/` |

## 7. Testes e comandos

- Antes de commitar bloco funcional: `npm run typecheck`, `npm test`, `npm run build` (no fim da branch, nunca por edição). Commit só de MD vai direto, sem isso.
- Última contagem registrada: **159 arquivos, 1.496 testes** (31/10/2026, `docs/atendimento/EXECUCAO.md`). Contagem de 09/11 não foi rodada nesta organização.
- Instabilidade conhecida sem causa identificada: a suíte falhou duas vezes e passou na repetição (30/10, memória do polimento). Suíte vermelha não se entrega como pendência.
- Scripts que gravam em produção ficam fora de `src/*.test.ts`.

## 8. Pendências conhecidas (herdadas; reconferir antes de agir)

| Origem (data) | Item |
|---|---|
| `docs/atendimento/EXECUCAO.md` (31/10) | E-mail ao cliente depende de `RESEND_API_KEY` na Vercel; visitante sem login não envia caso; teste em produção com login |
| `docs/pwa/MD_EXECUCAO.md` (05/11) | Teste em aparelho real (Android e iPhone); `screenshots` do manifesto; splash do iPhone; possível renumerar RA-60 |
| `docs/memorias/2026-10-30--...polimento-tutorial-admin-checkup.md` | Área logada, `/admin` e webhooks nunca testados contra produção; papéis sócio e operação só em teste de domínio; atalho `/` da busca (WCAG 2.1.4); propostas P2–P4 do benchmark do admin; teste instável |
| `docs/PENDENCIAS_ABERTAS.md` (18/09, defasado) | B-7 credenciais Mercado Pago (hoje já há cobrança real, reconferir), B-8 juros do parcelamento, N-01 `CRON_SECRET`, N-02 `AUREA_RELATORIOS_TOKEN`, P-C2-02 WhatsApp |
| `docs/fiscal-contabil/LACUNAS_E_PERGUNTAS.md` | Perguntas ao contador; regime tributário |
| CLAUDE.md | Sem Melhor Envio; contradição tributária; LGPD (retenção de foto/vídeo) antes de cliente real |
| `docs/polimento/**` | Documentos de benchmark/inventário/brief **nunca commitados** (seção 9) |
| Saque do Sidnei e regularização | Ver memória `2026-10-30--aurea-custodia-balcao-correios--balcao-correios.md` |

## 9. Arquivos locais ainda sem commit (09/11/2026)

`.claude/launch.json` (modificado), `.agents/`, `docs/polimento/README.md`, `docs/polimento/admin/{BENCHMARK,INVENTARIO,MD_EXECUCAO}.local-2026-10-27.md`, `BRIEF_DE_DESIGN.md`, `PROPOSTAS_BACKEND.md`, `auditoria/`, `ferramentas/`, `docs/polimento/assets/`, `docs/polimento/brandbook/MD_EXECUCAO.md`, `docs/polimento/landing/{MD_EXECUCAO,PEDIDO_FRENTE_2}.md`, e os arquivos novos desta organização (este índice, `LEIA_PRIMEIRO_AGENTE.md`, `execucoes/`, memória). Três `stash` antigos (landing e Agente B/A) seguem na lista do Git; não aplicar sem conferir.

## 10. Armadilhas que já custaram caro

- Duas regras de cobrança vivas ao mesmo tempo (plano por mês × ciclo da moeda) travaram moeda e cobraram indevido em 01/11. Hoje há **uma** função de resposta; qualquer regra nova de custódia passa por `custodia-da-moeda.ts` e pelo teste dia a dia.
- Função de saque em arquivo de conta de cliente era endpoint aberto: todo export de arquivo `'use server'` é endpoint.
- Rascunho de oferta no livro com filtro em cada leitura vaza; a oferta pré-paga nasce do pagamento.
- Teste visual e páginas de conferência são temporários e saem antes do commit.
- Crases dentro de aspas duplas no shell executam o conteúdo; use heredoc ou escreva o arquivo.
- Terminal do Gabriel é PowerShell: `&&` não existe lá.

## 11. Ligação com a Sintetica

- Ficha deste projeto no Sintetica: `C:\dev\Sintetica\contexto\projetos\aurea-custodia.md` (atualizada em 09/11/2026 com ponteiro para este índice).
- Método de trabalho: `C:\dev\Sintetica\processo\` (índice `00_INDICE.md`, ritual `04_RITUAL_DE_SESSAO.md`); versão adaptada a este repo em `docs/diario/LEIA_PRIMEIRO_AGENTE.md`.
- Memórias R11 deste projeto seguem o modelo `C:\dev\Sintetica\docs\memorias\_MODELO.md`.
