# Proposta de KPIs do conselho — Real Olímpico

```
Data:      18/11/2026 · frente J da manutenção (item 7 do Rogério)
Fonte:     slide "3.1 Cronograma, Números e Metrificação" da apresentação do conselho (CAC diário e semanal,
           análise analógica e digital, atendimento comercial semanal) + os KPIs que o painel já tinha
Falta:     a lista final do WhatsApp de 3/11 — a tabela da seção 3 espera o Gabriel completar
Onde:      painel → Gestão → Indicadores → abas "Aquisição e atendimento" e "Gasto de marketing"
           (/admin/resultados/kpis)
```

## 1. Em duas frases

Tudo o que o sistema sabe sozinho (cadastros, primeira transação, casos de atendimento) aparece **calculado sem ninguém digitar**.
O que vem de fora — **o dinheiro gasto em anúncio, evento e material** — a equipe digita numa tela simples, e só então o CAC aparece. Sem gasto
informado, o painel mostra "—": **nenhum número é inventado**.

## 2. Os KPIs, um a um

| KPI | O que é (em português claro) | Fórmula | De onde vem | Quando olhar | Dono (sugestão) |
|---|---|---|---|---|---|
| **Novos cadastros** | Contas criadas no período | contas com data de criação nos dias | Banco (a conta nova) — automático | Diário e semanal | Marketing |
| **Cliente ativado** | Quem fez a **1ª transação** | contas cuja primeira entrada de dinheiro confirmada (Pix ou cartão), compra ou venda caiu nos dias | Banco — automático | Diário e semanal | Marketing + Gabriel |
| **CAC** (custo para conquistar um cliente) | Quanto custou cada cliente ativado | gasto informado nos dias ÷ clientes ativados nos dias | Gasto: **digitado** · Ativados: banco | **Diário, semanal** e mensal (o painel mostra hoje, 7 dias e mês até hoje) | Rogério + Marketing |
| **CAC só da mídia** | O mesmo, sem a mensalidade do serviço de marketing | gasto dos canais (sem "serviço") ÷ ativados | idem | idem | Marketing |
| **Custo por cadastro** | Quanto custou cada conta criada | gasto ÷ novos cadastros | idem | Semanal | Marketing |
| **Visita → cadastro** | Quantas visitas viram conta | cadastros ÷ visitas ao site | Visitas: **digitadas** (lidas do gerenciador de anúncios) | Semanal | Marketing |
| **Cadastro → 1ª transação** | Quantos cadastrados do período já transacionaram | ativados ÷ cadastros do período | Banco — automático | Semanal | Rogério + Gabriel |
| **Gasto digital × analógico** | Para onde foi o dinheiro: Meta/Google, eventos, impresso, serviço | soma do gasto por natureza do canal | **Digitado** (cada entrada tem canal) | Mensal | Rogério |
| **Atendimento: casos esperando a equipe** | Quantos clientes aguardam resposta agora | casos no estado "aberto" | Banco (`/admin/casos`) — automático | Diário | Atendimento |
| **Atendimento: tempo até a 1ª resposta** | Quanto a equipe demora para responder | média de (1ª mensagem da equipe − abertura do caso) | idem | **Semanal** | Atendimento |
| **Atendimento: criados × resolvidos** | O caso entra mais rápido do que sai? | casos criados e resolvidos no período | idem | Semanal | Atendimento |
| **Origem do cadastro (analógico × digital)** | De onde veio cada cliente | cadastros por origem | **Ainda não existe** — ver seção 4 | — | — |

**Os KPIs de negócio que já existiam seguem na aba "Negócio"**: volume e comissão por negociação, moedas em custódia, envios e aprovação na análise, faturas
pagas e atrasadas. O slide 5 do conselho pede "receita recorrente mensal estável": o painel responde com *faturado × pago no período* (faturas de custódia).

## 3. Tabela para o Gabriel completar (lista do WhatsApp de 3/11)

Preencher o que o conselho listou e que ainda não está acima. Quando voltar preenchida, a próxima rodada transforma cada linha em número no painel.

| # | KPI pedido pelo conselho | Definição | Fórmula | Fonte do dado (banco / Pixel / digitado) | Frequência | Dono |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

## 4. Origem analógica × digital — o que falta e a proposta

O cadastro **não tem campo de origem**; por isso o painel não separa o cliente de evento do cliente de anúncio, e não inventa. O gasto já se separa (digital,
analógico, serviço). **Proposta** (não feita nesta rodada, é mudança na tela de cadastro, que é de outra frente):

1. Uma pergunta no cadastro, "Como conheceu o Real Olímpico?", com poucas respostas (anúncio no Instagram, indicação, evento de colecionadores, WhatsApp, Google, outro).
2. Um código no endereço dos QR codes e links dos eventos e do material impresso (por exemplo `?origem=evento-sp`), que preenche a resposta sozinho.
3. Com isso, o CAC passa a sair **por origem**: digital × analógico, e dentro do analógico, por evento.

O Pixel e a API de Conversões da Meta já avisam à Meta cada cadastro (`CompleteRegistration`), mas a Meta não devolve esse número ao site; serve para conferir o
relatório do gerenciador de anúncios com o nosso.

## 5. Como a equipe usa (30 segundos por lançamento)

1. Painel → Gestão → Indicadores → aba **Gasto de marketing**.
2. Escolher o **canal**, os **dias** a que o valor se refere (um dia, uma semana ou "Mês inteiro") e o **valor**; se tiver, as **visitas** do gerenciador de anúncios.
3. Para corrigir: **cancelar** a entrada (com motivo) e lançar outra — nada se edita nem se apaga, e fica registrado quem fez e quando.
4. O CAC aparece na aba **Aquisição e atendimento**. Quando a entrada cobre mais dias que a janela (ex.: o mês inteiro olhado numa semana), o painel divide o valor
   igualmente pelos dias e escreve **"estimado"** ao lado.

Quem lança precisa da permissão de lançar (a mesma do controle financeiro). Ver os números: a de ver resultados. Ver o atendimento: a de atendimento.

## 6. Decisões que ficam com o Gabriel (o painel já usa o padrão abaixo)

| # | Decisão | Padrão usado |
|---|---|---|
| D2 | A lista final de KPIs do conselho (WhatsApp de 3/11) | slide 3.1 + KPIs existentes; tabela da seção 3 |
| J1 | O que conta como "1ª transação" | entrada de dinheiro confirmada, compra ou venda; o pagamento que a **equipe** registra em mãos não conta |
| J2 | Contas da equipe e de teste entram no CAC? | **não** (e-mail institucional, lista de administradores e `@testeaurea.com.br`) |
| J3 | O CAC inclui a mensalidade do serviço de marketing? | mostra os dois: CAC (tudo) e CAC só da mídia |
| J4 | O atendimento comercial inclui o WhatsApp (`/admin/cs`)? | só os casos de `/admin/casos`; WhatsApp fica para a próxima rodada |
| J5 | Origem do cadastro (seção 4) | só proposta; depende da tela de cadastro |
