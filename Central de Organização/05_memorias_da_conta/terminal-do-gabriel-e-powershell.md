---
name: terminal-do-gabriel-e-powershell
description: "O terminal do Gabriel é Windows PowerShell, onde `&&` é erro de sintaxe — todo comando entregue a ele vai um por linha, sem encadeador e sem `cd`, porque ele já está na pasta do projeto."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: acf601ea-cd67-4b31-9044-e20eff16470a
  modified: 2026-09-20T18:36:10.005Z
---

# Comando para o Gabriel colar vai em PowerShell, um por linha

Em 20/09/2026, depois de eu mandar mais um comando gigante encadeado com `&&`, ele cortou:
*"Não tem como usar esses separadores && que você fica colocando! Isso não é aceito em terminal
porra. Me dá tudo separado e lembrando: eu já tô na pasta certa da AureaCustodia, não precisa do
comando do 'cd'."*

## O fato técnico

O terminal dele é **Windows PowerShell 5.1**, não bash. Nele os operadores de encadeamento `&&`
e `||` **não existem** — a linha nem chega a executar, morre em erro de parser. Isso vale também
para ternário (`?:`), `??`, `2>/dev/null`, `head`, `tail`, `which`, `touch` e o resto do
vocabulário POSIX que eu escrevo por reflexo.

Eu posso rodar bash pela minha própria ferramenta, e é daí que vem o vício: o que funciona
quando **eu** executo não funciona quando **ele** cola.

## As três regras para todo comando que eu entrego a ele

1. **Um comando por bloco, uma linha por bloco.** Nada de encadear. Se são cinco passos, são
   cinco blocos, na ordem, com uma frase curta dizendo o que cada um faz.
2. **Sem `cd`.** Ele já está na pasta do projeto quando abre o terminal. Um `cd` a mais é ruído,
   e se o caminho estiver errado o comando falha por motivo bobo.
3. **Sintaxe de PowerShell.** Laço é `foreach ($x in 'a','b') { ... }`; condicional é
   `if (Test-Path x) { ... }`; silenciar erro é `2>$null`. Quando eu precisar de vários passos
   numa linha só, o separador é `;`, que o PowerShell aceita — mas ele executa o segundo mesmo
   que o primeiro falhe, então prefiro blocos separados quando a ordem importa.

Isso não muda como eu trabalho na minha própria ferramenta Bash — muda o que eu **escrevo na
resposta** para ele colar.
