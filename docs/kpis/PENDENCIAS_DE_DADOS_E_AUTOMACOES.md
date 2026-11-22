# KPIs do conselho — o que ficou sem cálculo e o que faltaria

```
Data:   22/11/2026 · T5 (Manutenção 22-11)
Regra:  só o que sai do banco do site foi calculado. Nada depende de conexão externa.
        Onde falta dado, o painel mostra "—" e explica; nenhum número é inventado.
Onde:   painel → Gestão → Indicadores → KPIs do conselho (/admin/resultados/kpis?aba=conselho)
```

## 1. CAC × payback

| O que ficou sem cálculo | Dado que falta | De onde viria | Automação nova |
|---|---|---|---|
| CAC, payback, LTV÷CAC **quando ninguém lançou o gasto** dos dias (aparece "—") | Quanto se gastou em anúncio, evento e material | Hoje: digitado na aba "Gasto de marketing". Automático: **API de Marketing da Meta** (gasto por dia da conta de anúncios; precisa de token com permissão `ads_read` e do ID da conta de anúncios) e API do Google Ads | Um serviço diário que lê o gasto da Meta/Google e grava em `marketing_gastos` (a mesma tabela da digitação). Eventos e material impresso continuam digitados |
| Visitas ao site (funil visita → cadastro, aba Aquisição) | Visitas por dia | Gerenciador de Anúncios da Meta (cliques/visitas) ou Google Analytics | Mesma leitura diária da API |
| CAC por origem (digital × analógico) | De onde veio cada cadastro | O cadastro não tem o campo | Pergunta "Como conheceu?" + código `?origem=` nos QR codes (proposta na seção 4 de `PROPOSTA_DE_KPIS.md`) |

Com gasto lançado, CAC e payback saem sozinhos. **Padrão provisório:** custódia de R$ 2,00 por moeda por mês, LTV de 12 meses.

## 2. Margem por moeda captada

| O que ficou sem cálculo | Dado que falta | De onde viria | Automação nova |
|---|---|---|---|
| Custo real dos Correios por moeda | O valor que a Áurea de fato paga (a fatura dos Correios) | Hoje: **parâmetro digitado** em Configuração (padrão R$ 25,00; contrato novo em avaliação). Automático: fatura/extrato do contrato dos Correios (API CWS já usada para o frete) | Ler o faturamento do contrato e ratear por envio; só vale a pena depois do contrato novo fechar |
| Comissão ligada à moeda captada | Qual moeda foi vendida em cada negociação | A negociação não guarda o código da moeda | Gravar o código da moeda em cada negociação (mudança em `types.ts`/banco, superfície protegida: precisa de decisão) |
| Outros custos (embalagem, pessoal, cofre) | Valores | Contador / Gabriel | Novos parâmetros ou lançamentos; fora desta rodada |

## 3. Conversão de clientes pagantes

Calculado por inteiro com dados do banco (cadastro → 1ª transação → moeda depositada → custódia paga). Nada falta, exceto separar por origem do cadastro (mesma automação da origem, acima).

## 4. Inadimplência e churn

| O que ficou sem cálculo | Dado que falta | Automação nova |
|---|---|---|
| Churn "de verdade" (cliente que parou de pagar e foi embora) | O sistema não guarda a data em que alguém deixa de ser cliente | Registrar o encerramento da conta ou o fim do último ciclo pago. Enquanto isso, churn = pedido de retirada |
| Churn de moedas no início do período é **estimativa** | Foto do número de moedas na custódia no começo de cada mês | Um fechamento mensal que guarde essa contagem |

## 5. Liquidez e GMV

GMV, comissão, giro e % anunciado saem do banco. "Anúncios que venderam" e "tempo até a venda" dependem do histórico da fila (migration 015); se o banco não o tiver, aparece "—". Nenhuma automação externa.

## Perguntas ao Gabriel (uma por linha, com o padrão usado até a resposta)

1. Qual o custo logístico real por moeda? *Padrão: R$ 25,00, só envio postal, editável em Configuração.*
2. Payback e LTV usam só a custódia ou também comissão? *Padrão: só custódia, preço de hoje.*
3. Horizonte do LTV? *Padrão: 12 meses, sem churn nem desconto.*
4. "Cliente pagante" é quem depositou moeda ou quem pagou custódia? *Padrão: depositou moeda aprovada; "pagou custódia" aparece à parte.*
5. Churn é medido pela retirada, dentro do período do filtro? *Padrão: sim; venda no mercado não conta.*
6. Vale automatizar o gasto pela API da Meta (token `ads_read` + ID da conta de anúncios)? *Padrão: digitado.*
7. Gravar o código da moeda em cada negociação para ligar comissão à moeda? *Padrão: comissão à parte, "por moeda negociada".*
8. A lista final do WhatsApp de 3/11 tem KPI além dos 5 do slide 3.1? *Padrão: só os 5.*
