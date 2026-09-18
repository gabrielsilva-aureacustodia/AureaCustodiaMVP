# 01 · Mercado Pago em produção — cobrança de verdade

```
Pendência:    B-7 (docs/PENDENCIAS_ABERTAS.md, seção 1)
Executor:     Claude Cowork, no navegador
Tempo:        25 a 40 minutos
Estado hoje:  MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET e MP_SANDBOX NÃO existem na Vercel de produção
              (conferido por `vercel env ls production` em 18/09/2026)
Consequência: toda cobrança da plataforma cai no simulador. Ninguém consegue pagar de verdade.
Paths:        conferidos na documentação oficial do Mercado Pago em 18/09/2026 (fontes no fim)
```

> **Por que este é o item mais crítico.** Depósito, compra direta, plano de custódia, fatura
> mensal e retirada — cinco fluxos inteiros — passam por este gateway. Enquanto as três
> variáveis não existirem, o site abre um simulador em vez do checkout, e nenhum real entra na
> conta da empresa.

---

## 0. Antes de tocar em qualquer coisa

### 0.1 O que você vai produzir

Dois valores. Anote cada um assim que aparecer na tela, porque **o segundo não pode ser visto
duas vezes**.

| # | Valor | Começa com | Onde nasce | Vira a variável |
|---|---|---|---|---|
| 1 | Access Token de **produção** | `APP_USR-` | Produção → Credenciais de produção | `MP_ACCESS_TOKEN` |
| 2 | **Assinatura secreta** do webhook | sem prefixo, texto longo | Webhooks → Configurar notificações | `MP_WEBHOOK_SECRET` |

Uma terceira variável, `MP_SANDBOX`, tem valor fixo `false` e não sai de painel nenhum.

### 0.2 Como entrar na conta

O Gabriel disse que **o Mercado Pago já está conectado no computador e no celular dele**. Abra
`https://www.mercadopago.com.br/developers/pt` e veja se o nome da conta já aparece no canto
superior direito.

- **Se já estiver logado:** siga direto para a Parte 1.
- **Se pedir login:** as credenciais de acesso estão em
  `C:\dev\AureaCustodiaMVP\docs\privado\CREDENCIAIS_MERCADO_PAGO.md`, que fica **fora** do
  repositório público. Se você não alcançar o disco do Gabriel, **PARE e peça a ele**: *Preciso
  do e-mail e da senha do painel do Mercado Pago — estão em
  docs/privado/CREDENCIAIS_MERCADO_PAGO.md.*

> 🔴 **PONTO DE PAUSA HUMANA — segundo fator.** O Mercado Pago costuma mandar uma confirmação
> para o aplicativo no celular. Quando isso aparecer, **pare e avise o Gabriel**: *O Mercado
> Pago mandou uma confirmação para o seu celular. Aprove e me diga quando tiver aprovado.*
> Não tente adivinhar código e não peça a senha do celular dele.

### 0.3 A conta certa

Confira antes de mexer em qualquer coisa: o titular tem que ser **AUREA CUSTODIA LTDA**, CNPJ
**68.071.452/0001-06**. Se a tela mostrar uma conta pessoal, **pare e avise o Gabriel** — gerar
credencial na conta errada faz o dinheiro dos clientes cair na conta errada.

### 0.4 O que nunca fazer nesta tarefa

- **Nunca** clicar em transferir, sacar, pagar ou converter saldo. Nada nesta tarefa move dinheiro.
- **Nunca** gerar uma assinatura secreta nova se já existir uma configurada e funcionando: gerar
  invalida a antiga e derruba o webhook até a variável ser trocada.
- **Nunca** colar a credencial de produção em lugar nenhum além da Vercel, ambiente Production.
  Ela **não** vai para o `.env.local` da máquina do Gabriel.
- **Nunca** confundir a credencial de teste com a de produção: **as duas começam com `APP_USR-`**
  no painel atual. O que distingue é a seção de onde você copiou.

---

## Parte 1 · Achar (ou criar) a aplicação

**1.1** Abra `https://www.mercadopago.com.br/developers/pt`.

**1.2** No canto superior direito, clique em **Suas integrações**.

**1.3** A lista de aplicações aparece.

