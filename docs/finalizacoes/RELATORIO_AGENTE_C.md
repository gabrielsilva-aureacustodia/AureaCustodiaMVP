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
> usuários** (a lista de contas e a ficha completa de cada uma, com as ações de ajuste). A terceira
> fechou o painel: a **bancada no navegador** (analisar moedas com a webcam, sem instalar programa), a
> **auditoria das moedas guardadas**, a **logística** de envios e retiradas e a **configuração do site** —
> taxas, tipos de moeda, limites, prazos e canais de atendimento mudam por tela, sem programador, e cada
> mudança fica registrada e gera versão nova da Tabela de Taxas ou dos Termos.

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

**C2 pronta para main — merge f40ae2c**

**Commits:** `203d650` (servidor: migrations, mensageria, webhook, serviços, ações e riscos), `1d9b01b`
(telas de atendimento e de usuários) e `6360d9e` (relatório e pendências), trazidos para
`feat/c-painel-admin` pelo merge `--no-ff` `f40ae2c`.

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

---

## Merge das três frentes na `main` — 14/09/2026

> **Para o Rogério.** As três equipes de trabalho tinham terminado as suas partes, mas cada uma estava
> guardada numa pasta separada. A pedido do Gabriel, juntei as três na versão oficial do site, conferi
> que tudo continua passando nos testes, atualizei o banco de dados e publiquei.

**Pedido:** Gabriel, 14/09, depois de eu apontar que a `main` ainda não tinha A1, A3 e B2: *"REALIZE O
MERGE QUE FALTA DE TODAS AS BRANCHES e depois continue"*. O plano dizia que o agente da frente não leva
nada à `main`; o pedido direto do Gabriel substitui essa regra para este merge.

### Como foi feito

A `main` está em uso na pasta principal, então a integração foi montada numa branch temporária
(`integracao/finalizacoes-main`) neste worktree, a partir de `origin/main` @ `3358845`, e enviada com
`git push origin HEAD:main` — avanço simples, sem forçar. A pasta principal não foi tocada (P-M-02). A
ordem segue a seção 7.1 do plano, com a A primeiro:

| Merge | Commit | Conferência depois do merge |
|---|---|---|
| Frente A (A1, A2, A3 · migrations 014–016) | `87b4bfb` | typecheck ✓ · 52 arquivos, 385 testes ✓ · build ✓ |
| Frente B (B1, B2, B3 · migrations 017–019) | `f5961ad` | typecheck ✓ · 59 arquivos, 471 testes ✓ · lint ✓ · build ✓ |
| Frente C (C1, C2 · migrations 020–023) | `4d35ee7` | typecheck ✓ · 76 arquivos, 654 testes (1 pulado) ✓ · lint ✓ · build ✓ |

Antes, conferi que cada branch de frente contém todas as suas sub-branches e que nenhuma mexe no
`package.json`.

### Conflitos, e como ficou cada um

- **`src/domain/dre.ts` (A × B):** a A1 passou a contar negociações distintas (a comissão agora gera dois
  lançamentos por negociação); a B trocou a observação da receita de custódia para "competência". Ficaram
  as duas.
- **`RISCOS_ASSUMIDOS.md` (A × B, depois × C):** ficaram todos os blocos, na ordem das faixas — RA-24 a
  RA-26 da A, RA-30 e RA-32 da B, RA-40 a RA-44 da C. A B não tinha posto RA-30 e RA-32 no índice; pus.
- **`src/server/db/db.test.ts` (A × C):** a lista de tabelas ficou com as das três frentes, em ordem
  alfabética.

### Ajustes que o merge exigiu sem conflito de texto

Os dois primeiros ficam em arquivo de outra frente — são o mínimo para a `main` compilar e passar, e estão
descritos na mensagem do commit `f5961ad`:

- **`src/domain/fees.test.ts` (A1):** importava `TAXA_RETIRADA_COMUM_CENTS` e `TAXA_RETIRADA_SEGURA_CENTS`,
  que a B3 substituiu por `TAXAS_RETIRADA_PADRAO`. O teste continua conferindo a mesma coisa — a tabela de
  taxas da A1 e a de retirada da B3 concordam —, agora também nas parcelas.
