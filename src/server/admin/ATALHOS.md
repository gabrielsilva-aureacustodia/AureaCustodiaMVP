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

## RA-48 🟡 — o e-mail do Gabriel é `dev` pelo código; a entrada `/painel`

**Arquivos:** `acesso.ts` (`membroDaPagina`, `ENTRADA_DO_PAINEL`), `src/domain/admin/permissoes.ts`
(`EMAILS_FIXOS_DA_EQUIPE`), `src/app/painel/`, `src/server/auth/destino.ts`

- `gabriel.silva@aureacustodia.com.br` entra como `dev` com ou sem `AUREA_ADMIN_EMAILS` — o link
  publicado abria o site do cliente porque o e-mail dele não estava no bootstrap.
- Sem sessão, ou com conta fora da equipe, `/admin` manda para `/painel`, que diz qual é a conta.

**Como se paga:** Gabriel cadastrado em `/admin/equipe`, lista fixa vazia e `AUREA_ADMIN_EMAILS`
com a equipe, antes de cliente real.

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

## RA-43 🟡 — senha provisória definida pelo painel, sem segundo fator nem troca obrigatória

**Arquivos:** `usuarios.ts` (`criarUsuario`, `redefinirSenha`), `identidade.ts` (`criar`,
`definirSenha`, `enviarLinkDeSenha`)

- O atendente digita a senha; ela vai ao Supabase Auth pela chave de serviço e não fica na
  plataforma nem na trilha (a trilha guarda só o modo: `link`, `provisoria`, `identidade_criada`).
- Não há troca obrigatória no primeiro acesso nem segundo fator.
- O link de redefinição autentica pelo callback do login, mas o site ainda não tem a tela de nova
  senha sem a senha atual (pedido à frente A em `PENDENCIAS_AGENTE_C.md`).

**Como se paga:** troca obrigatória no primeiro acesso, tela de nova senha na recuperação e
segundo fator, antes de cliente real.

---

## RA-44 🟡 — desativar conta fecha o Supabase; catálogo e sessão aberta esperam a frente A

**Arquivos:** `usuarios.ts` (`mudarSituacaoDaConta`), `situacao.ts` (`contaDesativada`),
`src/server/db/repositories/admin-usuarios.ts`

- A identidade é bloqueada no Supabase (`ban_duration`) e a situação é registrada em
  `aurea.admin_situacao_contas`.
- A entrada pelo catálogo de demonstração e o cookie de sessão já emitido não consultam nada disso
  até a frente A chamar `contaDesativada` no login, no callback e no casco do app.
- Sem `SUPABASE_SERVICE_ROLE_KEY`, só o registro acontece, e a mensagem da ação diz isso.

**Como se paga:** a checagem da frente A (pedido em `PENDENCIAS_AGENTE_C.md`).

---

## RA-45 🟡 — bancada web: sem retomada, sem cópia em disco, trilha fora da transação da análise

**Arquivos:** `bancada.ts` (`fecharPelaBancadaWeb`, `assinarVideoPelaBancadaWeb`), `portas.ts`
(`portaDaBancadaDoServidor`), `src/components/admin/bancada/`

- A análise é gravada por `fecharAnalise()` (src/server/estacao/analise.ts, da frente B), que abre a
  própria transação. A linha `admin.bancada.analisar` vai depois, noutra — se ela falhar, o erro vai
  para o log e o operador vê a análise gravada.
- A validação de peso, motivo e quantidade é cópia da rota da estação (`src/domain/admin/bancada.ts`),
  congelada pelo teste. A recusa de posição ocupada existe só aqui.
- O vídeo sobe direto do navegador para o Storage por URL assinada; se não subir, a cópia é um link
  que dura enquanto a página estiver aberta.

**Como se paga:** a estação e o painel chamando a mesma validação exportada, e retomada de
procedimento no navegador (armazenamento local do rascunho), se a bancada de verdade passar a usar a
web.

---

## RA-46 🟠 — taxa e prazo publicados na hora; publicação do documento em transação separada

**Arquivos:** `configuracao.ts` (`salvarGrupoDeConfiguracao`, `publicarDocumentoVigente`)

- Valor, histórico e `admin.config.<grupo>` gravam juntos. Depois do commit, a Tabela de Taxas ou os
  Termos são publicados pela função da A3, que abre a própria transação.
- Publicação que falha não desfaz a taxa: a mensagem manda usar "Publicar a versão vigente", e a
  aba mostra a diferença entre o texto que a configuração produz e o último publicado.
- A faixa de versão nova pede o aceite e não bloqueia operação nenhuma.

**Como se paga:** regra de antecedência para mudança de taxa, se os sócios decidirem por uma.

---
## O que NÃO é atalho nesta pasta

- **O papel `dev` tem todas as permissões, e o painel não deixa ficar sem um `dev` ativo**
  (`rbac.ts`). São as duas proteções que impedem alguém de trancar a equipe fora por um clique
  errado — não travas de operação.
- **`rank` não recusa nada.** Ordena a tela de papéis; não existe regra de "só atribui papel de
  rank menor". Decisão do Gabriel: papéis e permissões são a funcionalidade, não barreira.
- **Desativar um membro vale na requisição seguinte.** O papel é relido do banco a cada tela e
  a cada Server Action; não existe credencial de papel guardada no navegador para expirar.
- **Conta da equipe não é desativada pela ficha do usuário** (`mudarSituacaoDaConta`), e
  `contaDesativada` nunca responde "desativada" para quem abre o painel. É a mesma proteção de
  sempre — ninguém tranca a equipe fora por uma tela que não é a de Equipe e papéis.
- **O ajuste de saldo pede motivo.** Não é confirmação: é o dado que explica o lançamento
  `ajuste` no livro-razão, gravado na mesma transação.
