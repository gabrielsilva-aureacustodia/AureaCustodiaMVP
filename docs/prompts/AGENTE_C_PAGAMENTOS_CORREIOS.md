# Prompt — Agente C · Mercado Pago e Correios

> Copie o bloco abaixo inteiro como primeira mensagem do chat dedicado a esta frente.

---

Você vai trabalhar no repositório da **Áurea Custódia / Real Olímpico**
(`C:\dev\AureaCustodiaMVP`), na frente de **integrações externas: pagamento (Mercado Pago) e
logística (Correios)**.

Outros dois agentes trabalham em paralelo neste repositório, e existe um contrato escrito de
quem edita o quê.

## Antes de escrever qualquer linha, leia nesta ordem

1. **`CLAUDE.md`** (raiz) — as regras. Carregado automaticamente
2. **`docs/FRENTES_PARALELAS.md`** — ⚠️ define seus arquivos e os dos outros
3. **`docs/EXECUCAO_POR_MODULO.md`**, módulos **M5** (Mercado Pago) e **M6** (Correios)
4. **`RISCOS_ASSUMIDOS.md`** (raiz) — ⚠️ **RA-01 e RA-07 são seus.** Leia com atenção
5. **`docs/DECISOES_D1_D9_E_PLANO.md`** — a seção do D9, que foi **revertida em 02/09** e
   define o modelo que você vai implementar
6. **`src/lib/README.md`** — o padrão das integrações

## Seu escopo

**Branch:** `feat/pagamentos-correios`

```
src/lib/payments/     Mercado Pago — cobrança, webhook, idempotência
src/lib/shipping/     Correios — etiqueta, rastreio, modalidade
src/app/api/webhooks/ Endpoint do webhook
src/app/(app)/envios/ Telas de envio
```

**A ligação com `account.ts` (depósito) e `custody.ts` (envios) espera a frente B terminar.**
Até lá, entregue as bibliotecas prontas e **testadas com mocks** — elas são puras e não
dependem de banco.

## O modelo de pagamento — decisão D9, revertida em 02/09

**A Áurea recebe o depósito, guarda o dinheiro na conta dela e depois distribui ao cliente.**
Saldo interno, como o simulado de hoje, mas com dinheiro real.

Havia uma decisão anterior (liquidação direta com split), descartada porque quebrava a compra
instantânea. **Não a reintroduza** — leia a seção do D9 antes de sugerir mudança.

**O que isso preserva:** `deposit()` continua existindo, `matchOrders` continua movendo saldo
no mesmo instante, não há estado intermediário novo. Sua frente é **ligar o gateway ao
depósito que já existe** e acrescentar o caminho de volta (saque).

## 🔴 A trava que vem antes de tudo — RA-01

Guardar e movimentar dinheiro de terceiros **pode configurar arranjo ou conta de pagamento
sob regulação do Banco Central**. O parecer jurídico ainda **não existe**.

**Construir a integração é seguro. Ativá-la em produção com dinheiro real, NÃO.**

Trabalhe **exclusivamente em sandbox** (`MP_ACCESS_TOKEN_TEST`). Não configure webhook de
produção nem use credencial de produção. Se algo seu exigir isso, **pare e avise o Gabriel**.

## O fluxo do depósito

```
1. Cliente pede depósito de R$ X
2. Servidor cria cobrança no Mercado Pago → devolve link
3. Cliente paga (Pix, cartão, boleto)
4. Mercado Pago chama o webhook
5. Assinatura verificada → id do evento conferido contra a tabela de idempotência
6. Evento gravado, resposta 200 IMEDIATA
7. Processamento: lançamento → saldo atualizado
```

**Saldo só se move no passo 7, nunca no retorno da tela.** O cliente pode fechar o navegador
antes do redirecionamento, e isso não pode custar o depósito dele.

## As travas inegociáveis do pagamento

- ❌ **Nunca receber, trafegar ou guardar número de cartão.** Sempre checkout hospedado ou
  tokenização. Tocar em PAN traz o PCI-DSS inteiro para o escopo
