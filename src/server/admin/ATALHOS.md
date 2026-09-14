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

## RA-41 🟡 — registro de uso sem consentimento, sem retenção, agregado em memória

**Arquivos:** `uso.ts` (`gravarEventosDeUso`, `carregarUsoNoBanco`), `resultados.ts` (`carregarUso`),
`src/domain/admin/uso.ts`; a rota é `src/app/api/eventos/` e o anotador no navegador é
`src/components/providers/RegistroDeUso.tsx`.

- Grava páginas e cliques de quem está logado sem aviso nem consentimento (ambiente de sócios).
- `aurea.eventos_uso` não tem prazo de retenção nem rotina de expurgo.
- A tela agrega em memória: `LIMITE_EVENTOS` (50 mil) e `LIMITE_ACOES_TRILHA` (20 mil) por
  período. Passou do teto, a tela diz que os números cobrem só o começo do período.

**Como se paga:** aviso na política de privacidade e prazo de retenção com expurgo (jurídico)
antes de cliente real; agregação em SQL quando o volume pedir.

---

## O que NÃO é atalho nesta pasta

- **O papel `dev` tem todas as permissões, e o painel não deixa ficar sem um `dev` ativo**
  (`rbac.ts`). São as duas proteções que impedem alguém de trancar a equipe fora por um clique
  errado — não travas de operação.
- **`rank` não recusa nada.** Ordena a tela de papéis; não existe regra de "só atribui papel de
  rank menor". Decisão do Gabriel: papéis e permissões são a funcionalidade, não barreira.
- **Desativar um membro vale na requisição seguinte.** O papel é relido do banco a cada tela e
  a cada Server Action; não existe credencial de papel guardada no navegador para expirar.
