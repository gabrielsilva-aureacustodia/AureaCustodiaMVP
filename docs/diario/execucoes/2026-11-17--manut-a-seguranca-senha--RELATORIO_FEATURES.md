# Relatório de Features / Correções — frente A (segurança)

## Agora o usuário consegue
- Ter a conta mais protegida: para sacar, trocar senha, e-mail, Pix ou dados pessoais, e para retirar moedas, o site pede a senha na hora.
- Comprar e vender depois de digitar a senha uma vez; ela vale por 5 minutos, para não incomodar a cada clique.
- Quem entra só com o Google confirma com um código de 6 dígitos enviado por e-mail.
- Confirmar sem perder o que já preencheu: a janela de confirmação abre por cima e a operação segue sozinha.

## Deixou de acontecer
- Quem invadisse uma conta já aberta (celular emprestado, sessão roubada) trocava a senha e o Pix e sacava sem saber a senha. Isso exige a senha (ou o código) do dono.
- A tela "nova senha" aceitava trocar a senha de qualquer sessão aberta; agora só vale para quem acabou de abrir o link recebido por e-mail.
- Trocas de senha, e-mail e Pix passam a ficar registradas, para o aviso por e-mail ao dono (a ser ligado pela frente de comunicação).

## Ainda não
- Aviso por e-mail ao dono da conta quando algo muda (outra frente).
- Conta Google só funciona com o código depois que o modelo de e-mail do Supabase for ajustado (Gabriel).
- Conferência em produção da tela e do "esqueci minha senha": depois do deploy.
