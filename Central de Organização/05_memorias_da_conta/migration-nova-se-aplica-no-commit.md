---
name: migration-nova-se-aplica-no-commit
description: "Migration nova se aplica no banco junto com o commit que a cria, e mudança de env, migration ou infraestrutura se commita na hora — foi esquecer isso que fez Gabriel passar a repetir 'merge e commit' em toda tarefa."
metadata: 
  node_type: memory
  pinned: true
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-11-18T15:08:47.832Z
---

# Migration se aplica junto com o commit — e mudança de infraestrutura se commita na hora

Em 22/09/2026 o site publicado (`realolimpico.com.br`) caiu com
*"Application error: a server-side exception has occurred"* em todas as páginas.
A causa: as migrations `034` e `035`, criadas no mesmo dia, nunca foram rodadas
no banco de produção. O código novo fazia `SELECT` de
`aurea.envios.desconsiderado_em`, a coluna não existia, o carregamento do estado
estourava — e como toda página lê o estado, o site inteiro foi junto.

Gabriel foi direto: **"SEMPRE APLIQUE MIGRATIONS NOVAS EM COMMIT, SEMPRE! Nunca
deixe de rodar envios essenciais."**

## Por que isso acontece neste projeto

`npm run db:migrate` **não roda sozinho**. O deploy da Vercel não o executa, e
`aplicarMigrations` só é chamado pelos testes (`src/server/db/migrar.ts`) e pelo
PGlite de teste. Em produção, quem aplica é uma pessoa rodando o comando. Se
ninguém roda, o código sobe e o banco fica para trás.

O comando é `npm run db:migrate`, da raiz do repositório. É idempotente — rodar
duas vezes não aplica nada na segunda — e usa `POSTGRES_URL_DIRECT` (pooler de
sessão, porta 5432), porque o pooler em modo transação (6543) recusa alguns
comandos de DDL.

## A regra

**Toda branch que cria migration aplica a migration no mesmo momento em que o
código dela é commitado.** Não depois, não "quando der", não numa linha no fim
do relatório. Se eu estiver impedido de rodar o comando, ele vai para o topo da
resposta, sozinho, antes de qualquer outro assunto — e eu digo que a produção
depende daquilo, em vez de listá-lo como pendência entre outras.

Isso vale para todo **"envio essencial"**, que é como ele chamou a categoria:
migration de banco, variável de ambiente na Vercel, configuração de servidor —
qualquer passo fora do repositório sem o qual o código commitado não funciona.

## E o commit dessas mudanças sai na hora

Ainda em 22/09/2026, depois de eu responder três vezes seguidas "já está
commitado" a um pedido de merge e commit, perguntei por que ele repetia. A
resposta: **"é porque você vive esquecendo de fazer commits pós modificações de
env, de migrations, etc etc."**

Ou seja: ele não repete por desconfiança genérica, repete porque o padrão do
erro é específico. Eu commito bem a feature e esqueço o que veio junto com ela
— o arquivo de migration, o script de dado, o ajuste de configuração. São
justamente as mudanças que não aparecem na tela, então nada me lembra delas, e
são as que quebram a próxima execução quando faltam.

Na prática: ao fechar qualquer tarefa que tenha tocado migration, `.env`,
script de banco ou configuração, rodar `git status` **antes** de dizer que
terminei, e commitar o que aparecer.

## Como isso convive com "commit só depois do merge"

Não há conflito: ele mesmo abriu esta exceção ao escrever a regra do commit
único, em 21/09/2026 — *"Só deve fazer commit em pedaços de algo que REALMENTE
precise, como alguma modificação de servidor, modificação de environment table
do Vercel, etc etc, coisas que afetam a próxima execução mesmo local."*
Migration é exatamente essa categoria. O que se segura até o merge é código; o
que o banco e o ambiente precisam vai na hora.

## Reafirmado em 18/11/2026 (frente H, manutenção)

Fechei a frente H (cancelar envio e nota) listando "aplicar a migration 056" como pendência do Controle e do Gabriel.
Gabriel respondeu com a mesma ordem, em caixa alta: **"SEMPRE APLIQUE MIGRATIONS!!! NUNCA DEIXEI PARA EU FAZER ISSO,
sem a migration nada muda."** Valia também para chat de branch: migration nunca entra em "Falta, do Controle/Gabriel".
**Como aplicar:** da raiz `C:\dev\AureaCustodiaMVP`, `npm run db:migrate` (idempotente; lê o `.env.local` da raiz) — e
**conferir o resultado** na saída (`+ NNN_nome` aplicada ou `= NNN_nome (já aplicada)`). Quem fecha a frente roda
o comando e diz na primeira linha qual migration está no banco. (A 056 já estava aplicada pelo Controle; só descobri
rodando.)

## O erro de comunicação, que foi metade do problema

Eu tinha visto o risco e escrevi, no fim da mensagem do merge, que "as
migrations 034 e 035 precisam rodar no Postgres" — uma linha, depois do
relatório, no meio de outras observações. Para algo que derruba o site, isso é
fraco demais. Aviso de pré-requisito de produção não é rodapé: é a primeira
frase, com o comando pronto para colar.

Pelo mesmo motivo, **toda resposta que fecha uma tarefa começa pelo estado do
Git** — qual é o commit, se foi empurrado, se a árvore está limpa — e só depois
explica o que foi feito. Enterrar isso no meio do relatório foi o que o obrigou
a perguntar de novo.