- **Se já existir uma aplicação da Áurea** (nome parecido com `Aurea Custodia`), clique nela e
  vá para a Parte 2. **Anote o nome exato e o número (Application ID)** para o relatório final.
- **Se a lista estiver vazia**, clique em **Criar aplicação** e preencha:

| Campo | Resposta |
|---|---|
| Nome da aplicação | `Aurea Custodia` |
| Solução de pagamento | **Pagamentos online** |
| Está usando uma plataforma de e-commerce? | **Não** |
| Produto a integrar | **Checkout Pro** |
| Modelo de negócio | **Marketplace** |

> **Por que Checkout Pro.** É a página de pagamento hospedada pelo próprio Mercado Pago. Faz com
> que **nenhum dado de cartão passe pelo servidor da Áurea** — o cliente digita o cartão no site
> deles. A integração inteira foi construída em cima disso; trocar o produto aqui quebraria o
> código que já existe.

**Como conferir que pegou:** a aplicação aparece na lista com nome e número, e o menu lateral
esquerdo mostra as seções **Testes**, **Produção** e **Webhooks**.

---

## Parte 2 · A credencial de produção

**2.1** Com a aplicação aberta, no **menu lateral esquerdo** clique em **Produção** e depois em
**Credenciais de produção**.

**2.2** Se as credenciais ainda estiverem desativadas, a tela pede um formulário curto:

| Campo | Resposta |
|---|---|
| **Indústria** (menu suspenso) | A opção mais próxima de comércio de colecionáveis / varejo de bens de coleção |
| **Website** (obrigatório) | `https://aurea-custodia-mvp.vercel.app` |

