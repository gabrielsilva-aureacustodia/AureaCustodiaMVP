# Plano de execução — Painel Administrativo da Áurea Custódia

```
Projeto:     Áurea Custódia / Real Olímpico
Repositório: gabrielsilva-aureacustodia/AureaCustodiaMVP
Base:        main @ bb975db
Escrito em:  12/09/2026
Referência:  docs/referencia/TRANSFERENCIA_ARQUITETURA_ADMIN.md (desenho da IOCUS)
Branches:    3 — a primeira mergeia antes; as outras duas rodam em paralelo
```

---

## 1. O que este documento é

O passo a passo do ambiente administrativo: cinco áreas pedidas pelo Gabriel em
12/09/2026, distribuídas em três branches, com as tabelas, rotas, permissões e
arquivos de cada uma.

Ele nasceu de duas leituras: o documento de transferência da IOCUS, que descreve um
painel administrativo já em produção, e um inventário do que a Áurea **já tem no
banco**. A segunda leitura é a que mais economiza tempo — boa parte do que o painel
precisa mostrar já está sendo gravado desde o primeiro dia.

---

## 2. As cinco áreas pedidas

| # | Área | Rota | Branch |
|---|---|---|---|
| 1 | Central de Resultados — Financeiro, Contábil, KPIs, Uso | `/admin/resultados/*` | 1 |
| 2 | CS com mensageria de WhatsApp | `/admin/cs` | 2 |
| 3 | Administração de usuários | `/admin/usuarios` | 2 |
| 4 | Bancada de análise, auditoria de moedas, Correios, recibos | `/admin/bancada`, `/admin/moedas`, `/admin/logistica` | 3 |
| 5 | Configuração do site — taxas e catálogo | `/admin/configuracao` | 3 |

---

## 3. Decisões tomadas em 12/09/2026

**Topologia: route group `(admin)` dentro do projeto atual.**
O desenho da IOCUS tem um backend Rust separado e dois frontends que o consomem por
HTTP. A Áurea não tem backend separado — o backend *é* o Next.js, e toda regra vive em
Server Actions. Copiar a IOCUS ao pé da letra exigiria construir uma API HTTP inteira
que hoje não existe, só para o painel conversar com o próprio servidor. O route group
entrega o mesmo isolamento que importa (layout, navegação, CSS e autorização próprios,
nada do painel no bundle do cliente) sem esse custo. O subdomínio
`admin.aureacustodia.com.br` pode ser ligado depois por rewrite de host, sem refazer
nada.

**Mensageria: adaptador plugável, com provedor de QR code primeiro.**
A caixa de conversas é construída contra uma interface interna
(`ProvedorMensageria`). O primeiro provedor é de QR code — conecta o WhatsApp que
vocês já usam em minutos, sem aprovação de ninguém. A API oficial da Meta entra
depois como segundo adaptador, sem tocar na tela.

**Perfis: papéis e permissões no banco.**
Papéis criados e editados pelo próprio painel. Você cria "contador vê só a DRE" ou
"operador de bancada vê só a análise" sem mexer em código.

---

## 4. Inventário — o que já existe

Esta seção é o motivo de o plano ser menor do que parece.

### 4.1. Já gravado no banco, pronto para o painel ler

| O que | Onde | Desde |
|---|---|---|
| Livro-razão com hash SHA-256 encadeado | `aurea.ledger_entries` | migration 003 |
| Trilha de auditoria de toda mutação | `aurea.audit_log` | migration 003 |
| Plano de contas e alíquotas do contador | `aurea.contas_contabeis`, `aurea.parametros_contabeis` | migration 003 |
| Lançamentos manuais append-only | `aurea.lancamentos_manuais` | migration 003 |
| Registro de toda exportação de relatório | `aurea.exportacoes` | migration 003 |
| Laudos da bancada com corrente de hashes | `aurea.analises` | migration 004 |
| Pagamentos e conciliação | migrations 002, 008 | — |
| Eventos de rastreio dos Correios | `aurea.rastreios` | migration 002 |
| Saques | `aurea.saques` | migration 009 |
| Faturas mensais de custódia | `aurea.faturas_custodia` | migration 010 |
| Retiradas físicas com histórico de etapas | `aurea.retiradas` | migrations 011, 012 |
| Cadastro completo do cliente (CPF, endereço, dados bancários) | `aurea.users` | migration 007 |

### 4.2. Já calculado em código

