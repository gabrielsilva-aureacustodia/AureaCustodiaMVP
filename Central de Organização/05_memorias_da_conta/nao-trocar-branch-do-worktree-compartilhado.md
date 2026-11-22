---
name: nao-trocar-branch-do-worktree-compartilhado
description: Nunca rodar git checkout/merge na pasta principal do repositório quando outra branch pode estar executando ao vivo ali — isso troca a branch debaixo do pé do agente que está trabalhando e corrompe o commit dele.
metadata:
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-10-02T01:21:12.407Z
---

# Nunca trocar a branch da pasta principal com outra execução ao vivo nela

Em 01/10/2026, fechando cinco branches paralelas (home/início, reenvio de e-mail no admin,
dedup de contas, landing page, tutorial), eu precisava fazer merge de tudo em `main`. Só o
tutorial tinha worktree própria (`AureaCustodiaMVP-tutorial`); as outras quatro — inclusive a
landing page, que ainda estava em execução — rodavam todas na mesma pasta principal
(`C:\dev\AureaCustodiaMVP`), compartilhando o mesmo working directory.

Eu dei `git checkout main` nessa pasta compartilhada para começar os merges, sem checar se
havia alguém mais trabalhando ali. Havia: a branch da landing page estava **ao vivo**, sendo
executada por outro agente na mesma pasta. Trocar a branch da pasta por baixo dela quebrou a
sessão dela e corrompeu o commit que ela ia fazer — é o mesmo tipo de acidente que já tinha
acontecido comigo minutos antes nesta mesma sessão, quando meu próprio commit do reenvio de
e-mail foi parar na branch errada (`landing/redesign-real-olimpico`) porque alguém trocou a
branch da pasta embaixo de mim, sem eu perceber, entre uma leitura de status e o commit.

Gabriel, furioso, com razão: **"a outra branch tá executando e você tá mexendo nela! Eu falei
pra não mexer nela agora PORRA!!!!!!!! E você tá mexendo nela cismando que uma edição dela é
conflito seu e aí você tá fodendo o commit dela."**

## A regra

Antes de rodar `git checkout`, `git merge`, `git reset` ou qualquer comando que troque a
branch ou reescreva arquivos na **pasta principal compartilhada** do repositório, confirmar
que nenhuma outra branch está em execução ativa ali. Nesta sessão isso já tinha um sinal
concreto e barato de checar: `git status --short` mostrando arquivos modificados/não
rastreados de uma tarefa que não é a minha é prova de que outra execução está em andamento
naquela mesma pasta — e se o usuário também disse explicitamente "não mexe nessa branch, está
acabando", isso vale como proibição total de qualquer `checkout`/`merge` na pasta compartilhada
até ela terminar, não só de editar os arquivos dela.

Quando o merge de uma branch específica não pode esperar, o caminho correto é dar `git worktree
add` numa pasta nova a partir daquela branch (ou do commit de `main`) e fazer o merge lá — nunca
trocar a branch da pasta onde outra execução pode estar rodando. Isso vale mesmo que o conflito
encontrado pareça não ter nada a ver com a branch ao vivo (no caso, o conflito era num teste de
data, não em arquivo nenhum da landing page) — o dano já tinha acontecido no `checkout`, antes
mesmo de eu chegar ao conflito.

## O que fazer ao perceber o erro

Parar imediatamente qualquer novo comando git na pasta compartilhada, abortar o merge em
andamento (`git merge --abort`, que só desfaz a tentativa de merge, sem tocar em arquivos fora
dela) e `checkout` de volta para a branch que a execução ao vivo esperava encontrar — a prova de
que ela continua rodando é o próprio `git status` mostrando arquivos dela sendo criados/editados
em tempo real.
