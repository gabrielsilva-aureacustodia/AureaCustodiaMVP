# `src/components/custody/` — a custódia na tela do cliente

Tudo o que o dono da moeda vê sobre a guarda dela: o envio, o aviso de débito,
o resumo do plano e as faturas.

## Os arquivos

| Arquivo | O que é |
|---|---|
| `WizardSteps.tsx`, `PhotoSlot.tsx`, `Timeline.tsx` | o passo a passo do envio e o acompanhamento dele |
| `HistoricoEnvios.tsx` | a lista de envios anteriores |
| `AvisoDebitoCustodia.tsx` | a faixa de alerta — **só aparece quando há fatura em aberto** |
| `ResumoDaCustodia.tsx` | o cartão de custódia — **aparece sempre que há acervo** |
| `FaturasCustodia.tsx` | a tela de cobranças e pagamento (`/conta/faturas`) |
| `useBloqueioPorPendencia.ts` | consulta se a conta está bloqueada por dívida vencida |

## Aviso e Resumo não são o mesmo bloco

Parecem, e por isso vale dizer a diferença. O **aviso** é vermelho, fala de
dívida e some quando não há nenhuma. O **resumo** é permanente e responde três
perguntas que ninguém tinha onde responder antes de 25/09/2026: quanto custa
por mês, quando vence a próxima cobrança, e quanto já foi pago.

Quem só tem o aviso vê a custódia apenas quando ela dá problema — foi
exatamente a reclamação que originou o resumo. Os dois convivem: o aviso chama
atenção, o resumo informa.

## Onde o resumo aparece

Em **Meus recibos** e em **Minha conta**, nas duas telas onde o cliente já olha
o acervo. O botão "Ver plano e extrato" leva a `/conta/custodia`, que tem o
extrato do que já foi pago, o preço e a data da próxima cobrança, e o
cancelamento da assinatura.

## A conta é uma só, e mora no domínio

`resumoDaCustodia`, em `src/domain/custodia-do-cliente.ts`. Três telas usam o
mesmo cálculo porque repetir a soma em cada uma é como os cartões de plano
divergiram entre si em 21/09 — um com selo, outro sem, na mesma tela.

**A mensalidade multiplica o ACERVO pela tarifa, não soma os planos.** Moeda
sem plano paga o ciclo mensal pelo mesmo preço, então quem olhasse só os planos
veria R$ 2,00 tendo onze moedas guardadas.

## Cancelar o plano não encerra a guarda

E a tela diz isso, em vez de deixar a descoberta para a fatura seguinte. O
cancelamento para a **cobrança recorrente no cartão**; a moeda continua no
armazém e continua sendo cobrada mês a mês por fatura. Quem quer encerrar a
custódia de verdade pede a retirada física, e o link para ela está no próprio
aviso de confirmação.