- **DRE completa** — `src/domain/dre.ts` + `dreCompleta()` em `src/server/relatorios/dados.ts`.
  Sem alíquota nenhuma em código: os percentuais vêm de `aurea.parametros_contabeis`.
- **Quatorze relatórios** já montados em `NOMES_RELATORIOS`: `dre`, `analise`,
  `ledger`, `auditoria`, `extratos`, `negociacoes`, `custodia`, `estoque`, `contas`,
  `lancamentos-manuais`, `parametros`, `exportacoes`, `saques`, `retiradas`.
- **API de leitura** — `GET /api/relatorios/<nome>` em JSON, CSV e XLSX, com filtro de
  período, já integrada ao Google Sheets e ao Excel.
- **Conciliação financeira e física** — `GET /api/admin/conciliacao`.
- **Verificação da corrente de hashes** — `conferirCadeia()` em `src/domain/analise.ts`,
  `verificarCadeia()` em `src/domain/ledger.ts`.
- **Rotas da bancada** — `/api/estacao/fila`, `/analise/abrir`, `/analise/fechar`,
  `/video/url`, com a fórmula de hash congelada e testada.
- **Etiquetas de envio e retirada** em PDF.
- **Uma tela administrativa** — `/relatorios`, com oito abas, restrita por `ehAdmin`.

### 4.3. O que não existe

1. Papéis e permissões — hoje `ehAdmin()` lê `AUREA_ADMIN_EMAILS` ou as sete contas do
   seed. É sim ou não, sem granularidade.
2. Navegação administrativa — `/relatorios` é um item do menu do cliente.
3. KPIs — nenhum indicador de negócio calculado.
4. Registro de uso e comportamento — `audit_log` grava mutação de estado, não navegação.
5. Qualquer coisa de CS ou WhatsApp — zero.
6. Criação e edição de usuário pelo painel.
7. Taxas e catálogo editáveis — hoje são constantes de módulo.
8. Bancada no navegador — a análise só roda no Electron da pasta `estacao/`.

---

## 5. A arquitetura do painel

### 5.1. As camadas, adaptadas da IOCUS

A IOCUS separa `Página → Hook → Wrapper Axios tipado → API Rust`. Na Áurea o
equivalente exato é:

```
Página em src/app/(admin)/admin/<area>/page.tsx     Server Component: sessão e permissão
      ↓
Componente em src/components/admin/<area>/          Client Component: tela e estados
      ↓
Server Action em src/server/actions/admin/<area>.ts  o "wrapper tipado" da IOCUS
      ↓
Serviço em src/server/admin/<area>.ts                regra e autorização de verdade
      ↓
Repositório em src/server/db/repositories/           único lugar com SQL
```

O princípio da IOCUS que se preserva inteiro: **a recusa real acontece no servidor.**
Esconder item de menu é conveniência; a Server Action confere a permissão por conta
própria, sempre, e é ela que diz não.

O princípio que se descarta: wrappers HTTP. Server Action tipada já é a mesma coisa
com menos peça no meio.

### 5.2. Por que o painel não fica dentro de `(app)`

`src/app/(app)/layout.tsx` monta o `AppProvider`, que carrega o `AppState` inteiro e
o revalida a cada 10 segundos. O painel lê ledger, auditoria, conversas de CS e KPIs —
nada disso está no `AppState`, e pendurar o admin ali faria toda tela administrativa
arrastar o estado do marketplace sem usar. O route group `(admin)` tem layout próprio,
provider próprio e CSS próprio.

### 5.3. Autenticação — sem segundo login

Quem já entrou por `/entrar` e é membro da equipe abre `/admin` direto. Não há
segunda tela de senha, não há segundo fator, não há cookie administrativo extra. A
IOCUS tem isso porque tem dois frontends em domínios diferentes; aqui é o mesmo
domínio e a mesma sessão assinada de `src/server/session.ts`.

O bootstrap importa: se o RBAC não conhecer o e-mail mas ele estiver em
`AUREA_ADMIN_EMAILS` ou entre as contas do seed, entra como `dev`. Isso garante que
ninguém — em especial o Gabriel — fique trancado fora do painel por causa de uma
tabela vazia.

### 5.4. Auditoria de ação administrativa

`aurea.audit_log` já existe e é append-only. Toda Server Action de
`src/server/actions/admin/` grava uma linha com `ator` = e-mail do membro e `acao` =
`admin.<area>.<verbo>`. O helper novo é `src/server/admin/auditar.ts`, porque a
auditoria de hoje só sabe gravar dentro de `mutateState()`, e a maioria das ações do
painel não toca o `AppState`.

