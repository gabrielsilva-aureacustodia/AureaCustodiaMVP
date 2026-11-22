# Alterações de 14/10/2026 — saques, Mercado Pago, permissões e financeiro

Registro completo do que mudou, **por que**, e **como isso afeta o financeiro, a integração do Mercado Pago, os
pagamentos e os saques**. Escrito para o Gabriel e para o Rogério (sócio não técnico) — a primeira parte
(seções 1 a 3) é em linguagem comum; o resto é o detalhe que o contador e quem for mexer no código precisam.

Documentos irmãos: o passo a passo para ligar o Pix automático está em
[`SAQUE_PIX_MERCADO_PAGO.md`](SAQUE_PIX_MERCADO_PAGO.md); o atalho assumido é o **RA-58** em
[`../RISCOS_ASSUMIDOS.md`](../RISCOS_ASSUMIDOS.md).

---

## 1. O que aconteceu (o caso que originou tudo)

O **Sidnei Pena** (`sidneipena92@gmail.com`) pediu um saque de **R$ 196,00** em 14/10/2026 às 09:07 e o saldo dele
foi a **R$ 0,00**. No Mercado Pago da empresa nada se mexeu, e o dinheiro nunca chegou a ele.

A investigação nos dados de produção mostrou:

| Campo do saque `SAQ-1791979630674-XLIP4J` | Valor |
|---|---|
| Valor pedido (total debitado do saldo) | R$ 196,00 |
| Tarifa fixa de saque | R$ 5,00 |
| Líquido a receber | R$ 191,00 |
| Destino | chave Pix tipo CPF `104.199.776-00` |
| Situação | `solicitado` — **nunca avançou** |
| Previsão prometida ao cliente (D+3) | 17/10/2026 |

**Causa:** o sistema só fazia a primeira metade do saque. `solicitarSaque` tirava o dinheiro do saldo e gravava
um pedido, mas **não existia nada depois disso**: não havia integração para enviar Pix, não havia tela para a
equipe ver ou pagar o pedido, e ninguém era avisado de que ele existia. O pedido ficava parado para sempre.

**Segunda descoberta (segurança):** duas funções que deveriam ser só da equipe — marcar um saque como pago e
recusá-lo (estornando o valor) — estavam no arquivo de contas de cliente e conferiam **apenas se havia alguém
logado**. Em tese, qualquer cliente logado que chamasse a função diretamente poderia marcar o saque de outra
pessoa como pago, ou recusá-lo e estornar o valor. Nenhuma tela as chamava (por isso nunca foi explorado), mas
em Next.js todo `export` de um arquivo `'use server'` vira um endereço chamável.

> **Importante, ainda em aberto:** o saque do Sidnei **continua parado** — este conjunto de mudanças cria as
> ferramentas, mas **o R$ 191,00 dele precisa ser pago** (Pix manual pelo app do banco + "Marcar como pago", ou
> o botão automático depois de ligado). O saldo dele continua zerado por causa do saque reservado.

---

## 2. O que mudou, em resumo

1. **Fila de saques no painel** (nova página `/admin/saques`), repetida **no Financeiro**, **no painel inicial como
   alerta** e **na ficha de cada usuário** — com os botões *Aprovar e enviar Pix*, *Conferir*, *Marcar como pago*
   e *Recusar*.
2. **Aviso por e-mail à equipe** quando entra um pedido de saque, e ao cliente em três momentos (pedido recebido,
   pago, recusado).
3. **Integração com a API de Payouts do Mercado Pago** (envio de Pix para a chave do cliente, a partir da conta do
   Mercado Pago da empresa) — **construída, testada e DESLIGADA por padrão** até o Gabriel entregar a chave
   pública ao Mercado Pago e configurar as variáveis (ver `SAQUE_PIX_MERCADO_PAGO.md`).
4. **Correção da falha de segurança:** as duas funções saíram do arquivo de conta de cliente e agora vivem no
   painel, exigindo a permissão `saques.pagar`.
