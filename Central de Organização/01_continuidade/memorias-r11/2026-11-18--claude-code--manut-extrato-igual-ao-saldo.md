# Extrato igual ao saldo (frente F) — memória do agente

- **Data:** 2026-11-18 · **Agente:** claude-code (chat de branch, executou sozinho) · **Projeto/branch:** aurea-custodia / claude/manut-extrato-igual-ao-saldo-51a2a8

## 1. Estado em uma tela
O extrato do cliente (`userStatement`) passou a **fechar com o saldo**: soma dos impactos das linhas = saldo da conta, com a coluna "Saldo depois" e o mesmo número da barra superior. Código e testes por arquivo prontos (eslint limpo; vitest de 3 arquivos verde), **0 commits**; sem migration; typecheck, build e suíte inteira são do Controle no merge.

## 2. Decisões e o porquê
- Cada fato que mexe no saldo vira linha **pela regra do livro-razão**: fatura paga sempre sai do saldo (saldo, Pix ou cartão — a entrada do Pix é linha própria e as duas se anulam), frete pago sai, taxa de retirada paga sai, estornos voltam (frete, 1º mês, plano, saque recusado).
- O que o `AppState` não registra (ajuste da equipe, saldo anterior) vira **uma linha no começo**, "Saldo anterior e ajustes feitos pela equipe". O ajuste só existe no ledger e no `audit_log`.
- **Não ler o ledger direto no extrato do cliente:** a descrição dele leva o nome da contraparte, e a decisão de 10/09/2026 proíbe um cliente ver o nome de outro.
- Reserva = oferta de compra pré-paga aberta + saque a caminho do banco; `resumoDaConta` é a conta única do topo e do extrato (disponível + reserva = total).
- Mesmo segundo: entrada antes da saída, para o saldo corrente nunca passar por um negativo que a conta nunca teve.

## 3. O que aprendi
- O extrato antigo **fechava por coincidência** em vários casos (frete por Pix + estorno, fatura por Pix + estorno): a soma batia sem o cliente ver nenhuma das duas linhas. Teste de invariante tem de partir de fatos reais, não de saldo escrito à mão.
- O teste antigo somava o saldo inicial por fora e só tinha depósito e venda; por isso nunca pegou frete, retirada, estorno nem ajuste.
- Os liquidadores da conciliação (`LIQUIDADORES`) são chamáveis direto em teste (`vi.mock('server-only')`), sem store nem rede.

## 4. Como continuar
- **Depois do merge de qualquer frente que crie ou devolva dinheiro, reexecutar** `npx vitest run src/domain/statement-invariante.test.ts`. Evento novo que mexe no saldo = cena nova nesse arquivo + linha em `statement.ts`.
- Conferência visual em produção: `/conta/extrato` de uma conta de sócio — a última linha "Saldo depois" igual ao saldo do topo, em 320–430 px e no desktop.

## 5. Pendências e riscos
- **Oferta de compra pré-paga:** o estado só guarda o valor ainda preso (`pagoAntecipadoCents`); o Pix dela não grava `Deposit` e o `Trade` não diz a modalidade. O preso vira "Em reserva", o já gasto cai na linha de ajuste (o ledger também fecha com `ajuste`). Fechar de vez exige `Deposit` com `origem:'oferta_prepaga'` e a modalidade no `Trade` (types.ts + conciliação): decisão para depois.
- A data do estorno de fatura paga não é gravada no estado: vem do envio cancelado/desconsiderado, ou um segundo depois do pagamento.
- O relatório administrativo de extratos e a ficha do usuário usam as linhas novas, mas não ganharam a coluna "Saldo depois".

## 6. Ligações
- Análise: `docs/diario/execucoes/2026-11-18--manut-f-extrato-igual-ao-saldo--ANALISE_EXTRATO_X_SALDO.md` · MD de execução: `…--MD_EXECUCAO.md`.
- Código: `src/domain/statement.ts`, `src/domain/statement-invariante.test.ts`, `src/app/(app)/conta/extrato/page.tsx`, `src/components/shell/Topbar.tsx`, `src/lib/export/statement-export.ts`.
- Relacionadas: frentes B e H (1º mês e cancelamento de envio, que o teste cobre), `docs/TERMINOLOGIA_CONTABIL_LIVRO_RAZAO.md`.
