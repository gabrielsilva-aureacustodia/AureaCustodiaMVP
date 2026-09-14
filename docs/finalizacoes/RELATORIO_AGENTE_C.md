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
> escolhe quem acessa e o que cada um pode fazer. A segunda entrega trouxe o **atendimento** (o
> WhatsApp da empresa dentro do painel, com a ficha do cliente ao lado) e a **administração de
> usuários** (a lista de contas e a ficha completa de cada uma, com as ações de ajuste). Bancada,
> moedas, logística e configuração já aparecem no menu e chegam na próxima entrega.

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

---

## C2 · Usuários e CS — `feat/c2-usuarios-e-cs`

**Base:** `feat/c-painel-admin` @ `1145c1a`, depois de trazer `origin/main` (ainda em `3358845`; nada
novo). As frentes A (A1 e A2) e B (B1 e B2) estavam publicadas nas branches delas, não na `main` — por
isso tudo o que a ficha lê delas é leitura defensiva, que acende sozinha quando chegarem. Depois de levar
para a `main`: P-C2-01 (migrations 022 e 023). O provedor de WhatsApp é o P-C2-02.

### O que entrou, pela seção do plano do Admin

| Seção | Entrega |
|---|---|
| 2.1 | `022_cs_mensageria.sql`: `cs_canais`, `cs_contatos` (`telefone_e164` único), `cs_conversas` (única por canal e contato), `cs_mensagens` (`id_no_provedor` único). RLS em todas |
| 2.2 | `023_notas_e_atribuicoes.sql`: `cs_notas`, `cs_etiquetas`, `cs_conversa_etiquetas`, `admin_notas_usuario` — e `admin_situacao_contas`, que o "ativar e desativar" da 2.6 precisava para ter onde morar. Notas e situação são append-only |
| 2.3 | `src/lib/mensageria/`: `tipos.ts` (`ProvedorMensageria` com a assinatura do plano), `evolution.ts` (Evolution API v2, conferida no código-fonte dela), `registro-local.ts` (sem provedor, a tela funciona), `index.ts` (escolha pelo ambiente). `cloud-api.ts` fica "para depois", como o plano diz |
| 2.4 | `POST /api/webhooks/whatsapp`: autenticação antes do JSON, tradução, gravação e resposta; reentrega não duplica |
| 2.5 | `/admin/cs` em três colunas: conversas (situação, responsável, etiqueta, busca por nome ou telefone, não lidas, nova conversa), conversa (estado de entrega, resposta, arquivo por endereço, notas, etiquetas, situação, responsável) e cartão do cliente (saldo, moedas, envios com etapa, faturas em aberto, retiradas, acessos, link para a ficha). Polling de 5 s |
| 2.6 | `/admin/usuarios` (busca por nome, e-mail ou CPF; filtros com e sem cadastro, inadimplente, com saldo, com moeda, criada no período) e `/admin/usuarios/[email]` com as sete abas. As seis ações — criar, editar cadastro, ajustar saldo, inadimplência, redefinir senha, ativar e desativar — e as notas, todas com `admin.usuarios.<verbo>` na trilha |
| 6 (finalizações) | Cadastro lê `aceites_documentos` (A3) e, sem ela, `settings.legalAcceptance`; Financeiro lê planos (B2) e recebimentos do gateway (B1); Mercado lê o histórico da fila (A2). Ajuste de saldo é o lançamento `ajuste` do ledger. Pedido do número de SAC ao Agente A em `PENDENCIAS_AGENTE_C.md` |

### Decisões tomadas dentro do plano — e como explicar cada uma

1. **Sem provedor, a resposta fica "registrada", e não "enviada".** Estado novo em `cs_mensagens`, fora
   do desenho original. *Para o Rogério:* quando o WhatsApp não está ligado, o painel guarda o que o
   atendente escreveu e diz, na própria mensagem, que ela não chegou ao cliente.
