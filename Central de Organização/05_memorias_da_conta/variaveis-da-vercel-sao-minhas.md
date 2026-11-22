---
name: variaveis-da-vercel-sao-minhas
description: "Criar e editar variáveis de ambiente da Vercel é trabalho MEU (MCP da Vercel ou CLI), nunca do Gabriel; só peço o valor de segredo que existe apenas numa tela de terceiro, e tento buscá-lo sozinho antes"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 912e8bb7-f9db-4092-b180-88f13fc32bc9
  modified: 2026-11-18T15:13:24.056Z
---

O Gabriel disse em 18/11/2026, irritado: "NÃO É MEU LADO NUNCA JAMAIS CRIAR VARIÁVEIS DA VERCEL. Você tem a CLI da Vercel, me dá o link de login e faz você mesmo a criação da environment table."

**Why:** na manutenção de 17/11 eu listei `RESEND_API_KEY` e `EMAIL_REMETENTE` como "ação manual do Gabriel" e o lembrei disso em várias mensagens seguidas. Ele não é técnico de infraestrutura e já tem a Vercel conectada a mim (MCP `mcp__vercel__create_project_env` com `upsert`, `edit_project_env`, e a CLI). Mandar fazer na tela é trabalho que ele não quer.

**How to apply:**
- Variável da Vercel: eu crio com `create_project_env` (`upsert: "true"`, tipo `sensitive` para segredo, `plain` para o resto, alvos `production` e `preview` quando fizer sentido) e confiro depois por `filter_project_envs` (só NOMES; a listagem é enorme, não imprimir nem decifrar valores).
- Nunca listar variável como "pendência do Gabriel". Se o valor só existe numa tela de terceiro (chave de API do Resend, por exemplo), tento obtê-lo eu mesmo (navegador do app, API do provedor, `.env.local`) e só então peço o valor, uma vez, sem mandar ele abrir a Vercel.
- Depois de criar variável, o deploy precisa de nova publicação para valer; avisar e fazer.
- Relacionadas: [[editar-env-local-eu-mesmo]], [[variavel-ja-cadastrada-nao-se-pede-de-novo]], [[dados-completos-em-infraestrutura]].
