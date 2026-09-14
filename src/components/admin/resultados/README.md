# `src/components/admin/resultados/` — a Central de Resultados

| Arquivo | Tela | Cliente? | Recebe |
|---|---|---|---|
| `Financeiro.tsx` | Cartões do período, receita por linha, fluxo mês a mês, DRE, exportação, conferir livro-razão | não | `DadosFinanceiro` |
| `TabelaDre.tsx` | A DRE linha a linha, com observação | não | `LinhaDre[]` |
| `Contabil.tsx` | Abas: lançamentos manuais (lançar e estornar), alíquotas (com as nulas em destaque), plano de contas, exportações e envio ao Sheets | sim | `PropsContabil` |
| `Indicadores.tsx` | KPIs: mercado, fila, acervo e contas, envios e análise, faturas e planos | não | `Kpis` |
| `Uso.tsx` | Resumo do registro de uso e a trilha de auditoria | não | `DadosUso` |
| `FiltroTrilha.tsx` | Filtro por ator e ação da trilha, com atalhos | sim | período e filtro atuais |

## Regras

- **Nada é calculado aqui.** DRE vem de `montarDre`, indicadores de `montarKpis`, uso de
  `resumirUso`, caixa de `resumirFinanceiro`. Estes arquivos formatam e desenham.
- **Cada controle aparece pela sua permissão:** lançar e estornar (`contabil.lancar`), alíquota
  (`contabil.parametros`), exportar e enviar ao Sheets (`resultados.exportar`), trilha
  (`admin.auditoria`). A Server Action confere de novo.
- **Indicador de outra frente que ainda não chegou mostra `Indisponivel`**, nunca zero.

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/admin/resultados.ts` | Os carregadores e os tipos `DadosFinanceiro`, `DadosContabil`, `DadosUso` |
| `src/server/actions/admin/contabil.ts` | `lancarManualNoPainel`, `estornarManualNoPainel`, `definirAliquotaNoPainel`, `enviarAoSheetsNoPainel`, `verificarLedgerNoPainel` |
| `/api/relatorios/*` | Os botões de exportação apontam para lá, com o período escolhido |
