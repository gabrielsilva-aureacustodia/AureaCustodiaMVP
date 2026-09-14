# Relatório da frente C — painel administrativo

```
Rodada:      finalizações de 13/09/2026
Frente:      C · feat/c-painel-admin
Worktree:    C:\dev\AureaCustodiaMVP-admin
Desenho:     docs/PLANO_EXECUCAO_ADMIN.md, com a seção 6 de docs/finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md
Pendências:  docs/finalizacoes/PENDENCIAS_AGENTE_C.md
```

> **Para o Rogério.** O painel de administração existe: quem é da equipe entra em `/admin` com o
> mesmo login do site. A primeira parte pronta é a Central de Resultados — o financeiro com a DRE,
> a parte contábil, os indicadores do negócio e o uso da plataforma — e a tela de equipe, onde se
> escolhe quem acessa e o que cada um pode fazer. Atendimento, usuários, bancada, moedas, logística e
> configuração já aparecem no menu e chegam nas duas próximas entregas.

---

## C1 · Fundação e Central de Resultados — `feat/c1-fundacao-e-resultados`

**C1 pronta para main — merge d00096b**

**Base:** `origin/main` @ `3358845`. **Commits:** `c22ae15` (papéis, permissões e acesso),
`c57fb30` (casco, Central de Resultados, equipe e registro de uso) e `42f2a83` (relatório e
pendências), trazidos para `feat/c-painel-admin` pelo merge `--no-ff` `d00096b`. Depois de levar
para a `main`: P-C1-01 (migrations 020 e 021) e P-C1-02 (conferência em produção).

### O que entrou, pela seção do plano do Admin

| Seção | Entrega |
|---|---|
| 1.1 | `020_admin_rbac.sql`: `admin_permissoes`, `admin_papeis`, `admin_papel_permissoes`, `admin_membros`, RLS em todas. Catálogo e papéis de sistema (`dev` 100, `socio` 50, `operacao` 10) upsertados pelo código na primeira leitura, como o plano de contas |
| 1.2 | `src/domain/admin/permissoes.ts`: as 22 permissões `modulo.acao` do plano; `dev` com todas, `socio` sem `admin.papeis` e `admin.membros`, `operacao` com `bancada.*` e `logistica.*` |
| 1.3 | `src/server/admin/acesso.ts`: `carregarMembro`, `temPermissao`, `exigirPermissao` (e `permissaoParaAcao`, a versão que não lança). Bootstrap: e-mail que a tabela não conhece e está em `AUREA_ADMIN_EMAILS` — ou, sem ela, nas contas do seed — entra como `dev`. As rotas de `/api/relatorios/*` e `/api/admin/conciliacao` passaram a consultar os papéis |
| 1.4 | Casco em `src/app/(admin)/admin/` (layout com guarda no servidor, painel inicial por variante, fronteira de erro), `AdminSidebar` já com os itens de C2 e C3, `AdminTopbar`, `AdminProvider`, `src/styles/admin.css` importado antes de `responsive.css` |
| 1.5 | `021_eventos_uso.sql`, `POST /api/eventos` e `RegistroDeUso` (em `src/components/providers/`) nos layouts do app e do painel |
| 1.6 | `/admin/resultados/financeiro`, `/contabil`, `/kpis` e `/uso`; `src/domain/kpis.ts` puro e testado |
| 1.7 | `/relatorios` redireciona para `/admin/resultados/financeiro`, levando o período; `/api/relatorios/*` sem mudança de endereço |
| 6.1 (finalizações) | Item do menu do app aponta para `/admin` ("Administração"). KPIs com comissão por lado, ocupação da fila, tempo até a execução (A2), planos mensal × anual (B2) e faturas em aberto. Cartão "Recebimentos do Mercado Pago" com "disponível depois da B3" |

A seção 1.8 (alinhar a documentação) é da A1.7; aqui entrou só o parágrafo do módulo Admin no
`CLAUDE.md`.

### Decisões tomadas dentro do plano — e como explicar cada uma

