# Relatório de Execução — Branch C · Mercado Pago e Correios

```
Documento:     Relatório Técnico e Executivo da Frente C
Branch:        feat/pagamentos-correios
Commits:       98a79da, 49f0c24 e atualizações da Sessão C-2
Data:          03/09/2026
Autor:         Agente C (Antigravity / Áurea Custódia)
Revisado por:  Gabriel Silva (sócio)
Módulos:       M5 (Mercado Pago / Webhooks / Idempotência) e M6 (Correios / PAC e SEDEX / Rastreio)
```

---

## 1. Resumo Executivo

Este documento consolida todas as implementações, decisões arquiteturais, regras de conformidade, correções de auditoria (Sessão C-2) e testes realizados na **Frente C (`feat/pagamentos-correios`)**, conforme delimitado em [`CLAUDE.md`](../CLAUDE.md), [`docs/FRENTES_PARALELAS.md`](FRENTES_PARALELAS.md) e [`docs/EXECUCAO_BRANCH_C_O_QUE_FALTA.md`](EXECUCAO_BRANCH_C_O_QUE_FALTA.md).

### O que foi construído e corrigido:
1. **Módulo de Pagamentos (`src/lib/payments/`)**: Integração com a API do Mercado Pago suportando geração de depósitos via **Checkout Pro** (redirecionamento seguro sem contato com dados de cartão) e **Pix instantâneo** (QR Code base64 + Copia e Cola), com validação criptográfica de assinaturas HMAC-SHA256 e **controle de idempotência desacoplado via interface `RepositorioIdempotencia`** (preparado para `aurea.payment_events` na C-3).
2. **Validação Estrita de Webhook (`src/app/api/webhooks/mercadopago/`)**: Rejeição de assinaturas inválidas com HTTP 401 em qualquer ambiente (`NODE_ENV`), rejeição de payloads anômalos sem ID com HTTP 400, e resposta HTTP 200 com `already_processed` para retentativas duplicadas.
3. **Módulo de Logística (`src/lib/shipping/`)**: Integração com a API dos Correios para cotação de frete, cálculo de seguro *ad valorem*, geração de dados de etiquetas e pré-postagem, com **proibição estrita de Carta Comum** (travada no sistema de tipos) e **declaração de conteúdo obrigatória como "Moeda comemorativa / colecionável"**.
4. **Endpoints de API (`src/app/api/`)**: Endpoint receptor de Webhooks do Mercado Pago (`/api/webhooks/mercadopago`) com resposta 200 imediata e rota de atualização em lote de rastreamento para Vercel Cron (`/api/cron/shipping`).
5. **Testes Automatizados (Vitest)**: 31 testes unitários e de integração com mocks e assinaturas HMAC reais, elevando a cobertura do repositório para **69 testes verdes (100% de aprovação)**.
6. **Conformidade de Riscos (RA-14)**: Registro formal de RA-14.a a RA-14.e em `RISCOS_ASSUMIDOS.md` e atualização de `.env.example`.

---

## 2. Inventário Completo de Arquivos Criados e Modificados

### 2.1 Módulo de Pagamentos (`src/lib/payments/`)

| Arquivo | Natureza | Função e Detalhes |
|---|---|---|
| `types.ts` | **Novo** | Contrato de tipos estritos do domínio de pagamentos. Define `Cents` como `number` inteiro em centavos, enums de status (`pending`, `approved`, `rejected`, etc.), interfaces de requisição/resposta de Pix e Checkout Pro, e estruturas de webhook e idempotência. |
| `mercadopago.ts` | **Novo** | Cliente `server-only` para a API REST do Mercado Pago (v1/v2). Converte valores monetários para decimal apenas na borda da API e converte retornos para `Cents` inteiros. Possui suporte a Sandbox por padrão e simulador determinístico para execução offline. |
| `webhook.ts` | **Novo** | Validador criptográfico de webhooks com HMAC-SHA256 (`x-signature` + `x-request-id`). Utiliza `crypto.timingSafeEqual` para prevenir *timing attacks*, normaliza `dataId` em minúsculas conforme a especificação do MP, valida janela de timestamp e extrai `eventoId: null` quando não houver ID no payload. |
| `idempotencia.ts` | **Novo** | Interface `RepositorioIdempotencia` (`reivindicar`, `concluir`, `falhar`, `verificar`) com adaptador `RepositorioIdempotenciaMemoria` (TTL 24h) e ponto de extensão pronto para o banco Postgres na sessão C-3. Garante que reenvios de webhook não executem crédito duplicado (**RA-07 / RA-14.a**). |
| `index.ts` | **Novo** | Ponto de exportação público e seguro das funções do módulo. |
| `README.md` | **Novo** | Documentação técnica da pasta, detalhando arquitetura e conformidade PCI-DSS. |
| `ATALHOS.md` | **Novo** | Registro dos atalhos RA-14.a a RA-14.e e notas de risco. |

