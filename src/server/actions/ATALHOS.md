# Atalhos assumidos nesta pasta

> Notas locais dos atalhos de teste e segurança tomados em `src/server/actions/`.
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md).

---

## RA-01 ✅ ASSUMIDO em 11/09/2026 — `deposit()` e o dinheiro real

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

**Encerrado em 11/09/2026:** os sócios decidiram permitir, com cláusulas nos termos se for preciso
(`RISCOS_ASSUMIDOS.md`, RA-01). **Não há trava**: ligar o Mercado Pago em produção é só configurar as
credenciais, e nenhum agente deve parar esperando parecer. Até 15/09 este parágrafo ainda dizia "não
ative sem a resposta escrita" — texto velho que contrariava a decisão.

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

## RA-02 🔴 — senha em texto puro somente na contingência do seed

**Arquivos:** `auth.ts` (`loginDeContingencia`), `account.ts` (`changePasswordContingencia`)

O fluxo configurado usa Supabase Auth no login e na troca de senha. A comparação literal
resta apenas quando as variáveis do Supabase não existem, para manter as sete contas do
seed acessíveis durante desenvolvimento. Remover junto com o RA-17 após recriar os sócios.

## RA-16.c 🟢 — Pago por remoção na E3

Pago por remoção na E3: o arquivo não existe mais e as escritas contábeis passam por `src/server/actions/admin/contabil.ts`, com permissão por papel e testes em `acoes.test.ts`.

---

## RA-04 🟠 — nenhuma destas ações tem teste

Os 38 testes cobrem `src/domain/`. **As cinco Server Actions não têm nenhum.**

A regra de negócio que elas aplicam está testada; a **orquestração** não — a ordem das
conferências, as travas de dono, a recusa de lote misto, o `Number.isFinite` antes da conta.
Remover uma dessas travas passa pelo build e pelos testes sem acusar nada.

**A tabela de travas está no [README desta pasta](README.md#as-travas-que-não-podem-cair).**
Ela é hoje a única documentação do que não pode cair.

**Como se paga:** teste de integração na Fase 1, quando houver banco real para apontar.

---

## RA-50 🟡 — definirNovaSenha sem a senha atual

**Arquivos:** `auth.ts` (`definirNovaSenha`)

A ação troca a senha sem exigir a senha atual para qualquer usuário com sessão válida na plataforma
e no Supabase com o mesmo e-mail. Os detalhes e o plano de pagamento estão em [`src/server/auth/ATALHOS.md`](../auth/ATALHOS.md#ra-50).

---

## RA-52 🟡 — o bloqueio por pendência de custódia é calculado, e a equipe é isenta

**Arquivos:** `custody.ts`, `sell.ts`, `market.ts`, `payments.ts`, `bloqueio-por-debito.ts`

Retirada, venda e compra de lote de vendedor com fatura vencida são recusadas pela regra de
`src/domain/bloqueio-por-debito.ts`, sem gravar `'Bloqueado'` no recibo. Conta da equipe
(`carregarMembro`) é isenta, e checagem que falha libera. Detalhe em `RISCOS_ASSUMIDOS.md`.

A parte da **marca manual apagada** foi paga em 18/09/2026 (E8): nenhum processo automático grava
mais `user.inadimplente`. A coluna é só a marca da equipe (`marcarInadimplencia`), e a inadimplência
por fatura é calculada na hora por quem lê.

---

## RA-53 ✅ — pago em 18/09/2026 (E8)

**Arquivos:** `custody.ts` (`iniciarPixRetirada`, `iniciarCartaoRetirada`), `payments.ts` (`iniciarCompraDireta`)

A porta de entrada continua igual. O que faltava — a outra ponta — está em
`src/server/payments/conciliacao.ts`: a liquidação reconfere a pendência e, com ela, credita o valor
no saldo em vez de transferir a moeda ou extinguir o recibo. Detalhe em `RISCOS_ASSUMIDOS.md`.