5. **Regra geral de permissões:** a expedição de retiradas físicas (`avancarStatusRetirada`) deixou a lista
   binária antiga (`ehAdmin`) e passou a exigir a permissão `logistica.expedir`.
6. **Livro-razão e DRE:** recusar um saque agora grava um lançamento `estorno` identificável e **desconta a
   tarifa de saque da receita** (antes ela ficaria contada como receita mesmo tendo sido devolvida).
7. **Texto ao cliente** sobre o prazo D+3, a conferência pela equipe e o valor reservado.
8. **Documentação:** este arquivo, o guia de ativação, o RA-58, o CLAUDE.md e a correção do aviso de que o
   RA-01 "bloqueava" o módulo de pagamentos (foi encerrado pelo Gabriel em 11/09/2026).

---

## 3. Respostas diretas às perguntas do Gabriel

**O prazo D+3 é avisado ao cliente?** Sim, já era: o modal de saque mostra "D+3 úteis (previsão: dd/mm/aaaa)", a
mensagem depois do pedido repete a previsão, e a tela da conta mostra "Saque em processamento (D+3)". O que
faltava era dizer **que a equipe confere cada pedido** e **que o valor fica reservado e volta se for recusado** —
isso foi acrescentado, e o cliente agora também recebe e-mail.

**O que é o "parecer jurídico do RA-01"?** Era a pergunta ao advogado se guardar e movimentar dinheiro de
terceiros (o saldo dos clientes fica na conta do Mercado Pago da empresa) configura "arranjo de pagamento" ou
"conta de pagamento" sob regulação do Banco Central. **Esse risco já foi assumido pelo Gabriel em 11/09/2026**
("FECHE O RA-01. JÁ FOI DECIDIDO PERMITIR"). Eu tinha dito antes que o módulo de saque dependia desse parecer —
era um aviso desatualizado que ainda estava em `docs/EXECUCAO_POR_MODULO.md`. **Não bloqueia nada** e o documento
foi corrigido. O que continua sendo verdade: sistema que movimenta dinheiro de terceiros tem risco regulatório
que não é "ilegal" nem "impedimento", mas que um advogado deve acompanhar.

**Pagamento automático:** foi construído (seção 6). O que impede de ligá-lo agora não é jurídico, é **técnico e
do Mercado Pago**: para enviar em produção, o Mercado Pago exige que cada requisição seja **assinada** e que a
**chave pública** correspondente tenha sido entregue ao time de Integrações deles. Esse passo é do Gabriel.

---

## 4. O fluxo do saque, ponta a ponta (como ficou)

```
CLIENTE pede o saque
   │  valor total (líquido + R$ 5,00) SAI do saldo na hora e fica reservado
   │  gravados: pedido (status "solicitado") + ledger (saque −líquido, taxa_saque −R$ 5,00)
   ├─► e-mail ao cliente: "Recebemos o seu pedido" (com o prazo D+3)
   └─► e-mail à equipe (quem tem saques.pagar) + alerta no painel inicial
            │
EQUIPE abre /admin/saques (ou Financeiro, painel inicial, ficha do cliente)
   │
   ├─ [Aprovar e enviar Pix]  (só com envio automático ligado)
   │      1) pedido vira "em_processamento" e é GRAVADO antes de falar com o Mercado Pago
   │      2) POST /v1/payouts no Mercado Pago, valor = LÍQUIDO, chave = a do cadastro
   │      3a) aceito (202)      → guarda o id do payout; aguarda confirmação
   │      3b) recusado (4xx)    → volta a "solicitado" com o motivo; NADA saiu
   │      3c) incerto (rede/5xx)→ fica "em_processamento" com aviso "confira o painel do Mercado Pago"
   │      4) [Conferir] ou o aviso do Mercado Pago consulta a transação:
   │            success → "pago" + comprovante + e-mail ao cliente
   │            error/canceled → volta a "solicitado" (o dinheiro NÃO é estornado sozinho)
   │            pending → continua aguardando
   │
   ├─ [Marcar como pago]  (Pix feito por fora) → exige comprovante → "pago" + e-mail ao cliente
   │
   └─ [Recusar]  → exige motivo → "falhou"; valor TOTAL volta ao saldo; ledger grava "estorno";
                    e-mail ao cliente com o motivo
```

