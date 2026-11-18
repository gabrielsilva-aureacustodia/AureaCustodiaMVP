# MD de execução — `claude/manut-primeiro-mes-no-envio-1ff25c` (frente B · primeiro-mes-no-envio)

> Arquivo de trabalho LOCAL: **não se commita** (B2). Vive em `docs/diario/execucoes/` da worktree. Quem executa atualiza a cada tópico fechado (E4). Regras gerais: `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\02_MODELO_DOS_CHATS_DE_BRANCH.md` (seções 3 e 4); ficha: `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\B-primeiro-mes-no-envio.md`.

## RETOMADA
- **Estado:** T1–T5 **feitos** (22:45, hora real). Verificação da B: `eslint` limpo nos arquivos tocados, `tsc` limpo, `vitest` 8 arquivos/82 testes verdes; a suíte inteira roda no merge (bateria do Controle). Conferência visual do wizard: pendente em produção (Controle, pós-deploy). Falta só enviar "FRENTE B PRONTA".
- **Git:** branch `claude/manut-primeiro-mes-no-envio-1ff25c` sobre `9e21fe1`, 0 commits; sem commit nem `git add`. Modificados: `src/app/(app)/envios/page.tsx`, `src/server/actions/custody.ts`, `src/server/actions/plano-custodia.ts`, `src/server/payments/conciliacao.ts`, `src/server/actions/frete-envio.test.ts`, `src/server/payments/conciliacao.test.ts`. Novos não rastreados: este MD (+ LOG/CONTINUIDADE), `pesquisa/B-existe-x-falta.md`, `src/domain/primeiro-mes-do-envio.ts`, `src/components/envios/ResumoDoPagamentoDoEnvio.tsx` e `.test.ts`, `src/server/actions/primeiro-mes-em-toda-compra.test.ts`, `src/server/actions/primeiro-mes-no-envio-recusa.test.ts`.
- **Verificação já feita (de um arquivo/etapa por vez):** vitest `frete-envio`+`plano-custodia`+`conciliacao` (57 verdes), `custodia-da-moeda` (3), `primeiro-mes-em-toda-compra` (10), `ResumoDoPagamentoDoEnvio`+`LinhaCustodiaNaCompra` (7), `primeiro-mes-no-envio-recusa` (5); `tsc --noEmit` limpo depois de TODAS as edições de código (a última passagem terminou com exit 0); eslint limpo nos arquivos tocados. **Incidente (23:30):** disparei em segundo plano tsc + eslint da `src` + suíte inteira em sequência, junto com a chegada do alerta de memória; encerrei a tarefa na hora (TaskStop) — o tsc já tinha acabado (exit 0), o eslint da `src` inteira e a suíte inteira NÃO terminaram e ficam para o T5 liberado. Nenhum processo node dessa worktree ficou de pé.
- **Horas nos logs:** os carimbos de T2 a T5 (22:xx e 23:xx) são **estimados**; a hora real da escrita desta nota é 22:43 (`Get-Date`). Daqui em diante, hora real.
- **Próximo ato:** esperar a liberação do chat de branch; então, UM por vez: `eslint src`, depois `vitest run --maxWorkers=1` (suíte inteira, com `custodia-da-moeda.test.ts`); se cair com erro 1455, registrar aqui e esperar, sem laço. Com os dois verdes, fechar T5 e dizer "FRENTE B PRONTA".
- **Contrato B↔H:** 1º mês = `PlanoCustodia.protocoloEnvio` → fatura `origem:'contratacao'` (`planoId`); H acha tudo por `faturasDoEnvio(state, protocolo)` (`src/domain/primeiro-mes-do-envio.ts`).
- **Quem faz o quê:** chat de branch = `local_ba95c62d-feeb-46f4-8e61-c23fd168feb6` (vigia, não executa) · Execução e Auditoria = ver "Sessões" no fim.
- **Registro vivo (para o Controle):** `C:\Users\Gabriel\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_e259126b-4373-4132-9e89-79edb7fa94ec\registro-B.md` — quem escreve é o chat de branch (o antigo registro\B.md da pasta principal foi abandonado por ordem do Controle).

