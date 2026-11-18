# MD de execução — frente J (kpis-do-conselho) — manutenção do Real Olímpico

```
RETOMADA
Atualizado:  2026-11-18 (fim da execução)
Git:         claude/manut-kpis-do-conselho-7a21c4 sobre c85b3da · 0 commits (B1) · 9 arquivos modificados + 10 novos, nada commitado
Estado:      PRONTA PARA MERGE (T1–T5 fechados). Falta só o que é do Controle: migration 057 no commit, build/typecheck/suíte,
             conferência visual em produção.
Próximo ato: Controle — (1) commit; (2) `npm run db:migrate` (057) junto com o commit; (3) typecheck + suíte + build;
             (4) olhar /admin/resultados/kpis?aba=aquisicao e ?aba=gasto em produção (desktop e celular).
Restrições:  PC no limite de memória — nada de build, typecheck completo, suíte inteira, servidor local, Docker.
```

## Aceite (ficha `docs/manutencao-2026-11/frentes/J-kpis-do-conselho.md`)
- [x] `docs/kpis/PROPOSTA_DE_KPIS.md` — definição, fórmula, fonte, frequência e dono de cada KPI; tabela para o Gabriel completar (D2).
- [x] Painel: novos cadastros, ativados (1ª transação), CAC (hoje, 7 dias, mês até hoje), funil visita → cadastro → ativação, atendimento
      (casos abertos e tempo até a 1ª resposta), gasto digital × analógico. **Origem do cadastro: proposta** (o cadastro não tem o campo).
- [x] Entrada manual do gasto por canal e intervalo de dias, com `contabil.lancar` e `admin.marketing.registrar|cancelar` em `audit_log`.
- [x] Domínio puro e testado em `kpis.ts`: sem fonte = `null`, nunca zero.
- [x] Vocabulário limpo (grep nos arquivos novos: nada de token/NFT/cripto/ativo digital/investimento/rentabilidade).
- [~] "`npm run typecheck` e `npm test` ao fim": **não rodados inteiros** por ordem do Controle (memória). Rodados: vitest de 4 arquivos, eslint de
      todos os arquivos da frente e `tsc` restrito aos arquivos da frente (exit 0, config temporária já apagada).

## Decisões (padrões — o Gabriel muda quando quiser; estão na seção 6 da PROPOSTA)
- **Cadastro** = `saldo_inicial` do ledger (`datasDeCriacao`, mesma fonte da ficha do usuário). Sem banco → `null`.
- **Ativado** = 1ª entrada de dinheiro confirmada (`deposits`, menos `custodia_recebida_fora`) ou 1ª compra/venda. Envio não entrou: envio sem frete
  pago não é transação, e frete pago já é entrada de dinheiro.
- Contas da equipe e de teste fora (`ehEmailProtegido` + `AUREA_ADMIN_EMAILS`).
- **Gasto**: `aurea.marketing_gastos` (057), por canal e intervalo de dias de Brasília; repartido igualmente pelos dias; "estimado" quando a janela pega só um
  pedaço da entrada. Não se edita nem se apaga: cancela com motivo.
- **Permissão**: `contabil.lancar` para lançar/cancelar (a do controle financeiro); `resultados.ver` para ver; `cs.ver` para o atendimento (o servidor nem lê os
  casos sem ela). `permissoes.ts` **não foi tocado**.
- **Visitas** são digitadas junto do gasto (opcional): o Pixel/API de Conversões só enviam à Meta, o site não lê de volta.
- **Abas** dentro de `/admin/resultados/kpis` (`?aba=negocio|aquisicao|gasto`), sem item novo de menu — `navegacao.tsx` não foi tocado.

## Touch (feito) e arquivos além da lista
Lista da ficha: `src/domain/kpis.ts` + `kpis.test.ts` · `src/server/admin/resultados.ts` · `src/components/admin/resultados/` (`Aquisicao.tsx`,
`GastoDeMarketing.tsx`) · `src/app/(admin)/admin/resultados/kpis/` (`page.tsx`, README) · `src/server/actions/admin/marketing.ts` (+ teste).
Além da lista, porque a 057 pede persistência: `src/server/db/repositories/marketing.ts`, `src/server/admin/marketing.ts` (+ teste),
`src/server/db/migrations/057_gasto_de_marketing.sql`, linha `marketing.ts` em `src/server/db/sql-injecao.baseline.json` (guarda de SQL),
linhas nos READMEs de `migrations/`, `actions/admin/` e `components/admin/resultados/`, e `docs/kpis/PROPOSTA_DE_KPIS.md`.
**Superfície protegida tocada: nada** (`types.ts`, `constants.ts`, `fees.ts`, `market.ts`, `store/types.ts`, Server Actions de cliente).

## Tópicos
| T | O quê | Estado | Aceite | Log |
|---|---|---|---|---|
| T1 | `PROPOSTA_DE_KPIS.md` | feito | arquivo + tabela D2 | slides 3.1 e 5 lidos; escrito em `docs/kpis/` |
| T2 | Domínio puro + testes | feito | `vitest kpis.test.ts`: 45 verdes (33 novos) | `montarKpisDeAquisicao`, `validarGastoDeMarketing`, janelas de Brasília |
| T3 | 057 + repositório + serviço + ação | feito | `marketing.test.ts` (ação) 8 verdes; `marketing.test.ts` (serviço) 10 verdes; `sql-injecao.test.ts` 6 verdes | permissão → banco → serviço; trilha na mesma transação |
| T4 | Telas | feito (visual só em produção) | eslint e `tsc` restrito limpos | abas Negócio / Aquisição e atendimento / Gasto de marketing |
| T5 | Verificação pontual | feito | ver acima | — |

## O que NÃO foi feito
- **Teste contra Postgres real** do repositório novo (SQL de `marketing_gastos` e da leitura de casos): suíte com banco embutido é pesada; a guarda
  `sql-injecao` passa e a 057 é aditiva. O Controle confere ao aplicar a migration e abrir a tela.
- Conferência visual desktop/celular: só em produção, depois do deploy (ordem do Controle).
- Origem do cadastro (analógico × digital): proposta na seção 4 da PROPOSTA; depende da tela de cadastro (frente D).
- WhatsApp (`/admin/cs`) no atendimento: fora desta rodada (J4 na PROPOSTA).

## Sessões
Sem filhos (ordem do Controle de 18/11: memória no limite). Controle: `local_e259126b-4373-4132-9e89-79edb7fa94ec`.
