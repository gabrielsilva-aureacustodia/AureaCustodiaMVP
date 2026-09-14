# `src/app/api/eventos/` — o registro de uso da plataforma

`POST /api/eventos` recebe, em lote, o que o navegador anotou: páginas abertas e cliques em
elementos marcados com `data-uso`. É a porta de entrada de `aurea.eventos_uso` (migration 021),
que a tela `/admin/resultados/uso` lê.

| Arquivo | O que faz |
|---|---|
| `route.ts` | Lê o e-mail da sessão, limpa o lote (`validarLoteDeEventos`), resume o user agent (`plataformaResumida`), responde na hora e grava depois da resposta (`after()`) |
| `route.test.ts` | 5 testes: corpo inválido, sem sessão, sem banco, lote limpo gravado sem o user agent, falha de gravação que não muda a resposta |
| `ATALHOS.md` | RA-41 — registro sem consentimento de rastreamento |

## O contrato

```
POST /api/eventos
Content-Type: application/json

{ "sessao": "id-aleatorio-da-aba", "eventos": [ { "tipo": "pagina", "rota": "/mercado", "em": 1757520000000 },
                                              { "tipo": "acao", "rota": "/vender", "alvo": "publicar-anuncio" } ] }
```

| Resposta | Quando |
|---|---|
| `204` | Sempre que o corpo tem forma de lote — gravado, descartado por falta de sessão ou ambiente sem banco |
| `400` | Corpo que não é JSON ou não tem `eventos` como lista |

## Regras

- **Nunca atrapalha a navegação.** O navegador não espera nem lê a resposta; falha de gravação vira
  linha de log.
- **Quem é, é a sessão** (cookie assinado). O corpo não diz de quem é o evento.
- **Nada de IP nem de user agent completo.** Rota sem query string, com identificador e e-mail
  trocados por `[id]`; texto curto; no máximo 50 eventos por lote.

## Conexões

| Pasta | Relação |
|---|---|
| `src/components/providers/RegistroDeUso.tsx` | Quem manda os lotes, montado nos layouts de `(app)` e `(admin)` |
| `src/domain/admin/uso.ts` | `validarLoteDeEventos`, `normalizarRota`, `plataformaResumida` |
| `src/server/admin/uso.ts` | `gravarEventosDeUso` |
| `src/server/db/repositories/eventos-uso.ts` | O `INSERT` (só inserção) |
