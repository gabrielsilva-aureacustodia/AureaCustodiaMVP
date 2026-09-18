# 04 · WhatsApp do atendimento (Evolution API)

```
Pendência:   P-C2-02 (docs/PENDENCIAS_ABERTAS.md, seção 1)
Executor:    Claude Cowork, no navegador — com dois pedaços que precisam de terminal
Tempo:       1 a 2 horas, a maior parte esperando servidor subir
Prioridade:  baixa. Nada trava sem isso — as respostas de /admin/cs ficam registradas só no painel
```

> ⛔ **DEPENDE DE DECISÃO. Pergunte antes de começar.**
>
> *O adaptador que já está pronto em código é o da **Evolution API**, que é auto-hospedada: precisa
> de um servidor nosso rodando (Railway, Fly.io ou parecido), e isso tem custo mensal. A
> alternativa seria a **Z-API**, que é um serviço pronto, mas aí o código do adaptador precisa
> mudar — é trabalho de outro agente, não meu. Sigo com a Evolution?*
>
> **Se a resposta for Z-API ou "depois":** pare aqui e registre a decisão. Não comece a hospedar
> nada.

---

## O que vai existir no fim

Quatro variáveis na Vercel de produção, e um celular com WhatsApp conectado:

| Variável | O que é |
|---|---|
| `EVOLUTION_API_URL` | O endereço público do servidor da Evolution, sem barra no fim |
| `EVOLUTION_API_KEY` | A chave que o servidor da Evolution exige em cada chamada |
| `EVOLUTION_INSTANCE` | `aurea-cs` |
| `WHATSAPP_WEBHOOK_SECRET` | Um segredo nosso, que prova que a chamada veio da Evolution |

---

## Parte 1 · Hospedar a Evolution API

**1.1** Abra `https://railway.app` (ou `https://fly.io`, se o Gabriel preferir).

> 🔴 **PONTO DE PAUSA HUMANA — conta e cartão.** Criar conta, aceitar termos e cadastrar forma de
> pagamento é do Gabriel. Escreva: *Preciso de uma conta no Railway com plano que aceite um serviço
> rodando 24 horas. Você cria e me avisa? Eu sigo a partir do painel logado.*

**1.2** Com a conta pronta e logada, crie um serviço novo a partir da imagem Docker oficial da
Evolution API **v2**. No Railway: **New** → **Empty Service** → em **Settings → Source**, aponte
para a imagem `atendai/evolution-api:v2.1.1` (ou a v2 mais recente que a documentação oficial
indicar no dia).

**1.3** Nas variáveis do serviço, defina no mínimo:

| Nome | Valor |
|---|---|
| `AUTHENTICATION_API_KEY` | um segredo longo, **trocando o valor de fábrica** |
| `SERVER_URL` | o endereço público que o Railway gerar para o serviço |

> **Por que trocar a chave de fábrica.** A Evolution vem com uma chave padrão documentada
> publicamente. Deixar a padrão é deixar o WhatsApp da empresa aberto para qualquer pessoa que
> conheça o endereço.

Para gerar o segredo, peça ao Gabriel que rode no terminal dele:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**1.4** Espere o serviço subir e anote o endereço público, algo como
`https://evolution-production-xxxx.up.railway.app`. **Sem barra no fim.**

**1.5 Conferir:** abrir o endereço no navegador responde alguma coisa da Evolution (uma mensagem
de status ou um erro de autenticação — as duas provam que está no ar).

---

## Parte 2 · A instância e o QR code

Estes dois comandos precisam de terminal. Se você não tiver um, mande-os para o Gabriel colar,
**já preenchidos**, e espere a resposta dele.

**2.1** Gere o segredo do webhook (guarde, vai virar `WHATSAPP_WEBHOOK_SECRET`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2.2** No PowerShell, uma linha por vez:

```powershell
$evolution = "COLE AQUI A URL DO SERVIDOR DA EVOLUTION, SEM BARRA NO FIM"
```

```powershell
$chave = "COLE AQUI O VALOR DE AUTHENTICATION_API_KEY"
```

```powershell
$segredo = "COLE AQUI O VALOR GERADO NO 2.1"
```

```powershell
Invoke-RestMethod -Method Post -Uri "$evolution/instance/create" -Headers @{ apikey = $chave } -ContentType 'application/json' -Body '{"instanceName":"aurea-cs","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

**2.3** Abra no navegador o endereço do servidor seguido de `/manager`, entre com a mesma chave,
abra a instância `aurea-cs` e mostre o QR code.

> 🔴 **PONTO DE PAUSA HUMANA — ler o QR com o celular.** É o WhatsApp do atendimento que precisa
> ser conectado, e só quem tem o aparelho na mão faz isso. Escreva: *O QR code está na tela. Abra o
> WhatsApp do celular do atendimento → Aparelhos conectados → Conectar um aparelho, e leia o
> código. Me avise quando aparecer conectado.*

**2.4** Ainda no terminal, ligue o webhook da instância:

```powershell
$corpo = @{ webhook = @{ enabled = $true; url = 'https://aurea-custodia-mvp.vercel.app/api/webhooks/whatsapp'; byEvents = $false; base64 = $false; headers = @{ jwt_key = $segredo }; events = @('MESSAGES_UPSERT', 'MESSAGES_UPDATE') } } | ConvertTo-Json -Depth 5
```

```powershell
Invoke-RestMethod -Method Post -Uri "$evolution/webhook/set/aurea-cs" -Headers @{ apikey = $chave } -ContentType 'application/json' -Body $corpo
```

---

## Parte 3 · As quatro variáveis na Vercel

Mesma mecânica do documento 01, Parte 4. Ambiente **Production**:

| Key | Value |
|---|---|
| `EVOLUTION_API_URL` | o endereço do servidor, sem barra no fim |
| `EVOLUTION_API_KEY` | o mesmo valor de `AUTHENTICATION_API_KEY` |
| `EVOLUTION_INSTANCE` | `aurea-cs` |
| `WHATSAPP_WEBHOOK_SECRET` | o segredo gerado em 2.1 |

Depois: **Deployments** → deploy de produção mais recente → **⋯** → **Redeploy**.

---

## Parte 4 · Conferir

**4.1** A aba Integrações (`/admin/configuracao?aba=integracoes`) mostra **WhatsApp do atendimento
(Evolution API)** como **ligado**.

**4.2** Sem autenticação, a rota do webhook deve responder **401**. Se responder **503**, as
variáveis não chegaram ao deploy:

```powershell
try { Invoke-WebRequest -Method Post -Uri https://aurea-custodia-mvp.vercel.app/api/webhooks/whatsapp -Body '{}' -ContentType 'application/json' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```

**4.3** Em `/admin/cs`, o botão **Conferir conexão** responde *"WhatsApp conectado."*

**4.4** Uma mensagem mandada de outro celular para o número do atendimento aparece na caixa de
`/admin/cs` em até 5 segundos.

**4.5** Por último: o número do atendimento entra em `/admin/configuracao`, aba **Operacional**, e
passa a aparecer em `https://aurea-custodia-mvp.vercel.app/suporte` (pendência P-C2-06).

---

## Fonte

Os comandos das partes 2.2 e 2.4 foram conferidos no código-fonte da Evolution API em 14/09/2026.
A imagem e a documentação oficial mudam de versão com frequência — confira
`https://doc.evolution-api.com` antes de subir o serviço.
