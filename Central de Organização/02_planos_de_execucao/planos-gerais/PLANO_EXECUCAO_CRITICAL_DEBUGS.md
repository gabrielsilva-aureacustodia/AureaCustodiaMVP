# Plano de execução — Critical Debugs e Ritual de Sessão

**Áurea Custódia · passo a passo técnico**
Base: commit `8e0f0a5` · Verificado em 01/09/2026 contra o repositório real
Fonte: `CRITICAL_DEBUGS.md`, `PRIMEIRAS_ACOES_DO_DIA.md`, `RITUAL_DE_SESSAO.md`, `FRENTES_DE_TRABALHO.md`

> **Como este documento difere dos originais.** Os documentos de ritual foram escritos em
> 28/08/2026 a partir de uma leitura remota. Este aqui é o resultado de conferir cada
> afirmação deles **contra a máquina e contra a Vercel**, em 01/09. Dois itens já estão
> resolvidos, um item novo apareceu, e a ordem recomendada mudou. Onde há divergência, o
> fato verificado manda.

---

## Sumário do que mudou depois da verificação

| Item | O documento dizia | O que foi verificado | Ação |
|---|---|---|---|
| **CD-00** `SESSION_SECRET` | "pode não existir em produção" | **EXISTE** na Vercel, em Production e Preview | ✅ Encerrado — resta um ajuste menor |
| **CD-08** persistência | "desconhecida — Redis ou Postgres?" | **Redis (Vercel KV)**. Sem `POSTGRES_URL`/`DATABASE_URL` | ✅ Respondido — resta uma decisão |
| **CD-05** CDN da SheetJS | "erro 403 em 28/08" | CDN respondeu **200, 2,4 MB** em 01/09 | Confirma a intermitência. Correção segue válida |
| **CD-01** chave de estado | 3 arquivos a corrigir | Confirmado + `AUREA_STORE_KEY` **não existe** na Vercel | Mantido, com escopo ampliado |
| **NOVO — H-01** | não consta em documento nenhum | **Clone do repositório dentro do repositório** | 🔴 Precede tudo |

---

# H-01 — Clone aninhado do repositório *(achado novo, precede todo o resto)*

```
Gravidade:  ALTA (operacional)
Bloqueia:   toda edição de arquivo — inclusive as correções deste plano
Evidência:  C:\dev\AureaCustodiaMVP\AureaCustodiaMVP\.git existe
            criado em 01/09/2026 01:24
```

## O sintoma

`git status` na raiz mostra três entradas não versionadas que não são do projeto:

```
?? AGENTS.md
?? AureaCustodiaMVP/
?? "Standard Rituals - Aurea/"
```

`AureaCustodiaMVP/` é uma **cópia completa e funcional do repositório**, com `.git`
próprio, apontando para o mesmo `origin`, no mesmo commit `8e0f0a5`, sem alterações
pendentes. Provavelmente foi criada pelo processo que gerou os documentos de ritual, para
ler o repositório localmente.

## Por que precede tudo

Três consequências, em ordem de gravidade:

**1. Edição no lugar errado, sem aviso.** As correções do CD-01 mexem em `.env.example`,
`docs/GUIA_CLAUDE_CODE_AUREA.md` e `.claude/commands/publicar.md`. **Esses três arquivos
existem nas duas cópias.** Um agente ou uma pessoa que abra o caminho errado corrige a
cópia, roda o `grep` de aceite, vê o resultado limpo naquela pasta, commita — e nada chega
à produção. O defeito continua, com um commit dizendo que foi resolvido.

**2. O teste de aceite do CD-01 falha por motivo errado.** O comando de verificação é:

```bash
grep -rn "aurea-market-v5" . --exclude-dir=.git --exclude-dir=node_modules
```

Rodado hoje na raiz, ele devolve **19 ocorrências**, não as 2 históricas que o documento
prevê. A diferença inteira vem da cópia aninhada e da pasta `Standard Rituals - Aurea/`.
Quem seguir o critério de aceite literalmente vai concluir que a correção não funcionou.

**3. Risco de commit quebrado.** Uma pasta com `.git` próprio dentro de um repositório é
tratada pelo Git como referência de submódulo. Um `git add -A` desatento grava um ponteiro
para um commit em vez do conteúdo — e o resultado é um repositório que não clona direito
para mais ninguém.