1. **O papel `dev` tem todas as permissões, sempre, e o painel nunca fica sem um `dev` ativo.** São as
   duas únicas recusas de regra da tela de equipe. *Para o Rogério:* sempre sobra alguém capaz de
   consertar as permissões — ninguém tranca a equipe para fora por um clique errado. `rank` não recusa
   nada, como o plano pede.
2. **`ehAdmin()` continuou síncrona e com a mesma resposta**; quem consulta os papéis é uma função nova,
   `autorizarRelatorioNoPainel`. Trocar a assinatura para assíncrona faria um `if (!ehAdmin(x))` que
   outra frente escreva em paralelo virar `!Promise` — sempre falso —, e todo mundo passaria a ser
   administrador sem erro de compilação.
3. **Leitura de CSV, XLSX e envio ao Sheets pedem `resultados.exportar`; a leitura em tela pede
   `resultados.ver`.** Um papel "contador" vê a DRE sem levar a planilha de extratos de todas as contas.
   A chave de integração do Sheets e do Excel (`AUREA_RELATORIOS_TOKEN`) continua valendo como antes.
4. **A tela Equipe e papéis entrou na C1**, porque o plano entrega "RBAC completo" nesta branch e diz que
   as concessões são "ajustáveis pelo próprio painel, em uma tela, sem deploy".
5. **O registro de uso anota páginas e cliques em elementos com `data-uso`**, sem editar componente de
   outra frente. As ações de negócio (vendeu, pediu retirada) já estão na trilha de auditoria, e a tela
   de Uso lê as duas fontes juntas.
6. **Indicador que depende de outra frente mostra "disponível depois da A2/B2/B3"**, nunca zero. A
   comissão por lado lê `feeComprador`/`feeVendedor` com a regra de leitura da A1, e os planos leem
   `planosCustodia` pelo nome — os dois acendem sozinhos quando as frentes entrarem.
7. **Se o banco falhar ao ler os papéis, vale o bootstrap do ambiente** em vez de derrubar a tela
   (RA-40). É o que torna seguro publicar o código antes de rodar a migration.
8. **As páginas de C2 e C3 já existem como provisórias**, conferindo a permissão, para o menu nascer
   completo sem link quebrado; C2 e C3 só substituem o `page.tsx`.

### Arquivos fora da lista de território, editados porque o plano pede

Nenhum deles aparece na tabela 3.1 como de outra frente.

| Arquivo | Por quê |
|---|---|
| `src/server/relatorios/acesso.ts` | Seção 1.3: `ehAdmin` passa a delegar para a regra do domínio (mesmo resultado) e ganha `autorizarRelatorioNoPainel` |
| `src/app/api/relatorios/route.ts`, `[relatorio]/route.ts`, `sheets/route.ts`, `src/app/api/admin/conciliacao/route.ts` | Seção 1.3: a autorização passa pelos papéis; mesmos códigos 401/403 |
| `src/app/(app)/layout.tsx` | Seção 6.1 e 1.5: o item do menu pergunta pelos papéis e o registro de uso é montado |
| `src/app/(app)/relatorios/page.tsx` | Seção 1.7: redirecionamento |
| `src/components/providers/RegistroDeUso.tsx` (novo) | Seção 1.5 nomeia a pasta |
| `src/server/db/repositories/admin-rbac.ts`, `eventos-uso.ts`, `painel-leituras.ts` (novos) | "Tabelas próprias, fora do `AppState`" (tabela 3.1) — o plano põe o SQL em `repositories/` |
| `src/server/db/db.test.ts` | O teste confere a lista exata de tabelas do schema; entraram as cinco novas |
| `CLAUDE.md` (um parágrafo), `docs/API_RELATORIOS.md` (autorização), READMEs de `src/app/`, `src/domain/`, `src/server/relatorios/`, `src/components/relatorios/`, `src/server/db/migrations/`, `src/server/db/repositories/`, `src/server/relatorios/ATALHOS.md` | Documentação que a mudança tornou incompleta ou falsa |

### Testes novos — 103, em 11 arquivos

A suíte foi de **48 arquivos e 347 testes** para **59 arquivos e 450 testes** (1 pulado, o de banco
real, como antes). `npm run typecheck`, `npm run lint` e `npm run build` limpos.

