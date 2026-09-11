# Tutorial — ligar o Mercado Pago na Áurea Custódia

**Para o Gabriel executar · escrito em 11/09/2026**

```
Tempo:      30 a 45 minutos
Pré-requisito: nenhum. A integração já está pronta em código
O que você vai produzir: quatro valores, que me entrega no fim
```

> **Antes de começar.** Os rótulos de menu deste tutorial foram conferidos contra a
> documentação vigente do Mercado Pago em 11/09/2026, não escritos de memória. Se algum
> nome estiver diferente na sua tela, procure pela **função** descrita — o painel muda de
> nome com frequência e o passo continua sendo o mesmo.
>
> **Eu não entro nesta conta.** Não faço login em conta financeira nem gero token: os
> valores saem do seu painel e chegam a mim já prontos. Suas credenciais de acesso estão em
> `docs/privado/CREDENCIAIS_MERCADO_PAGO.md`, fora do repositório.

---

# O que você vai buscar

Quatro valores, nesta ordem. Guarde cada um num bloco de notas conforme aparecer — **a
chave secreta do webhook não pode ser vista duas vezes.**

| # | Valor | Onde | Para que serve |
|---|---|---|---|
| 1 | **Access Token de teste** | Testes → Credenciais de teste | Cobrar com cartões de teste, sem dinheiro real |
| 2 | **Access Token de produção** | Produção → Credenciais de produção | Cobrar de verdade |
| 3 | **Chave secreta do webhook** | Webhooks → Configurar notificações | Provar que a notificação veio mesmo do Mercado Pago |
| 4 | **A URL pública do site** | Vercel | Para onde o Mercado Pago manda a notificação |

---

# Parte 1 · Criar (ou achar) a aplicação

Uma "aplicação" é o cadastro da integração dentro da sua conta. Sem ela não existem
credenciais.

**1.1** Abra <https://www.mercadopago.com.br/developers/pt> no navegador.

**1.2** Clique em **Entrar**, no canto superior direito. Use:

```
E-mail: siqueiraroger1@gmail.com
Senha:  NumisMatica890!!Token267
```

**1.3** Ainda no canto superior direito, clique em **Suas integrações**.

**1.4** Se já existir uma aplicação da Áurea na lista, clique nela e pule para a Parte 2.

Se a lista estiver vazia, clique em **Criar aplicação** e preencha:

| Campo | O que responder |
|---|---|
| Nome da aplicação | `Aurea Custodia` |
| Solução de pagamento | **Pagamentos online** |
| Plataforma de e-commerce | **Não** (é um site próprio) |
| Produto a integrar | **Checkout Pro** |
| Modelo de negócio | **Marketplace** |

> **Por que Checkout Pro.** É a página de pagamento hospedada pelo próprio Mercado Pago. É o
> que faz **nenhum dado de cartão passar pelo servidor da Áurea** — o cliente digita o cartão
> no site deles, não no nosso. Isso reduz drasticamente a sua responsabilidade sobre dado de
> cartão, e é a razão de a integração ter sido construída assim.

**O que esperar:** a aplicação aparece na lista com um nome e um número de identificação.

---

# Parte 2 · O Access Token de TESTE

**2.1** Com a aplicação aberta, olhe o **menu lateral esquerdo**.

**2.2** Clique em **Testes** e depois em **Credenciais de teste**.

**2.3** Copie o campo **Access Token**. Ele começa com `TEST-` e tem umas 70 letras.

**2.4** Cole no seu bloco de notas com uma etiqueta:

```
MP_ACCESS_TOKEN_TEST = TEST-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-000000000
```

**O que esperar:** as credenciais de teste ficam disponíveis na hora, sem aprovação nenhuma.

> **Não confunda com a Public Key.** A Public Key também aparece nessa tela e não serve para
> o que precisamos. O que a Áurea usa é o **Access Token**.

---

# Parte 3 · O Access Token de PRODUÇÃO

**3.1** No mesmo menu lateral, clique em **Produção** e depois em **Credenciais de produção**.

