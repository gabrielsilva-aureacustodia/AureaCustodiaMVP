# Relatório de Execuções (detalhado) — frente H · cancelar-envio-e-nota

Projeto: Áurea Custódia / Real Olímpico · Branch: claude/manut-cancelar-envio-e-nota-9f78d5 · Ref_commit: 9e21fe1 · Packet: docs/manutencao-2026-11 (fora do Git)
Datas: 2026-11-17 (22:30 → 23:15). Git final: 0 commits (B1), 18 arquivos modificados e ~20 novos, sem commit. MD de execução: `2026-11-17--manut-h-cancelar-envio-e-nota--MD_EXECUCAO.md` (cobre cada tópico; não recopiado aqui).

## 1. Tópicos na ordem real
1. **T1** — `docs/MAPA_DO_CANCELAMENTO.md` (o que um envio gera × o que cada cancelamento desfaz). Específico entregou 3 pesquisas em `pesquisa/` (caso do Rogério, cancelar pré-postagem, envios fora do corte).
2. **T2** — núcleo `cancelarEnvio` (`src/domain/cancelar-envio.ts`), campos opcionais em `Envio`, migration 056 (NÃO aplicada), mapeamento no repositório e no diff, orquestração `src/server/shipping/cancelar-envio.ts`.
3. **T6** — `desconsiderarEnvio` e a varredura diária passam a devolver o 1º mês e cancelar a nota (sem editar `custody.ts`).
4. **T3** — `cancelarMeuEnvio` (cliente), `CancelarEnvio.tsx`, slot em `HistoricoEnvios.tsx` (+2 linhas em `envios/page.tsx`).
5. **T4** — `cancelarEnvioNoPainel` em `admin/logistica.ts` (`logistica.expedir`), `CancelarEnvioDaEquipe.tsx`, `PainelLogistica.tsx`.
6. **T5** — `cancelarValidacaoNoPainel` em `admin/bancada.ts` (`bancada.analisar`); `estacao/analise.ts` só com guardas.
7. **D-H5** (ordem do Controle, 22:55) — corte do automático por data de criação: constante provisória 18/11/2026 00:00 Brasília + função única `primeiroMesEntraNaDevolucaoAutomatica`.
8. **Troca de ordem** do cancelamento manual: consultar → cancelar a etiqueta → só então estornar.
9. **T7** — `CASO_ROGERIO.md` (registro; o caso já estava resolvido em produção).

## 2. Arquivos tocados (uma linha de porquê)
- `domain/cancelar-envio.ts` (+test) — regra pura, idempotente; constante `DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO=false`, motivo 10–300.
- `domain/envios.ts` (+test) — fase `cancelado`, `devolverPrimeiroMesDoEnvio` (usa `estornarFaturaPaga`; não toca `plano.estornadoCents`), corte D-H5.
- `domain/types.ts` — 3 campos opcionais (`canceladoEm`, `canceladoPor`, `motivoCancelamento`): superfície protegida.
- `server/db/{diff.ts, repositories/envios.ts, migrations/056}` — só aditivos.
- `server/shipping/{cancelar-envio.ts, cancelar-envio-equipe.ts, frete-envio.ts}` (+tests) — I/O fora de `'use server'`; trilha `admin.logistica.cancelar_envio` (motivo, `via`).
- `server/actions/cancelar-envio.ts`, `admin/{logistica,bancada}.ts`, `domain/admin/logistica.ts`, `estacao/analise.ts` (guardas), componentes `envios/`, `custody/HistoricoEnvios.tsx`, `admin/logistica/*`, `admin/bancada/BancadaWeb.tsx`.

## 3. Testes rodados
Execução: typecheck limpo, lint 0 erros, suíte 1.658 verdes (`--maxWorkers=2`) UMA vez, 22:52–23:00, antes do D-H5, da troca de ordem e do alerta de memória do Controle; build interrompido. Depois, só vitest por arquivo (envios 28, cancelar-envio 33, shipping 31, actions+admin 50). Typecheck/lint/suíte/build da versão final: pendentes (Controle). Auditoria não rodou nada.

## 4. Bloqueios para o humano
Gabriel/Controle: ajustar o corte D-H5 ao dia do deploy; aplicar a migration 056 junto com o commit; decisões da seção 6 do `CASO_ROGERIO.md`; D-H1 (frete de envio já postado não volta); conferência visual em produção depois do deploy.

## 5. Desvios da auditoria (todos sanados)
E4 (MD parado 22:29–22:39, sanado); D-H5 ausente 22:41–22:57 (sanado); trechos fora do Touch a anotar (`cancelar-envio-equipe.ts`, 2 linhas de `envios/page.tsx`) — acompanhar no registro. Nenhum commit, hash/`CAMPOS_DA_ANALISE`, `custody.ts`, `quitar-fatura.ts`, `codigos.ts` intactos; sem estorno duplo; sem servidor local.

## 6. Próximo ato (um)
Controle: mesclar H sobre a main (B, C, D, E, I já lá), ajustar o corte, aplicar 056 e rodar typecheck/lint/suíte/build.
