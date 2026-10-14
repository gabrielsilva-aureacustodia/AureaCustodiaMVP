# Saque por Pix pelo Mercado Pago — como ligar

Escrito em 14/10/2026, depois do saque do Sidnei (R$ 196,00) que zerou o saldo e ficou parado: a
solicitação era gravada, mas não havia fila, botão nem integração. O desenho está no código
(`src/server/saques/`, `src/lib/payments/payouts*.ts`); este arquivo é o **passo a passo do que só o Gabriel
pode fazer** e o que cada tela faz.

## Como funciona hoje (sem configurar nada)

1. O cliente pede o saque. O valor total (líquido + tarifa de R$ 5,00) **sai do saldo na hora** e fica
   reservado. O cliente vê o prazo D+3 e recebe um e-mail de confirmação.
2. A equipe recebe um **e-mail** (quem tem `saques.pagar`) e um **alerta** no painel inicial.
3. Em `/admin/saques` (e no Financeiro, no painel inicial e na ficha do cliente) a equipe escolhe:
   - **Aprovar e enviar Pix** — só aparece com o envio automático ligado (abaixo);
   - **Marcar como pago** — fez o Pix por fora (app do banco, painel do Mercado Pago) e registra o comprovante;
   - **Recusar** — devolve o valor total ao saldo e o motivo vai por e-mail ao cliente.
4. Pago ou recusado, o cliente recebe um e-mail.

Quem pode: `saques.ver` (ver a fila) e `saques.pagar` (aprovar, pagar por fora, recusar). O papel Sócio recebe
as duas pela migration 041; o Desenvolvimento tem todas.

## Ligar o envio automático (API de Payouts)

A API é `POST https://api.mercadopago.com/v1/payouts` (documentação: *Payouts → Transferências*). Ela só
funciona na conta Mercado Pago que for a **origem do dinheiro** — a da empresa, onde o saldo dos clientes está.

### 1. Teste primeiro (sandbox)
- Em "Suas integrações", use as **credenciais de teste** da aplicação (`MP_ACCESS_TOKEN_TEST`).
- Na Vercel: `MP_PAYOUTS_ATIVO=true` e **não** coloque `MP_SANDBOX=false`.
- Em teste o painel mostra "Envio em modo de TESTE (sandbox): nenhum dinheiro real sai". Faça um saque de
  mentira, aprove e use **Conferir**.

### 2. Produção
1. **Gerar o par de chaves** (no PowerShell do Gabriel, numa pasta fora do repositório):

   ```powershell
   openssl genpkey -algorithm ed25519 -out mpprivate.pem
   openssl pkey -in mpprivate.pem -pubout -out mppublic.pem
   ```

2. **Entregar a chave PÚBLICA** (`mppublic.pem`) ao **time de Integrações do Mercado Pago** (pelo contato
   comercial/suporte técnico da conta — a documentação diz que é por aí e não indica formulário). Sem isso o
   Mercado Pago recusa todo envio em produção. A chave **privada** (`mpprivate.pem`) nunca sai da sua máquina
   e nunca vai para o repositório.
3. **Ativar as credenciais de produção** da aplicação (Suas integrações → Dados da integração → Credenciais →
   Produção → Ativar), se ainda não estiverem.
4. **Variáveis na Vercel** (Production):

   | Variável | Valor |
   |---|---|
   | `MP_PAYOUTS_ATIVO` | `true` |
   | `MP_SANDBOX` | `false` |
   | `MP_ACCESS_TOKEN` | o token de produção (já existe) |
   | `MP_PAYOUT_PRIVATE_KEY` | o conteúdo de `mpprivate.pem`, colado inteiro (com as linhas `-----BEGIN/END PRIVATE KEY-----`). Se a Vercel não aceitar quebra de linha, troque cada quebra por `\n`. |
   | `NEXT_PUBLIC_APP_URL` | `https://aurea-custodia-mvp.vercel.app` (para o aviso de status voltar para nós) |

5. **Saldo na conta de origem.** O Mercado Pago só envia se houver saldo disponível; sem saldo, a transação
   volta com erro e o saque volta para a fila.
6. Faça o **primeiro saque real com valor baixo** (R$ 6,00: R$ 1,00 líquido) para a sua própria chave Pix,
   aprove e confira.

### O que o painel faz quando o Mercado Pago responde
| Resposta | O que acontece com o saque |
|---|---|
| Pedido aceito (202) | `Enviado ao banco — aguardando confirmação`. Use **Conferir** ou espere o aviso. |
| Transação `success` | `Pago`, com o id da transação como comprovante; o cliente recebe e-mail. |
| Transação `error` / `canceled` | Volta para a fila com o motivo do Mercado Pago. **O dinheiro não é estornado sozinho**: a equipe corrige a chave e tenta de novo, ou recusa. |
| Recusa clara do pedido (4xx) | Volta para a fila, nada saiu. |
| Resposta incerta (rede, 5xx) | Fica `em processamento` com o aviso "confira o painel do Mercado Pago". **Reenviar** usa a mesma chave de idempotência (não paga duas vezes); **Marcar como pago** só se o Pix saiu por fora. |

## O que impede de pagar duas vezes
- O saque é gravado como `em processamento` **antes** de chamar o Mercado Pago: dois cliques ou duas pessoas
  encontram o estado já trocado.
- A referência do envio (que é a chave de idempotência) é o id do saque; uma nova tentativa depois de recusa
  clara ganha `-T2`, `-T3`…
- "Marcar como pago" é recusado enquanto houver envio em andamento no Mercado Pago.
- Recusar é recusado em `em processamento` (o dinheiro pode já ter saído) e em `pago`.

## Riscos e limites que ficam
- O aviso de status do Mercado Pago **não é assinado** (RA-58): a rota só aponta, e a consulta decide.
- O Pix é enviado ao **valor líquido** cadastrado no pedido, para a chave do cadastro. A chave é conferida contra o
  tipo (CPF, e-mail, telefone, aleatória) antes de enviar; chave estranha trava o envio.
- Conferir se a chave pertence ao titular da conta (mesmo CPF) **não é feito** pelo sistema: é a equipe quem olha
  na fila antes de aprovar.
