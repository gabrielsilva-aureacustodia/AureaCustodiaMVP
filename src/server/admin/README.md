# `src/server/admin/` — o servidor do painel administrativo

A camada de serviço do painel `/admin` (frente C): quem é membro, o que ele pode, e a trilha de
tudo o que ele faz. É o equivalente, no desenho da Áurea, do backend da arquitetura de
referência da IOCUS (`docs/referencia/TRANSFERENCIA_ARQUITETURA_ADMIN.md`):

```
Página em src/app/(admin)/admin/<area>/page.tsx      sessão e permissão, no servidor
      ↓
Componente em src/components/admin/<area>/           tela e estados
      ↓
Server Action em src/server/actions/admin/<area>.ts  confere a permissão de novo, sempre
      ↓
Serviço nesta pasta                                  regra e trilha
      ↓
Repositório em src/server/db/repositories/           único lugar com SQL
```

## A frase que explica a pasta

**A recusa acontece aqui, no servidor.** Esconder item de menu é conveniência; toda Server Action
do painel chama `permissaoParaAcao` por conta própria.

## Arquivos

| Arquivo | O que faz | `server-only` |
|---|---|---|
| `acesso.ts` | `carregarMembro`, `membroDaSessao`, `podeAbrirPainelAdmin`, `permissaoParaAcao`, `exigirPermissao`. Lê o ambiente e a sessão; cai no bootstrap se o banco falhar; registra recusas na trilha | ✅ |
| `rbac.ts` | Catálogo (`garantirCatalogosAdmin`), resolução do membro no banco e a administração da equipe — adicionar e alterar membro, criar, alterar e excluir papel —, cada escrita com a linha de auditoria na mesma transação | — |
| `auditar.ts` | `registrarAcaoAdmin`: grava `admin.<area>.<verbo>` em `aurea.audit_log` dentro da transação de quem chama | — |
| `banco.test.ts` | Testes contra o Postgres embutido: migrations 020 e 021, catálogo, membros, proteção do último dev, trilha | — |
| `testing/` | O executor PGlite dos testes desta pasta. Não é código de produção | — |
| `ATALHOS.md` | O que esta pasta deve ao próprio rigor (RA-40) | — |

Os arquivos sem `server-only` recebem o `Executor` (ou a `Consulta`) por parâmetro, como
`src/server/db/estado.ts`: é o que deixa a suíte rodá-los contra o Postgres embutido.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `AUREA_ADMIN_EMAILS` | Lista (vírgula) de quem entra como `dev` quando a tabela de membros não o conhece. **Sem ela, valem as contas de `ACCOUNTS`** |
| `POSTGRES_URL` | Sem ela não há tabela de papéis: vale só o bootstrap, e a tela de equipe diz isso |

## Regras que valem aqui

- **Toda ação do painel grava `audit_log`** com `ator` = e-mail do membro e `acao` =
  `admin.<area>.<verbo>`, na mesma transação da escrita. Recusa de permissão também entra, como
  `admin.acesso.recusado`.
- **Ação do painel não reimplementa regra de outra frente.** Ajuste de saldo é lançamento
  `ajuste`; taxa é `TabelaDeTaxas`; análise é `src/server/estacao/analise.ts`.
- **O papel é relido a cada requisição.** Desativar um membro vale na tela seguinte.

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `acesso.ts`, o fallback do bootstrap | Quem entra no painel quando o banco falha — e se o Gabriel consegue entrar |
| `rbac.ts`, `garantirCatalogosAdmin` | As concessões iniciais dos papéis de sistema. Ele nunca pode desfazer o que a tela de papéis mudou |
| `rbac.ts`, `travarEquipe` | A garantia de que duas mudanças simultâneas não deixam o painel sem dev |

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/domain/admin/` | A regra pura: catálogo, resolução, proteção do último dev |
| `src/server/db/repositories/admin-rbac.ts` | O SQL das quatro tabelas da migration 020 |
| `src/server/db/repositories/auditoria.ts` | `registrarAuditoria`, a trilha que já existia |
| `src/server/relatorios/acesso.ts` | `autorizarRelatorioNoPainel` chama `carregarMembro`: as rotas de `/api/relatorios/*` respeitam os papéis |
| `src/app/api/admin/conciliacao/` | Pede `resultados.ver` pelo `carregarMembro` |
| `src/server/session.ts` | O e-mail da sessão — o mesmo cookie do app, sem segundo login |
