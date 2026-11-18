# MD de execução — frente F · extrato igual ao saldo (item 15 do Rogério)

```
Branch:    claude/manut-extrato-igual-ao-saldo-51a2a8        Base: main = 0f55132 (já com I, D, C, B, E, H e A)
Worktree:  C:\dev\AureaCustodiaMVP\.claude\worktrees\manut-extrato-igual-ao-saldo-51a2a8
Ficha:     C:\dev\AureaCustodiaMVP\docs\manutencao-2026-11\frentes\F-extrato-igual-ao-saldo.md (fora do Git)
Sessões:   chat de branch executou sozinho (sem Execução/Auditoria/Específico): ordem do Controle de 18/11 — memória do computador no limite
Estado:    PRONTA PARA MERGE (testes: ver "Testes da branch")        Commits: 0 (o Controle commita)
```

## RETOMADA

1. Se você é um agente novo: leia a **ANALISE_EXTRATO_X_SALDO.md** (mesma pasta) e depois `src/domain/statement.ts` (o cabeçalho explica o invariante).
2. O invariante: **soma dos impactos das linhas = saldo da conta**, e `saldoApos` de cada linha é a soma acumulada. Quem o guarda é `src/domain/statement-invariante.test.ts`
   (17 cenas, todas montadas pelos caminhos reais do produto). **O Controle o reexecuta depois do merge das frentes B e H.**
3. Nada foi commitado. Typecheck completo, build e suíte inteira **não rodaram** (ordem do Controle: memória). Só `eslint` dos 7 arquivos de código e `vitest` de 3 arquivos, um por vez.
4. Conferência visual (320–430 px e desktop): **só em produção**, depois do deploy do Controle — `/conta/extrato` de uma conta de sócio: a última linha "Saldo depois" tem de ser igual ao saldo do topo.

## Aceite (ficha)

- [x] **Análise** `ANALISE_EXTRATO_X_SALDO.md`: 25 eventos × o que o extrato mostrava, com exemplo numérico; 5 defeitos (faltam saídas, faltam estornos, falta a conta inteira, sem "saldo depois", reserva sem lugar).
- [x] **Teste de invariante** `statement-invariante.test.ts`: 17 cenas; **vermelho 17/17 antes do código**, verde depois. Cobre: depósito, compra, venda, compra direta por Pix, frete por saldo e por Pix, frete devolvido, **1º mês + frete por Pix e cancelamento do envio (B e H)**, 1º mês + frete com saldo e cancelamento, fatura por saldo/Pix/cartão, fatura estornada (`estornarFaturaPaga`), estorno do plano na análise, taxa de retirada por saldo e Pix, saque a caminho/pago/recusado, ajuste da equipe, `custodia_recebida_fora`, oferta pré-paga, e o cabeçalho (`resumoDaConta`).
- [x] **Extrato com "Saldo depois"** e, no cabeçalho, o mesmo número do topo (`resumoDaConta.disponivel` = `me.balance`). **Reserva** (oferta pré-paga aberta + saque a caminho) como linha própria e como Total = Disponível + Em reserva, **nos dois lugares**: cabeçalho do extrato e barra superior (só aparece quando há reserva).
- [x] **Linguagem de cliente:** "Frete do envio RO-ENV-0007 (PAC) com o saldo", "Estorno do frete do envio …: o envio não foi postado", "Retirada física da moeda RO-000042: taxa por Pix", "Saque de recursos (SAQ-…): recusado", "Saldo anterior e ajustes feitos pela equipe", "Estorno da custódia: …". O status técnico do saque (`solicitado`, `em_processamento`) saiu da tela.
- [x] **Exportações:** CSV e XLSX trazem a coluna `Saldo_Depois` e (XLSX, aba Resumo) saldo disponível, em reserva e total. Não existe PDF do extrato.
- [~] **`npm run typecheck`, `npm test` ao fim:** **do Controle, no merge** (ordem de 18/11). Rodei só eslint (0 problemas) e vitest de 3 arquivos (17 + 5 + 4 verdes).

## Ler / Touch / Do not touch

