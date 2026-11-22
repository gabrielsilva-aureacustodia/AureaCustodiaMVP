---
name: registrar-atalhos-assumidos
description: "No projeto Áurea Custódia, todo atalho de teste ou de segurança tomado para entregar rápido precisa ser registrado em dois lugares — um documento compilador na raiz e uma nota na pasta do arquivo modificado."
metadata: 
  node_type: memory
  pinned: true
  originSessionId: 7c434cdf-f33c-4d46-8d58-0e4682daa0c2
  modified: 2026-09-02T04:25:19.456Z
---

# Todo atalho tomado precisa ficar escrito em dois lugares

Gabriel definiu em 01/09/2026 que **é aceitável pular etapas de teste e de segurança para
entregar mais rápido** — a prioridade declarada é ter o site e a plataforma prontos logo.
Mas a permissão vem com uma contrapartida obrigatória e não negociável.

## A regra

Sempre que uma função for modificada para entrega rápida — pulando teste, pulando validação,
adiando tratamento de segurança, aceitando risco conhecido — o que foi pulado precisa ser
escrito **explicitamente** em dois lugares:

1. **Um documento na pasta raiz que compila todos os atalhos**, servindo de lista única do
   que a plataforma deve ao próprio rigor.
2. **Uma nota na pasta do arquivo modificado**, descrevendo o atalho específico daquele
   ponto do código.

Os dois, sempre. Não é um ou outro.

## Por que ele pediu isso

Porque atalho não registrado vira defeito esquecido. O documento da raiz responde "o que
essa plataforma deve?" numa olhada; a nota na pasta responde "por que este arquivo está
assim?" para quem abrir o código meses depois sem contexto — inclusive outro agente
trabalhando numa feature vizinha.

## O que isso muda no comportamento

Não basta implementar o atalho e mencioná-lo na conversa. O registro é parte da entrega:
uma tarefa que toma um atalho só está concluída quando os dois documentos foram
atualizados no mesmo commit que introduziu o atalho.

Vale também para decisões de negócio que assumem risco conhecido, não só para código —
por exemplo, adiar um parecer jurídico e seguir mesmo assim.
