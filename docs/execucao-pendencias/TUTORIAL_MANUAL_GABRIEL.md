# Tutorial manual — só o que depende de você

```
Para:        Gabriel
Criado em:   15/09/2026
Contém:      apenas passos que um agente não pode fazer (entrar em painel externo, gerar credencial,
             disparar agentes, decidir e aplicar configuração). Nenhum valor secreto está aqui:
             os que só existem nos painéis são copiados por você no próprio passo.
Caminhos:    os menus da Vercel, do Supabase e do Mercado Pago foram conferidos na documentação
             oficial em 15/09/2026 (fontes no fim).
```

> **Atualização de 18/09/2026 — a maior parte destes passos saiu das suas mãos.** O que é
> navegador virou roteiro para o **Claude Cowork**, em [`../cowork/`](../cowork/): o Mercado Pago
> (passo 5) está em [`cowork/01_MERCADO_PAGO_PRODUCAO.md`](../cowork/01_MERCADO_PAGO_PRODUCAO.md),
> o parcelamento (passo 6) e a gaveta do banco (passo 9) em
> [`cowork/03_TAREFAS_CURTAS.md`](../cowork/03_TAREFAS_CURTAS.md), e o WhatsApp (passo 8) em
> [`cowork/04_WHATSAPP_EVOLUTION.md`](../cowork/04_WHATSAPP_EVOLUTION.md). O texto para colar na
> sessão do Cowork é [`cowork/PROMPT_COWORK.md`](../cowork/PROMPT_COWORK.md). Continuam sendo seus:
> as pausas de segundo fator e reCAPTCHA, as decisões, e **um comando de terminal** para o passo 7
> (`CRON_SECRET`), porque a permissão do modo automático não deixa um agente gravar segredo na
> Vercel.

Faça na ordem. Os passos 1 e 3 destravam o trabalho agora; os passos 2 e 4 já estão feitos; do 5 em diante,
cada um liga uma integração e pode ser feito quando quiser.

**Redeploy** (vale para todo passo que cria variável na Vercel — variável nova só vale em deploy novo): no
projeto, **Deployments** → no deploy de produção mais recente, os três pontos (**…**) → **Redeploy** →
**Redeploy**.

**Atalho para saber o que já está ligado:** depois do passo 1, abra
`https://aurea-custodia-mvp.vercel.app/admin/configuracao?aba=integracoes`. Cada serviço aparece como
**ligado**, **incompleto** ou **desligado**, com o nome de cada variável e se ela está definida na
produção. Passo cujo serviço já aparece **ligado** pode ser pulado.

---

## 1. Entrar no painel administrativo

1. Abra `https://aurea-custodia-mvp.vercel.app/painel`.
2. Entre com `gabriel.silva@aureacustodia.com.br` — pela senha ou por **Entrar com Google**.
3. **Esperado:** abre `https://aurea-custodia-mvp.vercel.app/admin` com o menu lateral do painel
   (Central de Resultados, Atendimento, Operação, Sistema).
4. **Se aparecer** "Você está conectado como …, e esta conta não faz parte da equipe do painel": o e-mail
   mostrado não é o seu corporativo. Clique **Sair e entrar com outra conta** e entre de novo com o
   corporativo.
5. **Rogério e Rozane** entram do mesmo jeito, pelo mesmo endereço: as contas `rogerio@aureacustodia.com.br`,
   `rogeriopena@testeaurea.com.br` e `rozane@testeaurea.com.br` abrem o painel com todas as permissões. Se
   algum deles usar outro e-mail, a tela de entrada mostra qual é — me passe e eu incluo.
6. **Se der erro ou tela em branco**, me mande o texto da tela ou um print.

---

## 2. Atualizar a pasta principal do seu computador — ✅ feito, nada a fazer

Você já atualizou em 15/09. Daqui em diante, atualizar a pasta principal é tarefa do agente, não passo
manual: ele executa, e se o comando for barrado avisa na hora com o comando pronto.

---

## 3. Disparar os agentes de execução — ✅ quase tudo feito; sobrou a E8

E1, E2, E3, E4 e E7 foram executadas, mescladas e publicadas em 18/09/2026. E5 e E6 foram canceladas.

**Falta uma sessão só:** abra um agente novo e cole o bloco **E8** de
`docs/execucao-pendencias/PROMPTS.md`. Ele corrige quatro coisas que dependiam de E2 e E4 estarem no ar —
a principal é que **a compra direta por Pix ou cartão cobra do comprador só o preço do lote, e não a
comissão que a tela mostra em "Total a pagar"**. Enquanto a E8 não rodar, a Áurea deixa de receber a
comissão de quem compra por esse caminho.

---

## 4. Chave de serviço do Supabase na Vercel — ✅ já cadastrada, nada a fazer