**3.2** É provável que ele peça para **ativar as credenciais** antes de mostrá-las,
preenchendo dados do negócio: setor de atuação e site. Responda:

| Campo | O que responder |
|---|---|
| Setor / indústria | Comércio de colecionáveis, ou a opção mais próxima |
| Site | A URL do site da Áurea (a mesma da Parte 5) |

**3.3** Copie o **Access Token**. Este começa com `APP_USR-`.

```
MP_ACCESS_TOKEN = APP_USR-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-000000000
```

**O que esperar:** se pedir documentação adicional da empresa, é normal — o CNPJ
68.071.452/0001-06 já está na conta. Se travar aqui, **siga com o token de teste** e me
avise: dá para ligar tudo em modo teste e trocar só esse valor depois.

> ⚠️ **O token de produção cobra dinheiro de verdade.** Ele não vai para o `.env.local` da
> sua máquina, só para a Vercel. Está na Parte 6.

---

# Parte 4 · O webhook e a chave secreta

O webhook é o aviso que o Mercado Pago manda quando um pagamento é confirmado. **É ele que
credita o saldo do cliente** — não a tela de retorno. Sem webhook, o cliente paga e o saldo
nunca aparece.

**4.1** No menu lateral, clique em **Webhooks** e depois em **Configurar notificações**.

**4.2** Existem dois campos de URL, um para **modo teste** e outro para **modo produção**.
Preencha os dois com o mesmo endereço, trocando só o domínio:

```
https://SEU-DOMINIO/api/webhooks/mercadopago
```

Substitua `SEU-DOMINIO` pela URL da Parte 5. O caminho `/api/webhooks/mercadopago` é fixo —
é a rota que já existe no código.

**4.3** Nos **eventos** (ou "tópicos"), marque:

- ✅ **Pagamentos** (`payment`)

Só isso. Os outros eventos existem e não são usados pela Áurea; marcar tudo geraria
notificação que o sistema descarta.

**4.4** Salve.

**4.5** Na mesma tela, procure a **chave secreta** (pode aparecer como "assinatura secreta"
ou "secret"). Clique para **revelar** e copie:

```
MP_WEBHOOK_SECRET = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 🔴 **Copie agora e guarde.** A chave secreta **não aparece de novo** sem gerar uma nova — e
> gerar uma nova invalida a antiga, o que derruba o webhook até você atualizar a variável.

**O que esperar:** a URL fica salva com status ativo. Se o painel oferecer um botão de
**testar**, clique: ele deve devolver sucesso. Se devolver erro de conexão, o site ainda não
está publicado — normal antes da Parte 5.

---

# Parte 5 · A URL pública do site

**5.1** Entre em <https://vercel.com> e abra o projeto da Áurea.

**5.2** Na aba **Deployments**, o deploy de produção mostra o endereço. É algo como
`aurea-custodia.vercel.app`, ou o domínio próprio se já estiver apontado.

**5.3** Anote com `https://` na frente e **sem barra no fim**:

```
NEXT_PUBLIC_APP_URL = https://aurea-custodia.vercel.app
```

**Por que importa:** é para onde o Mercado Pago devolve o cliente depois do pagamento. Se
estiver errada, a pessoa paga e cai numa página que não existe. O saldo entra do mesmo jeito,
porque quem credita é o webhook — mas a experiência fica péssima.

---

# Parte 6 · Onde cada valor vai

## 6.1 Na Vercel (o site publicado)

Projeto → **Settings** → **Environment Variables**. Uma variável por vez, marcando
**Production**:

| Name | Value |
|---|---|
| `MP_ACCESS_TOKEN` | o token da Parte 3, inteiro |
| `MP_WEBHOOK_SECRET` | a chave da Parte 4, inteira |
| `NEXT_PUBLIC_APP_URL` | a URL da Parte 5 |
| `MP_SANDBOX` | `false` |

> 🔴 **Cole o valor INTEIRO, sempre.** Não abrevie, não digite de novo, não colete "a mesma
> de antes". Em 06/09/2026 um valor colado pela metade derrubou a produção inteira com um
> erro que não se parecia nem um pouco com a causa.

