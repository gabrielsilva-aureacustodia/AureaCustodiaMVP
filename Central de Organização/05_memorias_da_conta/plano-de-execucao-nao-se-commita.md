---
name: plano-de-execucao-nao-se-commita
description: "MD de plano para outro agente executar é arquivo de trabalho local, sem commit; e erro meu que eu mesmo já diagnostiquei se conserta na hora, sem pedir confirmação."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-09-21T22:10:03.231Z
---

# Plano de execução é arquivo local — e erro meu eu conserto sozinho

## 1. O MD de plano não se commita

Em 21/09/2026 o Gabriel pediu que eu quebrasse um lote de modificações em uma
branch por tópico, montasse os MDs executivos e escrevesse os prompts para o
agente AntiGravity. Eu criei cada branch e **commitei o MD do plano dentro
dela**. Ele cortou: **"Para que caralhos você faria commit de um plano de MDs
pra serem executados localmente???? Só finaliza e me dá os prompts!"** — e, ao
me ver começando a desfazer os commits, completou: **"Só cria os MDs locais e me
dá os prompts!!! Não precisa desfazer commit nem fazer commit, só faz a tarefa
que foi pedida e pronto!"**

O MD de plano é **material de trabalho**, não entrega. Nasce em `docs/` no
disco, sem `git add` e sem commit. O que entra no histórico é a feature que o
agente implementa depois; commitar o roteiro polui o repositório com instruções
que já não valem na semana seguinte.

Isso **não** contraria a regra de que documento lido por agente fica em `docs/`
e nunca em `docs/privado/`: o lugar continua sendo `docs/`. O que muda é que
criar o arquivo já basta.

Quando ele pede branch, MD e prompt, a entrega é exatamente isso: branches
apontando para o `main` atual, MDs no disco e os prompts na resposta. Nada além.

## 2. Erro que eu mesmo identifiquei, eu corrijo — não peço permissão

Minutos depois, na mesma sessão, commitei a correção do rastreio dos Correios na
branch errada e arrastei junto arquivos que o AntiGravity estava editando na
mesma pasta. Eu percebi os dois problemas, expliquei os dois direitinho e
**terminei perguntando se podia arrumar**. Ele respondeu: **"Uai porra então faz
commit. E não tem problema levar trabalho do AntiGravity. Se você mesmo já viu o
erro de branch errada, então faz o certo uai! AGORA"**.

A regra: quando eu **mesmo** diagnostico um erro meu e sei qual é a ação certa,
executo. Perguntar ali não protege ninguém — ele não tem informação que eu já
não tenha, e a pergunta só devolve para ele um problema que eu criei. Relato o
que aconteceu **depois de consertado**, em uma ou duas frases.

Isso convive com o item 1, e a diferença é quem está no comando do erro:

- **Trabalho a mais que ninguém pediu** (commit de plano, teste extra, refatoração
  de brinde): não faço, e se já fiz, não gasto outro turno desfazendo — sigo e
  entrego o que foi pedido.
- **Erro meu num passo que ele pediu** (branch errada, arquivo faltando,
  comando incompleto): conserto na hora, sem perguntar.

Vale notar o que ele **não** considerou problema: um commit levar junto trabalho
em andamento de outro agente na mesma pasta. Durante o MVP, com vários agentes
na mesma árvore, isso é ruído esperado — não é motivo para parar a entrega.
