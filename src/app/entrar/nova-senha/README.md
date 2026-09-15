# `/entrar/nova-senha`

Tela fora do casco autenticado que recebe a sessão aberta pelo link de redefinição.
Sem sessão da plataforma, volta para `/entrar`.

O formulário chama `definirNovaSenha` e só conclui quando a sessão interna e a identidade
do Supabase pertencem ao mesmo e-mail. O parâmetro `destino` aceita somente `/admin`;
qualquer outro valor leva a `/inicio`.
