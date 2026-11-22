# Isenção da Áurea/CEO e CPF ou CNPJ (T2) — memória do agente

- **Data:** 2026-11-22 · **Agente:** claude-code (Processo Padrão da Manutenção 22-11, a partir dos MDs de execução de T1–T5) · **Projeto/branch:** `main` (pasta completa, sem worktree)

## 1. Estado em uma tela
Código na `main` (`1e6b775`): `src/domain/isencao.ts` (`ehIsentoDeCustodia`, `taxasDaNegociacao`), fiação em `market.ts`, `custodia-da-moeda.ts`, `cobranca-de-entrada.ts` e nas vias de compra; `src/domain/cpf.ts` valida CPF e CNPJ. As variáveis `NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL` e `NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL` existem na Vercel; só valem num deploy novo. Falta conferir em produção.

## 2. Decisões e o porquê
- **Conta da Áurea:** não paga taxa de negociação nem custódia. **Conta do CEO:** não paga custódia em nenhuma moeda dele (ciclo, entrada, compra), mas paga comissão normal com clientes. **Áurea ↔ CEO:** sem comissão. **Quem compra do CEO ou da Áurea (contraparte) paga tudo normal**, inclusive a custódia da moeda comprada (Gabriel, 22/11/2026, via Controle). Por quê: a Áurea cobrava de si mesma (fatura de R$ 52 da conta própria, já cancelada no banco).
- **CPF ou CNPJ:** conta PJ aceita; o campo continua `cadastro.cpf` (tipo protegido, sem renomear). `temCadastroCompleto` aceita os dois.
- Comissão zero não gera NFS-e (`pedidosDaNegociacao` já pula valor <= 0).

## 3. O que aprendi (armadilhas, comandos, caminhos)
- Ponto de atenção não codificado: oferta de compra PRÉ-PAGA do CEO paga o total sem saber da contraparte; se casar com a Áurea, o motor cobra menos que o pago (tratado como melhoria de preço). Conferir no teste em produção.
- `resultados.ts` ainda usa só `ehContaDaAurea`; a conta do CEO não sai do "Saldo dos clientes" (decisão aberta do Gabriel, T1).
- Variável `NEXT_PUBLIC_*` vai ao navegador: tipo plain. Relacionada: [[variaveis-da-vercel-sao-minhas]].