2. **Uma conversa por pessoa, que reabre quando ela escreve de novo.** O histórico inteiro fica num lugar
   — é o que faz a caixa funcionar como CRM.
3. **Telefone sempre na forma canônica, com o nono dígito.** O WhatsApp entrega números antigos sem o 9, e
   o cadastro guarda só DDD e número; sem a forma canônica, a conversa nunca acharia a ficha. Número que
   casa com duas contas **não** vincula: o atendente vincula à mão, em vez de ver o saldo de outra pessoa.
4. **O envio acontece fora da transação do banco.** A chamada ao WhatsApp pode demorar; transação aberta
   esperando a internet travaria o banco para todo mundo. O eco da própria resposta, que a Evolution
   manda de volta pelo webhook, vira a mesma linha — chegue antes ou depois.
5. **O webhook grava antes de responder**, diferente do Mercado Pago (que concilia depois): são poucas
   linhas, e a Evolution não reenvia o que recebeu 200. Sem segredo configurado, todo webhook é recusado;
   o segredo curto (menos de 16 caracteres) também.
6. **Mídia vai por endereço, como a interface do plano** (`enviarMidia(para, url, tipo, legenda)`). Não
   há upload nem armazenamento novo — etiqueta com endereço não pode ir para armazenamento público, e um
   balde privado para o CS seria escopo novo.
7. **Ajuste de saldo e trilha na mesma transação**, sem reimplementar o ledger: o serviço roda o
   `mutarEstado` de sempre dentro de uma transação aberta por ele (um `Executor` que reusa a transação),
   e a linha `admin.usuarios.ajustar_saldo` entra antes do commit. O lançamento `ajuste` é o que o ledger
   já deriva de toda variação de saldo sem explicação. O ajuste pede motivo: é o dado que explica o
   lançamento, não uma confirmação.
8. **A situação da conta mora numa tabela própria**, e não em `users.settings`: o planejador de diff só
   persiste as quatro preferências conhecidas, e um campo a mais ali sumiria na primeira gravação.
   Desativar bloqueia a identidade no Supabase (comportamento padrão da ferramenta) e registra quem, quando
   e por quê. Conta da equipe do painel é recusada — tirar alguém da equipe é gesto de Equipe e papéis,
   que protege o último dev. As portas que não passam pelo Supabase ficaram pedidas ao Agente A, com a
   função pronta (`contaDesativada`) — RA-44.
9. **Senha por dois caminhos**: o link do Supabase por e-mail, e a senha provisória, que também cria o
   login que faltava para quem foi cadastrado sem chave de serviço. O link sozinho ainda não fecha o
   ciclo (o site não tem tela de nova senha sem a atual) — pedido ao Agente A, RA-43. Conta do catálogo de
   demonstração é recusada: ela entra sem Supabase (RA-19).
10. **Sem chave de serviço, "Criar conta" cria a conta só na plataforma**, e a pessoa define a senha em
    `/cadastrar` com o mesmo e-mail — o login acha a conta pronta. Nenhuma ação quebra por falta de
    credencial; a mensagem diz o que aconteceu.
11. **O cadastro é gravado inteiro.** A leitura do banco descarta o cadastro se faltar CPF, nome completo,
    nascimento ou telefone, então esses quatro são exigidos; o resto é livre, e um CPF que não confere
    com os dígitos verificadores é gravado com aviso ("qualquer campo, inclusive CPF").
12. **Dados bancários não saem do servidor sem `usuarios.dados_bancarios`**, e editar pede essa permissão
    e `usuarios.editar`. A trilha de dado pessoal guarda os **nomes** dos campos que mudaram, nunca os
    valores; senha nunca entra.
13. **O que é código de outra frente ainda fora da `main` não foi reimplementado.** A posição na fila
    (`posicaoNaFila`, A2) e o pagamento manual de fatura (ação da B2) aparecem como "disponível depois da
    X" e entram num commit pequeno quando o código chegar (P-C2-07). As tabelas dessas frentes são lidas
    com `to_regclass` e acendem sozinhas.
