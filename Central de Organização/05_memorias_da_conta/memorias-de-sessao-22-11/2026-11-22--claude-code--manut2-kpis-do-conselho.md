# KPIs do conselho: regras de cálculo (T5) — memória do agente

- **Data:** 2026-11-22 · **Agente:** claude-code (Processo Padrão da Manutenção 22-11, a partir dos MDs de execução de T1–T5) · **Projeto/branch:** `main` (pasta completa, sem worktree)

## 1. Estado em uma tela
`/admin/resultados/kpis?aba=conselho` na `main` (`6c3f79f`): CAC/payback, margem por moeda, conversão, churn e liquidez, em `src/domain/kpis.ts` e `src/server/admin/kpis-conselho.ts`. Migration 059 (`trades.coin_ids`) liga cada negociação ao código da moeda; histórico antigo fica NULL e mostra "sem dado".

## 2. Decisões e o porquê
- **LTV = custódia + comissão** (receita por cliente), em vez de só custódia. **Cliente = cliente pagante** (quem já pagou algo), não toda conta cadastrada. **Churn = 45 dias** sem atividade. **Código da moeda em cada negociação** (`coin_ids`, migration 059) para a margem por moeda. **Custo logístico = zero** por enquanto, até o contrato novo dos Correios sair.
- Sem fonte, o KPI mostra `null`/"sem dado", nunca zero (regra da frente J, ver `2026-11-18--claude-code--manut-kpis-do-conselho.md`).
- **Auditoria de marketing (frente M) e API da Meta ficam ADIADAS** por ordem do Gabriel: os números de marketing seguem digitados pela equipe; nada de ligar API de anúncios agora.

## 3. O que aprendi (armadilhas, comandos, caminhos)
- ATENÇÃO: o MD de execução do T5 (`docs/diario/execucoes/2026-11-22--manut2-t5-kpis--MD_EXECUCAO.md`) ainda cita custo logístico padrão R$ 25,00, churn pela retirada e LTV só de custódia (primeira versão), e `configuracao.ts` ainda traz padrão 2500. A decisão acima é a mais nova do Gabriel; conferir o código antes de afirmar o que está no ar.
- Pendências de dados em `docs/kpis/PENDENCIAS_DE_DADOS_E_AUTOMACOES.md`; proposta em `docs/kpis/PROPOSTA_DE_KPIS.md`.
