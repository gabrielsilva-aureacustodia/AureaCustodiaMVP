# Ritual de Sessão — Áurea Custódia / Real Olímpico

**Versão detalhada · para leitura de IA e consulta técnica**

```
Projeto:     Áurea Custódia / Real Olímpico — AUREA CUSTODIA LTDA (CNPJ 68.071.452/0001-06)
Repositório: github.com/gabrielsilva-aureacustodia/AureaCustodiaMVP · branch main
Commit:      8e0f0a5
Gerado em:   28/08/2026
Fonte:       repositório · documentos do projeto
Versão base: 1.0
```

> A versão resumida deste documento é `RITUAL_DE_SESSAO_RESUMO.md`. Ela contém os comandos
> sem explicação, para execução direta. Esta versão contém o **porquê** de cada passo —
> e o porquê é o que permite reconhecer quando um passo falhou pela metade.

---

## Como este documento é mantido

Este documento **só muda quando a estrutura do projeto muda**: banco novo, serviço novo,
variável de ambiente nova, dependência nova, mudança no processo de deploy. Não muda por
causa de feature.

Quem manda mudar é a Leitura Diária do Repositório, que termina sempre com uma seção
"Recomendações de alteração no Ritual de Sessão". Ao aplicar uma recomendação, incremente a
versão base no cabeçalho e registre a alteração na seção final.

---

# Parte 0 — Contexto mínimo para quem nunca abriu este projeto

Se você é um agente entrando pela primeira vez, leia esta parte. Se já conhece o projeto,
pule para a Parte 1.

**O que é.** Plataforma de custódia física de moedas comemorativas brasileiras, com
marketplace de negociação interno e, no futuro, crédito com garantia. Ambiente atual é
**MVP de teste com 7 contas de sócios — não há cliente real**.

**Stack.** Next.js 15 (App Router) + React 19 + TypeScript strict, publicado na Vercel.
Origem: refatoração de um monolito HTML de 2.816 linhas (`aurea-mvp-teste.html`).

**As três camadas e a regra que as separa:**

```
src/domain/     Regra de negócio PURA. Sem React, sem Next, sem I/O, sem async.
src/server/     Só roda no servidor. Persistência, sessão, Server Actions.
src/app/        Rotas do App Router (uma tela = uma URL).
src/components/ UI. Client Components.
src/lib/        Integrações externas (CoinGecko, jsPDF, SheetJS).
src/styles/     CSS global por área.
```

**Contexto obrigatório antes de qualquer edição:** `CLAUDE.md` na raiz. Ele é carregado
automaticamente pelo Claude Code e contém as regras de negócio protegidas, as restrições de
marca e as travas regulatórias. Outros agentes precisam lê-lo explicitamente.

**Três travas que valem sempre:**

1. **Nada de `@/server/*` importado por Client Component.** Esses módulos carregam segredos e
   falam com o banco.
2. **Não sugerir blockchain, tokenização ou NFT on-chain.** A arquitetura centralizada é
   decisão registrada com base regulatória (IN RFB 1888/2019, Res. BCB 519–521/2026).
3. **Números de negócio não se alteram sem decisão dos sócios.** Vivem em
   `src/domain/constants.ts`, `fees.ts` e `market.ts`.

---

# Parte 1 — Instalação por máquina (uma vez só)

Cada item tem um teste de verificação. Falhando o teste, não avance.

## 1.1 Node.js 22 LTS

```bash
node --version    # precisa imprimir v22.x ou superior
npm --version
```

**Por que 22 e não 20.** O `package.json` declara `"node": ">=20"`, mas o npm empacotado com
o Claude Code exige ≥ 22. Uma máquina com Node 20 instala, roda e quebra depois, num ponto
que não parece ter relação nenhuma com versão de runtime — que é o pior tipo de falha.

## 1.2 Git

```bash
git --version
git config --global user.name "Gabriel Silva"
git config --global user.email "gabriel.silva@aureacustodia.com.br"
```

