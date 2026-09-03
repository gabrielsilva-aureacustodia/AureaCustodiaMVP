# Atalhos assumidos nesta pasta

> Notas locais dos atalhos de teste e segurança tomados em `src/server/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../RISCOS_ASSUMIDOS.md).

---

## RA-04 🟠 — esta pasta não tem teste automatizado (exceto `db/`, desde 02/09/2026)

**Alcance:** `state.ts`, `session.ts`, `actions/*`, `store/*`

**Atualização de 02/09/2026:** `db/` nasceu com 31 testes, 15 deles contra um Postgres real
embutido — a primeira cobertura de `src/server/`. O truque foi deixar o `server-only` só em
`db/client.ts` e parametrizar o resto pelo `Executor`. O mesmo desenho serve para pagar o
restante: as Server Actions poderiam receber o executor por parâmetro e rodar na mesma suíte.

Os 38 testes do domínio cobrem `src/domain/` — a regra de negócio pura. **Fora de `db/`, nada
em `src/server/` é exercitado automaticamente.**

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

---

## RA-15 🔴 — `actions/signup.ts`, o cadastro simulado (03/09/2026)

Cria conta com dados fictícios e abre a sessão, sem verificação de e-mail e sem aceite de
termos. A senha é gravada em texto puro, como no resto do MVP (RA-02).

É arquivo NOVO em vez de um trecho dentro de `actions/auth.ts` porque a frente A reescreveu
`auth.ts` inteiro: separado, ele some com um `git rm` no dia do merge, sem conflito.

**Como se paga:** apagar o arquivo junto com `src/app/criar-conta/` e `src/app/entrar-demo/`
quando a frente A entrar. Ver RA-15 em `RISCOS_ASSUMIDOS.md`.
