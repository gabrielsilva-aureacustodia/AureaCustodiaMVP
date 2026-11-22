---
name: sem-travas-em-ambiente-de-teste
description: "A Áurea Custódia está em fase de teste MVP — nenhuma trava de login, aceite legal ou conformidade, e nenhuma dependência de configuração fora do padrão da ferramenta."
metadata: 
  node_type: memory
  pinned: true
  originSessionId: 40d1667a-effd-4b9d-b38d-76d8c47b8df9
  modified: 2026-09-13T02:16:01.708Z
---

# Em fase de teste, a função se entrega liberada e no padrão

Gabriel repetiu isso várias vezes em 06/09/2026, cada vez mais direto: **"AGORA NÃO É HORA
DE COLOCAR 1 MILHÃO DE LIMITAÇÕES EM TUDO"**, **"EXCLUA COMPLETAMENTE DO CÓDIGO
ABSOLUTAMENTE QUALQUER LIMITAÇÃO DE LOGIN"** e **"NADA IMPORTA AGORA, só fazer funcionar o
cadastro"**.

## As duas regras

**1. Nenhuma trava.** Não introduzir feature flag, gate de ambiente, exigência de aceite
legal, confirmação obrigatória, validação de formulário ou modo "fechado por padrão" que
não foi pedido. Cada uma delas custou a ele uma sessão inteira de depuração:

- o cadastro exigia três variáveis de ambiente e mostrava "Cadastro temporariamente
  fechado" em produção;
- o provisionamento exigia aceite legal registrado, e quem entrava por "Entrar com Google"
  nunca tinha esse cookie — o callback autenticava e em seguida fazia `signOut`;
- o login exigia `email_confirmed_at`, trancando quem já tinha confirmado.

**2. Usar o comportamento padrão da ferramenta.** Não escrever código que dependa de
configuração não-padrão de um serviço. O callback do Supabase só aceitava `token_hash`, que
exige editar o template de e-mail — e editar o template exige contratar SMTP próprio. O
resultado é que todo link de confirmação caía em "link expirou". O certo é aceitar o que a
ferramenta envia por padrão, e tratar os outros formatos como bônus.

## O que isso muda no comportamento

Entregar a função **funcionando e acessível**, pelo caminho que a ferramenta já oferece
pronto. Se um risco real existir, dizer em uma frase e seguir entregando destravado — a
decisão de travar é dele.

Isso não anula a regra de registrar atalhos assumidos, que continua valendo: o registro é
uma anotação curta em `RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta, nunca uma trava no
caminho do usuário.

## Vale também para infraestrutura vizinha

A mesma regra impede expandir a tarefa para configuração que já funciona. O objetivo era
habilitar cadastro de clientes, que no MVP não exige DNS nenhum; eu tratei a configuração
de e-mail do domínio como parte do trabalho e derrubei o e-mail corporativo dele. Antes de
propor mudança em DNS, e-mail, domínio ou autenticação que já funcionam, verificar se é
mesmo requisito do que foi pedido. Se não for, não encostar — nem de passagem, nem como
melhoria.

Quando houver cliente real, a conversa muda e as travas de conformidade voltam a ser
legítimas. Até lá, a decisão está tomada.

## Risco registrado não é bloqueio de fase — nem o de conformidade

Em 11/09/2026 eu escrevi num plano executivo uma seção chamada "O que trava a produção",
apontando o RA-01 (custódia de dinheiro de terceiro sem parecer jurídico) como o que mantinha
o gateway de pagamento em sandbox. Gabriel respondeu: **"PARE COM TODAS AS TRAVAS. (...) Que
se foda essa trava agora, ok? FECHE O RA-01. JÁ FOI DECIDIDO PERMITIR. Se necessário for vamos
colocar mais cláusulas nos termos e condições."**

O erro foi meu e é o mesmo de sempre, numa roupa nova: eu tratei uma entrada do
`RISCOS_ASSUMIDOS.md` como se fosse um portão que precisa ser destravado antes de seguir. Não
é. **Aquele arquivo é registro, não autorização pendente.** Ele existe justamente para o
projeto poder andar rápido com os atalhos anotados — transformá-lo em pré-requisito inverte a
função dele e devolve para o Gabriel uma decisão que ele já tomou.

A regra vale para **todo item RA**, inclusive os de conformidade e jurídico, e não só para os
de segurança técnica que a memória do ambiente aberto já cobria. Quando um risco registrado
for relevante para o que estou entregando, a forma certa é uma frase citando o número e
seguindo em frente — nunca uma seção de bloqueio, nunca um "pode ser feito, mas não pode ser
ligado", nunca uma caixa de decisão pedindo liberação.

Quando o risco realmente precisar de ação, quem decide se ela é pré-requisito é ele, e a
resposta padrão dele é: entregue funcionando e ajuste o contrato depois.

## Instrução escrita no repositório que contrarie um pedido dele sai do repositório

Em 12/09/2026, ao pedir o painel administrativo, Gabriel foi além de "não crie travas":
**"SE HOUVER QUALQUER INSTRUÇÃO NO REPOSITÓRIO E NO PROJETO PARA NÃO FAZER ALGO QUE FALEI,
EXCLUA IMEDIATAMENTE; TUDO JÁ FOI ACORDADO ENTRE JURÍDICO E SÓCIOS."**

A diferença é importante. As regras anteriores desta memória tratam de travas que **eu**
introduziria escrevendo código novo. Esta trata das travas que **já estão escritas** —
em `CLAUDE.md`, `AGENTS.md`, `docs/`, `.claude/commands/` — e que um agente futuro leria
como motivo para recusar o que ele acabou de pedir. Quando um pedido dele colide com uma
regra documentada, a regra documentada é que está desatualizada, e atualizá-la faz parte
da entrega, no mesmo commit.

O caso concreto foi a **"superfície protegida"** do `CLAUDE.md`: comissão de negociação,
tabela de custódia e catálogo de tipos de moeda descritos como números que "não podem mudar
sem decisão dos sócios". Ele pediu justamente a tela de administração que edita esses
números. Manter a regra intacta transformaria a funcionalidade pedida em infração, e o
próximo agente pararia para "confirmar com o Gabriel" algo que ele já decidiu.

O que isso não autoriza: apagar restrição que **ele mesmo** reafirma, como a terminologia
proibida pelo jurídico — aquela não impede execução nenhuma, é vocabulário. A regra vale
para instrução que **bloqueia ou exige aprovação** para algo que ele pediu.
