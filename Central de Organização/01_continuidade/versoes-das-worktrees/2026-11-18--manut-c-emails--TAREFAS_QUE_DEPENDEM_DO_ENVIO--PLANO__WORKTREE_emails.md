# Tarefas e features que dependem do envio automático de e-mail

Criado em 18/11/2026 pelo chat de branch da frente C, a pedido do Gabriel: "salve em um MD todas as tarefas novas e
features que dependem dos envios de e-mail automáticos; quando eu liberar o registro, fazemos todas".

**Arquivo de trabalho local: não se commita** (regra do Gabriel para plano de execução).

## A palavra "liberar" quer dizer isto

O e-mail real só sai quando as quatro coisas abaixo estiverem de pé. Hoje **nenhuma** está:

| # | O quê | Quem | Estado em 18/11 18:40 |
|---|---|---|---|
| L1 | Colar os 3 registros de DNS de `avisos.realolimpico.com.br` na HostGator | Gabriel ou Rogério | **não colados** (DNS público não responde pelos 3 nomes) |
| L2 | "Verify DNS records" no Resend até ficar *Verified* | Controle (painel do Resend logado lá) | espera L1 |
| L3 | Chave do Resend só de envio, restrita a `avisos.`, e `RESEND_API_KEY` na Vercel; redeploy | Controle (autorizado pelo Gabriel) | espera L2. `EMAIL_REMETENTE` **já existe** |
| L4 | Migration `053_emails_pendentes.sql` aplicada no banco | Controle (antes do push) | **não aplicada** |

Os 3 registros completos estão em `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\registro\DNS_RESEND_avisos.md`
(fora do Git). Só esses 3, todos novos; **sem DMARC e sem MX** (ordem do Gabriel: não mexer à toa no DNS).

Assim que L1 estiver feito, o Gabriel avisa e a frente C reconsulta o DNS na hora.

## Fase 1 — Comprovar que o envio funciona (logo depois de L1–L4)

- [ ] **T1.1** Teste real pelo app: o Gabriel usa "Reenviar" em `/admin/equipe` num membro com o e-mail dele. A tela deve dizer
  "Convite reenviado" e não "Sem RESEND_API_KEY". Conferir caixa de entrada **e spam**; no Resend, a página de e-mails mostra
  entrega, rejeição e spam.
- [ ] **T1.2** Conferir a fila: `aurea.emails_pendentes` (leitura com `BEGIN READ ONLY`, nunca `SET`): linhas novas devem sair de
  `pendente` para `enviado`, e não para `simulado` (simulado = sem chave) nem `falhou`.
- [ ] **T1.3** Logs de runtime da Vercel logo após o teste (o plano Hobby guarda só 1 h; por isso o erro de e-mail também vai para o banco).
- [ ] **T1.4** Registrar o resultado em `registro-C.md` e avisar o Controle em uma linha.

## Fase 2 — Os 12 avisos novos da central (já escritos; passam a sair de verdade)

Catálogo em `src/server/emails/catalogo.ts`. Saem **sempre**: compra, venda, depósito, senha/e-mail/Pix alterados.
Respeitam o botão do cliente (`notifEnvios`): envio postado, envio recebido, moeda aceita, moeda recusada, fatura paga, retirada postada.

- [ ] **T2.1** Provar **um de cada família** em produção, com conta de sócio: compra/venda, depósito, fatura paga, moeda aceita/recusada.
  Conferir que o texto não tem palavra proibida (token, NFT, cripto, ativo digital, investimento, rentabilidade).
- [ ] **T2.2** Conferir que o cliente com `notifEnvios` desligado **não** recebe os opcionais, e que recebe os "sempre".
- [ ] **T2.3** Conferir que o **saque** não duplica: continua só em `src/server/saques/avisos.ts` (pedido, pago, recusado), nada da central.
- [ ] **T2.4** E-mail de **envio postado / recebido** só para `origem = 'envio_postal'` (os "recebidos" de novembro são cadastro sem envio, não geram aviso).

## Fase 3 — Encaixes que ligam avisos que ainda não disparam

| Id | Onde | Falta | Depende de |
|---|---|---|---|
| E1 | `src/server/shipping/rastreios.ts` | aplicado pelo Controle | — |
| E3 | cron do faturamento | aplicado pelo Controle (reenvia os que falharam) | — |
| **E2** | `src/server/actions/admin/logistica.ts`, em `marcarRetiradaPostadaManual`: `await avisarRetiradaPostada(atualizada.id)` | **OK do Gabriel** (Server Action) | — |
| **E4** | frente A, uma linha depois do sucesso: `avisarSeguranca({ tipo: 'senha', ... })` e `avisarSeguranca({ tipo: 'email', ... })` | merge da frente A | A |