14. **A paleta das etiquetas tem ouro, verde, vermelho e cinza.** O azul do rascunho saiu: não há variável de
    azul em `tokens.css`, e cor fora dessas variáveis quebra o tema claro.

### Arquivos fora da lista de território, editados porque o plano pede

| Arquivo | Por quê |
|---|---|
| `src/server/db/repositories/cs.ts`, `admin-usuarios.ts` (novos) e `painel-leituras.ts` | "Tabelas próprias, fora do `AppState`" — o SQL mora em `repositories/`, como na C1; `painel-leituras.ts` ganhou as leituras por conta de A2, A3 e B1 |
| `src/server/db/db.test.ts` | A lista exata de tabelas ganhou as nove da C2 |
| `.env.example` | Bloco no fim com as quatro variáveis do WhatsApp (só nomes) |
| `src/app/api/webhooks/README.md`, `src/lib/README.md`, `src/app/README.md`, `src/domain/README.md`, `src/server/db/migrations/README.md`, `src/server/db/repositories/README.md` | Documentação que a rota, a pasta e as migrations novas tornaram incompleta — só linhas acrescentadas |
| `CLAUDE.md` | O parágrafo do Admin (da própria frente C) ganhou três frases sobre o CS e a ficha |

### Testes novos — 80, em 8 arquivos

A suíte foi de **59 arquivos e 450 testes** para **65 arquivos e 530 testes** (1 pulado, o de banco
real). `npm run typecheck`, `npm run lint` e `npm run build` limpos.

| Arquivo | Testes | O que protege |
|---|---|---|
| `src/server/actions/admin/acoes.test.ts` | +22 (36) | Cada uma das 19 ações novas pede a sua permissão e, recusada, não chama o serviço; dados bancários pedem as duas; tabela ausente vira a instrução do `db:migrate`; o autor é o membro; a equipe é conferida no servidor |
| `src/server/admin/banco.test.ts` | +16 (34) | Postgres embutido: migrations 022 e 023 com RLS; mensagem nova, conta pelo telefone, reentrega, não lidas; conversa que reabre; entrega que não anda para trás; eco da resposta como uma linha; registrada e falhou na trilha; notas, etiquetas, responsável e filtros; nova conversa e vínculo; criar conta com abertura no ledger; ajuste vira `ajuste` com motivo; **trilha que falha desfaz o ajuste**; cadastro inteiro sem dado pessoal na trilha; inadimplência; desativar com bloqueio e recusa da equipe; senha sem vazar para a trilha; notas; leituras de A2, A3 e B1 nulas sem as tabelas |
| `src/lib/mensageria/evolution.test.ts` | 10 | Envio com `apikey` e só dígitos, mídia com nome do arquivo, recusa e rede fora; JWT de `jwt_key`, Bearer, sem segredo e segredo curto; tradução de `messages.upsert` (entrada, saída, imagem, grupo, reação, sem id) e `messages.update`; escolha pelo ambiente |
| `src/domain/admin/usuarios.test.ts` | 9 | Filtro da URL, busca por nome, e-mail e CPF, filtros, período no dia de Brasília, criar, cadastro inteiro com aviso, dados bancários, ajuste |
| `src/domain/admin/telefone.test.ts` | 7 | Cadastro × WhatsApp × WhatsApp sem o nono dígito, grupo e status, formatação, conta pelo telefone e ambiguidade |
| `src/domain/admin/cs.test.ts` | 7 | Estado de entrega só para a frente, texto e endereço de mídia, slug de etiqueta, filtro da caixa |
| `src/app/api/webhooks/whatsapp/route.test.ts` | 6 | 503 sem provedor, 401 antes do JSON, 400, 200 sem banco para evento que não é mensagem, grava e responde, 503 e 500 que fazem reenviar |
| `src/server/admin/situacao.test.ts` | 3 | `contaDesativada` responde "ativa" sem banco, com banco falhando e para a equipe |

### O que cliquei para conferir, e o que apareceu

