# `src/app/painel/` — a entrada do painel administrativo

**O link da equipe é `/painel`** (em produção, `https://aurea-custodia-mvp.vercel.app/painel`). O
painel continua morando em `/admin/*` (`src/app/(admin)/`); esta rota é só a porta.

| Quem abre | O que acontece |
|---|---|
| Membro da equipe já logado | Redireciona para `/admin` |
| Sem sessão | Formulário de entrada; depois do login, `/admin` |
| Logado com conta fora da equipe | Explica com qual conta a pessoa está e oferece sair |

E `/admin/*` sem sessão, ou com conta fora da equipe, manda para cá (`membroDaPagina` em
`src/server/admin/acesso.ts`).

## Por que fora de `src/app/(admin)/`

O layout do painel manda para `/painel` quem não é membro. Se a entrada estivesse debaixo dele,
o guarda redirecionaria a própria entrada, em laço.

## Por que existe

Até 14/09/2026, `/admin` sem sessão ia para `/entrar`, que depois do login sempre leva ao site do
cliente, e a conta fora da equipe caía em `/inicio` sem aviso. Quem abria o link do painel via o
site comum. O formulário está em `src/components/admin/entrada/`.
