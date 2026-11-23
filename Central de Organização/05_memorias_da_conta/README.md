# Memórias da conta para este repositório

**47 arquivos**, cópia literal de `C:\Users\Gabriel\.claude\projects\C--dev-AureaCustodiaMVP\memory\` em 22/11/2026 (inclui o índice `MEMORY.md`). Para restaurar em outra conta, copiar estes arquivos de volta para a mesma pasta de memória do projeto nessa conta. São regras e decisões do Gabriel (como trabalhar, o que nunca fazer), não código. As worktrees das frentes e a pasta `-admin` deste repositório **não têm memória própria** (conferido: 0 arquivos); as memórias R11 por execução ficam em `../01_continuidade/memorias-r11/`.

> Atenção: algumas memórias citam o contrato dos Correios e o ambiente. Nenhuma guarda senha ou chave (verificado por busca antes do commit), mas o repositório é **público de propósito** (RA-11): conferir antes de qualquer push.

| Memória | O que diz | Tipo | Atualizada |
|---|---|---|---|
| `MEMORY.md` | — | — | — |
| `ambiente-aberto-proposital.md` | No projeto Áurea Custódia, o repositório público, a ausência de SESSION_SECRET local e a senha do banco exposta no histórico são decisões deliberadas do Gabriel durante o MVP — não sinalizar como defeito nem gastar tempo nisso. | memory | 2026-09-14 |
| `chave-supabase-nunca-sai-do-env.md` | SUPABASE_PUBLISHABLE_KEY fica no .env.local de toda pasta do projeto e nunca é removida; sem ela nenhuma conta entra no npm run dev | memory | 2026-10-25 |
| `commit-so-de-docs-sem-verificacao.md` | Commit que só mexe em MD/documentação vai direto — sem typecheck, teste nem build | memory | 2026-10-23 |
| `commit-so-depois-do-merge.md` | Commit só no fim, depois do merge de todas as branches — plano de branch, lint, typecheck e teste não se commitam antes da execução; tudo roda local até lá. | memory | 2026-09-21 |
| `contrato-correios-cws.md` | Contrato Correios da AUREA CUSTODIA (Platinum 1, nº 9912766936) e como o acesso às APIs do CWS funciona — token de 24h, catálogo filtrado pela credencial | memory | 2026-10-22 |
| `corrigir-todo-erro-que-eu-vir.md` | Gabriel quer que eu corrija qualquer erro de build, typecheck ou lint que eu encontrar, mesmo em arquivo que não é meu ou que outro agente esteja editando — nunca apenas reportar. | memory | 2026-10-01 |
| `crases-em-aspas-do-shell-executam.md` | Texto markdown com crases dentro de aspas duplas no Bash (node -e, echo) EXECUTA o que estiver entre as crases; usar heredoc com delimitador entre aspas ou a ferramenta Write | memory | 2026-11-05 |
| `dados-completos-em-infraestrutura.md` | Nunca entregar valor de configuração pela metade — todo registro DNS, variável de ambiente, chave ou URL vai literal e completo, e o resultado é confirmado depois de aplicado. | memory | 2026-09-06 |
| `dominio-vercel-ate-o-fim.md` | O site oficial do Real Olímpico é https://realolimpico.com.br (publicado, hospedado na Vercel) — todo link para cliente/convite usa ele, não o vercel.app. aureacustodia.com.br é só e-mail corporativo, nunca site. | memory | 2026-11-06 |
| `editar-env-local-eu-mesmo.md` | Gabriel quer que eu mesmo edite o .env.local (variável nova, valor novo) em vez de mandar instruções para ele editar | memory | 2026-10-22 |
| `email-corporativo-e-google-workspace.md` | O e-mail corporativo @aureacustodia.com.br fica no Google Workspace, não no Titan — a documentação do projeto está errada nesse ponto e me levou a dar uma orientação de DNS que quebrou o recebimento. | memory | 2026-09-06 |
| `entregar-comando-quando-bloqueado.md` | Quando uma ação minha é bloqueada, Gabriel quer o comando pronto para colar — e todo valor de configuração deve vir literal e completo, nunca descrito ou referenciado. | memory | 2026-09-15 |
| `entregar-ligado-para-testar.md` | Quando o Gabriel diz \"isso eu decido depois\", ele quer dar detalhes depois — a função se entrega LIGADA e funcional para ele testar, não desligada esperando | memory | 2026-10-23 |
| `frete-de-envio-postado-nao-volta.md` | Decisão do Gabriel (18/11/2026, D-H1) — envio já postado e cancelado na bancada NÃO devolve o frete ao saldo do cliente; a culpa de moeda que não chegou é dos Correios | memory | 2026-11-18 |
| `higiene-de-pastas-apos-merge.md` | Ritual da Áurea Custódia — depois de merge de branches e dos testes (meus e manuais do Gabriel), perguntar se está tudo ok, relatar erros, e então remover os worktrees e pastas de branch que sobraram em C:\\dev. | memory | 2026-09-15 |
| `leitura-de-producao-sem-set-de-sessao.md` | Consulta só-leitura em produção usa BEGIN READ ONLY por transação, nunca SET de sessão — o pooler do Supabase reaproveita a conexão | memory | 2026-11-03 |
| `marca-real-olimpico-no-site.md` | O site da Áurea Custódia se chama Real Olímpico desde 20/09/2026 — a marca é masculina, a razão social continua AUREA CUSTODIA LTDA, e rebrand que não aparece na tela não conta como feito. | memory | 2026-09-20 |
| `meta-pixel-capi-estado-e-teste.md` | Pixel e API de Conversões da Meta do Real Olímpico estão no ar e comprovados (15/11/2026); como testar o evento do servidor sem prejudicar a campanha | memory | 2026-11-15 |
| `migration-nova-se-aplica-no-commit.md` | Migration nova se aplica no banco junto com o commit que a cria, e mudança de env, migration ou infraestrutura se commita na hora — foi esquecer isso que fez Gabriel passar a repetir 'merge e commit' em toda tarefa. | memory | 2026-11-18 |
| `minimo-necessario-nao-corta-salvaguarda.md` | Fazer só o mínimo necessário significa cortar verificação repetida e cerimônia — nunca cortar o passo barato que impede um dano irreversível; quando uma edição tem uma variante inofensiva, ela é a variante certa e não se pergunta. | memory | 2026-09-20 |
| `nao-trocar-branch-do-worktree-compartilhado.md` | Nunca rodar git checkout/merge na pasta principal do repositório quando outra branch pode estar executando ao vivo ali — isso troca a branch debaixo do pé do agente que está trabalhando e corrompe o commit dele. | memory | 2026-10-02 |
| `nunca-usar-ferramenta-agent-subagente.md` | Gabriel proíbe o uso da ferramenta Agent (subagentes) neste projeto, inclusive para pesquisa própria antes de escrever prompts de branch — ler arquivos diretamente. | memory | 2026-10-01 |
| `organizacao-do-repositorio.md` | Padrão de organização exigido pelo Gabriel no repositório da Áurea Custódia — subpastas isoladas e um README.md explicativo em cada pasta, para permitir edição simultânea por vários agentes. | memory | 2026-09-02 |
| `pacote-de-entrega-para-outro-agente.md` | Roteiro escrito para outro agente executar precisa vir acompanhado do contexto do projeto, do estado do Git e da ordem de leitura do repositório — passos soltos não bastam. | memory | 2026-09-18 |
| `painel-admin-com-link-proprio.md` | O painel administrativo da Áurea Custódia precisa de um link de entrada próprio que leve direto ao painel — um link que cai no site do cliente conta como painel inexistente. | memory | 2026-09-15 |
| `pendencia-de-outro-agente-nao-e-minha.md` | No projeto Áurea Custódia vários agentes trabalham em paralelo — pendência atribuída a outra frente se registra uma vez e não se cobra de novo. | memory | 2026-09-10 |
| `pergunta-direta-resposta-direta.md` | Regras de eficiência de sessão do Gabriel — pedido direto sem extras, MD em vez de reler o repositório, build e merge antes de qualquer teste extra, revisão só depois do merge. | memory | 2026-09-18 |
| `plano-de-execucao-nao-se-commita.md` | MD de plano para outro agente executar é arquivo de trabalho local, sem commit; e erro meu que eu mesmo já diagnostiquei se conserta na hora, sem pedir confirmação. | memory | 2026-09-21 |
| `processo-eficiente-de-branches-2-0.md` | Processo 2.0 do Gabriel — chat de Controle (rotina 5 min) + chats de branch (rotina 5 min) + Execução, Auditoria (rotina 3 min) e Específico por branch, todos em \"ignorar permissões\"; merge/commit/push/deploy só no Controle | memory | 2026-11-18 |
| `push-sempre-com-conta-aureacustodia.md` | Neste projeto o push usa sempre a conta GitHub gabrielsilva-aureacustodia (gh auth switch) | memory | 2026-11-10 |
| `registrar-atalhos-assumidos.md` | No projeto Áurea Custódia, todo atalho de teste ou de segurança tomado para entregar rápido precisa ser registrado em dois lugares — um documento compilador na raiz e uma nota na pasta do arquivo modificado. | memory | 2026-09-02 |
| `regra-de-negocio-so-com-pergunta.md` | Nunca escrever como regra uma decisão de negócio, fiscal ou de cobrança que o Gabriel não tomou — nem marcada como \"proposta\"; vira pergunta a ele | memory | 2026-10-23 |
| `script-de-producao-fora-da-suite.md` | Script que grava em produção nunca fica em src/ como *.test.ts — a suíte o executa; e só roda depois do ok | memory | 2026-10-27 |
| `segmentar-em-branches-e-agentes.md` | Gabriel quer todo trabalho dividido em branches e subtópicos, com tarefa pesada quebrada em passos para agentes separados, rodando ao mesmo tempo quando possível. | memory | 2026-09-15 |
| `sem-docker-local.md` | Evitar Docker, container e servidor local (dev server, preview) na máquina do Gabriel — pesado; servidor local só de vez em quando para testar tela ou função, e Docker nunca; o resto se confere em produção | memory | 2026-11-18 |
| `sem-subagentes-nem-sessoes-paralelas.md` | Crie as branches" = worktree + MD + prompt para o Gabriel colar em outro agente; eu nunca abro subagente nem sessão paralela | feedback | — |
| `sem-travas-em-ambiente-de-teste.md` | A Áurea Custódia está em fase de teste MVP — nenhuma trava de login, aceite legal ou conformidade, e nenhuma dependência de configuração fora do padrão da ferramenta. | memory | 2026-09-13 |
| `site-de-apresentacao-real-olimpico.md` | Site de apresentação do Real Olímpico (6 partes, animado, para clientes) — pasta, projeto Vercel, URL, público, vocabulário liberado e a demonstração 'Na prática' | memory | 2026-11-07 |
| `suite-vermelha-nao-e-pendencia.md` | Suíte de testes quebrada não se entrega como item pendente — Gabriel quer que eu conserte na hora; durante uma urgência posso adiar, mas voltar e fechar faz parte da mesma sessão. | memory | 2026-09-20 |
| `terminal-do-gabriel-e-powershell.md` | O terminal do Gabriel é Windows PowerShell, onde `&&` é erro de sintaxe — todo comando entregue a ele vai um por linha, sem encadeador e sem `cd`, porque ele já está na pasta do projeto. | memory | 2026-09-20 |
| `terminologia-juridica-aurea.md` | O jurídico da Áurea Custódia proibiu as palavras token, NFT, cripto, ativo digital e todo vocabulário de investimento em qualquer texto do produto — o termo aprovado é recibo. | memory | 2026-09-10 |
| `teste-visual-nunca-vai-para-producao.md` | Página, bloco, texto ou ativo criado só para conferir visualmente nunca pode entrar em commit nem chegar à produção | memory | 2026-10-25 |
| `trava-so-depois-do-vencimento-real.md` | No Real Olímpico, trava por débito de custódia só vale um dia depois de a fatura vencer — fatura em aberto dentro do prazo não é dívida e não pode bloquear negociação. | memory | 2026-09-28 |
| `variaveis-da-vercel-sao-minhas.md` | Criar e editar variáveis de ambiente da Vercel é trabalho MEU (MCP da Vercel ou CLI), nunca do Gabriel; só peço o valor de segredo que existe apenas numa tela de terceiro, e tento buscá-lo sozinho antes | memory | 2026-11-18 |
| `variavel-ja-cadastrada-nao-se-pede-de-novo.md` | Na Vercel da Áurea Custódia, SUPABASE_SERVICE_ROLE_KEY já está cadastrada — não pedir para criar ou atualizar variável de ambiente sem um motivo concreto e dito. | memory | 2026-09-15 |
| `verificar-caminhos-de-painel.md` | Não descrever caminhos de menu de painéis externos (Cloudflare, HostGator, Supabase, Vercel) de memória — verificar a documentação atual antes, porque as interfaces mudam e Gabriel perde tempo procurando o que não existe. | memory | 2026-09-06 |

<!-- m22:ini -->
## Memórias novas de 22/11/2026 [central-22/11]

Memórias da conta criadas depois da foto original (cópia literal em `05_memorias_da_conta/`) e memórias de sessão do repositório (`memorias-de-sessao-22-11/`; original em `docs/memorias/`).

| Arquivo (cópia aqui) | Caminho original (manda) | O que é | Tarefa |
|---|---|---|---|
| `2026-11-22--claude-code--manut2-balcao-posicao-e-video.md` | `docs/memorias/2026-11-22--claude-code--manut2-balcao-posicao-e-video.md` | Balcão: posição = lugar físico, vídeo e armazenamento (T3) — memória do agente | Memória de sessão (repo) |
| `2026-11-22--claude-code--manut2-fechamento-da-documentacao.md` | `docs/memorias/2026-11-22--claude-code--manut2-fechamento-da-documentacao.md` | Fechamento da Manutenção 22-11 (Processo Padrão) — memória do agente | Memória de sessão (repo) |
| `2026-11-22--claude-code--manut2-isencao-e-cpf-ou-cnpj.md` | `docs/memorias/2026-11-22--claude-code--manut2-isencao-e-cpf-ou-cnpj.md` | Isenção da Áurea/CEO e CPF ou CNPJ (T2) — memória do agente | Memória de sessão (repo) |
| `2026-11-22--claude-code--manut2-kpis-do-conselho.md` | `docs/memorias/2026-11-22--claude-code--manut2-kpis-do-conselho.md` | KPIs do conselho: regras de cálculo (T5) — memória do agente | Memória de sessão (repo) |
<!-- m22:fim -->

<!-- commits22:ini -->
## Commits de 22/11/2026, de `d570215` até `ba50887` (36 commits, mais novo primeiro) [central-22/11]

Foto tirada no fechamento; `git log d570215^..HEAD` refaz a lista. Memória nova da conta: `email-fica-para-amanha-registrar-tudo.md` (nesta pasta).

| Commit | Assunto |
|---|---|
| `ba50887` | docs: Central de Organização, varredura final de 22/11 (estado final, chats, commits) |
| `44db26f` | docs: status final do QA do Davi, MD do R4, texto do relatório, registro (22/11) |
| `6dede60` | docs: Central de Organização atualiza MDs de 22/11 |
| `81f2cfa` | Teste da primeira mudança dos Termos acompanha a versão 2.2 publicada; garantias e relatórios finais do QA do Davi (22/11) |
| `f484c6f` | R1 (QA Davi): "Saiba mais" da faixa de cookies com alvo de toque de 44px |
| `895b924` | scripts: executor de uso único que publica as versões novas dos documentos legais (22/11) |
| `3f794fa` | docs: Central de Organização atualiza MDs de 22/11 |
| `e6fdcc9` | R4 (QA Davi): MD de execução atualizado (Tabela 2.5) |
| `18630a9` | R1 (QA Davi): faixa de cookies mais baixa no celular (texto curto, botões de 44px iguais) |
| `e3f8958` | R4 (QA Davi): Tabela de Taxas 2.5 (Retirada Segura: embalagem lacrada e rastreio, sem seguro de valor) e textos alinhados |
| `ee28f3b` | CSP volta a bloquear: o travamento das telas logadas era artefato do painel oculto do navegador de teste, não do site |
| `5c9e7da` | CSP volta a Report-Only enquanto se investiga o erro #310 nas telas logadas |
| `e28914c` | docs: Central de Organização atualiza MDs de execução e relatórios de 22/11 |
| `a267335` | R4 (QA Davi): Política 2.1 (cadastro formal e identidade), Tabela de Taxas 2.4 (Retirada Segura) e prazo da retirada em 30 dias úteis (A05, A02, A01) |
| `f8ede77` | R4 (QA Davi): Termos 2.2 e Arbitragem 2.2 (só concordância, remissões e erros materiais), textos alinhados a seguro/guarda/retirada/Sicoob, comparativo com cripto removido |
| `a4d5488` | R1 (QA Davi): A09 faixa de cookies (Pixel e API de Conversões só após "Aceitar") e CSP bloqueante |
| `5a39b89` | A08: dinheiro da empresa sai da auditoria do cliente; B09: ano travado no servidor |
| `ab0f950` | docs: Central de Organização atualiza relatórios de 22/11 |
| `184b3ea` | 404: título sóbrio 'Página não encontrada' (pedido do Polimento) |
| `e23fa66` | docs: garantias, planos e relatórios da manutenção e do QA do Davi (22/11) |
| `06bfba3` | Teste de editar cadastro no admin acompanha CPF ou CNPJ (T2) |
| `e97a19e` | R1 (QA Davi): teste de regressão do B01 (estado não vaza) |
| `f4b0c97` | docs: Central de Organização recebe os MDs de 22/11 (continuidade, planos, relatórios, chats, memórias) |
| `2d25296` | Teste do estorno do frete não depende mais da data de hoje (R3) |
| `4b2f48f` | R4 (QA Davi): 404 em português, plural, Esc e clique fora só onde seguro, tutorial sobre janelas, botões flutuantes, textos legais e de interface (Termos seguem na 2.1) |
| `6140f17` | R3 (QA Davi): saque em dias úteis, validação do depósito, oferta de compra sem saldo, ano travado no envio, CEP e continuar, termos de publicação, texto do saque |
| `4026823` | R2 (QA Davi): e-mail pendente até confirmar, esqueci minha senha, validação de nome/nascimento/telefone/Pix, aceite com erro visível |
| `4c2df93` | R1 (QA Davi): B01 visão do estado por usuário (sem dado de terceiros no código da página), cookie Supabase Secure, CSP em modo relatório, fuso fixo nas datas (React 418) |
| `cb259d3` | docs: variável SUPABASE_SERVICE_ROLE_KEY conferida na Vercel; autoconfirm confirmado |
| `1e09864` | docs: pendências de e-mail para 23/11 (Resend, DNS, B02, avisos, esqueci senha) |
| `66c0dd2` | T5: KPIs do conselho reescritos (pagante, churn por motivo, margem por moeda) e código da moeda em cada negociação (migration 059) |
| `019947c` | T6: login do Google no app instalado (callback tolerante, aviso no login) e docs de PWA no iPhone |
| `282e55d` | docs: fechamento da Manutenção 22-11 (RETOMADA, perguntas da B ao contador, índice, memórias) |
| `6c3f79f` | T5: KPIs do conselho (CAC/payback, margem por moeda, conversão, churn, liquidez) em /admin/resultados/kpis |
| `1e6b775` | T2+T3: isenção Áurea/CEO, CPF ou CNPJ, peso padrão do balcão, gravador de vídeo |
| `d570215` | T1 Financeiro: saldo dos clientes, taxas pagas com custódia, troca de e-mail sem reescrever o livro-razão |
<!-- commits22:fim -->

## Atualização 22/11/2026 (21:55)
`email-fica-para-amanha-registrar-tudo.md` atualizado: conta nasce confirmada, sem confirmação de e-mail; nunca limitar cadastro; documento único de e-mail e validação de CPF em pendências.
