# Atalhos assumidos nesta pasta

> Notas locais dos atalhos de teste e segurança tomados em `src/server/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../RISCOS_ASSUMIDOS.md).

---

## RA-04 🟠 — esta pasta inteira não tem teste automatizado

**Alcance:** `state.ts`, `session.ts`, `actions/*`, `store/*`

Os 38 testes do projeto cobrem `src/domain/` — a regra de negócio pura. **Nada em
`src/server/` é exercitado automaticamente.**

**Por que ficou assim, e é uma razão concreta:** o `import 'server-only'` que fecha a
barreira entre servidor e cliente **impede importar estes módulos numa suíte Node comum** —
o pacote resolve apenas no ambiente de servidor do Next. Testar de verdade exige teste de
integração com banco, que é trabalho de outra ordem.

Ou seja: a proteção que ganhamos no CD-04 custou a testabilidade desta pasta. Foi uma troca
consciente — a barreira previne vazamento de credencial, que é pior que a falta de teste.

**O que fica descoberto:**

| Módulo | O que não é verificado |
|---|---|
| `state.ts` | O ciclo carregar → mutar → salvar, e o descarte de ordens sem `tipoMoeda` |
| `session.ts` | Assinatura e verificação do cookie, expiração, o `throw` em produção |
| `actions/*` | A ordem das conferências e as travas de dono, tipo e saldo |
| `store/*` | Que os três adaptadores se comportam igual sob o mesmo contrato |

**Como se paga:** teste de integração contra o Supabase, na Fase 1. Com banco real, dá para
subir um container, semear e exercitar as ações ponta a ponta.

---

## O que NÃO é atalho nesta pasta

- **`DEV_SECRET` fixo em `session.ts`** é deliberado: se fosse aleatório por processo, todo
  reinício do `next dev` deslogaria quem estivesse testando. Em produção a ausência de
  `SESSION_SECRET` **derruba a requisição**, não degrada.
- **`garantirFormato()` descartar ordens sem `tipoMoeda`** é proteção, não dívida.