- **`src/server/db/livro-de-ordens.test.ts` (A2):** o `TRUNCATE` do teste passou a incluir
  `planos_custodia` e `recebimentos_gateway`, porque `planos_custodia` (018) aponta para `users`.
- **`src/server/admin/banco.test.ts` (C):** dois testes afirmavam que as leituras de aceites, fila e
  recebimentos voltavam `null` porque as tabelas não existiam. Agora voltam lista vazia; o caminho sem
  tabela continua testado, apagando a tabela dentro de uma transação que é desfeita.

### Banco de produção e publicação

1. `npm run db:check` antes: 001 a 013 aplicadas.
2. `npm run db:migrate` **antes** do push: aplicou 014 a 023. A ordem é de propósito — o código novo lê
   colunas que só existem depois das migrations (`fee_comprador`, `prioridade_em`), e publicar antes
   derrubaria todas as telas logadas. As migrations são aditivas, então o código antigo seguiu funcionando
   no minuto entre um passo e outro.
3. `git push origin HEAD:main`: `3358845..4d35ee7`.
4. `npm run db:check` depois: 001 a 023 aplicadas, RLS em todas as tabelas, nada em `public`.
5. Publicação conferida sem login: `/taxas` e `/suporte`, que só existem no código novo, responderam 200
   às 19:34 (o código de `3358845` não tinha essas páginas); `/`, `/entrar` e `/termos` 200; `/admin` 307 para o login;
   `/api/estacao` 401.

**O que não conferi:** as telas logadas em produção. A leitura do estado pelo código novo contra o banco
de produção foi barrada pela permissão do modo automático, e não digito senha em tela de login. Roteiro
para o Gabriel no P-M-01.

### Depois do merge

- `feat/c-painel-admin` avançou para `4d35ee7` e foi enviada; `feat/c3-bancada-e-configuracao` reabriu em
  cima dela, sem commit perdido (ainda não tinha nenhum).
- A branch temporária de integração foi apagada — o conteúdo dela é a `main`.
- Os itens P-C1-01 e P-C2-01 (migrations da C em produção) estão feitos.

---

## C3 · Bancada e configuração — `feat/c3-bancada-e-configuracao`

**Base:** `feat/c-painel-admin` @ `4d35ee7`, igual à `main` depois do merge das três frentes — A1, A2,
A3, B1, B2 e B3 já estavam lá, então nada nesta etapa é leitura defensiva de código ausente.
**Commits:** `8c146d3` (servidor: migrations, domínio, serviços, ações, ligação do site à configuração e
riscos), `dad4351` (telas) e o de documentação e relatório. Depois de levar para a `main`: P-C3-01
(migrations 024 e 025) e P-C3-02 (conferência logada).

### O que entrou, pela seção do plano do Admin

