# Proposta de KPIs do conselho — Real Olímpico

```
Data:      18/11/2026 · frente J da manutenção (item 7 do Rogério)
Fonte:     slide "3.1 Cronograma, Números e Metrificação" da apresentação do conselho (CAC diário e semanal,
           análise analógica e digital, atendimento comercial semanal) + os KPIs que o painel já tinha
Falta:     conferir com o Gabriel se a lista final do WhatsApp de 3/11 tem algo além dos 5 do slide 3.1 (seção 3)
Onde:      painel → Gestão → Indicadores → abas "Aquisição e atendimento" e "Gasto de marketing"
           (/admin/resultados/kpis) · aba nova "KPIs do conselho" (T5, 22/11/2026)
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

## 3. Os 5 KPIs prioritários do conselho — onde estão no site (T5, 22/11/2026)

Pedido do Rogério (item 7): os cinco do slide 3.1. Agora todos têm número no painel, na aba **Gestão → Indicadores → KPIs do conselho**
(`/admin/resultados/kpis?aba=conselho`), com uma frase de "o que é" em cada bloco. Sem dado, a tela mostra "—", nunca zero.

| # | KPI do conselho | Já existia | Entrou nesta rodada | Fórmula | Fonte do dado | Frequência | Dono (sugestão) |
|---|---|---|---|---|---|---|---|
| 1 | CAC × payback | CAC por janela e CAC só da mídia (aba Aquisição) | **CAC do período, pagantes, custódia e comissão por cliente por mês, payback, LTV de 12 meses (provisório) e LTV ÷ CAC** | CAC = gasto ÷ ativados; receita/cliente = custódia (moedas dos pagantes × preço vigente) + comissão (do período levada a 30 dias) ÷ pagantes; payback = CAC ÷ receita/cliente | Gasto: digitado (o R$ 3.600 entra como "Serviço"). Resto: banco | Mensal | Rogério + Marketing |
| 2 | Margem por moeda captada | Comissão por tipo (aba Negócio) | **Moedas captadas, custódia paga e comissão dessas moedas, receita por moeda** | (custódia paga + comissão das negociações da moeda) ÷ moedas captadas. **Sem custo logístico: o cliente paga o frete** | Banco; a comissão por moeda vale só para negociação feita depois da migration 059 | Mensal | Gabriel |
| 3 | Conversão de clientes pagantes | Cadastro → 1ª transação | **Cadastro → pagante** (pagou custódia), depositaram moeda, pagantes que já negociaram | pagantes ÷ cadastros do período | Banco, automático | Semanal | Rogério + Gabriel |
| 4 | Inadimplência e churn | Taxa de inadimplência e contas inadimplentes | **Churn por 3 motivos e total**: retirada, mais de 45 dias sem usar, custódia não paga há mais de 45 dias; custódia recorrente por mês | clientes que saíram (cada um uma vez) ÷ (pagantes + quem retirou) | Banco (retiradas, último acesso, faturas) | Mensal | Gabriel |
| 5 | Liquidez e GMV | Volume, comissão, ofertas abertas | **Giro, % anunciado, % dos anúncios que venderam, tempo até a venda** | giro = vendidas ÷ (vendidas + ainda anunciadas) | Banco; histórico da fila (migration 015) | Semanal | Rogério |

**Decisões do Gabriel (22/11/2026) e limites** — respostas completas e pendências de marketing em `PENDENCIAS_DE_DADOS_E_AUTOMACOES.md`:

- Não há custo logístico; payback e LTV contam custódia e comissão; pagante é quem pagou custódia; churn tem 3 motivos (retirada, 45 dias inativo, 45 dias de custódia não paga).
- O **horizonte do LTV (12 meses) é provisório**: ainda sem resposta.
- A comissão por moeda captada só existe para negociações feitas depois da migration 059 (a negociação passou a guardar o código da moeda); as antigas ficam de fora, sem inventar.
- Gasto e visitas de marketing seguem digitados; a leitura pela API da Meta ainda não foi decidida.
- Nada fiscal: margem aqui é receita, não resultado contábil (esse é o da DRE).

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
| D2 | A lista final de KPIs do conselho (WhatsApp de 3/11) | os 5 do slide 3.1, na seção 3; se a lista do WhatsApp tiver outros, entram numa próxima rodada |
| J1 | O que conta como "1ª transação" | entrada de dinheiro confirmada, compra ou venda; o pagamento que a **equipe** registra em mãos não conta |
| J2 | Contas da equipe e de teste entram no CAC? | **não** (e-mail institucional, lista de administradores e `@testeaurea.com.br`) |
| J3 | O CAC inclui a mensalidade do serviço de marketing? | mostra os dois: CAC (tudo) e CAC só da mídia |
| J4 | O atendimento comercial inclui o WhatsApp (`/admin/cs`)? | só os casos de `/admin/casos`; WhatsApp fica para a próxima rodada |
| J5 | Origem do cadastro (seção 4) | só proposta; depende da tela de cadastro |
