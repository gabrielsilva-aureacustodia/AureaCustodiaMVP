# LOG DE EXECUÇÃO (auditoria) — frente B · primeiro-mes-no-envio

> Append-only. Quem escreve: AUDITORIA B. Não se commita (B2). Não se edita linha antiga; correção vira linha nova.
> Checklist de cada ciclo: a) commit novo · b) arquivo fora do Touch · c) segredo/.env.local em staged · d) MD de execução atualizado (E4) · e) lint/typecheck/suíte por arquivo (E3) · f) trava/regra não pedida (R10/R13) · g) palavra proibida pelo jurídico · h) migration fora da 052 · i) superfície protegida sem anotar · j) nome do chat (R12) · k) `custodia-da-moeda.ts` / preço R$ 2,00 alterados.

## 2026-11-17 22:21 — baseline (ciclo 0)
- Rotina de auditoria criada (cron `*/3`, job 5614f9ac; expira em 7 dias).
- Git: branch `claude/manut-primeiro-mes-no-envio-1ff25c` sobre `9e21fe1`; 0 commits novos; único arquivo novo (untracked): o MD de execução (esperado, não se commita). `git diff --name-only` vazio.
- MD de execução: última escrita 22:20; nenhum tópico iniciado (T1–T5 pendentes).
- Desvios: nenhum. Correção pedida: nenhuma.

## 2026-11-17 22:22 — B/auditoria: sem mudança
- Git igual ao ciclo 0 (9e21fe1, 0 commits, diff vazio; só os 3 MDs untracked). MD de execução ainda 22:20.

## 2026-11-17 22:25 — mudou: T1 em andamento
- Novo (untracked): src/server/actions/primeiro-mes-em-toda-compra.test.ts (326 linhas). Dentro do Touch (teste novo). 0 commits; diff rastreado vazio; MD de execução tocado 22:21.
- a) sem commit · b) ok · c) sem segredo/.env no arquivo · d) T1 ainda "pendente"/em andamento, nenhum tópico fechado: sem cobrança por ora (E4 vale ao fechar) · e) nenhuma suíte observada · f) sem trava nova · g) sem palavra proibida (match "token" não houve) · h) sem migration · i) superfície protegida intocada · k) custodia-da-moeda.ts e preço de R$ 2,00 intactos (o teste usa tabela de R$ 3,50 só como fixture para provar que não há número fixo).
- Desvio: nenhum. Correção pedida: nenhuma. Atenção ao fechar T1: registrar o log e Estado no MD e o relatório pesquisa/B-existe-x-falta.md.

## 2026-11-17 — alerta de memória recebido do Controle (via chat de branch)
- 0,2 GB RAM livre. Modo barato até novo aviso: sem abrir sessão, sem build/dev/typecheck/teste; só pré-checagem + LOG/CONTINUIDADE. Se erro 1455: registrar e esperar. Se a Execução rodar build/dev/suíte inteira: avisá-la e avisar o chat de branch.

## 2026-11-17 22:26 — check-up do chat de branch
- T1 marcado feito no MD (carimbo "22:30", relógio real 22:26: hora estimada, inofensivo). Novos untracked: pesquisa/ e o teste. 0 commits, diff vazio, nada fora do Touch. Desvio: nenhum.

## 2026-11-17 22:27 — B/auditoria: sem mudança
- Git e MD (22:25) iguais ao ciclo anterior.

## 2026-11-17 22:31 — mudou: T2 em andamento
- Modificados (Touch ok): custody.ts, plano-custodia.ts (-89 linhas, na maior parte remoção), conciliacao.ts. Novo: src/domain/primeiro-mes-do-envio.ts (153 l).
- a) 0 commits · b) DESVIO LEVE: primeiro-mes-do-envio.ts fora do Touch e não anotado no MD (E7) · c) sem segredo · d) T2 ainda aberto, MD 22:25 sem log de T2 (cobrar ao fechar) · e) nada rodado visível · f) sem trava nova · g) sem palavra proibida no diff · h) sem migration · i) types.ts/constants/fees intactos · k) custodia-da-moeda.ts intacto, sem 200 fixo no arquivo novo.
- Correção pedida: mensagem à Execução (local_c869252d) para anotar o arquivo novo em Touch e atualizar o MD ao fechar T2.

