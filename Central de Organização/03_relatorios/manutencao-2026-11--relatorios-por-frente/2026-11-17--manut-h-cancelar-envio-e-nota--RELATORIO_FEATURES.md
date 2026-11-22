# Features / Correções — frente H · cancelar envio e nota

## Agora o usuário consegue
- **Cliente:** cancelar um envio que ainda não foi postado. O frete e o primeiro mês de custódia voltam ao saldo, a nota fiscal do primeiro mês é cancelada e a etiqueta dos Correios deixa de valer. O histórico fica guardado, com o motivo.
- **Equipe:** cancelar um envio vencido, abandonado ou a pedido do cliente, na tela de Logística, sempre com motivo escrito; fica registrado quem cancelou e o que foi devolvido.
- **Equipe na bancada:** cancelar a validação de um envio que não chegou, sem criar moeda e sem mexer no que já foi conferido.

## Deixou de acontecer
- Envio que nunca saiu de casa ficava com o primeiro mês e a nota presos (o caso dos R$ 30,00 do Rogério): agora o cancelamento devolve junto.
- Duplo clique ou cancelar de novo não devolve duas vezes.

## Ainda não
- Devolver dinheiro ao banco ou cartão: tudo volta ao saldo da conta.
- Cancelar moeda já aceita (o caminho é a retirada).
- O cancelamento automático dos 3 dias só vale para envios criados a partir do dia do deploy; os antigos são tratados à mão.
- Envio já postado: devolve o primeiro mês e a nota, mas não o frete (decisão do Gabriel pendente).
- Vai ao ar só depois do commit, da migration e da conferência em produção.