### 2.2 Módulo de Logística e Correios (`src/lib/shipping/`)

| Arquivo | Natureza | Função e Detalhes |
|---|---|---|
| `types.ts` | **Novo** | Contrato de tipos para envio e cotação. Define `ModalidadeEnvio = 'PAC' | 'SEDEX'` e a constante `DESCRICAO_CONTEUDO_PADRAO = 'Moeda comemorativa / colecionável'`. **Carta comum é impossível de ser representada.** |
| `correios.ts` | **Novo** | Cliente `server-only` para cotação de prazos e valores de PAC e SEDEX, cálculo de seguro *ad valorem*, normalização de CEP e emissão de pré-postagens vinculadas à Central de Custódia da Áurea (Av. Paulista, 1500). |
| `tracking.ts` | **Novo** | Consulta e normalização de eventos de rastreamento SRO dos Correios. Inclui cache local em memória (TTL 30 min) e função para processamento em lote (`atualizarRastreiosEmLote`), projetada para rotinas agendadas (cron). |
| `cep.ts` | **Novo** | Consulta de endereço a partir do CEP via ViaCEP / Correios com sanitização de entrada e **zero persistência de histórico de buscas** (LGPD). |
| `index.ts` | **Novo** | Ponto de exportação público das funções de envio e rastreio. |
| `README.md` | **Novo** | Documentação técnica do módulo e justificativa regulatória das restrições postais. |
| `ATALHOS.md` | **Novo** | Registro de atalhos e notas de geração de etiqueta para a C-3. |

### 2.3 Endpoints de API (`src/app/api/`)

| Arquivo | Natureza | Função e Detalhes |
|---|---|---|
| `webhooks/mercadopago/route.ts` | **Novo** | Endpoint HTTP `POST` para receber eventos do Mercado Pago. Valida assinatura HMAC (401 se inválida), confere existência de ID (400 se ausente), confere idempotência (200 com `already_processed` se duplicado) e devolve HTTP 200 imediato ao gateway. |
| `webhooks/README.md` | **Novo** | Documentação técnica dos endpoints receptores de webhook. |
| `cron/shipping/route.ts` | **Novo** | Endpoint HTTP `GET` protegido por `CRON_SECRET` para execução periódica por Vercel Cron, atualizando o rastreamento dos envios em lote. |

### 2.4 Testes Automatizados no Vitest (`src/`)

| Arquivo de Teste | Quantidade de Testes | O que comprova |
|---|---|---|
| `lib/payments/mercadopago.test.ts` | 5 testes | Criação de preferências Checkout Pro, criação de cobranças Pix com QR Code e Copia e Cola, consulta de pagamentos e recusa de valores inválidos/negativos. |
| `lib/payments/webhook.test.ts` | 5 testes | Validação de assinatura HMAC-SHA256, rejeição de assinaturas adulteradas, rejeição de timestamps expirados e parsing de payloads v1 e v2. |
| `lib/payments/idempotencia.test.ts` | 4 testes | **Critério RA-07 / RA-14.a**: Comprova que 3 reenvios do mesmo webhook executam o crédito de saldo **apenas 1 vez** e retornam status de duplicata nas seguintes. |
| `lib/shipping/correios.test.ts` | 6 testes | Normalização de CEPs, cálculo PAC e SEDEX com seguro, **rejeição de Carta Comum** e garantia da declaração de moeda colecionável. |
| `lib/shipping/tracking.test.ts` | 4 testes | Normalização de códigos SRO, consulta de rastreamento, funcionamento do cache e processamento em lote. |
| `lib/shipping/cep.test.ts` | 3 testes | Consulta de CEP, resolução de endereços e tratamento de formatos incorretos. |
| `app/api/webhooks/mercadopago/route.test.ts` | 4 testes | Recebimento de webhook com HMAC real e resposta 200, resposta de `already_processed` para retentativas, rejeição 401 para assinatura adulterada e 400 para payload `{}` sem ID. |

### 2.5 Documentação Central do Repositório

| Arquivo | Natureza | O que mudou |
|---|---|---|
| `RISCOS_ASSUMIDOS.md` | **Modificado** | Registro do **RA-14 — Atalhos da frente C** (com RA-14.a até RA-14.e), atualização do índice e nota de estado em **RA-07**. |
| `.env.example` | **Modificado** | Seções completas de Mercado Pago, Correios e Cron adicionadas com orientações. |
| `docs/CATALOGO_DE_FEATURES.md` | **Modificado** | Features **4.4 (Mercado Pago)** e **4.5 (Correios)** marcadas como `🟡 bibliotecas prontas; ligação na sessão C-3`. |
| `docs/diario/VERSION_COMPARISON_DAILY.md` | **Modificado** | **Entrada 004** adicionada (append-only) registrando a entrega da Frente C e as correções da Sessão C-2. |

