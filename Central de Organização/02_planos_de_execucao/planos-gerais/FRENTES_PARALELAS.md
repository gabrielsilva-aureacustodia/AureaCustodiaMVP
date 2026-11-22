# Frentes paralelas — o contrato entre os três agentes

**Quem é dono de quê, o que espera o quê, e a regra que evita conflito**

```
Escrito em: 02/09/2026
Vale para:  as três frentes abertas simultaneamente
```

> **Leia isto antes de abrir qualquer uma das frentes.** Três agentes no mesmo repositório
> ao mesmo tempo só funciona com fronteira escrita. Sem isso, dois deles reescrevem o mesmo
> arquivo e o merge vira o momento mais caro do projeto.

---

# O problema que este documento resolve

As três frentes **não são naturalmente independentes**:

- A frente de **login** precisa de tabela de usuário, que a frente de **banco** ainda não criou
- A frente de **pagamento** mexe em saldo, que vive no estado que a frente de **banco** está migrando
- Todas as três tocam `src/server/`

Deixadas soltas, uma bloqueia a outra ou as três colidem.

## A saída: uma fachada que não muda

**A frente B (banco) fica obrigada a preservar a assinatura de `getState()` e
`mutateState()`.** A migração para Supabase acontece **dentro** dessas funções; quem chama
não percebe diferença.

```typescript
// Este contrato NÃO MUDA. É o que desacopla as três frentes.
export async function getState(): Promise<AppState>
export async function mutateState<T>(
  fn: (state: AppState) => T | Promise<T>
): Promise<{ state: AppState; result: T }>
```

Com isso:

- **A** escreve `auth.ts` chamando `mutateState` como sempre — funciona antes e depois da migração
- **C** escreve a integração de depósito chamando `mutateState` — idem
- **B** troca o motor por baixo sem quebrar ninguém

**É também a decisão mais segura tecnicamente**: preserva os 38 testes e toda a superfície de
chamada. A transação com `SELECT … FOR UPDATE` acontece dentro de `mutateState`, que é
exatamente onde ela já acontece hoje no adaptador Postgres.

---

# Quem é dono de quê

**Regra absoluta: nenhum agente edita arquivo que não está na sua coluna.** Precisando de
mudança em arquivo alheio, **pare e peça ao Gabriel** — ele coordena.

## 🅰️ Frente A — Login, cadastro e landing page

**Branch:** `feat/auth-landing`

| Pasta / arquivo | Observação |
|---|---|
| `src/app/page.tsx` | Vira a landing |
| `src/app/entrar/` | Login movido para cá |
| `src/app/cadastrar/` | Novo |
| `src/app/(app)/layout.tsx` | **Só a linha do redirect** para `/entrar` |
| `src/components/landing/` | Novo |
| `src/components/login/` | Existente |
| `src/styles/landing.css` | Novo |
| `src/app/globals.css` | **Só o import** de `landing.css` |
| `src/server/auth/` | Novo |
| `src/server/session.ts` | Existente |
| `src/server/actions/auth.ts` | Existente |
| `src/components/shell/Topbar.tsx` | **Só os títulos** das rotas novas |

## 🅱️ Frente B — Banco de dados e backend

**Branch:** `feat/banco-supabase`

| Pasta / arquivo | Observação |
|---|---|
| `src/server/db/` | Novo — schema, migrations, repositórios |
| `src/server/state.ts` | **Assinatura preservada** |
| `src/server/store/` | Removido só no fim |
| `src/server/actions/market.ts` | |
| `src/server/actions/sell.ts` | |
| `src/server/actions/custody.ts` | |
| `src/server/actions/account.ts` | ⚠️ **Coordenar com C** — ver abaixo |
| `src/domain/types.ts` | ⚠️ **Único dono.** A e C pedem mudança, não fazem |
| `src/domain/seed.ts` | Semear no banco novo |

