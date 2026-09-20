# 05 · Domínio oficial — `realolimpico.com.br` na Vercel

```
Objetivo:     a Production da Vercel atender em https://realolimpico.com.br
Executor:     Claude Cowork, no navegador
Tempo:        20 minutos de trabalho + espera de propagação de DNS
Estado hoje:  o site responde só em https://aurea-custodia-mvp.vercel.app
Paths:        conferidos na documentação oficial da Vercel em 20/09/2026 (fontes no fim)
```

> **O que este guia NÃO faz.** Não troca de hospedagem — o site continua rodando na Vercel,
> exatamente o mesmo projeto e o mesmo deploy. Não troca os nameservers do domínio. Não mexe em
> MX, SPF, DKIM, DMARC nem em nada de e-mail. Não encosta no domínio `aureacustodia.com.br`.
> São **dois registros de DNS novos** no `realolimpico.com.br` e **duas variáveis de ambiente**
> na Vercel. Mais nada.

> **O endereço antigo continua funcionando.** A Vercel nunca remove o `.vercel.app` de um
> projeto. Depois desta troca o site responde nos dois endereços, e isso é proposital: os
> documentos internos, o `estacao.json` da bancada e as planilhas do contador ainda citam o
> endereço antigo.

---

## 0. Por que as variáveis de ambiente são a parte que realmente quebra

Apontar o DNS é a parte fácil e visível: ou o site abre no endereço novo, ou não abre. O que
quebra **em silêncio** são duas variáveis que hoje guardam o endereço antigo:

- **`AUREA_SITE_URL`** decide para onde o Supabase manda a pessoa depois de confirmar o e-mail,
  redefinir a senha ou entrar pelo Google. O código lê essa variável **antes** de olhar o
  endereço da requisição (`src/server/auth/origin.ts:13-24`). Se ela continuar com o
  `aurea-custodia-mvp.vercel.app`, o site abre bonito em `realolimpico.com.br`, a pessoa clica
  em "Criar conta", recebe o e-mail — e o link do e-mail joga ela no endereço antigo. Ninguém
  reclama de erro, porque erro não aparece.
- **`NEXT_PUBLIC_APP_URL`** monta o endereço de retorno do checkout do Mercado Pago
  (`src/lib/payments/cobranca.ts:140`). Apagada, o código cai em `http://localhost:3000` e o
  Mercado Pago **recusa a preferência**, porque `auto_return` exige endereço público.

E há uma armadilha de build: `NEXT_PUBLIC_APP_URL` começa com `NEXT_PUBLIC_`, então ela é
gravada dentro do JavaScript **no momento do build**. Salvar o valor novo na Vercel não muda
nada sozinho — **tem que haver um deploy novo depois**. Por isso o passo 4 existe.

---

## 1. Adicionar o domínio na Vercel

1. Abrir <https://vercel.com/dashboard> e escolher o projeto da Áurea.
2. Na barra lateral do projeto, abrir **Settings** e depois **Domains**.
3. Clicar em **Add Domain**.
4. Digitar exatamente:

```
realolimpico.com.br
```

5. A Vercel vai perguntar se você também quer o prefixo `www`. **Aceite.** Ela cria
   `www.realolimpico.com.br` junto e configura o redirecionamento de um para o outro.
6. Quando ela perguntar qual dos dois é o principal, escolher **`realolimpico.com.br`**
   (sem o `www`), para bater com o que vai nas variáveis de ambiente do passo 3.

### 1.1 Anotar os valores que a tela mostrar

Terminado o passo acima, a Vercel exibe os registros de DNS que **este projeto** precisa. Ela
vai mostrar algo como:

| Para | Tipo | Nome | Valor |
|---|---|---|---|
| `realolimpico.com.br` | `A` | `@` | *um endereço IP que a tela mostra* |
| `www.realolimpico.com.br` | `CNAME` | `www` | *um nome terminado em `.vercel-dns-0XX.com`* |

