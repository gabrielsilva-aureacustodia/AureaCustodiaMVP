# `src/components/admin/registros/` — gestão de registros pelo painel

Os botões de **editar** e **excluir** de anúncios de venda, ordens de compra,
envios e planos de custódia.

## Por que existe

Até 23/09/2026, apagar uma oferta publicada por engano ou um envio que o
cliente desistiu de fazer exigia escrever um script `.cjs` e rodá-lo contra o
banco de produção. Aconteceu três vezes em três dias. As razões que o Gabriel
citou — pedido de cliente, erro de sistema, teste de função — recorrem, então
virou função do Admin.

## Onde aparece

| Tela | Registro |
|---|---|
| Ficha do cliente › Mercado | anúncios de venda e ordens de compra |
| Ficha do cliente › Logística | envios |
| Ficha do cliente › Financeiro | planos de custódia |
| `/admin/logistica` | envios de todas as contas |

## Como está organizado

`AcoesDoRegistro.tsx` tem a dupla de botões, a confirmação e a leitura de
permissão. `index.tsx` tem um wrapper por tipo de registro.

**Um componente por tipo, e não um só com a ação por propriedade**, porque as
abas e a página de Logística são Server Components: função não atravessa a
fronteira servidor → cliente como propriedade. Cada wrapper é um Client
Component que importa a própria Server Action e recebe só o identificador.

## Permissões

- `registros.editar` — corrigir preço de anúncio, quantidade de envio, cancelar plano
- `registros.excluir` — apagar anúncio, ordem, envio ou plano (irreversível)

Separadas de propósito: corrigir o preço de um anúncio é rotina de atendimento;
apagar o registro tem outra gravidade. Quem pode uma coisa não precisa poder a
outra.

Esconder o botão é conveniência de tela. A recusa de verdade está em
`src/server/actions/admin/registros.ts`, que confere a permissão por conta
própria e grava a trilha em `audit_log`.

## O que as ações se recusam a fazer

**Apagar envio que já virou acervo.** `protocoloEnvio` entra na fórmula do hash
da análise, então apagar o envio de uma moeda já analisada deixaria o laudo
apontando para um protocolo inexistente — sem quebrar a corrente, ou seja, um
furo que a auditoria não pegaria. Esvaziar o acervo primeiro é decisão de quem
opera.

**Apagar plano com fatura já paga.** Dinheiro que entrou continua no
livro-razão. O caminho ali é estorno, não exclusão.

## Detalhes que parecem escolha de estilo e não são

**Editar o preço rebaixa o anúncio na fila**, igual a quando o próprio cliente
edita (decisão F-3). Se a correção pelo painel não rebaixasse, o atendimento
viraria um jeito de furar fila.

**Anúncio é tratado por lote, não por oferta.** O livro guarda uma `SellOffer`
por moeda, mas o anúncio existe como uma linha com N moedas para quem publicou
e para quem olha o painel. Apagar uma oferta só deixaria um anúncio pela
metade.

**Confirmação inline, sem modal.** Em tabela com dezenas de linhas, o que
importa é ficar claro QUAL registro vai sumir — e a modal perde isso.