### Estados do saque (`StatusSaque`)

| Estado | Significa | Quem muda |
|---|---|---|
| `solicitado` | Pedido recebido, aguardando aprovação (ou voltou à fila depois de falha clara) | cliente / sistema |
| `em_processamento` | Enviado ao Mercado Pago, aguardando confirmação do Pix (ou resposta incerta) | equipe (aprovar) |
| `pago` | Dinheiro entregue (confirmado pelo Mercado Pago **ou** registrado manualmente com comprovante) | Mercado Pago (consulta) / equipe |
| `falhou` | Recusado pela equipe; valor devolvido ao saldo | equipe |

---

## 5. Efeito no **financeiro** (livro-razão, DRE, fluxo de caixa)

### 5.1 Quem é dono de qual dinheiro, em cada momento

O dinheiro do cliente fica **na conta do Mercado Pago da empresa**. O "saldo" dentro do Real Olímpico é uma
dívida da empresa com o cliente. Um saque só **quita** essa dívida quando o Pix sai.

| Momento | Saldo do cliente | Conta Mercado Pago da empresa | Dívida com o cliente |
|---|---|---|---|
| Depósito (já existia) | + valor | + valor | + valor |
| **Saque pedido** | − total (R$ 196,00) | não muda | continua R$ 196,00, agora como **"saque a pagar"** (R$ 191,00) + **tarifa retida** (R$ 5,00) |
| **Saque pago** (Pix enviado) | não muda | − líquido (R$ 191,00) | − R$ 191,00 (quitada); R$ 5,00 ficam como receita da empresa |
| **Saque recusado** | + total (R$ 196,00) | não muda | volta a ser saldo normal |

**Consequência para o caixa:** entre o pedido e o pagamento existe um **passivo "saques a pagar"**. Antes desta
mudança ele existia no banco mas era **invisível** (ninguém olhava os pedidos `solicitado`). Agora aparece em
três lugares: cartão "Saques esperando / A pagar / Prazo vencido / Mais antigo" no Financeiro, alerta no painel
inicial e a página `/admin/saques`. Para conferir o caixa: *saldo do Mercado Pago ≥ soma dos saldos dos clientes
+ saques a pagar + receita retida ainda não retirada*.

### 5.2 Livro-razão (ledger) — o que é gravado e quando

Os tipos `saque` e `taxa_saque` **já existiam** (migration 009) e continuam sendo gravados **no pedido** (não no
pagamento), exatamente como antes:

| Evento | Lançamentos | Observação |
|---|---|---|
| Pedido de saque | `saque` −R$ 191,00 e `taxa_saque` −R$ 5,00, ambos com `refInterna = id do saque` | inalterado |
| Pagar (manual ou Mercado Pago) | **nenhum** | o dinheiro já tinha saído do saldo no pedido; só muda o status |
| Recusar | **`estorno` +R$ 196,00**, `refInterna = id do saque`, descrição "Estorno de saque recusado (SAQ-…) — motivo" | **NOVO** (`src/server/db/derivar.ts`) |
| Falha do Mercado Pago (volta à fila) | nenhum | saldo não muda |

**Por que o `estorno` é novo e importante:** antes, se alguém recusasse um saque, o saldo do cliente subia sem
negociação, depósito ou conta nova — e o mecanismo de segurança do ledger o registraria como **`ajuste`**, um
lançamento "sem explicação" que aparece em vermelho na DRE ("precisam de explicação"). Agora a recusa gera um
`estorno` com a referência do saque, que explica a si mesmo. **Só a transição para `falhou` gera o estorno** — um
saque já recusado e regravado não estorna de novo (teste `derivar.test.ts`). Todo o resto continua com
`ajustes = 0`, invariante que o teste de derivação confere.