| Seção | Entrega |
|---|---|
| 3.1 | `024_config_plataforma.sql`: `config_plataforma` (valor `jsonb` com tipo), `config_historico` (só inserir) e `tipos_moeda`. RLS em todas. Nenhuma semeia valor |
| 3.2 | `src/server/config/carregar.ts`: `carregarConfiguracaoDoSite()` lê a cada operação, sem cópia em memória; linha gravada e válida sobrepõe o padrão do código, e leitura que falha devolve o padrão (RA-47). `carregarTabelaDeTaxas()` (A1) passou a delegar para cá |
| 3.3 | `/admin/configuracao` em cinco abas: **Taxas e comissões** (os onze campos de `TabelaDeTaxas`, um para um, com quem mudou, quando e a simulação de uma negociação), **Catálogo de moedas** (semeado com `COIN_TYPES` ao abrir; negociável e aceita envio novo), **Operacional** (limite de depósito, ciclo de sincronização, prazos da logística, prazos dos Termos, canais de atendimento), **Integrações** (só nomes de variável) e **Histórico** |
| 3.4 | `/admin/bancada`: fila dos envios em "Recebido pela custódia" e "Em análise física", câmera escolhida e lembrada, gravação sem microfone com envio direto ao Storage por URL assinada, uma linha por moeda (veredito, peso, caixa, posição, motivo) e **Fechar análise pelo serviço `src/server/estacao/analise.ts`**, com o membro como operador |
| 3.5 | `/admin/moedas` e `/admin/moedas/[codigo]`: o acervo com situação, filtro pela URL, **Verificar corrente** (hash de cada análise, livro-razão e recibos que não batem) e a ficha com recibo, os quinze campos da análise, vídeo por link assinado de 10 minutos, envio de origem e retiradas |
| 3.6 | `/admin/logistica`: envios e retiradas com alerta de prazo (dias úteis em Brasília, prazos da aba Operacional), forma de pagamento, parcelas e situação da retirada (B3), e os links de etiqueta — as rotas de etiqueta passaram a aceitar `logistica.etiquetas` além do dono |
| 3.7 | `025_caixas_fisicas.sql` e o quadro de caixas na bancada: cadastro, capacidade e ocupação vinda das análises × moedas × retiradas. Posição já ocupada é recusada antes de chamar o serviço |
| 6 (finalizações) | Toda mudança de taxa grava `config_historico` e publica versão nova da Tabela de Taxas pela `publicarVersaoDocumento` da A3; prazo dos Termos publica versão nova dos Termos. `matchOrders`, `buyLot`, `sellToBid`, `publishBid`, `editBid`, plano de custódia, faturamento e retirada recebem a tabela carregada. `isNegociavel(tipo, catalogo)` consulta `tipos_moeda`. P-C2-07: posição na fila na aba Mercado e "Quitar com o saldo" na aba Financeiro, pela ação da B2 |

### Decisões tomadas dentro do plano — e como explicar cada uma

1. **Taxa mudada vale na operação seguinte, e a publicação do documento vem logo depois, em transação
   separada.** *Para o Rogério:* o valor que a equipe salvou é o que o site cobra a partir dali; em
   seguida o sistema gera a nova versão da Tabela de Taxas. Se essa segunda parte falhar, a tela diz e
   oferece "Publicar a versão vigente" — a taxa não é desfeita (RA-46).
2. **A faixa de "versão nova" pede o aceite, mas não bloqueia operação.** O plano não pede bloqueio, e
   travar o mercado de todos a cada ajuste de centavo seria uma trava que o Gabriel não pediu. O aceite
   registra a versão vigente, e não mais a 1.0 do código.
3. **O texto da Tabela e dos Termos é gerado a partir da configuração** e, com os valores de hoje, é
   idêntico byte a byte à versão 1.0 publicada pela A3 — o teste confere o hash. Assim a primeira
   publicação pelo painel só acontece quando alguém muda um número, e nunca por diferença de espaço.
4. **Faixa de valor é anteparo de digitação, não trava de negócio.** Comissão de 0 a 20%, depósito de
   R$ 1 a R$ 1 milhão por operação, ciclo de 3 a 120 segundos: evitam "50" digitado no lugar de "0,5".
   Valor gravado inválido (banco editado à mão) cai no padrão, em vez de zerar a comissão.
5. **A bancada web não tem regra própria.** Ela valida o que a tela digitou (peso, posição) para dar o
   erro na hora, e fecha pelo mesmo serviço da estação Electron. A fórmula do hash e os quinze campos de
   `estacao/CONTRATO.md` não mudaram; a linha `admin.bancada.analisar` entra depois do serviço, com
   `origem: 'bancada_web'` (RA-45).
6. **O nome do tipo de moeda não muda depois de criado**: está gravado em cada moeda, envio e negociação.
   Desligar "negociável" tira o tipo do mercado sem mexer nas moedas guardadas.
7. **Caixa não é trava.** Sem cadastro, a bancada aceita o código digitado; com cadastro, grava a grafia
   cadastrada ("eb 001" vira "EB-001"). Cadastrar caixa não reescreve análise — o texto gravado entra no
   hash.
8. **O cliente recebe a configuração pelo mesmo ciclo do estado** (`/api/state`), e as telas do app leem
   taxas, catálogo e limite do contexto: mudança no painel chega à tela aberta no ciclo seguinte.
