---
name: chave-supabase-nunca-sai-do-env
description: SUPABASE_PUBLISHABLE_KEY fica no .env.local de toda pasta do projeto e nunca é removida; sem ela nenhuma conta entra no npm run dev
metadata:
  node_type: memory
  type: feedback
  originSessionId: 517e8692-a274-4169-8885-bc2745998d75
  modified: 2026-10-25T11:38:17.981Z
---

A `SUPABASE_PUBLISHABLE_KEY` (formato `sb_publishable_…`) precisa estar no `.env.local` do checkout principal **e de
toda worktree** (`AureaCustodiaMVP-*`). Nunca apagar, sobrescrever com vazio, "limpar" ou deixar fora ao recriar/copiar
um `.env.local`. Na Vercel ela é variável **sensível** (a API não devolve o valor), então se sumir daqui não há como
recuperar sozinho.

**Why:** em 25/10/2026 o Gabriel teve de mandar a chave de novo e reclamou que ela "some toda hora quando peço pra
guardar". Sem ela, `createAuthClient` (src/server/auth/config.ts) lança AuthConfigurationError e o login local recusa
toda conta — a Frente 1 do polimento ficou sem conferir as telas logadas por isso.

**How to apply:** ao criar worktree ou `.env.local` novo, copiar a linha do `.env.local` do checkout principal. Antes de
qualquer edição em `.env.local`, conferir que a linha continua lá depois. Se faltar, procurar primeiro nos outros
`.env.local` do projeto; só pedir ao Gabriel se não estiver em nenhum. Ver [[editar-env-local-eu-mesmo]] e
[[variavel-ja-cadastrada-nao-se-pede-de-novo]].