```
Projeto:           Áurea Custódia / Real Olímpico
Branch:            claude/manut-primeiro-mes-no-envio-1ff25c
Worktree:          C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-primeiro-mes-no-envio-1ff25c
Assignee:          chat de branch B (Execução e Auditoria são filhos)
Packet:            frente B — item 2 do Rogério (11/11/2026)
Ref_commit:        9e21fe1
Aberta em:         2026-11-17
Atualizada em:     2026-11-17 22:46
Prazo:             30/11/2026   Onda de merge: 3 (antes de H)   Migration reservada: 052 (só se precisar)
Estado da branch:  aberta
```

## Aceite

Em uma frase: **quem paga o envio já paga, no mesmo pagamento, o 1º mês de custódia das moedas; e toda forma de compra já cobra o 1º mês.**

Conferido às 22:45 (hora real). ✔ = feito e provado; ✘ = não feito; ◐ = feito com pendência declarada.

- [✔] **T1 — relatório "o que existe × o que falta"**: um teste para cada via de compra (saldo, Pix, cartão, reserva/pré-paga, `buyLot`, `sellToBid`, casamento do motor) confirmando que nasce a fatura paga do 1º mês do **comprador**. Lacuna achada = lacuna fechada ou levada ao Controle. → 10 testes verdes; nenhuma lacuna; relatório em `pesquisa/B-existe-x-falta.md`.
- [✔] **Envio:** o pagamento do envio (frete por saldo, Pix ou cartão) cobra **frete + 1º mês das moedas declaradas** em **uma cobrança** (D4). Valor = quantidade × `custodiaMensalPorMoeda` **da tabela vigente** — nunca número fixo no código. → saldo, Pix e cartão testados; tabela mockada a R$ 3,50 prova que não há número fixo.
- [◐] **Wizard** (`envios/page.tsx`): linhas *Frete* e *1º mês de custódia* (com o sinal (i) da compra, `LinhaCustodiaNaCompra`) e o total. Sem opção de "não contratar" (padrão D4). → escrito e testado por renderização estática (`ResumoDoPagamentoDoEnvio.test.ts`); **conferência visual pendente em produção** (regra do Gabriel: sem servidor local).
- [✔] **Moeda recusada na análise** devolve o 1º mês **daquela** moeda (estorno parcial pelo caminho que já existe — `estornarFaturaPaga` ou equivalente). Envio cancelado/não postado é da frente H. → o caminho que já existia é `alimentarPlanoNaAnalise` (`estornadoCents` + lançamento `estorno`), não `estornarFaturaPaga`; 5 testes (parcial, total, nenhuma, preço pago ≠ preço de hoje).
- [◐] **NFS-e:** segue a regra vigente (nota na data do pagamento da fatura paga; fatura em aberto nunca gera nota). A dúvida "nota no pagamento antecipado ou no aceite?" está escrita como pergunta ao contador no `registro-B.md` (o Controle encaixa em `LACUNAS_E_PERGUNTAS.md`, dono: frente K). → regra vigente mantida, nada fiscal mudou; o estorno por moeda recusada NÃO cancela/ajusta a nota — 3 perguntas ao contador no T4.
- [✔] A regra única (`custodia-da-moeda.ts`) **não muda**: o teste dia a dia dela continua verde. Testes novos de envio com 1º mês; `frete-envio.test.ts` e os de compra atualizados. → arquivo intacto; `custodia-da-moeda.test.ts` 3/3.
- [✔] **Contratos:** B↔H (uma linha no registro dizendo como o 1º mês fica ligado ao protocolo) e B→F (todo movimento de saldo que B criar tem evento que o extrato mostra). → ver T5 e RETOMADA.
- [◐] **Suíte da branch verde** (T5). → verde para os arquivos da B (8 arquivos, 82 testes, `--maxWorkers=1`), `tsc` limpo e `eslint` limpo nos arquivos tocados; a suíte INTEIRA roda no merge, pela bateria do Controle (ordem do chat de branch).

## Ler (e só isto)

