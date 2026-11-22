# Continuidade da frente K · Frete: acréscimo de R$ 4,00 (extraída)

> **Arquivo gerado pela Central de Organização em 22/11/2026.** A frente K não tem arquivo `--CONTINUIDADE.md` próprio; o estado vivo dela mora no bloco RETOMADA do MD de execução `docs/diario/execucoes/2026-11-17--manut-k-frete-mais-4-reais--MD_EXECUCAO.md`. Este arquivo é só uma cópia desse bloco (o original manda; releia lá). Nada foi inventado.

---

## RETOMADA (atualizar a cada tópico)

- **Estado:** T1–T5 FECHADOS (18/11/2026). Aceite todo marcado. Falta só a completude ao Controle e, depois do deploy, a conferência visual em produção.
- **D5 confirmado pelo Gabriel (18/11/2026): acréscimo por objeto postado, SÓ NO ENVIO.** Por isso `calcularFreteCorreios` com `sentido: 'saida'` sai sem acréscimo (teste ajustado; correios.test.ts, 13 verdes).
- **Próximo ato:** o Controle faz merge, typecheck, suíte, build e commit; Gabriel aprova o texto da tela.
- **Git:** branch `claude/manut-frete-mais-4-c9a96a` sobre `0f55132`, 14 arquivos alterados + 7 novos, **0 commits**.
- **Regras desta rodada (Controle, 18/11):** sem `npm run build`, sem typecheck completo, sem suíte inteira (memória do computador); só eslint dos arquivos e vitest de UM arquivo por vez; sem servidor local; sem filhos; sem commit.

