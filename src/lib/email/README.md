# `src/lib/email/` — e-mail transacional

O primeiro envio de e-mail do projeto, criado em 22/09/2026 junto com a oferta
de compra pós-paga.

## Por que existe

No pós-pago, quando a oferta de compra casa com uma venda, o comprador tem
**dez minutos** para pagar antes de a moeda voltar ao mercado. Dez minutos sem
aviso é o mesmo que prazo nenhum: a pessoa não está com a tela aberta. Daí o
e-mail.

## Como escolhe o provedor

Igual a `src/lib/mensageria/` e a `src/server/store/`: **o ambiente decide, sem
interruptor**.

| Variável | Efeito |
|---|---|
| `RESEND_API_KEY` | usa o Resend |
| `EMAIL_REMETENTE` | opcional; o padrão é `Real Olímpico <nao-responda@realolimpico.com.br>` |

Sem `RESEND_API_KEY`, atende o **registro local**: escreve a mensagem no log do
servidor e devolve `simulado: true`. É o estado de hoje — nenhuma das duas
variáveis está cadastrada na Vercel.

**Nada para de funcionar por falta de credencial.** O pós-pago continua valendo
e o prazo continua correndo; quem chamou sabe que o aviso não saiu porque o
resultado diz, e não porque a operação falhou.

## Como usar

```ts
import { enviarEmail } from '@/lib/email'

const r = await enviarEmail({
  para: 'cliente@exemplo.com',
  assunto: 'Sua compra está reservada',
  texto: 'Você tem 10 minutos para concluir o pagamento.',
})
if (!r.ok) console.warn('aviso não saiu:', r.erro)
```

Falha de envio **nunca** derruba a operação que pediu o aviso. Quem chama trata
`ok: false` como "não avisei", jamais como "não vendi".

## Por que não o Supabase

O Supabase só manda e-mail de autenticação — convite, link mágico, recuperação
de senha —, com os templates dele. Aviso de prazo de pagamento não é nenhuma
dessas coisas.

## Para ligar de verdade

1. Criar a chave em <https://resend.com/api-keys>.
2. Verificar o domínio `realolimpico.com.br` no Resend (senão o envio sai como
   spam ou é recusado).
3. Cadastrar `RESEND_API_KEY` na Vercel.

Enquanto isso não acontece, o registro local cobre o desenvolvimento e o
comportamento do produto é o mesmo.
