# Relatório de Features / Correções — frente I (pedido do Rogério, item 12)

## Agora o usuário consegue
- Ver o número da sua moeda ("Moeda nº RO-000042") logo abaixo do código do recibo, na folha do recibo na tela.
- Ver o mesmo número em cada cartão da lista de recibos.
- Baixar o recibo em PDF já com o número da moeda, ao lado do código do recibo, com acentos corretos.

## Deixou de acontecer
- O cliente precisar procurar no painel lateral para saber qual é a moeda do recibo: o número agora está no próprio documento.

## Ainda não
- **A tela da equipe ("Ver como o cliente vê") só mostra o número depois de uma linha que o Controle coloca no merge.**
- **Conferência em produção** (celulares de 375 a 430 px e o PDF no leitor real) fica para depois do deploy, por ordem do Gabriel.
- **Suíte completa de testes e ESLint** ainda não rodaram por falta de memória da máquina; os testes do recibo e do PDF (15) passaram.
