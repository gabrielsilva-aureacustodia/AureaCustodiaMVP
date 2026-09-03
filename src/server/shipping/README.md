# `src/server/shipping/` — o rastreio dos Correios, ligado ao estado

Liga os envios de `state.envios` à biblioteca dos Correios (`src/lib/shipping/`) e grava o
último retrato em `aurea.rastreios`.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `rastreios.ts` | `atualizarRastreiosPendentes()` (o job) e `rastreiosPorProtocolo()` (o que a tela lê) |

## A regra do M6 que este arquivo existe para cumprir

**A tela nunca chama os Correios.** Quem consulta é o job agendado; a tela lê o que ele
gravou. Consultar a API a cada visita gera custo, esbarra em limite de requisição e deixa a
página lenta — e o estado de um objeto postal muda algumas vezes por dia, não a cada
carregamento.

```
Vercel Cron (diário, 9h)  →  GET /api/cron/shipping   (Bearer CRON_SECRET)
                          →  envios com código e ainda não entregues
                          →  atualizarRastreiosEmLote()   src/lib/shipping/
                          →  UPSERT em aurea.rastreios
tela /envios              →  GET /api/rastreios → lê do banco
```

O agendamento está em `vercel.json` e é **diário** porque o plano Hobby da Vercel só permite
uma execução por dia. Com plano Pro, a mesma rota aceita cadência maior sem mudar código.

## Envio entregue não é consultado de novo

`pendentes()` filtra quem já chegou na última etapa. Objeto entregue não muda mais de estado,
e continuar consultando por ele é gastar a cota da API — que é justamente o motivo de o
rastreio ser agendado.

## Sem banco configurado

A consulta acontece e o resultado é devolvido, mas nada é gravado: não há onde. A tela então
mostra "rastreio ainda não consultado", que é a verdade, não uma falha. É o mesmo desenho do
resto da plataforma — o ambiente local funciona sem banco.

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/lib/shipping/` | Cliente dos Correios: cotação, pré-postagem, rastreio, CEP |
| `src/server/db/repositories/rastreios.ts` | A SQL de `aurea.rastreios` |
| `src/server/state.ts` | De onde saem os envios a consultar |
| `src/app/api/cron/shipping/` | O job agendado |
| `src/app/api/rastreios/` | O que a tela de envios consome |
