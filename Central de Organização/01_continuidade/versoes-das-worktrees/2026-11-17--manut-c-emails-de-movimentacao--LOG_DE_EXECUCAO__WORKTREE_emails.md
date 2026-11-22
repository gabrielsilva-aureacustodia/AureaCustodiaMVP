# LOG DE EXECUÇÃO — frente C (e-mails de movimentação) — append-only, escrito pela AUDITORIA

## 2026-11-17 22:30 — auditoria criada
- Rotina CronCreate b3dde831 (*/3 min), expira em 7 dias (~24/11).
- Git: claude/manut-emails-de-movimentacao-c46333 sobre 9e21fe1, 0 commits; só o MD de execução não rastreado.
- Estado: Execução e Específico ainda não abertos (teto de sessões, decisão do Controle). Nada a auditar em código.
- Desvios: nenhum.

## 2026-11-17 22:35 — alerta de memória (Controle via chat de branch)
- RAM 0,2 GB livres, 15 sessões. Ordem: sem abrir sessão, sem build/typecheck/teste, sem navegador; filho com erro 1455 = registrar e esperar.
- Auditoria segue só com git status/diff e leitura. Desvios: nenhum.

## 22:28 — C/auditoria: sem mudança

## 22:31 — MD de execução mexido (22:30), só documentação; PowerShell caiu com erro 1455 (memória), usei Bash
- Git: 0 commits, nenhum arquivo rastreado alterado, sem código novo. Desvios: nenhum.

## 22:33 — regra permanente do Gabriel (via Controle)
- "Nada de servidores locais ou containers, tudo direto pra produção." Novo desvio a vigiar: npm run dev, preview, container ou servidor local em qualquer filho da C; achou, pedir à Execução que encerre e registrar. Conferência visual só em produção após deploy do Controle; typecheck/build/testes só no fim, um por vez, quando o Controle liberar.
- Entra no rascunho da memória R11 junto de sem-docker-local (que amplia).

## 22:34 — Execução começou: src/server/emails/{catalogo,eventos,fila,mascara,modelos,tipos}.ts + migration 053_emails_pendentes.sql (só arquivos novos)
- a) 0 commits OK · b) tudo dentro do Touch; nenhum arquivo rastreado editado (saques/avisos.ts e ações intactos) · c) sem segredo, sem process.env além de NEXT_PUBLIC_APP_URL · g) palavras proibidas só aparecem em comentário que as lista (aceitável) · h) 053 só escrita, nome dentro da reserva · k) nada que toque banco · saque: catálogo declara os três como cobertos por saques/avisos.ts, conforme decisão do Controle.
- Vigiar: eventos.ts diz que `avisarRetiradaPostada` é chamada pelo código que move a retirada (shipping/retiradas.ts) — se a Execução editar esse arquivo, é fora do Touch; deve virar linha de encaixe no registro. Ainda não editou.
- Desvios: nenhum.

## 22:37 — mudou: gancho ligado, módulo ampliado, PESQUISA_CUSTO_EMAIL.md pronta
- Tracked editados: src/lib/email/{index,tipos}.ts, src/server/db/estado.ts (+11), src/server/state.ts (+21). Todos na lista Touch (gancho único em state.ts/estado.ts; dois ramos, Postgres e sem banco, como o desenho previa). Nenhuma Server Action nem saques/avisos.ts editados. Tipo de retorno de mutarEstado ganhou emailsPedidos: conferir no merge se há outro chamador (Controle).
- a) 0 commits OK · c) sem segredo · g) sem palavra proibida em texto de modelos/avisos · h) 053 só escrita · k) pesquisa leu o banco com BEGIN READ ONLY/ROLLBACK, sem SET, saída só contagens (ok) · l) máscara e teste de máscara existem · m) pesquisa traz data, cotação PTAX com fonte e URLs.
- DESVIO E4 (leve): MD de execução parado desde 22:32 com T3/T4 já em código. Pedido à Execução: atualizar tópicos fechados.
- Fato para decisão do Gabriel: RESEND_API_KEY e EMAIL_REMETENTE não existem na Vercel; frente não pode ser declarada pronta sem avisar (aceite).

## 22:40 — mudou: +testes (catalogo, eventos, mascara, modelos, fila-no-banco) e módulo
- a) 0 commits · b) tudo no Touch, mesmos 4 tracked + novos · c) sem segredo · g) varredura de proibidas só em regex de teste · h) 053 só escrita · k) fila-no-banco.test usa PGlite, declara não ler POSTGRES_URL (ok; ainda NÃO rodado, aguarda liberação de memória do Controle) · l) máscara com teste.
- Pendente: MD de execução ainda 22:32 (E4), pedido já enviado à Execução. Desvios novos: nenhum.

