---
name: variavel-ja-cadastrada-nao-se-pede-de-novo
description: "Na Vercel da Áurea Custódia, SUPABASE_SERVICE_ROLE_KEY já está cadastrada — não pedir para criar ou atualizar variável de ambiente sem um motivo concreto e dito."
metadata: 
  node_type: memory
  pinned: false
  originSessionId: 22aafff8-a5af-4bbe-b7ae-265d5b5f30c5
  modified: 2026-09-15T11:45:55.096Z
---

# Variável já cadastrada não entra em tutorial de novo

Em 15/09/2026 o tutorial manual que eu entreguei pedia, mais uma vez, para criar
`SUPABASE_SERVICE_ROLE_KEY` na Vercel. Gabriel respondeu que era **"a quarta ou quinta vez"** e que
**"nossa chave foi salva tem pouco tempo então não há necessidade de atualizar. Se você me pedir para
atualizar, tem que ter um porquê. Se não houver, saiba que já está cadastrada a chave."**

O erro foi copiar a pendência antiga (P-C2-03, "confira se existe") para o tutorial sem checar se ela
já tinha sido resolvida, e tratar "não consigo ver a Vercel daqui" como motivo para pedir de novo.

## O que isso muda

- **`SUPABASE_SERVICE_ROLE_KEY` está cadastrada na Vercel de produção** (confirmado por ele em 15/09).
  Não incluir essa variável em tutorial, pendência ou roteiro.
- **Para qualquer variável de ambiente, só pedir criação ou atualização com um motivo concreto** e
  escrito junto: um erro que cita a variável, uma integração nova que precisa dela, uma rotação que ele
  decidiu. "Não consegui conferir" não é motivo — nesse caso, dizer que não conferi, em uma frase,
  sem transformar em passo.
- Antes de montar um tutorial, conferir no histórico da conversa, nos documentos de pendência e nas
  memórias o que ele já fez, e marcar como feito em vez de repetir.
