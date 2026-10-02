# Plano Executivo de Front-End — Fase 2: Excelência Visual e Interatividade Factual

**Projeto:** Plataforma Real Olímpico / Áurea Custódia  
**Data:** Outubro de 2026  
**Responsável Técnico:** Antigravity Agent  
**Status:** Em Execução

---

## 1. Avaliação Crítica da Execução Anterior (Autoanálise)

### O Que Foi Concluído com Sucesso:
- **Cultura de Design Tokens Respeitada:** Todas as cores e sombras derivam de `tokens.css`.
- **Hierarquia Visual e Acessibilidade:** Botões possuem alvo de toque de no mínimo 44px (`WCAG 2.2 Target Size`), foco com anel visível dourado e modo `prefers-reduced-motion` ativado globalmente.
- **Transições Fluidas:** Implementação de curvas elásticas (`cubic-bezier(0.16, 1, 0.3, 1)`) em todos os cartões, atalhos administrativos e linhas de conta.
- **Tipografia Numérica Tabular:** Preços e volumes formatados com `font-variant-numeric: tabular-nums` para alinhamento profissional.
- **Zero Impacto em Regras de Negócio:** Nenhuma rota, lógica de backend ou permissão de administrador foi alterada.

### O Que Ainda Pode Ser Elevado (Oportunidades de Alto Impacto):
1. **Transparência Factual Ativa (Simulador de Custódia e Taxas):**
   - O usuário quer calcular o custo exato da custódia (R$ 3,00/mês ou R$ 24,00/ano) e a taxa de negociação (0,5% + R$ 1,00) de forma interativa, vendo na hora o valor líquido que recebe ao vender ou o custo total ao comprar.
2. **Espécime Numismático Interativo:**
   - Em vez de uma imagem única estática, oferecer ao colecionador a experiência de inspecionar a moeda: alternar entre **Anverso** (valor de R$ 1,00 e grafismo marajoara) e **Reverso** (modalidade olímpica / entrega da bandeira) acompanhado da ficha técnica numismática oficial (peso de 7,00g, diâmetro de 27,00mm, bordo serrilhado intermitente).
3. **Cadeia de Rastreabilidade em Passos Concretos:**
   - Visualização clara do ciclo de vida: do recebimento físico com pesagem em balança de precisão até a entrega ou negociação via recibo nominativo.

---

## 2. Ações Executivas Desta Fase

### Ação 1: Componente do Simulador de Custódia e Negociação na Landing Page
- **Objetivo:** Dar autonomia e clareza radical ao colecionador.
- **Mecânica:**
  - Seletor de moeda de referência (ex.: Moeda da Bandeira R$ 1.100,00, Direitos Humanos R$ 450,00, Vôlei R$ 45,00 ou valor customizado).
  - Seletor de período de custódia (1 mês, 6 meses, 1 ano com desconto de R$ 24,00).
  - Cálculo instantâneo:
    - Comissão de negociação (0,5% + R$ 1,00).
    - Custo da custódia no período escolhido.
    - Proventos líquidos do vendedor e custo total de posse do comprador.
  - Alertas de transparência: sem taxas escondidas, sem mensalidade compulsória para retirada física além das despesas postais.

### Ação 2: Componente de Exame Numismático de Espécime (Anverso & Reverso)
- **Objetivo:** Transmitir o valor histórico e tangível da moeda física guardada no cofre Sicoob.
- **Mecânica:**
  - Botões para alternar instantaneamente a visualização entre Anverso e Reverso.
  - Ficha técnica oficial do Banco Central do Brasil / Casa da Moeda do Brasil:
    - Diâmetro: 27,00 mm
    - Peso: 7,00 g (aço inox no núcleo, aço revestido de bronze no anel)
    - Bordo: Serrilhado intermitente
    - Tiragem: Oficialmente homologada
    - Estado de Conservação: Flor de Cunho / Soberba

### Ação 3: Validação Técnica e Integração
- Teste de tipagem (`npm run typecheck`).
- Verificação de responsividade (desktop, tablet, mobile).
- Commit e push organizados na branch de trabalho.
