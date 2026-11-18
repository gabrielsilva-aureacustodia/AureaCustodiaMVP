# `/admin/resultados/kpis`

`page.tsx` — confere `resultados.ver`, lê o período e a aba (`?aba=`) e desenha uma de três:

| Aba | O que mostra | Carregador | Domínio |
|---|---|---|---|
| `negocio` (padrão) | Mercado, acervo, envios, faturas — os KPIs de sempre | `carregarKpis` (estado, retiradas e o histórico da fila) | `montarKpis` |
| `aquisicao` (18/11/2026, frente J) | CAC por janela (hoje, 7 dias, mês), funil visita → cadastro → 1ª transação, gasto por canal, atendimento | `carregarAquisicao` | `montarKpisDeAquisicao` |
| `gasto` | A entrada manual do gasto de marketing: o numerador do CAC | `carregarAquisicao` (só `gastos`) | `validarGastoDeMarketing` |

Todas em `src/domain/kpis.ts`, puras e testadas; a tela só formata (`components/admin/resultados/Indicadores`,
`Aquisicao`, `GastoDeMarketing`).

## Permissões

- Ver qualquer aba: `resultados.ver` (conferida pela página antes de ler dado).
- Ver o atendimento (casos): `cs.ver`. Sem ela, o servidor nem lê os casos.
- Registrar e cancelar gasto: `contabil.lancar` — a mesma do controle financeiro, sem permissão nova. A Server Action
  (`src/server/actions/admin/marketing.ts`) confere de novo e grava `admin.marketing.registrar` / `admin.marketing.cancelar`.

## A regra que não muda

**Sem fonte, `null` — nunca zero.** Sem gasto informado o CAC é "—"; sem banco, cadastros e casos são "—"; a origem do
cadastro (analógico × digital) aparece como indisponível porque o cadastro não tem o campo (proposta em
`docs/kpis/PROPOSTA_DE_KPIS.md`). A migration 057 (`marketing_gastos`) ainda não aplicada vira o aviso "migration pendente",
não um erro.