---

## 3. Travas de Segurança e Conformidade Regulatória

### 🔴 RA-01 — Custódia de Dinheiro e Operação em Sandbox
- **Regra:** A plataforma mantém saldo interno que representará dinheiro real no futuro. Guardar dinheiro de terceiros pode configurar arranjo de pagamento sob supervisão do Banco Central (Res. BCB 519–521/2026).
- **Implementação:** Toda a biblioteca de pagamentos opera em modo **Sandbox por padrão (`MP_SANDBOX=true`)**. A ativação em produção com dinheiro real fica formalmente condicionada à obtenção do parecer jurídico pelos sócios.

### 🔴 PCI-DSS — Zero Contato com Dados de Cartão
- **Regra:** A Áurea Custódia jamais trafega, recebe ou armazena PAN (números de cartão de crédito), CVV ou datas de validade em seus servidores.
- **Implementação:** A cobrança por cartão ocorre exclusivamente através de redirecionamento para o Checkout Pro hospedado nos servidores certificados do Mercado Pago.

### 🟠 RA-07 / RA-14.a — Idempotência Obrigatória contra Pagamento Duplicado
- **Regra:** Gateways de pagamento reenviam notificações de webhook automaticamente em caso de lentidão ou oscilação de rede.
- **Implementação:** Cada evento recebido passa por trava de idempotência através da interface `RepositorioIdempotencia`. O reenvio do mesmo evento é imediatamente detectado e respondido com HTTP 200 sem executar reprocessamento financeiro.

### 📦 Correios — Proibição de Carta Comum e Declaração de Valor
- **Regra:** O regulamento postal brasileiro proíbe o envio de dinheiro circulante em cartas simples, sob pena de apreensão. Moedas comemorativas do Real têm curso legal e são dinheiro circulante.
- **Implementação:** A modalidade de envio é restrita a `PAC` ou `SEDEX` via tipo TypeScript fechado e validação em tempo de execução. O formulário de declaração de conteúdo é congelado no código com o texto `"Moeda comemorativa / colecionável"`.

### 🔒 LGPD — Privacidade nas Consultas de CEP
- **Regra:** Consultas de CEP para cotação e preenchimento de endereço não podem gerar banco de dados de rastreamento de navegação do usuário.
- **Implementação:** As consultas de CEP são efetuadas sob demanda e jamais são armazenadas em banco de dados ou logs analíticos permanentes.

---

## 4. Validação e Qualidade Técnica

Todas as verificações técnicas do checklist oficial ([`.claude/commands/commit.md`](../.claude/commands/commit.md)) foram executadas com sucesso:

```bash
# 1. Testes Automatizados (Vitest)
npm test
# Resultado: 11 arquivos de teste, 69 testes passaram (100% verde)

# 2. Verificação Estrita de Tipos (TypeScript)
npm run typecheck
# Resultado: tsc --noEmit executou com ZERO erros

# 3. Análise Estática de Código (ESLint)
npm run lint
# Resultado: eslint . executou com ZERO erros e ZERO avisos

# 4. Compilação de Produção (Next.js 15 App Router)
npm run build
# Resultado: Compilação concluída com sucesso gerando 21 rotas estáticas e dinâmicas
```

---

## 5. Próximos Passos (Sessão C-3)

1. **Aguardar a Frente B (Banco / Supabase)**:
   - Conforme o fluxo estabelecido em [`docs/FRENTES_PARALELAS.md`](FRENTES_PARALELAS.md), a **Frente B** mergeia primeiro no `main` disponibilizando as tabelas relacionais.
2. **Rebase e Conexão de Ações na Sessão C-3**:
   - Fazer `git fetch origin && git rebase origin/main` na branch `feat/pagamentos-correios`.
   - Executar a migration `002_pagamentos_rastreio.sql` criando `aurea.payment_events`, `aurea.payment_intents` e `aurea.rastreios`.
   - Implementar o adaptador Postgres de `RepositorioIdempotencia` sobre `aurea.payment_events`.
   - Criar a Server Action `iniciarDeposito()` em `src/server/actions/payments.ts` e ligar o crédito do webhook ao `mutateState()`.
   - Atualizar a modal de depósito (`ModalDeposito`) com opções Pix e Checkout Pro e o formulário de envio com modalidade e CEP.
   - Configurar o agendamento diário no `vercel.json` para o cron `/api/cron/shipping`.
