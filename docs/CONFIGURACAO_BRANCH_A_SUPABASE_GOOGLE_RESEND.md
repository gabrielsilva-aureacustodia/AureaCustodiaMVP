# Configuração da Branch A — Supabase, Vercel, Google e Resend

```
Branch:  feat/auth-landing
Projeto: aurea-custodia-mvp
Data:    02/09/2026
```

Este guia separa o que já está identificado, o que um agente pode executar e o
que exige acesso do titular das contas externas.

## 1. Valores já confirmados

### Supabase

```text
Project ref: vjbqikfamqdttbmaqrxf
SUPABASE_URL=https://vjbqikfamqdttbmaqrxf.supabase.co
SUPABASE_PUBLISHABLE_KEY=<copiar em Project Settings → API Keys>
```

A `SUPABASE_PUBLISHABLE_KEY` não estava no repositório, no `.env.local` nem nas
variáveis de Produção da Vercel em 02/09/2026. A CLI do Supabase também não
estava autenticada. Não usar a chave encontrada em outro repositório: ela
pertence a outro projeto.

No painel do Supabase, abrir:

<https://supabase.com/dashboard/project/vjbqikfamqdttbmaqrxf/settings/api-keys>

Copiar a chave da seção **Publishable key**, normalmente iniciada por
`sb_publishable_`. Não copiar uma **Secret key** nem a chave legada
`service_role`.

### Vercel

```text
Project name: aurea-custodia-mvp
Project ID:   prj_hCz1kHCZHBz6Qgoc1BFb12anIntA
Team ID:      team_yDuR44Cnfe1r6LVRJ5EkdDB2
Production:   https://aurea-custodia-mvp.vercel.app
```

A variável `SESSION_SECRET` já existe no ambiente de Produção e foi mantida
oculta. As variáveis de Auth do Supabase ainda não existem.

## 2. Variáveis a cadastrar na Vercel

Abrir o projeto **aurea-custodia-mvp** em **Settings → Environment Variables** e
adicionar em Production, Preview e Development:

```text
SUPABASE_URL=https://vjbqikfamqdttbmaqrxf.supabase.co
SUPABASE_PUBLISHABLE_KEY=<chave copiada do painel Supabase>

AUREA_SITE_URL=https://aurea-custodia-mvp.vercel.app
AUREA_SIGNUP_ENABLED=true
AUREA_TERMS_VERSION=RASCUNHO-0.1-2026-09-02
AUREA_PRIVACY_VERSION=RASCUNHO-0.1-2026-09-02
AUREA_TERMS_URL=https://aurea-custodia-mvp.vercel.app/termos
AUREA_PRIVACY_URL=https://aurea-custodia-mvp.vercel.app/privacidade
```

Observações:

- `SUPABASE_PUBLISHABLE_KEY` é publicável por definição, mas o código continua
  usando-a somente no servidor.
- `AUREA_SIGNUP_ENABLED=true` abre o cadastro. Durante preparação ou depois dos
  testes controlados, usar `false` ou remover a variável.
- As páginas internas `/termos` e `/privacidade` são o fallback das URLs. As
  URLs absolutas acima deixam a configuração e o registro operacional mais
  claros.
- A versão `RASCUNHO-0.1-2026-09-02` deve ser trocada quando o advogado aprovar
  uma revisão.
- `AUTH_LEGAL_SECRET` é opcional enquanto `SESSION_SECRET` existir. Se for
  criado, deve ser um segredo aleatório forte e server-only.
- Depois de qualquer alteração, fazer Redeploy; um deployment já construído não
  recebe retroativamente as novas variáveis.

Para desenvolvimento local, copiar os mesmos nomes para `.env.local`, que é
ignorado pelo Git. Nunca incluir valores reais em arquivo commitado.

## 3. URL Configuration do Supabase

Em **Authentication → URL Configuration**:

```text
Site URL:
https://aurea-custodia-mvp.vercel.app

Redirect URLs:
https://aurea-custodia-mvp.vercel.app/entrar/callback
http://localhost:3000/entrar/callback
```

Se o desenvolvimento usar outra porta, adicionar a URL correspondente. Para
Preview da Vercel, adicionar cada callback de preview usado no teste ou um
padrão permitido pelo Supabase restrito ao time/projeto. Não usar wildcard
amplo em Produção.

## 4. Google OAuth

### 4.1 Criar o cliente no Google Cloud

1. Abrir <https://console.cloud.google.com/> com a conta institucional.
2. Criar ou selecionar o projeto da Áurea Custódia.
3. Abrir **Google Auth Platform**.
4. Em **Branding**, configurar:
   - nome: `Áurea Custódia`;
   - e-mail de suporte institucional;
   - logotipo oficial;
   - domínio autorizado de produção;
   - links para `/termos` e `/privacidade`.
5. Em **Audience**, usar `External` para contas Google fora da organização.
6. Enquanto estiver em teste, cadastrar os e-mails reais dos sócios como test
   users.
7. Em **Clients**, criar um OAuth Client ID do tipo **Web application** com o
   nome `Áurea Custódia Web`.
8. Em **Authorized JavaScript origins**, adicionar:

```text
https://aurea-custodia-mvp.vercel.app
http://localhost:3000
```

9. Em **Authorized redirect URIs**, adicionar o callback do próprio Supabase:

```text
https://vjbqikfamqdttbmaqrxf.supabase.co/auth/v1/callback
```

10. Criar e guardar o **Client ID** e o **Client Secret**.

