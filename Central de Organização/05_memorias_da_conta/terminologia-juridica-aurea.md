---
name: terminologia-juridica-aurea
description: "O jurídico da Áurea Custódia proibiu as palavras token, NFT, cripto, ativo digital e todo vocabulário de investimento em qualquer texto do produto — o termo aprovado é recibo."
metadata: 
  node_type: memory
  pinned: true
  originSessionId: 1c23b75a-3ab7-4611-8ec4-7be18f7997db
  modified: 2026-09-10T22:26:05.492Z
---

# As palavras que a Áurea Custódia não pode usar

Em 09/09/2026 Gabriel se reuniu com o jurídico da empresa (Felipe Moraes e Eduarda Teixeira
Martins) especificamente para alinhar terminologia, e me passou a transcrição em 10/09/2026
com a instrução de "remoção de terminologias perigosas". A decisão é do advogado e do sócio,
não uma preferência de estilo: cada palavra proibida é um enquadramento regulatório que a
plataforma quer evitar.

## Termos proibidos e o motivo de cada um

**token, NFT, cripto, ativo digital, ativo** — puxam a operação para a regulação de ativos
virtuais (Res. BCB 519–521/2026 e IN RFB 1888/2019). O produto é um comprovante de guarda
física, não um ativo virtual, e a palavra errada num texto de marketing é o que faz um
fiscal ou um juiz enquadrar a empresa no que ela não é. Gabriel foi explícito: *"eu nem
quero usar nenhum dos termos atrelados aos criptoativos"*.

**investimento, investidor, corretora, assessor de investimento, rentabilidade, retorno** —
puxam para a CVM e para o mercado de capitais. Felipe: *"para não cair em regulação de CVM"*.

## O que se usa no lugar

O termo aprovado pelos dois advogados é **recibo** (recibo de custódia, recibo de
unicidade). Para o objeto guardado: **item** ou **moeda**. Para o ambiente de negociação:
**marketplace**, que o jurídico considerou seguro. Para a expectativa de preço: **potencial
de valorização** — a palavra "potencial" é deliberada, porque não promete nada — e todo
número exibido é **estimado** ou **aproximado**, nunca uma recomendação.

O posicionamento negativo entra por escrito no site, nos termos e no material educativo:
a Áurea **não é corretora**, **não é instituição financeira**, **não é plataforma de ativos
digitais** e **não é investimento**. Ela é um serviço de guarda com um marketplace onde
colecionadores negociam recibos sem resgatar o item físico.

## O que isso muda no comportamento

Vale para **todo texto que eu escrever neste projeto**: interface, landing, termos de uso,
política de privacidade, material educativo, mensagem de erro, nome de rota e texto de
commit. Antes de entregar qualquer texto do produto, varrer por essas palavras.

Vale também para o código lido por terceiros, já que o repositório é público de propósito:
nomes de tipo, arquivo e pasta que digam `Nft` ou `token` contam como texto do produto.

Isso é mais amplo do que a regra que já estava no `CLAUDE.md` — lá está escrito apenas para
não *sugerir* tokenização, NFT on-chain ou DApp como arquitetura. A regra nova proíbe as
**palavras**, inclusive descrevendo o que já existe.

## A exceção: descrever o mercado de fora não é descrever a Áurea

Em 10/09/2026, durante a troca de terminologia da Fase 0 da publicação, eu propus reescrever
`BTC: ativo digital escasso.` na tela de comparações. Gabriel respondeu que ali **não tem
problema**: *"No caso da BTC (e de toda a página de comparações com o resto do mercado) não
tem problema você usar esses termos."*

A razão é a mesma que motiva a proibição. O que cria enquadramento regulatório é a Áurea
**chamar o próprio produto** de ativo digital, token ou investimento. Dizer que o Bitcoin é
um ativo digital é fato sobre terceiro, num contexto que a própria tela apresenta como
referência de mercado externo — e trocar a palavra por um eufemismo deixaria o texto pior e
menos verdadeiro sem ganhar proteção nenhuma.

Na prática: a varredura por palavra proibida continua obrigatória, mas o resultado dela se
julga pelo **sujeito da frase**. Se o sujeito é a Áurea, o recibo, a moeda custodiada ou o
marketplace, a palavra sai. Se o sujeito é o BTC, o ETH, o ouro, a bolsa ou qualquer
referência externa usada para comparação, a palavra fica. Isso vale para `graficos/comparacoes`
e para qualquer material educativo que compare a Áurea com o resto do mercado.

## O nome do produto mudou — ver a memória da marca

Desde 20/09/2026 o site não se chama mais "Áurea Custódia": a marca pública é **Real Olímpico**,
enquanto a razão social AUREA CUSTODIA LTDA segue no contrato, no CNPJ e no objeto postal. Essa
regra é separada desta e está em `marca-real-olimpico-no-site.md`. As duas valem juntas: o texto
não pode usar as palavras proibidas aqui **e** precisa chamar o produto pelo nome novo.
