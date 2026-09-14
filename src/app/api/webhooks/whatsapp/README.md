# `POST /api/webhooks/whatsapp` — as mensagens do cliente chegando ao painel

O webhook do WhatsApp do atendimento (plano do Admin, seção 2.4; frente C, sub-branch C2). Mesmo
desenho de `/api/webhooks/mercadopago`: confere a autenticação, normaliza, grava e responde.

| Arquivo | O que faz |
|---|---|
| `route.ts` | A ordem dos passos e o código de cada recusa |
| `route.test.ts` | 6 testes: sem provedor, autenticação, JSON, evento que não é mensagem, gravação, banco fora |

## Respostas

| Situação | Status | Por quê |
|---|---|---|
| Nenhum provedor configurado (só o registro local) | 503 | Faz a Evolution tentar de novo enquanto as variáveis não entram |
| Corpo acima de 1 MB | 413 | Mídia em base64 deve ficar desligada na Evolution (`webhook.base64: false`) |
| Autenticação inválida | 401 | Conferida antes de ler o JSON |
| Corpo que não é JSON | 400 | — |
| Evento que não é mensagem de uma pessoa | 200 | O provedor precisa do 200 para parar de reenviar |
| Sem banco | 503 | A mensagem não tem onde ficar; o provedor reenvia |
| Gravado | 200 | `{ ok, mensagens, repetidas, status }` |
| Falha ao gravar | 500 | O provedor reenvia, e a reentrega não duplica (`id_no_provedor` único) |

A gravação acontece **antes** da resposta, não num `after()`: são poucas linhas numa transação curta,
e a Evolution não reenvia o que recebeu 200.

## Autenticação

A Evolution não assina o corpo (RA-42). Ela manda os cabeçalhos configurados no webhook da instância;
com o cabeçalho `jwt_key` valendo `WHATSAPP_WEBHOOK_SECRET`, ela troca por
`Authorization: Bearer <JWT de 10 minutos>`, que `src/lib/mensageria/evolution.ts` confere. O próprio
segredo como `Authorization: Bearer …` também é aceito.

## Conexões

| Pasta | Relação |
|---|---|
| `src/lib/mensageria/` | `provedorDoAmbiente`, `conferirAssinatura`, `normalizarEvento` |
| `src/server/admin/cs.ts` | `receberEventos`: contato, conversa, conta pelo telefone, estado de entrega |
