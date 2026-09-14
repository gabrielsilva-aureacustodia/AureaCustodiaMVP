# `src/server/actions/admin/` — as Server Actions do painel

O equivalente, no desenho da Áurea, aos wrappers tipados da arquitetura de referência: a tela
chama, a ação confere a permissão e delega ao serviço em `src/server/admin/`.

## A regra que não tem exceção

**Toda ação confere a permissão por conta própria, antes de qualquer outra coisa**
(`permissaoParaAcao` de `src/server/admin/acesso.ts`). Esconder o botão é conveniência: uma Server
Action é um endpoint HTTP, e quem conhece o identificador dela a chama sem tela nenhuma. A recusa
fica na trilha como `admin.acesso.recusado`.

A ordem é sempre: **permissão → banco configurado → serviço**. Exceção do serviço vira a mensagem
de falha de gravação, nunca um erro na tela.

## Arquivos

| Arquivo | Ações | Permissão |
|---|---|---|
| `contabil.ts` | `lancarManualNoPainel`, `estornarManualNoPainel` | `contabil.lancar` |
| | `definirAliquotaNoPainel` | `contabil.parametros` |
| | `verificarLedgerNoPainel` | `resultados.ver` |
| | `enviarAoSheetsNoPainel` | `resultados.exportar` |
| `equipe.ts` | `adicionarMembroNoPainel`, `alterarMembroNoPainel` | `admin.membros` |
| | `criarPapelNoPainel`, `alterarPapelNoPainel`, `excluirPapelNoPainel` | `admin.papeis` |
| `acoes.test.ts` | 14 testes: cada ação pede a sua permissão e, recusada, não chama o serviço nem olha o banco; ator = e-mail do membro; exceção vira mensagem | — |

## A trilha

Cada escrita grava `admin.<area>.<verbo>` em `aurea.audit_log`, na mesma transação, com `ator` = e-mail
do membro: `admin.contabil.lancar`, `admin.contabil.estornar`, `admin.contabil.parametro`,
`admin.resultados.verificar_ledger`, `admin.resultados.enviar_sheets`, `admin.membros.adicionar`,
`admin.membros.alterar`, `admin.papeis.criar`, `admin.papeis.alterar`, `admin.papeis.excluir`.

## Conexões

| Pasta | Relação |
|---|---|
| `src/server/admin/` | `acesso.ts` (a recusa), `contabil.ts` e `rbac.ts` (os serviços), `auditar.ts` (a trilha) |
| `src/server/relatorios/sincronizar.ts` | O envio ao Google Sheets reaproveitado |
| `src/components/admin/` | Quem chama, sempre pelo `run()` do `AdminProvider` |
| `src/server/actions/contabil.ts` | As ações da tela antiga `/relatorios`, com a regra do ambiente; sem tela que as use desde a C1 |
