# Relatório de Execução — Branch C · Mercado Pago e Correios

```
Documento:     Relatório Técnico e Executivo da Frente C
Branch:        feat/pagamentos-correios
Commit:        98a79da "Implementa integracoes de pagamento Mercado Pago e logistica Correios"
Data:          02/09/2026
Autor:         Agente C (Antigravity / Áurea Custódia)
Revisado por:  Gabriel Silva (sócio)
Módulos:       M5 (Mercado Pago / Webhooks / Idempotência) e M6 (Correios / PAC e SEDEX / Rastreio)
```

---

## 1. Resumo Executivo

Este documento consolida todas as implementações, decisões arquiteturais, regras de conformidade e testes realizados na **Frente C (`feat/pagamentos-correios`)**, conforme delimitado em [`CLAUDE.md`](../CLAUDE.md) e [`docs/FRENTES_PARALELAS.md`](FRENTES_PARALELAS.md).

### O que foi construído:
1. **Módulo de Pagamentos (`src/lib/payments/`)**: Integração com a API do Mercado Pago suportando geração de depósitos via **Checkout Pro** (redirecionamento seguro sem contato com dados de cartão) e **Pix instantâneo** (QR Code base64 + Copia e Cola), com validação de assinaturas criptográficas HMAC-SHA256 e **controle obrigatório de idempotência** (pagamento do **RA-07**).
2. **Módulo de Logística (`src/lib/shipping/`)**: Integração com a API dos Correios para cotação de frete, cálculo de seguro *ad valorem*, geração de dados de etiquetas e pré-postagem, com **proibição estrita de Carta Comum** (travada no sistema de tipos) e **declaração de conteúdo obrigatória como "Moeda comemorativa / colecionável"**.
3. **Endpoints de API (`src/app/api/`)**: Endpoint receptor de Webhooks do Mercado Pago (`/api/webhooks/mercadopago`) com resposta 200 imediata e rota de atualização em lote de rastreamento para Vercel Cron (`/api/cron/shipping`).
4. **Testes Automatizados (Vitest)**: 29 novos testes unitários e de integração com mocks, elevando a cobertura do repositório para **67 testes verdes (100% de aprovação)**.

---

## 2. Inventário Completo de Arquivos Criados e Modificados

### 2.1 Módulo de Pagamentos (`src/lib/payments/`)

| Arquivo | Natureza | Função e Detalhes |
|---|---|---|
| `types.ts` | **Novo** | Contrato de tipos estritos do domínio de pagamentos. Define `Cents` como `number` inteiro em centavos, enums de status (`pending`, `approved`, `rejected`, etc.), interfaces de requisição/resposta de Pix e Checkout Pro, e estruturas de webhook e idempotência. |
| `mercadopago.ts` | **Novo** | Cliente `server-only` para a API REST do Mercado Pago (v1/v2). Converte valores monetários para decimal apenas na borda da API e converte retornos para `Cents` inteiros. Possui suporte a Sandbox por padrão e simulador determinístico para execução offline. |
| `webhook.ts` | **Novo** | Validador criptográfico de webhooks com HMAC-SHA256 (`x-signature` + `x-request-id`). Utiliza `crypto.timingSafeEqual` para prevenir *timing attacks* e valida janela de timestamp para prevenir *replay attacks*. |
| `idempotencia.ts` | **Novo** | Gerenciador de idempotência por ID único com TTL de 24h. Garante que se o Mercado Pago reenviar a mesma notificação 3 vezes, o crédito de saldo seja executado **exatamente 1 vez** (**RA-07 pago**). |
| `index.ts` | **Novo** | Ponto de exportação público e seguro das funções do módulo. |
| `README.md` | **Novo** | Documentação técnica da pasta, detalhando arquitetura e conformidade PCI-DSS. |
| `ATALHOS.md` | **Novo** | Registro do atalho de operação em Sandbox (RA-01) e estrutura desacoplada de idempotência. |

### 2.2 Módulo de Logística e Correios (`src/lib/shipping/`)

