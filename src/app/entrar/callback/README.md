# `/entrar/callback`

Endpoint de retorno do Supabase Auth para confirmação de e-mail, Google OAuth e recuperação de senha.

Ele troca o código PKCE, tokens ou fragmento por uma identidade confirmada, registra o aceite legal do fluxo
Google e só libera a aplicação quando os dados mockados já existem.

## Conta desativada

Antes de criar sessão ou provisionar, a rota consulta `barrarContaDesativada`. Se a conta estiver desativada pelo painel (ou identidade bloqueada no Supabase), a sessão não é aberta, o destino do login é descartado e o usuário é redirecionado para `/entrar?status=conta-desativada`.

## Recuperação de senha

Identificada por `type=recovery` (vindo de fragmento ou parâmetros `token_hash`/`token`). O fluxo `?code=` (PKCE) não traz o parâmetro `type`; nenhum fluxo atual envia recuperação por `?code=`. Quando `type=recovery` está presente, a rota mantém a sessão aberta no Supabase (necessária para autorizar `updateUser`) e redireciona para `/entrar/nova-senha` (preservando `destino=/admin` caso a recuperação tenha começado pelo painel).
