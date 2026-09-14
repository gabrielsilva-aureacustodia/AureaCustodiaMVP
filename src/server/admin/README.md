# `src/server/admin/` — o servidor do painel administrativo

A camada de serviço do painel `/admin` (frente C): quem é membro, o que ele pode, e a trilha de
tudo o que ele faz. É o equivalente, no desenho da Áurea, do backend da arquitetura de
referência da IOCUS (`docs/referencia/TRANSFERENCIA_ARQUITETURA_ADMIN.md`):

```
Página em src/app/(admin)/admin/<area>/page.tsx      sessão e permissão, no servidor
      ↓
Componente em src/components/admin/<area>/           tela e estados
      ↓
Server Action em src/server/actions/admin/<area>.ts  confere a permissão de novo, sempre
      ↓
Serviço nesta pasta                                  regra e trilha
      ↓
Repositório em src/server/db/repositories/           único lugar com SQL
```

## A frase que explica a pasta

**A recusa acontece aqui, no servidor.** Esconder item de menu é conveniência; toda Server Action
do painel chama `permissaoParaAcao` por conta própria.

## Arquivos

| Arquivo | O que faz | `server-only` |
|---|---|---|
| `acesso.ts` | `carregarMembro`, `membroDaSessao`, `membroDaPagina` (o guarda das páginas), `podeAbrirPainelAdmin`, `permissaoParaAcao`, `exigirPermissao`. Lê o ambiente e a sessão; cai no bootstrap se o banco falhar; registra recusas na trilha | ✅ |
| `rbac.ts` | Catálogo (`garantirCatalogosAdmin`), resolução do membro no banco e a administração da equipe — adicionar e alterar membro, criar, alterar e excluir papel —, cada escrita com a linha de auditoria na mesma transação | — |
| `auditar.ts` | `registrarAcaoAdmin`: grava `admin.<area>.<verbo>` em `aurea.audit_log` dentro da transação de quem chama | — |
| `contabil.ts` | Lançamento manual, estorno, alíquota e conferência do livro-razão, com a trilha na mesma transação | — |
| `uso.ts` | `gravarEventosDeUso` e `carregarUsoNoBanco` (eventos + trilha do período, com teto de leitura) | — |
| `resultados.ts` | Os carregadores das telas: `carregarFinanceiro`, `carregarContabil`, `carregarKpis`, `carregarUso`, `carregarPainelInicial`. Leituras de outra frente que ainda não existem viram `null`, nunca erro | ✅ |
| `cs.ts` | **C2.** O atendimento: `receberEventos` (o que o webhook traduziu — contato, conversa, conta pelo telefone, reentrega sem duplicar, estado de entrega só para a frente), `carregarCaixa`, `abrirConversa`, `responderConversa` (envia fora da transação e grava enviada, registrada ou falhou), `iniciarConversa`, notas, etiquetas, responsável, situação e `atualizarContato` | — |
| `usuarios.ts` | **C2.** As ações da ficha: criar conta, editar cadastro e dados bancários, ajustar saldo, inadimplência, ativar e desativar, redefinir senha, anotar. As portas `PortaDeEstado` (com `portaDeEstadoNoBanco`: `mutarEstado` e a linha `admin.usuarios.<verbo>` na mesma transação) e `PortaDeIdentidade` | — |
| `identidade.ts` | **C2.** A porta do Supabase Auth pela chave de serviço: buscar, criar, definir senha, bloquear e enviar o link de redefinição. Sem as variáveis, responde "não configurada" com os nomes do que falta | ✅ |
| `portas.ts` | **C2.** Liga os serviços ao mundo real: `portaDeEstadoDoServidor` (banco ou memória), `executorOuNulo`, `ehTabelaAusente` (erro 42P01) | ✅ |
| `ficha.ts` | **C2.** Os carregadores da lista e da ficha do usuário, aba por aba. Dados bancários só saem com `usuarios.dados_bancarios`; leituras que podem faltar viram `null` | ✅ |
| `atendimento.ts` | **C2.** O carregador da tela de CS (`carregarAtendimento`) e a equipe para atribuir conversa | ✅ |
| `situacao.ts` | **C2.** `contaDesativada(email)`: a pergunta que o login, o callback e o casco do app vão fazer (frente A). Banco fora ou conta da equipe respondem "ativa" | ✅ |
| `banco.test.ts` | 34 testes contra o Postgres embutido: migrations 020 a 023, catálogo, membros, proteção do último dev, trilha, registro de uso, ações contábeis, atendimento e ações da ficha do usuário | — |
| `acesso.test.ts` | 5 testes do caminho sem banco: bootstrap e recusa 401/403 | — |
| `situacao.test.ts` | 3 testes de `contaDesativada` | — |
| `testing/` | O executor PGlite dos testes desta pasta. Não é código de produção | — |
| `ATALHOS.md` | O que esta pasta deve ao próprio rigor (RA-40, RA-41, RA-43, RA-44) | — |

