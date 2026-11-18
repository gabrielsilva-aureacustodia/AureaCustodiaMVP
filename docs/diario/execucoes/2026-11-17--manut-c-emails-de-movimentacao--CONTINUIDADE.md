# CONTINUIDADE — frente C (e-mails de movimentação)

## RETOMADA
- Estado: auditoria ativa (rotina */3 min, id b3dde831, expira ~24/11). Sem Execução/Específico ainda; nenhum código escrito.
- Git: claude/manut-emails-de-movimentacao-c46333 sobre 9e21fe1, 0 commits.
- Próximo ato: a cada ciclo, conferir a, b…m da seção 6.2 do 02_MODELO + atenções da frente (saques/avisos.ts intocado, banco real, máscara, fonte de preço, migration 053 não aplicada).
- Desvios abertos: nenhum.

## Linhas para os índices (o chat de branch leva ao registro)
- (vazio por ora)

- Vigiar também: servidor local/container/preview (regra do Gabriel). Memória R11 deve citar [[sem-docker-local]] ampliada.

- [22:34] Estado: Execução em T2/T3 (módulo emails + migration 053 escritos, não aplicados). Git 0 commits. Próximo ato: vigiar edição de shipping/retiradas.ts e gancho único em state.ts/estado.ts.

- [22:37] Estado: T1 entregue (PESQUISA_CUSTO_EMAIL.md), T3/T4 em código, gancho ligado em state.ts/estado.ts. Pendente: MD de execução desatualizado; RESEND_API_KEY ausente na Vercel. Git 0 commits.

## Relatórios finais
Escritos em docs/diario/execucoes/ (prefixo 2026-11-17--manut-c-emails-de-movimentacao--): RELATORIO_EXECUCOES, _RESUMO, RELATORIO_MODIFICACOES, _RESUMO, RELATORIO_FEATURES; memória R11 em docs/memorias/2026-11-17--claude-code--manut-emails-de-movimentacao.md.

## Linhas para os índices (o chat de branch leva ao registro; o Controle aplica no merge)
- docs/memorias/README.md: `- [E-mails de movimentação (frente C)](2026-11-17--claude-code--manut-emails-de-movimentacao.md) — fila no banco com chave única, Resend grátis, saque fora da central, sem servidor local; falta RESEND_API_KEY na Vercel`
- docs/INDICE_VEGA.md: src/server/emails/ (central de e-mails de movimentação), migration 053 emails_pendentes (não aplicada), PESQUISA_CUSTO_EMAIL.md
- ESTADO-GERAL: frente C pronta na branch; bloqueio humano = chave do Resend na Vercel; linhas de encaixe E1–E4 e migration 053 para o merge

- Vigiar: novo limite de testes (um arquivo por vez, sem build/dev/suíte inteira).