`SUPABASE_SERVICE_ROLE_KEY` está na Vercel de produção desde antes desta rodada. Só volta a este tutorial se
aparecer um motivo concreto (por exemplo, a Supabase desligar as chaves legadas, anunciado para o fim de
2026), e o motivo vem escrito junto.

---
## 5. Mercado Pago em produção (cobrança de verdade)

**Para quê:** Pix e cartão de verdade em depósito, compra direta, planos, faturas e retirada. Sem isso, as
cobranças caem no simulador. **Pule** se a aba Integrações mostrar "Pagamento (Mercado Pago)" **ligado** com
"Modo: produção".

**No Mercado Pago:**

1. Entre em `https://www.mercadopago.com.br/developers` → **Suas integrações** (canto superior direito) →
   escolha a aplicação da Áurea (ou crie uma, se não houver).
2. **Ativar as credenciais de produção:** menu lateral **Produção** → **Credenciais de produção**. Se
   estiverem desligadas, preencha **Indústria** e **Website** (`https://aurea-custodia-mvp.vercel.app`),
   aceite os termos, faça o reCAPTCHA e clique **Ativar credenciais de produção**.
3. Copie o **Access Token** da seção **Credenciais de produção** (atenção: a de *teste* também começa com
   `APP_USR-`; o que vale é ter copiado da seção de produção).
4. **Webhook:** menu lateral **Webhooks** → **Configurar notificações** → aba **Modo produtivo** → URL:

```text
https://aurea-custodia-mvp.vercel.app/api/webhooks/mercadopago
```

   Marque o evento **Pagamentos** e clique **Salvar configuração**. Revele e copie a **assinatura
   secreta** gerada.

**Na Vercel** (`https://vercel.com/aurea-custodia/aurea-custodia-mvp/settings/environment-variables`), ambiente
**Production**:

| Name | Value |
|---|---|
| `MP_ACCESS_TOKEN` | o Access Token de produção copiado no item 3, inteiro |
| `MP_WEBHOOK_SECRET` | a assinatura secreta copiada no item 4, inteira |
| `MP_SANDBOX` | `false` |

5. **Redeploy**, como explicado no topo.
6. **Conferir:** a aba Integrações mostra "Pagamento (Mercado Pago)" **ligado** e "Modo: produção". No
   Mercado Pago, em **Webhooks**, o botão **Simular** manda um evento de teste para a URL: a resposta
   esperada é 200 (ou 401 se a assinatura simulada não bater, o que também prova que a rota está no ar e
   conferindo). Um depósito pequeno em `/conta` abre o checkout do Mercado Pago, e não o simulador.

---

## 6. Parcelamento sem acréscimo — só se os sócios decidirem que a Áurea paga os juros

**Decisão B-8.** Se nada for feito, **o comprador paga os juros** do parcelamento (é o padrão do Mercado
Pago, "Parcelado Comprador"), e o parcelamento em até 12x já vem ligado. **Se a decisão for a Áurea absorver:**

1. Abra `https://www.mercadopago.com.br/costs-section` (seção **Taxas e parcelas**).
2. No topo, escolha a ferramenta **Checkout**.
3. Clique **Parcelamento** → **Oferecer**.
4. Ligue **Oferecer parcelado vendedor** e escolha o máximo de parcelas (o plano anual usa até 12x; a
   retirada segura, até 2x).
5. **Conferir:** no checkout de um plano anual, as parcelas aparecem sem acréscimo. A Áurea passa a receber
   o valor menos a tarifa e a taxa de parcelamento, que segue o número de parcelas escolhido pelo cliente.

---

## 7. Tarefas agendadas (faturamento mensal e rastreio diário)

**Para quê:** hoje, sem `CRON_SECRET`, a produção recusa as duas tarefas agendadas — o **faturamento mensal
de custódia nunca rodou** e o rastreio dos Correios não se atualiza sozinho.

**Antes de ligar, saiba:** com a variável, no dia 1 de cada mês às 08h UTC (05h de Brasília) o sistema gera
e debita as faturas de custódia de todas as contas com moeda guardada, inclusive as dos sócios. Conta que
ficar com fatura em aberto passa a ter recibo bloqueado para venda e retirada quando a E4 entrar — **as
contas da equipe do painel ficam isentas** desse bloqueio.

1. No PowerShell, gere o valor:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Na Vercel (`https://vercel.com/aurea-custodia/aurea-custodia-mvp/settings/environment-variables`), ambiente
   **Production**:

| Name | Value |
|---|---|
| `CRON_SECRET` | o texto de 64 caracteres que o comando do item 1 imprimiu |

3. **Redeploy**, como explicado no topo. A Vercel manda o valor sozinha no cabeçalho de cada chamada agendada.
4. **Conferir:** a aba Integrações mostra "Tarefas agendadas" **ligado**; no projeto da Vercel, **Settings**
   → **Cron Jobs** lista `/api/cron/shipping` (diário) e `/api/cron/faturamento` (mensal). No plano
   gratuito, o horário tem precisão de uma hora.

