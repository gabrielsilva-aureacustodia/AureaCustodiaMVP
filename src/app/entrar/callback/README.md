# `/entrar/callback`

Endpoint de retorno do Supabase Auth para confirmação de e-mail e Google OAuth.
Ele troca o código PKCE por uma identidade, registra o aceite legal do fluxo
Google e só libera a aplicação quando os dados mockados já existem.
