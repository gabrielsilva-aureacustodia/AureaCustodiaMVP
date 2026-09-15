# Prompts dos agentes de execução

Um bloco por agente. **E1, E2, E3, E4 e E7 podem ser enviados ao mesmo tempo.** A integração vai quando
as cinco relatarem pronta; **E5, E6 e E8 só depois da integração.** Todo agente segue
`docs/Regras_eficiencia_de_sessao_v1.md`, que prevalece sobre o texto de cada prompt: ler só o que o
documento lista, MD de execução atualizado a cada tarefa, typecheck/lint/suíte/build só no fim da branch
(ou de um bloco grande), commits em blocos funcionais. Cada prompt serve para Claude Code, Codex ou outro agente
com acesso ao repositório e ao terminal.

Todos partem da `main` do GitHub que contém esta pasta. Se o agente abrir numa pasta sem ela, o primeiro
comando do prompt (`git fetch origin`) resolve.

---

## E1 · Portas de entrada da conta

```text
Você é o agente de execução E1 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP.

Sua ordem de serviço é docs/execucao-pendencias/E1_PORTAS_DE_ENTRADA_DA_CONTA.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele: não pare para pedir aprovação de passo que está lá (nem por "superfície protegida"). Pergunte só decisão que ele não cobre e, enquanto espera, siga com o resto.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e1 -b exec/e1-portas-de-entrada-da-conta origin/main
cd C:\dev\AureaCustodiaMVP-e1
npm install

Trabalhe só nesse worktree e só no território do seu documento. Outras seis branches rodam ao mesmo tempo em outras pastas: não toque em arquivo delas; se precisar, escreva o pedido no seu relatório. Servidor local só com: npm run dev -- -p 3101. Não digite senha em tela de login; confira tela logada por teste ou deixe no roteiro do Gabriel. Rode a suíte com o servidor parado e compare a contagem com a base (86 arquivos, 741 testes, 1 pulado) mais os seus arquivos novos.

Siga docs/Regras_eficiencia_de_sessao_v1.md: crie docs/execucao-pendencias/relatorios/E1_EXECUCAO.md na primeira ação e acrescente uma linha a cada tarefa fechada; não releia o repositório além do que o documento lista. No fim da branch (não a cada escrita): npm run typecheck; npm run lint; npm test; npm run build. Commits em blocos funcionais. Termine com git push -u origin exec/e1-portas-de-entrada-da-conta e o relatório docs/execucao-pendencias/relatorios/E1.md (o que fez, testes, o que conferiu e como, riscos, passos manuais com valor literal completo), cuja última linha é "E1 pronta para integração — <hash>". NÃO faça merge na main.
```

---

## E2 · Cobrança com a configuração vigente

```text
Você é o agente de execução E2 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP.

Sua ordem de serviço é docs/execucao-pendencias/E2_COBRANCA_COM_CONFIGURACAO_VIGENTE.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele: não pare para pedir aprovação de passo que está lá (nem por "superfície protegida"). Pergunte só decisão que ele não cobre e, enquanto espera, siga com o resto.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e2 -b exec/e2-cobranca-com-configuracao-vigente origin/main
cd C:\dev\AureaCustodiaMVP-e2
npm install

Trabalhe só nesse worktree e só no território do seu documento. Outras seis branches rodam ao mesmo tempo em outras pastas: não toque em arquivo delas; se precisar, escreva o pedido no seu relatório. A fórmula do hash da análise (estacao/CONTRATO.md e src/domain/analise.test.ts) não muda. Servidor local só com: npm run dev -- -p 3102. Não mude taxa em produção. Rode a suíte com o servidor parado e compare a contagem com a base (86 arquivos, 741 testes, 1 pulado) mais os seus arquivos novos.

Antes de cada push: npm run typecheck; npm run lint; npm test; npm run build. Termine com git push -u origin exec/e2-cobranca-com-configuracao-vigente e o relatório docs/execucao-pendencias/relatorios/E2.md (o que fez, testes, o que conferiu e como, riscos, passos manuais com valor literal completo), cuja última linha é "E2 pronta para integração — <hash>". NÃO faça merge na main.
```

---

## E3 · Limpeza do painel antigo de relatórios

