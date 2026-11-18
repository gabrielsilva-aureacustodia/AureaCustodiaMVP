# Frente B: 1º mês de custódia no envio — memória do agente

- **Data:** 2026-11-17 · **Agente:** claude-code (auditoria B) · **Projeto/branch:** AureaCustodiaMVP · `claude/manut-primeiro-mes-no-envio-1ff25c` (base `9e21fe1`)

## 1. Estado em uma tela
Pronto para merge (sem commit). O pagamento do envio (saldo, Pix, cartão) cobra frete + 1º mês das moedas numa cobrança; o wizard mostra Frete, Custódia (1º mês) e Total; a recusa na análise devolve o mês da moeda recusada; as seis vias de compra já cobravam o mês e agora têm teste. Falta: conferência visual em produção, bateria completa no merge, decisão fiscal sobre a NFS-e do mês.

## 2. Decisões e o porquê
- D4 (obrigatório, mesmo pagamento, recusa devolve o mês das recusadas) — padrão da ficha; Gabriel pode mudar com uma linha no wizard.
- `Envio.frete.valorCents` continua só o frete — para DRE e ledger não misturarem frete com custódia; o mês é a fatura `origem:'contratacao'` do plano do envio, quitada na mesma transação.
- Módulo de domínio novo `src/domain/primeiro-mes-do-envio.ts` — arquivo `'use server'` só exporta async e o cálculo é usado por três arquivos; aprovado pelo chat de branch.
- Regra do Gabriel (17/11/2026, via Controle): "Nada de servidores locais ou containers, tudo sempre direto pra produção" — a conferência visual vai para produção.

## 3. O que aprendi (armadilhas, comandos, caminhos)
- O estorno parcial por moeda já existia em `alimentarPlanoNaAnalise` (`estornadoCents` + lançamento `estorno` em `derivar.ts`); `estornarFaturaPaga` estorna a fatura inteira e cancela a NFS-e, não serve para parcial.
- Contrato B↔H: `PlanoCustodia.protocoloEnvio` → fatura `origem:'contratacao'`; `faturasDoEnvio(state, protocolo)`. Plano cancelado (recusa total) só se acha pelo protocolo, não por `primeiroMesDoEnvio`.
- Teste com tabela de custódia a R$ 3,50 prova a ausência de número fixo.
- Com a máquina sem RAM, `git status` pode falhar com "malloc failed"; não repetir em laço. Vitest `--maxWorkers=1`, um comando por vez.
- No hook da auditoria, o registro vivo do Controle está fora da pasta do repositório (`side-session-notes`).

## 4. Como continuar (próximos passos exatos)
1. Controle mescla na onda 3 (antes de H) e roda `eslint src`, `vitest run` e `npm run build`.
2. Conferir em produção: envio de 2+ moedas até o passo 4 (Frete, Custódia com (i), Total = frete + mês; passo 3 sem pagamento).
3. Frente H: estornar a fatura de contratação em `desconsiderarEnvio`, usando `faturasDoEnvio`.
4. Contador: responder as 3 perguntas da NFS-e do mês (no pagamento ou no aceite? cancelar e reemitir ou nota de ajuste? efeito na DRE).

## 5. Pendências e riscos
- Recusa não cancela a NFS-e do mês e, na recusa total, a fatura segue `paga` (Gabriel/contador).
- Sem contrato dos Correios o mês é fatura paga na tela, não junto com o frete.
- Pix de compra aberto antes de mudar a tabela usa a tabela da conciliação.
- Ledger do mês não diz "do envio X" (F pode montar pelo `protocoloEnvio`).

## 6. Ligações
`docs/diario/execucoes/2026-11-17--manut-b-primeiro-mes-no-envio--MD_EXECUCAO.md`, `--CONTINUIDADE.md`, `--LOG_DE_EXECUCAO.md`, `--RELATORIO_*.md`, `pesquisa/B-existe-x-falta.md`. Memórias: [[contrato-correios-cws]], [[regra-de-negocio-so-com-pergunta]].
