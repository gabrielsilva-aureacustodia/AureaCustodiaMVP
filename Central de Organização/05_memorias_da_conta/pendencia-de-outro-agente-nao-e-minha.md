---
name: pendencia-de-outro-agente-nao-e-minha
description: No projeto Áurea Custódia vários agentes trabalham em paralelo — pendência atribuída a outra frente se registra uma vez e não se cobra de novo.
metadata: 
  node_type: memory
  pinned: false
  originSessionId: ea3423d6-f77d-457f-a81d-4099fa81439e
  modified: 2026-09-10T23:52:43.294Z
---

# Pendência de outra frente não é minha para cobrar

Em 10/09/2026, ao fechar a Fase 0 da publicação, eu terminei a sessão pedindo ao Gabriel o
endereço real dos Correios (item D-6) e, na mensagem seguinte, cobrei de novo dizendo que o
código ainda tinha o endereço fictício. Ele respondeu: **"EU AVISEI O ENDEREÇO PARA O AGENTE
C, ele tá executando ainda, calma!"**

## Por que eu errei

O item estava no meu arquivo de pendências com "dono: Gabriel", e eu li isso como "ele
precisa me responder". Mas neste repositório o trabalho é distribuído entre várias frentes
que executam ao mesmo tempo — Agente A, B, C e a bancada. Gabriel resolve uma pendência
entregando a informação **ao agente que vai usá-la**, não ao agente que a descobriu. O
endereço dos Correios é insumo do Agente C, que estava no meio da execução; cobrar de novo
não acelerou nada e ainda deu a impressão de que eu não confiava na resposta dele.

## A regra

Registrar a pendência uma vez, no arquivo da minha frente, com quem pode resolvê-la e o que
ela bloqueia. Dizer isso uma vez no relatório de fechamento. **E parar aí.** Se ele disser
que resolveu, aceitar — não conferir o código para ver se já entrou, não pedir o valor de
novo, não tratar a ausência no repositório como prova de que não foi feito. Outro agente
pode estar com a informação na mão naquele momento.

Isso não anula a regra de nunca aceitar dado de infraestrutura pela metade: quando **eu** for
quem aplica a configuração, o valor tem de vir literal e completo. A diferença é quem executa
— se a tarefa é de outra frente, o valor não passa por mim e não é meu para exigir.

## O sinal de que estou repetindo

Se eu estiver escrevendo "conferi e ainda não está no código" sobre algo que não é da minha
tarefa, é cobrança, não verificação. O mesmo vale para reabrir num relatório um item que já
foi marcado como resolvido por ele.
