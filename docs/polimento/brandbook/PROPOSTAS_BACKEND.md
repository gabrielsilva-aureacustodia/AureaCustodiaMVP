# Propostas fora do escopo da Frente 1 — para o orquestrador perguntar ao Gabriel

```
De: Frente 1 (brandbook), 25/10/2026. NADA daqui foi aplicado.
```

| # | Proposta | Onde | Por quê | Risco de não fazer |
|---|---|---|---|---|
| P1 | Atualizar a regra dos anéis olímpicos no `CLAUDE.md`: "anéis só como parte da moeda real retratada; nunca soltos como ornamento" | `CLAUDE.md` §Restrições de marca | decisão do Gabriel em 25/10/2026 ("ignora esse problema do CLAUDE.md"); o texto atual proíbe e faria outros agentes barrarem os ativos da Frente 2 | agentes futuros removem ou recusam os renders da Bandeira |
| P2 | Abrir a rota `/marca` como pública (vitrine viva do Brandbook: tokens, tipografia, componentes, logo) | `src/server/rotas-publicas` + `src/app/marca/page.tsx` | conferir o sistema sem login e servir de documentação do futuro package, como a vitrine do `@k2con/ui` | o sistema só é visto dentro das telas |
| P3 | Trocar "corretagem" por "comissão de negociação" nos textos versionados (Tabela de Taxas, Termos) | `src/domain/` (textos legais) e páginas `/taxas`, `/suporte` | piso jurídico proíbe "corretora/corretagem" para a plataforma | contradição com o vocabulário aprovado; exige nova versão da Tabela/Termos |
| P4 | Pôr `SUPABASE_PUBLISHABLE_KEY` no `.env.local` das máquinas de desenvolvimento (o valor está na Vercel, marcado como sensível — ilegível pela API) | `.env.local` (não versionado) | sem ela `createAuthClient` lança `AuthConfigurationError` e **nenhuma conta entra no `npm run dev`** — foi o que impediu a conferência das telas logadas nesta frente | toda frente de interface fica sem testar a área logada localmente |
| P5 | Ícones de app e favicon a partir do emblema (180/192/512/32/16 px) | `src/app/icon.png`, `apple-icon.png` | os atuais não seguem a área de proteção do Brandbook §3.1 (não conferido a fundo) | — |
| P6 | Transformar `src/brand/` em workspace `@real-olimpico/marca` no fim do polimento | `package.json` (workspaces) | pedido original do Gabriel; a pasta já está isolada (não importa `@/domain` nem `@/server`) | — |
| P7 | Conta de teste `brandbook.visual@testeaurea.com.br` criada no Supabase Auth (25/10/2026) para verificação visual; credenciais só no `.env.local` desta máquina (`RO_TESTE_*`) | Supabase Auth | pedido do Gabriel; apagar quando o polimento acabar | conta de teste esquecida em produção |
