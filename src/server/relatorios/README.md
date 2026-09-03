# `src/server/relatorios/` — os relatórios da empresa (M4/M7)

Tudo que monta, serializa e envia os relatórios financeiros: DRE, livro-razão, trilha de
auditoria, extratos de todas as contas, estoque, saldos, lançamentos manuais, alíquotas e o
registro de exportações. É a **camada de leitura** do ledger e da base contábil que
`src/server/db/` grava.

## A frase que explica a pasta

**Um relatório é uma tabela** (`Relatorio`: colunas nomeadas + linhas), montada uma vez em
`dados.ts` e servida igual em JSON (a tela), CSV e XLSX (download e `IMPORTDATA`) e no Google
Sheets (push). Tela e arquivo nunca divergem porque são a mesma função.

## Arquivos

| Arquivo | O que faz | `server-only` |
|---|---|---|
| `acesso.ts` | `ehAdmin(email)`, `tokenDeIntegracaoValido`, `autorizarRelatorio` — quem pode ver | ✅ |
| `dados.ts` | Os doze relatórios (`NOMES_RELATORIOS`), o período da consulta e `dreCompleta` | ✅ |
| `exportar.ts` | `Relatorio` → CSV (regras do Excel pt-BR) e XLSX (SheetJS, no servidor) | — |
| `sheets.ts` | Push para o Google Sheets pela API REST, com conta de serviço | ✅ |
| `jwt.ts` | O JWT RS256 da conta de serviço, sem ler ambiente — testável | — |
| `sincronizar.ts` | Gera tudo, envia, e registra em `exportacoes` e na trilha | ✅ |
| `exportar.test.ts`, `jwt.test.ts` | 4 testes: CSV, XLSX de ida e volta, matriz do Sheets, JWT verificável | — |
| `ATALHOS.md` | O que esta pasta deve ao próprio rigor | — |

## Quem chama

| Quem | O quê |
|---|---|
| `src/app/api/relatorios/[relatorio]/route.ts` | `gerarRelatorio`, `gerarTodosRelatorios`, `relatorioParaCsv`, `relatoriosParaXlsx` |
| `src/app/api/relatorios/sheets/route.ts` | `sincronizarSheetsComoAtor` (para cron/Apps Script) |
| `src/server/actions/contabil.ts` | `ehAdmin`, `sincronizarSheetsComoAtor` |
| `src/app/(app)/layout.tsx` | `ehAdmin` — liga o item "Relatórios" do menu |
| `src/app/(app)/relatorios/page.tsx` | `ehAdmin`, `configuracaoSheets` |

## Regras que valem aqui

- **Dinheiro sai em reais com duas casas** (`reais()` em `dados.ts`) porque o destino é gente e
  contador. É o único lugar da pasta onde centavos viram reais.
- **Receita vem do ledger, nunca de recálculo.** A DRE soma lançamentos `comissao` e
  `custodia`; `tradeFee` não é chamada aqui.
- **Nenhuma alíquota no código.** Vêm de `aurea.parametros_contabeis`, preenchida pelo contador.
- **Toda saída em CSV/XLSX/Sheets fica registrada** em `aurea.exportacoes`; a sincronização
  também entra na trilha de auditoria com o ator.
- **Sem `POSTGRES_URL`**, os relatórios contábeis voltam vazios com a observação escrita — não
  falham. Os que só dependem do estado (estoque, contas, negociações) funcionam.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `AUREA_ADMIN_EMAILS` | Lista (vírgula) de quem vê os relatórios. **Sem ela, valem as 7 contas do seed** |
| `AUREA_RELATORIOS_TOKEN` | Token (≥ 16 caracteres) para leitura por URL sem sessão — `IMPORTDATA`, Power Query, cron. Sem ela, esse caminho fica desligado |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Id da planilha de destino do push |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da conta de serviço com acesso de editor à planilha |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Chave PEM do JSON da conta de serviço (com `\n` literais) |

Passo a passo de cada uma em [`docs/INTEGRACAO_GOOGLE_SHEETS.md`](../../../docs/INTEGRACAO_GOOGLE_SHEETS.md).

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| Nome de coluna em `dados.ts` | O contrato do arquivo: fórmulas do contador e scripts leem por nome. A tela decide "é dinheiro?" pelo nome também (`COLUNA_MONETARIA`) |
| `NOMES_RELATORIOS` | As URLs da API e as abas do Sheets (`aurea_<nome>`) |
| `acesso.ts` | Quem enxerga a DRE da empresa |
| Regras do CSV em `exportar.ts` | O Excel em português deixa de abrir em colunas — as regras são as de `src/lib/export/statement-export.ts` |

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/domain/dre.ts`, `ledger.ts`, `hash.ts` | A regra pura: DRE, verificação de cadeia, catálogos |
| `src/domain/statement.ts`, `selectors.ts` | Extratos e estoque reaproveitam os seletores das telas |
| `src/server/db/repositories/ledger.ts`, `auditoria.ts`, `contabil.ts` | As leituras |
| `src/server/state.ts` | `getState()` para o que ainda vive no `AppState` |
| `src/lib/export/` | O irmão que roda no navegador; mesmas regras de CSV |
