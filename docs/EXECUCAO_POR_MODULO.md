# Execução por módulo — o passo a passo técnico de cada fase

```
Escrito em: 02/09/2026
Base:       docs/DECISOES_D1_D9_E_PLANO.md (ata das decisões D1–D9)
Modelo:     saldo interno (D9 revertido em 02/09) · Supabase · Mercado Pago · Correios direto
```

> **Como usar.** Cada módulo abaixo é **uma sessão de trabalho dedicada**, com um chat
> próprio. Traz o objetivo, os arquivos que nascem e que mudam, a ordem dos passos, o
> critério de aceite e o que **não** fazer.
>
> A regra da casa: `npm run typecheck`, `npm test` e `npm run build` verdes ao fim de cada
> módulo. Atalho tomado vai para [`RISCOS_ASSUMIDOS.md`](../RISCOS_ASSUMIDOS.md) **e** para
> o `ATALHOS.md` da pasta afetada, no mesmo commit.

## Ordem e dependências

```
M1 Fundação Supabase ──┬─→ M2 Auth ──→ M3 Landing e cadastro
                       │
                       ├─→ M4 Ledger ──→ M5 Mercado Pago
                       │
                       └─→ M6 Correios          (paralelizável com M4/M5)
                                                 M7 DRE depende de M4
```

**M1 bloqueia tudo.** M2 e M6 podem correr em paralelo depois dele. **M5 exige M4** (não se
mexe em dinheiro real sem ledger) e o parecer jurídico do RA-01.

---

# M1 — Fundação Supabase

**Objetivo:** o estado sai do blob JSON único e vira tabelas, **sem perder os 38 testes**.

**Pré-requisito do Gabriel:** projeto Supabase criado em **São Paulo**, com
`POSTGRES_URL` (pooler, 6543) e `POSTGRES_URL_DIRECT` (direta, 5432) na Vercel. Ver
[`SETUP_SUPABASE_PASSO_A_PASSO.md`](SETUP_SUPABASE_PASSO_A_PASSO.md).

**Duas decisões técnicas já tomadas:**

- **Schema `aurea`, não `public`.** O Supabase publica automaticamente uma API na internet
  para o schema `public`, acessível pela chave `anon` — que é pública por design e ficaria
  visível no repositório aberto. Tabelas em `aurea` não entram nessa API; a aplicação fala
  por conexão direta, que a ignora.
- **`pg` com prepared statements desligados.** O pooler em modo transação não aceita
  statements nomeados. Configurar isso é do M1, não do Gabriel.

### Arquivos que nascem

> ✅ **Entregue em 02–03/09/2026** na branch `feat/banco-supabase`. O bloco abaixo é o que
> foi realmente construído; o plano original previa um `schema.sql` separado, que não
> existe — **a migration é o schema**, e duplicá-la só criaria duas verdades.

```
src/server/db/
├── README.md                 obrigatório (regra da casa)
├── ATALHOS.md                os cinco atalhos do M1 (RA-13)
├── client.ts                 pool pg, server-only — a única porta da credencial
├── sql.ts                    Consulta, Executor, nomeDoSchema(), num()
├── estado.ts                 lerEstado / mutarEstado
├── diff.ts                   planejador puro: dois AppState → operações
├── migrar.ts                 aplicador usado pelos testes
├── diff.test.ts              16 testes, sem banco
├── db.test.ts                15 testes contra Postgres embutido (PGlite)
├── migrations/
│   ├── README.md
│   └── 001_inicial.sql       o schema versionado
└── repositories/
    ├── README.md
    ├── users.ts
    ├── coins.ts              coins + nfts
    ├── offers.ts             sell_offers + buy_orders
    ├── trades.ts             append-only
    ├── envios.ts
    ├── account.ts            deposits + custody_charges   (a mais que o plano)
    ├── seq.ts                contadores E a trava         (a mais que o plano)
    └── state.ts              monta o AppState e grava o diff

scripts/
├── README.md
├── env-local.mjs             acha o .env.local, inclusive em git worktree
├── db-migrate.mjs            npm run db:migrate
└── db-check.mjs              npm run db:check — diagnóstico somente leitura
```

### Arquivos que mudam

| Arquivo | O que muda |
|---|---|
| `src/server/state.ts` | `getState`/`mutateState` passam a falar com os repositórios quando há `POSTGRES_URL` — **assinatura preservada** |
| `src/domain/types.ts` | `Trade.fee?` — a comissão congelada na gravação |
| `src/server/actions/*` | **Nada.** O plano previa abrir transação aqui; não foi preciso, porque a transação vive dentro de `mutateState`. Melhor que o previsto: zero risco na superfície protegida |
| `src/server/store/*` | **Fica de pé até M1 terminar.** Só então é removido (passo 9) |

