# LOG de execução (Auditoria, append-only) — frente I · manut-numero-da-moeda

```
Branch: claude/manut-numero-da-moeda-3dedde · Base: 9e21fe1
Auditoria: rotina */3 min (job 71d825d2). Escreve só este LOG, a CONTINUIDADE, os relatórios finais e a memória R11.
```

## 2026-11-17 22:25 — ciclo 0 (linha de base)
- Git: 0 commits novos (HEAD 9e21fe1), 0 arquivos rastreados alterados; só o MD de execução está untracked (esperado).
- MD de execução: Atualizado 22:20 (T1–T4 pendentes). Inclui a decisão do Controle de 22:30 sobre o Admin (prop opcional, sem editar fora do Touch).
- Checagens a–j: sem desvio. Nome do chat bate (R12).
- Observação (não é desvio): ficha lista `Touch` sem o Admin `page.tsx` nem `src/styles/**`; Execução já foi avisada no MD.

## 2026-11-17 22:26 — ciclo 1
- Mudou: só o MD de execução (T1 fechado, decisão: número = `Coin.id`, rótulo "Moeda nº RO-000042" num arquivo único `numero-da-moeda.ts`; T2 em andamento). Git: 0 commits, nenhum arquivo rastreado alterado, nenhum código de produto ainda.
- Checagens a–j: sem desvio. MD atualizado ao fechar T1 (E4). Arquivo novo planejado `numero-da-moeda.ts` fica em `src/components/recibo/**` (dentro do Touch). Sem migration, sem hash.ts/types.ts.
- Observação: o cabeçalho do MD ainda diz "Atualizada em 22:20" (os horários de 22:41 do log estão à frente do relógio da máquina, 22:25): cosmético, sem correção pedida.

## 2026-11-17 22:30 — aviso do chat de branch (alerta de memória do Controle)
- Recebido: RAM quase esgotada (erro 1455 possível). Modo econômico até novo aviso: sem abrir sessão/subagente, sem build/dev/lint/typecheck/suíte; só pré-checagem em código (git status/diff/log, LastWriteTime) e "I/auditoria: sem mudança" quando nada mudou; se a Execução cair com 1455, registrar aqui e avisar o chat de branch sem reabrir em laço; se vier "pausar", CronDelete 71d825d2.

## 2026-11-17 22:28 — ciclo 2
- Mudou (código, T2 em andamento): `Certificate.tsx` (passa `numeroDaMoeda={coin.id}`), `FolhaDoRecibo.tsx` (prop opcional, linha dentro de `.cert-code`), `ReciboCard.tsx` (linha `.recibo-code`), novo `numero-da-moeda.ts` (rótulo único "Moeda nº" + NBSP). Tudo dentro do Touch.
- a) 0 commits · b) nada fora do Touch (Admin e `src/styles/**` intactos; sem CSS novo, classe `cert-numero-da-moeda` só como gancho) · c) sem .env/segredo em alteração · d) MD de execução: T1 registrado; T2 ainda aberto (conferir ao fechar) · e) nenhum lint/typecheck/suíte rodado (e agora vale o modo econômico) · f) nenhuma trava/regra nova · g) sem palavra proibida · h) sem migration · i) `hash.ts`/`types.ts` intocados; comentário diz que hash não lê o helper · j) nome bate.
- Pendências a conferir nos próximos ciclos: MD de execução atualizado ao fechar T2 com a linha de encaixe do Admin (decisão do Controle); `numero-da-moeda.test.ts` citado no comentário ainda não existe (T4).
- Desvio: nenhum.

## 2026-11-17 22:33 — ordem do Gabriel (via chat de branch): item (k)
- Nova checagem (k) a cada ciclo: subiu servidor local/preview/container, ou criou .env.test.local / arquivo em .claude/? Nos relatórios finais registrar: conferência visual em navegador fica para produção, por ordem do Gabriel.
- Achado: `.env.test.local` existe na worktree (criado 22:27, 401 bytes, ignorado pelo git; autor não confirmado). DESVIO (k) → correção pedida à Execução: apagar e não subir servidor/preview. `.claude/` (commands, launch.json, settings.local.json, 22:16) é o da base, rastreado: sem desvio. Porta 3104 livre (informado pelo chat de branch); porta 3000 tem listener sem dono identificado (provavelmente fora desta worktree): sem ação.

## 2026-11-17 22:36 — item (k) ajustado (chat de branch, suavização do Gabriel)
- Nova redação de (k): "deixou servidor local de pé, ou subiu mais de um / sem necessidade? criou .env.test.local ou arquivo em .claude/?" Servidor pontual para conferir tela é aceitável DEPOIS que o Controle liberar a memória; até lá o alerta segue (sem dev server/preview/build). Docker/container: nunca.
- O desvio das 22:33 por `.env.test.local` fica como está (arquivo criado na worktree; correção pedida à Execução); servidor em si não era o problema.

## 2026-11-17 22:37 — ciclo 3
- Mudou: T2 e T3 fechados no MD (T4 em andamento). Novo: `recibo-pdf.ts` (linha do número em y=185, campos começam em y=206 em vez de 198, selo/rodapé +8 pt; `baixarReciboPdf` dividido em `montarReciboPdf` para testar), `numero-da-moeda.test.ts` e `recibo-pdf.test.ts` (novos). Todos dentro do Touch.
- a) 0 commits · b) nada fora do Touch · c) sem segredo · d) MD atualizado a cada tópico (E4) · e) nenhuma suíte rodada por arquivo (testes escritos, sem execução: correto) · f) sem trava nova · g) sem palavra proibida (busca nos 3 arquivos) · h) sem migration · i) `hash.ts`/`types.ts` intocados · j) nome bate.
- (k) servidor local: não verifiquei processo (modo economia); sem indício no git. `.env.test.local` AINDA existe (22:27): desvio de 22:33 continua aberto; mensagem à Execução está na fila.
- Nota (não é desvio): o respiro de 8 pt no PDF mexe nas coordenadas do selo/rodapé; está registrado no comentário e dentro da folga medida.
- Pendências: linha de encaixe do Admin ao chat de branch (conferir no fim); suíte/typecheck só ao fim (T4).

## 2026-11-17 22:37 — ciclo 4
I/auditoria: sem mudança (0 commits; mesmos 4 arquivos alterados + 3 novos; MD de execução 22:31). Aberto: .env.test.local ainda existe (desvio (k) de 22:33, correção na fila da Execução).

## 2026-11-17 22:42 — FRENTE I PRONTA (aviso do chat de branch): relatórios e memória
- Desvio (k) resolvido: `.env.test.local` não existe mais (conferido); MD de execução registra remoção às 22:36 e portas 3104/3110 livres.
- Estado final: 0 commits; 4 alterados + 3 novos de código, todos no Touch; hash.ts/types.ts/styles/.claude intocados; T1–T4 fechados; 15/15 testes e tsc exit 0.
- Escritos: RELATORIO_EXECUCOES, _RESUMO, RELATORIO_MODIFICACOES, _RESUMO, RELATORIO_FEATURES e memória R11 `docs/memorias/2026-11-17--claude-code--manut-numero-da-moeda.md`. Pendentes em negrito nos relatórios: suíte completa, ESLint, visual em produção, linha do Admin (Controle).
- Rotina de 3 min apagada (CronDelete 71d825d2).
