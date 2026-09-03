# Atalhos assumidos nesta pasta

> Notas locais dos atalhos tomados em `src/server/relatorios/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md), seção **RA-16**.

Todos tomados em 03/09/2026, na entrega dos módulos M4 e M7.

---

## RA-16.a 🟠 — administrador é quem está em `AUREA_ADMIN_EMAILS`, ou as 7 contas do seed

**Arquivo:** `acesso.ts`, `ehAdmin`

Não há papel de usuário no modelo (`User` não tem `role`). Sem a variável, todo sócio do seed
vê a DRE; conta criada por `/criar-conta` não vê.

**Como se paga:** o M2 (Supabase Auth) traz identidade com metadados; `ehAdmin` passa a ler
o papel do banco. Uma função, um lugar.

---

## RA-16.b 🟠 — o token de integração viaja na URL

**Arquivo:** `acesso.ts`, `tokenDeIntegracaoValido`; rotas em `src/app/api/relatorios/`

`?token=` existe porque o `IMPORTDATA` do Google Sheets não manda cabeçalho. URL com token
aparece na fórmula da célula e no log do servidor da Vercel.

**O que fica descoberto:** quem vê a planilha vê o token, e o token lê **todos** os relatórios
(inclusive extratos de todas as contas). É só leitura; não escreve nada.

**Como se paga:** rotacionar a variável ao trocar de contador; migrar a integração para o
push por conta de serviço (`sheets.ts`), que não expõe segredo na planilha; ou um token por
relatório.

---

## RA-16.c 🟡 — nenhuma rota nem Server Action desta frente tem teste

**Arquivos:** `dados.ts`, `sincronizar.ts`, `src/app/api/relatorios/*`, `src/server/actions/contabil.ts`

O que está testado: a serialização (`exportar.test.ts`), o JWT (`jwt.test.ts`), a regra pura
(`src/domain/*.test.ts`) e a gravação do ledger (`src/server/db/db.test.ts`). A montagem dos
relatórios a partir das fontes e a autorização das rotas são exercitadas só manualmente.

**Por quê:** `dados.ts` importa `client.ts` (`server-only`); parametrizá-lo pelo `Executor`
como `estado.ts` é o caminho, e ficou para a sessão seguinte.

---

## RA-16.d 🟡 — o push para o Sheets nunca foi executado contra o Google

**Arquivo:** `sheets.ts`

Não há conta de serviço configurada neste ambiente. O JWT está provado localmente; as três
chamadas REST (metadados, `addSheet`, `values`) seguem a documentação da API v4 e não foram
vistas respondendo.

**Como se paga:** os passos 1–5 de `docs/INTEGRACAO_GOOGLE_SHEETS.md` e um clique em "Enviar ao
Google Sheets agora". Se algo falhar, a mensagem de erro da API vem inteira no toast.
