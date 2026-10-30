---
name: checkup-2-ver-como-cliente-e-video
description: Por que "Ver como o cliente vê" dava 404 e o que se sabe sobre o vídeo da bancada que não salva (ordem 7, 30/10/2026)
metadata:
  type: project
---

"Ver como o cliente vê" apontava para `/recibos/[coinId]`, rota que só abre para o dono (404 para a equipe, de propósito). Agora vai a `/admin/moedas/[codigo]/cliente`, leitura com `bancada.auditoria`, usando `FolhaDoRecibo`.

Vídeo: cadastro direto/sem envio grava `caminhoVideo: null` e não tem gravador (`cadastro-direto.ts:226`); a bancada agora avisa e exige confirmação quando a gravação não sobe, e o servidor confere que o caminho é da pasta do protocolo.

**Why:** a equipe não via o recibo do cliente e o operador não percebia vídeo que não subiu.
**How to apply:** `vercel env pull` só dá `[SENSITIVE]` para segredos — leitura de produção exige outro caminho; desligue `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` do ambiente ao usar a CLI. Detalhes em `docs/auditorias/2026-10-30--checkup-2.md`.
