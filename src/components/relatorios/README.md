# `src/components/relatorios/` — o painel de relatórios (M4/M7)

A única área da interface que fala de dinheiro da **empresa**, não da conta de quem está
logado. Usada por `src/app/(app)/relatorios/page.tsx`, que só a renderiza para
administradores (`ehAdmin`, em `src/server/relatorios/acesso.ts`).

| Arquivo | O que faz |
|---|---|
| `RelatoriosPainel.tsx` | Período (ano/mês/trimestre), indicadores da DRE, oito abas (DRE, Análise, Livro-razão, Auditoria, Extratos, Lançamentos, Alíquotas, Integração), exportação e envio ao Google Sheets |

## De onde vêm os dados

**Não do `AppProvider`.** Ledger, DRE e trilha não vivem no `AppState`. Cada aba busca
`/api/relatorios/<nome>?ano=&mes=&trimestre=&recortar=` (JSON) — a mesma URL com `.csv` ou
`.xlsx` é o que os botões de exportação abrem. Tela e arquivo são a mesma função no servidor
(`src/server/relatorios/dados.ts`).

## Para onde vão as escritas

Pelas Server Actions de `src/server/actions/contabil.ts`, sempre via `run()`:

| Gesto | Action |
|---|---|
| Lançar despesa/receita manual | `registrarLancamentoManual` |
| Estornar um lançamento | `estornarLancamentoManual` |
| Preencher ou limpar uma alíquota | `definirParametroContabil` |
| Enviar ao Google Sheets | `sincronizarGoogleSheets` |
| Verificar a cadeia de hashes do ledger | `verificarIntegridadeLedger` |

Depois de cada escrita a aba é recarregada (`aoMudar`), porque o que mudou está no banco.

## Regras

- Só classes do monolito (`.panel`, `.stats`, `.audit-table`, `.btn`, `.tinput`, `.pill`,
  `.note`, `.chart-tab`) e estilo inline pontual. **Nenhuma folha CSS nova.**
- Alvo de toque ≥ 44px nas abas e botões.
- O formato de coluna é decidido pelo nome (`COLUNA_MONETARIA`): coluna com "valor", "saldo",
  "preco"… é dinheiro em reais e vira `brl()`. Coluna nova com dinheiro precisa de um nome que
  case com a expressão — ou aparece como número cru.
- `Hash` e `Detalhes` não são exibidos na tabela genérica (são longos); vão no arquivo.

## Conexões

- `src/domain/dre.ts` — `PLANO_DE_CONTAS` (o `<select>` de contas) e `CATALOGO_PARAMETROS` (a
  lista de alíquotas). Conta ou parâmetro novo aparece aqui sozinho.
- `src/domain/money.ts` — `brl` e `parsePrice`.
- `src/components/shell/Sidebar.tsx` — o item "Relatórios", visível só com `admin` do
  `AppProvider`.
