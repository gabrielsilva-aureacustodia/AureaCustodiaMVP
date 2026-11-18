# CONTINUIDADE (auditoria) — frente B · primeiro-mes-no-envio

> Não se commita (B2). Quem escreve: AUDITORIA B. Complementa o MD de execução, não o substitui.

## RETOMADA
- **Estado (22:50):** T1–T5 feitos; frente PRONTA PARA MERGE (onda 3, antes de H). Conferência visual do wizard pendente em produção; suíte inteira, `eslint src` e `build` ficam para a bateria do Controle. Sem desvio aberto. Relatórios e memória R11 escritos.
- **Git:** `claude/manut-primeiro-mes-no-envio-1ff25c` sobre `9e21fe1`, 0 commits. Modificados: `envios/page.tsx`, `custody.ts`, `plano-custodia.ts`, `conciliacao.ts`, `frete-envio.test.ts`, `conciliacao.test.ts`. Novos: `src/domain/primeiro-mes-do-envio.ts`, `src/components/envios/` (componente + teste), `primeiro-mes-em-toda-compra.test.ts`, `primeiro-mes-no-envio-recusa.test.ts`; MDs e `pesquisa/B-existe-x-falta.md` em `docs/diario/execucoes/`, memória em `docs/memorias/`. Sem migration.
- **Próximo ato:** o Controle mescla (B1: só ele commita após merge e bateria), confere o wizard em produção; a Auditoria encerra a rotina (job 5614f9ac) com o merge.
- **Pendências que importam:** NFS-e do mês na recusa (contador); `desconsiderarEnvio` só devolve o frete (H); sem contrato dos Correios o mês é pago na tela; Pix de compra aberto antes de mudar a tabela.
- **Arquivos para a main (B6):** os 3 MDs (MD_EXECUCAO, LOG, CONTINUIDADE), os 5 RELATORIO_*, `pesquisa/B-existe-x-falta.md`, a memória R11.

## Linha para os índices (o chat de branch copia; a Auditoria não grava lá)
- **docs/memorias/README.md:** `- [2026-11-17 — Frente B: 1º mês de custódia no envio](2026-11-17--claude-code--manut-primeiro-mes-no-envio.md) — envio cobra frete + 1º mês numa cobrança, recusa devolve o mês; pendências fiscal (NFS-e), H e Correios`
- **INDICE_VEGA:** `docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--*` — frente B (1º mês no envio): MD de execução, log, continuidade, 5 relatórios; código em `src/domain/primeiro-mes-do-envio.ts` e `src/components/envios/`.
- **ESTADO-GERAL (bloco RETOMADA):** frente B pronta para merge na onda 3 (0 commits sobre `9e21fe1`); falta bateria completa, conferência visual em produção e resposta do contador sobre a NFS-e do mês.