### 5.3 DRE — a tarifa de saque (linha 3.1.03)

A tarifa de R$ 5,00 é **receita da empresa** (linha 3.1.03 "Receita de tarifas de saque") e é reconhecida **no
pedido**, porque o ledger a grava no pedido. **Problema que seria criado:** se o saque fosse recusado, o cliente
recebe o total de volta (incluindo a tarifa), mas a receita de R$ 5,00 continuaria na DRE — **receita inflada**.

**Correção (`src/domain/dre.ts` e `src/domain/admin/financeiro.ts`):** quando existe um `estorno` cuja referência
é um saque (`refInterna` começando por `SAQ-`), a tarifa daquele saque é **descontada da linha 3.1.03 no período
em que o estorno acontece** (regime do ledger: o desconto cai no mês do estorno, mesmo que o pedido seja de um
mês anterior). No fluxo mês a mês do Financeiro, a coluna **Saques** perde o líquido e a coluna **Tarifas** perde
a tarifa. Estorno de **custódia** (referência `PLC-…`) **não** é afetado — há teste para isso.

> **Para o contador:** receita de tarifa de saque = tarifas cobradas no período − tarifas devolvidas por recusa
> no período. Os impostos sobre receita bruta (ISS/PIS/COFINS) seguem as alíquotas de
> `aurea.parametros_contabeis`, que o código continua **sem conhecer**.

### 5.4 O que **não** mudou (e o que fica em aberto)

- O valor da tarifa (R$ 5,00, editável em `/admin/configuracao`) e o mínimo de saque (R$ 5,01) **não mudaram**.
- **Tarifa que o Mercado Pago cobre pela transferência Pix de saída:** a documentação da API de Payouts não
  informa se existe custo por transferência. **Se existir, é uma despesa da empresa que a DRE ainda não captura**
  (a conta 4.1.07 "tarifas de gateway" é calculada só sobre os *recebimentos*). Conferir no extrato do Mercado Pago
  depois do primeiro envio real e, se houver tarifa, abrir um item para lançá-la.
- O cartão "Saques pagos" do Financeiro continua contando por `status = pago` e `pagoEm` dentro do período.
- Não há conciliação automática entre o extrato do Mercado Pago e os saques pagos; o comprovante guardado
  (id da transação `TOP…` ou código manual) é a ponte para conferir à mão.

---

## 6. Efeito na **integração com o Mercado Pago**

### 6.1 O que foi construído

Arquivos novos em `src/lib/payments/`: `payouts-core.ts` (corpo, cabeçalhos, assinatura, leitura da resposta —
sem `server-only`, para a suíte testá-lo sem rede) e `payouts.ts` (lê o ambiente e chama o núcleo).
Contrato, conferido na documentação oficial (Payouts → Transferências):

| Item | Valor |
|---|---|
| Envio | `POST https://api.mercadopago.com/v1/payouts` — resposta **202 = "aceito para processar"**, **não** "o dinheiro chegou" |
| Consulta | `GET /v1/payouts/{id}/transactions?limit=10&offset=0` — o status que vale é o da **transação** (`success`, `pending`, `in_process`, `canceled`, `error`) |
| Autenticação | `Authorization: Bearer <access token>` (o mesmo token do resto da integração) |
| Idempotência | `X-Idempotency-Key` = referência do saque (`SAQ-…`; `-T2`, `-T3` nas novas tentativas) |
| Produção | `X-enforce-signature: true` + `X-signature` = **Ed25519 dos bytes exatos do corpo, em base64** |
| Teste (sandbox) | `X-test-token: true`, `X-enforce-signature: false`, sem assinatura |
| Corpo | `external_reference`, `description`, `config.notification_url`, `transactions[0]` com `type: "pix"`, `pix: { type, chave }`, `amount: { currency: "BRL", value }` |
| Valor enviado | o **líquido** (R$ 191,00), em reais com duas casas — o único ponto em que centavos viram decimal |
| Chave | tipo `CPF`/`CNPJ`/`EMAIL`/`PHONE`/`PIX_CODE`, convertida e validada contra o tipo do cadastro (`src/domain/saques.ts`); chave que não bate **trava o envio** |