---

## 8. WhatsApp do atendimento

**Para quê:** as mensagens de verdade em `/admin/cs`. Sem isso, as respostas ficam registradas só no
painel. **Decisão sua antes:** o adaptador pronto é o da **Evolution API** (auto-hospedada). Se preferir a
Z-API, me avise antes de começar.

1. **Servidor da Evolution:** hospede a Evolution API v2 (Railway, Fly.io ou outro) com um endereço público
   `https://…` e a variável `AUTHENTICATION_API_KEY` definida no servidor, trocando o valor de fábrica.
2. **Segredo do webhook** — gere e guarde:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Instância e QR code** — numa janela do PowerShell, uma linha de cada vez:

```powershell
$evolution = "COLE AQUI A URL DO SERVIDOR DA EVOLUTION, SEM BARRA NO FIM"
```

```powershell
$chave = "COLE AQUI O VALOR DE AUTHENTICATION_API_KEY DO SERVIDOR DA EVOLUTION"
```

```powershell
$segredo = "COLE AQUI O VALOR GERADO NO ITEM 2"
```

```powershell
Invoke-RestMethod -Method Post -Uri "$evolution/instance/create" -Headers @{ apikey = $chave } -ContentType 'application/json' -Body '{"instanceName":"aurea-cs","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

   Depois abra no navegador o endereço do servidor seguido de `/manager`, entre com a mesma chave, abra a
   instância `aurea-cs` e leia o QR code com o WhatsApp do celular do atendimento (opção de conectar um
   aparelho).

4. **Webhook da instância** — na mesma janela:

```powershell
$corpo = @{ webhook = @{ enabled = $true; url = 'https://aurea-custodia-mvp.vercel.app/api/webhooks/whatsapp'; byEvents = $false; base64 = $false; headers = @{ jwt_key = $segredo }; events = @('MESSAGES_UPSERT', 'MESSAGES_UPDATE') } } | ConvertTo-Json -Depth 5
```

```powershell
Invoke-RestMethod -Method Post -Uri "$evolution/webhook/set/aurea-cs" -Headers @{ apikey = $chave } -ContentType 'application/json' -Body $corpo
```

5. **Vercel** (`https://vercel.com/aurea-custodia/aurea-custodia-mvp/settings/environment-variables`), ambiente
   **Production**:

| Name | Value |
|---|---|
| `EVOLUTION_API_URL` | o endereço do servidor da Evolution, o mesmo `$evolution` do item 3, sem barra no fim |
| `EVOLUTION_API_KEY` | o mesmo valor de `$chave` do item 3 |
| `EVOLUTION_INSTANCE` | `aurea-cs` |
| `WHATSAPP_WEBHOOK_SECRET` | o mesmo valor de `$segredo` (item 2) |

6. **Redeploy**, como explicado no topo.
7. **Conferir:** sem autenticação, a rota deve responder **401** (503 significa que as variáveis não
   chegaram ao deploy):

```powershell
try { Invoke-WebRequest -Method Post -Uri https://aurea-custodia-mvp.vercel.app/api/webhooks/whatsapp -Body '{}' -ContentType 'application/json' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```

   Em `/admin/cs`: **Conferir conexão** responde "WhatsApp conectado."; uma mensagem mandada de outro
   celular aparece na caixa em até 5 segundos.

---

## 9. Opcional — apagar a gaveta de teste do banco

Um schema `aurea_local_admin` foi criado em 14/09 só para conferir o painel sem tocar no banco de verdade.
Tem só dado de demonstração. Se quiser apagar: abra
`https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/sql` → **New query** → cole e clique **Run**:

```sql
DROP SCHEMA aurea_local_admin CASCADE;
```

Não apague nada com outro nome: o banco da plataforma é o schema `aurea`.

---

## Fontes conferidas em 15/09/2026

- Vercel — variáveis e redeploy: `https://vercel.com/docs/environment-variables/managing-environment-variables`,
  `https://vercel.com/docs/deployments/managing-deployments`
- Vercel — tarefas agendadas e `CRON_SECRET`: `https://vercel.com/docs/cron-jobs/manage-cron-jobs`,
  `https://vercel.com/docs/cron-jobs/usage-and-pricing`
- Supabase — chaves: `https://supabase.com/docs/guides/api/api-keys`
- Mercado Pago — credenciais: `https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials`,
  `https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/go-to-production`
- Mercado Pago — webhooks: `https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/payment-notifications`
- Mercado Pago — parcelamento sem acréscimo: `https://www.mercadopago.com.br/ajuda/454`
- Evolution API (passos 8.3 e 8.4): conferidos no código-fonte da Evolution em 14/09/2026.
