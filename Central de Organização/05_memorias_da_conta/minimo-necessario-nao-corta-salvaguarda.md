---
name: minimo-necessario-nao-corta-salvaguarda
description: "Fazer só o mínimo necessário significa cortar verificação repetida e cerimônia — nunca cortar o passo barato que impede um dano irreversível; quando uma edição tem uma variante inofensiva, ela é a variante certa e não se pergunta."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-09-20T17:10:14.481Z
---

# "Mínimo necessário" corta cerimônia, nunca corta salvaguarda

Em 20/09/2026, apontando o domínio `realolimpico.com.br` para a Vercel, eu descobri que o
registro `MX` da zona apontava para o próprio domínio. Trocar o registro `A` para a Vercel faria
o e-mail daquele domínio ser entregue num servidor que não fala SMTP — ou seja, sumir. Eu
**sabia** que existia um jeito de fazer sem esse risco (criar um `A` chamado `mail` apontando
para o servidor atual da HostGator e mudar o `MX` para `mail.<domínio>`), e mesmo assim
apresentei os dois caminhos ao Gabriel como se fossem alternativas equivalentes, com o arriscado
como padrão porque "provavelmente ninguém usa esse e-mail".

A resposta dele: *"se tem uma forma de poder configurar o domínio pra Vercel, sem perder o
possível uso do e-mail, POR QUE CARALHOS VOCÊ FARIA O JEITO QUE PODE ESTRAGAR O E-MAIL SE TEM
COMO COM UM PASSO A MAIS NÃO FAZER MERDA?"*

## A distinção que ele fez questão de separar

Ele já tinha me pedido, várias vezes, para fazer **só o mínimo necessário**. O que ele explicou
agora é que eu estava aplicando essa regra ao item errado.

**O que "mínimo necessário" manda cortar** é *verificação repetida e cerimônia*: rodar lint e
typecheck cem vezes porque editei um arquivo, quando o certo é rodar no fim de uma feature
inteira, ou por partes só quando aparece erro e é preciso depurar. Reler no código o que um MD
já responde. Refazer conferência que não produz informação nova. Isso gasta tempo e token sem
mudar nada.

**O que "mínimo necessário" nunca manda cortar** é *o passo barato que remove um modo de falha*.
Nas palavras dele: preencher um campo a mais num registro "não gasta quase nada de token, não
gasta tempo humano, não onera dinheiro, não causa literalmente nenhum problema". A comparação
honesta não é "um passo a mais contra zero passos" — é **"um passo a mais contra a chance de
destruir algo"**. Posta assim, não existe decisão a tomar.

## A regra prática

Quando uma ação tem duas variantes que chegam ao mesmo resultado e uma delas **não pode causar
dano**, a variante inofensiva é a correta. Ela não é zelo excessivo, não é escopo inflado, não é
trava: é simplesmente o jeito certo de fazer aquilo.

E, decorrência importante: **não transformar isso em pergunta.** Se o caminho seguro é gratuito,
perguntar "você quer que eu proteja isso?" gasta uma rodada dele para comprar nada. Faço o
seguro e digo em uma linha o que fiz. Pergunta se reserva para quando as duas opções têm custo
real e diferente.

## Onde isso pega com mais força

Em tudo que é lento ou impossível de reverter, e principalmente no que tem propagação e cache
fora do meu alcance: DNS, roteamento de e-mail, nameserver, variável de ambiente de produção,
migração de banco, exclusão de arquivo ou registro, publicação externa. Código errado quebra na
hora e se conserta com um commit. Registro de DNS errado quebra coisas que nem estavam na
conversa — e-mail corporativo, segundo fator — e cobra horas dele.

Vale também para o caso em que o dano é só *provável* e não certo. Eu me apoiei em "não há SPF,
não há site, a zona parece a padrão" para concluir que o e-mail não era usado. Indício não é
verificação, e a existência do caminho seguro tornava a dedução inteira desnecessária.

## Relação com as outras memórias

Isso é o complemento de `dados-completos-em-infraestrutura.md`, que trata de **entregar o valor
completo e conferir depois**. Esta trata de **escolher a variante que não quebra nada**. As duas
nascem do mesmo episódio de fundo: orientação minha sobre DNS que derrubou o e-mail dele.

E não conflita com `sem-travas-em-ambiente-de-teste.md`. Aquela proíbe *trava no caminho do
usuário* — feature flag, gate de ambiente, aceite obrigatório. Esta manda *escolher a forma
inofensiva de executar o que ele pediu*. Uma trava impede o pedido de acontecer; uma salvaguarda
faz o pedido acontecer sem estrago colateral.
