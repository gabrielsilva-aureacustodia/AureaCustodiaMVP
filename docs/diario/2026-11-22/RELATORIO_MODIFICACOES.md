# Relatório de Modificações (detalhado) | 22/11/2026

```
Comparado com:  5f76b36 (produção antes do dia) → 8fb5e34 (main)
Filtro:         estrutural, crítico, pasta nova na raiz, integração nova, banco, variável de ambiente
Volume:         169 arquivos de código (+4.747/−827); 444 de documentação (+46.440); 374 só na pasta nova da Central
```

## 1. Tabela

| Item | Tipo | Path | Consequência |
|---|---|---|---|
| Central de Organização | pasta (raiz) | `Central de Organização/` (374 arquivos, 4,1 MB) | índice e cópias de continuidade, planos, relatórios, chats e memórias; **o original manda**; mover arquivo quebra o RETOMADA de outro chat |
| Migration 058 | infra (banco) | `src/server/db/migrations/058_historico_de_email.sql` | cria `email_historico` e **remove a FK** `ledger_entries_user_email_fkey`; troca de e-mail deixa de reescrever `user_email` do livro. Aplicada em produção antes do código |
| Migration 059 | infra (banco) | `src/server/db/migrations/059_trades_codigo_da_moeda.sql` | `aurea.trades.coin_ids jsonb`; KPIs do conselho calculam comissão por moeda. Negociação antiga fica sem código (`null`) |
| Visão do estado por usuário | crítico (segurança) | `src/domain/estado-do-usuario.ts`, `src/server/estado-do-usuario.ts`, `(app)/layout.tsx`, `api/state/route.ts` | o navegador deixa de receber o estado de todos os clientes; terceiros viram pseudônimo (HMAC com `SESSION_SECRET`); campo `publico?` em `AppState` |
| Teste de regressão do vazamento | contrato | `src/server/estado-nao-vaza.test.ts` | lista fechada das rotas que chamam `getState()`; rota nova quebra o teste e força a pergunta |
| CSP bloqueante | infra (cabeçalho) | `next.config.mjs`, `src/lib/seguranca/csp.mjs` | origens liberadas: Meta, Supabase, Mercado Pago; `unsafe-inline` segue (Next sem nonce) |
| Cookie `sb-*` Secure | crítico | `src/server/auth/client.ts:29` | `secure:true` em produção; vale para quem sair e entrar de novo |
| Consentimento de cookies | integração | `src/components/cookies/`, `src/lib/cookies/`, `MetaPixel.tsx`, `src/server/meta/cadastro.ts`, `cookies.css` | uso presumido com selo que some em ~10 s; Pixel e API de Conversões só depois de "Aceitar"; escolha em `ro-cookies` |
| Isenção Áurea e CEO | env + regra | `src/domain/isencao.ts`; `NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL`, `NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL` | duas variáveis novas na Vercel; sem elas não há isenção. **Superfície protegida** tocada (`market.ts`, server actions de compra e venda) |
| `Trade.coinIds` | contrato (protegido) | `src/domain/types.ts`, `market.ts`, `actions/{market,sell,reserva}.ts`, `payments/conciliacao.ts`, `db/diff.ts`, `repositories/trades.ts` | autorizado pelo Gabriel; só acréscimo; nenhuma regra, valor ou comissão mudou |
| Login automático no cadastro | crítico (fluxo) | `src/server/actions/auth.ts` (`registerWithEmail`), `RegisterForm.tsx` | conta nasce confirmada e já entra em `/inicio`; B02 revertido (`91cccf2`, `d84f795`) |
| Documentos legais | contrato (jurídico) | `termos-de-uso-v1.ts` (2.3), `tabela-de-taxas-v1.ts` (2.5), Política 2.1, Arbitragem 2.2; `scripts/publicar-documentos-legais.test.ts` | cada cliente aceita de novo; o deploy **não** publica sozinho, o executor grava no banco (uso único) |
| Livro-razão | crítico (dados) | tabela `aurea.ledger_entries` (produção) | 132 hashes (ids 493–624) recalculados; nenhum valor mudou; backup fora do repositório |
| Análises e recibos | crítico (dados) | `aurea.analises`, `aurea.recibos` (produção) | cadeia do GENESIS refeita duas vezes; posições voltaram ao lugar físico |
| Rotas e 404 | contrato | `src/middleware.ts`, `src/server/rotas-publicas.ts`, `src/app/not-found.tsx` | deslogado em endereço desconhecido vê 404; lista de segmentos protegidos obrigatória para segmento novo |
| Comparativo com cripto | remoção | `/mercado/comparacoes` | redireciona a `/mercado` |
| Dias úteis | domínio | `src/domain/dias-uteis.ts`, `dates.ts` | previsão do saque pula fim de semana e feriados nacionais; datas com fuso `America/Sao_Paulo` |
| KPIs do conselho | tela | `/admin/resultados/kpis?aba=conselho` | custo logístico saiu; pagante, churn em 3 motivos, LTV provisório de 12 meses |
| Registro de atalhos | doc | `RISCOS_ASSUMIDOS.md` (RA-61 atualizado) | Política ainda não cita Meta explicitamente |

## 2. O que NÃO mudou de estrutura
Stack, camadas (`domain`/`server`/`app`/`components`/`lib`), persistência plugável, regras de comissão (0,5% + R$ 1,00), custódia (R$ 2,00/moeda/mês) e a regra única da custódia. `fees.ts`, `constants.ts` e o contrato de `store/types.ts` não foram tocados.

## 3. Atualizações de MD de pasta
`src/server/db/migrations/README.md` (058, 059); `Central de Organização/README.md` e índices (várias atualizações em 22/11); `docs/diario/execucoes/` ganhou 10 MDs de execução do dia; `docs/pwa/DIAGNOSTICO_PWA.md` e `ROTEIRO_IPHONE_REAL.md`; `docs/kpis/*`.

## 4. Observações
- Arquivos soltos na raiz seguem sem commit (`corrigir-videos-e-posicoes.cjs` **só com `--so-videos`**), `.agents/`, `docs/polimento/**`, `docs/processo/`.
- Limite conhecido: relatórios que agrupam o livro inteiro por e-mail (`relatorios/dados.ts`, `admin/moedas.ts`) veem o e-mail da época nas linhas antigas.