### O schema mínimo

| Tabela | Chave | Observação |
|---|---|---|
| `users` | `email` | Migra para `id` UUID no M2 |
| `coins` | `id` (`RO-000042`) | FK para `users` |
| `nfts` | `codigo` | 1:1 com `coins` |
| `sell_offers` | `id` | Índice em `(tipo_moeda, price, created_at)` |
| `buy_orders` | `id` | Mesmo índice |
| `trades` | `id` serial | **Acrescentar `fee bigint`** — paga o RA-06 |
| `deposits` | `id` serial | |
| `envios` | `protocolo` | |
| `custody_charges` | `user_email` | |
| `seq` | — | Sequência do Postgres para `RO-` e `RO-ENV-` |

**Dinheiro é `bigint` em centavos.** Nunca `numeric`, nunca `float`, venha de onde vier.

### A parte que exige cuidado: o motor

**Não traduzir `matchOrders` para SQL.** O padrão é:

```typescript
await db.transaction(async (tx) => {
  // 1. carrega SÓ o livro do tipo, travando as linhas
  const parcial = await carregarLivroParaMotor(tx, tipoMoeda)
  // 2. roda a função pura, sem alterar uma linha dela
  const resultado = matchOrders(parcial)
  // 3. persiste o diff
  await persistirResultado(tx, parcial, resultado)
})
```

### Ordem dos passos

1. Schema e migration inicial; aplicar no Supabase
2. `client.ts` com `import 'server-only'` na primeira linha
3. Repositórios de leitura, um por vez, com teste de integração junto
4. `carregarLivroParaMotor` + `persistirResultado` — **o passo mais delicado**
5. `state.ts` apontando para os repositórios
6. Server Actions, uma por vez, rodando `npm test` entre cada
7. Os ~30 pontos de leitura em telas e seletores
8. Semear as 7 contas no banco novo
9. **Só então** remover `src/server/store/`

### Critério de aceite

- [ ] **Os 38 testes atuais passam sem alteração** — é o mais importante
- [ ] Duas compras simultâneas da mesma oferta: uma vence, a outra recebe recusa clara
- [ ] Dois envios simultâneos não geram o mesmo `RO-`
- [ ] O ambiente sobe do zero com o seed
- [ ] `npm run build` verde

### O que NÃO fazer

- ❌ Reescrever o motor em SQL
- ❌ Remover `src/server/store/` antes do passo 9
- ❌ `float` para dinheiro, em qualquer ponto
- ❌ Importar `@/server/db/*` de Client Component

---

# M2 — Autenticação com Supabase Auth

**Objetivo:** login com Google e por e-mail verificado. **Paga o RA-02** (senhas em texto
puro).

**Pré-requisito do Gabriel:** Google Cloud com OAuth configurado, provedor habilitado no
Supabase.

### Arquivos

| Nasce | Muda | Some |
|---|---|---|
| `src/server/auth/` (+ README) | `src/server/session.ts` | `ACCOUNTS` em `constants.ts` |
| `src/app/cadastrar/` | `src/server/actions/auth.ts` | `user.pass` em `types.ts` |
| | `(app)/layout.tsx` | |

### Decisão pendente

⚪ **As 7 contas de teste migram ou são recriadas?** Elas têm e-mail fictício que não recebe
mensagem, o que impede verificação. Recriar é mais limpo; migrar preserva o histórico de
negociações já semeado.

**Recomendação:** recriar com e-mails reais dos sócios, e semear o histórico apontando para
os novos ids.

### Critério de aceite

- [ ] Cadastro por Google funciona ponta a ponta e cria usuário no banco
- [ ] Cadastro por e-mail exige verificação antes de liberar operação
- [ ] **Nenhuma senha em texto puro** no banco ou no código
- [ ] Sessão sobrevive a recarregar a página
- [ ] `RISCOS_ASSUMIDOS.md`: **RA-02 marcado como pago**

---

# M3 — Landing page e cadastro

**Objetivo:** uma página pública explicando a Áurea, com "Criar conta" e "Entrar".

**Depende de M2** para o cadastro funcionar. A página em si pode vir antes.

### A mudança de rotas — o ponto que derruba o site se feito errado

```
/            login  →  landing (nova, pública)
/entrar      —      →  o login de hoje
/cadastrar   —      →  cadastro (novo)
```

> ⚠️ **`(app)/layout.tsx` redireciona quem não tem sessão para `/`, e `page.tsx`
> redireciona quem tem sessão para `/inicio`.** Os dois precisam apontar para `/entrar`
> **no mesmo commit** que move o login. Fazer em commits separados deixa o usuário
> deslogado caindo na landing em laço.

