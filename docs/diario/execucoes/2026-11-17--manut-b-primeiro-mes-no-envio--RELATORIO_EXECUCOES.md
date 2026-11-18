# Relatório de Execuções (detalhado) — frente B · primeiro-mes-no-envio

> Público: próximo agente. Formato de `13_RELATORIOS.md` §1. Escrito pela Auditoria B; não se commita antes do merge (B2). Detalhe de cada tópico: apontar para o MD de execução, não recopiar.

## 1. Cabeçalho
- Projeto: Real Olímpico (AUREA CUSTODIA LTDA) · Branch: `claude/manut-primeiro-mes-no-envio-1ff25c` · Ref_commit: `9e21fe1`
- Packet: frente B, item 2 do Rogério (11/11/2026), prazo 30/11/2026, onda de merge 3 (antes de H) · Migration reservada 052: **não usada**
- Aberta e fechada em 17/11/2026 (T1–T5 `feito` às 22:45, hora real). Git no fechamento: 0 commits, 6 arquivos rastreados modificados, 5 novos (1 domínio, 1 componente + teste, 2 testes de ação).

## 2. Tópicos na ordem real
Detalhe e logs em `2026-11-17--manut-b-primeiro-mes-no-envio--MD_EXECUCAO.md`.
1. **T1 — compra.** 10 testes (um por via: `buyLot`, motor com bid antes/depois da venda, `sellToBid`, pré-paga, Pix, cartão, reserva pós-paga por saldo e por Pix) provam fatura paga `origem:'compra'` do comprador e débito do mês. Tabela simulada a R$ 3,50 prova que não há número fixo. **Nenhuma lacuna na compra.** Relatório `pesquisa/B-existe-x-falta.md`.
2. **T2 — envio, frete + 1º mês numa cobrança.** `Envio.frete.valorCents` continua só o frete (DRE e ledger não misturam); o mês é a fatura `origem:'contratacao'` do plano do envio, quitada por `quitarFatura` na mesma transação. Valor por `valorDoPlano('mensal', qtd, taxas)`, tabela vigente. Saldo, Pix e cartão cobram o total; o Pix/cartão congelam o mês em `metadata.primeiroMesCents`; divergência de valor vira crédito em saldo; mês já pago não é cobrado de novo.
3. **T3 — wizard.** Passo 3 deixou de cobrar (sem "Pagar depois", sem opção de não contratar); passo 4 mostra Frete, Custódia (1º mês) com o (i) e Total, pelo componente novo `ResumoDoPagamentoDoEnvio`. **Conferência visual pendente em produção** (regra do Gabriel: sem servidor local).
4. **T4 — recusa.** O estorno parcial por moeda já existia em `alimentarPlanoNaAnalise` (`estornadoCents` + lançamento `estorno`); nenhum código de produção mudou. 5 testes (parcial, total, nenhuma, preço pago ≠ preço de hoje).
5. **T5 — contrato e verificação.** B↔H e B→F registrados; verificação parcial liberada pelo Controle.

## 3. Arquivos tocados
| Arquivo | Por quê |
|---|---|
| `src/server/actions/custody.ts` | cotação, pagamento por saldo, Pix e cartão do envio passam a cobrar frete + mês |
| `src/server/actions/plano-custodia.ts` | `contratarPlanoCustodia` delega a `garantirPrimeiroMesDoEnvio` (-89 linhas: lógica movida) |
| `src/server/payments/conciliacao.ts` | só a parte do frete: confere frete + mês, quita a fatura do mês |
| `src/app/(app)/envios/page.tsx` | passos 3 e 4 do wizard |
| `src/domain/primeiro-mes-do-envio.ts` (novo) | cálculo e criação do mês; localizador B↔H `faturasDoEnvio` |
| `src/components/envios/ResumoDoPagamentoDoEnvio.tsx` + `.test.ts` (novos) | resumo do passo 4 |
| `src/server/actions/frete-envio.test.ts`, `src/server/payments/conciliacao.test.ts` | testes do mês no envio |
| `src/server/actions/primeiro-mes-em-toda-compra.test.ts`, `primeiro-mes-no-envio-recusa.test.ts` (novos) | T1 e T4 |

## 4. Testes rodados
- Execução: `eslint` só dos arquivos da B, exit 0; `vitest run --maxWorkers=1` em 8 arquivos, **82 testes verdes** (inclui `custodia-da-moeda.test.ts` 3/3); `tsc --noEmit` limpo depois da última edição de código.
- **Não rodados:** `eslint src` inteiro, suíte inteira, `npm run build` → bateria do Controle no merge. Não rodado `src/domain/plano-custodia.test.ts` (código dele não mudou).

## 5. Desvios e incidentes (da Auditoria)
- Desvio leve: 3 arquivos de vitest juntos + `tsc` sob o alerta de memória (pedido: um por vez). Sem consequência.
- Incidente 23:30 (carimbo estimado): tsc + eslint da `src` + suíte em segundo plano com o alerta chegando; a Execução encerrou na hora. Nenhum processo ficou de pé.
- Carimbos de T2–T5 no MD são estimados; a hora real é a do MD (22:43–22:46).
- Confirmado pela Auditoria: 0 commits (B1); nenhum arquivo fora de Touch (domínio e componente novos anotados e aprovados pelo chat de branch); sem migration; `custodia-da-moeda.ts`, `types.ts`, `fees.ts`, `constants.ts` e o preço de R$ 2,00 intactos; sem segredo; sem servidor local.

## 6. Bloqueios e pendências para o humano
1. **Fiscal (Gabriel/contador, K):** a recusa devolve o mês por `estorno` no ledger mas **não cancela nem ajusta a NFS-e do mês**; na recusa total a fatura segue `paga` com o plano `cancelado`. Três perguntas ao contador no T4 (nota no pagamento ou no aceite? cancelar tudo e reemitir ou nota de ajuste? estorno reduz a receita de custódia do mês do pagamento na DRE?).
2. **Para H:** `desconsiderarEnvio` (`src/domain/envios.ts`) devolve só o frete; o mês pago fica pago. H deve estornar a fatura de contratação, achada por `faturasDoEnvio(state, protocolo)`.
3. **Sem contrato dos Correios** (cotação `tabela`, ambiente de teste): o mês é fatura paga na tela, não junto com o frete.
4. **Pix de compra aberto antes de mudar a tabela:** a conciliação usa a tabela de agora; janela de minutos, risco baixo, arquivo fora do Touch.
5. Conferência visual do wizard em produção (Controle, após deploy).
6. Para F: o ledger do débito do mês não diz "do envio X"; `origem:'contratacao'` + `protocoloEnvio` permitem montar o texto sem mudar B.

## 7. Próximo ato (um)
O Controle mescla na onda 3 (antes de H), roda a bateria completa (`eslint src`, `vitest run`, `build`) e confere o wizard em produção.
