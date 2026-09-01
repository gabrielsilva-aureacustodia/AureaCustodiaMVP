# Ritual de Sessão — RESUMO

**Áurea Custódia · para executar, não para ler**
Versão base 1.1 · commit de referência `8e0f0a5` · 28/08/2026

> Versão completa com explicações: `RITUAL_DE_SESSAO.md`

---

## Abertura — 7 passos, pare no primeiro que falhar

```bash
# 1. Onde estou e o que mudou
cd caminho/para/AureaCustodiaMVP
git fetch
git status
git log --oneline -10

# 2. Sincronizar
git pull

# 3. Dependências
npm install

# 4. A base está sã ANTES de eu editar?
npm run typecheck
npm test
npm run build

# 5. Ambiente
cat .env.local        # precisa ter SESSION_SECRET

# 6. Subir e clicar em 2-3 telas
npm run dev           # localhost:3000 · senha 12345678

# 7. Onde o trabalho vai morar
git branch --show-current
git checkout -b nome-da-tarefa    # se mexer em src/domain/ ou Server Action
```

**Sem `.env.local`:**

```bash
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# cole em SESSION_SECRET · deixe AUREA_STORE_KEY comentada
```

---

## No agente

```bash
claude
```

Primeiros dois pedidos, sempre:

1. `Rode git log --oneline -10 e me diga em 3 linhas o que mudou desde <hash>.`
2. `Sem editar nada: descreva o plano para <tarefa>. Que arquivos, em que ordem, o que pode quebrar.`

Uma tarefa por sessão → `/commit` → `/clear` → próxima.

---

## Fechamento

```
/commit
/publicar        ← só se for para main
```

Confira o deploy: vercel.com → Deployments.
Quebrou? Deployments → deploy anterior → `⋯` → **Promote to Production**.

---

## Nunca

- Commitar `.env.local`, token, senha, credencial
- Mexer na **superfície protegida** sem falar com os sócios: `src/domain/constants.ts`,
  `fees.ts`, `market.ts`, `types.ts`, o contrato de `src/server/store/types.ts` e as Server
  Actions. Fora daí, é desenvolvimento normal
- Acrescentar item à lista de divergências do README — ela está encerrada desde 28/08/2026
- Importar `@/server/*` de Client Component
- Sugerir blockchain, NFT on-chain ou tokenização
- Escrever lógica de imposto antes do contador definir o regime
- Inventar logo — são as duas em `/brand/`
- Anéis olímpicos em arte de moeda

---

## Se travar

| Sintoma | Causa provável |
|---|---|
| Erro de tipo em arquivo que não toquei | Pulou o `npm install` do passo 3 |
| `npm install` falha com 403 | CDN da SheetJS fora do ar ou bloqueado — ver CD-05 |
| Toda rota dá 404 na Vercel | Framework Preset não está em Next.js |
| Mercado muda sozinho entre cliques | Sem banco externo — está no store em memória |
| Login não persiste | `SESSION_SECRET` ausente |