### Arquivos

| Nasce | Muda |
|---|---|
| `src/app/entrar/page.tsx` (move de `page.tsx`) | `src/app/page.tsx` → landing |
| `src/app/cadastrar/page.tsx` | `src/app/(app)/layout.tsx` (redirect) |
| `src/components/landing/` (+ README) | `src/components/shell/Topbar.tsx` (títulos) |
| `src/styles/landing.css` | `src/app/globals.css` (import **antes** de `responsive`) |

### O que a landing precisa ter

Uma página só, deliberadamente simples:

- Logo, nome e uma frase do que é a Áurea Custódia
- Três ou quatro blocos: custódia física → recibo digital → marketplace
- **Dois botões: "Criar conta" e "Entrar"**
- Rodapé com CNPJ e links legais

### 🔴 O bloqueio que não é técnico

**RA-03:** não há termos de uso nem política de privacidade. Cadastrar usuário é coletar
dado pessoal.

**A landing pode ser construída. O cadastro não pode ser aberto ao público** antes dos dois
documentos existirem, com aceite versionado no ato do cadastro.

### O que falta do Gabriel para a copy

| Falta | Por quê |
|---|---|
| ✅ **Seguro: confirmado em 02/09.** Falta seguradora e valores | A copy pode afirmar que o acervo é segurado; **sem citar seguradora, cobertura ou percentual** até a apólice existir |
| Texto institucional oficial | O que eu escrever é rascunho, não a voz da marca |
| Fotos do cofre | Página de custódia sem imagem do lugar convence menos |
| Endereço e canal de atendimento | Rodapé de plataforma financeira costuma exigir |

### Critério de aceite

- [ ] `/` responde 200 sem sessão e mostra a landing
- [ ] Deslogado em rota protegida vai para `/entrar`, **sem laço**
- [ ] Logado em `/` ou `/entrar` vai para `/inicio`
- [ ] Layout íntegro abaixo de 560px
- [ ] Alvo de toque ≥ 44px nos dois botões

---

# M4 — Ledger financeiro e trilha de auditoria

**Objetivo:** toda movimentação de dinheiro vira lançamento imutável. **Paga o RA-06.**

**Depende de M1.** **Bloqueia M5** — não se liga gateway sem ledger.

### Arquivos

```
src/domain/ledger.ts          regra pura: tipos de lançamento, saldo por soma
src/domain/ledger.test.ts     obrigatório
src/domain/hash.ts            SHA-256 determinístico e encadeado — paga o RA-05
src/domain/hash.test.ts       obrigatório
src/server/db/repositories/ledger.ts
```

### O ledger

**Append-only: nunca se altera linha; corrige-se com lançamento inverso.** Registro
alterável não vale como prova.

Campos: `id`, `created_at`, `user_id`, `tipo` (depósito, saque, compra, venda, comissão,
custódia, estorno), `valor_centavos`, `sinal`, `saldo_apos`, `ref_externa` (id no gateway),
`ref_interna` (id da negociação), `metadata`, `hash_anterior`, `hash`.

### O hash encadeado

Cada lançamento incorpora o hash do anterior. Alterar um registro antigo quebra todos os
posteriores, e a adulteração fica detectável sem terceiro.

**A composição precisa ser documentada e congelada** — quais campos, em que ordem, com que
separador e normalização. Um espaço a mais muda o hash, e hash que não se reproduz não
prova nada.

**Compartilha implementação com a estação de validação** (frente E). Faz-se uma vez.

### Critério de aceite

- [ ] Depósito, compra e venda produzem lançamentos com saldo conferindo
- [ ] **O extrato bate com a soma do ledger, ao centavo**
- [ ] **Alterar `FEE_PCT` não altera lançamento já gravado** — RA-06 pago
- [ ] Adulterar uma linha intermediária quebra a cadeia de forma detectável
- [ ] O mesmo conjunto de dados produz o mesmo hash em máquinas diferentes

---

# M5 — Mercado Pago (depósito e saque reais)

**Objetivo:** o saldo interno passa a ter dinheiro real por trás.

## 🔴 Trava antes de começar