- ❌ Nunca creditar saldo no retorno da tela
- ❌ Nunca chave de API fora de variável de ambiente do servidor
- ❌ Nunca `float` para dinheiro, mesmo que a API do Mercado Pago devolva decimal
- ✅ **Idempotência obrigatória** — é o **RA-07**. Todo gateway reenvia webhook (timeout,
  retentativa, falha de rede). Sem chave de idempotência, **o mesmo pagamento credita duas
  vezes**. Tabela de eventos processados com o id do gateway como chave única
- ✅ **Fila, não processamento síncrono.** Grava o evento, responde 200, processa depois

## Correios — as três restrições que viram código

O Gabriel marcou como **muito importante**:

```typescript
// src/lib/shipping/types.ts
export type ModalidadeEnvio = 'PAC' | 'SEDEX'
// Carta comum NÃO é representável, de propósito: o regimento interno dos
// Correios permite confisco de dinheiro circulável enviado em carta, e moeda
// comemorativa é dinheiro circulável.
```

1. **Declarar como moeda colecionável** no objeto postal
2. **PAC ou SEDEX**
3. **Nunca carta comum** — trava de **tipo**, não aviso na tela. Nem por requisição forjada

**Rastreio por agendamento** (cron da Vercel), nunca por carregamento de página. Consultar a
API a cada visita gera custo, esbarra em limite de requisição e deixa a tela lenta. O job
grava o último estado no banco; a tela lê do banco.

**⚠️ Cuidado com o CEP:** consultar para sugerir agência é tratamento de dado pessoal.
Consulte, mostre, **não guarde o histórico** — a LGPD pede finalidade declarada.

## Credenciais que talvez ainda não existam

| Item | Situação |
|---|---|
| Mercado Pago sandbox | Gabriel pode criar rápido |
| **Contrato de API dos Correios** | ⚠️ Envolve contrato comercial — pode demorar dias |

**Se as credenciais dos Correios não existirem**, construa a biblioteca contra a
especificação da API, com mocks, atrás de uma interface própria. A troca depois é de
implementação, não de aplicação.

## Perguntas abertas — não decida sozinho

⚪ Como o cliente **saca**? Pix para chave dele, transferência, ou os dois?
⚪ Há **prazo de retenção** antes do primeiro saque?
⚪ **Teto de depósito por período** e de saldo acumulado? (hoje é R$ 100.000 por operação,
sem limite de repetição)
⚪ Taxa de custódia vira **débito automático** do saldo?

**Pergunte ao Gabriel.**

## Critério de aceite

- [ ] Pix, crédito e boleto completam ponta a ponta **em sandbox**
- [ ] **Webhook reenviado três vezes credita UMA vez** — RA-07 pago
- [ ] Webhook com assinatura inválida é rejeitado e registrado
- [ ] **Nenhum dado de cartão passa pelo servidor da Áurea**
- [ ] **Carta comum não é selecionável em lugar nenhum**, nem por requisição forjada
- [ ] O objeto sai declarado como moeda colecionável
- [ ] Rastreio atualiza por job agendado, não por visita de página
- [ ] Nenhum CEP consultado é guardado

## Regras que valem sempre

- Antes de commitar: `npm run typecheck`, `npm test`, `npm run build`
- **Todo atalho** vai para `RISCOS_ASSUMIDOS.md` **e** o `ATALHOS.md` da pasta, no mesmo commit
- **Toda pasta nova nasce com `README.md`**
- **Repositório público de propósito.** Nenhuma credencial em commit
- **Nada de `@/server/*` em Client Component**
- Comentários em português, explicando o **porquê**

## Como começar

Comece pelas **bibliotecas puras** (`src/lib/payments/` e `src/lib/shipping/`), que não
dependem de ninguém e são testáveis com mocks. **Descreva o plano antes de editar** e espere
aprovação — regra 1 do `CLAUDE.md`.
