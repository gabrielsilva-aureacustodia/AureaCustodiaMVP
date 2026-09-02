# `src/server/` — o que só roda no servidor

Sessão, persistência e o ponto único por onde toda escrita de estado passa.

## A barreira

Todo módulo desta pasta abre com `import 'server-only'`. **Não é convenção: é o
compilador.** Um `import` a partir de um Client Component quebra o build com mensagem
apontando o arquivo culpado.

Antes de 01/09/2026 a barreira era um comentário em maiúsculas no topo do arquivo — e
comentário não impede nada. O que mudou está no item CD-04 de
[`docs/diario/CRITICAL_DEBUGS.md`](../../docs/diario/CRITICAL_DEBUGS.md).

**Por que isso importa:** um único `import { getState } from '@/server/state'` dentro de um
componente `'use client'` arrastaria para o bundle do navegador o adaptador Postgres, a
leitura de `process.env` e o `SESSION_SECRET`. Sem erro: o build passaria, a página
carregaria, e as credenciais ficariam legíveis em "ver código-fonte".

## Arquivos

| Arquivo | O que faz | Protegido |
|---|---|---|
| `state.ts` | `getState()` e `mutateState()` — **o ponto único de escrita** | |
| `session.ts` | Cookie `httpOnly` assinado com HMAC-SHA256 | |
| `actions/` | As Server Actions. Ver [README próprio](actions/README.md) | ⚠️ |
| `db/` | **O estado em tabelas** (Supabase Postgres, schema `aurea`). Ativo com `POSTGRES_URL`. Ver [README próprio](db/README.md) | ⚠️ |
| `store/` | O blob JSON antigo — ativo **sem** `POSTGRES_URL` (Redis/memória). Sai no fim do M1. Ver [README próprio](store/README.md) | ⚠️ |

## `state.ts` — o coração da escrita

**Toda mutação de estado passa por `mutateState()`.** A função recebe um callback que pode
mutar o estado no lugar; a gravação acontece quando ele retorna. Com `POSTGRES_URL`, o ciclo
inteiro roda dentro de uma transação com trava (`db/`); sem ela, no blob (`store/`).

**A assinatura de `getState()` e `mutateState()` está congelada** — é o contrato de
`docs/FRENTES_PARALELAS.md` que permite às frentes A e C escreverem código enquanto o motor
por baixo muda. Desde 02/09/2026 há dois motores atrás da mesma fachada, escolhidos por
variável de ambiente; os chamadores não percebem diferença.

```typescript
const { result } = await mutateState((state) => {
  // regra de negócio aqui, com o estado do SERVIDOR
  return { ok: true, message: '...' }
})
```

`garantirFormato()` normaliza documentos gravados por formato anterior: preenche `deposits`
e **descarta ordens sem `tipoMoeda`**. Sem esse descarte, duas ordens antigas casariam
entre si — `undefined === undefined` é verdadeiro — e os mercados voltariam a se misturar
sem erro e sem aviso.

## `session.ts` — a sessão

O cookie carrega o e-mail e um HMAC-SHA256. Quem conhece o segredo forja a sessão de
qualquer usuário, então:

- Em **produção**, faltar `SESSION_SECRET` **derruba a requisição** com erro explícito. O
  `throw` fica dentro da função, não no topo do módulo: em tempo de import ele quebraria
  também o `next build`, que roda com `NODE_ENV=production` e sem variáveis de runtime.
- Em **desenvolvimento**, cai no `DEV_SECRET` com aviso no log. É fixo de propósito — se
  fosse aleatório por processo, todo reinício do `next dev` deslogaria quem estivesse
  testando.

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `state.ts` | Toda escrita da plataforma. É o arquivo mais central do servidor |
| `session.ts` | Login, logout e todo guarda de rota. Trocar o segredo invalida as sessões abertas |
| `store/types.ts` | O contrato dos três adaptadores — mudar um sem os outros cria divergência silenciosa entre bancos |
| Assinatura de uma Server Action | A tela que a chama, em tempo de compilação |

## Quem depende desta pasta

- `src/app/(app)/layout.tsx` e as páginas server-side chamam `getState()`
- `src/app/api/state/route.ts` serve o polling de 10 segundos
- Os **Client Components chamam Server Actions** — e só elas. É o único contrato de escrita
  entre a UI e o servidor

## Cobertura de teste

⚠️ **Esta pasta não tem teste automatizado.** O `server-only` impede importá-la numa suíte
Node comum, e testar de verdade exigiria teste de integração com banco. Está registrado
como dívida na seção 8 de
[`docs/MUDANCAS_MERCADO_MULTI_ATIVO.md`](../../docs/MUDANCAS_MERCADO_MULTI_ATIVO.md).

A regra de negócio que essas ações aplicam **está testada** em `src/domain/` — o que falta
é a orquestração.