9. **Os canais de atendimento viraram configuração** (resolve o P-C2-06 sem o Agente A): e-mail,
   WhatsApp e telefone de `/suporte` mudam na aba Operacional e não alteram o texto dos Termos.

### Arquivos fora da lista de território, editados porque o plano pede

A seção 6 do plano de finalizações manda "funções recebem a tabela carregada" e "`isNegociavel` consulta
`tipos_moeda`"; fazer isso é, necessariamente, editar os pontos que usavam a constante.

| Arquivo | Por quê |
|---|---|
| `src/domain/constants.ts`, `market.ts`, `types.ts` | `coinTypeInfo`, `isNegociavel`, `tiposNegociaveis`, `tiposAtivos` e `availableCoinsForSell` recebem o catálogo por parâmetro, com o do código como padrão; `CoinType.ativo` opcional. Chamadas antigas respondem igual |
| `src/server/taxas/carregar.ts` | `carregarTabelaDeTaxas()` lê a configuração |
| `src/server/actions/market.ts`, `sell.ts`, `account.ts`, `payments.ts`, `plano-custodia.ts`, `custody.ts`, `src/server/custodia/faturamento.ts` | Tabela, catálogo e limite de depósito carregados em vez da constante |
| `src/server/documentos/aceites.ts` | O aceite grava a versão e o hash vigentes |
| `src/app/api/state/route.ts`, `src/components/providers/AppProvider.tsx`, `src/app/(app)/layout.tsx` | Configuração e pendência de aceite chegam ao cliente |
| `src/components/shell/Topbar.tsx` | A faixa aparece quando falta aceite da versão vigente, dizendo qual documento |
| `src/app/(app)/mercado`, `vender`, `recibos`, `conta`, `envios`; `src/components/market/LotCard.tsx`, `ModalEditarLote.tsx`, `sell/CoinPicker.tsx`, `recibo/Certificate.tsx`, `recibo/ModalSolicitarRetirada.tsx`, `account/AccountModals.tsx` | As telas leem taxas, catálogo e limite do contexto |
| `src/app/taxas`, `termos`, `suporte` | A versão vigente e os canais configurados |
| `src/app/api/envios/etiqueta/[protocolo]/route.ts`, `retiradas/etiqueta/[id]/route.ts` | Seção 3.6: `logistica.etiquetas` abre a etiqueta |
| `src/server/db/repositories/config.ts`, `caixas.ts` (novos) | O SQL das migrations novas mora em `repositories/` |
| `src/server/db/db.test.ts`, `livro-de-ordens.test.ts`, `payments.test.ts` | Lista de tabelas com as quatro novas; prazo do `beforeAll` de 30 s para 60 s — com 25 migrations a suíte inteira em paralelo passava do limite |
| `CLAUDE.md` | O parágrafo do Admin ganhou a bancada web e a configuração; a seção de regras de negócio passou a dizer que os números são o padrão, editável em `/admin/configuracao` — mantê-la como "não pode mudar" faria o próximo agente recusar a tela pedida |
| READMEs de `src/domain/`, `src/server/db/migrations/`, `src/server/db/repositories/` | Documentação que a mudança tornou incompleta |

### Testes novos — 79

A suíte foi de **76 arquivos e 654 testes** para **84 arquivos, 733 passando e 1 pulado** (o de banco
real, como antes). `npm run typecheck`, `npm run lint` e `npm run build` limpos.