| Arquivo | Testes | O que protege |
|---|---|---|
| `src/domain/admin/permissoes.test.ts` | 20 | Catálogo, papéis de sistema, bootstrap igual ao `ehAdmin`, resolução do membro, proteção do último dev |
| `src/domain/kpis.test.ts` | 12 | Um mês montado à mão: mercado com comissão por lado, acervo, contas, funil e recusa por motivo, tempos, faturas, fila, planos, e `null` (não zero) sem A2 e B2 |
| `src/domain/admin/uso.test.ts` | 11 | Rota sem e-mail nem identificador, lote limpo, plataforma resumida, horário de Brasília, jornada até a primeira venda |
| `src/domain/admin/contabil.test.ts` | 6 | Data ao meio-dia, conta automática recusada, teto, estorno, alíquota |
| `src/domain/admin/periodo.test.ts` | 5 | A mesma regra de período das rotas de exportação |
| `src/domain/admin/financeiro.test.ts` | 3 | Cartões do mês e fluxo mês a mês pelo livro-razão |
| `src/server/admin/banco.test.ts` | 18 | Postgres embutido: migrations 020 e 021 com RLS, catálogo idempotente que não desfaz a tela, membro desativado sai na hora, último dev, papéis, trilha, registro de uso, ações contábeis |
| `src/server/admin/acesso.test.ts` | 5 | Sem banco: bootstrap e recusa 401/403 no servidor |
| `src/server/actions/admin/acoes.test.ts` | 14 | Cada uma das 10 ações pede a sua permissão e, recusada, não chama o serviço nem olha o banco |
| `src/server/relatorios/acesso-painel.test.ts` | 4 | Ler × exportar, sessão × chave de integração |
| `src/app/api/eventos/route.test.ts` | 5 | Sem sessão não grava, lote limpo sem user agent, falha de gravação não muda a resposta |

### O que cliquei para conferir, e o que apareceu

Servidor do worktree (`next dev`), em três rodadas. O painel do navegador estava oculto, então as
conferências foram por leitura da página e dos estilos computados, e os cliques por `form_input` e DOM.

**1. Sem banco (modo memória), conta `gabrielsilva@testeaurea.com.br`:**
- `/admin` sem sessão → `307` para `/entrar`. Depois do login, o menu do app mostra **Administração**.
- `/admin`: variante desenvolvimento (saúde do painel primeiro), 22 permissões "pela lista do ambiente",
  12 itens de menu nos grupos Central de Resultados, Atendimento, Operação e Sistema.
- `/relatorios?ano=2026&mes=9` → `/admin/resultados/financeiro?ano=2026&mes=9`, com o seletor em
  setembro e os links de exportação com o período. Trocar para "Ano inteiro" levou a `?ano=2026` e
  destravou o trimestre.
- KPIs com o seed: 32 negociações, R$ 11.785,00 de volume, comissão por tipo, 87 moedas; tempo até a
  execução e planos com "disponível depois da A2/B2".
- Contábil: "Lançar" devolveu no toast "Sem banco configurado (POSTGRES_URL)…", passando pela permissão.
- Celular (375 px): sidebar fixa fora da tela, botão de menu visível, sem rolagem horizontal, nenhum
  alvo de toque abaixo de 44 px, grade em uma coluna; o botão de menu abre a gaveta com fundo e "Sair".
- Nenhum erro no console nem no log do servidor.

**2. Com `AUREA_ADMIN_EMAILS=alex@testeaurea.com.br`, sessão do Gabriel:** menu do app sem
Administração; `/admin/resultados/financeiro` → `/inicio`; `/api/relatorios/dre`, `dre.csv`,
`/api/relatorios` e `/api/admin/conciliacao` → **403**. Sem a variável, as mesmas rotas → **200** (CSV
como anexo).