## 2026-11-17 22:32 — check-up do chat de branch
- Chat de branch APROVOU primeiro-mes-do-envio.ts como arquivo novo só da B. Ainda NÃO anotado no MD (0 ocorrências; MD 22:25). Novo modificado: frete-envio.test.ts (Touch ok). 0 commits. T2 em andamento. Pedido à Execução de anotar já enviado (22:31).

## 2026-11-17 22:34 — regra permanente recebida (Gabriel via Controle)
- "Nada de servidores locais ou containers, tudo sempre direto pra produção." Novo item da rotina (l): Execução NÃO pode subir npm run dev/preview/navegador local/container; se subir, mandar encerrar e registrar aqui. Typecheck/build/suíte só no T5 e só com liberação do chat de branch.
- Conferência agora: nenhum processo node de dev/test ligado à worktree. MD ainda diz no T3 "Tela conferida no navegador local (preview)" — correção pedida: virar "conferência visual pendente em produção (Controle, após o merge)".

## 2026-11-17 22:36 — ciclo inconclusivo (memória)
- git status falhou: "Out of memory, malloc failed" (máquina sem RAM; não é erro 1455 de sessão). Não repeti em laço. log: 0 commits (9e21fe1). MD de execução ainda 22:25: sem anotação de primeiro-mes-do-envio.ts nem ajuste do T3 (mensagens à Execução seguem enfileiradas). Sem processo node de dev/teste da worktree. Próximo ciclo tenta o status de novo.

## 2026-11-17 22:38 — mudou: T1 e T2 feitos
- Git: 0 commits (9e21fe1). Modificados (Touch ok): custody.ts, plano-custodia.ts, conciliacao.ts, frete-envio.test.ts, conciliacao.test.ts. Novos: primeiro-mes-do-envio.ts (agora anotado no MD, aprovado pelo chat de branch), primeiro-mes-em-toda-compra.test.ts. MD 22:36: T1 e T2 "feito" (E4 ok); T4 não começou.
- DESVIO LEVE (e, relatado pelo chat de branch): a Execução rodou 3 arquivos de vitest juntos + tsc --noEmit sob o alerta de memória (pedido: um arquivo por vez; typecheck só no T5). Sem alarde; resultado não foi alvo de correção.
- Pendente: T3 no MD ainda tem "Tela conferida no navegador local (preview)" (linha 114) — ajuste para "conferência visual pendente em produção" ainda não feito. Sem servidor/preview detectado.
- Demais itens (c, f, g, h, i, k): sem achado; sem migration; custodia-da-moeda.ts e types.ts fora do status.

## 2026-11-17 22:40 — mudou: T3 em andamento
- Novo: envios/page.tsx modificado (Touch ok) e pasta nova src/components/envios/ (MD permite "componente novo pequeno" no T3; confirmar que o MD anota). 0 commits; MD ainda 22:36 (T3 pendente, sem log: normal até fechar). Sem servidor local detectado (conferência visual só em produção). Sem migration; custodia-da-moeda.ts/types.ts fora do status. Desvio: nenhum novo. Pendente: ajustar texto do T3 (navegador local) e, ao fechar, anotar o componente novo em Touch.

## 2026-11-17 22:41 — check-up do chat de branch
- Novo: primeiro-mes-no-envio-recusa.test.ts (teste de T4, Touch ok). 0 commits. MD ainda 22:36: T3 e T4 "pendente" apesar de código (E4 atrasado, já cobrado pelo chat de branch); Touch sem o componente src/components/envios/ (0 ocorrências); aceite do T3 ainda com "navegador local" (1). Sem servidor/preview detectado. Sem migration; custodia-da-moeda.ts/types.ts intactos. Desvio: só a defasagem do MD.

## 2026-11-17 22:43 — mudou: MD atualizado, T1–T4 feitos
- MD 22:42: T1–T4 "feito"; T3 com conferência visual pendente em produção (texto de "navegador local" removido); Touch anota src/components/envios/. Correções de 22:31/22:34/22:41 atendidas. 0 commits (9e21fe1); mesmo conjunto de arquivos; sem migration; custodia-da-moeda.ts/types.ts fora do status; sem servidor local.
- Desvios abertos: nenhum (o vitest+tsc de 22:3x segue como desvio leve registrado). Próximo: T5 (suíte da branch só com liberação do chat de branch); depois relatórios e memória R11.

