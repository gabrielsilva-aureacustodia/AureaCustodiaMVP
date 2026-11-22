# Ferramentas de teste do painel (Frente 5)

Para ver e clicar o painel **sem tocar o banco de produção** nem Correios, Mercado Pago e Sefin — o `.env.local` das
worktrees aponta para o Supabase de produção e tem as credenciais reais (ver `../MD_EXECUCAO.md`, S1).

| Arquivo | Faz |
|---|---|
| `dev-sem-banco.mjs` | Sobe `next dev` na porta 3105 com `POSTGRES_URL*`, `SUPABASE_*`, `MP_*`, `CORREIOS_*`, `NFSE_*`, `KV_*` e `UPSTASH_*` **vazios** no processo (o `.env.local` não sobrescreve), `SESSION_SECRET` de teste e `AUREA_ADMIN_EMAILS=gabrielsilva@testeaurea.com.br` |
| `cookie.mjs` | Gera o valor do cookie `aurea_session` assinado com o segredo de teste: `node cookie.mjs <email>` |
| `gerar-estado-demo.test.ts` + `vitest.demo.mts` | Gera um `AppState` de demonstração: o `seedState()` do projeto (7 contas, acervo, negociações) + 4 saques em situações diferentes |
| `preload-estado-demo.mjs` | Com `DEMO_ESTADO=<json>`, o lançador põe esse estado no store em memória antes do Next subir |

```bash
DEMO_SAIDA=/tmp/estado-demo.json npx vitest run --config docs/polimento/admin/ferramentas/vitest.demo.mts
```

```bash
DEMO_ESTADO=/tmp/estado-demo.json node docs/polimento/admin/ferramentas/dev-sem-banco.mjs
```

Abra **`http://127.0.0.1:3105/painel`** (não `localhost`: outro app em outra porta de `localhost` sobrescreve o cookie de
sessão), grave no console `document.cookie = "aurea_session=<valor do cookie.mjs>; path=/"` e vá para `/admin`.
Uma conta do seed fora da lista (ex.: `alex@testeaurea.com.br`) serve para conferir que `/admin/*` manda para `/painel`.

Limites: sem banco não há ledger (DRE e gráfico zerados), trilha, papéis, NFS-e, CS nem tabelas de configuração — essas
telas aparecem no estado "sem banco". O `vitest.demo.mts` não entra na suíte (`vitest.config.mts` só inclui `src/**`).
