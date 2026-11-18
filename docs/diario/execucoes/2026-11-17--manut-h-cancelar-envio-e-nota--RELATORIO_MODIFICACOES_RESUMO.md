# Resumo de Modificações — frente H

Estrutural hoje:
- Migration 056 (3 colunas aditivas em envios) — NÃO aplicada.
- 3 campos opcionais em `Envio` (superfície protegida) e novas Server Actions de cancelamento (cliente, logística, bancada).
- Trilha `admin.logistica.cancelar_envio`; guardas na bancada (hash intacto).
Você precisa clicar / autorizar:
- Controle: aplicar a 056 no commit, ajustar o corte D-H5 ao dia do deploy, decidir conflitos de merge (`db/diff.ts`).
- Gabriel: confirmar D-H1 (frete de envio já postado não volta) e as decisões da seção 6 do `CASO_ROGERIO.md`.