- **Ler:** CLAUDE.md, `statement.ts` e testes, `conta/extrato/page.tsx`, `Topbar.tsx`, `types.ts`, `ledger.ts` (mapa), `derivar.ts`, `conciliacao.ts` (para reproduzir os liquidadores no teste), `quitar-fatura.ts`, `envios.ts`, `cancelar-envio.ts`.
- **Touch usado:** `src/domain/statement.ts`, `statement.test.ts`, `statement-custodia.test.ts`, `statement-invariante.test.ts` (novo), `src/app/(app)/conta/extrato/page.tsx`, `src/components/shell/Topbar.tsx`.
- **Fora da lista Touch, tocados (aditivos, anotados):** `src/lib/export/statement-export.ts` (coluna e resumo: é o aceite "exportações"), `src/styles/shell.css`, `responsive.css`, `account.css` (3 regras novas para a coluna e a linha de reserva).
- **Do not touch (respeitado):** `ledger.ts`, `types.ts`, Server Actions, `derivar.ts`, nada de B/H.

## Tópicos

| T | Estado | Evidência |
|---|---|---|
| T1 análise | feito | `…ANALISE_EXTRATO_X_SALDO.md` |
| T2 invariante vermelho | feito | 17/17 falharam antes do código (frete Pix: +11,60 × saldo 0; 1º mês + frete Pix: +21,60 × saldo 0…) |
| T3 `userStatement` + reserva + totais | feito | 17/17 verdes; `statement.test.ts` 5 e `statement-custodia.test.ts` 4 atualizados e verdes |
| T4 tela | feito no código; **visual só em produção** | `page.tsx`, `Topbar.tsx`, CSS; eslint limpo |
| T5 exportações + suíte | feito no código; **suíte inteira é do Controle** | `statement-export.ts`; vitest de 3 arquivos verde |

## Decisões desta frente (reversíveis; ninguém precisa decidir agora)

1. **Fatura paga SEMPRE sai do saldo** (saldo, Pix ou cartão), como o livro-razão; a entrada do Pix aparece como linha própria e as duas se anulam. Alternativa (juntar as duas em uma linha de impacto zero) exigiria casar entrada e saída por valor/hora: frágil.
2. **O que o estado não explica vira UMA linha no começo** ("Saldo anterior e ajustes feitos pela equipe"). O ajuste da equipe só existe no ledger e no `audit_log` (não no `AppState`); ler o ledger direto vazaria o nome da contraparte (decisão de 10/09/2026).
3. **Reserva = oferta pré-paga aberta + saque a caminho do banco.** O saque já saiu do disponível no pedido (continua assim); a reserva só o mostra como "a caminho".
4. **Mesmo segundo: entrada antes da saída**, para o saldo corrente nunca passar por negativo que a conta nunca teve. A tela só mostra o dia.

## Limites conhecidos (para o Controle decidir; fora da Touch)

- **Oferta de compra pré-paga:** o estado não guarda quanto entrou nem em que compra foi gasto (`Trade` não tem a modalidade; o Pix do pré-pago não grava `Deposit`). O preso aparece como reserva; o já gasto cai na linha de ajuste — o mesmo buraco que o ledger fecha com `ajuste`. Fechar de vez = `Deposit` com `origem:'oferta_prepaga'` + modalidade no `Trade` (types.ts + conciliação). Cena de teste documenta o valor exato.
- **Data do estorno da fatura paga:** o estado não a grava; vem do envio cancelado/desconsiderado, ou um segundo depois do pagamento.
- **Relatório administrativo de extratos** (`src/server/relatorios/dados.ts`) e a **ficha do usuário** (`AbaFinanceiro`) usam `userStatement` e passam a mostrar as linhas novas; não ganharam a coluna "Saldo depois" (fora da Touch).

## Testes da branch

- `npx eslint` dos 7 arquivos de código + 3 de teste: **0 problemas**.
- `npx vitest run` (um arquivo por vez): `statement-invariante.test.ts` 17/17 · `statement.test.ts` 5/5 · `statement-custodia.test.ts` 4/4.
- **Não rodaram:** `npm run typecheck`, `npm run build`, `npm test` (suíte inteira), servidor local. Do Controle, no merge.

## Linhas para os índices (o Controle aplica no merge)

- `docs/memorias/README.md`: "- [2026-11-18 · Extrato igual ao saldo (frente F)](2026-11-18--claude-code--manut-extrato-igual-ao-saldo.md) — extrato derivado dos mesmos fatos do ledger; invariante saldo = soma das linhas, coluna "Saldo depois", reserva no topo; limite conhecido: pré-pago"
- `INDICE_VEGA` / `ESTADO-GERAL`: "Frente F — extrato igual ao saldo: `statement.ts` fecha com o saldo, com teste de invariante `statement-invariante.test.ts` (reexecutar depois de qualquer frente que crie ou devolva dinheiro)."