**Por que configurar a identidade.** Ela aparece em todo commit. Com dois desenvolvedores em
turnos alternados, autoria errada no histórico significa não saber quem fez o quê — que é
exatamente o que a due diligence do parceiro bancário vai perguntar.

## 1.3 Agente de código

```bash
claude --version
claude doctor
```

`claude doctor` faz o diagnóstico completo da instalação e é a forma mais rápida de
descobrir que a autenticação expirou.

## 1.4 GitHub CLI (opcional, recomendado)

```bash
gh auth login    # GitHub.com → HTTPS → autenticar pelo navegador
gh auth status
```

**Por quê.** Resolve autenticação de repositório privado sem token colado à mão. Como o
repositório da Áurea é privado por conter senhas em texto puro, isso deixa de ser conveniência
e vira higiene: token colado em terminal fica no histórico do shell.

---

# Parte 2 — Abertura de toda sessão de trabalho

Sete passos. **Pare no primeiro que falhar.**

## Passo 1 — Descobrir o que mudou desde a última vez

```bash
cd caminho/para/AureaCustodiaMVP
git fetch
git status
git log --oneline -10
```

**Por quê.** Gabriel e Guilherme trabalham em turnos alternados. `git fetch` traz as
referências do servidor sem alterar sua pasta de trabalho — é seguro e não desfaz nada.
`git log` mostra se o outro turno empurrou alguma coisa.

Começar a editar sem isso é a receita conhecida do conflito de merge: dois turnos mexendo no
mesmo arquivo a partir de bases diferentes, e a descoberta acontecendo no momento mais caro,
que é o merge.

`git status` responde à outra metade da pergunta: sobrou trabalho não commitado do seu turno
anterior? Se sobrou, decida agora — commitar ou descartar. Decidir isso no meio da tarefa
nova é como se perde trabalho.

## Passo 2 — Sincronizar

```bash
git pull
```

**Por quê.** Traz os commits do outro turno para a sua cópia. Havendo conflito, resolva
antes de qualquer outra coisa. Conflito ignorado no início não desaparece: ele se multiplica.

## Passo 3 — Atualizar dependências

```bash
npm install
```

**Por quê.** Se o `package.json` mudou no turno anterior, sua pasta `node_modules` está
desatualizada. O sintoma é enganoso: erro de tipo em arquivo que você não tocou. Rodar
`npm install` custa segundos e elimina essa classe inteira de confusão.

**Atenção específica deste projeto:** a dependência `xlsx` é baixada de
`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, fora do registro público do npm.
Falhando o `npm install` com erro 403 ou timeout nesse endereço, o problema é rede ou
disponibilidade do CDN — não o projeto. Ver item **CD-05** em `CRITICAL_DEBUGS.md`.

## Passo 4 — Confirmar que a base está sã antes de sujar

```bash
npm run typecheck
npm run build
```

**Por que este é o passo mais pulado e o mais importante.** Você precisa saber que o projeto
funcionava **antes** de editar. Sem essa medição, o primeiro erro que aparecer depois de duas
horas de trabalho vem acompanhado de uma pergunta impossível de responder: "fui eu, ou já
estava quebrado?"

Rodar antes transforma essa pergunta em fato conhecido.

Falhando aqui, a tarefa da sessão mudou: consertar a base vem antes de qualquer coisa nova.

## Passo 5 — Conferir o arquivo de ambiente

```bash
cat .env.local
```

Precisa conter, no mínimo:

```
SESSION_SECRET="valor-longo-aleatório"
```

`AUREA_STORE_KEY` é **opcional** e deve ficar ausente ou comentada: sem ela, o código usa o
padrão de `src/domain/constants.ts` (hoje `aurea-market-v6`), que é sempre o valor correto.
Definir a variável à mão cria o risco de ela apontar para uma versão antiga do formato de
estado — ver item **CD-01** em `CRITICAL_DEBUGS.md`.

Não existindo o arquivo:

```bash
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cole o valor gerado em `SESSION_SECRET`.

