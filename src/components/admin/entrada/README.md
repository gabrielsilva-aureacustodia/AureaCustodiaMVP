# `src/components/admin/entrada/` — a entrada do painel

`EntradaDoPainel.tsx` desenha `/painel` (a página está em `src/app/painel/`). Client Component.

| Situação | O que aparece |
|---|---|
| Sem sessão | E-mail e senha, e "Entrar com Google". Dando certo, vai para `/admin` |
| Logado com conta fora da equipe | Qual conta é, como pedir acesso e "Sair e entrar com outra conta" |
| Logado com conta da equipe | Nada: a página redireciona para `/admin` antes de desenhar |

## Regras desta pasta

- **Usa as mesmas Server Actions de `/entrar`** (`login`, `loginWithGoogle`, `logout`). Não há login
  próprio do painel, só um destino diferente.
- **O Google volta para `/admin` por cookie de destino** (`src/server/auth/destino.ts`), não por
  parâmetro no endereço de volta — assim não depende de configuração nova no Supabase.
- **Classes do login do site** (`.login-wrap`, `.login-card`, `.field`): a entrada tem a cara do
  site, e o casco do painel só aparece depois de entrar.
