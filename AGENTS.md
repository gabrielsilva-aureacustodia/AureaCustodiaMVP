# AGENTS.md — Áurea Custódia / Real Olímpico

Contexto para agentes que carregam este arquivo automaticamente (Codex e similares).

**A fonte única das regras deste repositório é o [`CLAUDE.md`](CLAUDE.md).** Leia-o por
inteiro antes de qualquer alteração — arquitetura em camadas, regras de negócio protegidas,
restrições de marca e regulatórias, convenções de código e o processo de trabalho.

Este arquivo não repete o conteúdo de propósito: duas cópias das mesmas regras divergem no
primeiro dia em que alguém atualiza só uma delas, e regra divergente é pior que regra
nenhuma.

## Leitura obrigatória adicional para agentes que não são o Claude Code

O Claude Code carrega o `CLAUDE.md` sozinho e tem os comandos `/commit` e `/publicar`
configurados em `.claude/commands/`. Outros agentes precisam compensar isso lendo, nesta
ordem:

1. `CLAUDE.md` — as regras.
2. `docs/diario/CRITICAL_DEBUGS.md` — os defeitos conhecidos e como não reintroduzi-los.
3. `docs/diario/RITUAL_DE_SESSAO.md` — a abertura e o fechamento de toda sessão.
4. `.claude/commands/commit.md` — o checklist de commit vale para todos, não só para o
   Claude Code: inventário, varredura de segredo, typecheck + testes + build, conferência
   de regra de negócio, e só então commit e push.

## As três travas que valem para qualquer agente, resumidas

1. Nada de `@/server/*` importado por Client Component.
2. Não sugerir blockchain, tokenização ou NFT on-chain — decisão registrada com base
   regulatória.
3. Números de negócio (`src/domain/constants.ts`, `fees.ts`, `market.ts`) não se alteram
   sem decisão dos sócios.
