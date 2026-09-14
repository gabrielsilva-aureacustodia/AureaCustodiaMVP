# `/admin/usuarios` — a administração de usuários

A lista de contas e a criação de conta pelo painel (plano do Admin, seção 2.6; frente C,
sub-branch C2). A ficha de cada conta está em [`[email]/`](%5Bemail%5D/README.md).

| Arquivo | O que faz |
|---|---|
| `page.tsx` | Server Component: confere `usuarios.ver`, lê o filtro da URL e desenha a lista. O formulário "Criar conta" aparece com `usuarios.criar` |
| `[email]/` | A ficha completa, em abas |

## O filtro

Formulário GET, na URL: `?busca=&cadastro=com|sem&inadimplente=1&saldo=1&moeda=1&de=aaaa-mm-dd&ate=aaaa-mm-dd`.

- **Busca** por nome, e-mail ou dígitos do CPF (três ou mais).
- **Cadastro completo** é o `temCadastroCompleto` da frente B — o mesmo que libera depósito,
  compra e saque.
- **Inadimplente** é a marca manual do painel ou fatura vencida (`isInadimplente`, frente B).
- **Criada no período** usa o dia de Brasília e a data do lançamento de abertura no ledger
  (`aurea.users` não tem data de criação). Sem banco, o filtro de período não esconde ninguém.

## Conexões

| Pasta | Relação |
|---|---|
| `src/components/admin/usuarios/` | Filtro, tabela, criação de conta e a ficha |
| `src/server/admin/ficha.ts` | `carregarListaDeUsuarios` |
| `src/domain/admin/usuarios.ts` | `lerFiltroUsuarios`, `linhasDeUsuarios`, `filtrarUsuarios` |
| `src/server/actions/admin/usuarios.ts` | `criarUsuarioNoPainel` |