```text
Você é o agente de execução E3 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP.

Sua ordem de serviço é docs/execucao-pendencias/E3_LIMPEZA_RELATORIOS_ANTIGOS.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele: não pare para pedir aprovação de passo que está lá. Pergunte só decisão que ele não cobre e, enquanto espera, siga com o resto.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e3 -b exec/e3-limpeza-relatorios-antigos origin/main
cd C:\dev\AureaCustodiaMVP-e3
npm install

Trabalhe só nesse worktree e só no território do seu documento: remova exatamente o que ele lista, e nada que continue em uso (autorizarRelatorioNoPainel e ehAdmin ficam). Outras seis branches rodam ao mesmo tempo em outras pastas: não toque em arquivo delas. Servidor local, se precisar, só com: npm run dev -- -p 3103. Rode a suíte com o servidor parado e compare a contagem com a base (86 arquivos, 741 testes, 1 pulado).

Antes de cada push: npm run typecheck; npm run lint; npm test; npm run build. Termine com git push -u origin exec/e3-limpeza-relatorios-antigos e o relatório docs/execucao-pendencias/relatorios/E3.md, cuja última linha é "E3 pronta para integração — <hash>". NÃO faça merge na main.
```

---

## E4 · Preço da custódia e recibo bloqueado por pendência

```text
Você é o agente de execução E4 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP.

Sua ordem de serviço é docs/execucao-pendencias/E4_CUSTODIA_PRECO_E_INADIMPLENCIA.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele — inclusive as mudanças em Server Actions que o CLAUDE.md chama de superfície protegida: A-4 e B-2 já estão decididos. Não pare para pedir aprovação de passo que está lá. Pergunte só decisão que ele não cobre e, enquanto espera, siga com o resto.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e4 -b exec/e4-custodia-preco-e-inadimplencia origin/main
cd C:\dev\AureaCustodiaMVP-e4
npm install

Trabalhe só nesse worktree e só no território do seu documento. Outras seis branches rodam ao mesmo tempo em outras pastas: não toque em arquivo delas (src/server/payments/conciliacao.ts é da E2). Conta da equipe do painel fica isenta do bloqueio por pendência, e checagem que falha responde "liberado". Dinheiro em centavos inteiros. Servidor local só com: npm run dev -- -p 3104. Não digite senha em tela de login. Rode a suíte com o servidor parado e compare a contagem com a base (86 arquivos, 741 testes, 1 pulado) mais os seus arquivos novos.

Siga docs/Regras_eficiencia_de_sessao_v1.md: crie docs/execucao-pendencias/relatorios/E4_EXECUCAO.md na primeira ação e acrescente uma linha a cada tarefa fechada; não releia o repositório além do que o documento lista. No fim da branch (não a cada escrita): npm run typecheck; npm run lint; npm test; npm run build. Commits em blocos funcionais. Termine com git push -u origin exec/e4-custodia-preco-e-inadimplencia e o relatório docs/execucao-pendencias/relatorios/E4.md (o que fez, testes, o que conferiu e como, riscos, passos manuais com valor literal completo), cuja última linha é "E4 pronta para integração — <hash>". NÃO faça merge na main.
```

---

## E5 · Análise, testes e melhorias do painel — entrada, resultados, equipe, CS e usuários (só depois da integração)

