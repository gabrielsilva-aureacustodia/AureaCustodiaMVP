---
description: Verifica se a alteração pode ir ao ar, decide sobre rotação da chave de estado e confere o deploy
argument-hint: "[o que está sendo publicado]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(npm run build:*), Bash(npm run typecheck:*)
---

Rotina de publicação da Áurea Custódia. O objetivo é impedir que uma alteração derrube o
ambiente que os sócios estão testando.

Contexto do que está sendo publicado: $ARGUMENTS

Execute NA ORDEM e **pare no primeiro problema**. Você não publica nada sozinho — quem
clica é o Gabriel. Seu papel é dizer exatamente o que fazer e conferir depois.

---

## Passo 1 — O que vai ao ar

Rode `git log --oneline origin/main..HEAD` para ver o que ainda não foi empurrado, e
`git status` para ver o que nem foi commitado.

Me diga em até cinco linhas o que muda no comportamento visível da plataforma. Se houver
trabalho não commitado, avise que ele **não** vai junto.

## Passo 2 — Verificação técnica

```bash
npm run typecheck
npm run build
```

Os dois têm que passar. A Vercel roda `next build` e falha no mesmo ponto.

## Passo 3 — ⚠️ A pergunta que evita o desastre

**O formato de `src/domain/types.ts` mudou?**

Rode `git diff origin/main..HEAD -- src/domain/types.ts` e verifique se houve:

- campo adicionado a qualquer interface do `AppState`
- campo removido
- campo que mudou de tipo
- campo que deixou de ser opcional (ou virou opcional)

**Por que isso importa:** o estado inteiro é gravado como um documento único sob
`STORE_KEY` (`src/domain/constants.ts`, linha 19). `getState()` devolve o documento
gravado **exatamente como está**, sem validar formato e sem migrar. O código novo espera
o campo novo, encontra `undefined`, e a tela quebra — em produção, sem ter quebrado no
desenvolvimento local, porque local usa memória e semeia limpo a cada `npm run dev`.

### Se o formato MUDOU

Diga isto ao Gabriel, em destaque:

> **É preciso rotacionar a chave de estado antes de publicar.**
>
> 1. Vercel → projeto → **Settings** → **Environment Variables**
> 2. Localize `AUREA_STORE_KEY` (se não existir, crie)
> 3. Incremente o número: `aurea-market-v5` → `aurea-market-v6`
> 4. Marque **Production**, **Preview** e **Development** → **Save**
> 5. Só então faça o push (ou, se já empurrou, **Deployments** → `⋯` → **Redeploy**)
>
> **Efeito:** o app procura uma gaveta que não existe e cria uma limpa, com os dados de
> teste iniciais. Saldos, ofertas e negociações dos sócios voltam ao ponto de partida. O
> documento antigo continua no banco, intacto — a rotação não apaga nada.
>
> **Avise os sócios antes.** Alguém pode estar no meio de um teste.

E acrescente: **enquanto for ambiente de teste, rotacionar é a solução certa. Com cliente
real ela deixa de existir** — aí toda mudança de formato exige código de migração. Ver
`docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`.

### Se o formato NÃO mudou

Diga explicitamente que **não** é para rotacionar, e por quê: rotacionar à toa apaga os
testes dos sócios sem necessidade.

## Passo 4 — Estado do ambiente na Vercel

Se o MCP da Vercel estiver conectado, confira e me reporte:

- `POSTGRES_URL` ou `DATABASE_URL` existe? (sem banco, o estado se perde entre
  requisições — cada instância recomeça do zero)
- `SESSION_SECRET` está configurado? (sem ele, o app usa o segredo de desenvolvimento que
  está no repositório, e qualquer pessoa com acesso ao código forja um cookie)
- `AUREA_STORE_KEY` está com o valor que você espera?
- Framework Preset está em **Next.js**? (errado, toda rota devolve 404)

**Nunca leia nem imprima o valor de um segredo.** Reporte apenas se existe ou não.

Se o MCP não estiver conectado, liste ao Gabriel o que ele deve conferir no painel.

## Passo 5 — Destino

Rode `git branch --show-current`.

- **`main`** → o push publica **em produção**, direto. Diga isso com todas as letras antes
  de ele empurrar.
- **outra branch** → gera Preview Deployment com URL própria. Seguro para mostrar ao
  Rogério sem tocar no que os sócios usam.

Se a alteração for arriscada e estivermos na `main`, **sugira mover para uma branch**
antes de publicar.

## Passo 6 — Publicar

O push é do Gabriel. Depois que ele confirmar que empurrou, aguarde um a três minutos e
verifique pelo MCP da Vercel:

- o deploy mais recente ficou **Ready**?
- há erro no build?
- os **Runtime Logs** mostram `[aurea] Nenhuma persistência configurada — usando store EM
  MEMÓRIA`? Se sim, o banco não está ligado: alerte imediatamente.

## Passo 7 — Fechamento

Entregue, em quatro linhas:

1. o que foi publicado (hash curto e mensagem)
2. produção ou preview
3. se a chave foi rotacionada, e o valor novo
4. o caminho de volta: **Deployments** → localizar o deploy anterior que funcionava →
   `⋯` → **Promote to Production**. Volta em segundos, sem tocar em código.

---

## Regras permanentes

- **Nunca** publique com `typecheck` ou `build` falhando.
- **Nunca** leia, imprima ou commite valor de variável de ambiente.
- **Nunca** rotacione a chave sem avisar que os dados de teste voltam ao início.
- Mudança em `src/domain/constants.ts`, `fees.ts` ou `market.ts` altera o produto, não o
  código: pare e confirme com o Gabriel antes de publicar.
- Se o Guilherme tiver commits em `origin/main` que ainda não estão aqui, avise: publicar
  daqui pode deixar o trabalho dele para trás.
