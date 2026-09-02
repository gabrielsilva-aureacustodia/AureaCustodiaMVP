# Atalhos assumidos nesta pasta

> Notas locais dos atalhos de teste e segurança tomados em `src/server/actions/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md).

---

## RA-01 🔴 — `deposit()` vai passar a mover dinheiro real, sem parecer jurídico

**Arquivo:** `account.ts`, função `deposit()`

Hoje esta função soma um número ao saldo, com teto de `DEPOSITO_MAX` (R$ 100.000), e **não
há dinheiro real em lugar nenhum**. A modal diz isso em texto.

**O que muda:** por decisão de 02/09/2026, a plataforma vai passar a **receber depósitos de
verdade, guardar o dinheiro na conta da Áurea e depois distribuir ao cliente**. Esta função
é o ponto por onde isso entra.

**O que foi pulado:** o parecer jurídico sobre se guardar e movimentar dinheiro de terceiros
configura arranjo ou conta de pagamento sob regulação do Banco Central. Havia uma saída que
evitava a pergunta — liquidação direta com split no gateway — e ela foi trocada por
velocidade de entrega e por preservar a compra instantânea.

**Trava enquanto o parecer não vem:** construir a integração com o Mercado Pago é seguro.
**Ligá-la em produção com dinheiro real não é.** Não ative sem a resposta escrita.

---

## RA-07 🟠 — `deposit()` não é idempotente

**Arquivo:** `account.ts`, função `deposit()`

Não há chave de idempotência nem limite de frequência. O teto de R$ 100.000 é **por
operação**, não por período — nada impede depositar cem vezes seguidas.

A modal desabilita o botão durante o envio, o que cobre o duplo clique do usuário. **Não
cobre requisição repetida.**

**Hoje:** inofensivo, é dinheiro simulado entre sócios.

**Quando o gateway entrar:** grave. Todo gateway reenvia webhook — por timeout, por
retentativa, por falha de rede. Sem idempotência, **o mesmo pagamento credita duas vezes**.

**Como se paga:** tabela de eventos processados, com o id do evento do gateway como chave
única. Evento repetido é descartado antes de qualquer efeito. **Não é opcional na Fase 4.**

---

## RA-02 🔴 — senha comparada em texto puro

**Arquivos:** `auth.ts` (`login`), `account.ts` (`changePassword`)

A comparação é literal: `atual !== senhaEfetiva`. Não há hash em lugar nenhum do caminho.

**Como se paga:** Supabase Auth (Fase 2) tira a senha das mãos da plataforma por completo.

---

## RA-04 🟠 — nenhuma destas ações tem teste

Os 38 testes cobrem `src/domain/`. **As cinco Server Actions não têm nenhum.**

A regra de negócio que elas aplicam está testada; a **orquestração** não — a ordem das
conferências, as travas de dono, a recusa de lote misto, o `Number.isFinite` antes da conta.
Remover uma dessas travas passa pelo build e pelos testes sem acusar nada.

**A tabela de travas está no [README desta pasta](README.md#as-travas-que-não-podem-cair).**
Ela é hoje a única documentação do que não pode cair.

**Como se paga:** teste de integração na Fase 1, quando houver banco real para apontar.