```text
Você é o agente de execução E5 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP. Esta branch é revisão e só começa com E1, E2, E3, E4 e E7 já mescladas e commitadas na main; confira isso em docs/execucao-pendencias/relatorios/INTEGRACAO.md e, se não estiver, pare. Siga docs/Regras_eficiencia_de_sessao_v1.md (prevalece sobre este prompt): leia só o que a seção "Regras de eficiência" do seu documento lista, crie relatorios/E5_EXECUCAO.md na primeira ação e atualize a cada tarefa fechada, typecheck/lint/suíte/build só no fim da branch, commits em blocos funcionais.

Sua ordem de serviço é docs/execucao-pendencias/E5_QA_PAINEL_RESULTADOS_EQUIPE_CS_USUARIOS.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele: não pare para pedir aprovação de passo que está lá. Pergunte só decisão que ele não cobre e, enquanto espera, siga com o resto.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e5 -b exec/e5-qa-painel-resultados-equipe-cs-usuarios origin/main
cd C:\dev\AureaCustodiaMVP-e5
npm install

Trabalhe só nesse worktree e só no território do seu documento (as áreas bancada, moedas, logística e configuração são da E6). Toda Server Action do painel confere a permissão por conta própria e grava audit_log; mantenha. Os testes de tela usam renderToStaticMarkup — o JSX já funciona no Vitest pela base; não edite vitest.config.mts. Nunca desative nem troque o papel de conta do seed, do bootstrap ou da equipe em roteiro: use conta de teste. Servidor local só com: npm run dev -- -p 3105. Não digite senha em tela de login. Rode a suíte com o servidor parado e compare a contagem com a base (86 arquivos, 741 testes, 1 pulado) mais os seus arquivos novos.

Antes de cada push: npm run typecheck; npm run lint; npm test; npm run build. Termine com git push -u origin exec/e5-qa-painel-resultados-equipe-cs-usuarios e o relatório docs/execucao-pendencias/relatorios/E5.md (o que fez, testes, bugs achados e corrigidos, o que conferiu e como, riscos, roteiro logado para o Gabriel), cuja última linha é "E5 pronta para integração — <hash>". NÃO faça merge na main.
```

---

## E6 · Análise, testes e melhorias do painel — bancada, moedas, logística e configuração (só depois da integração)

```text
Você é o agente de execução E6 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP. Esta branch é revisão e só começa com E1, E2, E3, E4 e E7 já mescladas e commitadas na main; confira isso em docs/execucao-pendencias/relatorios/INTEGRACAO.md e, se não estiver, pare. Siga docs/Regras_eficiencia_de_sessao_v1.md (prevalece sobre este prompt): leia só o que a seção "Regras de eficiência" do seu documento lista, crie relatorios/E6_EXECUCAO.md na primeira ação e atualize a cada tarefa fechada, typecheck/lint/suíte/build só no fim da branch, commits em blocos funcionais.

Sua ordem de serviço é docs/execucao-pendencias/E6_QA_PAINEL_BANCADA_MOEDAS_LOGISTICA_CONFIGURACAO.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele: não pare para pedir aprovação de passo que está lá. Pergunte só decisão que ele não cobre e, enquanto espera, siga com o resto.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e6 -b exec/e6-qa-painel-bancada-moedas-logistica-configuracao origin/main
cd C:\dev\AureaCustodiaMVP-e6
npm install

Trabalhe só nesse worktree e só no território do seu documento (resultados, equipe, CS e usuários são da E5; src/server/estacao/analise.ts é da E2; o bloco do 401 em AppProvider.tsx é da E1). A análise pela bancada web chama src/server/estacao/analise.ts e a fórmula do hash não muda. Os testes de tela usam renderToStaticMarkup — o JSX já funciona no Vitest pela base; não edite vitest.config.mts. Não mude taxa em produção e não feche análise de envio real. Servidor local só com: npm run dev -- -p 3106. Não digite senha em tela de login. Rode a suíte com o servidor parado e compare a contagem com a base (86 arquivos, 741 testes, 1 pulado) mais os seus arquivos novos.

Antes de cada push: npm run typecheck; npm run lint; npm test; npm run build. Termine com git push -u origin exec/e6-qa-painel-bancada-moedas-logistica-configuracao e o relatório docs/execucao-pendencias/relatorios/E6.md (o que fez, testes, bugs achados e corrigidos, o que conferiu e como, riscos, roteiro logado para o Gabriel), cuja última linha é "E6 pronta para integração — <hash>". NÃO faça merge na main.
```

---

## E7 · Documentação das pendências

```text
Você é o agente de execução E7 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP.

Sua ordem de serviço é docs/execucao-pendencias/E7_DOCUMENTACAO_DAS_PENDENCIAS.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele: não pare para pedir aprovação de passo que está lá. Pergunte só decisão que ele não cobre e, enquanto espera, siga com o resto.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e7 -b exec/e7-documentacao-das-pendencias origin/main
cd C:\dev\AureaCustodiaMVP-e7

Esta branch é só documentação: não edite código. Marque como feito apenas o que tem evidência (commit, db:check, arquivo); o que está sendo resolvido por E1–E6 fica "em execução na E<N>". Nenhum valor de credencial entra no repositório, que é público: só os nomes das variáveis. Não descreva caminho de menu de painel externo de memória.

Antes do push, confira que nenhum link relativo dos arquivos editados quebrou. Termine com git push -u origin exec/e7-documentacao-das-pendencias e o relatório docs/execucao-pendencias/relatorios/E7.md, cuja última linha é "E7 pronta para integração — <hash>". NÃO faça merge na main.
```

