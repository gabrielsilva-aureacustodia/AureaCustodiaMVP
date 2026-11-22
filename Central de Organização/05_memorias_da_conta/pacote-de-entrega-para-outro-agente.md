---
name: pacote-de-entrega-para-outro-agente
description: "Roteiro escrito para outro agente executar precisa vir acompanhado do contexto do projeto, do estado do Git e da ordem de leitura do repositório — passos soltos não bastam."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 84cb5975-a1d0-47d0-9642-e9c407690efb
  modified: 2026-09-18T04:38:58.170Z
---

# Roteiro para outro agente vem com contexto, não só com passos

Em 18/09/2026, ao me pedir os tutoriais que o **Claude Cowork** executaria no navegador (Mercado
Pago, conferência do painel, WhatsApp), Gabriel completou o pedido no meio da execução:

> *"Após terminar, dê detalhes também de tudo que temos de contexto necessário e atualizado do
> projeto; dê contexto do Git; me dê um prompt detalhado para enviar para o CoWork poder também
> ler o repositório que está público com a integração do Git e entender o contexto necessário
> antes de executar tudo no navegador."*

## O que isso estabelece

Quando ele pede um roteiro para **outro agente** executar — Cowork, Codex, uma sessão nova de
Claude Code, qualquer um —, a entrega não é só a sequência de passos. O pacote tem quatro partes:

1. **O texto para colar na primeira mensagem do agente**, pronto, delimitado, sem ele precisar
   montar nada. É o item que ele mais valoriza, porque é o único que ele mesmo executa.
2. **O contexto do projeto**: o que a empresa faz, qual é o endereço publicado, em que fase está e
   quais são as regras que o agente não pode violar (no caso da Áurea, a terminologia proibida
   pelo jurídico e a proibição de inventar travas).
3. **O contexto do Git**: a URL do repositório, que é público, a branch, o commit exato e o estado
   dos testes. Sem isso o agente não sabe se o que está lendo é a versão vigente.
4. **A ordem de leitura, com o que NÃO ler.** O repositório tem documentos de 60 mil caracteres
   escritos para agentes de código; mandar um agente de navegador ler tudo gasta o limite dele
   antes do primeiro clique.

## Por que ele pede isso

Gabriel opera vários agentes em paralelo (ver `segmentar-em-branches-e-agentes.md`) e o
repositório é público justamente para que qualquer um deles leia sem fricção de autenticação. Um
agente que recebe só a lista de passos executa sem entender o porquê, e erra no primeiro desvio —
um rótulo de menu que mudou, uma tela que não é a esperada. Um agente que leu o contrato do
projeto antes sabe improvisar dentro dos limites certos.

## O que mais entra nesse pacote

**Onde o agente para e chama uma pessoa**, escrito passo a passo e com a frase pronta para ele
mandar. Segundo fator no celular, reCAPTCHA e aceite de termos em nome da empresa são as três
pausas clássicas — nenhuma delas um agente resolve, e cada uma vira uma sessão travada se o
roteiro não avisar antes.

E **o roteiro precisa estar publicado** onde o outro agente alcança. Se o push falhar, o roteiro
no disco não existe para quem lê o repositório pelo GitHub: entregar o comando de push pronto faz
parte da entrega, não é um detalhe posterior.
