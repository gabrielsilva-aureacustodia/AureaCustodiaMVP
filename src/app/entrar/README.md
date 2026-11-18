# `/entrar`

Tela pública de autenticação. O componente interativo chama exclusivamente as
Server Actions de `src/server/actions/auth.ts`; nenhuma configuração ou cliente
do Supabase entra no bundle do navegador.

A tela abre com **"Entrar com o Google"** como ação principal; e-mail e senha
ficam recolhidos em "Prefiro usar e-mail e senha" (`<details>`), abertos só
quando o servidor devolve um erro na URL (conta desativada, retorno do Google
que falhou). O Google fecha o ciclo na mesma janela, sem popup.

## Rotas internas

- `callback/`: Endpoint de retorno do Supabase Auth para Google OAuth, confirmação de e-mail e recuperação de senha (`type=recovery`).
- `sair/`: Route Handler que limpa a sessão ativa da plataforma e do Supabase, tratando contas desativadas.
- `nova-senha/`: Tela para o usuário definir uma nova senha após acessar o link de recuperação.
