---
name: suite-vermelha-nao-e-pendencia
description: "Suíte de testes quebrada não se entrega como item pendente — Gabriel quer que eu conserte na hora; durante uma urgência posso adiar, mas voltar e fechar faz parte da mesma sessão."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-09-20T23:13:06.480Z
---

# Teste vermelho se conserta, não se reporta

Em 20/09/2026 eu fechei um relatório dizendo que a suíte tinha 7 falhas, que build e
typecheck passavam, e que aquilo ficava "em aberto para você decidir quando quiser". Gabriel
respondeu: **"Se a suíte tem falhas, já resolve imediatamente! Me diz quais as falhas e
corrige!"**

O erro foi tratar teste quebrado como item de backlog. Para ele não é: é trabalho meu, não
entregue, e listar como pendência transfere para ele uma decisão que não existe — ninguém
escolhe ter a suíte vermelha.

## A nuance, porque ela existe e foi ele quem a criou

Na mesma sessão, horas antes, ele tinha me mandado **parar** de consertar testes: *"NÃO INVENTA
MAIS NADA. TIRA OS DADOS MOCKADOS, TIRA A FUNÇÃO DE CRIAR DADOS MOCKADOS NO CADASTRO. Nada mais
importa!"* — havia um furo explorável no site publicado, e remendar fixture de teste enquanto
qualquer pessoa podia criar saldo do nada era prioridade invertida.

As duas coisas convivem, e a regra que sai delas é de sequência, não de escolha:

1. **Durante uma urgência, largo os testes** e entrego a correção. Nesse momento a suíte
   vermelha é custo aceito, e eu digo isso em uma frase.
2. **Terminada a urgência, volto e fecho**, na mesma sessão, sem ele precisar pedir. O que não
   pode é o vermelho virar linha de "pendências conhecidas" no fim do relatório.

## Como consertar, quando chegar a hora

Ajustar cada teste ao comportamento **novo**, nunca silenciar. Quando o caso removido protegia
algo que continua valendo, deixar comentário dizendo qual caso passou a cobrir aquilo — senão a
próxima pessoa relê o arquivo e acha que a cobertura sumiu. E quando o teste falha porque um
mecanismo mudou de lugar, usar o mecanismo novo de forma explícita em vez de restaurar o efeito
colateral antigo: no caso concreto, testes que dependiam de contas de demonstração serem equipe
passaram a declarar o ator por `AUREA_ADMIN_EMAILS`, que é o bootstrap de verdade.