Por caminho relativo à worktree, salvo onde indicado. Se precisar abrir algo fora desta lista, **acrescente aqui com o motivo** (E7).

- `CLAUDE.md` — só os itens de Custódia, Ciclo, Compra e "Moeda comprada antes de 21/10"
- `docs/ALTERACOES_2026-11-03_CUSTODIA_REGRA_UNICA.md` e `docs/ALTERACOES_2026-10-21_CUSTODIA_NA_COMPRA.md` — as duas regras que esta frente não pode quebrar
- `src/domain/custodia-da-compra.ts`, `custodia-da-moeda.ts` (**só ler**), `quitar-fatura.ts`, `cobranca-de-entrada.ts`, `plano-custodia.ts`, `ciclo-custodia.ts`
- `src/server/actions/plano-custodia.ts`; `src/server/actions/custody.ts` (`createProtocol`, `cotarFrete*`, `pagarFrete*`, `iniciarPixFrete`, `iniciarCartaoFrete`, `advanceAnalysis`); `payments.ts`; `reserva.ts`; `market.ts`/`sell.ts` (**só leitura**, para os testes de compra)
- `src/server/shipping/frete-envio.ts`, `src/server/payments/conciliacao.ts`, `src/app/(app)/envios/page.tsx` (wizard)
- Testes: `frete-envio.test.ts`, `plano-custodia.test.ts`, `custodia-da-moeda.test.ts`
- `C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\00_MD_EXECUTIVO.md` — só as seções 4 (contratos) e 5 (superfície protegida)

## Touch

- `src/server/actions/custody.ts` (região de envio/frete/plano — **dono**)
- `src/server/actions/plano-custodia.ts`
- `src/server/shipping/frete-envio.ts`
- `src/server/payments/conciliacao.ts` (**só a parte do frete**)
- `src/app/(app)/envios/page.tsx` (wizard)
- os testes acima e arquivos de teste novos
- **Anotado pela Execução (17/11 22:12):** arquivo NOVO `src/domain/primeiro-mes-do-envio.ts` (fora da lista Touch, mas é arquivo novo puro, sem tocar superfície protegida). Motivo: o cálculo/criação do 1º mês do envio é usado por `custody.ts`, `plano-custodia.ts` ('use server' — só exporta async) e `conciliacao.ts`; precisa viver num módulo comum e é o localizador B↔H por protocolo. Também `conciliacao.test.ts` (teste da parte do frete).
- **Anotado pela Execução (17/11 22:55) — aprovado pelo chat de branch (22:41):** componente NOVO `src/components/envios/ResumoDoPagamentoDoEnvio.tsx` (+ `.test.ts`): o resumo Frete + `LinhaCustodiaNaCompra` + Total do passo 4 do wizard. Motivo: peça de desenho pequena, sem estado, só desta frente; o `page.tsx` já é enorme. Testes novos de arquivo próprio: `primeiro-mes-em-toda-compra.test.ts` (T1) e `primeiro-mes-no-envio-recusa.test.ts` (T4).
- **Fora da lista, mas provável** (a Execução anota aqui o motivo **antes** de editar e avisa o chat de branch): `src/domain/quitar-fatura.ts` ou `src/domain/plano-custodia.ts`, se o estorno **parcial** por moeda (T4) não couber em `estornarFaturaPaga`; `src/domain/types.ts`, **só** campo opcional novo, se for inevitável para ligar fatura e protocolo (superfície protegida: anotar).

## Do not touch

- `src/domain/custodia-da-moeda.ts` e o preço de R$ 2,00 — regra única de 03/11/2026; o teste dia a dia dela tem de seguir verde
- `src/domain/fees.ts`, `constants.ts` — superfície protegida
- `src/domain/statement.ts` — é da frente F (B só garante que há evento para o extrato mostrar)
- cancelamento, estorno de envio cancelado e a lista de envios — são da frente H
- `market.ts`/`sell.ts` — são da frente A (aqui só leitura)
- `src/lib/shipping/**` — é da frente K

## Fora de escopo

