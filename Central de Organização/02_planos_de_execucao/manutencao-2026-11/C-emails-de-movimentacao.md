# Ficha da frente C — E-mails: confirmação de compra e de movimentação

```
ID / branch:   C · manut-emails-de-movimentacao   Onda de merge: 2          Migration reservada: 053 (só se precisar)
Item do Rogério: 3            Prazo: 30/11/2026   Base: 9e21fe1
Aceite em uma frase: o cliente recebe um e-mail curto e claro a cada movimentação importante, e o Gabriel sabe quanto isso custa por mês.
```

## Pedido do Rogério (as palavras dele)
"Enviar e-mail de confirmação de compra e movimentação do site (ver quanto custa)."

## Aceite
- [ ] **Custo** (`PESQUISA_CUSTO_EMAIL.md`, com o Específico): preço **de hoje**, com data e página de cada fonte, do provedor atual (Resend) e de duas alternativas (por exemplo Amazon SES e Brevo); **volume mensal estimado** a partir do que o sistema já registra (negociações + depósitos + saques + faturas + envios por mês — leitura `BEGIN READ ONLY`, sem `SET`); **custo mensal projetado** em 3 cenários; recomendação em uma frase. Sem chute: número sem fonte não entra.
- [ ] **E-mails transacionais** (D7): compra, venda, depósito confirmado, saque (pedido, pago, recusado), envio postado e recebido, moeda aceita ou recusada na análise, fatura paga, retirada postada, e o **evento de segurança** da frente A (troca de senha, e-mail ou Pix). Respeita a preferência de notificação do cliente (`toggleNotif`) **nos avisos opcionais**; compra, venda, saque e segurança saem sempre.
- [ ] **Ponto central de disparo:** o e-mail nasce **depois do commit da mutação**, a partir do mesmo diff que já gera o ledger e os pedidos de NFS-e (`src/server/db/derivar.ts`, `diff.ts`) ou de um módulo novo `src/server/emails/` chamado por um único ponto comum. **C não edita Server Action de outra frente.**
- [ ] **Idempotência:** reprocessar o mesmo evento não manda o e-mail duas vezes (chave por evento). **Falha de e-mail nunca derruba a operação** (melhor esforço + registro do erro).
- [ ] Texto em português, curto, marca **Real Olímpico** (masculino), sem token/NFT/cripto/ativo digital/investimento/rentabilidade; **nada sensível**: chave Pix e dados mascarados; link para a conta.
- [ ] Sem `RESEND_API_KEY` (ambiente local) o provedor cai no modo de console de `lib/email/index.ts`. **Diga ao Gabriel, por leitura, se a variável está na Vercel** (ver `docs/RESEND_O_QUE_EXECUTAR_MANUALMENTE.md`); se faltar, entregue o comando pronto e **não** declare a frente pronta sem avisar.
- [ ] Testes: montagem de cada e-mail, idempotência, mascaramento, preferência do cliente.

## Ler (e só isto)
`src/lib/email/README.md`, `index.ts`, `tipos.ts` · `src/server/saques/avisos.ts`, `src/server/mercado/aviso-de-reserva.ts`, `src/server/atendimento/avisos.ts` (os avisos que já existem) · `src/server/db/derivar.ts`, `diff.ts`, `src/server/state.ts` · `src/domain/ledger.ts` (mapa de eventos) · `docs/RESEND_O_QUE_EXECUTAR_MANUALMENTE.md`, `docs/CONFIGURACAO_BRANCH_A_SUPABASE_GOOGLE_RESEND.md` · `account.ts` (**só** `toggleNotif`).

## Touch
`src/lib/email/**` · `src/server/emails/**` (novo) · **um** ponto de gancho central (`derivar.ts`/`state.ts`; se conflitar no merge, o Controle encaixa) · testes novos.

## Do not touch
Server Actions das frentes A, B, H e demais · landing · `src/domain/**`.

## Fora de escopo
Newsletter e e-mail de marketing, WhatsApp, SMS, notificação push.

## Decisões pendentes
**D7** (lista de eventos): a lista acima é o padrão; mudar é editar uma tabela no módulo.

## Tópicos
| T | O quê | Aceite do tópico |
|---|---|---|
| T1 | Custo (Específico) + estimativa de volume por leitura | `PESQUISA_CUSTO_EMAIL.md` |
| T2 | Desenho do ponto central e do catálogo de eventos | MD de execução com o desenho |
| T3 | Módulo `server/emails` + modelos + idempotência | testes verdes |
| T4 | Ligação no ponto central (um gancho) | e-mail sai no ambiente local em modo console |
| T5 | Preferência do cliente + mascaramento + suíte | verde |

## Específico (sim)
Pesquisa de preço dos provedores (data e página). Entrega o arquivo da pesquisa e a recomendação.

## Superfície protegida
Nenhuma esperada. Se o gancho exigir mexer em `state.ts`, **anote**.
