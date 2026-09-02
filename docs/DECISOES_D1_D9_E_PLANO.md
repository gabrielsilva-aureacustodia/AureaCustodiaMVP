# Decisões D1–D9 e o plano técnico que sai delas

```
Decidido por:  Gabriel Silva (sócio), 01/09/2026
Base:          commit a2b33e4 · docs/diario/FRENTES_DE_TRABALHO.md
Estado:        7 decisões fechadas · D7 delegada a chat próprio · D8 fechada
```

> Este documento é a **ata das decisões** e o **plano que decorre delas**. Ele substitui a
> seção "Decisões travadas" do `FRENTES_DE_TRABALHO.md`, que passa a ser histórico.

---

## Ata: o que foi decidido

| # | Pergunta | Decisão |
|---|---|---|
| **D1** | Blob ou tabelas relacionais | **Tabelas relacionais no Supabase.** Migração completa, aproveitando que não há cliente real |
| **D2** | Supabase substitui ou convive | **Substitui.** Supabase é o banco |
| **D3** | Qual gateway | **Mercado Pago** — conta já existe |
| **D4** | Autenticação | **Supabase Auth**, com Google |
| **D5** | Correios direto ou agregador | **Correios direto, API oficial.** Com três restrições de negócio, abaixo |
| **D6** | Onde ficam os vídeos | **Supabase Storage** |
| **D7** | As cinco decisões da estação | **Delegada** a chat próprio — ver `docs/referencia/QUESTIONARIO_D7_ESTACAO.md` |
| **D8** | Regime tributário | **Lucro Presumido** |
| **D9** | Saldo interno ou liquidação direta | **Liquidação direta**, com split imediato no gateway. Sem saldo interno |

### As três restrições do D5, que não são detalhe

Gabriel marcou como **muito importante**, e elas mudam código:

1. **Declarar como moeda colecionável** no objeto postal.
2. **PAC ou SEDEX** — os dois servem.
3. **Nunca carta comum.** O regimento interno dos Correios permite confisco de dinheiro
   circulável enviado em carta. Moeda comemorativa é dinheiro circulável.

A restrição 3 é a que precisa virar trava no código, não só instrução na tela: a
modalidade de envio deve ser um tipo fechado que **não admite** carta.

---

## D1 respondido: por que eu disse "semanas", e por que você está certo

Você perguntou por que a opção (a) demoraria semanas, já que não há usuário real. **A
pergunta é justa e a estimativa que eu repassei estava inflada** — ela veio do
`FRENTES_DE_TRABALHO.md`, escrito antes, e eu a repeti sem recalcular. Vou desmontar.

### O que a migração para tabelas realmente exige

O custo **não é o schema** — desenhar dez tabelas é meio dia. O custo está em outro lugar:

Hoje **todo** acesso a dado é feito assim:

```typescript
// carrega o estado INTEIRO na memória e filtra em JavaScript
const state = await getState()
const minhasMoedas = state.users[email].coins.filter(c => c.tipoMoeda === tipo)
```

Existem cerca de **30 lugares** com esse formato, espalhados por telas, seletores e Server
Actions. Cada um precisa virar consulta. Isso é trabalhoso, mas é **mecânico e verificável**
— não é risco, é volume.

### O ponto que de fato assusta, e a saída que existe

O motor de casamento de ordens (`matchOrders`) é um laço que **muta arrays em memória**:
remove ofertas consumidas, decrementa quantidades, transfere moedas entre inventários. Ele
tem 38 testes cobrindo a aritmética, a prioridade preço-tempo e o isolamento entre ativos.

Traduzir esse motor para SQL significaria **jogar fora os testes** e reescrever no escuro a
regra que decide quem compra de quem — exatamente o que o CD-03 acabou de consertar.

**A saída é não traduzir.** Dentro de uma transação:

1. `SELECT ... FOR UPDATE` carrega **só o livro daquele tipo de moeda** (não o estado
   inteiro)
2. Monta um `AppState` parcial em memória
3. Roda `matchOrders` — a função pura, já testada, sem uma linha alterada
4. Persiste o resultado
5. `COMMIT`

O motor continua sendo o mesmo código com os mesmos testes. A transação dá a garantia de
concorrência que o blob nunca teve. **Isto é o melhor dos dois mundos e é o que recomendo.**

### Estimativa honesta, recalculada

| Etapa | Esforço |
|---|---|
| Schema + migrations no Supabase | 1 sessão |
| Camada de repositório (`src/server/db/`) com as consultas | 2–3 sessões |
| Adaptar as 5 Server Actions ao padrão transacional | 2 sessões |
| Migrar os ~30 pontos de leitura em telas e seletores | 2–3 sessões |
| Ledger financeiro + trilha de auditoria | 2 sessões |
| Testes de integração contra o banco | 1–2 sessões |

