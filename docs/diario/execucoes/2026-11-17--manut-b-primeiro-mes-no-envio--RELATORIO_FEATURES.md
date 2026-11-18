# Relatório de Features / Correções — frente B (para o negócio)

## Agora o usuário consegue
- Pagar o envio das moedas **de uma vez só**: o frete e o primeiro mês de custódia saem num único pagamento (saldo, Pix ou cartão).
- Ver, antes de pagar, as linhas **Frete**, **Custódia (1º mês)** — com o (i) que explica — e o **Total a pagar**, na mesma linguagem da compra.
- Ter de volta o valor do primeiro mês das moedas que a análise **recusar**, pelo preço que pagou, mesmo que a tabela tenha mudado.

## Deixou de acontecer
- Cliente enviar moedas sem ter pago o primeiro mês (o passo "Pagar depois" e a opção de não contratar saíram do envio).
- Dúvida se toda forma de compra já cobra o primeiro mês: ficou **provado por teste** que saldo, Pix, cartão, oferta pré-paga, venda a uma oferta de compra e casamento do motor cobram.

## Ainda não
- Conferência visual da tela em produção (depois do deploy).
- Contabilidade: a nota fiscal do mês **não é cancelada** quando a moeda é recusada; aguarda o contador decidir como tratar.
- Envio cancelado ou vencido devolve só o frete; o mês pago ainda não volta (frente H).
- Sem o contrato dos Correios ligado (ambiente de teste), o mês é pago na tela, e não junto com o frete.
