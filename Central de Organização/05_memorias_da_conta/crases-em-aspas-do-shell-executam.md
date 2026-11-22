---
name: crases-em-aspas-do-shell-executam
description: "Texto markdown com crases dentro de aspas duplas no Bash (node -e, echo) EXECUTA o que estiver entre as crases; usar heredoc com delimitador entre aspas ou a ferramenta Write"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 40fa1578-191b-4fbd-93c3-a6a13fcfc205
  modified: 2026-11-05T02:49:43.345Z
---

Nunca passar texto com acentos graves (crases do markdown) dentro de `node -e "..."`, `echo "..."` ou qualquer string
entre aspas duplas no Bash. O shell trata cada par de crases como substituição de comando e **roda** o conteúdo.

**Why:** em 04/11/2026, ao acrescentar um parágrafo a um ATALHOS.md, o trecho `git checkout src/app/apple-icon.png`
(escrito como instrução ao leitor) foi executado de verdade e trocou o ícone novo do PWA pelo antigo do git. Outras
crases tentaram rodar nomes de arquivo (`src/lib/pwa/ATALHOS.md` chegou a ser executado como script). Deu para consertar
porque o ícone era regenerável por script — com outro arquivo, teria sido perda.

**How to apply:** para gravar texto com crases em arquivo, usar a ferramenta Write/Edit, ou heredoc com delimitador
entre aspas (`<<'EOF'`), que não interpreta nada, e só então processar o arquivo com node. Se for preciso `node -e`,
o código vai entre aspas simples e sem crases. Antes de qualquer comando com texto livre, procurar crases no texto.
