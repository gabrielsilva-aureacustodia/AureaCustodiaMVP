# Primeiras Ações do Dia — 28/08/2026

**Áurea Custódia · commit `8e0f0a5` · 5 ações**

> Fatia executável de hoje, tirada do `CRITICAL_DEBUGS.md`. Faça na ordem.
> As duas primeiras não exigem código.

---

## ☐ 1. Conferir `SESSION_SECRET` na Vercel — 5 minutos

**Por quê:** sem essa variável, o sistema usa um segredo que está escrito no código. Quem leu
o repositório enquanto ele esteve público entra como qualquer usuário.

```
Vercel → projeto → Settings → Environment Variables
→ procurar SESSION_SECRET
```

**Existe, com valor?** → Item encerrado. Marque e siga para a ação 2.

**Não existe?** → Gere e crie:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Crie a variável `SESSION_SECRET` com esse valor, marcando **Production**, **Preview** e
**Development**. Depois: **Deployments** → mais recente → `⋯` → **Redeploy**.

Os sócios vão precisar entrar de novo. É o efeito esperado.

*(Critical Debug CD-00)*

---

## ☐ 2. Descobrir qual banco está ligado em produção — 5 minutos

**Por quê:** os documentos se contradizem. Um diz Redis, o plano diz Neon Postgres. Só o
Postgres resolve concorrência de verdade.

```
Vercel → Settings → Environment Variables
```

Procure, nesta ordem:

| Se existir | Camada ativa |
|---|---|
| `POSTGRES_URL` ou `DATABASE_URL` | Postgres ✅ |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Redis |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Redis |
| nenhuma | **Memória — problema sério** |

**Confirme também nos Runtime Logs.** Se aparecer
`[aurea] Nenhuma persistência configurada — usando store EM MEMÓRIA`, nada está ligado, e o
mercado muda sozinho entre um clique e outro.

Anote a resposta. Ela entra no `README.md` para a pergunta não voltar.

*(Critical Debug CD-08)*

---

## ☐ 3. Corrigir a chave de estado nos três arquivos — 20 minutos

**Por quê:** `.env.example` e o guia mandam usar `aurea-market-v5`, mas o código está em v6.
Quem seguir a instrução e apontar para o banco compartilhado faz duas ordens antigas
casarem entre si — porque as duas têm `tipoMoeda: undefined`, e `undefined === undefined` é
verdadeiro. Os dois mercados voltam a se misturar, sem erro e sem aviso.

### 3.1 `.env.example` — trocar o bloco final

Substitua as três últimas linhas por:

```
# --- Dados ---------------------------------------------------------------
# Chave do estado compartilhado.
#
# DEIXE COMENTADA. Sem esta variável, o código usa o padrão de
# src/domain/constants.ts (hoje 'aurea-market-v6'), que é sempre o valor certo
# para o formato de estado da versão atual.
#
# Defini-la à mão só faz sentido para forçar um reinício limpo dos dados de
# teste (incrementando o sufixo) ou para separar bancos de preview e produção.
# Apontá-la para uma versão ANTERIOR é um defeito: ordens gravadas antes do
# mercado multi-ativo não têm `tipoMoeda`, e duas delas casam entre si porque
# `undefined === undefined` é verdadeiro. Ver docs/diario/CRITICAL_DEBUGS.md,
# item CD-01.
#
# AUREA_STORE_KEY="aurea-market-v6"
```

### 3.2 `docs/GUIA_CLAUDE_CODE_AUREA.md` — linha 144

Apague a linha `AUREA_STORE_KEY="aurea-market-v5"` do bloco de `.env.local` e acrescente
abaixo do bloco:

```
Não defina `AUREA_STORE_KEY`: sem ela, o código usa o padrão correto da versão
atual do formato de estado.
```

### 3.3 `.claude/commands/publicar.md` — linha 59

Troque:

```
> 3. Incremente o número: `aurea-market-v5` → `aurea-market-v6`
```

por:

```
> 3. Incremente o número a partir do padrão atual de
>    `src/domain/constants.ts` — hoje `aurea-market-v6` → `aurea-market-v7`
```

