# Relatório de alterações — Guilherme

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP
Início:      18/09/2026
Ordem:       dia mais recente no topo
Detalhe:     o "porquê" de cada arquivo vive no MD espelhado (ver README.md desta pasta)
```

> **Como usar.** Este é o registro cronológico do trabalho. Cada dia traz o que foi
> feito, por que foi feito e onde ficou o detalhe.
>
> O dia mais recente fica **no topo** de propósito: quem abre este arquivo quase sempre
> quer saber o que aconteceu por último, não recompor a história desde o começo.
>
> O que muda **arquivo** é resumido aqui e detalhado no MD espelhado daquele arquivo.
> O que **não** toca arquivo — criar branch, configurar a Vercel, decidir algo com os
> sócios — vive só aqui, porque não tem outro lugar onde caiba.

---

## 18/09/2026

**Resumo do dia.** A cópia local estava um mês atrasada e foi atualizada; a branch de
homologação foi criada para ligar ao Preview da Vercel; e este registro de alterações
passou a existir. Nenhum código de produto foi alterado — o dia foi de infraestrutura
de trabalho.

### 1. Atualização da cópia local com a `main` do GitHub

**O que foi feito.** `git pull --ff-only` trouxe **178 commits**, de `1d1f507`
(19/08/2026) até `2e5897c` — *"Merge da E8: comissão do comprador, pendência na
conciliação e rastreio da retirada"*. São **717 arquivos alterados, +121.064 e −1.486
linhas**. Vieram também 22 branches remotas (as frentes `feat/a*`, `feat/b*`, `feat/c*`
e as execuções `exec/e*`).

**Por quê.** A cópia local parou em 19/08 e o projeto seguiu: Supabase Auth, Mercado
Pago, Correios, painel administrativo em `/admin`, retirada física, DRE, ledger com
hash encadeado, comissão dos dois lados e planos de custódia de 12 e 24 meses.
Trabalhar sobre a versão antiga produziria conflito em quase todo arquivo.

**O que observar.** Foi *fast-forward*: não havia nenhum commit local não enviado, então
nada precisou de merge e nada se perdeu. A árvore ficou limpa e sincronizada.

### 2. Instalação das dependências novas

**O que foi feito.** `npm install` acrescentou **48 pacotes**. As entradas novas do
`package.json` são `@supabase/ssr`, `@supabase/supabase-js`, `server-only`, `vitest`,
`@electric-sql/pglite` e `@eslint/eslintrc`. O `xlsx` deixou de vir do CDN e passou a
ser versionado em `vendor/xlsx-0.20.3.tgz`.

**Por quê.** Sem elas a cópia local não compila nem roda os testes — o `package.json`
veio no pull e ficou à frente do `node_modules`.

**O que observar.** `npm run typecheck` passou **sem erros** depois da instalação, o que
confirma que a árvore baixada está íntegra.

### 3. Branch `staging` criada e publicada

**O que foi feito.** Criada a partir da `main` e enviada ao GitHub. As duas apontam para
o mesmo commit:

```
staging == main == 2e5897c
```

**Por quê.** Pedido do Gabriel: ter uma branch de homologação para associar ao **Preview
da Vercel**, separando o que está em teste do que está publicado em produção.

**O que observar.** O nome ficou em **minúsculas** (`staging`), seguindo a convenção das
outras branches do repositório (`main`, `feat/…`, `exec/…`). O mapeamento de branch da
Vercel diferencia maiúsculas de minúsculas — se o Preview precisar de `STAGING`, o
ajuste é `git branch -m staging STAGING` seguido de um push.

A branch nasce idêntica à `main`, mas **as duas vão divergir no instante em que o
primeiro commit entrar em uma delas**. Vale combinar desde já qual é o fluxo: se o
trabalho novo nasce na `staging` e sobe para a `main` depois de aprovado, ou o contrário.

### 4. Estrutura de documentação de alterações

**O que foi feito.** Criada a pasta `docs/alteracoes/` com:

| Arquivo | Papel |
|---|---|
| `README.md` | A convenção: onde cada MD fica, o modelo e as regras |
| `RELATORIO-Guilherme.md` | Este relatório |

**Por quê.** Pedido do Gabriel: um relatório por dia de tudo que for feito, e um MD por
arquivo alterado explicando o que mudou e por quê.

**O que observar.** Duas decisões tomadas com ele:

- **Caminho espelhado**, não pasta plana. O projeto tem dezenas de `page.tsx` e vários
  `README.md`; numa pasta plana o segundo sobrescreveria o primeiro em silêncio.
- **Sem retroatividade.** O registro começa hoje. Documentar os 178 commits que já
  vieram significaria inferir a intenção a partir do diff — o que produziria um
  documento com a aparência de registro e o conteúdo de chute.

### 5. Levantamento: não há `middleware.ts`, e rota nova nasce pública

**O que foi levantado.** Foram mapeadas todas as rotas do projeto: **32 páginas** e
**10 rotas de API** exigem sessão de usuário. A proteção vem de dois lugares apenas:

| Guarda | Onde | Cobre |
|---|---|---|
| `getSessionEmail()` → `/entrar` | `src/app/(app)/layout.tsx:51` | as 16 páginas de `(app)` |
| `membroDaPagina()` → `/painel` | `src/server/admin/acesso.ts:126` | as 15 páginas de `(admin)` |

Mais `/entrar/nova-senha`, que confere a sessão por conta própria, e as 10 rotas de API,
cada uma com a sua verificação.

**O problema.** O projeto **não tem `middleware.ts`**. Não existe nenhuma camada que
olhe a requisição antes de ela chegar à rota. A consequência é que a proteção não é
herdada, é escolhida arquivo a arquivo — e o padrão de quem não escolhe é **público**.

Uma página criada em `src/app/qualquer-coisa/page.tsx`, fora dos grupos `(app)` e
`(admin)`, **nasce acessível sem login**, e nada no build, no typecheck ou no lint
acusa. O erro só aparece quando alguém tenta a URL.

**Por que isso é grave e não teórico.** O projeto está em desenvolvimento acelerado, com
oito frentes de execução paralelas e agentes diferentes criando telas. É precisamente o
cenário em que uma rota nasce no lugar errado — e o repositório está **público**
(RA-02, RA-11), então a URL não depende de ninguém adivinhar.

**Situação.** Levantado hoje, correção planejada. Ver "Em aberto".

### 6. Auditoria de SQL injection nas rotas públicas

**O que foi feito.** Auditoria da camada de banco inteira, com foco no que uma pessoa
sem login consegue alcançar. Foram varridos os **35 arquivos** que executam SQL e as
**197 interpolações** dentro de comandos SQL fora de teste.

**Resultado: nenhum vetor de injeção encontrado.** O padrão do repositório é correto e
consistente:

| Ponto auditado | Conclusão |
|---|---|
| As 197 interpolações em SQL | Quase todas são `${S}`, o nome do schema. Os **valores** vão sempre em `$1, $2, …` |
| `nomeDoSchema()` (`src/server/db/sql.ts:63`) | Vem de `AUREA_DB_SCHEMA`, não do usuário, e ainda assim é validado por regex — inválido **lança**, não degrada |
| Construtores dinâmicos de `WHERE` (`painel-leituras.ts`, `ledger.ts`, `ofertas-historico.ts`, `cs.ts`) | A função `param()` empurra o valor no array e devolve `$N`. O que é concatenado são fragmentos literais e placeholders — nunca dado do usuário |
| `tabelaExiste()` | Valida o identificador contra `/^[a-z_][a-z0-9_]*$/` **e** usa `to_regclass($1)` parametrizado |
| Busca textual do atendimento e da trilha | `semCuringa()` escapa `%`, `_` e `\` antes do `LIKE` — quem digita `_` procura `_`, não "qualquer caractere" |
| `src/server/auth/*` e `src/app/api/webhooks/*` | **Nenhum SQL cru.** Login e cadastro passam pelo Supabase Auth; webhooks gravam pelos repositórios |
| Páginas públicas (`/`, `/entrar`, `/cadastrar`, `/painel`, `/taxas`, `/termos`, `/suporte`, `/academy`, `/privacidade`) | Só leem sessão e configuração. Nenhuma leva entrada do visitante para dentro de uma consulta |

**O que não é risco, mas parece.** Duas construções chamam atenção numa leitura rápida e
são seguras: em `cs.ts:289`, `const texto = param(...)` guarda o **retorno** de `param()`,
que é a string `$N` — o que entra na consulta é o placeholder; e `state.ts:97` interpola
variáveis numa **mensagem de erro**, não em SQL.

**Conclusão.** Não há o que corrigir. O que falta é **impedir a regressão**: hoje nada
obriga a próxima consulta a seguir o padrão, e a auditoria é um retrato de um dia. Ver
"Em aberto".

---

## Em aberto, aguardando decisão

Itens levantados e ainda não resolvidos. Saem daqui quando forem decididos, e a decisão
vira entrada do dia.

| Item | Levantado em | Situação |
|---|---|---|
| **Vulnerabilidade crítica no `next`** — RCE não autenticado em servidor Windows e na API de otimização de imagem com AVIF ([GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36), [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)). Junto vem `sharp` < 0.35.4, severidade alta. O `npm audit fix` resolve os dois sem trocar de major. | 18/09/2026 | Aguardando aval do Gabriel — mexer em dependência de produção pede build de verificação |
| **Fluxo entre `staging` e `main`** — qual das duas recebe o trabalho novo | 18/09/2026 | A combinar |
| **Rota nova nasce pública** — sem `middleware.ts`, a proteção é escolhida arquivo a arquivo e o padrão de quem esquece é aberto (item 5) | 18/09/2026 | Correção planejada, aguardando aval — ver abaixo |
| **Nada impede uma consulta SQL futura de sair do padrão seguro** (item 6) | 18/09/2026 | Guarda de regressão planejada, aguardando aval |
