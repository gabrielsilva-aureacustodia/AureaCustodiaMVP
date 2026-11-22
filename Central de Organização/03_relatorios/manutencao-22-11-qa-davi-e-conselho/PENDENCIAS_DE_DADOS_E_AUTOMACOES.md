# KPIs do conselho — respostas, o que ficou sem cálculo e o que falta

```
Data:   22/11/2026 · T5 (Manutenção 22-11)
Regra:  só o que sai do banco do site foi calculado. Nada depende de conexão externa.
        Onde falta dado, o painel mostra "—" e explica; nenhum número é inventado.
Onde:   painel → Gestão → Indicadores → KPIs do conselho (/admin/resultados/kpis?aba=conselho)
```

## Respostas do Gabriel (22/11/2026) — já aplicadas

| # | Pergunta | Resposta | Como ficou no painel |
|---|---|---|---|
| 1 | Custo logístico por moeda | **Não existe**: o cliente paga o frete | A margem por moeda não tem custo; o parâmetro foi retirado da Configuração. É "receita por moeda captada" |
| 2 | Payback e LTV: só custódia ou também comissão? | **Custódia e comissão**, todo o dinheiro que o cliente gera | Receita mensal por cliente = custódia + comissão (a comissão do período é levada a 30 dias) |
| 3 | Horizonte do LTV | **Sem resposta** | Padrão **12 meses, provisório**, marcado na tela |
| 4 | Quem é "pagante" | Quem **pagou custódia** ou fez negociação — mas só conta **depois de pagar a custódia** | Pagante = tem fatura de custódia paga (valor maior que zero). Depositar moeda sem pagar não conta. Mostra também quantos pagantes já negociaram |
| 5 | Churn | **Retirada**, ou **mais de 45 dias sem usar** a plataforma, ou **custódia não paga há mais de 45 dias** | Os 3 motivos separados e o total (cada cliente conta uma vez). Retirada = pediu as moedas no período e não guarda mais nenhuma. Os outros dois olham o dia de hoje |
| 6 | Gravar o código da moeda em cada negociação | **Sim** | Campo `coinIds` na negociação, migration **059** (criada, **não aplicada**: o Controle aplica no commit). Negociação antiga fica sem código e não entra na comissão da moeda |
| 7 | Lista do WhatsApp de 3/11 | Só a do slide 3.1 | Nada além dos 5 |
| 8 | Ler gasto e visitas pela API da Meta | **Ainda não sabe** | Fica como pendência de marketing (abaixo) |

## O que ficou sem cálculo por falta de dado

| KPI | Quando aparece "—" | O que resolve |
|---|---|---|
| 1. CAC e payback | Quando ninguém lançou o gasto de marketing dos dias (CAC, payback e LTV÷CAC ficam em "—") | Lançar o gasto na aba "Gasto de marketing", ou automatizar (ver abaixo) |
| 2. Margem por moeda | A **comissão da moeda** só existe para negociações feitas depois da migration 059. Se só houver negociação antiga, a comissão e a receita total ficam em "—" | Nada a fazer: some sozinho com as próximas negociações |
| 3. Conversão | Sem banco, não há data de cadastro | — |
| 4. Churn | "Inativo" só vale para quem tem último acesso registrado | — |
| 5. Liquidez | "Anúncios que venderam" e "tempo até a venda" dependem do histórico da fila (migration 015) | Já existe; sem ele aparece "—" |

## Ainda sem resposta (marketing)

Tudo aqui **não bloqueia** nada: o painel funciona com o gasto digitado.

| Pendência | Situação | O que seria preciso |
|---|---|---|
| Ler gasto e visitas direto da Meta | Gabriel ainda não sabe; fica para quando fizermos todos os KPIs de marketing | **API de Marketing da Meta** com token de permissão `ads_read` e o ID da conta de anúncios; um serviço diário que grave em `marketing_gastos` |
| Google Ads / Analytics (gasto e visitas) | Não decidido | Credenciais da API do Google e o mesmo serviço diário |
| Origem do cadastro (digital × analógico) | Não existe o campo | Pergunta "Como conheceu?" no cadastro + código `?origem=` nos QR codes (proposta na seção 4 de `PROPOSTA_DE_KPIS.md`) |
| Horizonte do LTV | Sem resposta | Definir quantos meses o cliente deve pagar para o LTV valer (hoje 12, provisório) |
| Gasto de eventos e material impresso | Sempre digitado | Não tem API: continua manual |