### 6.2 O que está ligado e o que não está

- **Desligado por padrão.** O botão *Aprovar e enviar Pix* só aparece quando `MP_PAYOUTS_ATIVO="true"` **e** há
  credencial (e, em produção, `MP_PAYOUT_PRIVATE_KEY`). Sem isso o painel avisa o que falta e oferece só
  *Marcar como pago*. **Não existe simulador:** um envio de mentira marcaria como pago um saque que ninguém pagou.
- **Passo manual do Gabriel (bloqueante para produção):** gerar o par de chaves Ed25519, **entregar a chave pública
  ao time de Integrações do Mercado Pago** e ativar as credenciais de produção. Passo a passo e comandos em
  `SAQUE_PIX_MERCADO_PAGO.md`. Sem a chave pública cadastrada, o Mercado Pago recusa todo envio de produção.
- **Variáveis novas na Vercel:** `MP_PAYOUTS_ATIVO`, `MP_PAYOUT_PRIVATE_KEY`; reaproveitam `MP_SANDBOX`,
  `MP_ACCESS_TOKEN`/`MP_ACCESS_TOKEN_TEST` e `NEXT_PUBLIC_APP_URL`.
- Nada do **depósito**, do **webhook de pagamentos** (`/api/webhooks/mercadopago`), da conciliação, do Pix de
  fatura/retirada ou do cartão **foi alterado**.

### 6.3 O aviso (webhook) de saque — nova rota, e por que é "burra" de propósito

`POST /api/webhooks/mercadopago-payouts` recebe as mudanças de status. **A documentação do Mercado Pago não
descreve nenhuma assinatura verificável para esse aviso** (diferente do webhook de pagamentos, que é HMAC). Por
isso a rota **nunca confia no corpo**: extrai no máximo o id do payout e a referência, e a função
`reagirAoAvisoDoGateway` **consulta o Mercado Pago com o nosso token** antes de mudar qualquer coisa. Aviso falso
só provoca uma consulta a mais; não paga, não recusa, não estorna. A rota responde 200 sempre que o corpo é lido
(500 faria o Mercado Pago reenviar), e 400 só para corpo ilegível. A rota está no prefixo público
`/api/webhooks/` (sem sessão), como a de pagamentos; o comentário em `rotas-publicas.ts` registra a diferença.
Risco registrado como **RA-58**.

### 6.4 Como o sistema evita pagar duas vezes (o risco que mais importa aqui)

1. **Gravar antes de enviar:** o saque vira `em_processamento` e é persistido **antes** da chamada ao Mercado
   Pago. Dois cliques, ou duas pessoas, encontram o estado já trocado e a segunda tentativa é recusada.
2. **Chave de idempotência estável:** a referência sai do id do saque e do número da tentativa. Reenviar depois de
   **resposta incerta** (rede, 5xx, tempo esgotado) usa a **mesma** referência — se o primeiro envio tinha passado,
   o Mercado Pago devolve o mesmo payout em vez de criar outro. Depois de **recusa clara**, a nova tentativa
   ganha referência nova (`-T2`), porque a antiga existe lá.
3. **Incerto nunca vira "falhou":** fica `em_processamento` com o aviso "confira o painel do Mercado Pago".
4. **Marcar como pago é bloqueado** enquanto há envio em andamento no Mercado Pago.
5. **Recusar é bloqueado** em `em_processamento` e em `pago` (o dinheiro pode já ter saído).
6. **Só `success` é dinheiro na conta:** qualquer outro status (inclusive desconhecido ou ausente) é "ainda não sei"
   e nunca vira pago nem recusado.

