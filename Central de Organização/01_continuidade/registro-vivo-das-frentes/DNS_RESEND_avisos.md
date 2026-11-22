# Registros de DNS do Resend para `avisos.realolimpico.com.br` (18/11/2026)

Fonte: painel do Resend, domínio `522499c2-00b3-4460-92fe-044e52ac74d1` (criado há 2 meses, estado "Not Started", região São Paulo, provedor HostGator). São registros públicos (nada secreto). A zona DNS de `realolimpico.com.br` fica na HostGator (`dns3` e `dns4.hostgator.com.br`).

O envio sai do SUBDOMÍNIO `avisos.`, assim não mexe no MX nem no SPF do e-mail da hospedagem em `realolimpico.com.br`. O remetente passa a ser `Real Olímpico <nao-responda@avisos.realolimpico.com.br>` (variável `EMAIL_REMETENTE` na Vercel).

| Tipo | Nome (no editor da zona) | Conteúdo | Para quê |
|---|---|---|---|
| TXT | `resend._domainkey.avisos` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCkZyWT5su/DPUWa4xlRvOioxLWwCc89C4bM3rEL3TSery7zat7Qv8014bLb8oFWWrv1ruV99R9L/TTsnqqKoVM2cg/Pr14EgENVxkSEKKcuQ1ryxAQRONXjM089WqpljEzWZSnZJSzkabXZYLTM1SsWUZalDJmr1wlVzCBViXZNQIDAQAB` | DKIM (assinatura) |
| CNAME | `rsend.avisos` | `rsend-sae1.forge.rmta.net` | envio (SPF/retorno) |
| CNAME | `send.avisos` | `send.forge.rmta.net` | envio (SPF/retorno) |
| ~~TXT~~ | ~~`_dmarc`~~ | ~~`v=DMARC1; p=none;`~~ | **NÃO adicionar** (Gabriel, 18/11: não mexer à toa nos registros dele). É recomendado, mas opcional; o Resend envia e verifica sem ele. |

Só os 3 primeiros registros entram, todos NOVOS e sob `avisos.`; nenhum registro existente da zona é alterado ou apagado.

O Resend também lista `avisos` → MX `inbound-smtp.sa-east-1.amazonaws.com`, que é só para RECEBER e-mail: NÃO adicionar (o `avisos` não recebe nada; adicionar poderia atrapalhar).

Depois de cadastrar: no Resend, "Verify DNS records"; a propagação costuma levar de minutos a algumas horas.