Servidor do worktree (`next dev`, porta 3107), com o painel do navegador oculto — leitura da página,
estilos computados e cliques pelo DOM. Três rodadas.

**1. Banco na gaveta `aurea_local_admin` + uma Evolution API falsa local** (servidor Node que responde
`sendText`, `sendMedia` e `connectionState`, com a mesma autenticação por `apikey`):
- `db:migrate` na gaveta: `+ 022_cs_mensageria`, `+ 023_notas_e_atribuicoes`; o schema `aurea` não foi
  tocado.
- A sessão que estava aberta era a da Rozane (papel Contador, da C1): `/admin/usuarios` → "Seu papel no
  painel não inclui esta área — Ver usuários". Entrei como `gabrielsilva@testeaurea.com.br`.
- `/admin/usuarios`: 7 contas, criada em 17/08/2026 (abertura do seed no ledger). `?busca=ro&saldo=1&cadastro=sem`
  → "2 de 7 contas" (Rogério Pena e Rozane), com os campos do filtro preenchidos.
- **Criar conta** `Teste.Painel@Exemplo.com.br`, sem senha, com demonstração → toast "Conta criada. Sem
  chave de serviço do Supabase: a pessoa cria a senha em /cadastrar com este e-mail." e a ficha abriu
  com R$ 5.000,00, 6 moedas e "conta criada em 14/09/2026".
- **Editar cadastro** com CPF 123.456.789-00 e telefone (11) 98765-4321 → "Cadastro salvo. Atenção: o CPF
  não confere com os dígitos verificadores; com estes dados o cadastro não libera depósito, compra e
  saque." **Dados bancários** Pix por e-mail → "Pix (E-mail): painel@exemplo.com.br".
- **Ajustar saldo** R$ 150,25 com motivo → "Saldo ajustado de R$ 5.000,00 para R$ 5.150,25."; aba
  Financeiro, livro-razão: linha 105 "Ajuste · R$ 150,25 · saldo após R$ 5.150,25", linha 104 "Saldo
  inicial". **Inadimplência** → selo "Inadimplente (marca manual)". **Enviar link de redefinição** → "Falta
  SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente…".
- **Desativar** com motivo → "Conta desativada. Sem chave de serviço do Supabase, o login não foi
  bloqueado lá — só a situação foi registrada."; selo "Desativada", aviso com autor, data e motivo.
- **Nota interna** registrada; aba **Atividade** com a trilha da conta: `admin.usuarios.criar`,
  `editar_cadastro`, `editar_dados_bancarios`, `ajustar_saldo`, `marcar_inadimplente`, `desativar`,
  `anotar`, cada uma logo acima da linha `conta.atualizar` da mesma transação.
- Ficha do Gabriel: selos "Equipe do painel" e "Catálogo de demonstração"; "Desativar conta" diz para
  tirar da equipe antes; "Redefinir senha" diz que a conta entra sem Supabase (RA-19). Aba Mercado com
  "Histórico da fila — Disponível depois da A2"; Acervo com 13 moedas e "sem laudo na corrente (moeda de
  demonstração)".
- **Webhook** com um corpo no formato da Evolution: autenticação errada → `401`; mensagem do número
  `551187654321` (sem o nono dígito) → `200 {"mensagens":1}`; o mesmo id de novo → `{"repetidas":1}`;
  outro número → nova conversa.
- `/admin/cs`: "2 abertas · 2 não lidas"; a conversa do número sem o 9 veio **vinculada à conta de teste**
  (selo "Cliente", telefone +55 (11) 98765-4321, cartão com R$ 5.150,25 e "Inadimplente"). Abrir levou a
  URL a `?conversa=1` e zerou a não lida.
- **Responder** → "Mensagem enviada."; a Evolution falsa recebeu `number: 5511987654321` e a `apikey`
  certa. Webhook `DELIVERY_ACK` → `status: 1`, `READ` → `status: 1`, `DELIVERY_ACK` atrasado → `status: 0`;
  a mensagem ficou "Lida" na volta seguinte do polling.