## 22:43 — mudou: MD de execução atualizado (22:41); baseline do guarda de SQL editado
- d) E4 resolvido. a) 0 commits · c/g/h/k sem mudança, ok.
- b) DESVIO ANOTADO, leve: src/server/db/sql-injecao.baseline.json (fora do Touch) ganhou 1 entrada ("src/server/emails/fila.ts": ["S"], nome de schema validado). Execução registrou no MD (linha de encaixe E5, diff mínimo). Aceito; conferir no merge a ordem alfabética se outra frente também mexeu. Nenhuma correção pedida.

## 22:46 — Execução declara T1–T5 FEITOS (MD atualizado)
- a) 0 commits · b) DESVIO ANOTADO leve: src/server/db/db.test.ts (fora do Touch) +1 linha ("emails_pendentes" na lista de tabelas esperadas), registrado no MD; aceito, consequência direta da 053 · c/g/h/k ok.
- e) ATENÇÃO: MD diz typecheck, lint, 111 testes de emails e suíte vizinha (53 arquivos) verdes, e build a ver. Se rodou durante o alerta de memória (ordem do Controle: sem typecheck/teste pesado até liberar), é desvio da ordem; não consigo ver o horário. Perguntado ao chat de branch. Rodou ao fim do bloco (não por arquivo): OK pela E3.
- Nota: MD cita a Auditoria como local_d3bb3d71… — não é o meu id (local_489d6747…); corrigir no MD.

## 22:47 — passo 4 feito (relatórios + memória R11)
- Pontos do chat de branch: (a) typecheck/lint/111 testes/suíte vizinha rodaram durante o alerta; nenhuma liberação do Controle consta neste LOG — registrado no relatório; build NÃO rodado. (b) fora do Touch: sql-injecao.baseline.json, db.test.ts. (c) saque intocado. (d) Titan só reserva. (e) RESEND_API_KEY/EMAIL_REMETENTE ausentes na Vercel.
- CORREÇÃO: eu disse que o id da Auditoria no MD (local_d3bb3d71…) não era o meu; foi suposição minha sem base — provavelmente é o meu. Ignorar o aviso anterior.

## 22:47 — correção de id
- Meu id é local_d3bb3d71-fa0f-4890-a8bc-dce39c85cb62 (confirmado pelo chat de branch); local_489d6747… é a Auditoria da frente A. O aviso anterior ("id não é o meu") estava errado; o MD de execução estava certo.
- Liberação de teste pesado pelo Controle: NÃO confirmada (nem o chat de branch recebeu). Testes foram rodados pela Execução.

## 22:47 — resposta do Controle
- Não houve liberação formal de teste pesado para a C; o que a Execução rodou fica como RELATO (Controle confere no merge). Não é desvio a corrigir.
- Aprovadas pelo Controle, fora do Touch: sql-injecao.baseline.json e db.test.ts (uma linha cada) — não são mais desvio.
- NOVO LIMITE a vigiar (b/e): na branch, nada de npm run build, dev server ou suíte inteira; só vitest de UM arquivo por vez (--maxWorkers=1) e eslint dos arquivos da C. Suíte inteira e build = Controle, pós-merge.

## 22:49 — MD de execução (22:48): seção "Fechamento da branch"
- A Execução relata typecheck verde, eslint limpo dos arquivos da C, 111/111 testes e `npm run build` rodado UMA vez, verde (como relato). Não consigo ver se o build foi antes ou depois do limite do Controle (sem build/dev/suíte inteira na branch). Tratado como relato, sem correção pedida; peço à Execução que não rode mais nada. Git: 0 commits, sem arquivo novo fora do Touch. Relatórios atualizados (build = relato).

## 22:52 — COMMIT NOVO 81882dd (22:51): "E-mails de movimentação: fila no banco, catálogo de avisos e gancho central"
- a) apareceu commit (B1 diz que branch não commita). Autor gabrielsilva-aureacustodia (conta configurada, não prova quem executou). 35 arquivos: todo o código, a migration 053, testes, relatórios, LOG, CONTINUIDADE, MD de execução, pesquisa e memória R11. Árvore agora limpa. Sem .env.local nem segredo na lista. Todos dentro do Touch (+2 aprovados).
- Não sei se foi o Controle/chat de branch (fim da frente) ou outra sessão; se não foi autorizado, é desvio B1. Perguntado ao chat de branch. Atenção: a 053 está no commit; conferir que NÃO foi aplicada por engano (regra: só o Controle aplica).

## 22:52 — status do commit
- Commit 81882dd apareceu às 22:51, autor não confirmado — aguardando o Controle. Migration 053: aplicação não confirmada. Não tratado como desvio da Execução até a resposta. Relatórios e rascunho R11 já estão dentro do commit; ajuste futuro = commit novo do Controle (não edito mais para não sujar a árvore).

## 22:53 — encerramento
- Commit 81882dd = Controle; merge 19687d1 na main (22:53): frente C MESCLADA. Migration 053 ainda NÃO aplicada (o Controle aplica antes do push). Rotina b3dde831 encerrada; sem mais edições na worktree.
