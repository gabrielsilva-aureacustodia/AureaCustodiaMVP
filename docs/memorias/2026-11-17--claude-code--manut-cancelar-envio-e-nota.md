# Cancelar envio e nota (frente H) — memória do agente

- **Data:** 2026-11-17 · **Agente:** claude-code (auditoria) · **Projeto/branch:** aurea-custodia / claude/manut-cancelar-envio-e-nota-9f78d5

## 1. Estado em uma tela
Cancelar envio não postado (cliente, equipe, bancada) devolve frete + 1º mês e cancela a NFS-e do 1º mês e a etiqueta. Código e testes por arquivo prontos, **0 commits**; migration 056 escrita e **não aplicada**; typecheck/lint/suíte/build da versão final aguardam o Controle.

## 2. Decisões e o porquê
- Cancelamento também grava `desconsideradoEm`: as ~25 guardas existentes valem sem edição.
- 1º mês pago volta por `estornarFaturaPaga`; **nunca** mexer em `plano.estornadoCents` (o `derivar.ts` lançaria `estorno` duas vezes).
- Dinheiro em `server/shipping/cancelar-envio*.ts`, fora de `'use server'` (todo export vira endpoint).
- "Cancelar validação" não escreve na corrente de hash; fica no `Envio` e em `admin.logistica.cancelar_envio` (motivo + `via`).
- D-H1 (Controle, aguarda Gabriel): envio já postado não devolve frete; constante `DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO=false`.
- D-H5 (Controle 17/11): corte do automático pela data de criação; manual sem corte; valor provisório 18/11/2026 00:00 Brasília.
- Ordem do manual: consultar → cancelar etiqueta → estornar.

## 3. O que aprendi
- Nesta máquina o PowerShell quebra (.NET 4.0 ausente) e a RAM chega a 0,2 GB: usar Bash, vitest de um arquivo (`--maxWorkers=1`), sem build/dev.
- Em Bash, depois de `cd`, `git ls-files | xargs ls` usa caminho relativo: fazer `cd` na raiz da worktree antes.
- Mensagem entre sessões fica "queued": reenviar por id `local_…`, nunca por nome.
- Regra do Gabriel (17/11): nada de servidor local ou container; conferência visual em produção.

## 4. Como continuar
1. Controle mescla H sobre a main (B, C, D, E, I já lá); conflito esperado em `db/diff.ts`/`repositories/envios.ts`.
2. Ajustar `DEVOLUCAO_AUTOMATICA_DO_PRIMEIRO_MES_VALE_PARA_ENVIO_CRIADO_A_PARTIR_DE` ao dia do deploy.
3. Aplicar `056_envio_cancelado.sql` no commit; rodar typecheck, lint, suíte e build.
4. Conferir em produção depois do deploy: cancelar envio de teste, extrato com `estorno`, nota `cancelando`→`cancelada`.

## 5. Pendências e riscos
- Gabriel: D-H1 e decisões da seção 6 do `CASO_ROGERIO.md`.
- Nota de outro mês: janela de cancelamento do contador (dentro do mês) — o resumo traz aviso.
- Trechos fora do Touch a anotar no registro: `cancelar-envio-equipe.ts`, 2 linhas de `envios/page.tsx`.

## 6. Ligações
`docs/MAPA_DO_CANCELAMENTO.md`, `docs/diario/execucoes/2026-11-17--manut-h-cancelar-envio-e-nota--MD_EXECUCAO.md`, `--LOG_DE_EXECUCAO.md`, `--CASO_ROGERIO.md`, `[[migration-nova-se-aplica-no-commit]]`, `[[regra-de-negocio-so-com-pergunta]]`.