> **Não use valor de tutorial, nem o que você viu em outro projeto.** A documentação oficial da
> Vercel diz, com todas as letras: *"In your Project Settings under the Domain page, you'll find
> the precise CNAME or A record values tailored to your project and plan."* Desde 2025 o CNAME é
> **único por projeto** — algo como `d1d4fc829fe7bc7c.vercel-dns-017.com`, e não o antigo
> `cname.vercel-dns.com` que ainda circula em tutoriais velhos. Copiar o valor errado dá
> "Invalid Configuration" e o certificado não sai.

**Copie os dois valores exatamente como aparecem na tela, inteiros, e cole no chat antes de ir
para o passo 2.** São eles que vão para a HostGator, e digitar de memória é como se erra isso.

---

## 2. Criar os dois registros na HostGator

O `realolimpico.com.br` está registrado na HostGator. A edição é na zona de DNS desse domínio —
no cPanel, a ferramenta chama **Zone Editor** (em português, *Editor de Zona*); em algumas contas
o caminho é pelo painel do cliente, em **Domínios → Gerenciar DNS**. Se a tela não bater com
nenhuma das duas, tire um print e pergunte antes de editar.

Criar **exatamente dois registros**, com os valores que você copiou no passo 1.1:

| Tipo | Nome / Host | Valor | TTL |
|---|---|---|---|
| `A` | `@` (ou `realolimpico.com.br`, conforme o campo pedir) | *o IP que a Vercel mostrou* | o padrão |
| `CNAME` | `www` | *o `...vercel-dns-0XX.com` que a Vercel mostrou* | o padrão |

**Regras de segurança deste passo:**

- Se já existir um registro `A` ou `CNAME` apontando a raiz ou o `www` para outro lugar
  (estacionamento da HostGator, página "em construção"), **apague só esse** — registro velho
  convivendo com o novo faz o domínio resolver alternado e o certificado falhar.
- **Não apague nem edite** registro `MX`, `TXT`, `SPF`, `DKIM`, `DMARC` ou `NS`. Nenhum deles
  tem a ver com apontar site, e mexer em MX derruba recebimento de e-mail.
- **Não troque os nameservers.** A Vercel oferece esse caminho, mas ele transfere a zona inteira
  e obrigaria a recriar todos os outros registros à mão. Não é o que queremos aqui.

---

## 3. Trocar as duas variáveis na Vercel

Ainda em **Settings**, abrir **Environment Variables**. Para cada uma das duas abaixo: se já
existir, editar o valor; se não existir, criar. **Ambiente: Production.**

```
AUREA_SITE_URL
```
```
https://realolimpico.com.br
```

```
NEXT_PUBLIC_APP_URL
```
```
https://realolimpico.com.br
```

Sem barra no fim, com `https://`, tudo minúsculo.

### 3.1 Conferir, sem alterar, que estas existem

Só olhar e reportar o que faltar — não criar nada por conta própria:

- `SESSION_SECRET` — sem ela, em produção **toda requisição que mexe em sessão vira erro 500**.
  O site sobe e ninguém consegue entrar.
- `CRON_SECRET` — sem ela os dois agendamentos do `vercel.json` (rastreio dos Correios e
  faturamento mensal) passam a responder 401 **em silêncio**, para sempre. Nada aparece no log.
- `POSTGRES_URL` — sem ela não há ledger, trilha de auditoria nem papéis do painel.
- `SUPABASE_URL` e a chave publicável do Supabase — sem elas só as 7 contas de demonstração entram.

### 3.2 Conferir que esta NÃO existe

```
MP_WEBHOOK_ALLOW_UNSIGNED
```

Se essa variável existir com valor `true` e o `MP_WEBHOOK_SECRET` estiver vazio, qualquer POST
anônimo em `/api/webhooks/mercadopago` é aceito como se fosse do Mercado Pago. É uma chave de
desenvolvimento e não pode estar na Production. Se estiver lá, **apagar**.

---

## 4. Fazer um deploy novo

Sem este passo, o passo 3 não vale para o `NEXT_PUBLIC_APP_URL` (ver a seção 0).