## A correção

O clone aninhado **está limpo e no mesmo commit da raiz**: apagá-lo não perde trabalho
nenhum. Confirme antes, e só então apague.

```bash
# 1. Confirmar que não há trabalho preso lá dentro
cd "C:/dev/AureaCustodiaMVP/AureaCustodiaMVP"
git status --short          # precisa sair vazio
git log --oneline -1        # precisa ser 8e0f0a5 ou posterior
git stash list              # precisa sair vazio

# 2. Voltar para a raiz e apagar
cd "C:/dev/AureaCustodiaMVP"
rm -rf AureaCustodiaMVP/
```

Os outros dois itens soltos precisam de decisão, não de comando:

| Arquivo | O que é | Recomendação |
|---|---|---|
| `AGENTS.md` | Equivalente do `CLAUDE.md` para o Codex. Conteúdo praticamente idêntico | **Versionar.** Se outro agente vai ler o projeto, o contexto dele precisa estar no repositório, não solto na máquina |
| `Standard Rituals - Aurea/` | Os 10 documentos de ritual e leitura diária | **Versionar em `docs/diario/`** — ver H-02 |

## Teste de aceite

```bash
cd "C:/dev/AureaCustodiaMVP"
ls -d AureaCustodiaMVP 2>/dev/null && echo "AINDA EXISTE" || echo "ok, removido"
grep -rn "aurea-market-v5" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next | wc -l
```

A contagem cai de 19 para 8 (as da pasta de rituais permanecem até o H-02).

---

# H-02 — O Ritual aponta para caminhos que não existem *(achado novo)*

```
Gravidade:  MÉDIA
Bloqueia:   a utilidade do próprio ritual para qualquer agente novo
```

O `RITUAL_DE_SESSAO.md`, seção 3.1, instrui:

> *"o primeiro pedido da sessão precisa ser a leitura explícita de `CLAUDE.md` e de
> `docs/diario/CRITICAL_DEBUGS.md`"*