Tempo limite das chamadas: 20 s; 4xx (exceto 408/429) é recusa definitiva; 5xx, 408, 429, rede e resposta sem id
são incertos.

### 6.5 Limites conhecidos

- **Não confere titularidade:** o sistema valida que a chave tem o formato do tipo, **não** que o CPF da chave é do
  dono da conta. Quem aprova olha a fila (o nome e a chave aparecem lado a lado).
- Em produção o **saldo da conta de origem** precisa cobrir o líquido; sem saldo, a transação volta `error` e o
  saque volta à fila (sem estorno automático).
- O texto da API diz que a resposta de criação pode demorar alguns minutos e que `pending` é normal: por isso o
  botão **Conferir** existe, além do aviso automático.
- A documentação não informa **limites por transferência/dia** nem se há **tarifa** por envio (ver 5.4).

---

## 7. Efeito nos **pagamentos** em geral

| Área | Efeito |
|---|---|
| Depósito (Pix/cartão) | Nenhum. |
| Compra direta / conciliação / webhook de pagamentos | Nenhum. |
| Faturas de custódia, retirada física | Nenhum no pagamento. A **expedição** da retirada agora exige `logistica.expedir` (seção 8). |
| Saque | Todo o resto deste documento. O **pedido** do cliente continua igual (mesmo valor mínimo, mesma tarifa, mesmo débito imediato). |
| Saldo do cliente | Um saque recusado devolve o **total** (com a tarifa); um saque cujo Pix falhar **não** devolve sozinho — volta à fila para a equipe decidir (corrigir a chave e reenviar, ou recusar). |

---

## 8. Segurança e permissões

### 8.1 A falha corrigida

`confirmarLiquidacaoSaque` e `rejeitarSaque` foram **removidas de `src/server/actions/account.ts`**. As versões
novas vivem em `src/server/actions/admin/saques.ts` (`marcarSaquePago`, `recusarSaque`, mais `aprovarSaque` e
`conferirSaque`) e **cada uma confere a permissão `saques.pagar` antes de qualquer efeito** (recusa de acesso é
registrada na trilha). A lógica fica em `src/server/saques/pagamento.ts`, que **não é `'use server'`** e por isso
não vira endereço chamável. Há teste garantindo que as funções antigas **não existem mais** no arquivo de contas.

### 8.2 Permissões novas (catálogo em `src/domain/admin/permissoes.ts`)

| Permissão | Para quê | Quem recebe |
|---|---|---|
| `saques.ver` | Ver a fila, a chave Pix de destino e a situação | Desenvolvimento, Sócio |
| `saques.pagar` | Aprovar (enviar Pix), marcar como pago, conferir e recusar | Desenvolvimento, Sócio |
| `logistica.expedir` | Separar, postar e entregar retiradas físicas; informar rastreio | Desenvolvimento, Sócio, Operação |

O papel **Operação** (bancada/logística) **não** paga saque. O catálogo passou de 26 para **29** permissões; os
testes de contagem foram atualizados (`permissoes.test.ts`, `banco.test.ts`).

### 8.3 Auditoria das demais funções do site

Revisadas todas as Server Actions fora de `/admin` e as rotas `/api`:

- Já protegidas por permissão (de correções anteriores): `advanceAnalysis` (`bancada.analisar`),
  `bloquearReciboPorDebito` e `desbloquearRecibo` (`usuarios.editar`), `/api/admin/conciliacao`
  (`resultados.ver`), cron (`CRON_SECRET`), estação (token do equipamento).
- **Corrigida agora:** `avancarStatusRetirada` usava `ehAdmin()` (a lista binária de antes dos papéis, que dá
  acesso total a quem estiver em `AUREA_ADMIN_EMAILS`). Passou a exigir `logistica.expedir`. Quem não é da equipe
  continua podendo **cancelar a própria retirada** e nada mais (teste novo).