Em **Deployments**, no deploy mais recente da Production, abrir o menu `···` e escolher
**Redeploy**. Quando ele perguntar, **desmarcar** "Use existing Build Cache" — é o cache que
guardaria o valor antigo.

Esperar o deploy terminar com "Ready".

---

## 5. Liberar o endereço novo no Supabase

O Supabase só redireciona para endereços que estão na lista dele. Enquanto o novo não estiver
lá, o login pelo Google e o link de confirmação de e-mail falham com "redirect not allowed".

1. Abrir <https://supabase.com/dashboard>, escolher o projeto, e ir em **Authentication** →
   **URL Configuration**.
2. Em **Site URL**, colocar:

```
https://realolimpico.com.br
```

3. Em **Redirect URLs**, **acrescentar** (sem apagar as que já estão lá — as antigas seguram a
   transição):

```
https://realolimpico.com.br/entrar/callback
```
```
https://www.realolimpico.com.br/entrar/callback
```

4. No **Google Cloud Console**, na credencial OAuth usada pelo Supabase, acrescentar a origem
   `https://realolimpico.com.br` e o redirect que o Supabase indicar. Sem isso o botão "Entrar
   com Google" devolve `redirect_uri_mismatch`.

---

## 6. Reapontar os webhooks

Os caminhos no código são relativos e acompanham o domínio sozinhos. O que está cadastrado
**fora** do repositório é que precisa de mão:

**Mercado Pago** — no painel da aplicação, trocar a URL do webhook para:

```
https://realolimpico.com.br/api/webhooks/mercadopago
```

Atualizar também o campo **Website** da aplicação. Atenção: trocar a URL do webhook costuma
**gerar uma assinatura secreta nova** — se gerar, copiar e salvar na Vercel como
`MP_WEBHOOK_SECRET`, e fazer outro redeploy.

**Evolution / WhatsApp** — no painel da instância, trocar a URL do webhook para:

```
https://realolimpico.com.br/api/webhooks/whatsapp
```

Mantendo o mesmo cabeçalho `jwt_key`, que é o `WHATSAPP_WEBHOOK_SECRET`.

---

## 7. Conferir que pegou

Não encerrar com "deve estar funcionando". Fazer os quatro testes:

1. Abrir `https://realolimpico.com.br` e conferir que o cadeado aparece (certificado emitido) e
   que a marca na tela é **Real Olímpico**.
2. Abrir `https://www.realolimpico.com.br` e conferir que ele redireciona para o endereço sem
   `www`.
3. Criar uma conta de teste e conferir que **o link do e-mail que chega aponta para
   `realolimpico.com.br/entrar/callback`**, e não para o endereço antigo. Este é o teste que
   prova que o passo 3 funcionou.
4. Entrar pelo Google e abrir `/painel`.

Se o passo 1 mostrar "Invalid Configuration" na Vercel por mais de uma hora, o problema é quase
sempre valor de DNS digitado errado ou registro antigo que sobrou. Rodar, no terminal:

```bash
dig a realolimpico.com.br +short
```

```bash
dig cname www.realolimpico.com.br +short
```

O que sair tem que bater, caractere por caractere, com o que a tela da Vercel pede.

---

## 8. Depois, quando sobrar tempo

Não é para fazer agora, mas fica registrado para não se perder:

- `C:\AureaEstacao\estacao.json`, no notebook da bancada, ainda aponta para o endereço antigo.
- As fórmulas `IMPORTDATA` / Power Query das planilhas do contador também.
- Os documentos legais em `src/domain/documentos-legais/` ainda falam em "Áurea" enquanto o site
  já se chama Real Olímpico — registrado em `RISCOS_ASSUMIDOS.md`, entrada RA-57.

---

## Fontes

- Vercel, *Adding & Configuring a Custom Domain* —
  <https://vercel.com/docs/domains/working-with-domains/add-a-domain> (lido em 20/09/2026)
- Vercel, *Troubleshooting domains* — <https://vercel.com/docs/domains/troubleshooting>
  (lido em 20/09/2026; é a fonte da frase sobre os valores serem por projeto e por plano)