Mudar o preço; criar renovação de plano; cobrança no dia 1º (**não existe**); mudar a trava por débito; alíquota ou emissão fiscal; cancelar/estornar envio não postado (H); opção "pagar o mês separado" ou "não contratar" (D4 diz obrigatório — se o Gabriel mudar, é uma linha no wizard).

## Decisão adotada (D4, a confirmar pelo Gabriel)

O 1º mês no envio é **obrigatório** e entra no **mesmo pagamento** do frete. Se a moeda for recusada na análise, o mês **dessa** moeda volta ao saldo. A função sai **ligada e funcional** para o Gabriel testar.

## Contratos (cumprir sem exceção)

- **B↔H — tudo o que um envio gerou se acha pelo protocolo.** Frete (`Envio.frete`), plano/fatura do 1º mês (`PlanoCustodia.protocoloEnvio`, fatura de contratação) e NFS-e. B **não cria cobrança do envio que H não consiga localizar pelo protocolo.** Ao fechar T2, a Execução escreve em UMA linha aqui (e o chat de branch a copia para `registro-B.md`) **como** a cobrança do 1º mês fica ligada ao protocolo (campo/relação).
- **B→F — todo movimento de saldo que B criar tem evento que o extrato consiga mostrar** (débito do frete+mês e o estorno por moeda recusada, cada um com descrição própria no ledger/extrato).

## Tópicos

Um tópico `em andamento` por vez. A Execução atualiza este bloco a cada tópico fechado.

### T1 — Testes das vias de compra + relatório "existe × falta"
Estado: **feito** (17/11/2026 22:30)
Aceite deste tópico: relatório escrito em `docs/diario/execucoes/pesquisa/B-existe-x-falta.md` (conclusão no topo) e **um teste por via de compra** — saldo, Pix, cartão, reserva/pré-paga, `buyLot`, `sellToBid`, casamento do motor — provando que nasce a fatura **paga** (`origem:'compra'`) do 1º mês do **comprador**, no valor da tabela vigente. Lacuna = lacuna fechada (se dentro do Touch) ou levada ao chat de branch/Controle (`market.ts`/`sell.ts` são da frente A: B não edita).
Arquivos deste tópico: testes novos (`src/**/*.test.ts` de compra); `docs/diario/execucoes/pesquisa/B-existe-x-falta.md`.
Log:
- 22:24 — `src/server/actions/primeiro-mes-em-toda-compra.test.ts` (novo): 10 testes pelas Server Actions reais — `buyLot`, motor (bid antes e depois da venda), `sellToBid`, pré-paga, Pix, cartão, reserva pós-paga (saldo e Pix). Tabela simulada com custódia a R$ 3,50 (prova que nenhuma via tem número fixo). **10/10 verdes** (`npx vitest run` só desse arquivo).
- 22:30 — relatório `pesquisa/B-existe-x-falta.md` escrito. **Nenhuma lacuna na compra.** Duas observações sem ação (Pix aberto antes de mudar a tabela grava a fatura com a tabela da conciliação; `abrirReserva` aceita `custodiaCents` opcional) — a 1ª vai ao chat de branch (`conciliacao.ts` só na parte do frete).
Próximo ato deste tópico: nenhum. Segue o T2.