**Não toca:** `src/server/actions/auth.ts`, `src/server/session.ts` — são da frente A.

## 🅲 Frente C — Mercado Pago e Correios

**Branch:** `feat/pagamentos-correios`

| Pasta / arquivo | Observação |
|---|---|
| `src/lib/payments/` | Novo — Mercado Pago |
| `src/lib/shipping/` | Novo — Correios |
| `src/app/api/webhooks/` | Novo |
| `src/domain/payments.ts` | Novo — regra pura, se necessário |
| `src/app/(app)/envios/` | Telas de envio |

**A ligação com `account.ts` (depósito) e `custody.ts` (envios) espera a frente B terminar.**
Até lá, C entrega as bibliotecas prontas e testadas com mocks.

---

# Arquivos compartilhados — a regra de cada um

| Arquivo | Regra |
|---|---|
| `src/domain/types.ts` | **Só B edita.** A e C pedem ao Gabriel |
| `package.json` | Todos podem acrescentar dependência. Conflito de merge é trivial |
| `RISCOS_ASSUMIDOS.md` | Cada um acrescenta **sua própria seção RA-xx**, sem editar as alheias |
| `docs/CATALOGO_DE_FEATURES.md` | Cada um marca **só a sua feature** |
| `CLAUDE.md`, `docs/ARQUITETURA_E_PASTAS.md` | **Ninguém edita sem falar com o Gabriel** |

---

# Ordem de merge

```
1º  B (banco)        ← a fundação. Merge primeiro, sempre
2º  A (auth+landing) ← rebase sobre B, depois merge
3º  C (pagamentos)   ← rebase sobre B, depois merge
```

**Por que B primeiro:** as outras duas assumem que `mutateState` já fala com o Supabase.
Mergear A ou C antes deixaria o `main` num estado em que o login novo grava no Redis e o
resto no Postgres.

**Antes de cada merge:** `npm run typecheck`, `npm test`, `npm run build` verdes na branch.

---

# O que cada frente pode fazer HOJE, sem esperar ninguém

| Frente | Pode começar já | Espera B |
|---|---|---|
| **A** | ✅ A landing inteira — é página estática, zero dependência de banco | O cadastro funcional (precisa de tabela de usuário) |
| **B** | ✅ Tudo. É a fundação | — |
| **C** | ✅ As duas bibliotecas (`payments`, `shipping`), testadas com mocks | A ligação com as Server Actions |

**Nenhuma das três fica parada esperando.** O que espera é a *ligação* final, não a
construção.

---

# Travas que valem para as três

## 🔴 Antes de ligar dinheiro real (frente C)

**RA-01** em `RISCOS_ASSUMIDOS.md`: a Áurea vai receber depósitos, guardar o dinheiro e
depois distribuir. Isso pode configurar arranjo ou conta de pagamento sob regulação do Banco
Central, e **depende de parecer jurídico escrito**.

**Construir a integração é seguro. Ativá-la em produção com dinheiro real, não.** A frente C
trabalha em sandbox até o parecer chegar.

## 🔴 Antes de abrir cadastro ao público (frente A)

**RA-03**: não existem termos de uso nem política de privacidade. Cadastrar usuário é coletar
dado pessoal.

**A landing pode ir ao ar. O cadastro fica fechado** até os dois documentos existirem, com
aceite versionado no ato do cadastro.

## Sempre

- **Todo atalho vai para dois lugares** — `RISCOS_ASSUMIDOS.md` na raiz **e** o `ATALHOS.md`
  da pasta, no mesmo commit
- **Toda pasta nova nasce com `README.md`**
- **O repositório está público de propósito.** Nenhuma senha, token ou credencial em commit
- **Dinheiro é `Cents` inteiro.** Nunca `float`, venha de onde vier
- **Nada de `@/server/*` em Client Component** — o `server-only` quebra o build
- Antes de commitar: `npm run typecheck`, `npm test`, `npm run build`