---

## 6. Numeração reservada de migrations

> **Substituída em 13/09/2026.** Este painel passou a ser a frente C da rodada de
> finalizações, junto com as frentes A (mercado e termos) e B (cobrança e custódia), que
> usam 014 a 019. A reserva vigente está na seção 3.3 de
> [`finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md`](finalizacoes/PLANO_FINALIZACOES_3_BRANCHES.md),
> e a tabela 6.1 daquele plano lista os outros ajustes a este documento.

Três branches em paralelo escolhendo número de migration na hora colidem. Reservado:

| Branch | Migrations |
|---|---|
| 1 (C1) | `020_admin_rbac.sql`, `021_eventos_uso.sql` |
| 2 (C2) | `022_cs_mensageria.sql`, `023_notas_e_atribuicoes.sql` |
| 3 (C3) | `024_config_plataforma.sql`, `025_caixas_fisicas.sql` |

Padrão da casa: schema `aurea`, RLS ligado em toda tabela nova, dinheiro em `bigint`
de centavos, timestamp em `bigint` de milissegundos UTC, comentário de bloco no topo
explicando o porquê.

---

# Branch 1 — `admin/fundacao-e-resultados`

**Mergeia antes das outras duas.** Ela cria o casco, a autorização e a navegação que
as branches 2 e 3 só preenchem.

## 1.1. Migration 014 — papéis, permissões e membros

```sql
aurea.admin_permissoes     (chave PK, modulo, rotulo, descricao)
aurea.admin_papeis         (id, slug UNIQUE, nome, rank, variante_painel, sistema, created_at)
aurea.admin_papel_permissoes (papel_id, permissao_chave)   -- PK composta
aurea.admin_membros        (id, email UNIQUE, nome_exibicao, papel_id,
                            status 'ativo'|'inativo', criado_por, created_at)
```

Papéis de sistema semeados: `dev` (rank 100, variante `desenvolvimento`), `socio`
(rank 50, variante `gestao`), `operacao` (rank 10, variante `operacional`).

Os catálogos de permissão **não são semeados em SQL**. Mesma razão do plano de contas
da migration 003: a lista vive em `src/domain/admin/permissoes.ts`, e a aplicação faz
o upsert na primeira leitura. Duplicar em SQL cria duas verdades que divergem na
primeira permissão nova.

`rank` existe para o painel saber ordenar e para a tela de papéis mostrar hierarquia.
Não se transforma em bloqueio de operação.

## 1.2. Registro de permissões

`src/domain/admin/permissoes.ts` — a fonte da verdade, em `modulo.acao`:

```
resultados.ver          resultados.exportar
contabil.lancar         contabil.parametros
usuarios.ver            usuarios.criar        usuarios.editar
usuarios.dados_bancarios
cs.ver                  cs.responder          cs.canais
bancada.ver             bancada.analisar      bancada.auditoria
logistica.ver           logistica.etiquetas
config.ver              config.taxas          config.catalogo
admin.papeis            admin.membros         admin.auditoria
```

`dev` recebe todas. `socio` recebe todas menos `admin.papeis` e `admin.membros` — e
isso é ajustável pelo próprio painel, em uma tela, sem deploy. `operacao` recebe
`bancada.*` e `logistica.*`.

## 1.3. Serviço de acesso

`src/server/admin/acesso.ts`:

```ts
carregarMembro(email): Promise<MembroAdmin | null>   // papel + permissões resolvidas
temPermissao(membro, chave): boolean
exigirPermissao(chave): Promise<MembroAdmin>          // lança se não tiver
```

`ehAdmin()` em `src/server/relatorios/acesso.ts` passa a consultar o RBAC, mantendo o
fallback de ambiente descrito em 5.3. As rotas de `/api/relatorios/*` e a chave de
integração do Google Sheets continuam funcionando exatamente como hoje.

## 1.4. Casco do painel

```
src/app/(admin)/admin/layout.tsx          Server Component: sessão, membro, redirect
src/app/(admin)/admin/page.tsx            painel inicial por variante de papel
src/components/admin/AdminSidebar.tsx     navegação filtrada por permissão
src/components/admin/AdminTopbar.tsx
src/components/admin/AdminProvider.tsx    membro, permissões e run() de ação
src/styles/admin.css                      novo
src/components/admin/README.md
```

