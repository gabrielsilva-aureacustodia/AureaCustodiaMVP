---
name: entregar-ligado-para-testar
description: "Quando o Gabriel diz \"isso eu decido depois\", ele quer dar detalhes depois — a função se entrega LIGADA e funcional para ele testar, não desligada esperando"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 93fe74c7-a5a1-4f52-aae4-346b25424b11
  modified: 2026-10-23T12:28:33.437Z
---

"Decido depois" (sobre uma função, variável ou etapa) significa "depois eu dou mais detalhes", não "deixe
desligado até eu mandar". A entrega sai funcional, ligada, para ele poder testar.

**Why:** em 23/10/2026 publiquei a emissão de NFS-e com `NFSE_AMBIENTE=producao` desligado porque ele tinha
escrito "a produção da NFS-e eu decido depois". Ele respondeu: "por que você deixou desligada a variável
necessária para enviar as notas?" e explicou que queria tudo funcional para testar.

**How to apply:** ligar o que for preciso para a função rodar de verdade (variável na Vercel, migration,
redeploy) e dizer em uma linha o que foi ligado. Isso NÃO libera decidir regra de negócio, fiscal ou de
cobrança sozinho — essas continuam virando pergunta ([[regra-de-negocio-so-com-pergunta]]). Ver também
[[sem-travas-em-ambiente-de-teste]].
