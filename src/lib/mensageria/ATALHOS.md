# Atalhos assumidos nesta pasta

> Notas locais dos atalhos tomados em `src/lib/mensageria/` (o WhatsApp do atendimento, frente C).
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md).

---

## RA-42 🟠 — WhatsApp por QR code (Evolution API), sem a API oficial

**Arquivos:** `evolution.ts`, `index.ts`; a rota é `src/app/api/webhooks/whatsapp/route.ts`.

- **Integração não oficial:** o número conectado pelo QR code pode ser banido se o volume de
  mensagens disparar ou se contatos denunciarem.
- **O webhook não assina o corpo:** `conferirAssinatura` aceita o JWT de 10 minutos que a Evolution
  gera com o cabeçalho `jwt_key`, ou o próprio `WHATSAPP_WEBHOOK_SECRET` como Bearer. Um cabeçalho
  capturado vale até expirar (ou para sempre, no modo Bearer).
- **Conversas, telefones e notas sem prazo de retenção** (LGPD).
- **Mídia recebida não é guardada:** a URL do WhatsApp é cifrada; só há endereço usável com o
  armazenamento da própria Evolution ligado.

**Como se paga:** adaptador `cloud-api.ts` (Meta WhatsApp Cloud API, com `X-Hub-Signature-256`) atrás
da mesma interface; enquanto isso, configurar o webhook no modo `jwt_key`. Prazo de retenção
decidido pelo jurídico antes de cliente real.

---

## O que NÃO é atalho nesta pasta

- **O registro local não finge que entregou.** Sem provedor, a resposta é gravada como `registrada`
  e a tela diz "só no painel".
- **Segredo curto é recusado.** `WHATSAPP_WEBHOOK_SECRET` com menos de 16 caracteres não autentica
  nada — o mesmo mínimo da chave de integração dos relatórios.
- **A chave da Evolution nunca sai do servidor.** `evolution.ts` e `index.ts` têm `server-only`.