**`docs/diario/` não existe no repositório.** Os documentos estão em
`Standard Rituals - Aurea/`, que não é versionado, e em `C:\Users\Gabriel\Downloads\`.

Um agente que siga o ritual à risca vai procurar um arquivo que não está lá. Vários outros
itens referenciam o mesmo caminho — o CD-01 aponta para `docs/diario/CRITICAL_DEBUGS.md`
duas vezes, e o CD-02 aponta para `docs/diario/VERSION_COMPARISON_DAILY.md`.

## A correção

```bash
cd "C:/dev/AureaCustodiaMVP"
mkdir -p docs/diario
git mv 2>/dev/null || true          # não é rastreado ainda, então é mv simples
mv "Standard Rituals - Aurea"/*.md docs/diario/
rmdir "Standard Rituals - Aurea"
```

Depois, decidir o que fica versionado. **Recomendação:** versione todos. São o processo
operacional do projeto; documento de processo que só existe na máquina de uma pessoa não é
processo, é lembrança.

Uma ressalva antes de versionar: o `CRITICAL_DEBUGS.md` cita, no CD-00, que o repositório
esteve público em 28/08 e que o `DEV_SECRET` ficou legível. **Isso é informação sensível
sobre uma janela de exposição.** O repositório é privado, então versionar é aceitável — mas
vale a decisão consciente, não o automático.

## Teste de aceite

```bash
ls docs/diario/CRITICAL_DEBUGS.md && echo "ok"
grep -rn "docs/diario/" docs/ | head    # as referências agora resolvem
```

---

# CD-00 — `SESSION_SECRET` ✅ **ENCERRADO**

**Verificado em 01/09/2026** pelo CLI da Vercel, projeto `aurea-custodia-mvp`, escopo
`aurea-custodia`:

```
SESSION_SECRET    Hidden    Sensitive    Preview, Production    3d ago
```

A variável **existe** e tem valor. O `DEV_SECRET` público **nunca esteve em uso em
produção** — a janela de repositório aberto não expôs sessão nenhuma. Pelo critério do
próprio documento ("Existindo, com valor não vazio: item encerrado"), o item está fechado.

## O que sobra, e é pequeno

**Ressalva 1 — falta o ambiente Development.** A variável está marcada em Preview e
Production, mas não em Development. Não é risco de produção; significa apenas que
`vercel dev` cairia no `DEV_SECRET`. Corrigir custa um clique.

**Ressalva 2 — a melhoria estrutural continua pendente.** O app degrada em silêncio quando
a variável falta, em vez de se recusar a subir. Vale fazer, e é barato:

```typescript
// src/server/session.ts, dentro de sessionSecret(), antes do console.warn
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'SESSION_SECRET é obrigatória em produção. Sem ela, o cookie de sessão é ' +
      'assinado com um segredo público e qualquer pessoa entra como qualquer usuário.',
  )
}
```

> ⚠️ **Cuidado real com essa mudança.** `src/server/session.ts` é a porta de entrada de
> toda sessão. Um `throw` no caminho errado derruba o login inteiro em produção. Faça em
> branch, valide num Preview Deployment, e só então leve para `main`. **Não é o tipo de
> mudança que se empurra direto para `main` no fim do dia.**

---

# CD-08 — Persistência em produção ✅ **RESPONDIDO**

**Verificado em 01/09/2026.** Variáveis presentes no projeto:

```
KV_REST_API_TOKEN · KV_URL · REDIS_URL · KV_REST_API_READ_ONLY_TOKEN · KV_REST_API_URL
```

Ausentes: `POSTGRES_URL`, `DATABASE_URL`.

Pela ordem de precedência de `src/server/store/index.ts`, a camada ativa é **Redis (Vercel
KV)**. O documento de mudanças estava certo; o plano do projeto, que falava em Neon
Postgres, descreve intenção e não realidade.

## A consequência, em uma frase

**Concorrência é "última gravação vence".** Duas ações no mesmo segundo — dois sócios
comprando o mesmo lote — podem fazer uma delas desaparecer em silêncio. Com 7 contas de
teste isso é aceitável e já era assim antes desta entrega. **Com cliente real, não é.**

## A decisão, não a tarefa

O adaptador Postgres **já está implementado e testado** (`src/server/store/postgres.ts`,
com `SELECT … FOR UPDATE`). Migrar não é código: é provisionar um Neon Postgres,
acrescentar `POSTGRES_URL` na Vercel e fazer Redeploy. A precedência é automática.

**Custo:** o banco novo nasce vazio e semeia do zero. Saldos, anúncios e senhas trocadas
voltam ao seed — de novo.

**Recomendação:** fazer isso **junto** com a próxima rotação de `AUREA_STORE_KEY` que já
for necessária por outro motivo, para pagar o custo do reset uma vez só em vez de duas. O
CD-09 (comissão congelada) muda `types.ts` e obriga rotação — é a oportunidade natural.

Registre a resposta no `README.md`, seção Persistência, para a pergunta não voltar.

---

# Ordem recomendada de execução

A ordem dos documentos originais é boa, mas mudo dois pontos e explico cada um.

```
SESSÃO 0   H-01 + H-02      higiene do repositório          ~20 min   🔴 precede tudo
SESSÃO 1   CD-01            chave de estado                 ~30 min
SESSÃO 2   CD-04            server-only                     ~20 min
SESSÃO 3   CD-05            vendorizar o xlsx               ~25 min
SESSÃO 4   CD-03            Vitest + 34 verificações        ~3-4 h    ⬆ ANTECIPADO
SESSÃO 5   CD-06            ESLint                          ~40 min
SESSÃO 6   CD-07            CI no GitHub Actions            ~1 h
SESSÃO 7   CD-02            encerrar lista de divergências  ~45 min   ⬇ ADIADO
SESSÃO 8   CD-10            apagar branch órfã              ~15 min
```

**Por que o CD-03 subiu.** O `FRENTES_DE_TRABALHO.md` o classifica como **pré-requisito**
das frentes C e A — as que mexem em dinheiro. O `PRIMEIRAS_ACOES_DO_DIA.md` o marca como
"Prioritária" mas o agenda depois do CD-02 e do CD-06. Os dois não podem estar certos. O
critério que desempata: **CD-02 e CD-06 não bloqueiam nada; CD-03 bloqueia todo o roadmap
de produto.** Além disso, o CD-07 (CI) depende do CD-03 existir para ter o que rodar.

**Por que o CD-02 desceu.** É arrumação de documentação. Não bloqueia frente nenhuma, não
tem risco associado, e o documento original já reconhece que a função dele foi cumprida.
Fazer antes dos testes é priorizar o que é visível sobre o que é perigoso.

**Regra de branch, do Ritual, Passo 7:** mexeu em `src/domain/` ou em Server Action, use
branch. Aplicando às sessões abaixo:

| Sessão | Branch? | Por quê |
|---|---|---|
| 0, 1, 7, 8 | `main` | Só documentação e configuração |
| 2 (CD-04) | **branch** | Mexe em `src/server/` — se quebrar, quebra tudo |
| 3 (CD-05) | **branch** | Mexe no `package-lock.json` — falha aqui derruba todo deploy |
| 4 (CD-03) | **branch** | Arquivo novo, mas valida `src/domain/` |
| 5, 6 | `main` | Configuração e CI |

---

# SESSÃO 0 — Higiene do repositório

**Objetivo:** deixar de ter duas cópias do projeto na mesma pasta.
**Branch:** `main` · **Risco:** baixo · **~20 min**

### Passo 0.1 — Abertura padrão do Ritual

```bash
cd "C:/dev/AureaCustodiaMVP"
git fetch && git status && git log --oneline -5
git pull
npm install
npm run typecheck && npm run build
```

### Passo 0.2 — Confirmar que o clone aninhado está descartável

```bash
cd "C:/dev/AureaCustodiaMVP/AureaCustodiaMVP"
git status --short      # PRECISA sair vazio
git stash list          # PRECISA sair vazio
git log --oneline -1    # PRECISA ser 8e0f0a5 ou posterior
```

**Qualquer uma das três saindo diferente, pare.** Há trabalho preso lá dentro e ele
precisa ser recuperado antes.

### Passo 0.3 — Remover

```bash
cd "C:/dev/AureaCustodiaMVP"
rm -rf AureaCustodiaMVP/
```

### Passo 0.4 — Mover os rituais para dentro do repositório

```bash
mkdir -p docs/diario
mv "Standard Rituals - Aurea"/*.md docs/diario/
rmdir "Standard Rituals - Aurea"
ls docs/diario/
```

### Passo 0.5 — Decidir sobre o `AGENTS.md`

Compare com o `CLAUDE.md` antes de versionar:

```bash
diff CLAUDE.md AGENTS.md | head -30
```

Sendo praticamente idênticos, considere que o `AGENTS.md` apenas aponte para o `CLAUDE.md`
em vez de duplicar o conteúdo — **dois arquivos com as mesmas regras divergem no primeiro
dia em que alguém atualiza só um deles.**

### Passo 0.6 — Verificar e commitar

```bash
grep -rn "aurea-market-v5" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next | wc -l
git status --short
```

```
/commit Move os rituais para docs/diario e remove o clone aninhado
```

### Teste de aceite

- [ ] `ls AureaCustodiaMVP` devolve erro (a pasta não existe mais)
- [ ] `docs/diario/CRITICAL_DEBUGS.md` existe
- [ ] `git status` limpo
- [ ] `npm run build` passa

---

# SESSÃO 1 — CD-01: a chave de estado

**Objetivo:** nenhum arquivo do repositório instruir alguém a usar `aurea-market-v5`.
**Branch:** `main` · **Risco:** baixo (só texto) · **~30 min**

### Passo 1.1 — `.env.example`, últimas 4 linhas

Substituir:

```
# --- Dados ---------------------------------------------------------------
# Chave do estado compartilhado. Trocar o sufixo (v5 -> v6) força um reinício
# limpo dos dados de teste em todos os dispositivos, como no MVP original.
AUREA_STORE_KEY="aurea-market-v5"
```

Por:

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

### Passo 1.2 — `docs/GUIA_CLAUDE_CODE_AUREA.md`, linha 144

Apagar a linha `AUREA_STORE_KEY="aurea-market-v5"` do bloco e acrescentar, depois dele:

```
Não defina `AUREA_STORE_KEY`: sem ela, o código usa o padrão correto da versão
atual do formato de estado.
```

### Passo 1.3 — `.claude/commands/publicar.md`, linha 59

Trocar:

```
> 3. Incremente o número: `aurea-market-v5` → `aurea-market-v6`
```

Por:

```
> 3. Incremente o número a partir do padrão atual de
>    `src/domain/constants.ts` — hoje `aurea-market-v6` → `aurea-market-v7`
```

### Passo 1.4 — Vercel ✅ já verificado

`AUREA_STORE_KEY` **não existe** como variável do projeto, conferido em 01/09. O salto
para v6 está valendo em produção. **Nenhuma ação necessária.**

### Passo 1.5 — Melhoria estrutural (recomendada)

Fazer `garantirFormato()` em `src/server/state.ts` cumprir o que o nome promete. Hoje ela
só preenche `deposits` — o nome sugere uma proteção que ela não dá:

```typescript
function garantirFormato(state: AppState): AppState {
  if (!Array.isArray(state.deposits)) state.deposits = []

  // Ordens gravadas antes do mercado multi-ativo não têm `tipoMoeda`. Duas delas
  // casariam entre si no motor, porque `undefined === undefined` é verdadeiro —
  // e os dois mercados voltariam a se misturar sem erro e sem aviso.
  const antes = state.sellOffers.length + state.buyOrders.length
  state.sellOffers = state.sellOffers.filter((o) => typeof o.tipoMoeda === 'string')
  state.buyOrders = state.buyOrders.filter((b) => typeof b.tipoMoeda === 'string')
  const descartadas = antes - state.sellOffers.length - state.buyOrders.length
  if (descartadas > 0) {
    console.warn(`[aurea] ${descartadas} ordem(ns) sem tipoMoeda descartada(s) — formato v5.`)
  }

  return state
}
```

> ⚠️ Isto mexe em `src/server/state.ts`, que é caminho de escrita do estado. **Use branch.**
> Se optar por adiar, o item continua registrado — mas registre também que o `.env.example`
> corrigido é a única proteção, e proteção que depende de ninguém errar não é proteção.

### Teste de aceite

```bash
grep -rn "aurea-market-v5" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next
```

Só podem restar as ocorrências **históricas** em `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`
(linhas 128 e 348) e as dos documentos de diário em `docs/diario/`, que descrevem o
problema. Nenhuma em `.env.example`, no guia ou no `publicar.md`.

```
/commit Corrige a chave de estado no .env.example, no guia e no /publicar
```

---

# SESSÃO 2 — CD-04: `server-only`

**Objetivo:** transformar o comentário de aviso numa barreira que quebra o build.
**Branch:** `fix/server-only` · **Risco:** médio · **~20 min**

### Passo 2.1

```bash
git checkout -b fix/server-only
npm install server-only
```

### Passo 2.2 — Três arquivos

Acrescentar como **primeira linha executável**, logo abaixo do comentário de bloco:

```typescript
import 'server-only'
```

Em: `src/server/state.ts`, `src/server/session.ts`, `src/server/store/index.ts`.

### Passo 2.3 — Atualizar o comentário que ficou mentiroso

O topo de `src/server/state.ts` diz hoje:

> *"O idiomático seria `import 'server-only'` no topo… mas o pacote não está no
> `package.json` e a instalação está fora do escopo desta fase. Até lá, este aviso é a
> barreira."*

Depois da instalação isso descreve um passado. **Comentário que descreve realidade passada
é pior que comentário nenhum** — quem ler vai acreditar. Substitua por uma nota dizendo que
a barreira agora é o pacote, e que o build quebra ao primeiro import indevido.

### Passo 2.4 — Prova positiva e negativa

```bash
npm run build     # 1. precisa continuar passando
```

```bash
# 2. a prova que importa: acrescente temporariamente no topo de
#    src/components/market/BidRow.tsx (que é 'use client'):
#      import '@/server/state'
npm run build     # PRECISA QUEBRAR
# remova a linha
```

**Teste que não falha quando deveria não é teste.** Se o build passar com o import
indevido, a instalação não surtiu efeito e o item não está resolvido.

### Passo 2.5

```bash
git push -u origin fix/server-only
```

Confira o Preview Deployment antes de mesclar.

### Teste de aceite

- [ ] `npm run build` passa
- [ ] Import de `@/server/*` em Client Component **quebra** o build
- [ ] Nenhum comentário do repositório afirma que o pacote não está instalado

---

# SESSÃO 3 — CD-05: vendorizar o `xlsx`

**Objetivo:** `npm install` deixar de depender de um servidor de terceiro.
**Branch:** `fix/vendor-xlsx` · **Risco:** médio-alto · **~25 min**

> **Estado atual verificado em 01/09:** o CDN respondeu **200, 2,4 MB**. O erro 403 de
> 28/08 foi transitório — o que **confirma** o problema em vez de negá-lo: uma dependência
> que ora responde ora não é exatamente o risco descrito. E significa que o download da
> correção funciona agora.

### Passo 3.1

```bash
git checkout -b fix/vendor-xlsx
mkdir -p vendor
curl -fL -o vendor/xlsx-0.20.3.tgz https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
ls -lh vendor/xlsx-0.20.3.tgz
```

O `-f` faz o `curl` falhar de verdade em vez de gravar uma página de erro dentro do
arquivo. **Confira o tamanho: precisa dar ~2,4 MB.** Vindo com 2 KB, o download falhou e o
`.tgz` contém HTML.

### Passo 3.2 — `package.json`

```diff
-    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
+    "xlsx": "file:vendor/xlsx-0.20.3.tgz"
```

### Passo 3.3 — Regenerar o lockfile

```bash
rm -rf node_modules package-lock.json
npm install
npm run typecheck && npm run build
```

**Não é opcional.** O `package-lock.json` guarda a URL antiga; sem regenerar, o `npm ci` da
Vercel continua indo ao CDN e a correção não vale justamente onde importa.

### Passo 3.4 — Prova

```bash
rm -rf node_modules
npm install --loglevel=http 2>&1 | grep -i "cdn.sheetjs.com" && echo "AINDA BUSCA O CDN" || echo "ok"
```

### Passo 3.5 — O teste que importa de verdade

Build passando **não** prova que a exportação funciona. Suba a aplicação, entre numa conta e
baixe os dois arquivos:

- `/graficos/auditoria` → "Exportar auditoria completa"
- `/conta/extrato` → "Exportar planilha XLSX"

**Abra os dois no Excel.** O teste é a planilha abrir, não o build passar.

### Teste de aceite

- [ ] `npm install` não menciona `cdn.sheetjs.com`
- [ ] `vendor/xlsx-0.20.3.tgz` tem ~2,4 MB e está versionado
- [ ] As duas exportações geram arquivo que abre no Excel
- [ ] O Preview Deployment builda

---

# SESSÃO 4 — CD-03: Vitest e as 34 verificações ⭐

**Objetivo:** o motor que decide quem compra de quem deixar de estar sem rede.
**Branch:** `feat/testes-motor` · **Risco:** baixo (não altera produção) · **~3-4 h**

> **É a sessão de maior valor do plano inteiro.** Bloqueia as frentes A e C do
> `FRENTES_DE_TRABALHO.md`, bloqueia o CD-07, e é pré-requisito da futura tradução de
> `src/domain/` para Java — traduzir código sem teste é reescrever no escuro.

### Passo 4.1 — Instalar

```bash
git checkout -b feat/testes-motor
npm install --save-dev vitest
```

### Passo 4.2 — `package.json`

```diff
     "lint": "next lint",
-    "typecheck": "tsc --noEmit"
+    "typecheck": "tsc --noEmit",
+    "test": "vitest run",
+    "test:watch": "vitest"
```

### Passo 4.3 — `vitest.config.ts` na raiz

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    // Obrigatório: sem o alias, os imports de '@/domain/...' não resolvem no teste.
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

### Passo 4.4 — Os casos

A lista completa está na **seção 7 de `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`**. É
transcrição, não invenção — as 34 verificações existiram e passaram; o que falta é
versioná-las.

Sugestão de divisão em arquivos, para cada um ter um dono claro:

| Arquivo | Cobre |
|---|---|
| `src/domain/market.test.ts` | Casos 1 a 7 — separação de livros, preço-tempo, oferta órfã, indicadores |
| `src/domain/money.test.ts` | Caso 8 — `parsePrice`, a divergência autorizada nº 1 |
| `src/domain/statement.test.ts` | Caso 9 — o extrato fecha com o saldo |
| `src/domain/seed.test.ts` | Contagem por conta, faixa de valor da DH, ordem cronológica |

Ordem de importância, se o tempo acabar no meio:

| # | Caso | Por que é o mais importante |
|---|---|---|
| 1 | Bid de DH a R$ 450 **não** consome oferta de Bandeira a R$ 285 | É a regra inteira do mercado multi-ativo |
| 2 | Mesmo tipo casa: comprador paga cheio, vendedor recebe líquido, comissão ao centavo | É o dinheiro |
| 3 | Empate de preço: quem publicou antes leva | Prioridade preço-tempo |
| 4 | Preço maior ganha de quem chegou antes | Prioridade preço-tempo |
| 5 | Dois livros em paralelo sem contaminação | Isolamento entre ativos |
| 6 | Oferta órfã não move saldo nem grava negociação | Divergências autorizadas 2 e 3 |
| 7 | `avg7` e `medianSellPrice` isolam os tipos | Indicadores por ativo |
| 8 | `parsePrice`: `250.00` → R$ 250,00 e `1.500` → R$ 1.500,00 | Divergência autorizada 1 |
| 9 | Extrato fecha com o saldo real | Consistência contábil |

**Um detalhe que economiza uma hora:** o `seed.ts` usa `Math.random()`. Testes sobre o seed
precisam afirmar **faixas e invariantes** (toda conta tem de 1 a 3 DH; a contagem total por
conta não mudou), nunca valores exatos. Teste que depende de sorteio falha um dia em vinte,
e teste que falha sozinho é teste que a equipe aprende a ignorar.

### Passo 4.5 — Integrar ao `/commit`

Em `.claude/commands/commit.md`, Passo 3:

```diff
 npm run typecheck
+npm test
 npm run build
```

### Passo 4.6 — A prova negativa

```bash
# 1. inverta deliberadamente a comparação de tipo em src/domain/market.ts:
#      s.tipoMoeda !== bo.tipoMoeda
npm test          # O CASO 1 PRECISA FALHAR
# 2. reverta
npm test          # tudo verde de novo
```

**Sem este passo, a sessão não está concluída.** Um teste que passa com o código quebrado
é pior que teste nenhum: dá confiança falsa.

### Teste de aceite

- [ ] `npm test` roda e passa
- [ ] Inverter a comparação de `tipoMoeda` faz o caso 1 falhar
- [ ] O `/commit` roda `npm test`
- [ ] Os testes do seed afirmam faixas, não valores sorteados

---

# SESSÃO 5 — CD-06: ESLint

**Objetivo:** `npm run lint` rodar sem abrir assistente interativo.
**Branch:** `main` · **~40 min**

> **Confirmado nesta sessão:** rodar `npm run lint` hoje abre o assistente de configuração
> do Next e fica esperando entrada. Em terminal é chato; em CI, trava.

### Passos

```bash
npm install --save-dev @eslint/eslintrc
```

`eslint.config.mjs` na raiz:

```javascript
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'node_modules/**', 'vendor/**'] },
]
```

```diff
-    "lint": "next lint"
+    "lint": "eslint ."
```

**Não corrija tudo de uma vez.** A primeira execução provavelmente devolve dezenas de
avisos herdados do port. Registre a contagem, corrija o que for erro real, e silencie o
resto com **regra explícita no config** — nunca com `// eslint-disable` espalhado pelos
arquivos, que é dívida que ninguém mais encontra.

> Nota: já existe um `// eslint-disable-next-line react-hooks/exhaustive-deps` em
> `src/app/(app)/vender/page.tsx`, com o motivo escrito ao lado. Esse é legítimo — o efeito
> consome o parâmetro de URL uma vez só. Revise-o quando o ESLint começar a rodar de fato.

### Teste de aceite

- [ ] `npm run lint` executa sem interação
- [ ] Saída 0, ou lista de problemas conhecidos e registrada

---

# SESSÃO 6 — CD-07: integração contínua

**Objetivo:** build e testes deixarem de depender de disciplina humana.
**Branch:** `main` · **~1 h** · **Depende de:** CD-03 e CD-06

`.github/workflows/ci.yml` conforme o `CRITICAL_DEBUGS.md`, com uma ressalva sobre a versão
do Node: o workflow fixa `'22'`, e a máquina de desenvolvimento roda **24.19.0**. Não é
conflito — o `package.json` pede `>=20` e o 22 é LTS —, mas **testar numa versão diferente
da usada em desenvolvimento reduz o valor da CI**. Considere `'24'`, ou alinhe a máquina ao
22. O que não vale é deixar a divergência sem decisão.

Depois de verde, ative a proteção de branch:
GitHub → Settings → Branches → regra para `main` → **Require status checks to pass**.

### Teste de aceite

- [ ] PR com erro de tipo deliberado é reprovado pela CI
- [ ] Corrigido, passa
- [ ] `main` exige a CI verde antes do merge

---

# SESSÃO 7 — CD-02: encerrar a lista de divergências

**Objetivo:** selar um controle cuja função já foi cumprida.
**Branch:** `main` · **~45 min**

Siga os cinco passos do `CRITICAL_DEBUGS.md` — eles estão completos e corretos. Dois
apontamentos:

**1. Existe uma tarefa em aberto que conflita com este item.** Nesta sessão eu abri uma
sugestão de tarefa para corrigir o título de "duas" para "cinco" divergências. **Descarte
essa tarefa.** A decisão do operador em 28/08 é melhor: a lista vai para **seis** itens
(acrescentando a mudança de concorrência) e é **selada**, não corrigida para continuar
viva. Corrigir a contagem manteria em manutenção um artefato que deve ser encerrado.

**2. O sexto item precisa entrar antes do lacre.** Lista selada com buraco conhecido é pior
que lista nenhuma, porque quem consultar amanhã vai acreditar que está completa. O texto do
sexto item está pronto no CD-02, Passo 1.

---

# SESSÃO 8 — CD-10: branch órfã

**~15 min.** Recupere o `.docx` para `docs/referencia/`, depois:

```bash
git push origin --delete Useful-Data
```

> ⚠️ **Apagar branch remota é irreversível pela interface.** Confirme que o documento foi
> recuperado **antes** de apagar. Verificado em 01/09: a branch `origin/Useful-Data` ainda
> existe.

---

# Sem código: CD-09, para a mesa dos sócios

A comissão do extrato é **recalculada** a cada leitura, não congelada no momento da
negociação. Enquanto `FEE_PCT` e `FEE_FIXED` não mudarem, os dois valores são idênticos e
nada acontece. No dia em que mudarem, **o extrato passa a mostrar comissões diferentes para
negociações que já aconteceram.**

**Para o Rogério, sem jargão:** hoje o extrato calcula a comissão na hora de mostrar, usando
a taxa de agora. Se a taxa mudar um dia, um extrato impresso hoje e o mesmo extrato impresso
depois vão dizer valores diferentes para a mesma venda — sem que nada tenha acontecido com
a conta do cliente. Numa contestação, os dois papéis são prova, e eles se contradizem.

**A correção exige mudar `src/domain/types.ts`**, que é a fonte da verdade do modelo de
dados — e mudança ali **obriga rotação de `AUREA_STORE_KEY`**, ou seja, mais um reset do
ambiente de teste.

**Recomendação:** aprovar o CD-09 e executá-lo **junto** com a migração para Postgres do
CD-08. Os dois exigem reset; feitos juntos, o ambiente zera uma vez em vez de duas.

---

# Onde este plano NÃO chega

| Assunto | Onde está |
|---|---|
| Ledger, DRE, Google Sheets, login, gateway, Correios, estação de validação | `docs/diario/FRENTES_DE_TRABALHO.md` — 5 frentes, 2 bloqueadas por decisão |
| Bloqueantes de cliente real | `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`, Bloco 1 |
| Acessibilidade, memoização, idempotência do depósito | `docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`, seção 8 |

**Nenhuma frente do `FRENTES_DE_TRABALHO.md` começa antes das sessões 0 a 4.** Os
pré-requisitos declarados lá são CD-04, CD-03, CD-00 e CD-08 — os dois últimos já estão
respondidos; os dois primeiros são as sessões 2 e 4 deste plano.
