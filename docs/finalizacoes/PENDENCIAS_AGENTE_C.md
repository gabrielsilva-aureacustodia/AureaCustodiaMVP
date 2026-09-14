# Pendências da frente C — painel administrativo

```
Frente:  C · feat/c-painel-admin · worktree C:\dev\AureaCustodiaMVP-admin
Regra:   só o Agente C escreve aqui (protocolo, regra 8). Item resolvido não some:
         vira ✅ FEITO em dd/mm.
```

Cada item diz **o que falta**, **quem pode fazer**, **o que fica esperando** e **como conferir**.

---

## C1 — Fundação e Central de Resultados

### P-C1-01 · Aplicar as migrations 020 e 021 no Supabase de produção

- **Quando:** logo depois de a C1 entrar na `main` e o deploy da Vercel terminar — publicar e migrar
  são um passo só, nessa ordem (aprendizado de 11/09 no README das migrations).
- **Quem:** Gabriel, ou o agente de auditoria que levar a C1 para a `main`.
- **O que fica esperando:** a tabela de equipe (até lá, entra quem está na lista do ambiente, como
  dev — RA-40) e a gravação do registro de uso (até lá, `POST /api/eventos` responde 204 sem gravar).
  **Nada quebra sem elas:** as duas só criam tabelas, e o código cai no bootstrap se não as achar.
- **Comando**, no PowerShell, na pasta principal com a `main` atualizada:

```bash
npm run db:migrate
```

```bash
npm run db:check
```

- **Como conferir:** o `db:migrate` imprime `+ 020_admin_rbac` e `+ 021_eventos_uso`; o `db:check`
  lista as duas em "migrations aplicadas". Se `014` a `019` das outras frentes já estiverem na `main`,
  aparecem juntas — a ordem não importa, nenhuma depende da outra.

### P-C1-02 · Conferir em produção o "pronto quando" da C1

- **Quem:** Gabriel, depois do P-C1-01.
- **Roteiro:**
  1. Entrar em `https://aurea-custodia-mvp.vercel.app/entrar` com uma conta de sócio do seed (senha
     `12345678`). No menu do app aparece **Administração**; clicar abre `/admin`. (Endereço conferido
     em 14/09, respondendo 200; no domínio próprio, o caminho é o mesmo.)
  2. Abrir `/admin/resultados/financeiro`, `/contabil`, `/kpis` e `/uso` — as quatro carregam.
  3. Em `/admin/resultados/uso`, a trilha filtrada por "Ações do painel" fica vazia até a primeira ação;
     o cartão "Páginas abertas" cresce conforme a navegação.
  4. Entrar com uma conta criada por `/cadastrar`: o menu do app **não** mostra Administração, e
     `/admin` manda para `/inicio`.
  5. `https://aurea-custodia-mvp.vercel.app/relatorios` leva à Central de Resultados.
- **Se quiser usar o e-mail real** (`gabriel.silva@aureacustodia.com.br`) no painel: entre com uma
  conta de sócio do seed, abra `/admin/equipe` e dê acesso a ele com o papel **Desenvolvimento**. Não
  precisa mexer em variável de ambiente.

### P-C1-03 · Remover o painel antigo de relatórios, que ficou sem uso

- **O que:** `src/components/relatorios/` (`RelatoriosPainel.tsx` e o README),
  `src/server/actions/contabil.ts` e a função síncrona `autorizarRelatorio` de
  `src/server/relatorios/acesso.ts` (junto com os testes dela em `acesso.test.ts`). Desde a C1,
  `/relatorios` redireciona para `/admin/resultados/financeiro`, que reorganizou esse conteúdo com as
  permissões dos papéis.
- **Por que não removi:** os arquivos não estão na tabela de territórios da rodada, e remover é
  decisão de limpeza, não requisito da C1. Deixei a nota no topo do README da pasta.
- **Quem:** qualquer agente, com o seu aval, numa limpeza depois das três frentes na `main`.
- **O que fica esperando:** nada.
- **Como conferir:** depois da remoção, `npm run typecheck`, `npm test` e `npm run build` verdes, e
  nenhuma ocorrência de `RelatoriosPainel` em `src/`.

### P-C1-04 · Gaveta de verificação `aurea_local_admin` no Supabase (informativo)

- **O que é:** um schema separado, criado em 14/09 pelo `npm run db:migrate` com
  `AUREA_DB_SCHEMA=aurea_local_admin` — o caminho de ambiente local descrito em
  `src/server/db/README.md`. Serviu para conferir o painel no navegador contra um Postgres de verdade
  **sem tocar no schema `aurea`**. Tem só dado de demonstração: o seed, um papel "Contador" de teste,
  a conta `rozane@testeaurea.com.br` com esse papel, uma despesa lançada e estornada e ISS de 2,5%.
- **O que fica esperando:** nada. A C2 e a C3 podem reutilizá-la para a mesma conferência.
- **Se quiser apagar** (opcional, Gabriel), no editor SQL do Supabase:

```sql
DROP SCHEMA aurea_local_admin CASCADE;
```

- **Como conferir que foi apagada:** com a variável `AUREA_DB_SCHEMA` definida como
  `aurea_local_admin`, o `npm run db:check` responde "migration NÃO aplicada".
