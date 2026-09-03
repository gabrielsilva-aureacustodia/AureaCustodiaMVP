# API de relatórios — o contrato

```
Escrito em: 03/09/2026 · frente B (banco e backend), módulos M4 e M7
Rotas:      src/app/api/relatorios/
Montagem:   src/server/relatorios/dados.ts
```

> **Para que serve.** É a porta por onde planilhas (Google Sheets, Excel), o contador e
> qualquer script leem os números da empresa sem entrar na tela. Um relatório por URL, três
> formatos, o mesmo conteúdo.

## Autorização

| Como | Quando |
|---|---|
| Cookie de sessão de um **administrador** | A tela `/relatorios` e quem estiver logado como sócio |
| `Authorization: Bearer <AUREA_RELATORIOS_TOKEN>` | Scripts, Power Query, cron |
| `?token=<AUREA_RELATORIOS_TOKEN>` | `IMPORTDATA` do Google Sheets, que não manda cabeçalho |

Sem `AUREA_RELATORIOS_TOKEN` no ambiente, o caminho por token está **desligado**. Quem é
administrador: `AUREA_ADMIN_EMAILS` (lista por vírgula) ou, sem ela, as sete contas do seed.

Respostas de recusa: `401` (sem sessão e sem token válido), `403` (logado, mas não é
administrador).

## Índice

```
GET /api/relatorios
```

Devolve os nomes, títulos e as três URLs de cada relatório, os parâmetros aceitos e o estado
da integração com o Google Sheets (configurado ou o que falta).

## Um relatório

```
GET /api/relatorios/<nome>              → JSON
GET /api/relatorios/<nome>.csv          → CSV (Excel pt-BR: ; e vírgula decimal, BOM)
GET /api/relatorios/<nome>.xlsx         → XLSX (aba "Resumo" + aba do relatório)
GET /api/relatorios/<nome>?formato=csv  → o mesmo que .csv
GET /api/relatorios/tudo.xlsx           → todos, uma aba cada
```

### Nomes

| Nome | Conteúdo | Recorte por período |
|---|---|---|
| `dre` | Demonstração do Resultado, linha a linha, com observação por linha | sempre |
| `analise` | Margens, carga tributária, negociações, volume, comissão média, receita por tipo e por mês | sempre |
| `ledger` | Livro-razão completo, com saldo após cada lançamento e hash | com `recortar=1` |
| `auditoria` | Trilha: quem fez o quê, contas afetadas, resumo das operações | com `recortar=1` |
| `extratos` | Extrato de **todas** as contas (leva proprietário — uso interno) | com `recortar=1` |
| `negociacoes` | Todas as negociações, com a comissão congelada | com `recortar=1` |
| `custodia` | Cobrança de custódia vigente por conta | — |
| `estoque` | Inventário completo com dono, status e valor de mercado | — |
| `contas` | Saldo de cada conta × soma do ledger (a diferença precisa ser zero) | — |
| `lancamentos-manuais` | Despesas/receitas lançadas à mão, com situação (vigente, estorno, estornado) | — |
| `parametros` | As alíquotas (nulas até o contador preencher) | — |
| `exportacoes` | Quem exportou o quê, quando, por onde | — |

### Parâmetros de consulta

| Parâmetro | Valores | Padrão |
|---|---|---|
| `ano` | `2000`–`2100` | ano corrente |
| `mes` | `1`–`12` | — (ano inteiro) |
| `trimestre` | `1`–`4` (ignorado se `mes` vier) | — |
| `recortar` | `1` | não recorta os relatórios de histórico |
| `formato` | `json` \| `csv` \| `xlsx` | `json`, ou a extensão da URL |
| `token` | o token de integração | — |

### A forma do JSON

```json
{
  "nome": "dre",
  "titulo": "DRE — Demonstração do Resultado",
  "geradoEm": 1756900000000,
  "periodo": "exercício de 2026",
  "colunas": ["Codigo", "Descricao", "Valor", "Nivel", "Observacao"],
  "linhas": [{ "Codigo": "3", "Descricao": "RECEITA BRUTA", "Valor": 1234.56, "Nivel": 0, "Observacao": "" }],
  "observacoes": ["ISS: alíquota não configurada (linha zerada)"]
}
```

- **Dinheiro em reais**, número com até duas casas. Colunas de dinheiro têm nome com
  `Valor`, `Saldo`, `Preco`, `Comissao`, `Taxa`, `Receita`, `Bruto`… — é por esse nome que a
  tela formata como R$.
- **Nomes de coluna são contrato**: sem acento, com underline. Fórmula e script leem por eles.
- `observacoes` traz as pendências (alíquota ausente, ajuste no ledger, cadeia quebrada) e o
  aviso de ambiente sem banco.

## Push para o Google Sheets

```
POST /api/relatorios/sheets?ano=&mes=&trimestre=
Authorization: Bearer <AUREA_RELATORIOS_TOKEN>
```

Grava todos os relatórios na planilha `GOOGLE_SHEETS_SPREADSHEET_ID`, uma aba por relatório
(`aurea_dre`, `aurea_ledger`…), criando as que faltam e limpando **só** essas. Abas com outro
nome nunca são tocadas. Resposta:

```json
{ "ok": true, "message": "Planilha atualizada: 12 aba(s), 480 linha(s).", "data": { "abas": [...], "spreadsheetUrl": "…" } }
```

`400` com `message` explicando o que falta quando a integração não está configurada.

## Exemplos

```bash
# índice
curl -s -H "Authorization: Bearer $AUREA_RELATORIOS_TOKEN" https://aurea-custodia-mvp.vercel.app/api/relatorios

# DRE de agosto em CSV
curl -s -o dre.csv "https://aurea-custodia-mvp.vercel.app/api/relatorios/dre.csv?ano=2026&mes=8&token=$AUREA_RELATORIOS_TOKEN"

# pasta completa do trimestre
curl -s -o tudo.xlsx "https://aurea-custodia-mvp.vercel.app/api/relatorios/tudo.xlsx?ano=2026&trimestre=3&token=$AUREA_RELATORIOS_TOKEN"

# empurrar para o Sheets (agendável)
curl -s -X POST -H "Authorization: Bearer $AUREA_RELATORIOS_TOKEN" "https://aurea-custodia-mvp.vercel.app/api/relatorios/sheets?ano=2026"
```

Numa célula do Google Sheets:

```
=IMPORTDATA("https://aurea-custodia-mvp.vercel.app/api/relatorios/ledger.csv?ano=2026&token=SEU_TOKEN")
```

No Excel: **Dados → Obter dados → Da Web**, colando a mesma URL.

## O que está registrado

Toda saída em CSV, XLSX ou Sheets grava uma linha em `aurea.exportacoes` (relatório, formato,
destino `download`/`api`/`sheets`, ator, linhas, ok). A sincronização com o Sheets também
entra na trilha de auditoria (`acao = exportacao.sheets`). O relatório `exportacoes` mostra
tudo isso.

## Para o Rogério

Cada relatório tem um endereço. Colar o endereço numa célula do Google Sheets faz a planilha
puxar os números sozinha, de hora em hora. Apertar "Enviar ao Google Sheets" na tela faz o
contrário: a plataforma escreve na planilha do contador. Os dois caminhos mostram os mesmos
números que a tela, porque saem da mesma conta.
