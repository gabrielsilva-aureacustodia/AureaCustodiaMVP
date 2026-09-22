# AG9 — Custódia: só mensal, R$ 2,00 por moeda, cobrança recorrente

Branch: `exec/ag9-custodia-mensal`. É a maior das sete.

**Decisão dos sócios, tomada em 21/09/2026. Não pergunte, execute.** A custódia
mudou três vezes em quatro dias e esta é a decisão vigente. As mudanças
anteriores estão descritas abaixo só para você saber o que precisa desmontar.

## O estado atual, que esta branch substitui

| Quando | O que valia |
|---|---|
| até 18/09 | plano anual (R$ 24,00/moeda) e plano de 24 meses (R$ 36,00) |
| 20/09 | o de 24 meses foi aposentado; sobrou o anual |
| 21/09 | voltou o mensal a R$ 3,00/mês ao lado do anual, e a custódia passou a ser transferida proporcionalmente quando a moeda é vendida |
| **agora** | **só o mensal, a R$ 2,00 por moeda por mês** |

## O que fazer

### 1. Uma modalidade só: mensal, R$ 2,00 por moeda por mês

- `src/domain/fees.ts`: `custodiaMensalPorMoeda` volta a **200**. O plano anual
  (`custodiaAnualPorMoeda`, `custodiaAnualParcelasMax`) sai de cena.
- `src/domain/types.ts`: `ModalidadePlanoCustodia` passa a `'mensal'`.
- `src/domain/plano-custodia.ts`: `mesesCobertos` e `valorDoPlano` deixam de ter
  ramo anual. O parâmetro `mesesForcados` some junto com a proporcionalidade.
- `src/app/(app)/envios/page.tsx`, passo 3: um cartão de plano só.

**Mude em todo lugar do site que ainda diz outra coisa** — textos de tela,
avisos, a página de taxas, material educativo. Varra por "anual", "12 meses",
"24 meses" e "R$ 24,00".

### 2. A transferência proporcional deixa de existir

`src/domain/custodia-transferencia.ts` foi escrito em 21/09 para repassar ao
comprador os meses restantes do plano do vendedor, com plano novo,
`origem: 'transferencia'` e três opções de pagamento. **Isso acaba.**

Com cobrança mensal o desenho fica trivial: quem comprou a moeda **paga o
próximo mês normalmente**, como qualquer outra moeda que ele guarde. Nada de
plano herdado, nada de cálculo proporcional, nada de escolha entre três opções.

O que precisa continuar valendo: **o vendedor para de ser cobrado pela moeda que
vendeu**, e **o comprador passa a ser cobrado por ela** no ciclo seguinte.

Desmonte também o que foi criado para servir àquele desenho e deixa de ter uso:
`escolherPlanoDaTransferencia` (`src/server/actions/plano-custodia.ts`), o bloco
de três opções em `src/components/custody/FaturasCustodia.tsx`, a origem
`'transferencia'` da fatura, e os campos `mesesContratados`, `origem` e
`planoOrigemId` de `PlanoCustodia` (migration 032). Migration nova para desfazer
o que não se usa mais — não edite a 032, que já rodou.

`transferirMoedaVendida` em `src/domain/market.ts` continua sendo o caminho de
toda venda; o que muda é o que ela faz com a custódia.

### 3. Cobrança recorrente no Mercado Pago

O cliente com débito de custódia vê o aviso e escolhe **cartão** ou **Pix**.

Escolhendo **cartão**, a cobrança dos R$ 2,00 por moeda passa a ser feita
**automaticamente todo mês**, pelo Mercado Pago, sem o cliente voltar à tela.

Hoje a custódia cobra no cartão por **Checkout Pro à vista**
(`iniciarCartaoFatura` em `src/server/actions/plano-custodia.ts`), o que não
renova nada. Cobrança recorrente no Mercado Pago é **Preapproval** (assinatura):
`POST /preapproval` para criar, `PUT /preapproval/{id}` para alterar ou
cancelar. O campo `PlanoCustodia.assinaturaId` já existe no modelo e nunca foi
preenchido — é dele que se trata.

**Leia a documentação vigente do Mercado Pago antes de escrever a chamada.** Não
copie assinatura de API de memória: o projeto já perdeu tempo com isso.

O valor da assinatura acompanha a quantidade de moedas do cliente: comprou mais
uma, a cobrança do mês seguinte sobe R$ 2,00; vendeu, desce. Escreva no código
quando a assinatura é alterada e o que acontece se a alteração falhar.

**O cancelamento é parte desta branch**, não fica para depois: quando o cliente
não tem mais moeda em custódia, a assinatura é cancelada. É o que impede a
empresa de cobrar por guarda que não presta mais.

As credenciais e o cliente HTTP estão em `src/lib/payments/`; `isMercadoPagoSandbox()`
decide o ambiente. A conciliação de entrada está em `src/server/payments/conciliacao.ts`.

### 4. Tabela de Taxas

Capítulo 1: fica **só o plano mensal**, R$ 2,00 por moeda por mês. Saem a
cláusula do plano anual e a da transferência proporcional (1.3, escrita hoje).
Renumere o que sobrar e **suba a versão** — a Tabela está em `2.2` e o texto
publicado que muda anda de versão, porque o aceite aponta para a versão.

O gerador `documentoTabelaDeTaxas` em `src/domain/admin/documentos.ts` preenche
as cláusulas por número; ele explode de propósito quando o número some, então
ajuste-o junto. Os vetores congelados de hash ficam em
`src/domain/documentos-legais/canonico.test.ts`, `src/domain/admin/documentos.test.ts`
e `src/server/db/db.test.ts`.

## Ordem de leitura

1. `CLAUDE.md`
2. `src/domain/plano-custodia.ts` — inteiro
3. `src/domain/custodia-transferencia.ts` — o que vai ser desmontado
4. `src/domain/fees.ts` e `src/domain/types.ts`
5. `src/server/actions/plano-custodia.ts`
6. `src/lib/payments/` — cliente do Mercado Pago
7. `src/server/payments/conciliacao.ts` e `src/server/payments/repositorios.ts`
8. `src/components/custody/FaturasCustodia.tsx` e `AvisoDebitoCustodia.tsx`
9. `src/domain/documentos-legais/tabela-de-taxas-v1.ts` e `src/domain/admin/documentos.ts`
10. Documentação vigente do Mercado Pago sobre Preapproval

## Cuidados

- **Nenhum usuário pode ganhar saldo ou moeda sem contrapartida.** Não credite
  nada no fluxo de assinatura; o crédito vem da conciliação do pagamento
  confirmado.
- Campo removido de `PlanoCustodia` sai **também** de `src/server/db/diff.ts`
  (`normalizarPlano`) e do repositório `src/server/db/repositories/planos.ts`.
- Migration nova, numerada em sequência. A 032 já rodou no banco; não a edite.
- Sem trava nova no caminho do cliente.
- Credencial nenhuma no repositório.

## Fechamento

Sem commit. Rode typecheck, lint, teste e build **uma vez, no fim**, só para
confirmar que a branch está de pé, e **avise que terminou**. O merge e o commit
são feitos depois, por um agente só, com todas as branches juntas.
