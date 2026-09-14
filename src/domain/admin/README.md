# `src/domain/admin/` — a regra pura do painel administrativo

Regra de negócio do painel `/admin` (frente C), com a mesma disciplina do resto de
`src/domain/`: **sem React, sem Next, sem I/O, sem `async`, sem `process.env`**. O servidor
passa o que leu do banco e do ambiente por parâmetro; estes arquivos só decidem.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `permissoes.ts` | **A fonte da verdade das permissões.** Catálogo das 22 chaves (`modulo.acao`), os três papéis de sistema (`dev`, `socio`, `operacao`) com as concessões iniciais, `resolverMembro` (tabela × bootstrap), `temPermissao`, `ehEmailDeBootstrap` (a regra que `ehAdmin` sempre teve) e `devsAtivosDepois` (o painel nunca fica sem dev) |
| `permissoes.test.ts` | 20 testes: catálogo, papéis de sistema, bootstrap, resolução, proteção do último dev, validação de entrada |

## Regras desta pasta

- **Permissão nova entra em `PERMISSOES`, e só aqui.** A aplicação a upserta no banco na primeira
  leitura (`src/server/admin/rbac.ts`); a migration 020 não semeia nada. O papel `dev` a recebe
  sozinho; sócio e operação recebem pela tela de papéis.
- **O menu, a página e a Server Action perguntam pela permissão, nunca pelo papel.**
- **`rank` ordena, não bloqueia.**

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/admin/` | Lê o banco e o ambiente e chama `resolverMembro`, `temPermissao`, `devsAtivosDepois` |
| `src/server/relatorios/acesso.ts` | `ehAdmin` delega para `ehEmailDeBootstrap` — uma regra, um lugar |
| `src/server/db/repositories/admin-rbac.ts` | Grava e lê os tipos `PapelGravado` e `MembroGravado` definidos aqui |
| `src/components/admin/` | Recebe o `MembroAdmin` pronto do layout do painel e usa `temPermissao` para esconder o que o papel não alcança |
| `src/domain/constants.ts` | `ACCOUNTS` é a lista do bootstrap quando `AUREA_ADMIN_EMAILS` não existe — passada por parâmetro, não importada aqui |