## 2026-11-17 22:45 — instrução do chat de branch para os relatórios finais
- T5 liberado em PARCIAL (eslint só dos arquivos da B, vitest só dos testes da B, --maxWorkers=1, um por vez; suíte inteira no merge). Relatórios só quando a Execução disser "FRENTE B PRONTA" ou o MD marcar T5 feito. Estado agora: T1–T4 feitos, T5 pendente, 0 commits, sem mudança de arquivos desde 22:43.
- Itens obrigatórios dos relatórios: (a) fiscal: recusa devolve o mês por estorno no ledger mas NÃO cancela a NFS-e do mês; na recusa total a fatura segue paga (decisão Gabriel/contador, perguntas 1–3 no registro); (b) pendência para H: desconsiderarEnvio devolve só o frete; (c) sem contrato dos Correios o mês é fatura paga na tela; (d) Pix de compra aberto antes de mudar a tabela. Linha para os índices ao fim da CONTINUIDADE.

## 2026-11-17 22:46 — B/auditoria: sem mudança
- Git e MD (22:43) iguais ao ciclo anterior; T5 ainda pendente.

## 2026-11-17 22:50 — fechamento da frente (T1–T5 feitos)
- Execução fechou T1–T5 (MD 22:46). Auditoria confere: 0 commits sobre 9e21fe1; 6 modificados + novos (domínio, components/envios, 2 testes de ação), todos anotados no Touch; sem migration; custodia-da-moeda.ts/types.ts/fees/constants intactos; sem segredo; sem servidor local; MD atualizado (E4 ok); eslint/vitest(8 arq., 82 verdes)/tsc relatados pela Execução, suíte inteira e eslint src para o Controle.
- Desvios do ciclo todo: (1) vitest x3 + tsc sob alerta de memória (leve); (2) incidente 23:30 (carimbo estimado) de tsc+eslint src+suíte em segundo plano, encerrado na hora; (3) MD defasado de 22:36 a 22:42, corrigido após cobrança; (4) carimbos estimados nos tópicos T2–T5. Nenhum desvio aberto.
- Entregues: RELATORIO_EXECUCOES, _RESUMO, RELATORIO_MODIFICACOES, _RESUMO, RELATORIO_FEATURES (docs/diario/execucoes/) e memória R11 (docs/memorias/2026-11-17--claude-code--manut-primeiro-mes-no-envio.md).

## 2026-11-17 22:49 — B/auditoria: sem mudança
- Mesmos arquivos de código, 0 commits (9e21fe1); MD 22:46 (já lido no fechamento). Frente pronta, aguardando merge do Controle.

## 2026-11-17 22:52 — B/auditoria: sem mudança
- Código e MD (22:46) iguais; 0 commits (9e21fe1). Aguardando merge.

## 2026-11-17 22:55 — COMMIT NOVO 8f5cf4f
- 8f5cf4f "Envio: frete e 1º mês de custódia numa só cobrança, recusa devolve o mês da moeda" (conta gabrielsilva-aureacustodia, 22:54) sobre 9e21fe1, nesta branch. 21 arquivos, +1979/-188: todo o código da B + MDs de trabalho + 5 relatórios + memória R11 + pesquisa. Working tree limpo.
- Avaliação: B1 proíbe commit DURANTE a branch; este veio depois de "FRENTE B PRONTA" e da papelada, provavelmente pelo Controle/Gabriel (autor = conta do Gabriel; a Auditoria não sabe quem executou). Conteúdo conferido: sem .env.local/segredo, sem migration, sem custodia-da-moeda.ts/types.ts/fees/constants. Observação: o commit leva MD de execução/LOG/CONTINUIDADE (B2 diz commit só após execução completa — cumprido) mas esses MDs ficaram congelados nesta versão; edições posteriores da Auditoria vão como alteração nova. Correção pedida: nenhuma; informar o chat de branch.