**Por que `SESSION_SECRET` importa.** Sem ela, o app cai no `DEV_SECRET` definido em
`src/server/session.ts` linha 38 — um valor fixo que está no código-fonte. Quem tem acesso ao
repositório forja um cookie de sessão e entra como qualquer usuário.

## Passo 6 — Subir o servidor local

```bash
npm run dev
```

Abra `http://localhost:3000`. Login: qualquer e-mail semeado em `src/domain/seed.ts`, senha
`12345678`.

**Clique em duas ou três telas antes de começar a trabalhar.** Não é formalidade: é a última
oportunidade de perceber que algo já estava quebrado sem que o build acusasse — e build
limpo com tela quebrada é situação comum em aplicação que só falha em tempo de execução.

Deixe esse terminal rodando. Abra um segundo terminal para git e para o agente.

## Passo 7 — Decidir onde o trabalho vai morar

```bash
git branch --show-current
```

- **`main`** → todo push publica **em produção**, direto, no ambiente que os sócios testam.
- **qualquer outra branch** → gera Preview Deployment com URL própria, isolada.

**Regra prática deste projeto:** mexeu em `src/domain/` ou em Server Action, use branch. São
os arquivos que movem dinheiro e titularidade de moeda.

```bash
git checkout -b nome-curto-da-tarefa
```

---

# Parte 3 — Dentro do agente de código

## 3.1 Abrir

```bash
claude
```

O `CLAUDE.md` da raiz é carregado automaticamente. **Não peça para o agente "ler o
CLAUDE.md"** — já está no contexto, e pedir de novo só consome janela.

Para outros agentes (Codex, Antigravity, Grok Build), o carregamento não é automático:
o primeiro pedido da sessão precisa ser a leitura explícita de `CLAUDE.md` e de
`docs/diario/CRITICAL_DEBUGS.md`.

## 3.2 Os dois primeiros pedidos de toda sessão

Antes de mandar implementar qualquer coisa:

```
Rode git log --oneline -10 e me diga em três linhas o que mudou desde
o commit <hash da última sessão>.
```

```
Sem editar nada ainda: descreva o plano para <tarefa>. Quais arquivos
você tocaria, em que ordem, e o que pode quebrar em cada um.
```

**Por quê.** A regra 1 do `CLAUDE.md` é planejar antes de editar, e ela existe porque num
port fiel a mudança silenciosa é o maior risco. O plano é barato de corrigir; o diff de dez
arquivos, não.

## 3.3 Uma tarefa por sessão

Terminou → `/commit` → `/clear` → próxima tarefa.

**Por quê.** Contexto acumulado de tarefas anteriores não ajuda: atrapalha. O agente passa a
considerar arquivos sem relação com o problema atual e a qualidade da resposta cai. `/clear`
entre tarefas é o hábito de maior retorno e menor custo do fluxo inteiro.

## 3.4 Comandos customizados do projeto

| Comando | Quando | O que faz |
|---|---|---|
| `/commit` | Ao terminar qualquer alteração | Sete passos: inventário, varredura de segredo, typecheck + build, conferência de regra de negócio, commit, push, relatório |
| `/publicar` | Antes de empurrar para `main` | Inclui a pergunta sobre mudança em `types.ts`, que é o que evita a quebra silenciosa em produção |

Use os dois sempre. Foram escritos para os erros específicos deste projeto, e nenhum agente
genérico conhece essas armadilhas.

## 3.5 Se o contexto encher

`/compact` comprime a conversa. Mas se foi preciso `/compact` no meio de uma tarefa, a tarefa
estava grande demais — quebre-a menor na próxima vez.

---

# Parte 4 — Encerramento de sessão

**Nunca termine com trabalho não commitado.** O outro turno começa depois do seu, e trabalho
parado na sua máquina é trabalho invisível para ele.

```
/commit
```

Indo para produção, `/publicar` antes. Depois do push, confira o deploy em
vercel.com → Deployments. **Deploy não conferido é deploy que você vai descobrir quebrado
pelo Rogério.**

**Caminho de volta se quebrar:** Deployments → localize o último deploy bom → menu `⋯` →
**Promote to Production**. Volta em segundos, sem tocar em código.