- **Ainda usa o caminho antigo, deliberadamente, por aceitar as duas formas:** `/api/retiradas/etiqueta/[id]`
  (`ehAdmin` **ou** a permissão `logistica.etiquetas`). Não foi alterado para não derrubar o acesso de quem hoje
  imprime etiqueta; vale uma passada futura.

---

## 9. Banco de dados — migration 041 (aditiva)

Arquivo `src/server/db/migrations/041_saque_por_painel.sql` (a aplicar em produção **antes** do push, como
combinado). Só **acrescenta**; o código anterior ao deploy não lê as colunas novas.

- Colunas em `aurea.saques`: `canal` (`mercadopago`/`manual`, com `CHECK`), `aprovado_por`, `aprovado_em`,
  `payout_id`, `payout_transacao_id`, `tentativas` (padrão 0), `detalhe_gateway`.
- O status `em_processamento` **já existia** na restrição da migration 009 — passa a ser usado.
- `INSERT … ON CONFLICT DO NOTHING` das três permissões novas em `admin_permissoes` e concessão ao papel **Sócio**
  (as concessões iniciais do código valem uma vez só; sem isso o Sócio, já criado, não enxergaria a fila). A
  Operação recebe `logistica.expedir`.
- **Sem backfill:** o saque do Sidnei fica com as colunas novas nulas, e é exatamente o esperado (`solicitado`,
  sem canal).
- Tipo `Saque` ganhou campos opcionais (`canal`, `aprovadoPor`, `aprovadoEm`, `payoutId`, `payoutTransacaoId`,
  `tentativas`, `detalheGateway`) em `src/domain/types.ts`; não houve mudança de `STORE_KEY`.

---

## 10. Telas e avisos

| Onde | O que a equipe vê |
|---|---|
| **Painel inicial** (`/admin`) | Alerta "N saque(s) esperando — R$ X a pagar" (com quantos passaram do D+3) e a fila compacta, no topo de qualquer variante do painel, para quem tem `saques.ver` |
| **`/admin/saques`** (novo item no menu) | Cartões (esperando, a pagar, prazo vencido, mais antigo) + fila completa + últimos 30 resolvidos |
| **Financeiro** (`/admin/resultados/financeiro`) | A mesma seção no topo, acima da DRE, para quem tem `saques.ver` |
| **Ficha do usuário → Financeiro** | Os saques **daquela conta**, com as mesmas ações; a seção abre sozinha quando há saque esperando |

Cada linha mostra: cliente (link para a ficha), id e data do pedido, **valor a pagar** (com total debitado e
tarifa), destino (chave Pix), previsão (**"prazo vencido"** em vermelho), situação (com canal, comprovante, último
retorno do Mercado Pago e motivo de recusa). *Aprovar e enviar Pix* pede **confirmação** mostrando valor, nome e
chave. *Marcar como pago* exige o comprovante; *Recusar* exige o motivo (o cliente lê).

**E-mails** (`src/server/saques/avisos.ts`, via Resend; sem `RESEND_API_KEY` só vão para o log do servidor — o
alerta no painel continua sendo o aviso que vale; **nunca derrubam o saque**):
equipe (quem tem `saques.pagar`, sem contas `@testeaurea.com.br`) ← novo pedido; cliente ← pedido recebido /
saque pago / saque recusado (com o motivo).

**Cliente** (`/conta` e modal de saque): o texto agora diz que a equipe confere cada pedido, que o valor fica
reservado e volta se for recusado, que ele recebe e-mail ao ser pago, e o estado do pedido
("aguardando aprovação da equipe" / "Pix enviado, aguardando confirmação").

---

## 11. Arquivos alterados e criados