> 🔴 **PONTO DE PAUSA HUMANA — aceite de termos e reCAPTCHA.** A tela pede para **aceitar a
> Declaração de Privacidade e os Termos e Condições** do Mercado Pago e para resolver um
> **reCAPTCHA**. Os dois são do Gabriel. Escreva para ele:
>
> *Cheguei na ativação das credenciais de produção. Preenchi Indústria e Website
> (https://aurea-custodia-mvp.vercel.app). Falta aceitar os Termos e Condições do Mercado Pago —
> é um aceite legal em nome da AUREA CUSTODIA LTDA, então é você quem marca — e resolver o
> reCAPTCHA. Pode fazer e clicar em Ativar credenciais de produção? Me avise quando as
> credenciais aparecerem.*

**2.3** Com as credenciais ativas, a seção **Credenciais de produção** mostra **Public Key** e
**Access Token**. Copie o **Access Token** inteiro.

- Começa com `APP_USR-` e tem por volta de 70 caracteres.
- **Não** é a Public Key. A Áurea não usa a Public Key.
- Se houver um botão de olho ou **Revelar**, clique antes de copiar.

**2.4** Guarde com etiqueta, exatamente assim:

```
MP_ACCESS_TOKEN = APP_USR-...cole inteiro, sem cortar, sem espaço no fim...
```

> ⚠️ **Se a ativação travar pedindo documentação adicional da empresa** (acontece), **não force**.
> Avise o Gabriel e **siga assim mesmo** para a Parte 3: dá para ligar tudo com a credencial de
> **teste** (seção **Testes → Credenciais de teste**, Access Token que começa com `TEST-`) e
> trocar só esse valor depois. Nesse caso a variável se chama `MP_ACCESS_TOKEN_TEST` e
> `MP_SANDBOX` fica **`true`** em vez de `false`. Diga isso no relatório final.

---

## Parte 3 · O webhook e a assinatura secreta

O webhook é o aviso que o Mercado Pago manda quando um pagamento é confirmado. **É ele que
credita o saldo do cliente** — não a tela de retorno. Sem webhook, a pessoa paga e o saldo nunca
aparece.

**3.1** No menu lateral, clique em **Webhooks** e depois em **Configurar notificações**.

**3.2** Existem duas abas: **Modo teste** e **Modo produtivo**. Selecione **Modo produtivo**.

**3.3** No campo de URL, cole **exatamente** este endereço, inteiro, sem barra no fim:

```text
https://aurea-custodia-mvp.vercel.app/api/webhooks/mercadopago
```

O caminho `/api/webhooks/mercadopago` é fixo — é a rota que já existe no código, em
`src/app/api/webhooks/mercadopago/route.ts`. Qualquer letra diferente e a notificação não chega.

**3.4** Na lista de eventos, marque **somente**:

- ✅ **Pagamentos**

Não marque os outros. O código descarta tudo que não é pagamento, e marcar tudo só gera ruído.

**3.5** Clique em **Salvar configuração**.

**3.6** Na mesma tela, procure a **assinatura secreta** (pode aparecer como "chave secreta" ou
"secret"). Clique no botão de **revelar** e copie:

```
MP_WEBHOOK_SECRET = ...cole inteiro...
```

> 🔴 **Copie agora.** A assinatura secreta **não aparece de novo**. Gerar outra invalida a atual e
> derruba o webhook até a variável ser trocada na Vercel. Se por acidente você fechar a tela sem
> copiar, avise o Gabriel **antes** de gerar uma nova.

**3.7** Preencha também a aba **Modo teste** com a mesma URL e o mesmo evento. Não custa nada e
faz o botão de simulação funcionar nos dois modos.

**Como conferir que pegou:** a URL aparece salva, com o evento Pagamentos marcado, em estado ativo.

---

## Parte 4 · As três variáveis na Vercel

Dois caminhos. **Tente o A. Se não conseguir entrar na Vercel, use o B** — o B é igualmente
válido e não atrasa nada.

### Caminho A — você mesmo, pelo painel da Vercel

**4.A.1** Abra:

```text
https://vercel.com/aurea-custodia/aurea-custodia-mvp/settings/environment-variables
```

Se pedir login, a Vercel da Áurea entra **pelo GitHub**. Se o navegador não estiver logado,
**pare e peça ao Gabriel** — não tente adivinhar credencial.

**4.A.2** Para cada linha da tabela: clique em **Add Another** (ou **Add New**), preencha **Key**
e **Value**, marque **somente o ambiente Production** e clique em **Save**.

| Key | Value |
|---|---|
| `MP_ACCESS_TOKEN` | o Access Token de produção da Parte 2.4, **inteiro** |
| `MP_WEBHOOK_SECRET` | a assinatura secreta da Parte 3.6, **inteira** |
| `MP_SANDBOX` | `false` |

> 🔴 **Cole o valor INTEIRO, sempre.** Não abrevie, não digite de novo à mão, não confie em "é a
> mesma de antes". Em 06/09/2026 um valor colado pela metade derrubou a produção inteira com um
> erro que não se parecia nem um pouco com a causa. Depois de colar, **confira o começo e o fim**
> do que ficou no campo.

> **Se a ativação da Parte 2 travou** e você está com a credencial de teste: use
> `MP_ACCESS_TOKEN_TEST` no lugar de `MP_ACCESS_TOKEN`, e `MP_SANDBOX` = `true`.

**4.A.3** Uma variável nova só vale em **deploy novo**. No mesmo projeto, vá em **Deployments** →
no deploy de produção mais recente clique nos três pontos (**⋯**) → **Redeploy** → confirme
**Redeploy**. Espere terminar (fica verde, 1 a 3 minutos).

### Caminho B — devolver os valores para quem tem a linha de comando

Se não deu para entrar na Vercel, **não insista**. Termine com uma mensagem final para o Gabriel
contendo **exatamente** este bloco, com os valores preenchidos:

~~~
Mercado Pago pronto no painel. Faltam as variáveis na Vercel. Cole estes três comandos
no terminal, um de cada vez, e depois peça ao Claude Code para conferir:

echo APP_USR-COLE-AQUI-O-TOKEN-INTEIRO | npx vercel env add MP_ACCESS_TOKEN production
echo COLE-AQUI-A-ASSINATURA-SECRETA | npx vercel env add MP_WEBHOOK_SECRET production
echo false | npx vercel env add MP_SANDBOX production
~~~

E, se você alcançar o disco do Gabriel, salve os dois valores em
`C:\dev\AureaCustodiaMVP\docs\privado\CREDENCIAIS_MERCADO_PAGO.md` — arquivo que o Git ignora.

---

## Parte 5 · Conferir que funcionou — as quatro provas

Nenhuma é opcional. "Salvei" não é prova.

### Prova 1 — a aba Integrações do painel

Abra:

```text
https://aurea-custodia-mvp.vercel.app/admin/configuracao?aba=integracoes
```

Se pedir entrada, use `/painel` com a conta `gabriel.silva@aureacustodia.com.br`.

**Esperado:** a linha **Pagamento (Mercado Pago)** aparece como **ligado**, com a observação
**"Modo: produção (MP_SANDBOX=false)."**

Se aparecer *"Modo: teste (MP_SANDBOX ausente ou diferente de false)."*, a variável `MP_SANDBOX`
não chegou ao deploy — refaça o Redeploy da 4.A.3.

### Prova 2 — a rota do webhook está no ar

O Mercado Pago tem um botão **Simular** em **Webhooks**. Clique nele para a URL de produção.

**Esperado:** resposta **200** ou **401**. As duas provam que a rota está viva:

- **200** = a assinatura simulada bateu.
- **401** = a rota recebeu, conferiu a assinatura e recusou. É o comportamento correto para uma
  simulação, e prova que `MP_WEBHOOK_SECRET` está sendo lido.
- **404** ou **500** = problema de verdade. Anote a resposta inteira e avise.

### Prova 3 — o checkout de verdade abre

1. Abra `https://aurea-custodia-mvp.vercel.app/conta` logado.
2. Clique em **Depositar**, digite `1,00` e escolha a aba **Pix**.
3. **Esperado:** aparece o código Pix copia-e-cola e o QR **dentro da própria janela**, com o nome
   da Áurea. O saldo **não** muda ainda — quem credita é o webhook.
4. Volte e clique na aba **Cartão**. **Esperado:** abre o checkout do Mercado Pago com o valor
   certo.

> ⛔ **Não pague.** Em produção esse Pix cobra dinheiro de verdade. A prova aqui é **a tela abrir
> com o QR**, não o pagamento acontecer. Quem decide fazer um depósito real de teste é o Gabriel.

### Prova 4 — o simulador sumiu

Se em vez do QR aparecer *"O gateway de pagamento ainda não está configurado neste ambiente"*, a
credencial não chegou. Volte para a 4.A.2.

---

## Parte 6 · O relatório final

Termine com uma mensagem que responda **todas** estas perguntas, nesta ordem:

1. A aplicação usada já existia ou foi criada? Qual o nome e o número dela?
2. As credenciais de produção foram ativadas, ou travaram pedindo documentação?
3. A URL do webhook ficou salva no Modo produtivo, com o evento Pagamentos?
4. As três variáveis entraram na Vercel (caminho A) ou ficaram para o Gabriel colar (caminho B)?
5. O Redeploy terminou?
6. **Prova 1:** o que a aba Integrações mostra, literalmente?
7. **Prova 2:** qual foi a resposta do botão Simular?
8. **Prova 3:** o QR do Pix apareceu?
9. O que deu errado, se algo deu errado — com o texto exato da mensagem de erro.

Não escreva "deve funcionar agora". Escreva o que você viu na tela.

---

## Se der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Integrações diz **desligado** | A variável não chegou ao deploy | Confira o nome (maiúsculas exatas) e refaça o Redeploy |
| Integrações diz **Modo: teste** | Falta `MP_SANDBOX` = `false` | Adicione a variável e Redeploy |
| Depósito abre o simulador | Falta `MP_ACCESS_TOKEN` | Parte 4, e confira se o valor não ficou truncado |
| Simular devolve 404 | URL do webhook errada | Parte 3.3 — o caminho é `/api/webhooks/mercadopago`, sem barra no fim |
| Simular devolve 500 | Erro no servidor | Copie a resposta inteira e avise; não repita o clique |
| Pagamento feito e saldo não sobe | O webhook não chegou | Parte 3: confira URL, evento Pagamentos e a aba Modo produtivo |
| Tela pede documentação da empresa | Ativação em análise no Mercado Pago | Siga com a credencial de teste (nota da Parte 2.4) e avise |

---

## Fontes conferidas em 18/09/2026

- Credenciais: <https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials>
- Notificações de pagamento (Checkout Pro): <https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/payment-notifications>
- Informações adicionais sobre notificações: <https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/notifications/additional-info>
