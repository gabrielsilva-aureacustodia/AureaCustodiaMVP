---
name: entregar-comando-quando-bloqueado
description: "Quando uma ação minha é bloqueada, Gabriel quer o comando pronto para colar — e todo valor de configuração deve vir literal e completo, nunca descrito ou referenciado."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 40d1667a-effd-4b9d-b38d-76d8c47b8df9
  modified: 2026-09-15T11:46:03.148Z
---

# Entregar o que se cola: comando pronto e valor literal

## Primeiro: o que eu posso executar, eu executo

Em 15/09/2026 o tutorial manual pedia a ele um `git pull --ff-only` na pasta principal. Ele respondeu:
**"O tópico 2 não tem NENHUMA necessidade de você me pedir pra fazer. Eu fiz, mas você podia ter
executado. (...) Se você pode você mesmo fazer, faça; se não conseguiu, ME AVISE IMEDIATAMENTE e me dê o
código e onde executar e para que serve."**

A ordem, então, é: **tentar executar eu mesmo** (git na pasta principal, atualização de branch, comando de
banco, build) antes de escrever qualquer passo manual. Tutorial manual é só para o que exige a pessoa —
painel externo com login dele, credencial que só existe lá, decisão. Se a tentativa for barrada, avisar
**na hora**, com o comando pronto, a pasta onde rodar e para que serve — não guardar para o fim nem
transformar em item de tutorial.

Gabriel pediu em 06/09/2026, durante uma publicação urgente: **"se tá dando erro nas
execuções automáticas pelo Claude me fala o que escrever no terminal e eu mesmo faço"**.

## Comando pronto quando algo me bloqueia

Quando o modo automático, uma regra de permissão ou um classificador barra um comando meu,
o trabalho não para: a entrega passa a ser o **comando exato, pronto para colar**, num bloco
de shell, com o diretório certo e sem placeholder que ele tenha que adivinhar. Junto vai o
que se espera ver como resposta, para ele saber se funcionou sem perguntar. Anunciar o
bloqueio e aguardar instrução é o que ele não quer.

Atenção ao shell: a máquina dele é Windows com **PowerShell**. Comandos Unix como `printf`
falham ali. Preferir a forma interativa do utilitário, que funciona em qualquer terminal.

## Valor de configuração vai literal, sempre

No mesmo dia eu escrevi, num passo a passo de painel, *"Value: a string do pooler 6543 (a
mesma do `.env.local`)"* em vez de repetir a string inteira. Ele colou um valor truncado, a
produção passou a falhar com `getaddrinfo ENOTFOUND base`, e o login parou de funcionar por
completo — inclusive o que nem dependia daquela conexão. A reação foi: **"Quem me passou o
valor do postgres errado foi você! Você me disse que só precisava do valor da porta"**.

A regra que decorre: ao pedir que ele preencha qualquer campo de configuração — variável de
ambiente, URL, chave, registro DNS —, escrever o **valor completo e literal**, num bloco de
código próprio, mesmo que já tenha aparecido antes na conversa. Nunca descrever o valor
("a string do pooler", "a mesma de antes", "aquela chave"), porque descrição vira colagem
parcial, e colagem parcial em variável de ambiente produz erro que não se parece em nada
com a causa.