**A sidebar nasce completa**, com os itens das três branches já declarados, cada um
com sua permissão. As branches 2 e 3 só criam as páginas — nenhuma delas edita a
sidebar. É o que elimina o conflito de merge mais provável.

`admin.css` entra em `src/app/globals.css` na linha 37, **antes** de
`responsive.css`. A cascata do repositório depende de `responsive.css` ser o último
import, e isso não muda.

## 1.5. Migration 015 — registro de uso

O que responde "comportamento de usuário", e é o único dado dessa lista que ainda não
é gravado:

```sql
aurea.eventos_uso (id bigserial, created_at bigint, user_email text,
                   sessao text, tipo text, rota text, alvo text,
                   detalhes jsonb, plataforma text)
```

`POST /api/eventos` recebe em lote, do cliente, sem bloquear nada — falha de registro
nunca interrompe navegação. Um hook em `src/components/providers/` registra troca de
rota e ações de negócio (abriu mercado, iniciou venda, gerou recibo, pediu retirada).
Sem IP bruto e sem user agent completo: só a plataforma resumida.

## 1.6. Central de Resultados — quatro subpáginas

### `/admin/resultados/financeiro`
DRE do período (reaproveita `dreCompleta()`), receita por linha, comissões
arrecadadas, custódia faturada, saques pagos, depósitos conciliados, e o fluxo mensal.
Cartões no topo, tabela da DRE embaixo, seletor de mês/trimestre/ano — o mesmo
controle de período que `/relatorios` já tem.

### `/admin/resultados/contabil`
Plano de contas, lançamentos manuais (criar e estornar), alíquotas de
`parametros_contabeis` com o aviso de quais ainda estão nulas, e o registro de
exportações. É o conteúdo das abas Análise, Lançamentos, Alíquotas e Integração de
hoje, reorganizado.

### `/admin/resultados/kpis`
Módulo novo e **puro**, em `src/domain/kpis.ts`, com testes:

- volume negociado no período e ticket médio
- comissão média por negociação
- moedas em custódia, por tipo e por caixa
- contas com saldo, contas com moeda, contas ativas nos últimos 30 dias
- conversão envio → aprovação, e taxa de recusa por motivo
- tempo médio entre postagem, recebimento e laudo
- receita por tipo de moeda
- inadimplência das faturas de custódia
- ocupação do estoque físico

Puro e síncrono, recebendo as fontes como argumento — mesmo desenho de
`src/domain/dre.ts`. Assim dá para testar sem banco.

### `/admin/resultados/uso`
Lê `aurea.eventos_uso` e `aurea.audit_log` juntos: páginas mais abertas, jornada até a
primeira venda, ações por conta, horário de pico, e a trilha de auditoria completa com
filtro por ator, ação e período.

## 1.7. Os quatorze relatórios seguem servindo

`/relatorios` passa a redirecionar para `/admin/resultados/financeiro`. As rotas
`/api/relatorios/*` **não mudam** — o Google Sheets e o Excel do contador dependem
delas, e o contrato está em `docs/API_RELATORIOS.md`.

## 1.8. Alinhar a documentação do repositório

> **Movida para a sub-branch A1 em 13/09/2026** (passo A1.7 do plano de finalizações), que
> chega à `main` antes da C1. A C1 só acrescenta ao `CLAUDE.md` o parágrafo do módulo Admin.

O `CLAUDE.md` descreve a comissão, a tabela de custódia e o catálogo de tipos como
números que exigem decisão dos sócios antes de mudar. A Branch 3 entrega justamente a
tela que os edita. Manter o texto como está faria o próximo agente parar para pedir
autorização de algo já decidido, e a instrução do Gabriel em 12/09/2026 é explícita:
instrução do repositório que impeça o que ele pediu sai do repositório.

Arquivos a atualizar, no commit da Branch 1:

| Arquivo | O que muda |
|---|---|
| `CLAUDE.md` | Seção "Regras de negócio…" passa a dizer que os números são **parâmetros administrados em `/admin/configuracao`**, e que o código carrega o padrão inicial. Sai o "confirmar com o Gabriel antes". A superfície protegida fica restrita ao motor de casamento, aos tipos e ao contrato do store. Entra a descrição do módulo Admin. |
| `AGENTS.md` | Trava nº 3 reescrita no mesmo sentido. |
| `docs/ARQUITETURA_E_PASTAS.md` | Tabela de pastas ganha `(admin)`, `src/server/admin/`, `src/components/admin/`, `src/lib/mensageria/`. A seção da superfície protegida é reduzida. |
| `docs/diario/RITUAL_DE_SESSAO.md` e `_RESUMO.md` | Itens 65, 367 e 81 realinhados. |
| `.claude/commands/commit.md` | Passo 4 deixa de apontar `fees.ts` e `constants.ts` como parada obrigatória. |

