---
name: marca-real-olimpico-no-site
description: "O site da Áurea Custódia se chama Real Olímpico desde 20/09/2026 — a marca é masculina, a razão social continua AUREA CUSTODIA LTDA, e rebrand que não aparece na tela não conta como feito."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-09-20T16:58:13.092Z
---

# A marca do site é Real Olímpico; a empresa continua Áurea Custódia

Em 20/09/2026, preparando a publicação no domínio oficial, Gabriel deu a instrução:
*"por causa de um problema de registro de marca (que vai ser resolvido depois, mas para a
publicação de agora precisamos modificar) vamos usar o nome Real Olímpico e não o nome Aurea
(no site, na empresa continua sendo Aurea Custodia)"* — e, adiante, *"em todo lugar que usa a
marca, por favor, mude para Real Olímpico"*.

A decisão é temporária na intenção (vale enquanto corre o registro formal das marcas) mas
permanente na prática até ele dizer o contrário, e o domínio `realolimpico.com.br` é o que vai
ao ar.

## Onde vai a marca e onde vai a razão social

**Real Olímpico** em todo texto que o usuário lê: interface, títulos de página e metadados,
landing, telas de entrada, recibos, e-mails, mensagens de erro, material educativo e logotipo.

**AUREA CUSTODIA LTDA** permanece em três lugares, e trocar por marca ali causa dano concreto,
não desconforto estético:

- onde aparece **CNPJ ou contrato** — a parte contratante é a pessoa jurídica;
- no **objeto postal** — a Caixa Postal 7990 está registrada nos Correios em nome da razão
  social, e pacote endereçado à marca pode ser recusado na triagem da agência;
- no **descritor de fatura de cartão** (`statement_descriptor`) — o adquirente valida contra o
  cadastro do lojista.

**Identificadores internos não mudam**: o schema `aurea.*` do Postgres, as variáveis de ambiente
`AUREA_*`, a `STORE_KEY` e os e-mails de semente `@testeaurea.com.br`. Renomear qualquer um
deles quebra banco, deploy ou login sem ganhar nada de marca.

## A concordância muda junto com o nome

"Áurea Custódia" é feminino e "Real Olímpico" é masculino. Uma substituição literal de palavra
produz "a Real Olímpico", "da Real Olímpico", "o que a Real Olímpico não é" — erro de português
em página pública. O certo é *o* Real Olímpico, *do* Real Olímpico, *ao* Real Olímpico, e
adjetivo no masculino ("não está sujeito", "um prestador especializado"). Depois de qualquer
troca em massa, varrer por artigo feminino colado ao nome.

## Rebrand que não aparece na tela não está feito

No meio dessa mesma sessão Gabriel precisou avisar: *"Lembrando que o rebranding precisa afetar
o Front End, se não não adianta nada, ok?"* — e ele tinha razão, porque eu já havia trocado
centenas de strings e ainda não tinha tocado no item mais visível de todos: **todas as telas
seguiam carregando o logotipo antigo**.

A lição é de verificação, não de escopo: numa mudança de marca, o critério de pronto é o que
aparece na tela — logotipo, ícone da aba, título da janela —, não a contagem de arquivos
alterados. Antes de dizer que terminou, abrir o site e olhar.

O mesmo vale para dado que a tela mostra. Na mesma sessão, o card de endereço da página de
envios trazia uma "Avenida Paulista" fictícia enquanto a etiqueta em PDF já usava a caixa postal
verdadeira, e um agente anterior tinha declarado o endereço fictício "completamente removido"
porque corrigiu a constante do servidor e não abriu a tela.

## Relação com a memória de terminologia

Isso é diferente de `terminologia-juridica-aurea.md`, que proíbe *palavras* (token, cripto,
investimento) por enquadramento regulatório. Aqui não há palavra proibida: é o **nome próprio**
do produto que mudou. As duas regras valem ao mesmo tempo e se aplicam a todo texto do projeto.
