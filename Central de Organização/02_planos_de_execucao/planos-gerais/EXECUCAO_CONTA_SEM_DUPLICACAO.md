# Execução — conta/sem-duplicacao-de-usuarios (01/10/2026)

**Estado:** pronto, sem commit e sem push (a pedido).

## O que a investigação achou

A hipótese principal **não se confirmou na forma pura**: todos os caminhos de criação já faziam
`trim().toLowerCase()` (Admin > Usuários via `normalizarEmail`, cadastro público, callback do
Google, provisionamento). O risco era a normalização estar **copiada em ~25 lugares**, mais
três brechas reais:

1. **Conta legada.** O guarda "já existe?" olhava só a chave exata (`email in users`). Uma conta
   gravada antes com maiúscula (`Legada@X.com`) não era vista, e a versão normalizada nascia ao lado.
2. **Troca de e-mail sem banco** (`renomearEmailNoAppState`) fazia `users[para] = …` sem checar:
   sobrescrevia a conta de outra pessoa (o caminho com banco já recusava).
3. **Corrida no Admin.** `validarNovoUsuario` vê um retrato anterior; o que fecha a corrida é o guarda
   dentro da mutação. Esse guarda também só olhava a chave exata — agora usa a mesma regra.

No banco a chave é `text` simples; **não criei migration** (um CHECK de caixa quebraria linhas legadas).

## O que mudou

- `src/domain/email.ts` (novo): `normalizarEmail` única + `chaveDeUsuario(users, email)`, que acha
  também chave legada. `permissoes.ts` re-exporta `normalizarEmail` (importadores atuais intactos).
- Trocados os `trim().toLowerCase()` de e-mail por `normalizarEmail` em: `actions/auth.ts`,
  `app/entrar/callback/route.ts`, `auth/provisioning.ts`, `auth/authorization.ts`, `auth/legal.ts`,
  `db/repositories/users.ts` e `aceites.ts`, `documentos/aceites.ts`, `estacao/cadastro-*.ts`,
  `admin/uso.ts`, `admin/identidade.ts`, `actions/admin/{usuarios,bancada}.ts`, `AccountModals.tsx`.
- `chaveDeUsuario` nos guardas: `validarNovoUsuario`, `criarUsuario` (dentro da mutação),
  `provisionAuthenticatedUser`, `authorizeProvisionedUser`, `renomearEmailNoAppState`.
- Selo na ficha: "Equipe do painel" virou **"Também é membro da equipe"** (com explicação ao passar o
  mouse). O dado já existia (`ehDaEquipe` = `podeAbrirPainelAdmin`, cobre tabela e bootstrap).
  "Equipe e Papéis" segue sendo tabela própria, como pedido.

## Testes

- `src/domain/email.test.ts` e `src/server/admin/sem-duplicacao.test.ts` (Admin→público, público→Admin,
  conta legada, duas criações simultâneas, público+Admin simultâneos, troca de e-mail sem banco).

## Verificação

- `typecheck` ok · `lint` 0 erros · `build` ok.
- `npm test`: 1027 passam, **3 falham, nenhuma ligada a esta branch**:
  - `conta/custodia/pagina.test.ts` — falha também sem as minhas mudanças (datas fixas de 27/09 vs hoje 01/10).
  - `estacao/analise.test.ts` B2.5 — mesma família (valor de custódia dependente de data); não toca e-mail.
  - `db/sql-injecao.test.ts` — acusa `src/server/admin/emails.ts`, arquivo novo de **outra frente**
    (reenvio de e-mail), ainda sem registro na base do SQL auditado.

## Atenção: árvore compartilhada

Havia outra frente editando a mesma pasta (`ficha.ts`, `equipe.ts`, `admin/emails.ts`,
`aviso-de-reserva.ts`, home, etc., todos sem relação com esta branch) e builds paralelos que
corromperam `.next` uma vez. Os arquivos acima **não são desta tarefa** e não devem entrar no mesmo commit.
