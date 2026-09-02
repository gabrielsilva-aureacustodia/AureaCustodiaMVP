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
| **D9** | Saldo interno ou liquidação direta | ~~Liquidação direta~~ → **REVERTIDA em 02/09**: saldo interno. A Áurea recebe o depósito, guarda e depois distribui. Risco registrado em [`RISCOS_ASSUMIDOS.md`](../RISCOS_ASSUMIDOS.md#ra-01) |

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

## O que muda no produto por causa do D9 — REVERTIDO EM 02/09/2026

> ⚠️ **Esta decisão foi tomada em 01/09 e revertida em 02/09.** As duas versões ficam
> registradas: a primeira porque explica um desenho que pode voltar, a segunda porque é a
> que vale hoje.

### A decisão que vale (02/09) — saldo interno

**A Áurea recebe o depósito, guarda o dinheiro na conta dela e depois distribui ao
cliente.** É o modelo que o ambiente simulado já pratica, agora com dinheiro real.

**Por que reverteu, e o motivo é bom:** a liquidação direta quebrava a compra instantânea.
Um bid parado no livro não pode cobrar antecipadamente, então casar uma ordem viraria
"iniciar uma cobrança", e a moeda só trocaria de dono quando o webhook confirmasse. Isso
introduz um estado que a plataforma não tem — *negociação pendente de pagamento* — e muda a
experiência inteira do mercado.

Trocar isso por um risco regulatório **conhecido, registrado e reversível** foi decisão do
Gabriel, pendente de discussão com os sócios.

### O que isso preserva

Tudo que já funciona. `matchOrders` continua executando e movendo saldo no mesmo instante;
`deposit()` continua existindo; a linha "Depósito" continua no extrato; não há estado
intermediário novo. **A Fase 4 vira "ligar o Mercado Pago ao depósito que já existe"**, em
vez de reescrever o modelo de liquidação.

### O risco que assume

Guardar e movimentar dinheiro de terceiros **pode configurar arranjo ou conta de pagamento**
sob a regulação do Banco Central. Não é ilegal e não é impedimento — é pergunta que precisa
de resposta escrita de advogado antes do primeiro real entrar.

**Está registrado como [RA-01 em `RISCOS_ASSUMIDOS.md`](../RISCOS_ASSUMIDOS.md#ra-01)**, com
o que precisa acontecer: parecer jurídico, segregação de recursos e reconciliação diária.

**A trava prática:** construir a integração é seguro; **ligá-la em produção com dinheiro
real depende do parecer.**

### A decisão anterior (01/09), para registro — liquidação direta

O gateway cobraria o comprador e dividiria o pagamento na hora: parte do vendedor para a
conta dele, comissão para a Áurea. A plataforma nunca guardaria dinheiro.

**Vantagem:** evitava a questão regulatória por construção.
**Custo, e foi ele que decidiu:** fim da compra instantânea, mais um estado no mercado, e
vendedor obrigado a vincular conta no gateway antes de poder vender.

> **Para o Rogério:** decidimos que a Áurea vai receber o dinheiro do comprador, segurar por
> um instante e repassar ao vendedor — como faz um site de classificados com pagamento. Isso
> mantém a compra acontecendo na hora, que é o que faz o mercado funcionar. A contrapartida
> é que segurar dinheiro dos outros é atividade que o Banco Central regula, então precisamos
> de um parecer antes de ligar dinheiro de verdade. A alternativa que evitava isso deixava a
> compra lenta, e por isso foi descartada.

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
FASE 4  Mercado Pago               deposito real, webhook idempotente, saque
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

### Fase 4 — Mercado Pago (modelo de saldo interno)

A mais delicada, porque mexe em dinheiro de verdade. Com a reversão do D9, o escopo mudou:
em vez de reescrever a liquidação, é **ligar o gateway ao depósito que já existe** e
acrescentar o caminho de volta (saque).

O fluxo: criar cobrança no gateway → cliente paga → **webhook confirma** → lançamento no
ledger → saldo atualizado. A ordem importa: **saldo só se move na confirmação do webhook,
nunca no retorno da tela.** O cliente pode fechar o navegador antes do redirecionamento, e
isso não pode custar o depósito dele.

O saque é o espelho: pedido → conferência → transferência para a conta do cliente →
lançamento inverso no ledger.

As travas inegociáveis:

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

1. **Como o cliente saca?** Pix para chave dele, transferência bancária, ou os dois? Há
   prazo de retenção antes do primeiro saque?
2. **Saldo parado rende para quem?** Dinheiro de terceiros na conta da Áurea gera
   rendimento; a quem ele pertence é pergunta jurídica, não técnica.
3. **Taxa de custódia:** hoje é registrada e nunca cobrada. Com gateway, vira débito
   automático do saldo? Isso é mais simples no modelo de saldo interno do que era na
   liquidação direta.
4. **Limite de depósito:** `DEPOSITO_MAX` é R$ 100.000 por operação. Com dinheiro real,
   qual o teto por período? E há limite de saldo acumulado?

---

## O que sai de circulação com estas decisões

| O quê | Por quê |
|---|---|
| ~~`deposit()`, `DEPOSITO_MAX`, `ModalDeposito`~~ | **PERMANECEM.** A reversão do D9 (02/09) manteve o saldo interno — o que muda é que o depósito passa a ser real |
| ~~A linha "Depósito" no extrato~~ | **PERMANECE**, pelo mesmo motivo |
| `src/server/store/` (memory, redis, postgres) | Substituído pela camada de repositório do Supabase |
| `AUREA_STORE_KEY` e o versionamento de chave | Não há blob a versionar; migração vira migration de schema |
| A discussão CD-08 (Redis × Postgres) | Encerrada pela decisão D2 |

**Nada disso sai antes da Fase 1 estar de pé.** Remover cedo demais quebra o ambiente que
os sócios usam para testar.
