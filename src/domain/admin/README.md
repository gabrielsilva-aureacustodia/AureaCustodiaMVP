# `src/domain/admin/` — a regra pura do painel administrativo

Regra de negócio do painel `/admin` (frente C), com a mesma disciplina do resto de
`src/domain/`: **sem React, sem Next, sem I/O, sem `async`, sem `process.env`**. O servidor
passa o que leu do banco e do ambiente por parâmetro; estes arquivos só decidem.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `permissoes.ts` | **A fonte da verdade das permissões.** Catálogo das 22 chaves (`modulo.acao`), os três papéis de sistema (`dev`, `socio`, `operacao`) com as concessões iniciais, `resolverMembro` (tabela × bootstrap), `temPermissao`, `ehEmailDeBootstrap` (a regra que `ehAdmin` sempre teve) e `devsAtivosDepois` (o painel nunca fica sem dev) |
| `permissoes.test.ts` | 20 testes: catálogo, papéis de sistema, bootstrap, resolução, proteção do último dev, validação de entrada |
| `periodo.ts` | `lerPeriodo` e `consultaDoPeriodo`: o período da Central de Resultados a partir da URL, com a mesma regra de `periodoDaConsulta` das rotas de exportação e o relógio por parâmetro |
| `periodo.test.ts` | 5 testes: padrão, mês sobre trimestre, trimestre, valor fora da faixa, parâmetro repetido |
| `uso.ts` | O registro de uso: `validarLoteDeEventos` (o que entra), `normalizarRota` (sem e-mail nem identificador), `plataformaResumida` (sem user agent) e `resumirUso` (páginas mais abertas, horário de pico em Brasília, ações por conta, jornada até a primeira venda) |
| `uso.test.ts` | 11 testes |
| `financeiro.ts` | `resumirFinanceiro` (depósitos, saques pagos e pendentes, custódia faturada, fluxo mês a mês pelo livro-razão) e `somarColunasDeDinheiro` (lê relatório pelo nome da coluna) |
| `financeiro.test.ts` | 3 testes |
| `contabil.ts` | Validação das ações contábeis do painel: `validarLancamento`, `validarEstorno`, `validarAliquota`, `dataDeInput` (meio-dia local, para não mudar de mês em UTC) |
| `contabil.test.ts` | 6 testes |

Os indicadores do negócio (KPIs) moram em `src/domain/kpis.ts`, um nível acima, como pede o plano
do Admin — mesmo desenho de `dre.ts`, e testados em `kpis.test.ts`.

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
| `src/domain/dre.ts` | `periodoMensal`/`Trimestral`/`Anual`, `chaveMes`, `CATALOGO_PARAMETROS` e `contaPorCodigo` — lidos, nunca alterados |
| `src/app/api/eventos/` | Chama `validarLoteDeEventos` e `plataformaResumida` antes de gravar |
