---
name: trava-so-depois-do-vencimento-real
description: "No Real Olímpico, trava por débito de custódia só vale um dia depois de a fatura vencer — fatura em aberto dentro do prazo não é dívida e não pode bloquear negociação."
metadata:
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-09-28T02:09:49.513Z
---

# Fatura em aberto não é dívida: a trava só entra depois do vencimento

Em 23/09/2026 eu fechei um buraco real — moedas sem cobrança nenhuma chegavam
ao livro de ofertas — invertendo a pergunta que a publicação de venda fazia. De
"existe dívida registrada?" passei para "a custódia está comprovadamente paga
até o mês corrente?". Ausência de prova passou a valer como dívida.

Em 25/09 acrescentei a cobrança no instante em que a moeda entra na guarda. As
duas regras juntas produziram o efeito que o Gabriel cobrou em 27/09: a fatura
nascia junto com a moeda, dentro do prazo, e a moeda **já nascia impedida de ser
anunciada**. Quem não devia nada aparecia travado.

A correção dele foi explícita: **"só deve travar a custódia 1 dia depois de não
pagar a data da custódia"**, e o prazo de pagamento **"deveria ser de 30 dias"**,
não os 10 que estavam no código.

## A regra que fica

Toda trava por débito de custódia — publicar anúncio, casar ordem, vender,
retirar recibo, expurgar oferta do livro — só pode disparar quando a fatura
está vencida **há mais de um dia**. Fatura em aberto dentro do prazo é conta a
vencer, não dívida, e não bloqueia nada.

O que continua legítimo bloquear é a moeda **sem nenhum rastro de cobrança** —
nem fatura, nem plano. Esse era o buraco de 23/09, e ele se fecha sem punir quem
tem uma fatura em dia para pagar.

## O princípio, que é mais amplo que a custódia

Este é o mesmo erro que a memória `sem-travas-em-ambiente-de-teste` descreve,
numa roupa nova. Lá eu introduzia travas novas; aqui eu peguei uma trava
legítima e a disparei cedo demais, tratando **ausência de comprovação** como
**prova de inadimplência**. As duas coisas não são iguais, e confundi-las
sempre pune o usuário certo pelo motivo errado.

Quando for preciso bloquear alguém por dívida, a pergunta é "a data passou?",
nunca "consta pagamento?". E a data que vale é a do fato gravado, não o rótulo
de status que alguma rotina escreveu — rótulo desatualizado trancaria quem já
pagou.

## Uma armadilha de leitura que veio junto

Na mesma conversa ele leu a coluna "Vencimento" de uma fatura **já paga** como
se fosse a data em que a custódia expira. Não era: era o prazo para pagar, que
perde o sentido assim que a fatura é quitada — e que, numa fatura emitida no fim
do mês, cai **depois** do fim da cobertura.

Cobertura e prazo de pagamento são coisas diferentes e precisam de nomes
diferentes na tela. Sempre que eu mostrar uma data ao lado de uma cobrança,
tenho de dizer qual das duas ela é.
