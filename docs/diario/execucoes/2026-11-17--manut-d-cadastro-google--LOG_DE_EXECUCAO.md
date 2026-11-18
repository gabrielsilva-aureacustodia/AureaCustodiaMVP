# LOG DE EXECUÇÃO — frente D (manut-cadastro-google) — append-only

## 17/11/2026 22:26 — ciclo 1
- Git: branch claude/manut-cadastro-google-8d269f, HEAD 9e21fe1 (base), 0 commits novos (B1 ok), 0 arquivos de código alterados.
- Único arquivo novo: MD_EXECUCAO (criado 22:23, não rastreado; não se commita antes do fim).
- Desvios: nenhum. A Execução ainda não tocou código.

## 17/11/2026 — aviso do chat de branch (alerta de memória do Controle)
- 0,2 GB de RAM livre, 15 sessões ativas. Auditoria só roda git status/log/diff e data do MD; nada de build, dev, typecheck, lint ou teste.
- Nova conferência: a Execução não deve rodar dev server, build nem teste enquanto o alerta valer; se rodar, avisar a ela e ao chat de branch.
- Erro 1455 na Auditoria: anotar uma linha aqui e esperar, sem reabrir em laço.
- Item (l) só vale se o arquivo de demonstração aparecer (Específico suspenso).

## 17/11/2026 22:3x — ciclo 2
- Mudou: LoginForm.tsx, RegisterForm.tsx e login.css alterados; novos EmailAlternativo.tsx e GoogleButton.tsx (todos dentro do Touch). 0 commits (B1 ok). MD de execução ainda em 22:23:51.
- Conferido: sem migration, sem src/domain, sem .env, sem landing/layout; OAuth na mesma janela (sem window.open; só comentário); campos, minLength, arbitragem, evento do Pixel (rastrearPadrao) e mensagens do e-mail/senha mantidos; declaração legal fica sob o botão do Google ("Ao continuar com o Google, você declara…"); sem palavra proibida em texto novo; sem trava nova.
- Observação (não é desvio): MD de execução sem atualização desde 22:23 apesar de código novo (E4); pedir atualização ao fechar o tópico T2. Nada de build/teste foi observado (alerta de memória).

## 17/11/2026 ciclo 3
D/auditoria: sem mudança (mesmos 5 arquivos de código, 0 commits, MD de execução ainda 22:23:51; sem public/demonstracao).

## 17/11/2026 — nova regra permanente (repassada pelo chat de branch)
- Gabriel (via Controle): "nada de servidores locais ou containers, tudo direto pra producao". Sem npm run dev, preview, container ou servidor local de teste em todas as frentes.
- Nova conferencia da Auditoria: se a Execucao abrir dev server ou preview, avisar a ela e ao chat de branch. Conferencia visual vira "depois do deploy"; T2 fecha com teste de render. Especifico (T4) segue suspenso. Alerta de memoria continua: so comandos leves.

## 17/11/2026 ciclo 4
D/auditoria: sem mudança (mesmos 5 arquivos de código, 0 commits, MD de execução ainda 22:23:51, sem public/demonstracao).

## 17/11/2026 22:35 — servidor local achado (registro a pedido do chat de branch, sem culpar ninguem)
- O Controle encerrou um next dev da worktree (porta 3000, criado 22:32:59, 656 MB), subido depois da pausa de memoria; provavel que a Execucao ainda nao tivesse lido as mensagens da fila.
- Regra vigente: so ler, editar e, se indispensavel, vitest de UM arquivo por vez. Auditoria segue conferindo se surge outro servidor, build, typecheck ou suite completa, e avisa o chat de branch.

## 17/11/2026 ~22:40 — ciclo 5
- Mudou: novo src/components/login/DemonstracaoDoCadastro.tsx (dentro do Touch); MD de execucao atualizado 22:38:40 (E4 ok). 0 commits; sem migration, dominio, env, landing/layout.
- DESVIO (regra do Gabriel: sem servidor local): `npm run dev` ativo na worktree (PIDs 44244, 56212; next start-server 52432 ~928 MB, pelo caminho). Pedido a Execucao para encerrar; chat de branch avisado. Nao encerrei processo (nao e meu).

## 17/11/2026 ~22:45 — ciclo 6
- Mudou: novos testes src/app/cadastrar/pagina.test.ts, src/app/entrar/pagina.test.ts, src/components/login/FormulariosDeAcesso.test.ts (dentro do Touch: login e rotas cadastrar/entrar). 0 commits; sem migration, dominio, env, landing/layout; public/demonstracao ainda nao existe.
- Servidor local: o npm run dev / next start-server do ciclo 5 nao aparece mais. Ha processos de vitest e `npm test` ativos na maquina, mas nao consegui atribuir a nossa worktree (um vitest e de outra worktree); sem acusacao.
- Observacao: MD de execucao parado em 22:38:40 com testes novos escritos depois; pedir atualizacao ao fechar T5 (E4).

## 17/11/2026 ~22:48 — ciclo 7
- Mudou: README.md de src/app/cadastrar e src/app/entrar atualizados (dentro do Touch; R3 ok); MD de execucao atualizado 22:45:33 (E4 ok, observacao do ciclo 6 resolvida). 0 commits; nenhum processo node ligado a worktree (sem dev server/build); public/demonstracao ainda nao existe.
- Desvio: nenhum.

## 17/11/2026 ~22:55 — FRENTE D PRONTA (fim)
- Relatorios (execucoes detalhado e resumo, modificacoes detalhado e resumo, features) e memoria R11 escritos; linhas para README de memorias, INDICE_VEGA e ESTADO-GERAL enviadas ao chat de branch.
- Desvios do periodo: servidor local nos ciclos 2/5 (resolvido); MD de execucao atrasado (resolvido). 0 commits.
- Rotina 9a123cc6 encerrada (CronDelete).
