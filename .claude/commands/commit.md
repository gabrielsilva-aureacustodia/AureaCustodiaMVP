---
description: Verifica, commita e publica seguindo o checklist da Áurea Custódia
argument-hint: "[descrição opcional do que foi feito]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git log:*), Bash(git branch:*), Bash(npm run build:*), Bash(npm run typecheck:*), Bash(npm run lint:*), Bash(npm test:*)
---

Execute a rotina de commit da Áurea Custódia. Siga os passos NA ORDEM e **pare no
primeiro que falhar** — não tente contornar, não commite "para não perder o trabalho",
não use `--no-verify`.

Contexto adicional do que foi feito nesta sessão: $ARGUMENTS

## Passo 1 — Inventário

Rode `git status` e `git diff`. Depois me diga, em português claro e em no máximo cinco
linhas: **quais arquivos mudaram e o que a mudança faz**. Se algum arquivo apareceu no
diff sem que eu tenha pedido a alteração, pare e me avise antes de seguir.

## Passo 2 — Varredura de segurança

Antes de qualquer `git add`, confira que **nada** disto está entre as alterações:

- `.env`, `.env.local` ou qualquer arquivo com segredo
- `SESSION_SECRET`, `POSTGRES_URL`, `DATABASE_URL`, `KV_REST_API_TOKEN`,
  `UPSTASH_REDIS_REST_TOKEN` com valor real escrito no código
- token, chave de API, senha ou credencial de qualquer natureza
- `node_modules/`, `.next/`, arquivo de build

Encontrando qualquer um: **pare imediatamente**, não commite, e me explique o que achou e
onde. Segredo que entra no histórico do Git não sai com um commit novo — precisa ser
rotacionado.

## Passo 3 — Verificação técnica

```bash
npm run typecheck
npm test
npm run build
```

Os três precisam passar. `npm test` roda as verificações do motor de casamento, do
extrato e do seed (src/domain/*.test.ts) — é a rede que protege o código que decide
quem compra de quem e por quanto. A Vercel roda `next build` a cada push e falha exatamente no
mesmo ponto — falhar aqui custa dez segundos, falhar lá derruba o ambiente que os sócios
estão testando.

Se algum falhar: **não commite**. Me mostre o erro, proponha a correção, espere eu
aprovar, corrija e volte ao Passo 1.

## Passo 4 — Conferência de regra de negócio

Mudou comportamento de alguma **superfície protegida** — `src/domain/constants.ts`,
`fees.ts`, `market.ts`, `types.ts`, o contrato de `src/server/store/types.ts` ou qualquer
Server Action?

- **Sim** → pare, explique a mudança e confirme a decisão antes de commitar. São os
  números combinados com os sócios (comissão de 0,5% + R$ 1,00, faixas de custódia de
  R$ 5/15/25/30/60, mediana de 24h por tipo, casamento preço-tempo), o modelo de dados
  (mudança em `types.ts` obriga rotação de `AUREA_STORE_KEY` — ver o `/publicar`) e todo
  caminho por onde dinheiro e titularidade se movem. Se autorizada, a mudança será
  registrada na próxima entrada do `docs/diario/VERSION_COMPARISON_DAILY.md`.
- **Não** → siga. Mudança fora dessas superfícies é desenvolvimento normal.

A lista de divergências do port no `README.md` está **encerrada desde 28/08/2026** e não
recebe itens novos — o monolito deixou de ser a referência.

## Passo 5 — Commit

```bash
git add .
git commit -m "<mensagem>"
```

Regras da mensagem:

- **português**, imperativo, uma linha, até ~70 caracteres
- diz **o que mudou e por quê**, não como
- bom: `Corrige estado perdido entre Server Action e /api/state`
- ruim: `update`, `ajustes`, `wip`, `correções diversas`
- se a mudança precisar de mais contexto, use um corpo separado por linha em branco
- **não** adicione assinatura, rodapé promocional, emoji ou co-autoria

## Passo 6 — Push

```bash
git push
```

Antes, confirme em qual branch estamos (`git branch --show-current`).

- Estando na branch principal, o push **dispara deploy em produção automaticamente**.
  Avise isso explicitamente antes de empurrar.
- Estando em outra branch, gera um Preview Deployment com URL própria — seguro para
  mostrar ao Rogério sem tocar no site principal.

## Passo 7 — Fechamento

Me entregue, em três linhas:

1. o hash curto e a mensagem do commit (`git log --oneline -1`)
2. se o push foi para produção ou para preview
3. o lembrete: acompanhar o build em vercel.com → Deployments; se quebrar, o conserto é
   promover o deploy anterior a produção (menu `⋯` → **Promote to Production**), sem
   tocar em código

## Regras que valem sempre

- **Nunca** `git push --force`, `git reset --hard` ou reescrita de histórico sem que eu
  peça explicitamente.
- **Nunca** commite com verificação falhando, por mais urgente que pareça.
- Um commit por assunto. Duas correções sem relação viram dois commits.
- Se o `git status` mostrar mudanças que não são da tarefa desta sessão, pergunte antes
  de incluir.
