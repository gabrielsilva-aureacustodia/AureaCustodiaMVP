# Guia operacional — Claude Code, Git e Vercel no projeto Áurea Custódia

Gabriel Silva · agosto de 2026
Repositório: `AureaCustodiaMVP` · Next.js 15 + TypeScript · deploy na Vercel

---

## Parte 0 — Pré-requisitos (uma vez só)

Instale nesta ordem. Cada passo tem um teste de verificação: se o teste falhar, não
avance.

### 0.1 Node.js 22 LTS

O `package.json` exige Node ≥ 20; o npm do Claude Code pede ≥ 22. Instale o 22 LTS de
[nodejs.org](https://nodejs.org) e teste:

```bash
node --version    # deve imprimir v22.x ou superior
npm --version
```

### 0.2 Git

- **Windows:** [git-scm.com/downloads/win](https://git-scm.com/downloads/win) — aceite
  todos os padrões. Isso também instala o Git Bash, que o Claude Code usa como shell.
- **macOS:** já vem; se não, `xcode-select --install`.

```bash
git --version
```

Configure sua identidade (aparece em todo commit):

```bash
git config --global user.name "Gabriel Silva"
git config --global user.email "seu-email-do-github@exemplo.com"
```

### 0.3 GitHub CLI (`gh`) — opcional, mas poupa dor de cabeça

Resolve autenticação de repositório privado sem senha e sem token colado à mão.
[cli.github.com](https://cli.github.com), depois:

```bash
gh auth login      # escolha: GitHub.com → HTTPS → autenticar pelo navegador
gh auth status
```

---

## Parte 1 — Instalar o Claude Code

### 1.1 Antes: o que é cada coisa

Existe **um** Claude Code. Ele tem três portas de entrada:

| Porta de entrada | O que é | Para você |
|---|---|---|
| **CLI** (`claude` no terminal) | O produto completo. Todos os comandos, todos os atalhos. | Instale — é a base. |
| **Extensão do VS Code** | O mesmo Claude Code com painel gráfico dentro do editor. Vê diffs lado a lado, `@`-menções de arquivo, histórico em abas. | **Use no dia a dia.** |
| **App Desktop (aba Code)** | Interface gráfica sem terminal nenhum. | Alternativa se o VS Code incomodar. |

Pontos que resolvem a confusão:

- A extensão **não é um plugin de terceiros**: é a interface oficial. Ela empacota uma
  cópia própria do CLI para o painel de chat.
- Instalar a extensão **não** coloca o comando `claude` no seu terminal. Se quiser rodar
  `claude` no terminal integrado do VS Code (e vai querer, para `claude mcp add`),
  precisa **também** da instalação do CLI. As duas compartilham o mesmo histórico de
  conversa e o mesmo `~/.claude/settings.json`.
- Você **não precisa** do VS Code para usar Claude Code. Mas vai precisar de *algum*
  editor para ler o que ele escreveu, e o VS Code é o que integra melhor.

**Recomendação para o seu caso:** instale os dois (CLI + extensão). Trabalhe no painel do
VS Code; abra o terminal integrado só para `npm run dev`, `git` e configuração de MCP.
Você fica com interface gráfica sem perder nada do CLI.

### 1.2 Instalar o CLI

**Windows PowerShell:**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**macOS / Linux / WSL:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Feche e reabra o terminal. Verifique:

```bash
claude --version    # ex.: 2.1.211 (Claude Code)
claude doctor       # diagnóstico completo da instalação
```

> Se o PowerShell reclamar de `&&` como separador inválido, você está no PowerShell e
> rodou o comando do CMD. O prompt do PowerShell começa com `PS C:\`.

### 1.3 Instalar a extensão do VS Code

VS Code 1.94 ou superior. `Ctrl+Shift+X` → busque **"Claude Code"** → **Install**.

Abrir o painel: ícone da faísca no canto superior direito do editor, ou `✱ Claude Code`
na barra de status inferior direita, ou `Ctrl+Shift+P` → "Claude Code".

### 1.4 Autenticar

Rode `claude` no terminal (ou clique em **Sign in** no painel). Abre o navegador, você
loga com a conta Claude e volta. Precisa de plano **Pro, Max, Team ou Enterprise** — o
plano gratuito não dá acesso.

---

## Parte 2 — Trazer o projeto para a sua máquina

**Não use o .zip.** O download do GitHub vem sem a pasta `.git`, ou seja, sem histórico —
você não conseguiria commitar nada. Clone de verdade:

```bash
cd ~/Documentos                       # ou onde você quiser guardar
gh repo clone SEU-USUARIO/AureaCustodiaMVP
cd AureaCustodiaMVP
```

Sem o `gh`, use a URL que aparece no botão verde **Code** do GitHub:

```bash
git clone https://github.com/SEU-USUARIO/AureaCustodiaMVP.git
cd AureaCustodiaMVP
```

Instale as dependências e crie o arquivo de ambiente:

```bash
npm install
```

Crie `.env.local` na raiz (copie de `.env.example`) com pelo menos:

```
SESSION_SECRET="cole-aqui-o-valor-gerado-abaixo"
AUREA_STORE_KEY="aurea-market-v5"
```

Gere o segredo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Suba o projeto:

```bash
npm run dev
```

Abra `http://localhost:3000`. Login: qualquer conta semeada, senha `12345678`.

`.env.local` já está no `.gitignore`. **Nunca** tire ele de lá.

### 2.1 Primeira sessão do Claude Code

```bash
claude
```

Ele pede confirmação de confiança na pasta — aceite. Depois:

```
/init
```

Isso gera um `CLAUDE.md`, o arquivo de memória permanente que o Claude lê em toda sessão.
**Substitua o gerado pelo `CLAUDE.md` que entreguei junto com este guia** — ele já traz as
regras de negócio, as restrições de marca, as travas regulatórias e as pendências que não
podem ser "consertadas" por conta própria. Commite esse arquivo: ele vale para qualquer
pessoa que abrir o repositório.

---

## Parte 3 — Next.js: o que muda em relação ao JavaScript que você já sabe

### A resposta curta

Next.js **não é uma linguagem**. A linguagem continua sendo JavaScript — no seu caso,
TypeScript, que é JavaScript com tipos declarados. Next.js é um *framework*: um conjunto
de convenções sobre onde os arquivos ficam e quando cada trecho de código roda.

Sua intuição estava quase certa. "Forma de organizar arquivos e bibliotecas" é 80% da
verdade. Os 20% que faltam são a parte que realmente exige atenção, e é onde os erros
acontecem.

### O que é só organização (a parte fácil)

**Roteamento por pasta.** No monolito você tinha onze `<div>` escondidos e uma função
`render()` que trocava `display: none`. Agora a pasta é a URL:

```
src/app/(app)/mercado/page.tsx        →  /mercado
src/app/(app)/recibos/[coinId]/page.tsx  →  /recibos/RO-000042
```

Pastas entre parênteses, como `(app)`, agrupam sem virar URL. Colchetes, como
`[coinId]`, são parâmetro dinâmico.

**Layouts que não remontam.** `layout.tsx` envolve tudo que está abaixo dele e
**permanece montado** durante a navegação. Sua sidebar, topbar e o `AppProvider` com o
ciclo de sincronização de 10 s sobrevivem à troca de página — só o `{children}` muda. É
exatamente a disciplina que o `render()` do monolito mantinha à mão, agora de graça.

**Imports com `@/`.** `@/domain/fees` é `src/domain/fees`. Só um atalho configurado no
`tsconfig.json`.

### O que é conceito novo de verdade (a parte que morde)

Aqui mora a única diferença que importa: **nem todo código roda no mesmo lugar.**

No monolito, tudo rodava no navegador. Em Next.js, um arquivo pode rodar em dois lugares
distintos:

**Server Component (padrão).** Roda no servidor, antes do HTML sair. Pode ler o banco,
ler variável de ambiente, ler cookie. Nunca vai para o navegador. `src/app/(app)/layout.tsx`
é um: ele confere a sessão e busca o estado *antes* de qualquer HTML existir. Um guarda no
cliente entregaria o casco montado ao visitante não autenticado por um instante — e o
estado junto.

**Client Component.** Marcado com `'use client'` na primeira linha. Roda no navegador,
como o JavaScript que você conhece. Pode ter `useState`, `onClick`, `useEffect`. Todo o
`src/components/` do seu projeto é assim.

**Server Action.** Marcado com `'use server'`. É uma função que o cliente *chama* mas que
*executa* no servidor. Seus `src/server/actions/*.ts` são isso. É o mecanismo que tirou a
regra de negócio do navegador: no monolito, quem abrisse o console reescrevia
`buyer.balance` e comprava de graça. Agora o cliente manda três coisas — qual oferta,
quantas moedas, por quanto — e o servidor relê e reconfere todo o resto.

**A regra prática que resume tudo:** se o arquivo importa de `@/server/*`, ele **não pode**
ter `'use client'`. Puxar `@/server/state` para o bundle do navegador vazaria as
credenciais do banco. O aviso está escrito no topo de `src/server/state.ts`, e é a
armadilha número um do App Router.

### O que praticamente não muda

`for`, `map`, `async/await`, aritmética, manipulação de string, sua lógica de comissão e
casamento de ordens — tudo idêntico. Repare que `src/domain/` inteiro é JavaScript puro:
sem React, sem Next, sem I/O. Foi montado assim de propósito. Se um dia migrar para Java
+ Spring, **é essa pasta que se traduz quase linha a linha** e o resto se joga fora.

### Sobre "programar em blocos de workflow e pular etapas"

Vindo do Sim Studio, o hábito é montar o grafo e ver o resultado. Aqui existem duas
etapas que você não pode pular, e as duas são baratas:

```bash
npm run typecheck    # o TypeScript acusa erro antes de rodar
npm run build        # o build da Vercel falha exatamente aqui
```

Falhar na sua máquina custa dez segundos. Falhar na Vercel custa um deploy quebrado com
o Rogério olhando.

---

## Parte 4 — Git e GitHub: como funciona um commit

### O modelo mental

Git é um **histórico de fotografias** do projeto. Três lugares, três verbos:

```
seus arquivos  ──add──▶  área de staging  ──commit──▶  histórico local  ──push──▶  GitHub
```

- **`add`** — escolhe o que entra na foto.
- **`commit`** — bate a foto e escreve a legenda. Ainda é só na sua máquina.
- **`push`** — manda o histórico local para o GitHub.

Um commit é reversível. É a rede de segurança: se o Claude Code fizer uma bagunça, você
volta ao último commit e não perdeu nada.

### O ciclo completo, um passo por vez

```bash
git status                          # 1. o que mudou?
git diff                            # 2. mudou o quê, exatamente?
npm run build && npm run typecheck  # 3. compila?
git add .                           # 4. tudo entra na foto
git commit -m "Corrige alvo de toque do botão vender no mobile"
git push                            # 5. sobe para o GitHub
```

Boa mensagem de commit responde **o que mudou e por quê**, no imperativo, em uma linha
curta. `"Corrige cálculo de comissão em compra de lote parcial"` serve. `"update"` não.

### Comandos de emergência

```bash
git checkout -- caminho/do/arquivo.tsx   # descarta alterações NÃO commitadas de um arquivo
git restore .                            # descarta TODAS as alterações não commitadas
git log --oneline -10                    # últimos 10 commits
git revert <hash>                        # cria um commit que desfaz outro (seguro)
```

**Não use `git reset --hard` sem entender**: ele apaga trabalho sem pedir confirmação.

### Deixando o Claude Code fazer

Depois que você tiver feito o ciclo à mão umas três vezes, é só pedir:

```
commite essas mudanças com uma mensagem descritiva
```

Ele roda `git status`, lê o diff, escreve a mensagem e commita. Continue conferindo o
diff antes de aprovar — nas primeiras semanas, sempre.

Um detalhe que vale ouro: **commite entre tarefas, não no fim do dia**. Cada commit é um
ponto de retorno. Sessão longa sem commit é sessão sem rede.

---

## Parte 5 — Vercel: como o site atualiza

### O que já acontece sozinho

A Vercel está ligada ao seu repositório do GitHub. **Todo `git push` na branch principal
dispara um deploy automático.** Você não faz nada além do push.

```
git push  ──▶  GitHub  ──▶  Vercel roda `next build`  ──▶  site novo no ar
```

Leva de um a três minutos. Você acompanha em vercel.com → seu projeto → **Deployments**.

Push em qualquer **outra** branch gera um **Preview Deployment**: uma URL própria,
separada da produção. É assim que você mostra algo ao Rogério sem arriscar o site
principal:

```bash
git checkout -b teste-nova-tela
# ... trabalha, commita ...
git push -u origin teste-nova-tela
```

A Vercel devolve o link do preview no próprio GitHub.

### Configuração obrigatória no painel (uma vez)

O `README.md` do repositório já detalha, mas os três itens críticos são:

1. **Root Directory:** vazio (`./`). Nunca aponte para `APP`.
2. **Framework Preset:** Next.js. Se estiver errado, os arquivos de `public/` respondem
   200 mas **toda rota dá 404** com `X-Vercel-Error: NOT_FOUND` — inclusive a raiz.
3. **Environment Variables:** `SESSION_SECRET` e a persistência (KV ou Postgres). Sem
   banco externo, cada requisição pode cair numa instância diferente e o mercado muda
   sozinho entre um clique e outro. Sem `SESSION_SECRET`, o app usa um segredo que está
   no repositório — qualquer pessoa com acesso ao código forja um cookie e entra como
   qualquer usuário.

### Como voltar atrás depois de um deploy ruim

**Deployments** → localize o deploy anterior que funcionava → menu `⋯` → **Promote to
Production**. Volta em segundos, sem tocar em código.

---

## Parte 6 — Automatizar: dar acesso às contas ao Claude

### O princípio, antes das ferramentas

**Nunca entregue login e senha a um agente.** O caminho correto é sempre **OAuth ou token
com escopo limitado**, revogável a qualquer momento, sem senha envolvida. Se algo der
errado, você revoga o token e ninguém precisa trocar senha nenhuma.

Para um negócio de custódia, isso não é preciosismo: é o mesmo padrão de controle que a
due diligence do parceiro bancário vai auditar.

### Onde cada coisa se encaixa

| Ferramenta | O que faz | Como conectar |
|---|---|---|
| **`gh` CLI** | Claude Code cria PR, lê issue, faz push em repo privado | Já autenticado no passo 0.3. Nada mais a fazer. |
| **Vercel MCP** | Claude lê deploys, logs de runtime, variáveis de ambiente | `claude mcp add --transport http vercel https://mcp.vercel.com` e depois `/mcp` para autorizar |
| **Conector GitHub no Cowork** | Cowork lê repositório, issues, PRs | Claude Desktop → **Customize → Connectors → GitHub** → autorizar por OAuth |

Para o Vercel, prefira `gh` a um MCP do GitHub: consome muito menos contexto e o Claude
compõe comandos `gh` com fluência.

### A divisão de trabalho que funciona

Cowork e Claude Code apontando **para a mesma pasta**, cada um no que é bom:

- **Cowork** — planejar, pesquisar, escrever documento e especificação, falar com serviços
  externos, gerar os relatórios em Word para o Rogério.
- **Claude Code** — implementar, depurar, rodar build, commitar.

O `CLAUDE.md` na raiz é o contexto compartilhado entre os dois.

### Ordem sugerida de automação

1. **Semana 1:** tudo à mão. `git add`, `commit`, `push`, olhar o deploy na Vercel.
   Você precisa saber como é quando funciona para reconhecer quando não funciona.
2. **Semana 2:** Claude Code commita, você revisa o diff antes de aprovar.
3. **Semana 3:** conecte o Vercel MCP. Aí ele lê o log da função quando algo quebra em
   produção, em vez de você copiar e colar.
4. **Depois:** GitHub Actions rodando `build` e `typecheck` em todo push, para que erro
   nenhum chegue à Vercel.

### Antes de conectar qualquer coisa

O repositório é privado por um motivo específico: **as senhas dos usuários de teste estão
em texto puro**. Isso está listado como Etapa 2 da migração. Antes de ampliar acesso —
conector, colaborador, integração — vale resolver essa pendência primeiro.

---

## Anexo — Comandos do dia a dia

### Claude Code (dentro da sessão)

| Comando | O que faz |
|---|---|
| `/init` | Gera o `CLAUDE.md` inicial |
| `/clear` | Limpa o contexto. Use entre tarefas diferentes |
| `/compact` | Comprime a conversa quando o contexto encher |
| `/usage` | Consumo do plano e o que está pesando |
| `/mcp` | Gerencia servidores MCP conectados |
| `/plugins` | Instala e gerencia plugins |
| `@arquivo` | Menciona um arquivo específico (`@src/domain/fees.ts`) |
| `Esc` | Interrompe o Claude no meio de uma ação |

### Terminal

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor local |
| `npm run build` | Build de produção — rode antes de todo commit |
| `npm run typecheck` | Confere os tipos |
| `git status` | O que mudou |
| `git log --oneline -10` | Últimos 10 commits |
| `claude doctor` | Diagnóstico do Claude Code |
| `claude --resume` | Retoma uma conversa anterior |

### Primeiros pedidos ao Claude Code neste repositório

```
Leia o CLAUDE.md e o README.md e me explique em três parágrafos como o
estado da aplicação flui do banco até a tela de mercado.
```

```
Rode npm run build e npm run typecheck e me diga se há algum erro ou aviso.
```

```
Sem alterar nada ainda: quais arquivos eu precisaria tocar para substituir
o hash simulado do recibo por um hash SHA-256 determinístico encadeado?
Me dê o plano antes de qualquer edição.
```

---

## Referências oficiais

- Instalação do Claude Code — https://code.claude.com/docs/en/setup
- Extensão do VS Code — https://code.claude.com/docs/en/vs-code
- MCP da Vercel — https://vercel.com/docs/agent-resources/vercel-mcp