**Entregáveis da Branch 1:** migrations 014 e 015, RBAC completo, casco e navegação do
painel, `admin.css`, quatro subpáginas de resultados, `src/domain/kpis.ts` com testes,
registro de uso, documentação alinhada.

---

# Branch 2 — `admin/usuarios-e-cs`

Parte de `main` depois do merge da Branch 1. Roda em paralelo com a Branch 3.

## 2.1. Migration 016 — mensageria

```sql
aurea.cs_canais     (id, tipo 'whatsapp'|'email', provedor, identificador,
                     status, config jsonb, created_at)
aurea.cs_contatos   (id, telefone_e164 UNIQUE, nome, user_email, created_at)
aurea.cs_conversas  (id, canal_id, contato_id,
                     status 'aberta'|'pendente'|'resolvida',
                     responsavel, assunto, ultima_mensagem_em, nao_lidas, created_at)
aurea.cs_mensagens  (id, conversa_id, direcao 'entrada'|'saida', corpo,
                     midia_url, midia_tipo, id_no_provedor UNIQUE,
                     status 'enviando'|'enviada'|'entregue'|'lida'|'falhou',
                     autor, created_at)
```

`id_no_provedor` é único de propósito: provedor de WhatsApp reentrega webhook, e sem
essa restrição a mesma mensagem aparece duas vezes na conversa.

`cs_contatos.user_email` casa a conversa com a conta pelo telefone do cadastro. É o
que transforma a caixa de mensagens em CRM: o atendente vê a ficha do cliente ao lado
da conversa.

## 2.2. Migration 017 — notas e atribuições

```sql
aurea.cs_notas            (id, conversa_id, autor, corpo, created_at)
aurea.cs_etiquetas        (slug PK, rotulo, cor)
aurea.cs_conversa_etiquetas (conversa_id, etiqueta_slug)
aurea.admin_notas_usuario (id, user_email, autor, corpo, created_at)
```

Nota interna é append-only, como todo registro do projeto: corrige-se com nota nova.

## 2.3. Adaptador de mensageria

```
src/lib/mensageria/README.md
src/lib/mensageria/tipos.ts      interface ProvedorMensageria
src/lib/mensageria/evolution.ts  provedor de QR code
src/lib/mensageria/cloud-api.ts  Meta WhatsApp Cloud API, para depois
src/lib/mensageria/index.ts      escolhe pelo ambiente
```

```ts
interface ProvedorMensageria {
  nome: string
  enviarTexto(para: string, texto: string): Promise<{ idNoProvedor: string }>
  enviarMidia(para: string, url: string, tipo: string, legenda?: string): Promise<{ idNoProvedor: string }>
  conferirAssinatura(cabecalhos: Headers, corpo: string): boolean
  normalizarEvento(corpo: unknown): EventoMensageria[]
}
```

A escolha por ambiente segue o padrão de `src/server/store/index.ts`: sem variável
configurada, o provedor é o de registro local, e a tela funciona para ver histórico.
Nenhuma tela quebra por falta de credencial.

## 2.4. Webhook

`POST /api/webhooks/whatsapp` — mesmo desenho de
`/api/webhooks/mercadopago`: confere assinatura, normaliza, grava, responde 200 rápido.
Webhook que demora é webhook reentregue.

## 2.5. Tela de CS

`/admin/cs` — três colunas:

1. **Conversas** — filtro por status, responsável e etiqueta; busca por nome ou
   telefone; contador de não lidas.
2. **Thread** — mensagens em ordem, com estado de entrega, caixa de resposta, envio de
   mídia, notas internas e etiquetas.
3. **Ficha do cliente** — quando o contato casa com uma conta: saldo, moedas
   custodiadas, recibos, envios em andamento com etapa atual, faturas em aberto,
   retiradas, últimos acessos, e link para a ficha completa em `/admin/usuarios/[email]`.

Atualização por polling de 5 segundos — o projeto já usa polling de 10s no
`AppProvider`, é o padrão da casa e não exige infraestrutura nova.

## 2.6. Administração de usuários