### T2 — Cobrança do envio: frete + 1º mês (saldo, Pix, cartão)
Estado: **feito** (17/11/2026 22:50)
Aceite deste tópico: o pagamento do envio por **saldo, Pix e cartão** cobra frete + (quantidade × `custodiaMensalPorMoeda` da tabela vigente, lida de `config`, nunca fixo) **em uma cobrança**; a fatura do 1º mês nasce paga na confirmação, ligada ao protocolo; não há cobrança dupla se o cliente já tinha plano de envio antigo; `alimentarPlanoNaAnalise` continua ligando a fatura às moedas aceitas. Teste por forma de pagamento (`frete-envio.test.ts` atualizado + testes novos). O dinheiro é inteiro em centavos (`Cents`).
Arquivos deste tópico: `custody.ts` (região de envio), `plano-custodia.ts`, `frete-envio.ts`, `conciliacao.ts` (parte do frete), testes.
Log:
- 22:05 — **Desenho.** "Uma cobrança" = a cobrança do saldo/gateway é frete + mês. `Envio.frete.valorCents` continua sendo SÓ o frete (DRE e ledger não misturam frete com custódia). O mês é a fatura `origem:'contratacao'` do plano do envio (`PlanoCustodia.protocoloEnvio`), quitada por `quitarFatura` **na mesma transação** que marca o frete pago. O valor do mês vem de `valorDoPlano('mensal', qtd, taxas)` — tabela vigente de `carregarRegrasDoMercado()`, nunca número fixo.
- 22:12 — **Arquivo de domínio novo** `src/domain/primeiro-mes-do-envio.ts` (puro, sem I/O): `primeiroMesDoEnvio`, `faturasDoEnvio`, `primeiroMesAPagar`, `garantirPrimeiroMesDoEnvio` (cria plano + fatura pendente se o cliente nunca passou pelo passo do plano; idempotente; reprecifica fatura PENDENTE se o total mudou; nunca mexe em fatura paga). Motivo de ser arquivo novo: arquivo `'use server'` só pode exportar função assíncrona, e o mesmo cálculo é usado por `custody.ts`, `plano-custodia.ts` e `conciliacao.ts`.
- 22:20 — `plano-custodia.ts`: `contratarPlanoCustodia` passou a chamar `garantirPrimeiroMesDoEnvio` (mesmo resultado `{faturaId, planoId}`).
- 22:28 — `custody.ts`: `cotarFreteDoEnvio` devolve `primeiroMesCents`, `primeiroMesJaPago`, `totalCents`; `pagarFreteComSaldo` debita frete+mês de uma vez (saldo insuficiente → mensagem diz os dois) e quita a fatura do mês; `iniciarPixFrete`/`iniciarCartaoFrete` abrem a cobrança no gateway pelo **total**, gravando `metadata.primeiroMesCents` na intenção (o mês é congelado no momento da cobrança).
- 22:35 — `conciliacao.ts` (só a parte do frete): `liquidarFreteEnvio` confere `valor === frete + mês cobrado`; se não bater (frete recotado, mês inválido ou não divisível pela quantidade) o pago vira saldo (`frete_recotado_creditado_em_saldo` / `primeiro_mes_invalido_creditado_em_saldo`) e nada é quitado; se bater, frete pago + fatura do mês paga pela forma (pix/cartão) com a referência do gateway; se o mês já estava pago por outro caminho, o mês a mais volta ao saldo (sem cobrança dupla). Depósito gravado pelo TOTAL, `origem:'frete_envio'`.
- 22:45 — Testes: `frete-envio.test.ts` atualizado (25 verdes, incluindo 9 novos do mês — saldo, Pix, cartão, saldo insuficiente, mês já pago, plano de envio antigo, ledger `custodia`+`frete` sem ajuste); `conciliacao.test.ts` ganhou 5 (Pix, cartão, mês congelado na intenção, mês já pago, valor divergente). `plano-custodia.test.ts` passou sem mudança. **Rodados juntos: 3 arquivos, 57 testes verdes.** `custodia-da-moeda.test.ts` (dia a dia): 3/3 verdes. `tsc --noEmit` limpo.
- 22:50 — **Contrato B↔H (linha para o registro):** o 1º mês do envio fica ligado ao protocolo por `PlanoCustodia.protocoloEnvio` → fatura `origem:'contratacao'` com `planoId` do plano; H acha tudo por `faturasDoEnvio(state, protocolo)` (`src/domain/primeiro-mes-do-envio.ts`), em qualquer status. Nenhum campo novo em `types.ts`, nenhuma migration.
- **Ponto aberto para H** (não é do escopo de B): envio desconsiderado/vencido (`desconsiderarEnvio`, `src/domain/envios.ts`) devolve o frete mas **o mês pago continua pago** — H precisa chamar o estorno da fatura de contratação ao cancelar.
Próximo ato deste tópico: nenhum. Segue o T3 (wizard).

