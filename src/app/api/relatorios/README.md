# `src/app/api/relatorios/` — a API dos relatórios financeiros

Leitura dos relatórios da empresa por URL, e o gatilho do push para o Google Sheets. O
contrato completo, com exemplos, está em [`docs/API_RELATORIOS.md`](../../../../docs/API_RELATORIOS.md).

| Rota | Método | O que faz |
|---|---|---|
| `/api/relatorios` | GET | Índice: nomes, títulos e URLs de cada relatório; estado da integração |
| `/api/relatorios/<nome>[.json\|.csv\|.xlsx]` | GET | Um relatório. Parâmetros `ano`, `mes`, `trimestre`, `recortar`, `formato`, `token` |
| `/api/relatorios/tudo.xlsx` | GET | Pasta de trabalho com todos os relatórios, uma aba cada |
| `/api/relatorios/sheets` | POST | Envia todos ao Google Sheets configurado (para cron/Apps Script) |

## Autorização

Sessão de **administrador** (`ehAdmin`) **ou** token de integração `AUREA_RELATORIOS_TOKEN`
em `Authorization: Bearer …` ou `?token=`. Decidido em `src/server/relatorios/acesso.ts`.

## Regras

- `export const dynamic = 'force-dynamic'` e `Cache-Control: no-store` em toda resposta —
  relatório financeiro cacheado é relatório errado.
- CSV e XLSX ficam registrados em `aurea.exportacoes` (quem, o quê, quando). JSON não.
- Só POST escreve na planilha. GET nunca tem efeito colateral fora do registro.

## Conexões

- `src/server/relatorios/` — quem monta e serializa.
- `src/components/relatorios/RelatoriosPainel.tsx` — o consumidor em JSON.
- `vercel.json` — se um dia o push for agendado, o cron entra ali com `CRON_SECRET`… **não**:
  esta rota usa `AUREA_RELATORIOS_TOKEN`, porque o mesmo token serve ao Apps Script. Ver o doc.