| Arquivo | Testes | O que protege |
|---|---|---|
| `src/domain/admin/configuracao.test.ts` | 11 | Chaves de taxa um para um com `TabelaDeTaxas`; sem nada gravado vale o padrão; valor inválido cai no padrão; percentual e reais digitados; só o que mudou, com o antes; erro recusa o grupo; grupo `sistema` não editável; simulação de R$ 300; data de Brasília |
| `src/domain/admin/documentos.test.ts` | 7 | Com `TAXAS_PADRAO`, o texto é o da versão 1.0; com outra tabela só os números mudam e o exemplo de R$ 200 é recalculado; o hash dos Termos com os parâmetros de hoje é o vetor congelado; o prazo trocado na cláusula certa |
| `src/domain/admin/bancada.test.ts` | 8 | Faixa de peso igual à da rota da estação, miligramas inteiros, posição, quantidade do envio, posição repetida, caixa e vídeo opcionais, nome do arquivo |
| `src/domain/admin/caixas.test.ts` | 7 | Grafia da caixa, validação, ocupação por análise × moeda × retirada, posição ocupada, quadro |
| `src/domain/admin/logistica.test.ts` | 8 | Dias úteis, virada de dia em Brasília, prazos por parâmetro, envio encerrado, retirada atrasada, filtros |
| `src/domain/admin/moedas.test.ts` | 6 | Linhas do acervo, resumo, filtro, corrente íntegra, adulteração apontada, sem livro-razão |
| `src/domain/admin/catalogo.test.ts` | 7 | Nome com acento, repetido, grafia gravada, semeadura, `isNegociavel`/`coinTypeInfo`/`tiposAtivos` pelo catálogo passado |
| `src/domain/admin/integracoes.test.ts` | 2 | Ligado, incompleto, desligado; só nomes de variável |
| `src/server/actions/admin/acoes.test.ts` | +15 (51) | As 11 ações novas pedem a sua permissão e, recusadas, não chamam o serviço; o membro é o operador da análise; quitar fatura chama a B2 com o dono da ficha; grupo desconhecido e caminho de vídeo com `..` recusados; verificação da corrente na trilha |
| `src/server/admin/banco.test.ts` | +8 (42) | Postgres embutido: taxa gravada com histórico e trilha **e a Tabela de Taxas publicada na versão 1.1 pelos repositórios reais da A3**; nada mudou e valor inválido não publicam; publicação que falha não desfaz a taxa; catálogo semeado, criado, repetido e editado com histórico; caixa cadastrada e grafia recusada; bancada que valida antes do serviço e fecha com a caixa cadastrada e a linha `admin.bancada.analisar` |

### O que cliquei para conferir, e o que apareceu

**Nada nas telas logadas, nesta etapa.** O painel do navegador do app ficou preso ao servidor da pasta
principal — `C:\dev\AureaCustodiaMVP`, rodando com o `.env.local` de produção —, e não subiu um servidor
deste worktree; usar aquele servidor seria conferir código antigo contra o banco de produção. E senha em
tela de login eu não digito. A conferência logada ficou com o Gabriel, com roteiro clique a clique, no
**P-C3-02**. O que sustenta a entrega: os 79 testes acima (inclusive a publicação real da Tabela de Taxas
e o fechamento da análise pela bancada web no Postgres embutido), o typecheck, o lint e o build de
produção com as rotas `/admin/bancada`, `/admin/moedas`, `/admin/moedas/[codigo]`, `/admin/logistica` e
`/admin/configuracao`.

### Riscos registrados

- **RA-45** 🟡 — bancada web sem gravação local nem retomada depois de recarregar; linha do painel fora da
  transação da análise; faixa de peso copiada da rota da estação.
- **RA-46** 🟠 — taxa e prazo valem na hora, sem aviso prévio; a faixa pede aceite sem bloquear; publicação
  do documento em transação separada.
- **RA-47** 🟡 — leitura que falha cai no padrão do código; compra direta pelo gateway e valor de entrada da
  análise ainda leem tabela e catálogo do código (pedido ao Agente B no P-C3-03).

Em `RISCOS_ASSUMIDOS.md` e nos `ATALHOS.md` de `src/server/admin/`, `src/server/config/` e
`src/components/admin/bancada/`.

### O que pode dar conflito com trabalho de A e B

- `src/server/actions/market.ts`, `sell.ts`, `custody.ts`, `account.ts`, `payments.ts`: as funções passaram
  a carregar a configuração no começo; quem mexer nelas mantém a tabela carregada no lugar da constante.
- `src/domain/constants.ts`: parâmetro opcional novo em quatro funções — chamadas antigas continuam
  compilando.
- `src/server/db/db.test.ts`: a lista de tabelas ganhou `caixas`, `config_historico`, `config_plataforma` e
  `tipos_moeda`, em ordem alfabética.
- `RISCOS_ASSUMIDOS.md`: três linhas de índice, uma na tabela de pastas e três seções no fim.
