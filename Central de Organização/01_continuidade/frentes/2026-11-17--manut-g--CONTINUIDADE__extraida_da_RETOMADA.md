# Continuidade da frente G · Notas: NFS-e acessível ao cliente (extraída)

> **Arquivo gerado pela Central de Organização em 22/11/2026.** A frente G não tem arquivo `--CONTINUIDADE.md` próprio; o estado vivo dela mora no bloco RETOMADA do MD de execução `docs/diario/execucoes/2026-11-17--manut-g-notas-do-cliente--MD_EXECUCAO.md`. Este arquivo é só uma cópia desse bloco (o original manda; releia lá). Nada foi inventado.

---

## RETOMADA (ler primeiro)

- **Estado:** T1–T5 FECHADOS. A frente está pronta para o merge do Controle.
- **Próximo ato (do Controle):** merge → `npm run typecheck`, `npm test`, `npm run build` completos → deploy → conferir `/conta/notas` e `/conta/faturas` em produção (320/375/430 px, claro e escuro).
- **Git:** branch sobre `0f55132`, **0 commits** (B1: o Controle commita). 4 arquivos alterados + 12 novos (lista na seção Sessões). `node_modules` (junção) e `.env.local` (cópia) estão na worktree e são ignorados pelo Git.
- **Regras de máquina (Controle, 18/11):** nada de `npm run build`, `typecheck` completo, suíte inteira, servidor local ou Docker; só `eslint` dos arquivos da frente e `vitest` de UM arquivo por vez; conferência visual só em produção, depois do deploy do Controle.