**Total: 10 a 13 sessões de trabalho**, não semanas de calendário parado. Com uma sessão
por dia, duas semanas. Com duas por dia, uma.

E você tem razão no argumento principal: **não há dado real a migrar.** O banco recomeça do
seed, como já recomeçou na v6. O que seria a parte cara de uma migração — mover dados de
produção sem perder nada — simplesmente não existe aqui.

**Conclusão: sua escolha (a) está certa, e a estimativa de "semanas" que eu passei estava
errada. Vamos de tabelas.**

---

## O que muda no produto por causa do D9

Esta é a decisão que mais muda código, e vale explicar em português claro.

**Antes (modelo de saldo interno):** o cliente depositava, o dinheiro virava saldo na
plataforma, e a compra debitava um cliente e creditava outro. A Áurea guardava dinheiro de
terceiros — o que exigiria parecer sobre enquadramento no Banco Central.

**Agora (liquidação direta):** quando uma compra casa, o gateway cobra o comprador e
**divide o pagamento na hora**: a parte do vendedor vai para a conta dele, a comissão vai
para a Áurea. **A plataforma nunca guarda o dinheiro** — ela orquestra a transferência.

### As consequências concretas

1. **O depósito simulado deixa de existir como conceito.** Hoje há `deposit()` em
   `account.ts`, `DEPOSITO_MAX`, a modal e a linha "Depósito" no extrato. Nada disso
   sobrevive à liquidação direta — não há para onde depositar.

2. **O vendedor precisa de conta cadastrada no gateway** para receber o split. Isso é
   onboarding novo: uma tela de "receber pagamentos" com o vínculo da conta Mercado Pago.
   **Sem esse vínculo, a pessoa não pode vender.**

3. **O casamento de ordens deixa de ser instantâneo.** Hoje `matchOrders` executa e o saldo
   muda no mesmo instante. Com liquidação direta, casar uma ordem **inicia uma cobrança** —
   e a transferência da moeda só acontece quando o webhook confirma o pagamento. Entra um
   estado intermediário que não existe hoje: *negociação pendente de pagamento*.

4. **Ordem de compra a preço-limite fica mais difícil.** Um bid que fica no livro esperando
   não pode cobrar antecipadamente. Ou se cobra na hora do casamento (e o comprador pode
   não pagar, exigindo prazo e cancelamento), ou se pré-autoriza o cartão. **Isto é decisão
   de produto que ainda não foi tomada** — está na lista de perguntas abertas, no fim.

> **Para o Rogério:** hoje é como uma ficha de fliperama — você troca dinheiro por ficha e
> a ficha circula dentro da casa. A partir de agora é como um classificado com pagamento
> integrado: o comprador paga, o sistema já manda a parte do vendedor direto para a conta
> dele e fica só com a comissão. A Áurea nunca segura o dinheiro de ninguém.

---

## O plano em fases

```
FASE 1  Fundação Supabase          schema + repositório + migração do estado
   │                               ← tudo depende disto
   ▼
FASE 2  Autenticação               Supabase Auth + Google + migração das 7 contas
   │                               (paralelizável com a FASE 3)
   ▼
FASE 3  Ledger e trilha            lançamentos, hash encadeado, extrato reapontado
   │                               resolve o CD-09 naturalmente
   ▼
FASE 4  Mercado Pago               split, webhook idempotente, fim do saldo interno
   │                               ← a mais delicada: mexe em dinheiro real
   ▼
FASE 5  Correios                   PAC/SEDEX, colecionável, rastreio agendado
   │                               (paralelizável com a FASE 4)
   ▼
FASE 6  DRE e Lucro Presumido      estrutura contábil, alíquotas como configuração
```

### Fase 1 — Fundação Supabase

**Objetivo:** o estado sai do blob JSON e vira tabelas, sem perder o motor testado.

Tabelas mínimas: `users`, `coins`, `nfts`, `sell_offers`, `buy_orders`, `trades`,
`envios`, `custody_charges`, `seq`.

Pontos de atenção que já conheço:

- **Dinheiro é `bigint` em centavos**, nunca `numeric` nem `float`. A regra `Cents` do
  domínio continua valendo do outro lado.
- **`seq` precisa de trava.** Hoje `nextCoinCode` incrementa um contador dentro do estado.
  Em tabela isso vira sequência ou linha travada — duas moedas não podem nascer `RO-000042`.
