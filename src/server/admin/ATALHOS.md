# Atalhos assumidos nesta pasta

> Notas locais dos atalhos tomados em `src/server/admin/` (painel administrativo, frente C).
> O documento que compila todos está na raiz: [`RISCOS_ASSUMIDOS.md`](../../../RISCOS_ASSUMIDOS.md).

---

## RA-40 🟠 — quem está no bootstrap do ambiente entra como `dev`

**Arquivos:** `acesso.ts` (`carregarMembro`, `podeAbrirPainelAdmin`), `rbac.ts`
(`carregarMembroNoBanco`, `abrePainelNoBanco`), `src/domain/admin/permissoes.ts`
(`ehEmailDeBootstrap`, `resolverMembro`)

- E-mail que `aurea.admin_membros` não conhece e que está em `AUREA_ADMIN_EMAILS` — ou, sem a
  variável, em `ACCOUNTS` — entra como `dev`.
- Se a leitura dos papéis falhar, `acesso.ts` registra o erro no log e usa só o bootstrap.

**Por quê:** a tabela nasce vazia, e a migration 020 entra no banco depois do código publicado.
Sem o bootstrap, o primeiro acesso ao painel em produção trancaria todo mundo fora.

**O que fica descoberto:** as contas de demonstração são `dev` enquanto a variável não existir;
e um e-mail do ambiente rebaixado pela tela volta a ser `dev` durante uma falha do banco.

**Como se paga:** `AUREA_ADMIN_EMAILS` com os e-mails reais, equipe cadastrada em
`/admin/equipe` e contas de demonstração removidas (RA-19), antes de cliente real.

---

## O que NÃO é atalho nesta pasta

- **O papel `dev` tem todas as permissões, e o painel não deixa ficar sem um `dev` ativo**
  (`rbac.ts`). São as duas proteções que impedem alguém de trancar a equipe fora por um clique
  errado — não travas de operação.
- **`rank` não recusa nada.** Ordena a tela de papéis; não existe regra de "só atribui papel de
  rank menor". Decisão do Gabriel: papéis e permissões são a funcionalidade, não barreira.
- **Desativar um membro vale na requisição seguinte.** O papel é relido do banco a cada tela e
  a cada Server Action; não existe token de papel guardado no navegador para expirar.