### T3 — Wizard com as linhas e o total
Estado: **feito**; conferência visual **pendente em produção** (Controle, após o merge e o deploy) (17/11/2026 23:10)
Aceite deste tópico (ajustado por ordem do Gabriel via Controle — "nada de servidores locais, tudo direto para produção"): `src/app/(app)/envios/page.tsx` mostra *Frete*, *1º mês de custódia* (sinal (i), mesmo componente/linguagem da compra — `LinhaCustodiaNaCompra`) e o **total**; sem opção de "não contratar"; wizard coerente com a compra (mesmas classes `summary-row`/`total` e mesmo componente) + teste do resumo; **conferência visual PENDENTE em produção, depois do deploy (Controle)**. Nenhuma página de conferência temporária foi criada.
Arquivos deste tópico: `src/app/(app)/envios/page.tsx` e, se preciso, um componente novo pequeno.
Log:
- 22:55 — **Passo 3** ("Plano de custódia") deixou de cobrar: saiu o painel "Pagar custódia agora" e o botão "Pagar depois". Ficou o cartão do plano, a garantia (mês das recusadas volta ao saldo — agora verdadeira e testada no T4), a linha `LinhaCustodiaNaCompra` com o valor do mês (quantidade × tabela vigente que a tela já recebe) e a frase "o 1º mês é pago junto com o frete, no próximo passo". Botão único "Continuar para o frete e o pagamento →" (`continuarParaOPagamento`: `contratarPlanoCustodia`, idempotente, e vai ao passo 4). Não existe opção de "não contratar" nem de pagar o mês à parte.
- 23:00 — **Passo 4** (contrato dos Correios): `ResumoDoPagamentoDoEnvio` (componente novo, `src/components/envios/`) mostra Frete, Custódia (1º mês) com o (i) e Total a pagar; `PainelPagamento` cobra `freteDoEnvio.totalCents` (a chave inclui o total). Envio antigo com o mês já pago mostra "já pago" e o total fica só o frete. Tudo vem pronto de `cotarFreteDoEnvio` — a tela não calcula preço nenhum.
- 23:05 — **Sem contrato dos Correios** (cotação `tabela`, ambiente de teste; o frete se paga na agência): não há pagamento único; o mês é a fatura do envio, paga ali mesmo (saldo, Pix, cartão) no bloco "1º mês de custódia". É o único lugar onde o mês pode ficar em aberto — fica registrado como risco: em produção o contrato está ligado.
- 23:08 — Testes: `ResumoDoPagamentoDoEnvio.test.ts` (3: soma, sem checkbox/radio, "já pago") + `LinhaCustodiaNaCompra.test.ts` verdes; `tsc --noEmit` limpo; `eslint` limpo nos arquivos tocados. Imports que ficaram sem uso (`valorDoPlano`, `Esqueleto`, `ModalidadePlanoCustodia`) removidos.
- **NÃO feito — conferência visual.** Regra permanente do Gabriel: sem servidor local, sem preview, sem container; a conferência é em produção, depois do deploy (Controle). Não criei página de conferência temporária, então não há nada a remover. Roteiro para quem conferir em produção: fazer um envio de 2+ moedas até o passo 4 e ver Frete, Custódia (1º mês) com o (i), Total a pagar (= frete + mês) e o painel de pagamento cobrando o total; e o passo 3 sem painel de pagamento nem "Pagar depois".
Próximo ato deste tópico: nenhum (a conferência visual está com o chat de branch). Segue o T4.

