# Plano Executivo de Modernização do Front-End: Plataforma Real Olímpico

**Data:** 01/10/2026  
**Status:** Proposta Executiva para as Fases Subsequentes  
**Escopo:** Interfaces internas do colecionador (`/painel`, `/moedas`, `/marketplace`, `/extrato`), documentos legais e ferramentas periciais (`/admin`).

---

## 1. Visão Geral e Princípios Diretores

A modernização da Landing Page estabeleceu um novo patamar de elegância, sobriedade e clareza para o Real Olímpico, unindo o rigor institucional da numismática clássica (PCGS, NGC, Heritage) com a simplicidade e transparência das fintechs modernas (Robinhood, Coinbase, Uniswap).

O objetivo deste Plano Executivo é estender essa experiência de alto padrão para todas as telas internas e funcionais da plataforma, mantendo:
1. **Lógica Simplista e Acessível:** Zero complexidade artificial ou ruído visual.
2. **Confiança e Prova Factual:** Foco na segurança bancária (Cofre Sicoob), laudos periciais e recibos digitais lastreados.
3. **Desempenho Extremo e Acessibilidade:** CSS nativo, layout intrínseco, alvos de toque de 44px e tipografia tabular.

---

## 2. Mapa de Melhorias por Módulo

### 2.1. Painel do Colecionador (`/painel`)
- **Card Consolidado de Patrimônio Tangível:**
  - Valor total dos itens sob custódia fiduciária com formatação tabular (`font-variant-numeric: tabular-nums`).
  - Indicador discreto de valorização referencial de mercado.
  - Acesso rápido aos 3 fluxos essenciais: *Custodiar nova moeda*, *Ver acervo no cofre* e *Acessar marketplace*.
- **Feed de Atividades do Acervo:**
  - Histórico cronológico simplificado: entradas em custódia, avaliações periciais concluídas, liquidações e extratos de guarda.

---

### 2.2. Acervo Pessoal e Detalhes da Moeda (`/moedas` e `/moedas/[id]`)
- **Inspetor Pericial com Lupa Numismática (Macro-View):**
  - Inspirado na tecnologia TrueView da PCGS: visualização de fotos de alta definição frente/verso com zoom fluido (CSS/Canvas leve), permitindo ao colecionador contemplar os detalhes da pátina e do relevo sem tocar fisicamente na moeda.
- **Ficha Técnica e Selo de Inviolabilidade Digital (Proof of Vault):**
  - Número exclusivo do recibo lastreado e hash SHA-256.
  - Dados biométricos/físicos da moeda: peso exato com 3 casas decimais (ex: `7,842 g`), diâmetro milimétrico e composição metálica.
  - Localização fiduciária: "Custodiado em cofre de alta segurança (Sicoob) — Lacre nº XXXX".
  - Botão de verificação pública em 1 clique (para apresentar a compradores externos).
- **Ação Rápida de Liquidez:**
  - Botão "Colocar à venda no marketplace" diretamente da ficha da moeda, sugerindo preço de referência e calculando a taxa de 0,5% + R$ 1,00 em tempo real.

---

### 2.3. Marketplace de Colecionadores (`/marketplace`)
- **Catálogo Visual de Alta Legibilidade:**
  - Filtro simplificado por ano (ex: 1998, 2012, 2014-2016), tema e estado de conservação (Flor de Cunho, Soberba).
  - Cards com foto autêntica, número do laudo pericial, cotação atual e botão de compra direta.
- **Livro de Ofertas Descomplicado (Visual Market Depth):**
  - Sem jargões de trader (substituir "Bid/Ask" por "Maior oferta de compra" e "Menor valor de venda").
  - Gráfico de barras simples mostrando a concentração de ofertas em cada faixa de preço.
- **Modal de Checkout Transparente:**
  - Discriminação obrigatória de todas as linhas de custo antes da confirmação:
    - *Valor do item:* R$ 180,00
    - *Comissão do marketplace (0,5% + R$ 1,00):* R$ 1,90
    - *Total a pagar:* R$ 181,90
  - Transferência de titularidade instantânea no cofre (Instant Vault Settlement), sem custo de frete.

---

### 2.4. Gestão de Custódia e Resgate Físico (`/conta/custodia`)
- **Controle de Guarda e Renovação:**
  - Tabela com os valores vigentes da custódia (R$ 3,00/mês ou R$ 24,00/ano por moeda), data da próxima competência e histórico de recibos fiscais.
- **Fluxo Guiado de Resgate Físico:**
  - Procedimento em 3 etapas com checklist de conferência:
    1. Escolha das moedas a resgatar.
    2. Agendamento de retirada presencial homologada ou envio via transporte seguro de valores.
    3. Confirmação do laudo pericial de deslacração e entrega.

---

### 2.5. Painel Administrativo e Bancada Pericial (`/admin`)
- **Bancada Digital de Entrada Numismática:**
  - Formulário guiado para o perito responsável com campos calibrados: pesagem de precisão, diâmetro micrométrico, conferência de cunho e upload de fotos macro.
  - Emissão automática do recibo de custódia assinado e registro do hash criptográfico canônico.
- **Gestão de Acervo e Auditoria de Cofre:**
  - Relatório de conferência física (relação das moedas custodiadas x gavetas/bandejas do cofre).

---

## 3. Cronograma Recomendado de Implementação

| Onda | Foco | Entregáveis |
|---|---|---|
| **Onda 1** | **Marketplace & Checkout Transparente** | Livro visual simplificado, calculadora de taxas (0,5% + R$ 1,00) em tempo real e confirmação em 1 clique. |
| **Onda 2** | **Acervo e Ficha Pericial da Moeda** | Página de detalhes com fotos macro, dados de pesagem/cunho, selo de cofre Sicoob e QR Code de verificação. |
| **Onda 3** | **Painel & Gestão de Custódia** | Visão patrimonial consolidada, gestão de planos (R$ 3,00/mês ou R$ 24,00/ano) e fluxo de resgate físico. |
| **Onda 4** | **Bancada Pericial Administrativa** | Formulário de perícia guiada e conciliação do cofre no painel `/admin`. |