**3. Com banco, na gaveta `aurea_local_admin`** (schema separado, sem tocar no `aurea`; P-C1-04):
- `db:migrate` aplicou as 15 migrations, inclusive 020 e 021, num Postgres real.
- `/admin`: banco "conectado", cadeia do livro-razão "íntegra", 1 evento de uso gravado da página do app.
- Equipe: criei o papel **Contador** (resultados.ver, resultados.exportar, contabil.lancar) → toast
  "Papel "Contador" criado com 3 permissão(ões)", entre Sócio e Operação. Dei acesso a
  `contador@exemplo.com.br` → "Contador de Teste agora é membro do painel como Contador"; desativar e
  reativar funcionaram.
- Contábil: lancei R$ 1.500,00 em 4.1.03 → aparece vigente; estornei → linhas "estornado" e "estorno",
  sem botão de estornar de novo. Sem descrição → "Descreva o lançamento (mínimo 3 caracteres)". ISS 150
  → "Percentual acima de 100%"; ISS 2,5 → "ISS: 2,5%", com quem e quando, e o aviso passou a "7 de 8
  alíquotas ainda estão nulas".
- Financeiro de setembro: receita R$ 50,17, ISS R$ 1,25, resultado R$ 48,92 — o par lançamento/estorno
  ficou fora da DRE. "Conferir o livro-razão" → "Livro-razão íntegro: 103 lançamento(s)". Indicadores
  com a mesma comissão total, R$ 50,17.
- Uso filtrado por "Ações do painel": as 7 ações com o autor — `admin.papeis.criar`,
  `admin.membros.adicionar`, `admin.membros.alterar` (2), `admin.contabil.lancar`,
  `admin.contabil.estornar`, `admin.contabil.parametro`. 5 páginas e 4 cliques registrados, pico às
  15h–16h de Brasília, plataforma Windows.
- Dei o papel Contador à `rozane@testeaurea.com.br` (saiu da lista do ambiente e virou membro) e entrei
  com ela: menu só com Financeiro, Contábil, Indicadores e Uso; painel inicial em modo gestão;
  `/admin/equipe` → "Seu papel no painel não inclui esta área… Administrar membros ou Administrar
  papéis"; alíquotas só leitura; tela de Uso sem a trilha.

### Riscos registrados

- **RA-40** — bootstrap do painel pelo ambiente, inclusive quando o banco falha.
- **RA-41** — registro de uso sem consentimento, sem retenção e agregado em memória com teto.

Os dois em `RISCOS_ASSUMIDOS.md` e nos `ATALHOS.md` de `src/server/admin/` e `src/app/api/eventos/`.

### O que pode dar conflito no merge com A e B

Tudo acréscimo, de resolução direta:
- `src/server/db/db.test.ts`: a lista exata de tabelas ganhou `admin_*` no topo e `eventos_uso` — a A3
  (`aceites_documentos`, `documentos_legais`) e a B (`recebimentos_gateway`, `planos_custodia`) mexem na
  mesma lista. Manter todas, em ordem alfabética.
- `RISCOS_ASSUMIDOS.md`: linhas de índice e seções no fim.
- `src/app/globals.css`: o import de `admin.css` fica antes de `responsive.css`; o de `pagamento.css`
  (B) fica depois de `account.css`.
- `CLAUDE.md`: o parágrafo do Admin está na seção de arquitetura, longe da seção de regras de negócio
  que a A1.7 reescreve.

### O que a C2 precisa saber

- A sidebar já tem `/admin/cs` e `/admin/usuarios`: é só substituir os `page.tsx` provisórios.
- Toda ação nova: `permissaoParaAcao(chave)` primeiro, serviço em `src/server/admin/` parametrizado
  pelo `Executor`, trilha com `registrarAcaoAdmin` na mesma transação, teste no `banco.test.ts` (um
  PGlite só) e no `acoes.test.ts`.
- `BotaoAcao`, `SeletorPeriodo`, `Cartao`, `SemPermissao` e `formatos.ts` (data sempre em Brasília)
  estão prontos para reuso. Elemento que vale contar no registro de uso ganha `data-uso`.
- A A2 e a B1 já estão publicadas nas branches delas (`feat/a2-livro-de-ordens`,
  `feat/b1-cobranca-reutilizavel`); a C2 começa trazendo a `main` do momento.