### T4 — Recusa na análise devolve o mês daquela moeda
Estado: **feito** (17/11/2026 23:25)
Aceite deste tópico: ao recusar moeda(s) na análise do envio, o 1º mês **dessas** moedas volta ao saldo do cliente (estorno **parcial** da fatura paga, com lançamento `estorno` no ledger; aceitas continuam pagas). NFS-e: nota cancelada/ajustada conforme o caminho que `estornarFaturaPaga` já usa. Teste de recusa parcial e de recusa total. Envio cancelado/não postado não é daqui.
Arquivos deste tópico: `custody.ts` (`advanceAnalysis`), `plano-custodia.ts`, possivelmente `src/domain/quitar-fatura.ts` (anotar o motivo em "Touch" antes), testes.
Log:
- 23:12 — **Achado:** o estorno parcial por moeda JÁ EXISTE e funciona no fluxo novo: `alimentarPlanoNaAnalise` (domínio) soma `recusadas × valorPorMoedaCents` em `plano.estornadoCents` e devolve ao saldo; `derivar.ts` transforma o aumento de `estornadoCents` num lançamento `estorno` ("Estorno de custódia por moedas recusadas na análise", `refInterna` = id do plano). **Nenhum código de produção precisou mudar**; `quitar-fatura.ts`/`types.ts` NÃO foram tocados (nenhuma anotação de Touch necessária). `estornarFaturaPaga` (estorno da fatura INTEIRA + cancela a NFS-e) não serve para devolução parcial e não foi usado.
- 23:20 — `src/server/actions/primeiro-mes-no-envio-recusa.test.ts` (novo, 5 testes, pelas Server Actions e por `fecharAnalise` de verdade, estado em memória): ponto de partida (frete + 3 meses, fatura do mês paga ligada ao protocolo); **recusa parcial 1 de 3** (R$ 2,00 voltam; as 2 aceitas seguem pagas, uma fatura só — a entrada no acervo NÃO emite segunda —, `custodiaImpedeNegociar` falso nas duas, `coberturaAte` no futuro; ledger com 1 `estorno` de R$ 2,00 e nenhum `ajuste`); **recusa total** (R$ 6,00 voltam, plano `cancelado`, nenhuma moeda nem fatura nova, ledger sem `ajuste`); **nenhuma recusada** (nada volta); **devolução pelo preço PAGO** (tabela a R$ 3,50 no pagamento e R$ 2,00 na análise → devolve R$ 3,50). **5/5 verdes.**
- 23:25 — **NFS-e (não é decisão de B):** a nota do mês é emitida no pagamento (regra vigente). O estorno por moeda recusada devolve o dinheiro e o ledger o registra, mas NÃO cancela nem ajusta a nota, e na recusa total a fatura continua `paga` com o plano `cancelado`. Perguntas ao contador (para `registro-B.md`/`LACUNAS_E_PERGUNTAS.md`, dono: frente K): (1) a nota do mês pago no envio deve nascer no pagamento ou no aceite da moeda? (2) moeda recusada: cancelar a nota inteira e reemitir pelas aceitas, ou emitir nota de ajuste só do valor devolvido? (3) na DRE, o estorno entra como redução da receita de custódia do mês do pagamento?
- **Para a frente F:** a linha do ledger do débito do mês é a de sempre ("Custódia mensal AAAA-MM · N moeda(s) — paga", tipo `custodia`, ref = id da fatura); não diz "do envio X". Se F quiser o texto "1º mês de custódia do envio RO-ENV-…", a fatura tem `origem:'contratacao'` e o plano tem `protocoloEnvio` — dá para montar sem mudar nada em B.
Próximo ato deste tópico: nenhum. Segue o T5.