| Arquivo | Natureza | Função e Detalhes |
|---|---|---|
| `types.ts` | **Novo** | Contrato de tipos para envio e cotação. Define `ModalidadeEnvio = 'PAC' | 'SEDEX'` e a constante `DESCRICAO_CONTEUDO_PADRAO = 'Moeda comemorativa / colecionável'`. **Carta comum é impossível de ser representada.** |
| `correios.ts` | **Novo** | Cliente `server-only` para cotação de prazos e valores de PAC e SEDEX, cálculo de seguro *ad valorem*, normalização de CEP e emissão de pré-postagens vinculadas à Central de Custódia da Áurea (Av. Paulista, 1500). |
| `tracking.ts` | **Novo** | Consulta e normalização de eventos de rastreamento SRO dos Correios. Inclui cache local em memória (TTL 30 min) e função para processamento em lote (`atualizarRastreiosEmLote`), projetada para rotinas agendadas (cron). |
| `cep.ts` | **Novo** | Consulta de endereço a partir do CEP via ViaCEP / Correios com sanitização de entrada e **zero persistência de histórico de buscas** (LGPD). |
| `index.ts` | **Novo** | Ponto de exportação público das funções de envio e rastreio. |
| `README.md` | **Novo** | Documentação técnica do módulo e justificativa regulatória das restrições postais. |
| `ATALHOS.md` | **Novo** | Registro de atalhos e funcionamento do adaptador determinístico sem contrato formal dos Correios. |

### 2.3 Endpoints de API (`src/app/api/`)

| Arquivo | Natureza | Função e Detalhes |
|---|---|---|
| `webhooks/mercadopago/route.ts` | **Novo** | Endpoint HTTP `POST` para receber eventos do Mercado Pago. Valida assinatura HMAC, confere idempotência e devolve HTTP 200 imediato ao gateway antes de delegar a conciliação. |
| `webhooks/README.md` | **Novo** | Documentação técnica dos endpoints receptores de webhook. |
| `cron/shipping/route.ts` | **Novo** | Endpoint HTTP `GET` protegido por `CRON_SECRET` para execução periódica por Vercel Cron, atualizando o rastreamento dos envios em lote. |

### 2.4 Testes Automatizados no Vitest (`src/`)

| Arquivo de Teste | Quantidade de Testes | O que comprova |
|---|---|---|
| `lib/payments/mercadopago.test.ts` | 5 testes | Criação de preferências Checkout Pro, criação de cobranças Pix com QR Code e Copia e Cola, consulta de pagamentos e recusa de valores inválidos/negativos. |
| `lib/payments/webhook.test.ts` | 5 testes | Validação de assinatura HMAC-SHA256, rejeição de assinaturas adulteradas, rejeição de timestamps expirados e parsing de payloads v1 e v2. |
| `lib/payments/idempotencia.test.ts` | 4 testes | **Critério RA-07**: Comprova que 3 reenvios do mesmo webhook executam o crédito de saldo **apenas 1 vez** e retornam status de duplicata nas seguintes. |
| `lib/shipping/correios.test.ts` | 6 testes | Normalização de CEPs, cálculo PAC e SEDEX com seguro, **rejeição de Carta Comum** e garantia da declaração de moeda colecionável. |
| `lib/shipping/tracking.test.ts` | 4 testes | Normalização de códigos SRO, consulta de rastreamento, funcionamento do cache e processamento em lote. |
| `lib/shipping/cep.test.ts` | 3 testes | Consulta de CEP, resolução de endereços e tratamento de formatos incorretos. |
| `app/api/webhooks/mercadopago/route.test.ts` | 2 testes | Recebimento de webhook com resposta 200 e resposta de `already_processed` para retentativas do gateway. |

### 2.5 Documentação Central do Repositório

| Arquivo | Natureza | O que mudou |
|---|---|---|
| `RISCOS_ASSUMIDOS.md` | **Modificado** | Atualização dos atalhos **RA-01** (Sandbox) e **RA-07** (Idempotência), e inclusão das pastas `src/lib/payments/` e `src/lib/shipping/` na tabela oficial de `ATALHOS.md`. |
| `docs/CATALOGO_DE_FEATURES.md` | **Modificado** | Features **4.4 (Mercado Pago)** e **4.5 (Correios)** marcadas como implementadas e testadas com mocks. |
| `docs/diario/VERSION_COMPARISON_DAILY.md` | **Modificado** | **Entrada 003** adicionada (append-only) registrando a entrega da Frente C, resultados de testes e rastreabilidade técnica. |