`/admin/usuarios` — lista com busca por nome, e-mail ou CPF, e filtros: com cadastro,
sem cadastro, inadimplente, com saldo, com moeda, criado no período.

`/admin/usuarios/[email]` — a ficha completa, em abas:

| Aba | Conteúdo |
|---|---|
| Cadastro | nome, CPF, nascimento, telefone, endereço, dados bancários, aceites legais com versão e data |
| Financeiro | saldo, extrato, ledger daquela conta, depósitos, saques, faturas de custódia |
| Acervo | moedas custodiadas com código, recibo, hash, caixa e posição |
| Logística | envios e retiradas com etapa atual e eventos de rastreio |
| Mercado | ofertas, ordens e negociações |
| Atividade | acessos, eventos de uso, e a trilha de auditoria das ações sobre essa conta |
| Notas | notas internas da equipe |

Ações, todas auditadas em `audit_log`:

- **criar usuário** — cria a identidade no Supabase Auth pela chave de serviço, grava
  em `aurea.users`, provisiona saldo e moedas de demonstração se pedido, e registra
  quem criou;
- **editar cadastro** — qualquer campo, inclusive CPF e dados bancários;
- **ajustar saldo** — grava lançamento `ajuste` no ledger, que é exatamente o que a
  migration 003 previu para saldo que muda sem negociação;
- **marcar ou desmarcar inadimplente**;
- **redefinir senha** — envia o link do Supabase, sem intermediário;
- **ativar e desativar**.

Servidor em `src/server/actions/admin/usuarios.ts` e `src/server/admin/usuarios.ts`.
A chave de serviço do Supabase nunca sai do servidor.

**Entregáveis da Branch 2:** migrations 016 e 017, adaptador de mensageria com
provedor de QR code, webhook, tela de CS com ficha do cliente, lista e ficha de
usuários com as seis ações.

---

# Branch 3 — `admin/bancada-e-configuracao`

Parte de `main` depois do merge da Branch 1. Roda em paralelo com a Branch 2.

## 3.1. Migration 018 — configuração da plataforma

```sql
aurea.config_plataforma (chave PK, valor jsonb, tipo, rotulo, descricao,
                         atualizado_em, atualizado_por)
aurea.config_historico  (id, chave, valor_antigo jsonb, valor_novo jsonb,
                         ator, created_at)                      -- append-only
aurea.tipos_moeda       (chave PK, ano_padrao, tiragem, categoria, negociavel,
                         detail, ord, ativo, criado_por, created_at)
```

`tipos_moeda` nasce semeada a partir de `COIN_TYPES` na primeira leitura — o mesmo
`garantirCatalogos()` que `repositories/contabil.ts` já faz com o plano de contas. O
código deixa de ser a verdade e passa a ser o padrão inicial.

`config_historico` é append-only e responde "quem baixou a comissão em março, e para
quanto". Taxa de plataforma que muda sem rastro é discussão insolúvel depois.

## 3.2. As taxas passam a ser parâmetro

Chaves: `fee_pct`, `fee_fixed_cents`, `custodia_mensal_por_moeda_cents`,
`custodia_anual_por_moeda_cents`, `taxa_saque_fixa_cents`, `deposito_max_cents`.

O ponto técnico que precisa ser feito com cuidado: `src/domain/fees.ts` é puro e
síncrono, e `tradeFee(price)` lê `FEE_PCT` como constante de módulo. Fazer o domínio
consultar o banco quebraria a pureza que segura os testes. A forma correta é a
assinatura ganhar a tabela de taxas como argumento com padrão:

```ts
export interface TabelaDeTaxas { feePct: number; feeFixed: Cents }
export const TAXAS_PADRAO: TabelaDeTaxas = { feePct: 0.005, feeFixed: 100 }
export function tradeFee(price: Cents, taxas: TabelaDeTaxas = TAXAS_PADRAO): Cents
```

Quem chama do servidor passa o que carregou de `aurea.config_plataforma`. O domínio
segue puro, os testes existentes seguem passando, e o número deixa de estar preso no
código. Mesmo tratamento para as funções de custódia.

> **Feito na sub-branch A1 em 13/09/2026**, junto com a comissão dos dois lados. As chaves
> de configuração da C3 são os campos de `TabelaDeTaxas` que a A1 criou.

**Consequência obrigatória:** `Trade` tem de congelar a comissão aplicada. Se a taxa
muda em março, negociação de janeiro precisa manter a comissão de janeiro — senão o
extrato e a DRE reescrevem o passado a cada ajuste. É o CD-09 do
`docs/diario/CRITICAL_DEBUGS.md`, que deixa de ser dívida e passa a ser requisito
desta branch: a coluna e o campo já existem, e o extrato precisa parar de recalcular.

