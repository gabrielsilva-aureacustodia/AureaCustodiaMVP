# `src/server/auth/` — autenticação Supabase

Esta pasta contém a integração exclusiva de servidor com o Supabase Auth. Ela
substitui a conferência de senhas do seed, mas preserva o cookie assinado e o
contrato de sessão consumido pelas Server Actions durante a migração paralela
do banco.

## Fluxos

- E-mail e senha: `signInWithPassword` valida no Supabase; a aplicação só cria
  sua sessão quando o e-mail também já existe no estado carregado pela frente B.
- Cadastro: `signUp` solicita confirmação por e-mail e grava em metadata as
  versões dos Termos e da Política aceitas, com data e hora.
- Google: o OAuth usa PKCE e volta por `/entrar/callback`; o callback aplica a
  mesma trava de provisionamento antes de liberar `/inicio`.
- E-mail transacional: o Supabase Auth deve usar o SMTP do Resend configurado no
  painel. Nenhuma chave do Resend pertence ao navegador ou ao repositório.

Para confirmação SSR, o template **Confirm signup** do Supabase precisa apontar
para o callback informado pelo cadastro e enviar o hash no servidor:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a>
```

O endpoint também aceita `code` para o retorno PKCE do Google OAuth.

## Variáveis

Obrigatórias para autenticar:

```text
SUPABASE_URL
SUPABASE_ANON_KEY (ou SUPABASE_PUBLISHABLE_KEY)
```

O cadastro continua fechado enquanto qualquer uma destas condições faltar:

```text
AUREA_SIGNUP_ENABLED=true
AUREA_TERMS_VERSION
AUREA_PRIVACY_VERSION
AUREA_TERMS_URL
AUREA_PRIVACY_URL
```

`AUREA_SITE_URL` é opcional; sem ela, a origem do callback é derivada da
requisição, o que mantém localhost e Preview isolados.

## Fronteira com a frente B

Criar a identidade não inventa saldo nem moedas. Depois de criar e confirmar as
contas reais dos sócios, a frente B carrega os dados mockados usando os e-mails
normalizados como ligação. Até essa carga, o login informa que a conta está
autenticada, mas ainda não habilitada na plataforma.