---

## Integração (depois de E1–E7)

```text
Você é o agente de integração do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP. O Gabriel pediu que as branches de execução E1 a E7 sejam levadas à main.

Leia CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md e siga docs/execucao-pendencias/INTEGRACAO.md do começo ao fim — ele é a aprovação para os merges, o push na main e o commit de pendências. Confira primeiro que os sete relatórios em docs/execucao-pendencias/relatorios/ terminam em "pronta para integração"; se algum faltar, pare e diga qual.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-integracao -b integracao/execucao-pendencias origin/main
cd C:\dev\AureaCustodiaMVP-integracao
npm install

Siga docs/Regras_eficiencia_de_sessao_v1.md. Merges na ordem E3, E2, E1, E4, E7 (E5 e E6 são revisão e começam depois desta integração), com typecheck, lint, testes e build uma vez depois do último merge (ou logo após um merge com conflito de código), sem servidor local rodando. Conflito em RISCOS_ASSUMIDOS.md e ATALHOS.md: união, em ordem numérica. Conflito em código que não for trivial: pare e descreva. Publique com git push origin HEAD:main (sem forçar), confira o deploy e as rotas sem login em https://aurea-custodia-mvp.vercel.app (o domínio próprio não está publicado; não o use), e entregue o roteiro manual consolidado em docs/execucao-pendencias/relatorios/INTEGRACAO.md.

Depois: relate ao Gabriel os erros encontrados (ou que está tudo bem) e PERGUNTE se os testes manuais dele estão ok. Só com o ok dele, faça a higiene das pastas da seção 5 de INTEGRACAO.md (remover os worktrees e branches já mesclados, deixar tudo na pasta principal atualizada). O que você puder executar, execute; se um comando for barrado, avise na hora com o comando pronto, a pasta e para que serve.
```

---

## E8 · Segunda onda — conciliação e rastreio (só depois da integração)

```text
Você é o agente de execução E8 do repositório AureaCustodiaMVP (Áurea Custódia / Real Olímpico), em C:\dev\AureaCustodiaMVP. Esta branch só começa com E1 a E7 já integradas na main.

Sua ordem de serviço é docs/execucao-pendencias/E8_SEGUNDA_ONDA_CONCILIACAO_E_RASTREIO.md. Leia, nesta ordem: CLAUDE.md, docs/execucao-pendencias/00_PLANO_MESTRE.md, os relatórios E2.md e E4.md em docs/execucao-pendencias/relatorios/ e o seu documento inteiro. O documento é a aprovação do Gabriel para tudo o que está escrito nele: não pare para pedir aprovação de passo que está lá (nem por "superfície protegida"). Pergunte só decisão que ele não cobre.

Preparação, no PowerShell:
cd C:\dev\AureaCustodiaMVP
git fetch origin
git worktree add C:\dev\AureaCustodiaMVP-e8 -b exec/e8-segunda-onda-conciliacao-e-rastreio origin/main
cd C:\dev\AureaCustodiaMVP-e8
npm install

Confira no início que a main contém o código de E2 e E4 (o relatório de integração cita os merges); se não contiver, pare. Dinheiro em centavos inteiros; conta da equipe isenta de bloqueio; nenhuma trava nova. Servidor local só com: npm run dev -- -p 3108. Não digite senha em tela de login. Siga docs/Regras_eficiencia_de_sessao_v1.md: crie docs/execucao-pendencias/relatorios/E8_EXECUCAO.md na primeira ação e acrescente uma linha a cada tarefa fechada; não releia o repositório além do que o documento lista. No fim da branch (não a cada escrita): npm run typecheck; npm run lint; npm test; npm run build. Commits em blocos funcionais. Termine com git push -u origin exec/e8-segunda-onda-conciliacao-e-rastreio e o relatório docs/execucao-pendencias/relatorios/E8.md, cuja última linha é "E8 pronta para integração — <hash>". NÃO faça merge na main.
```
