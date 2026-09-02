# Entrega da frente A — autenticação, cadastro e landing

```
Branch: feat/auth-landing
Data:   02/09/2026
Escopo: landing pública, rotas de entrada/cadastro e Supabase Auth
```

## O que foi entregue

- `/` virou uma landing pública com as marcas oficiais, explicação em três
  etapas, informação prudente sobre o seguro, CNPJ e caminhos legais.
- O login anterior foi movido para `/entrar` e passou a validar e-mail e senha
  no Supabase Auth, sem consultar `ACCOUNTS` ou `user.pass`.
- `/cadastrar` contém criação por e-mail com confirmação e Google OAuth com
  PKCE. Os dois fluxos registram as versões legais aceitas e a data do aceite
  no metadata da identidade.
- `/entrar/callback` aceita o `code` do Google e o `token_hash` da confirmação
  por e-mail, sempre no servidor.
- Rotas protegidas devolvem visitantes para `/entrar`, sem passar pela landing
  nem entrar em laço.
- Uma identidade só entra na aplicação quando o e-mail também já existe no
  estado. Isso permite recriar as contas reais dos sócios e carregar os dados
  mockados depois, sem inventar saldo ou moedas dentro do cadastro.

## Trava legal preservada

O RA-03 continua aberto: ainda não existem Termos de Uso nem Política de
Privacidade vigentes. Por isso o cadastro e o Google estão fechados por padrão,
com os campos desabilitados e a mesma trava repetida nas Server Actions.

O cadastro só abre quando **todas** estas variáveis estiverem corretas:

```text
AUREA_SIGNUP_ENABLED=true
AUREA_TERMS_VERSION=<versão vigente>
AUREA_PRIVACY_VERSION=<versão vigente>
AUREA_TERMS_URL=<URL pública do documento>
AUREA_PRIVACY_URL=<URL pública do documento>
```

Não habilitar `AUREA_SIGNUP_ENABLED` antes de o advogado entregar os dois
documentos e os sócios aprovarem as versões.

## Configuração necessária no Supabase e na Vercel

### 1. Variáveis de autenticação

Configurar em Development, Preview e Production:

```text
SUPABASE_URL=<Project URL>
SUPABASE_PUBLISHABLE_KEY=<chave publicável>
```

Também é aceito o nome histórico `SUPABASE_ANON_KEY`. Nunca usar nem expor a
`service_role` neste fluxo.

`AUREA_SITE_URL` é opcional. Sem ela, localhost e Preview derivam a origem da
própria requisição. A URL de callback que precisa ser autorizada é:

```text
https://<domínio>/entrar/callback
```

### 2. Google OAuth

No Supabase, habilitar o provedor Google e cadastrar o Client ID/secret criado
no Google Cloud. No Google Cloud, a URI de retorno do provedor continua sendo a
URI do próprio Supabase (`/auth/v1/callback`); no Supabase, acrescentar as URLs
da aplicação à lista de Redirect URLs.

### 3. Confirmação de e-mail e Resend

No template **Confirm signup** do Supabase, usar um link SSR que envie o hash ao
callback da aplicação:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a>
```

Configurar o SMTP customizado do Supabase com a conta Resend e desabilitar o
tracking de links desse e-mail. Chaves do Resend ficam no painel, nunca no
repositório ou no navegador.

Referências oficiais:

- [Supabase Auth com Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Templates de e-mail e confirmação SSR](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Troca de código PKCE por sessão](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession)

## Recriação das contas dos sócios

Decisão do Gabriel nesta sessão: as sete contas fictícias não serão migradas.

Ordem segura depois da configuração:

1. Manter o cadastro fechado ao público.
2. Criar as contas com os e-mails reais dos sócios e confirmar cada e-mail.
3. A frente B carregar o seed/dados mockados ligando cada usuário pelo e-mail
   normalizado em minúsculas.
4. Testar login, recarga, logout e acesso a `/inicio` para cada conta.
5. Só depois discutir abertura pública, condicionada ao RA-03.

Até o passo 3, a mensagem esperada é: conta autenticada, dados de teste ainda
não carregados. Isso é uma trava deliberada, não falha de autenticação.

## Inventário da frente A

### Rotas

- `src/app/page.tsx`
- `src/app/entrar/page.tsx`
- `src/app/entrar/callback/route.ts`
- `src/app/cadastrar/page.tsx`
- `src/app/(app)/layout.tsx` — somente redirects para `/entrar`

### Componentes e estilo

- `src/components/landing/LandingPage.tsx`
- `src/components/login/LoginForm.tsx`
- `src/components/login/RegisterForm.tsx`
- `src/styles/landing.css`
- `src/app/globals.css` — somente o import antes de `responsive.css`

### Servidor

- `src/server/auth/config.ts`
- `src/server/auth/client.ts`
- `src/server/auth/origin.ts`
- `src/server/auth/legal.ts`
- `src/server/auth/authorization.ts`
- `src/server/actions/auth.ts`
- `src/server/session.ts`

Cada diretório novo contém seu próprio `README.md` com a responsabilidade e as
armadilhas locais.

## Validação executada

- TypeScript strict: verde.
- Vitest da base da frente A: 38/38 testes verdes.
- ESLint direcionado à frente A: verde.
- Build Next.js: verde, com as novas rotas listadas.
- Navegador desktop e 390 × 844: sem overlay, sem erro de console e sem rolagem
  horizontal.
- Alvos principais: 47–49 px, acima do mínimo de 44 px.
- `/inicio` sem sessão: redireciona para `/entrar` sem laço.
- A criação real de identidade aguarda as variáveis de Auth e os documentos
  legais; nenhum e-mail real foi transmitido nesta sessão.
