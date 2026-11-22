# Relatório de Modificações — frente H · cancelar-envio-e-nota

Base comparada: 9e21fe1 (main antes das frentes). Branch: claude/manut-cancelar-envio-e-nota-9f78d5.

| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Migration 056: 3 colunas aditivas em envios (`cancelado_em`, `cancelado_por`, `motivo_cancelamento`) | infra/crítico | `src/server/db/migrations/056_envio_cancelado.sql` | Aplicar no banco junto com o commit (memória migration-nova-se-aplica-no-commit); sem ela o cancelamento não grava |
| Campos opcionais de cancelamento em `Envio` | contrato (superfície protegida) | `src/domain/types.ts` | Aditivo; o Controle leva ao Gabriel |
| Mapeamento das colunas | crítico | `server/db/diff.ts`, `server/db/repositories/envios.ts` | Só aditivo; a frente C também mexe em `diff.ts`: conflito de merge é do Controle |
| Núcleo do cancelamento | regra de negócio | `src/domain/cancelar-envio.ts`, `domain/envios.ts` | Devolve frete + 1º mês (via `estornarFaturaPaga`) e marca a nota para cancelar; `plano.estornadoCents` não é tocado |
| Corte D-H5 | decisão de cobrança | constante em `domain/envios.ts` | Valor provisório 18/11/2026 00:00 Brasília; Controle ajusta ao dia do deploy |
| Constante do frete de envio já postado | decisão de cobrança | `DEVOLVE_FRETE_DE_ENVIO_JA_POSTADO=false` | Gabriel troca em uma linha; teste a trava |
| Ações novas | contrato (Server Actions) | `server/actions/cancelar-envio.ts`, `admin/logistica.ts`, `admin/bancada.ts` | Permissão por conta própria; dinheiro em arquivo não `'use server'` (`server/shipping/cancelar-envio*.ts`) |
| Trilha de auditoria | crítico | `admin.logistica.cancelar_envio` (motivo, `via`) | Painel e bancada gravam a mesma trilha |
| Guardas na bancada | crítico | `server/estacao/analise.ts` | Fila/abrir/fechar ignoram envio cancelado; hash e `CAMPOS_DA_ANALISE` intactos |
| Varredura diária | crítico | `server/shipping/frete-envio.ts` | Consulta antes de cancelar etiqueta; devolve 1º mês dentro do corte |
| Telas | UI | `components/envios/`, `custody/HistoricoEnvios.tsx`, `admin/logistica/*`, `admin/bancada/BancadaWeb.tsx`, 2 linhas em `app/(app)/envios/page.tsx` | Botões de cancelar |

Não mudou: `custody.ts`, `quitar-fatura.ts`, `nfse/codigos.ts`, hash da análise, wizard de envio, `lib/shipping/**`.
Documentação: `docs/MAPA_DO_CANCELAMENTO.md`, `CASO_ROGERIO.md`, pesquisas do Específico. Pasta nova na raiz: nenhuma. Variável de ambiente nova: nenhuma.
