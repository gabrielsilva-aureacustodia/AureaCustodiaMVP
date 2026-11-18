# KPIs do conselho no painel — memória do agente

- **Data:** 2026-11-18 · **Agente:** claude-code (chat de branch da frente J, executou sozinho) · **Projeto/branch:** manut-kpis-do-conselho (`claude/manut-kpis-do-conselho-7a21c4`)

## 1. Estado em uma tela
`/admin/resultados/kpis` ganhou duas abas: "Aquisição e atendimento" (CAC de hoje/7 dias/mês, funil visita → cadastro → 1ª transação, gasto digital × analógico, casos de atendimento) e "Gasto de marketing" (entrada manual por canal e intervalo de dias, migration 057). Domínio puro em `src/domain/kpis.ts` (`montarKpisDeAquisicao`), 45 testes verdes. Código pronto na branch (0 commits, base `c85b3da`). Faltam, do Controle: aplicar a 057 no commit, typecheck/suíte/build e a conferência visual em produção.

## 2. Decisões e o porquê
- Regra de sempre do `kpis.ts`: **sem fonte, `null`, nunca zero**. CAC sem gasto informado = "—"; nenhum número de mídia é inventado.
- Cadastro = `saldo_inicial` do ledger (`datasDeCriacao`); `aurea.users` não tem data de criação. Ativado = 1ª entrada de dinheiro (menos `custodia_recebida_fora`, que é a equipe registrando) ou 1ª compra/venda; contas da equipe/teste fora.
- Gasto por **intervalo de dias de Brasília**, repartido igualmente pelos dias; "estimado" quando a janela pega só um pedaço. Não se edita nem se apaga: cancela com motivo (trilha `admin.marketing.registrar|cancelar`).
- Permissão existente: `contabil.lancar` (mesma do controle financeiro, decisão do Gabriel de 25/10/2026), `resultados.ver`, `cs.ver` para os casos. Nenhuma permissão nova, `permissoes.ts` intacto.
- Origem analógica × digital: o cadastro não tem o campo → só **proposta** (`docs/kpis/PROPOSTA_DE_KPIS.md`, seção 4); o gasto já se separa por natureza.
- Visitas ao site são digitadas (opcional): Pixel e API de Conversões só enviam à Meta, o site não lê de volta.

## 3. O que aprendi (armadilhas, comandos, caminhos)
- `Periodo` (`dre.ts`) nasce no fuso do servidor (UTC na Vercel); os KPIs de aquisição usam dias de Brasília em texto (`'AAAA-MM-DD'`, `diaDeBrasilia`) para um dia de diferença na borda do mês não trocar o CAC.
- Arquivo novo com `${S}` em SQL reprova `sql-injecao.test.ts` até entrar em `sql-injecao.baseline.json` (ordem alfabética, expressões distintas).
- Sem memória: `tsc` restrito a uma `tsconfig` temporária (`extends` + `include` só dos arquivos da frente, `--max-old-space-size=900`) deu exit 0 sem pesar; apagar a `tsconfig` depois. Heredoc longo no Bash falhou ("unexpected EOF"); `Edit` no arquivo é mais seguro. Não rodar `python -` com heredoc vazio (trava).
- A leitura de casos fica num arquivo novo (`repositories/marketing.ts`) porque `casos.ts` é da frente de atendimento.

## 4. Como continuar (próximos passos exatos)
1. Controle: commit + `npm run db:migrate` (057) + typecheck/suíte/build; abrir `/admin/resultados/kpis?aba=aquisicao` e `?aba=gasto` em produção (desktop e celular), lançar um gasto de teste e cancelá-lo.
2. Gabriel: completar a tabela da seção 3 da PROPOSTA com a lista do WhatsApp de 3/11 (D2) e decidir J1–J5 (seção 6).
3. Próxima rodada: origem do cadastro (campo + `?origem=` nos QR codes), com a frente da tela de cadastro; WhatsApp no atendimento.

## 5. Pendências e riscos
- SQL de `marketing_gastos` e da leitura de casos **não rodou contra Postgres real** (só a guarda de SQL e testes com dublê). **Visual só em produção.** Suíte completa, typecheck completo e build não rodaram (memória).

## 6. Ligações
MD de execução `docs/diario/execucoes/2026-11-18--manut-j-kpis-do-conselho--MD_EXECUCAO.md`, ficha `docs/manutencao-2026-11/frentes/J-kpis-do-conselho.md`, `docs/kpis/PROPOSTA_DE_KPIS.md`. `[[terminologia-juridica-aurea]]`, `[[migration-nova-se-aplica-no-commit]]`, `[[sem-docker-local]]`.