O Client Secret do Google nunca vai para Vercel, código ou navegador. Ele será
salvo somente no painel do Supabase.

### 4.2 Habilitar no Supabase

1. Abrir o projeto `vjbqikfamqdttbmaqrxf`.
2. Ir a **Authentication → Providers → Google**.
3. Habilitar o provedor.
4. Colar o Client ID e o Client Secret criados no Google.
5. Salvar.
6. Confirmar que o callback exibido pelo Supabase é exatamente o cadastrado no
   Google Cloud.
7. Testar pelo botão **Continuar com Google** em `/cadastrar`.

### 4.3 Quem executa

A criação do OAuth Client, o consentimento da conta Google e a gravação do
Client Secret exigem uma sessão autenticada do titular e geram credencial
persistente. O Gabriel precisa autenticar/confirmar essa etapa. Um agente pode
acompanhar a tela, preencher os campos não sensíveis, conferir as URLs e testar
o retorno depois da criação.

## 5. SMTP do Resend para o Supabase Auth

Não é necessário instalar SDK do Resend nem criar uma rota de e-mail nesta
branch. O Supabase Auth gera a confirmação e entrega pelo SMTP do Resend.

### 5.1 Preparar o Resend

1. Entrar em <https://resend.com/> com a conta institucional.
2. Em **Domains**, adicionar um domínio ou subdomínio de autenticação, por
   exemplo `auth.aureacustodia.com.br`.
3. Cadastrar no provedor de DNS os registros indicados pelo Resend, incluindo
   SPF e DKIM; adicionar DMARC conforme a política do domínio.
4. Aguardar o status **Verified**.
5. Em **API Keys**, criar uma chave restrita ao envio de e-mails.
6. Guardar a chave, iniciada por `re_`, em gerenciador seguro.

### 5.2 Configurar o Supabase

Em **Authentication → Email/Notifications → SMTP Settings**, habilitar SMTP
customizado e preencher:

```text
Sender name:  Áurea Custódia
Sender email: no-reply@auth.aureacustodia.com.br
Host:         smtp.resend.com
Port:         465
Username:     resend
Password:     <API key do Resend iniciada por re_>
```

Se o domínio usado for outro, ajustar apenas o sender para um endereço já
verificado. A API key fica no Supabase, não na Vercel.

### 5.3 Template Confirm signup

Em **Authentication → Email Templates → Confirm signup**, usar um link que
entregue o hash ao callback SSR:

```html
<h2>Confirme seu e-mail</h2>
<p>Você iniciou a criação de uma conta na Áurea Custódia.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a></p>
<p>Se você não solicitou a conta, ignore esta mensagem.</p>
```

Desabilitar tracking/rewrite de links para mensagens de autenticação. Enviar um
teste e conferir no Resend os eventos de entrega, bounce e complaint.

### 5.4 Quem executa

Gabriel precisa autenticar no Resend, provar controle do domínio via DNS e
criar a API key. Um agente pode orientar ou operar a interface depois do login,
mas a criação de credencial e a alteração DNS exigem confirmação do titular. O
código da Branch A já está pronto e não depende do SDK do Resend.

## 6. Rascunhos legais incluídos

```text
/termos       → Termos de Uso
/privacidade  → Política de Privacidade
Versão        → RASCUNHO-0.1-2026-09-02
```

Os documentos são preenchidos e navegáveis, mas mostram um aviso destacado de
revisão jurídica pendente. Eles cobrem, em caráter provisório:

- identificação da empresa e objeto da plataforma;
- conta, custódia, recibo digital, marketplace e logística;
- ambiente fictício e ausência de dinheiro real no Pré-MVP;
- comunicação cautelosa sobre seguro ainda não contratado;
- deveres, condutas proibidas, consumidor e solução de conflitos;
- categorias de dados, finalidades, bases legais e retenção;
- Supabase, Vercel, Resend, Google, pagamentos e Correios;
- cookies essenciais, segurança, transferências e direitos LGPD.

Antes da abertura pública, o advogado precisa confirmar no mínimo: enquadramento
regulatório, direito de arrependimento por tipo de serviço, custódia e
responsabilidade sobre os itens, seguro, foro, prazos de retenção, bases legais,
transferências internacionais, canal de atendimento e papel de cada fornecedor.

## 7. Teste de ponta a ponta

Depois das configurações:

1. fazer Redeploy da Branch A já rebaseada sobre a frente B;
2. manter as contas fictícias antigas fora do Supabase Auth;
3. criar uma conta com e-mail real controlado;
4. confirmar o e-mail recebido pelo Resend;
5. confirmar a mensagem de conta pendente antes da carga mockada;
6. carregar o usuário/dados mockados pela frente B com e-mail em minúsculas;
7. entrar novamente e validar `/inicio`;
8. sair, recarregar e entrar de novo;
9. repetir com Google;
10. validar no metadata do Supabase a versão legal e o timestamp do aceite;
11. repetir para as sete contas reais dos sócios;
12. fechar `AUREA_SIGNUP_ENABLED` se a abertura foi apenas para o teste.

## 8. Fontes oficiais

- [Supabase — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase — Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase — Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend — Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Vercel — Environment Variables](https://vercel.com/docs/environment-variables)
- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Decreto do comércio eletrônico nº 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm)
- [ANPD — Aviso de Privacidade](https://www.gov.br/anpd/pt-br/acesso-a-informacao/aviso-de-privacidade)