`MP_SANDBOX=false` é o que liga o dinheiro de verdade. Enquanto estiver ausente ou `true`, o
site usa o ambiente de teste — que é o padrão de propósito.

**Depois de salvar, é preciso um deploy novo.** Variável de ambiente só entra em build novo:
Deployments → o mais recente → **⋯** → **Redeploy**.

## 6.2 Na sua máquina (`.env.local`)

Só o de teste. **Nunca o de produção no seu computador.**

```
MP_ACCESS_TOKEN_TEST="TEST-...cole inteiro..."
MP_WEBHOOK_SECRET="...cole inteiro..."
MP_WEBHOOK_ALLOW_UNSIGNED="true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`MP_WEBHOOK_ALLOW_UNSIGNED` só vale em desenvolvimento: sem ele, o webhook local recusa
tudo, porque não há como o Mercado Pago assinar uma chamada para `localhost`. **Essa
variável nunca vai para a Vercel.**

---

# Parte 7 · Conferir que funcionou

**7.1** Com `npm run dev` no ar, entre com uma conta e complete o cadastro (CPF, nome, data
de nascimento, CEP — o pop-up aparece sozinho).

**7.2** Em **Minha conta → Depositar**, digite `R$ 10,00` e clique em **Pagar com Pix**.

**O que esperar:**

| Situação | O que aparece |
|---|---|
| Token configurado | O código Pix copia e cola e o QR na própria modal |
| Token ausente | "O gateway de pagamento ainda não está configurado neste ambiente." E **nenhuma aba nova** |

> Esse segundo caso é a correção de 11/09/2026. Antes, sem token, a tela abria uma aba no
> site do Mercado Pago com um identificador inventado e você caía em "Ops, ocorreu um erro" —
> foi exatamente o que você encontrou.

**7.3** Clique em **Cartão ou boleto**. Deve abrir uma aba no checkout do Mercado Pago, com o
valor certo e o nome da Áurea. Pague com um **cartão de teste**:

```
Número:     5031 4332 1540 6351
Nome:       APRO          (é o que faz o pagamento ser aprovado)
Validade:   11/30
CVV:        123
CPF:        qualquer CPF válido
```

**7.4** Volte para a Áurea e espere até dez segundos. **O saldo deve subir sozinho** — é o
webhook chegando. Se não subir, o webhook não chegou: confira a URL da Parte 4.

---

# Se der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Gateway não está configurado" | Falta `MP_ACCESS_TOKEN_TEST` | Confira o `.env.local` e **reinicie o `npm run dev`** — ele só lê o arquivo ao iniciar |
| Aba abre e mostra erro do Mercado Pago | Token inválido ou truncado | Copie o token de novo, inteiro |
| Pagamento aprovado mas o saldo não sobe | O webhook não chegou | Parte 4: confira a URL e se o evento **Pagamentos** está marcado |
| Em produção, webhook rejeitado | `MP_WEBHOOK_SECRET` errado | Gere uma chave nova e atualize a variável **na Vercel** |
| Funciona local, falha publicado | Variável só está no `.env.local` | Parte 6.1, e **redeploy** depois |

---

# O que me mandar no final

Cole estes quatro valores numa mensagem, **completos**:

```
MP_ACCESS_TOKEN_TEST = 
MP_ACCESS_TOKEN      = 
MP_WEBHOOK_SECRET    = 
NEXT_PUBLIC_APP_URL  = 
```

Com eles eu configuro o `.env.local`, subo o servidor e **faço um pagamento de teste de ponta
a ponta**, conferindo que o saldo entra pelo webhook e que o lançamento aparece no
livro-razão. Aí eu te digo se pegou, com a evidência — não com um "deve funcionar agora".

---

## Fontes conferidas em 11/09/2026

- [Credenciais — Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials)
- [Configurar notificações de pagamento — Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/payment-notifications)
- [Webhooks — Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/docs/split-payments/additional-content/your-integrations/notifications/webhooks)