Por fim, gere a Leitura Diária do dia seguinte enquanto o contexto ainda está fresco.

---

# Parte 5 — Cuidados permanentes

Valem em toda sessão, sem exceção.

1. **Nunca commitar `.env.local`, token, senha ou credencial.** Segredo que entra no histórico
   do Git não sai com um commit novo — precisa ser rotacionado no serviço de origem.
2. **Números de negócio não se mexem sozinhos.** `src/domain/constants.ts`, `fees.ts` e
   `market.ts` contêm o combinado com os sócios: comissão de 0,5% + R$ 1,00 por moeda, faixas
   de custódia de R$ 5/15/25/30/60, mediana de 24h por tipo, prioridade preço-tempo. Alterar
   qualquer um **muda o produto, não o código.**
3. **Nada de `@/server/*` em Client Component.** Hoje a barreira é apenas um comentário no
   topo dos arquivos — ver item **CD-04** em `CRITICAL_DEBUGS.md`.
4. **Não sugerir tokenização, NFT on-chain, DApp ou blockchain.** Decisão registrada com base
   regulatória. Mudança aqui é jurídica antes de técnica.
5. **A superfície protegida é o esqueleto que segura a plataforma em pé.** São quatro:
   `src/domain/constants.ts` + `fees.ts` + `market.ts` (os números e o motor que os aplica),
   `src/domain/types.ts` (o modelo de dados — mudança aqui obriga rotação de
   `AUREA_STORE_KEY`), o contrato de `src/server/store/types.ts` (o que garante que trocar de
   banco não muda comportamento) e as cinco Server Actions (todo caminho por onde dinheiro e
   titularidade se movem). Mudança nelas exige parada e decisão, e fica registrada na entrada
   seguinte do `VERSION_COMPARISON_DAILY.md`. **Mudança em qualquer outro lugar é
   desenvolvimento normal e não precisa de autorização especial.**

   *A lista de divergências autorizadas do `README.md` está encerrada desde 28/08/2026. Ela
   provava fidelidade ao monolito `aurea-mvp-teste.html`, referência que deixou de existir
   quando o repositório passou a receber funcionalidade nova. Não acrescente itens a ela.*
6. **Logos são as duas em `/brand/`.** Nunca gerar, redesenhar ou substituir. Anéis olímpicos
   não podem aparecer em arte de moeda (risco de PI do COB).
7. **Nenhuma lógica de imposto antes de o contador definir o regime.** Há contradição aberta
   entre Lucro Presumido e Simples Nacional. Alíquota errada gera passivo fiscal retroativo.
8. **Toda decisão precisa ser explicável ao Rogério**, sócio não técnico. Se só funciona em
   jargão, a decisão ainda não amadureceu.

---

# Parte 6 — Divisão de frentes entre agentes

Preparada para a fase multi-agente. **Enquanto houver um agente só, a tabela tem uma linha.**

| Agente | Frente | Pastas que pode tocar | Branch |
|---|---|---|---|
| Claude Code | Toda a aplicação | `src/`, `docs/`, raiz | `main` ou branch de tarefa |

**Regra ao acrescentar agentes:** uma frente por agente, uma branch por frente, e **nunca**
dois agentes na mesma pasta ao mesmo tempo. Atualize esta tabela **antes** de dar acesso a um
agente novo, não depois.

Divisão natural deste projeto, quando chegar a hora:

| Frente | Pastas | Por que se isola bem |
|---|---|---|
| Motor e domínio | `src/domain/` | Sem I/O, sem React — testável isoladamente |
| Servidor e persistência | `src/server/` | Fronteira clara com o domínio |
| Telas | `src/app/`, `src/components/`, `src/styles/` | Consome domínio, não o altera |
| Estação de validação | pasta nova, a criar | Módulo independente |

---

# Histórico de alterações deste Ritual

| Versão | Data | O que mudou | Origem |
|---|---|---|---|
| 1.0 | 28/08/2026 | Criação, a partir da leitura do commit `8e0f0a5` | Leitura Diária 2026-08-28 |