## 3.3. Tela de configuração

`/admin/configuracao`, em abas:

- **Taxas e comissões** — cada parâmetro com valor atual, quem mudou, quando, e
  simulação ao lado ("com esta taxa, uma negociação de R$ 300 rende R$ X"). É o que
  torna a mudança explicável ao Rogério antes de ser salva.
- **Catálogo de moedas** — lista de `tipos_moeda` com edição e criação: nome, ano
  padrão, tiragem, categoria, ficha técnica, ordem na vitrine, e o interruptor de
  **negociável** — que é o que `isNegociavel()` passa a consultar.
- **Operacional** — limite de depósito, ciclo de sincronização, prazos de logística.
- **Integrações** — estado de cada serviço externo (banco, Storage, pagamento,
  Correios, mensageria, Sheets) com o que está configurado e o que falta.
- **Histórico** — `config_historico` inteiro.

## 3.4. Bancada de análise no navegador

`/admin/bancada` — a análise completa, sem Electron:

1. fila de envios em `Recebido pela custódia` e `Em análise física`;
2. câmera por `getUserMedia`, com escolha de dispositivo, e gravação por
   `MediaRecorder`;
3. peso em miligramas inteiros, veredito, motivo de recusa obrigatório na recusa,
   caixa e posição;
4. vídeo direto para o Supabase Storage por URL assinada — reaproveita
   `/api/estacao/video/url`, e o vídeo nunca passa pela rota da aplicação;
5. fechamento pelo **mesmo serviço** `src/server/estacao/analise.ts`.

**A fórmula do hash não muda.** Os quinze campos, a ordem e a forma canônica seguem
congelados como em `estacao/CONTRATO.md`, e `src/domain/analise.test.ts` continua
passando com o vetor de 10/09/2026. Recibo já emitido tem de continuar conferindo — é
a única coisa que a corrente entrega.

A estação Electron continua funcionando, sem alteração. Ela resolve dois problemas que
o navegador não resolve: gravar em disco antes de subir, quando a internet oscila, e
sobreviver a um refresh acidental no meio do procedimento. A tela web é para bancada
com rede estável; o `.exe` é para a bancada de verdade. As duas escrevem na mesma
corrente.

## 3.5. Auditoria de moedas

`/admin/moedas` — todas as moedas do sistema: código, tipo, ano, dono, recibo, hash,
caixa e posição, laudo de origem com peso e operador, vídeo da análise, e situação
(custodiada, em retirada, retirada). Reaproveita o relatório `estoque`.

Botão **verificar corrente**, que roda `conferirCadeia()` e `verificarCadeia()` e
mostra o índice da primeira divergência. É a prova de integridade do acervo, e ela
existe para ser usada, não para ficar guardada.

## 3.6. Correios e recibos

`/admin/logistica` — envios e retiradas de todas as contas, com os mesmos eventos de
rastreio que o cliente vê (de `aurea.rastreios`), etapa atual, prazo estourado em
destaque, reimpressão de etiqueta pelas rotas que já existem, e o visualizador de
recibo de qualquer conta.

## 3.7. Migration 019 — caixas físicas

```sql
aurea.caixas (codigo PK, rotulo, local, capacidade, ativa, created_at)
```

Hoje `caixa` e `posicao_caixa` são texto e inteiro solto em `aurea.analises`. Com
`caixas` modelada, o painel mostra ocupação real e recusa posição já ocupada — o que
é validação de dado, não trava de fluxo. Opcional nesta branch; se apertar, vira item
de roadmap.

**Entregáveis da Branch 3:** migrations 018 e 019, taxas e catálogo administrados,
comissão congelada no `Trade`, bancada web na mesma corrente de hashes, auditoria de
moedas com verificação de corrente, logística completa.

---

## 7. Zonas de arquivo — por que as branches 2 e 3 não colidem