**Este módulo não é ligado em produção sem o parecer jurídico do
[RA-01](../RISCOS_ASSUMIDOS.md#ra-01).** Construir a integração é seguro; ativá-la com
dinheiro real depende da resposta escrita sobre arranjo de pagamento.

**Depende de M1 e M4.**

### Arquivos

```
src/lib/payments/
├── README.md · ATALHOS.md
├── mercadopago.ts            cliente, server-only
├── webhook.ts                verificação de assinatura
└── idempotencia.ts           paga o RA-07

src/app/api/webhooks/mercadopago/route.ts
```

### O fluxo do depósito

```
1. Cliente pede depósito de R$ X
2. Servidor cria cobrança no Mercado Pago → devolve link
3. Cliente paga (Pix, cartão, boleto)
4. Mercado Pago chama o webhook
5. Assinatura verificada → id do evento conferido contra a tabela de idempotência
6. Evento gravado, resposta 200 IMEDIATA
7. Processamento: lançamento no ledger → saldo atualizado
```

**Saldo só se move no passo 7, nunca no retorno da tela.** O cliente pode fechar o
navegador antes do redirecionamento, e isso não pode custar o depósito dele.

### As travas inegociáveis

- ❌ **Nunca receber, trafegar ou guardar número de cartão.** Sempre checkout hospedado ou
  tokenização. Tocar em PAN traz o PCI-DSS inteiro para o escopo
- ❌ Nunca creditar saldo no retorno da tela
- ❌ Nunca chave de API fora de variável de ambiente do servidor
- ❌ Nunca `float` para dinheiro, mesmo que a API devolva decimal
- ✅ **Idempotência obrigatória** — RA-07. Todo gateway reenvia webhook
- ✅ **Fila, não processamento síncrono.** Grava, responde 200, processa depois

### Critério de aceite

- [ ] Pix, crédito e boleto completam ponta a ponta **em sandbox**
- [ ] **Webhook reenviado três vezes credita uma vez** — RA-07 pago
- [ ] Webhook com assinatura inválida é rejeitado e registrado
- [ ] Saque reflete no ledger e no extrato
- [ ] **Nenhum dado de cartão passa pelo servidor da Áurea**
- [ ] Relatório de conciliação bate gateway com ledger num período

---

# M6 — Correios

**Objetivo:** etiqueta e rastreio com a API oficial. **Paralelizável com M4 e M5.**

### As três restrições que viram código

```typescript
// src/lib/shipping/types.ts
export type ModalidadeEnvio = 'PAC' | 'SEDEX'
// Carta comum NÃO é representável de propósito: o regimento dos Correios
// permite confisco de dinheiro circulável enviado em carta, e moeda
// comemorativa é dinheiro circulável.
```

1. **Declarar como moeda colecionável** no objeto postal
2. **PAC ou SEDEX**
3. **Nunca carta comum** — trava de tipo, não aviso na tela

### Rastreio

**Por agendamento (cron da Vercel), nunca por carregamento de página.** Consultar a API a
cada visita gera custo, esbarra em limite de requisição e deixa a tela lenta. O job grava o
último estado no banco; a tela lê do banco.

### ⚠️ Cuidado com o CEP

Consultar CEP para sugerir agência é **tratamento de dado pessoal**. Consulte, mostre,
**não guarde o histórico** — a LGPD pede finalidade declarada.

### Critério de aceite

- [ ] Solicitação gera código e instruções na tela e por e-mail
- [ ] **Carta comum não é selecionável em lugar nenhum** — nem por requisição forjada
- [ ] O objeto sai declarado como moeda colecionável
- [ ] Rastreio atualiza por job agendado
- [ ] Nenhum CEP consultado é guardado

---

# M7 — DRE sob Lucro Presumido

**Objetivo:** estrutura contábil e exportação. **Depende de M4.**

### ⚠️ Estrutura sim, alíquotas não

Mesmo com o regime decidido (**Lucro Presumido**, D8), **nenhuma alíquota entra fixa no
código**. A alíquota efetiva depende de faturamento e muda por lei; alíquota errada em
produção gera passivo fiscal retroativo que só aparece na fiscalização, anos depois.

Deixe as linhas de imposto como **configuração externa**, com o cálculo pronto e o valor
vindo de fora.

### Critério de aceite

- [ ] Receita de comissão e de custódia saem do ledger, não de recálculo
- [ ] **Nenhuma alíquota fixa no código**
- [ ] Exporta em XLSX reaproveitando `src/lib/export/`

---

## Resumo dos riscos pagos por módulo

| Módulo | Paga |
|---|---|
| M1 | RA-08 (concorrência) · começa RA-04 (teste de servidor) |
| M2 | **RA-02** (senhas em texto puro) |
| M3 | Exige **RA-03** resolvido antes de abrir cadastro |
| M4 | **RA-05** (hash simulado) · **RA-06** (comissão congelada) |
| M5 | **RA-07** (idempotência) · exige **RA-01** resolvido antes de ativar |
| M6, M7 | — |
