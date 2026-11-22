# E4 · Execução

| Tarefa | O que foi feito | Arquivos | Falta |
|---|---|---|---|
| 1 | `descricaoDaFaturaDeCustodia` e `custodiaDoEnvio`, com teste | `src/domain/custodia-texto.ts`, `.test.ts` | — |
| 2 | Regra pura do bloqueio e casamento com ofertas pausadas, com teste | `src/domain/bloqueio-por-debito.ts`, `.test.ts` | — |
| 2b | Isenção da equipe, Server Action de situação e hook das telas, com teste | `src/server/custodia/isencao-da-equipe.ts`, `src/server/actions/bloqueio-por-debito.ts`, `src/components/custody/useBloqueioPorPendencia.ts`, `.test.ts`, `src/server/actions/README.md` | — |
| 3 | Extrato com descrição por origem da fatura e notas verdadeiras | `src/domain/statement.ts`, `statement.test.ts` (comentário), `statement-custodia.test.ts`, `src/app/(app)/conta/extrato/page.tsx` | — |
| 4 | `/envios` passo 5 pela quantidade do protocolo e pelo plano | `src/app/(app)/envios/page.tsx` | — |
| 5 | Comentários velhos da custódia | `src/server/actions/custody.ts`, `src/domain/README.md` | — |
| 6 | Bloqueio nas Server Actions e permissão em bloquear/desbloquear recibo; `sellToBid` com apelido | `custody.ts`, `sell.ts`, `market.ts`, `payments.ts`, `src/server/actions/bloqueio-por-debito.test.ts` (18 testes) | — |
| 7 | Telas: recibo, faturas, mercado, vender, minhas ofertas | `Certificate.tsx`, `FaturasCustodia.tsx`, `mercado/page.tsx`, `vender/page.tsx`, `MinhasOfertas.tsx` | — |
| 8 | RA-52 e RA-53 registrados | `RISCOS_ASSUMIDOS.md`, `src/server/actions/ATALHOS.md`, `src/domain/ATALHOS.md` | — |
| 9 | Ciclo final, relatório e push | `relatorios/E4.md` | ver E4.md |