- **Nota**, **etiqueta nova "Retirada" (verde) aplicada**, **responsável Rozane** e **situação Pendente** →
  um toast cada; o item da lista mostrou "Pendente · Cliente · Retirada". **Arquivo por endereço** (PDF)
  → "Arquivo enviado.". Filtros: etiqueta Retirada → só a conversa da conta de teste; sem responsável → só
  a do visitante; busca "21 99999" → só a do visitante — cada um gravado na URL.
- **Conferir conexão** → "WhatsApp conectado.". **Nova conversa** para (31) 97777-6666 → abriu a conversa
  4 com a mensagem "Enviada" e "não casou com nenhuma conta"; **vincular** `Pegge@testeaurea.com.br` →
  "Contato atualizado." e o cartão da Pegge.
- Desliguei a Evolution falsa e respondi → "A mensagem não saiu e ficou marcada como falha na conversa.
  Sem resposta da Evolution API (fetch failed).", mensagem com borda vermelha "Falhou" e o texto mantido
  na caixa.
- Celular (375 px): as três colunas empilhadas na largura inteira, abas da ficha com 44 px, sem rolagem
  horizontal no CS nem na ficha.

**2. Mesmo banco, sem as variáveis da Evolution:** a conversa mostrou "Sem WhatsApp conectado… Falta
configurar: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_WEBHOOK_SECRET."; a resposta
ficou "Só no painel — sem WhatsApp conectado", borda tracejada, toast "Resposta registrada no painel…"; o
webhook respondeu `503` com a mesma lista.

**3. Sem banco (memória):** `/admin/cs` → "Este ambiente está sem POSTGRES_URL…"; aba Notas → "As notas
existem só com banco configurado."; **ajuste de saldo** do Alex funcionou pela memória (R$ 38.000,00 →
R$ 38.010,00) e "Desativar conta" explicou que a situação é gravada em tabela do painel.

Nenhum erro no log do servidor nas três rodadas. Ajustei um detalhe achado aqui: a contagem de não lidas
vinha de antes de a conversa aberta ser marcada como lida — a caixa agora é lida depois.

### Riscos registrados

- **RA-42** — WhatsApp por QR code (não oficial), webhook sem assinatura do corpo, conversas sem retenção.
- **RA-43** — senha provisória sem segundo fator nem troca obrigatória; link sem tela de nova senha.
- **RA-44** — desativar fecha o Supabase; catálogo e sessão aberta esperam a frente A.

Em `RISCOS_ASSUMIDOS.md` e nos `ATALHOS.md` de `src/lib/mensageria/` e `src/server/admin/`.

### O que pode dar conflito no merge com A e B

- `src/server/db/db.test.ts`: a lista de tabelas ganhou `admin_notas_usuario`, `admin_situacao_contas` e
  os sete `cs_*`; A (`ofertas_historico`, `documentos_legais`, `aceites_documentos`) e B
  (`recebimentos_gateway`, `planos_custodia`) mexem na mesma lista. Manter todas, em ordem alfabética.
- `RISCOS_ASSUMIDOS.md`: linhas de índice, seções no fim e uma linha na tabela de pastas.
- `.env.example` (bloco no fim), `src/app/api/webhooks/README.md` (uma linha): acréscimo.

### O que a C3 precisa saber

- `src/server/admin/portas.ts` tem `portaDeEstadoDoServidor` (mutação do AppState + linha do painel na
  mesma transação) e `ehTabelaAusente` — servem para as ações de configuração e bancada.
- `painel-leituras.ts` concentra leitura de tabela de outra frente com `to_regclass`.
- P-C2-07: com A2 e B2 na `main`, trocar "disponível depois da A2" por `posicaoNaFila` na aba Mercado e
  ligar o pagamento manual de fatura da B2 na aba Financeiro.
- Os canais de SAC (P-C2-06) podem virar configuração na aba Operacional.
