# `src/app/entrar/sair/` — Rota de encerramento de sessão

## O que é

Route Handler `GET /entrar/sair` responsável por limpar a sessão ativa (`aurea_session`) e desconectar a identidade local do Supabase Auth.

## Por que existe

No Next.js 15 (App Router), Server Components assíncronos (como layouts e páginas) não têm permissão para deletar cookies durante o render. Redirecionar um usuário diretamente para `/entrar` com um cookie de sessão ainda presente causaria um laço de redirecionamento (`/entrar` → `/inicio` ↔ `/entrar`).

O Route Handler `GET /entrar/sair` resolve isso:
1. Lê o e-mail da sessão atual (`getSessionEmail()`).
2. Confere se a conta foi desativada pelo painel (`barrarContaDesativada(email)`).
3. Apaga o cookie de sessão da plataforma (`clearSession()`).
4. Realiza `signOut({ scope: 'local' })` no Supabase Auth se configurado.
5. Redireciona para `/entrar`, adicionando `?status=conta-desativada` se a conta estiver desativada.