### 3.4 Verificar e commitar

```bash
grep -rn "aurea-market-v5" . --exclude-dir=.git --exclude-dir=node_modules
```

Só podem sobrar as duas ocorrências históricas dentro de
`docs/MUDANCAS_MERCADO_MULTI_ATIVO.md` (linhas 128 e 348), que descrevem a migração já
ocorrida e **devem permanecer**.

Depois, no Claude Code:

```
/commit Corrige a chave de estado no .env.example, no guia e no /publicar
```

### 3.5 Conferir também na Vercel

`AUREA_STORE_KEY` **não deve existir** como variável de ambiente no projeto. Existindo com
valor v5, ela anula o salto de versão em produção — que é o mesmo defeito, um nível acima.

*(Critical Debug CD-01)*

---

## ☐ 4. Instalar `server-only` — 5 minutos

**Por quê:** hoje, o que impede alguém de importar o módulo do banco de dados dentro de um
componente do navegador é **um comentário**. Comentário não impede nada. Com `server-only`
instalado, a tentativa quebra o build em vez de vazar a senha do Postgres para dentro do
JavaScript que o usuário baixa.

Cinco minutos, duas linhas, e é a melhor relação esforço/risco do documento inteiro.

```bash
npm install server-only
```

Acrescente como primeira linha de código (abaixo do comentário de bloco) em:

- `src/server/state.ts`
- `src/server/session.ts`
- `src/server/store/index.ts`

```typescript
import 'server-only'
```

Depois, atualize o comentário de bloco desses arquivos — hoje ele diz que o pacote não está
instalado, e comentário que descreve uma realidade passada é pior que comentário nenhum.

**Verificar:**

```bash
npm run build      # precisa continuar passando
```

```
/commit Instala server-only e fecha a barreira entre servidor e cliente
```

*(Critical Debug CD-04)*

---

## ☐ 5. Trazer a biblioteca `xlsx` para dentro do repositório — 15 minutos

**Por quê:** hoje o `npm install` baixa essa biblioteca de um servidor da SheetJS, fora do
npm. Se ele cair, ou se houver proxy na rede, **nenhum deploy funciona** — não perde só a
exportação de planilha, não builda. Foi onde a leitura de hoje bateu, com erro 403.

```bash
mkdir -p vendor
curl -fL -o vendor/xlsx-0.20.3.tgz https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
ls -lh vendor/xlsx-0.20.3.tgz
```

O `-f` faz o `curl` falhar de verdade em vez de gravar uma página de erro dentro do arquivo.
Confira o tamanho: alguns megabytes. Se vier com 2 KB, o download falhou.

No `package.json`:

```diff
-    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
+    "xlsx": "file:vendor/xlsx-0.20.3.tgz"
```

Regenere o lockfile e valide:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Regenerar o `package-lock.json` não é opcional.** Ele guarda a URL antiga; sem isso, a
Vercel continua indo ao CDN e a correção não vale onde importa.

```bash
git add vendor/xlsx-0.20.3.tgz package.json package-lock.json
```

```
/commit Versiona o pacote xlsx e remove a dependência do CDN externo
```

**Depois, abra a exportação de auditoria e a de extrato** e confira que a planilha abre no
Excel. O teste real é o arquivo abrir, não o build passar.

*(Critical Debug CD-05)*

---

## Depois de hoje

Próximas sessões, na ordem, do `CRITICAL_DEBUGS.md`:

| Sessão | Item | Esforço |
|---|---|---|
| Amanhã | CD-02 — encerrar e selar a lista de divergências do port | 40 min |
| Amanhã | CD-06 — configurar ESLint | 30 min |
| **Prioritária** | CD-03 — Vitest + as 34 verificações do motor | 3–4 h |
| Depois | CD-07 — CI no GitHub Actions | 1 h |
| Quando der | CD-10 — apagar a branch órfã | 10 min |

**Sem código:** CD-09 — levar aos sócios a questão da comissão congelada no extrato.

---

## Lembrete do fim do dia

☐ Fechar o repositório: **Settings → Danger Zone → Make private**
☐ Rodar a leitura de amanhã enquanto o contexto ainda está fresco