- **`matchOrders` roda dentro da transação**, sobre um `AppState` parcial. Ver a seção D1.
- **Os 38 testes atuais continuam passando sem alteração** — eles testam funções puras do
  domínio, que não sabem de onde o estado veio. Este é o critério de aceite mais
  importante da fase.

### Fase 2 — Supabase Auth

Sim, o Google é integração nativa do Supabase Auth — você entendeu certo. Habilita-se o
provedor no painel, configura-se o OAuth no Google Cloud, e o Supabase cuida do resto:
tela de consentimento, troca de token, sessão.

O que precisa de decisão sua nesta fase: **as sete contas de teste migram ou são
recriadas?** Elas hoje têm senha em texto puro e e-mail fictício que não recebe mensagem —
o que impede verificação. Recriar é mais limpo; migrar preserva o histórico de negociações
já semeado.

### Fase 3 — Ledger e trilha de auditoria

Tabela **append-only**: nunca se altera linha, corrige-se com lançamento inverso.

Aqui o **CD-09 se resolve sozinho**: o lançamento grava a comissão cobrada no momento, e o
extrato passa a ler o que foi gravado em vez de recalcular. O extrato para de mudar o
passado sem precisar de decisão adicional.

A trilha de auditoria com **hash encadeado** compartilha implementação com o hash da
estação de validação (frente E). Faz-se uma vez, usa-se nos dois lugares.

### Fase 4 — Mercado Pago

A mais delicada, porque mexe em dinheiro de verdade. As travas inegociáveis:

- **Nunca receber, trafegar ou guardar número de cartão.** Sempre checkout hospedado ou
  tokenização. Tocar em PAN traz o PCI-DSS inteiro para o escopo.
- **Nunca creditar nada no retorno da tela.** Só no webhook confirmado. O cliente pode
  fechar o navegador antes do redirecionamento, e isso não pode custar a compra dele.
- **Webhook com assinatura verificada.** Sem isso é endpoint público que move dinheiro.
- **Idempotência obrigatória.** Todo gateway reenvia webhook. Tabela de eventos
  processados com o id do gateway como chave única; evento repetido é descartado antes de
  qualquer efeito.
- **Fila, não processamento síncrono.** Grava o evento, responde 200, processa depois.

### Fase 5 — Correios

Interface própria em `src/lib/shipping/`, com a API oficial atrás dela. As três restrições
do D5 viram tipos e validação:

```typescript
type ModalidadeEnvio = 'PAC' | 'SEDEX'   // carta não é opção representável
```

O rastreio é consultado **por agendamento** (cron da Vercel), nunca a cada carregamento de
página: consultar por visita gera custo, esbarra em limite de requisição e deixa a tela
lenta.

**Cuidado com o CEP:** consultar para sugerir agência é tratamento de dado pessoal.
Consulte, mostre, **não guarde o histórico**.

### Fase 6 — DRE sob Lucro Presumido

Estrutura pronta, **alíquotas como configuração externa**. Mesmo com o regime decidido, a
alíquota efetiva depende de faturamento e de anexo, e muda por lei. Alíquota fixa em código
gera passivo fiscal retroativo que só aparece na fiscalização, anos depois.

---

## Perguntas que a Fase 4 vai exigir, e que ainda não têm resposta

Registro agora para não travar depois:

1. **Ordem de compra a preço-limite com liquidação direta:** cobra-se no casamento (com
   prazo para pagar e cancelamento automático) ou pré-autoriza-se o cartão?
2. **Vendedor sem conta no Mercado Pago:** bloqueia a publicação da oferta, ou permite
   publicar e trava só no recebimento?
3. **A comissão sai por split automático** do Mercado Pago, ou a Áurea recebe o total e
   repassa? (O split é mais limpo juridicamente e é o que o D9 pede.)
4. **Taxa de custódia:** hoje é registrada e nunca cobrada. Com gateway, vira cobrança
   recorrente? Isso muda o enquadramento e talvez precise voltar ao advogado.

---

## O que sai de circulação com estas decisões

| O quê | Por quê |
|---|---|
| `deposit()`, `DEPOSITO_MAX`, `ModalDeposito` | Não há saldo interno na liquidação direta |
| A linha "Depósito" no extrato | Idem — vira "Compra" e "Venda" com liquidação |
| `src/server/store/` (memory, redis, postgres) | Substituído pela camada de repositório do Supabase |
| `AUREA_STORE_KEY` e o versionamento de chave | Não há blob a versionar; migração vira migration de schema |
| A discussão CD-08 (Redis × Postgres) | Encerrada pela decisão D2 |

**Nada disso sai antes da Fase 1 estar de pé.** Remover cedo demais quebra o ambiente que
os sócios usam para testar.