**Domínio** — `src/domain/saques.ts` (novo: regras puras, chave Pix, veredito do Mercado Pago); `types.ts`
(campos do `Saque`); `dre.ts` e `admin/financeiro.ts` (desconto da tarifa recusada); `admin/permissoes.ts`
(três permissões).

**Mercado Pago** — `src/lib/payments/payouts-core.ts`, `payouts.ts` (novos); `ATALHOS.md`; rota nova
`src/app/api/webhooks/mercadopago-payouts/route.ts`; comentário em `src/server/rotas-publicas.ts`.

**Servidor** — `src/server/saques/pagamento.ts` e `avisos.ts` (novos); `src/server/actions/admin/saques.ts`
(novo, com permissão); `src/server/admin/saques.ts` (leitura da fila) e `destinatarios.ts` (quem avisar);
`src/server/actions/account.ts` (remove as duas funções, dispara os avisos); `custody.ts`
(`avancarStatusRetirada` → `logistica.expedir`); `src/server/db/derivar.ts` (estorno de saque recusado),
`diff.ts` e `repositories/saques.ts` (colunas novas); migration `041_saque_por_painel.sql`.

**Telas** — `src/app/(admin)/admin/saques/page.tsx` (novo); `components/admin/saques/FilaDeSaques.tsx` e
`SecaoDeSaques.tsx` (novos); alterados: painel inicial (`page.tsx`, `PainelInicial.tsx`), Financeiro (`page.tsx`),
ficha (`[email]/page.tsx`, `AbaFinanceiro.tsx`), `navegacao.tsx`; cliente: `conta/page.tsx`, `AccountModals.tsx`.

**Documentação** — este arquivo; `SAQUE_PIX_MERCADO_PAGO.md`; `RISCOS_ASSUMIDOS.md` (RA-58);
`CLAUDE.md` (regra do saque); `EXECUCAO_POR_MODULO.md` (aviso de que o RA-01 está encerrado).

---

## 12. Testes

Novos: `domain/saques.test.ts` (chave Pix, referência, veredito), `lib/payments/payouts-core.test.ts` (corpo,
cabeçalhos sandbox × produção, **assinatura Ed25519 verificada com a chave pública**, classificação dos erros,
leitura da consulta), `server/saques/pagamento.test.ts` (aprovar, clique duplo, recusa clara, resposta incerta e
retomada, conferir, aviso falso, pagar por fora, recusar), `server/actions/admin/saques.test.ts` (**cada ação
exige `saques.pagar` e nada é tocado quando negado**), `app/api/webhooks/mercadopago-payouts/route.test.ts`.
Ampliados: `derivar.test.ts` (estorno de saque recusado, sem ajuste), `db.test.ts` (persistência dos campos e
estorno no ledger no banco), `dre.test.ts` e `financeiro.test.ts` (desconto da tarifa), `retirada.test.ts` (não
equipe não expede), `saque.test.ts` (as funções antigas não existem mais), `permissoes.test.ts` e `banco.test.ts`
(29 permissões). Nenhum teste chama o Mercado Pago de verdade.

---

## 13. Checklist do Gabriel

1. **Pagar o Sidnei** — R$ 191,00 para a chave CPF `104.199.776-00` (Pix pelo app/painel do Mercado Pago) e, em
   `/admin/saques`, **Marcar como pago** com o comprovante. (Ou ligar o envio automático e usar o botão.)
2. Conferir que o **Sócio** enxerga `/admin/saques` depois do deploy (a migration 041 concede as permissões).
3. Para o **Pix automático**: seguir `SAQUE_PIX_MERCADO_PAGO.md` (gerar chaves, **entregar a pública ao Mercado
   Pago**, variáveis na Vercel, sandbox, depois um saque real de R$ 6,00 para a própria chave).
4. Conferir no extrato do Mercado Pago, depois do primeiro envio real, **se há tarifa por Pix enviado** (5.4).
5. Configurar `RESEND_API_KEY` se quiser o aviso **por e-mail** (sem ele só o alerta do painel funciona).
