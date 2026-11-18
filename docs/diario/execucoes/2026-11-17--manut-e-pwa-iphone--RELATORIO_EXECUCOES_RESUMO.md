Branch: claude/manut-pwa-iphone-eb49d6 (frente E · pwa-iphone) · base 9e21fe1 · 0 commits durante o trabalho
Feito:
- T1 diagnóstico dos 8 pontos + pesquisa iOS 27.x
- T2 (replanejado) leitura HTTP de produção: produção == código
- T3 2 defeitos nossos corrigidos (meta iOS; texto do painel) + testes novos
- T4 painel do iPhone revisado + roteiro de aparelho real (10 passos iPhone, 4 Android)
- T5 contrato D↔E escrito no diagnóstico + lote verde
Não feito: Lighthouse e emulação WebKit (cancelados por regra do Gabriel: sem servidor local); build, suíte inteira e lint (ficam para a bateria pós-merge do Controle).
Bloqueio para você: testar no iPhone/Android real depois do deploy (docs/pwa/ROTEIRO_IPHONE_REAL.md).
Próximo ato: "FRENTE E PRONTA" ao chat de branch; bateria pós-merge do Controle.
Teste: verde · T5: verde às 22:50 (17/11): `npm run typecheck` sem erro; `vitest run --maxWorkers=1 src/lib/pwa src/components/pwa src/middleware.test.ts` = 5 arquivos, 86 testes, 0 vermelhos. Não rodados por ordem do Controle: build, `npm test` inteiro, lint (bateria pós-merge)



**NÃO FEITO: teste em iPhone real e em Android real (Gabriel/Rogério, depois do deploy); Lighthouse e emulação WebKit (cancelados por regra do Gabriel: sem servidor local); `npm run build`, `npm test` inteiro e `npm run lint` (bateria pós-merge do Controle).**

Git: Durante o trabalho da branch: 0 commits (B1 respeitado). Depois do "FRENTE E PRONTA" apareceu o commit 82257a7 (22:54), feito fora da branch de trabalho (autoria operacional a confirmar com o Controle); working tree limpa naquele momento.

