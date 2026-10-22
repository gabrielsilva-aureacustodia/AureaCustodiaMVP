# `src/server/shipping/` — o rastreio dos Correios, ligado ao estado

Liga os envios de `state.envios` **e as retiradas** à biblioteca dos Correios (`src/lib/shipping/`),
grava o último retrato em `aurea.rastreios` e, desde 22/10/2026, **avança sozinho** o envio e a
retirada quando os Correios atestam a postagem ou a entrega. Cada linha de `aurea.rastreios` tem um
dono só: o protocolo de um envio, ou o `retirada_id` de uma retirada (migration 030, E8).

## Arquivos

| Arquivo | O que faz |
|---|---|
| `rastreios.ts` | `atualizarRastreiosPendentes()` (o job) e `rastreiosPorProtocolo()` (o que a tela lê) |
| `retiradas.ts` | Repositório das retiradas (Postgres ou memória) |

A regra de quando avançar é pura e mora em `src/domain/rastreio.ts`
(`postagemDoEnvioPeloRastreio`, `avancosDaRetiradaPeloRastreio`), junto com os rótulos em português
de cada status (`rotuloStatusRastreio`, `textoDoRastreio`).

## A regra do M6 que este arquivo existe para cumprir

**A tela nunca chama os Correios.** Quem consulta é o job agendado; a tela lê o que ele
gravou. Consultar a API a cada visita gera custo, esbarra em limite de requisição e deixa a
página lenta — e o estado de um objeto postal muda algumas vezes por dia, não a cada
carregamento.

```
Vercel Cron (diário, 9h)  →  GET /api/cron/shipping   (Bearer CRON_SECRET)
                          →  envios com código, fora da última etapa, não desconsiderados
                          →  retiradas 'separacao' ou 'postada' com código
                          →  atualizarRastreiosEmLote()   src/lib/shipping/   (uma chamada; lotes de 50 no SRO)
                          →  UPSERT em aurea.rastreios   (envios: protocolo)
                          →  UPSERT em aurea.rastreios   (retiradas: retirada_id, transação à parte)
                          →  avanço: envio "Protocolo gerado" → "Envio postado"   (mutateState)
                          →  avanço: retirada separacao → postada → entregue      (repositório + espelho no estado)
tela /envios              →  GET /api/rastreios → lê do banco
/admin/logistica          →  rastreiosPorProtocolo()[retirada.id]
```

O agendamento está em `vercel.json` e é **diário** porque o plano Hobby da Vercel só permite
uma execução por dia. Com plano Pro, a mesma rota aceita cadência maior sem mudar código. Por
causa disso o avanço aparece até um dia depois do registro nos Correios — mas a data gravada é a
do evento dos Correios, e não a da rodada.

## O fluxo com o contrato (22/10/2026)

O código de rastreio nasce na **pré-postagem**, antes de o cliente ir à agência:

- **Envio:** ao pagar o frete, a pré-postagem de logística reversa grava `envio.prePostagem` e
  `envio.codigoRastreio`. O envio continua em "Protocolo gerado" com `dataPostagem` vazia.
- **Retirada:** ao emitir a etiqueta no painel, a retirada vai para `separacao` com o código gravado.

Nos Correios o objeto já existe, com o evento FC/82 "Etiqueta emitida — aguardando postagem"
(`aguardando_postagem`). Isso **não** é postagem. O job avança quando o último status do SRO é
`postado`, `em_transito`, `saiu_para_entrega`, `aguardando_retirada` ou `entregue`:

| Quem | De → para | Data gravada |
|---|---|---|
| Envio | "Protocolo gerado" → "Envio postado" | `dataPostagem` = primeiro evento que não seja da etiqueta (`aguardando_postagem`/`cancelado`) |
| Retirada | `separacao` → `postada` | a mesma, no histórico, com `autor: 'correios'` |
| Retirada | `postada` → `entregue` | o evento de entrega, com `autor: 'correios'` |

Se a postagem e a entrega da retirada caírem entre duas rodadas, o job dá os dois passos em
sequência — a máquina de estados (`transicionarRetirada`) não deixa pular `postada`.

**Conferência dupla.** O envio é conferido de novo DENTRO da `mutateState` (ainda em "Protocolo
gerado", sem `dataPostagem`, não desconsiderado, com o mesmo código): entre a consulta e a
gravação o cliente pode ter informado a postagem à mão ou a equipe desconsiderado o envio. A
retirada é relida do repositório antes de gravar, pelo mesmo motivo.

## O que continua manual

- **"Recebido pela custódia"** e tudo depois dele. O "entregue" dos Correios num envio diz que o
  pacote chegou ao endereço; quem confirma que a moeda está no cofre é a equipe.
- `devolvido`, `extraviado` e etiqueta `cancelado`: o job mostra, não decide. São casos para a
  equipe olhar.

## Falha dos Correios não apaga o retrato bom

Quando a API não responde, a fundação devolve `indisponivel` sem eventos. O upsert de
`src/server/db/repositories/rastreios.ts` **não regrava** uma linha boa com isso (a condição está
na própria SQL): a tela do cliente continua mostrando o último evento conhecido. Sem linha
anterior, o `indisponivel` grava, para a tela dizer por que não há rastreio. O resumo conta esses
casos em `retratosPreservados`. `indisponivel` também nunca avança nada.

## O resumo que o job devolve

`verificados`, `gravados`, `codigos` (envios); `retiradasVerificadas`, `retiradasGravadas`;
`retratosPreservados`; e os avanços: `enviosPostados`, `retiradasPostadas`, `retiradasEntregues`.
A rota `/api/cron/shipping` devolve tudo isso em JSON.

## Envio encerrado não é consultado de novo

`pendentes()` filtra quem já chegou na última etapa e quem tem `desconsideradoEm` gravado. Objeto
que não muda mais de estado só gasta a cota da API — que é justamente o motivo de o rastreio ser
agendado. O filtro olha o `desconsideradoEm` gravado, e não a regra de leitura dos 3 dias: o
envio levado à agência no 4º dia ainda está indo para o cofre, e o rastreio é o que prova isso.

## Sem banco configurado

A consulta acontece e o resultado é devolvido, mas o retrato não é gravado: não há onde. A tela
então mostra "rastreio ainda não consultado", que é a verdade, não uma falha. O avanço acontece
mesmo assim, porque `mutateState` e o repositório de retiradas funcionam em memória. Sem as
variáveis do contrato (`correiosConfigurado()` falso), todo código volta `indisponivel` e nada
avança.

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/lib/shipping/` | Cliente dos Correios: cotação, pré-postagem, rastreio, CEP |
| `src/domain/rastreio.ts` | Quando avançar, e o texto de cada status |
| `src/domain/retirada.ts` | A máquina de estados da retirada (`transicionarRetirada`) |
| `src/server/db/repositories/rastreios.ts` | A SQL de `aurea.rastreios` |
| `src/server/state.ts` | De onde saem os envios a consultar, e onde o avanço do envio é gravado |
| `src/app/api/cron/shipping/` | O job agendado |
| `src/app/api/rastreios/` | O que a tela de envios consome |