---

## 3. Travas de Segurança e Conformidade Regulatória

### 🔴 RA-01 — Custódia de Dinheiro e Operação em Sandbox
- **Regra:** A plataforma mantém saldo interno que representará dinheiro real no futuro. Guardar dinheiro de terceiros pode configurar arranjo de pagamento sob supervisão do Banco Central (Res. BCB 519–521/2026).
- **Implementação:** Toda a biblioteca de pagamentos opera em modo **Sandbox por padrão (`MP_SANDBOX=true`)**. A ativação em produção com dinheiro real fica formalmente condicionada à obtenção do parecer jurídico pelos sócios.

### 🔴 PCI-DSS — Zero Contato com Dados de Cartão
- **Regra:** A Áurea Custódia jamais trafega, recebe ou armazena PAN (números de cartão de crédito), CVV ou datas de validade em seus servidores.
- **Implementação:** A cobrança por cartão ocorre exclusivamente através de redirecionamento para o Checkout Pro hospedado nos servidores certificados do Mercado Pago.

### 🟠 RA-07 — Idempotência Obrigatória contra Pagamento Duplicado
- **Regra:** Gateways de pagamento reenviam notificações de webhook automaticamente em caso de lentidão ou oscilação de rede.
- **Implementação:** Cada evento recebido passa por trava de idempotência com chave única baseada no `eventoId` / `paymentId`. O reenvio do mesmo evento é imediatamente detectado e respondido com HTTP 200 sem executar reprocessamento financeiro.

### 📦 Correios — Proibição de Carta Comum e Declaração de Valor
- **Regra:** O regulamento postal brasileiro proíbe o envio de dinheiro circulante em cartas simples, sob pena de apreensão. Moedas comemorativas do Real têm curso legal e são dinheiro circulante.
- **Implementação:** A modalidade de envio é restrita a `PAC` ou `SEDEX` via tipo TypeScript fechado e validação em tempo de execução. O formulário de declaração de conteúdo é congelado no código com o texto `"Moeda comemorativa / colecionável"`.

### 🔒 LGPD — Privacidade nas Consultas de CEP
- **Regra:** Consultas de CEP para cotação e preenchimento de endereço não podem gerar banco de dados de rastreamento de navegação do usuário.
- **Implementação:** As consultas de CEP são efetuadas sob demanda e jamais são armazenadas em banco de dados ou logs analíticos permanentes.

---

## 4. Validação e Qualidade Técnica

Todas as verificações técnicas do checklist oficial ([`.claude/commands/commit.md`](../.claude/commands/commit.md)) foram executadas na máquina de desenvolvimento:

```bash
# 1. Testes Automatizados (Vitest)
npm test
# Resultado: 11 arquivos de teste, 67 testes passaram (100% verde em ~970ms)

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

## 5. Próximos Passos e Integração com a Frente B

1. **Aguardar a Frente B (Banco / Supabase)**:
   - Conforme o fluxo estabelecido em [`docs/FRENTES_PARALELAS.md`](FRENTES_PARALELAS.md), a **Frente B** mergeia primeiro no `main` para disponibilizar o banco relacional e a nova implementação de `mutateState()`.
2. **Rebase e Conexão de Ações**:
   - Após o merge de B, fazer o `git rebase main` na branch `feat/pagamentos-correios`.
   - Ligar a chamada do webhook ao repositório de depósitos em `src/server/actions/account.ts`.
   - Ligar a emissão de etiquetas ao repositório de envios em `src/server/actions/custody.ts`.
3. **Configuração de Variáveis de Ambiente**:
   - Configurar `MP_ACCESS_TOKEN_TEST`, `MP_WEBHOOK_SECRET` e `CRON_SECRET` no painel da Vercel (Preview e Production).
