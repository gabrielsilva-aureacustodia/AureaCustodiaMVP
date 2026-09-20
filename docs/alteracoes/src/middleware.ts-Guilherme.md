# src/middleware.ts

**Arquivo:** `src/middleware.ts`
**Camada:** borda — roda antes de qualquer rota
**Responsável:** Guilherme

---

## 19/09/2026 — Criado: rede de segurança que fecha o "público por padrão"

**O que foi alterado**

Arquivo novo. O projeto não tinha middleware. Agora toda requisição passa por aqui antes
de chegar na rota: o que está declarado em `@/server/rotas-publicas` segue adiante, e o
resto precisa de cookie de sessão com assinatura válida.

Quem não tem sessão vai para três lugares diferentes, de propósito:

| Origem | Destino | Motivo |
|---|---|---|
| `/admin/*` | `/painel` | Regra do `CLAUDE.md`. Mandar para `/entrar` foi o que fez o painel publicado parecer não existir em 14/09 (RA-48) |
| `/api/*` | `401` em JSON | Redirecionar um `fetch` para uma página de login devolve HTML onde o cliente espera dados, e o erro aparece como "JSON inválido", longe da causa |
| demais páginas | `/entrar` | — |

**Por que foi alterado**

A autenticação vivia em dois lugares — o layout de `(app)` e o `membroDaPagina()` de
`(admin)` — e nada olhava a requisição antes. A proteção não era herdada, era escolhida
arquivo a arquivo, e o padrão de quem não escolhia era **público**. Uma página criada
fora dos dois grupos nascia acessível sem login, e nem build, nem typecheck, nem lint
acusavam.

Com oito frentes paralelas criando telas e o repositório público (RA-02, RA-11), não era
hipótese. O middleware inverte o padrão: tudo fechado, menos o que se declara aberto.
Esquecer passa a falhar para o lado seguro.

**O que observar**

**Isto é rede, não é a autoridade.** As guardas de layout continuam onde estavam e são
elas que decidem de verdade. Middleware do Next já teve bypass por cabeçalho
(CVE-2025-29927, corrigida na versão em uso) e depender só dele seria trocar um problema
por outro. São duas camadas, e a de baixo não foi removida.

**Responde autenticação, não autorização.** "Tem sessão válida?" é a pergunta daqui.
"Esta pessoa pode ver isto?" continua sendo da página — papel de equipe, posse da moeda,
permissão da ação.

Faltando `SESSION_SECRET` em produção, o `emailDoCookie` lança e aqui isso é tratado como
"sem sessão" em vez de derrubar a requisição — o middleware roda em toda rota, e propagar
o erro tiraria do ar até a landing. A rota protegida continua quebrando visivelmente, no
layout.

Verificado ao vivo em 19/09: `/pagina-que-nao-existe` passou a devolver 307 para
`/entrar`, `/admin` para `/painel`, `/api/state` 401, e as nove rotas protegidas seguem
em 200 para quem está logado.

Coberto por `src/middleware.test.ts`.