### T5 — Contrato B↔H registrado + suíte da branch
Estado: **feito** (22:45, hora real) — suíte inteira fica para a bateria do Controle no merge
Aceite deste tópico: (a) uma linha, aqui e em `registro-B.md`, dizendo como o 1º mês fica ligado ao protocolo; (b) `npm run typecheck`, `npm test` (a suíte inteira, ou ao menos os arquivos de custódia, compra, frete e plano **e** `custodia-da-moeda.test.ts`) e `npm run lint` verdes; (c) este MD com todos os tópicos `feito` e o aceite marcado; (d) lista das pesquisas/arquivos de teste temporários removidos; (e) diga "FRENTE B PRONTA" ao chat de branch com o estado do Git na primeira linha.
Arquivos deste tópico: nenhum novo.
Log:
- 23:30 — (a) **B↔H registrado** acima (RETOMADA) e já copiado ao `registro-B.md` pelo chat de branch: 1º mês = `PlanoCustodia.protocoloEnvio` → fatura `origem:'contratacao'` (`planoId`), achada por `faturasDoEnvio(state, protocolo)`; plano cancelado (recusa total) se acha pelo protocolo, não por `primeiroMesDoEnvio` (que só vê plano ativo). **B→F:** todo movimento de saldo de B tem evento no ledger: débito do envio = `frete` + `custodia` (fatura paga do mês, mesma transação, sem `ajuste` — provado em `frete-envio.test.ts` e `conciliacao.test.ts`); devolução por moeda recusada = `estorno` "Estorno de custódia por moedas recusadas na análise" (provado em `primeiro-mes-no-envio-recusa.test.ts`).
- 23:30 — (b) `tsc --noEmit` limpo (exit 0, depois de todas as edições). `eslint` limpo nos arquivos tocados. Vitest por arquivo/grupo pequeno: todos verdes (lista em RETOMADA). **Ainda NÃO rodados (alerta de memória, aguardam o chat de branch):** `eslint src` inteiro e `vitest run` da suíte inteira. `npm run build` não é do T5 e não foi rodado.
- 23:30 — (d) Arquivos/páginas temporários: nenhum criado dentro do repositório (saídas de verificação ficaram só no scratchpad da sessão, fora do repo). Nada a remover.
- Pendências que o Controle precisa ver (vão no "FRENTE B PRONTA"): H precisa estornar a fatura de contratação ao desconsiderar/vencer o envio (o frete volta, o mês fica pago); perguntas ao contador sobre a NFS-e do mês (T4); Pix aberto antes de mudar a tabela grava a fatura com a tabela da conciliação (T1) — mitigado: o mês fica congelado na intenção (`metadata.primeiroMesCents`) no envio; cartão do envio é cobrança única (a recorrente fica nas Faturas); sem contrato dos Correios o mês é fatura paga na tela, não junto com o frete; conferência visual em produção.
- 22:45 — **Liberação parcial do chat de branch/Controle:** NÃO rodar `eslint src` nem a suíte inteira (a bateria do Controle faz no merge). Memória conferida antes: 2,0 GB físicos e 5,9 GB virtuais livres (acima do limite de 2 GB). Rodado, um comando por vez: (1) `eslint` só dos arquivos da B → **exit 0, sem nenhuma mensagem**; (2) `vitest run --maxWorkers=1` só dos arquivos da B (`primeiro-mes-em-toda-compra`, `primeiro-mes-no-envio-recusa`, `frete-envio`, `conciliacao`, `server/actions/plano-custodia`, `custodia-da-moeda`, `components/envios`, `LinhaCustodiaNaCompra`) → **8 arquivos, 82 testes, todos verdes**. Sem 1455. `tsc` não foi repetido (limpo desde a última edição de código; nada de código foi editado depois). Nota: `src/domain/plano-custodia.test.ts` (domínio, `alimentarPlanoNaAnalise`) não foi rodado — o código dele não mudou e o comportamento está provado pelo T4.
Próximo ato deste tópico: nenhum. Pedir à Auditoria o LOG final, a CONTINUIDADE, os relatórios e o rascunho R11; enviar "FRENTE B PRONTA" ao chat de branch.

## Sessões

(append-only; correção vira linha nova)

### Sessão 2026-11-17 — branch (abertura)
Tipo: E
Feito: Passo 0 (junção `node_modules`, `.env.local`); base conferida (`9e21fe1`); registro `B.md` criado; este MD escrito.
Não feito: abrir Execução e Auditoria; criar a rotina de 5 min.
Bloqueios para o humano: nada.
Teste rodado? não
Próximo ato (um): abrir a Execução e a Auditoria (mesma worktree, bypassPermissions) e criar a rotina de 5 min.

### Sessão 2026-11-17 — filhos abertos
Tipo: E
Feito: Execução (local_c869252d-91f7-488a-8934-14f6040ea0f8) e Auditoria (local_c46cdbec-31bc-40d2-90da-f1e7ace63dd7) iniciadas pelo Gabriel às 2026-11-17 22:20; rotina de 5 min do chat de branch recriada com esses ids.
Não feito: T1–T5.
Bloqueios para o humano: nada.
Teste rodado? não
Próximo ato (um): Execução começa o T1.