Os arquivos sem `server-only` recebem o `Executor` (ou a `Consulta`) por parâmetro, como
`src/server/db/estado.ts`: é o que deixa a suíte rodá-los contra o Postgres embutido.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `AUREA_ADMIN_EMAILS` | Lista (vírgula) de quem entra como `dev` quando a tabela de membros não o conhece. **Sem ela, valem as contas de `ACCOUNTS`** |
| `POSTGRES_URL` | Sem ela não há tabela de papéis: vale só o bootstrap, e a tela de equipe diz isso |
| `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` | C2: criar login, redefinir senha e bloquear conta pelo painel. Sem elas, a conta é criada só na plataforma e as ações de senha dizem o que falta |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `WHATSAPP_WEBHOOK_SECRET` | C2: o WhatsApp do atendimento. Ver `src/lib/mensageria/README.md` |

## Regras que valem aqui

- **Toda ação do painel grava `audit_log`** com `ator` = e-mail do membro e `acao` =
  `admin.<area>.<verbo>`, na mesma transação da escrita. Recusa de permissão também entra, como
  `admin.acesso.recusado`.
- **Ação do painel não reimplementa regra de outra frente.** Ajuste de saldo é lançamento
  `ajuste`; taxa é `TabelaDeTaxas`; análise é `src/server/estacao/analise.ts`.
- **O papel é relido a cada requisição.** Desativar um membro vale na tela seguinte.

## O que quebra se você mexer aqui

| Se você mexer em… | Quebra ou muda… |
|---|---|
| `acesso.ts`, o fallback do bootstrap | Quem entra no painel quando o banco falha — e se o Gabriel consegue entrar |
| `rbac.ts`, `garantirCatalogosAdmin` | As concessões iniciais dos papéis de sistema. Ele nunca pode desfazer o que a tela de papéis mudou |
| `rbac.ts`, `travarEquipe` | A garantia de que duas mudanças simultâneas não deixam o painel sem dev |

## Conexões com as outras pastas

| Pasta | Relação |
|---|---|
| `src/domain/admin/` | A regra pura: catálogo, resolução, proteção do último dev |
| `src/server/db/repositories/admin-rbac.ts` | O SQL das quatro tabelas da migration 020 |
| `src/server/db/repositories/auditoria.ts` | `registrarAuditoria`, a trilha que já existia |
| `src/server/relatorios/acesso.ts` | `autorizarRelatorioNoPainel` chama `carregarMembro`: as rotas de `/api/relatorios/*` respeitam os papéis |
| `src/app/api/admin/conciliacao/` | Pede `resultados.ver` pelo `carregarMembro` |
| `src/server/session.ts` | O e-mail da sessão — o mesmo cookie do app, sem segundo login |
| `src/server/relatorios/dados.ts` | `dreCompleta`, `gerarRelatorio` e `ehNomeDeRelatorio` — lidos pelo Financeiro, nunca alterados |
| `src/server/db/repositories/eventos-uso.ts`, `painel-leituras.ts` | O SQL do registro de uso e as leituras da trilha, do histórico da fila (A2), dos aceites (A3) e dos recebimentos do gateway (B1) |
| `src/server/db/repositories/cs.ts`, `admin-usuarios.ts` | O SQL das migrations 022 e 023 |
| `src/server/db/estado.ts` | `lerEstado` e `mutarEstado`, reaproveitados pela `PortaDeEstado` — o ajuste de saldo vira `ajuste` no ledger pela derivação de sempre |
| `src/lib/mensageria/` | O provedor de WhatsApp que `cs.ts` recebe por parâmetro |
| `src/domain/kpis.ts`, `src/domain/admin/` | A regra pura que os carregadores alimentam |