- [ ] **T3.1** Aplicar E2 quando o Gabriel disser sim.
- [ ] **T3.2** Aplicar E4 depois que a A entrar na `main`; testar troca de senha e de e-mail com conta de sócio.
- [ ] **T3.3** Aviso de **Pix alterado** sai do diff do estado; confirmar em produção que a troca de Pix dispara o `seguranca_pix`.

## Fase 4 — Features de outras frentes que também precisam de e-mail

- [ ] **T4.1 — Recuperação de senha em produção (frente A).** A frente A anotou o risco: a guarda de `definirNovaSenha` aceita trocar a
  senha sem a atual só se o token registrou `recovery`, `otp` ou `magiclink`. Roteiro de teste pós-deploy: pedir o link, abrir, definir senha, entrar.
  O e-mail da recuperação é do **Supabase Auth**, não do Resend.
- [ ] **T4.2 — Resend como SMTP do Supabase Auth** (opcional, independente do roteiro do Resend):
  `docs/CONFIGURACAO_BRANCH_A_SUPABASE_GOOGLE_RESEND.md`, seção 5. Faz o e-mail de senha e de confirmação de cadastro sair do
  domínio da marca. **Conferir o limite de envios do e-mail padrão do Supabase** antes de contar com ele para volume. Mexe em
  configuração do Supabase: só com decisão do Gabriel.
- [ ] **T4.3 — Código de 6 dígitos por e-mail** para conta que só entra com Google (reautenticação da frente A). Hoje só documentada como
  alternativa; vira realidade se o Gabriel quiser. Precisa de T4.2 ou de envio pelo nosso Resend.
- [ ] **T4.4 — Aviso de reserva pós-paga** (`src/server/mercado/aviso-de-reserva.ts`): o código existe, mas a modalidade está **oculta na tela**
  desde 28/09/2026; só volta a valer quando ela voltar. Conferir o aviso no mesmo teste da Fase 1.
- [ ] **T4.5 — "Você foi adicionado à equipe"** (convite e "Reenviar" no painel): já usa o Resend; é o teste da T1.1.

## Fase 5 — Decisões do Gabriel que destravam código

- [ ] **D1 — E-mail de análise: 1 por moeda ou 1 por envio?** A central avisa **por moeda** (aceita / recusada). Num envio de 10 moedas isso
  são até 10 e-mails. Alternativa: 1 resumo por envio ("3 aprovadas, 1 recusada"). **Falta a decisão** (muda o catálogo e o texto).
- [ ] **D2 — OK do E2** (Server Action de logística).
- [ ] **D3 — Depósito sempre ou respeitando a preferência?** Hoje "sempre" (17/11). Trocar é editar uma linha em `catalogo.ts`.
- [ ] **D4 — Titan Essentials como reserva?** Estudo na seção 2-A de `PESQUISA_CUSTO_EMAIL.md`: serve só para volume pequeno, e o domínio do Titan
  é `aureacustodia.com.br`, não `realolimpico.com.br`. **Não é o principal.** Pergunta que sobra: existe caixa ativa e qual o endereço?
- [ ] **D5 — DMARC em `avisos.`?** Recomendado, opcional; o Gabriel disse para não mexer. Fica para depois, só se ele quiser.

## Fase 6 — Custo e acompanhamento

- Hoje: **R$ 0**. Cerca de 130 e-mails por mês, pico até 37 por dia. Plano grátis do Resend: 3.000 por mês e 100 por dia.
- [ ] **T6.1** Reconferir o plano atual do Resend na própria tela (o documento de setup de 02/09 dizia "3 mil por mês").
- [ ] **T6.2** Gatilho para o Pro (US$ 20, cerca de R$ 115,70 por mês): pico acima de 100 e-mails por dia **ou** mês acima de 3.000. Reavaliar após
  1 mês de envio real.

## Candidatas (ninguém decidiu; só entram se o Gabriel quiser)

- Enviar a **NFS-e** (nota de custódia, comissão) por e-mail ao cliente. A ficha da frente G cita "se o Gabriel quiser depois".
- Painel da equipe com o **estado da fila** de e-mails (enviado, falhou, simulado). Conferir antes se algum painel já mostra.
- Novo tipo de aviso (vencimento de custódia próximo, por exemplo): é **regra de cobrança**, então só com o Gabriel.

## Fora do alcance (decisão já tomada)

Newsletter e marketing, WhatsApp, SMS, push. Nenhuma regra de negócio, taxa, cobrança ou fiscal muda por causa do e-mail.

## Higiene depois do merge

- A worktree da C (`manut-emails-de-movimentacao-c46333`) tem `.next/` do build que a Execução rodou; é ignorado pelo Git. Limpar na higiene pós-merge.
- Os três filhos da C (`c-execucao`, `c-especifico`, `c-auditoria`) estão parados e podem ser arquivados.
- Qualquer código novo parte da `main` atual, não da worktree da C, e todo commit passa pelo Controle.
