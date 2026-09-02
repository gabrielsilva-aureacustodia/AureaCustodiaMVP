# Contas de teste — Áurea Custódia / Real Olímpico

**Ambiente de demonstração · sem cliente real · sem dinheiro real**

```
Atualizado em: 01/09/2026
Fonte da verdade: src/domain/constants.ts (ACCOUNTS) e src/domain/seed.ts (usersDef)
```

> **Por que este documento existe.** Até 01/09/2026 a tela de login imprimia os sete
> e-mails e a senha comum embaixo do botão "Entrar". Por decisão dos sócios, a lista saiu
> da tela: era conveniente enquanto só os sócios abriam a página, e deixou de ser quando a
> URL passou a ser mostrada a terceiros — a tela entregava credencial funcional a quem
> apenas passasse os olhos.
>
> As credenciais continuam válidas. O que mudou é que elas não são mais anunciadas.

---

## As sete contas

Todas usam a **mesma senha: `12345678`**.

| E-mail | Nome | Saldo inicial | Moedas | Entrada em custódia |
|---|---|---|---|---|
| `rogeriopena@testeaurea.com.br` | Rogério Pena | R$ 62.000,00 | 15 | 18/06/2026 |
| `gabrielsilva@testeaurea.com.br` | Gabriel Silva | R$ 54.000,00 | 13 | 20/06/2026 |
| `alex@testeaurea.com.br` | Alex | R$ 38.000,00 | 9 | 22/06/2026 |
| `pegge@testeaurea.com.br` | Pegge | R$ 41.000,00 | 10 | 22/06/2026 |
| `rozane@testeaurea.com.br` | Rozane | R$ 35.500,00 | 8 | 23/06/2026 |
| `goturuba@testeaurea.com.br` | Goturuba | R$ 97.000,00 | 21 | 18/06/2026 |
| `solares@testeaurea.com.br` | Solares | R$ 44.000,00 | 11 | 24/06/2026 |

### O que cada conta recebe no seed

O **saldo** e a **contagem de moedas** da tabela acima são fixos — estão escritos em
`usersDef`, dentro de `seedState()`. O **conteúdo do acervo** é sorteado a cada semeadura,
dentro destas regras:

- **1 a 3 Moedas dos Direitos Humanos** (R$ 1, 1998), recortadas do total da conta — não
  somadas a ele, para a faixa da taxa de custódia anual não mudar.
- **Ao menos 1 Entrega da Bandeira Olímpica**, e cerca de 72% do restante também é dela —
  é o que garante liquidez para o marketplace funcionar na demonstração.
- O resto são moedas olímpicas de 2016 **não negociáveis**, só variedade visual.

Valores estimados por tipo: Bandeira entre R$ 235 e R$ 300; Direitos Humanos entre R$ 380
e R$ 520; demais tipos entre R$ 140 e R$ 360. Sempre múltiplos de R$ 5,00.

---

## Como trocar a senha de uma conta

A senha efetiva de um usuário é `user.pass` quando existe, e a de `ACCOUNTS` quando não —
mesma regra do login e da troca de senha. Trocar pela interface (Minha conta → Segurança)
grava em `user.pass` e passa a valer no próximo acesso.

**Atenção:** a troca é gravada no estado persistido. Ela **se perde** quando a chave
`AUREA_STORE_KEY` é rotacionada (o banco recomeça do seed) — o que acontece a cada mudança
de formato de `AppState`.

---

## Dívidas conhecidas destas contas

Nenhuma é bug a "consertar" sem combinar; todas estão registradas no `CLAUDE.md`.

- **As senhas estão em texto puro**, tanto em `ACCOUNTS` quanto em `user.pass`. É dívida
  consciente do MVP. A substituição por Argon2id é o item 1.2 do Bloco 1 de
  `docs/PRE_LANCAMENTO_CLIENTES_REAIS.md`, e provavelmente será resolvida de uma vez pela
  migração para Supabase Auth (frente B).
- **Não há verificação de e-mail nem recuperação de senha.** Os domínios
  `@testeaurea.com.br` são fictícios e não recebem mensagem.
- **Estas sete contas não sobrevivem à migração para Supabase Auth** sem uma decisão:
  migrá-las conscientemente ou recriá-las. Está no critério de aceite da frente B.

---

## Onde os dados vivem no código

| O quê | Arquivo | Símbolo |
|---|---|---|
| E-mail, nome e senha padrão | `src/domain/constants.ts` | `ACCOUNTS` |
| Saldo, contagem de moedas e data de entrada | `src/domain/seed.ts` | `usersDef` dentro de `seedState()` |
| Regra de composição do acervo | `src/domain/seed.ts` | `mkCoinsForUser()` |
| Faixas de valor por tipo | `src/domain/constants.ts` | `FAIXA_VALOR` |

Os invariantes desta página são cobertos por teste em `src/domain/seed.test.ts` — inclusive
a contagem de moedas por conta e a faixa de valor das Direitos Humanos.
