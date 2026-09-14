# `src/lib/mensageria/` — o WhatsApp do atendimento

O adaptador entre a caixa de conversas do painel (`/admin/cs`) e o provedor de WhatsApp (plano do
Admin, seção 2.3; frente C, sub-branch C2).

## A frase que explica a pasta

**A tela não conhece provedor.** O painel, o webhook e o serviço do CS falam com a interface
`ProvedorMensageria`; quem sabe o formato de cada provedor é um arquivo desta pasta. Trocar a
Evolution pela API oficial da Meta é escrever outro arquivo com a mesma forma.

## Arquivos

| Arquivo | O que faz | `server-only` |
|---|---|---|
| `tipos.ts` | `ProvedorMensageria` (`enviarTexto`, `enviarMidia`, `conferirAssinatura`, `normalizarEvento`, `estadoDaConexao` opcional), `EventoMensageria` e `ErroDoProvedor` | — |
| `evolution.ts` | O provedor de QR code: Evolution API v2. Envio por `/message/sendText` e `/message/sendMedia` com `apikey`; webhook `messages.upsert` e `messages.update`; autenticação pelo JWT de `jwt_key` ou pelo segredo como Bearer; `connectionState` | ✅ |
| `registro-local.ts` | O "provedor" sem provedor: grava a resposta no painel como `registrada` e não recebe webhook. É o que mantém a tela funcionando sem credencial | — |
| `index.ts` | `provedorDoAmbiente()`: Evolution com as três variáveis, registro local sem elas — e a lista do que falta | ✅ |
| `evolution.test.ts` | 10 testes, sem rede: envio, recusa, autenticação do webhook, tradução dos eventos, escolha pelo ambiente | — |
| `ATALHOS.md` | RA-42 | — |

`cloud-api.ts` (Meta WhatsApp Cloud API) é o segundo adaptador previsto no plano, **para depois**.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `EVOLUTION_API_URL` | A raiz do servidor da Evolution API (sem barra no fim) |
| `EVOLUTION_API_KEY` | A chave de API da Evolution — vai no cabeçalho `apikey` |
| `EVOLUTION_INSTANCE` | O nome da instância que tem o número do atendimento conectado |
| `WHATSAPP_WEBHOOK_SECRET` | O segredo (16+ caracteres) que autentica o webhook. Sem ele, todo webhook é recusado com 401 |

Sem as três primeiras, vale o registro local. O passo a passo com os valores está em
`docs/finalizacoes/PENDENCIAS_AGENTE_C.md`.

## Regras desta pasta

- **Telefone sai daqui canônico** (`src/domain/admin/telefone.ts`): o serviço nunca vê o
  identificador cru do WhatsApp, e o celular brasileiro sem o nono dígito vira o mesmo contato.
- **O que não é conversa de uma pessoa some na tradução**: grupo, status, reação, edição, voto.
- **Erro do provedor é `ErroDoProvedor` com a causa legível** — ela vai para o toast do atendente e
  para a trilha.

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/admin/cs.ts` | O serviço que usa o provedor para enviar e grava o que o webhook traduziu |
| `src/app/api/webhooks/whatsapp/` | A rota que chama `conferirAssinatura` e `normalizarEvento` |
| `src/server/admin/portas.ts` | Reexporta `provedorDoAmbiente` para as Server Actions |
| `src/domain/admin/telefone.ts` | `telefoneDoJid`, `digitosParaEnvio` |
