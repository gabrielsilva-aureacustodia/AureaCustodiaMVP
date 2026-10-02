# Benchmark Aprofundado (Fase 2) — Padrões Avançados de Plataformas de Colecionáveis e Trading

**Data:** Outubro de 2026  
**Contexto:** Áurea Custódia / Real Olímpico  
**Objetivo:** Identificar os mecanismos mais sofisticados de UX/UI em plataformas mundiais de alta reputação (numismática, leilões de luxo, colecionáveis securitizados, exchanges de ativos físicos e digitais) e extrair os padrões exatos que elevam a confiança, transparência e elegância da plataforma Real Olímpico sem alterar nenhuma regra de negócio.

---

## 1. Plataformas Analisadas nesta Segunda Rodada

### A. Colecionáveis de Alto Valor & Numismática
1. **PCGS CoinFacts & Photograde™** (EUA): Referência global absoluta em numismática.
   - *Mecanismo-Chave:* Visualizador de espécimes com anverso/reverso comutáveis, iluminação de relevo e dados populacionais/metalúrgicos integrados ao exame visual.
2. **CAC Grading & Collectors Universe** (EUA): Selagem e verificação de autenticidade física.
   - *Mecanismo-Chave:* "Pedigree & Provenance Stepper" — linha do tempo de cadeia de custódia e histórico de custódia em cofre certificado.
3. **Heritage Auctions (World Coins & Currencies)** (EUA/Global): A maior casa de leilões numismáticos do mundo.
   - *Mecanismo-Chave:* Ficha técnica de catalogação rigorosa (metal, bordo, tiragem, ano de cunhagem, diâmetro, peso nominal vs. peso aferido a 0,01g).
4. **Goldin Auctions & PSA Vault** (EUA): Custódia de itens graduados com negociação digital sem movimentação física.
   - *Mecanismo-Chave:* Indicador de "Vault Secured" com taxa zero de envio intermediário durante a permanência no cofre ("vault-to-vault transfer").
5. **StockX Authentication Hub** (Global): Inspeção física e transparência de custos.
   - *Mecanismo-Chave:* "All-In Pricing Breakdown" transparente antes de qualquer confirmação, eliminando fricção e receio de taxas ocultas.

### B. Trading, Fintech & Exchanges de Liquidez Instantânea
6. **Uniswap v4 & Jupiter Exchange**:
   - *Mecanismo-Chave:* Simulador interativo em tempo real de liquidação e taxas com visualização instantânea de proventos líquidos e custo operacional detalhado.
7. **Robinhood 24-Hour Market & Cash Management**:
   - *Mecanismo-Chave:* Microinterações táteis e cartões com gradiente suave de profundidade, proporcionando sensação de segurança bancária e modernidade sem ruído.
8. **Coinbase Prime & Institutional Vault**:
   - *Mecanismo-Chave:* Comprovante nominativo de custódia com status verificável em 1 clique e segregação patrimonial explícita.
9. **Kraken Pro**:
   - *Mecanismo-Chave:* Tipografia tabular estrita (`tabular-nums`) para todos os dados monetários, evitando desalinhamentos durante flutuações e garantindo legibilidade de alta fidelidade.
10. **Revolut Metal & Monzo Wealth**:
    - *Mecanismo-Chave:* Calculadoras de rendimento e custo de custódia com sliders/seletores interativos de período (1 mês, 6 meses, 1 ano), dando autonomia imediata ao usuário.

---

## 2. Síntese dos Padrões de Sucesso Identificados

| Padrão | Problema Resolvido | Como Aplicar no Real Olímpico |
| :--- | :--- | :--- |
| **Simulador de Taxas em Tempo Real** | O colecionador quer saber exatamente quanto pagará e quanto receberá antes de operar. | Calculadora interativa client-side com as taxas reais da Áurea (0,5% + R$ 1,00/lado; custódia R$ 3/mês ou R$ 24/ano) sem nenhuma chamada pesada. |
| **Espécime Numismático Interativo (Anverso/Reverso)** | Fotos estáticas transmitem menos tangibilidade da moeda física em cofre. | Card de espécime com alternância instantânea entre Anverso (Face de Valor) e Reverso (Modalidade Olímpica/Temática) com dados oficiais de cunhagem. |
| **Linha de Rastreabilidade Factual (Chain of Custody)** | O usuário precisa ter certeza de que o recibo nominativo representa ouro e metal real guardado. | Linha do tempo visual: Inspeção & Pesagem 0,01g → Lacração Sicoob → Emissão de Recibo Nominativo → Negociação sem Fricção → Resgate Físico. |
| **Números Tabulares e Microinterações Táteis** | Tabelas e valores monetários "tremendo" ou parecendo desleixados. | `font-variant-numeric: tabular-nums`, focus rings dourados e elevações suaves de 2px a 3px com curva `cubic-bezier(0.16, 1, 0.3, 1)`. |

---

## 3. Diretrizes de Implementação no Real Olímpico
1. **Regra de Ouro:** Não alterar nenhuma taxa (`0,5% + R$ 1,00` e `R$ 3,00 / R$ 24,00`).
2. **Marca & Concordância:** Sempre "o Real Olímpico", masculino.
3. **Terminologia Protegida:** Sem "tokens" ou "ativos digitais" para os recibos da Áurea.
4. **Performance:** Código 100% puro, sem dependências externas pesadas, zero impacto no tempo de carregamento inicial.
