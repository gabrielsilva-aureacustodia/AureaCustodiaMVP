# E-mails de movimentação (frente C) — memória do agente

- **Data:** 2026-11-17 · **Agente:** claude-code (auditoria) · **Projeto/branch:** manut-emails-de-movimentacao

## 1. Estado em uma tela
Código pronto na branch (0 commits): `src/server/emails/`, gancho em `db/estado.ts` e `state.ts`, `Idempotency-Key` em `src/lib/email/`, migration 053 escrita e NÃO aplicada, 111 testes verdes segundo a Execução; build rodou uma vez (relato), o oficial é do Controle. Nenhum e-mail sai em produção até existirem `RESEND_API_KEY` e `EMAIL_REMETENTE` na Vercel (ausentes em 17/11/2026).

## 2. Decisões e o porquê
- E-mail transacional: Resend no plano grátis, fila no banco com chave única (`aurea.emails_pendentes`), Titan (HostGator, domínio aureacustodia.com.br) só como reserva — custo hoje R$ 0,00 (~130 e-mails/mês, pico 37/dia; grátis cobre 3.000/mês e 100/dia).
- O e-mail nasce na mesma transação da mutação e sai depois da resposta (espelho do NFS-e): se a operação desfaz, o aviso some junto.
- Saque NÃO é da central: segue em `src/server/saques/avisos.ts` (decisão do Controle, 17/11/2026). Depósito = "sempre" (dinheiro entrando).
- **Gabriel, 17/11/2026: "Nada de servidores locais ou containers, por favor, tudo sempre direto pra produção."** Amplia [[sem-docker-local]]: nem `npm run dev`, preview ou servidor local; conferência visual em produção após o deploy; typecheck/build/testes só no fim da branch, um por vez, quando o Controle liberar pela memória.

## 3. O que aprendi
- Com 15 sessões, a máquina chega a 0,2 GB de RAM livre: PowerShell e fork do Bash falham (erro 1455); testes de banco precisam de `--no-file-parallelism`.
- Retirada não aparece no diff do estado (tabela própria): precisa de função exportada e linha de encaixe; troca de senha vai pelo Supabase Auth.
- Guarda de SQL: arquivo novo com interpolação de schema exige entrada em `src/server/db/sql-injecao.baseline.json`; tabela nova entra em `db.test.ts`.
- Pesquisa de custo leu o banco com `BEGIN READ ONLY`/`ROLLBACK`, sem `SET` ([[leitura-de-producao-sem-set-de-sessao]]).

## 4. Como continuar
1. Gabriel cria `RESEND_API_KEY` e `EMAIL_REMETENTE` na Vercel (roteiro: seção 6 de `docs/diario/execucoes/PESQUISA_CUSTO_EMAIL.md`).
2. Controle aplica a migration 053 no commit e as linhas de encaixe E1–E4 (tabela no MD de execução).
3. Fechamento da branch: typecheck e build, um por vez, quando houver memória.

## 5. Pendências e riscos
- Testes rodados pela Execução; liberação do Controle: não confirmada (build rodou uma vez como relato).
- 1 e-mail por moeda analisada pode passar da estimativa de 1 por envio; mudar é uma linha no catálogo.

## 6. Ligações
[[sem-docker-local]], [[terminologia-juridica-aurea]], [[migration-nova-se-aplica-no-commit]]; MD de execução `docs/diario/execucoes/2026-11-17--manut-c-emails-de-movimentacao--MD_EXECUCAO.md`.
