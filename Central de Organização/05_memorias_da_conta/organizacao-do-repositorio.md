---
name: organizacao-do-repositorio
description: "Padrão de organização exigido pelo Gabriel no repositório da Áurea Custódia — subpastas isoladas e um README.md explicativo em cada pasta, para permitir edição simultânea por vários agentes."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 7c434cdf-f33c-4d46-8d58-0e4682daa0c2
  modified: 2026-09-02T01:42:31.811Z
---

# Organização do repositório da Áurea Custódia

Gabriel definiu, em 01/09/2026, um padrão de organização cujo objetivo é **permitir que
vários chats do Claude e outros agentes editem features diferentes ao mesmo tempo sem se
atropelarem**. O padrão vale para toda edição crítica a partir dessa data.

## As quatro regras

1. **Subpastas melindrosamente organizadas.** Cada feature precisa poder ser editada sem
   tocar em partes não relacionadas do repositório. Pasta que mistura assuntos é pasta que
   gera conflito de merge entre agentes.

2. **Um `README.md` explicativo em cada pasta**, descrevendo todos os arquivos e caminhos
   dela e **todas as conexões que ela tem com as demais pastas**. A função desse documento
   é impedir que uma edição feita numa feature nova derrube outra pasta ou quebre
   referências de arquivos essenciais.

3. **Conexões de API bem desenhadas e documentadas**, com MD próprio, para evitar edições
   indesejadas e erros de referência.

4. **Tudo que envolve backend é explícito e se modifica com cuidado.**

## A restrição que acompanha o padrão

Gabriel foi enfático: a reorganização **não pode causar erro crítico que derrube o site ao
commitar**. Isso significa que mudança de estrutura de pastas é feita em etapas
verificáveis — build, typecheck e testes verdes a cada passo — e nunca como um movimento
grande e único de arquivos.

## Como ele quer trabalhar

Uma função por chat: sessões separadas e dedicadas para cada feature ou frente, em vez de
uma sessão longa que toca tudo.