| Área | Branch 1 | Branch 2 | Branch 3 |
|---|---|---|---|
| `src/app/(admin)/admin/` | layout, page, `resultados/` | `cs/`, `usuarios/` | `bancada/`, `moedas/`, `logistica/`, `configuracao/` |
| `src/components/admin/` | shell, sidebar, `resultados/` | `cs/`, `usuarios/` | `bancada/`, `moedas/`, `logistica/`, `configuracao/` |
| `src/server/admin/` | `acesso.ts`, `auditar.ts` | `cs.ts`, `usuarios.ts` | `bancada.ts`, `config.ts` |
| `src/server/actions/admin/` | — | `cs.ts`, `usuarios.ts` | `config.ts`, `bancada.ts` |
| Migrations | 014, 015 | 016, 017 | 018, 019 |
| `src/domain/` | `kpis.ts`, `admin/permissoes.ts` | — | `fees.ts`, `constants.ts` |
| `src/styles/admin.css` | cria o arquivo | acrescenta bloco no fim | acrescenta bloco no fim |

Os dois pontos de encontro são `admin.css` e `src/domain/types.ts`. Em ambos a regra é
a mesma: **só acrescentar no fim, em bloco comentado com o nome da branch.** Nunca
editar linha existente. Merge de acréscimo no fim de arquivo é trivial; merge de linha
reescrita no meio, não.

Branch 3 é a única que toca `fees.ts` e `constants.ts`. Branch 2 é a única que toca o
Supabase Admin API.

---

## 8. Ordem de trabalho

```
Branch 1  →  merge em main  →  Branch 2  ┐
                             Branch 3  ┘  →  merge em main
```

Branch 1 precisa estar em `main` antes de as outras começarem, porque elas dependem do
RBAC, do casco e da sidebar. Depois disso, 2 e 3 são independentes e podem ser abertas
no mesmo dia, por agentes diferentes.

Antes de cada commit, o checklist do repositório: `npm run build`,
`npm run typecheck`, `npm test`.

---

## 9. O que fica para depois

Coisas que o painel vai querer e que não estão nestas três branches, para não inflar o
escopo:

- Dashboard com gráficos de série temporal (os KPIs saem em número e tabela primeiro).
- Notificação em tempo real por SSE — polling resolve agora.
- Envio de campanha em massa pelo CS.
- Mensageria de e-mail no mesmo inbox do WhatsApp.
- Exportação de dado pessoal e expurgo por retenção.
- Subdomínio `admin.aureacustodia.com.br` — o rewrite de host é meia hora quando o
  painel estiver de pé.

---

## 10. O que o Gabriel precisa providenciar

Antes da **Branch 2**, o provedor de mensageria. Duas opções:

**Evolution API auto-hospedada** — grátis em software, custa a hospedagem (Railway ou
Fly.io, na faixa de US$ 5/mês). Conecta lendo QR code com o número que vocês já usam.

**Z-API** — serviço brasileiro, na faixa de R$ 100/mês, sem hospedar nada.

Escolhida a opção, as variáveis vão para a Vercel. O passo a passo com os valores
literais e completos entra em `docs/SETUP_CONTAS_E_SERVICOS.md` quando a Branch 2
começar — e a confirmação de que pegou é feita batendo no webhook, não por dedução.

Nada mais é necessário. Postgres, Supabase Auth, Storage, Mercado Pago e Correios já
estão configurados e em uso.

---

## 11. Registro de atalhos

Conforme a regra do repositório, todo atalho assumido entra em
`RISCOS_ASSUMIDOS.md` e no `ATALHOS.md` da pasta afetada, no mesmo commit. Os
previstos:

| Branch | Atalho |
|---|---|
| 1 | Bootstrap de papel por `AUREA_ADMIN_EMAILS` quando a tabela de membros não conhece o e-mail. |
| 1 | Registro de uso sem consentimento de rastreamento — é ambiente de teste com contas de sócios. |
| 2 | Provedor de WhatsApp por QR code é não-oficial; o número fica sujeito a banimento se o volume disparar. |
| 2 | Criação de usuário pelo painel define senha provisória sem segundo fator. |
| 3 | A bancada web depende de rede estável durante a gravação; sem ela, o `.exe` da pasta `estacao/`. |

---

## 12. Referências

- `docs/referencia/TRANSFERENCIA_ARQUITETURA_ADMIN.md` — o desenho da IOCUS.
- `estacao/CONTRATO.md` — a fórmula de hash congelada e as rotas da bancada.
- `docs/API_RELATORIOS.md` — o contrato dos quatorze relatórios.
- `docs/INTEGRACAO_GOOGLE_SHEETS.md` — a integração do contador.
- `src/server/db/migrations/003_ledger_dre_auditoria.sql` — o ledger, a trilha e a base da DRE.
- `RISCOS_ASSUMIDOS.md` — os atalhos já registrados.
