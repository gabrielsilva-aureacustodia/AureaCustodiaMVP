# Inventário do painel administrativo — lista de verificação do fim

```
Frente:   2 — Painel administrativo (/admin), polimento
Branch:   polish/aurea-admin   ·   base origin/main @ d29727a
Feito em: 30/10/2026 (sessão 1 desta frente)
Escopo:   src/app/(admin), src/components/admin, src/styles/admin.css. Fora: permissões, domain/, server/, api/, migrations, dados.
Uso:      no fechamento cada linha é conferida no navegador (1440, 768 e 375 px; claro e escuro).
Método:   Distilla (agentes/distilla/DISTILLA.md §4 e conceitos 21, 23, 27, 29, 32 de design/mapa.md). Ver BENCHMARK.md.
```

> Este arquivo é citado por `src/app/(admin)/README.md` ("mapa do que mudou de lugar em `docs/polimento/admin/INVENTARIO.md` §9")
> desde o redesenho de 25/10/2026, mas nunca foi commitado. Esta é a primeira versão versionada; o §9 daquela nota
> corresponde ao §2 abaixo (mapa de rotas), que reflete o código de hoje e não o histórico.

## 0. O que toda rota de `/admin` recebe

`src/app/(admin)/admin/layout.tsx` (Server Component):

| Busca | Origem | Para quê |
|---|---|---|
| `membroDaPagina()` | `@/server/admin/acesso` | sem sessão ou conta fora da equipe → `/painel`; devolve o membro com as permissões |
| `AdminProvider membro=…` | cliente | `pode(chave)` e `run(acao)` (toast + `router.refresh()`) para os componentes |

Montados no layout: `AdminProvider`, `SidebarProvider` (do casco do app, gaveta ≤ 1080 px), `AdminSidebar`, `AdminTopbar`,
`ModalHost`, `RegistroDeUso`. `loading.tsx` (esqueleto) e `error.tsx` (caixa dentro do casco) já existem. **O painel não
carrega o `AppState` do cliente.** Cada `page.tsx` confere a permissão por conta própria antes de buscar dado.

## 1. Casco (todas as rotas)

| Elemento | Ação / destino | ✔ |
|---|---|---|
| Pular para o conteúdo (`.adm-pular`) | âncora `#conteudo` | |
| Menu lateral em 3 grupos (Operação do dia · Gestão · Configuração) filtrado por permissão | `next/link` | |
| Abrir menu (≤ 1080 px): gaveta; toque no fundo fecha (o `div.sb-backdrop` é `aria-hidden`) | `useSidebar` | |
| Modo escuro (menu e menu da conta) | `<button role="switch">` | |
| Buscar ou ir para… (Ctrl K ou `/`) | `BuscaDoPainel`: só navega, pelas URLs que as páginas já aceitam | |
| Menu da conta: papel, tema, voltar ao app, sair | `useLogout` ← `actions/auth` | |
| Migalha nas fichas (`Usuários › e-mail`, `Auditoria de moedas › código`) | topbar | |

## 2. Rotas (19) — permissão, componentes, escritas

Navegação declarada uma vez em `components/admin/navegacao.tsx`; cada página repete a conferência.

| Rota | Permissão (ver · agir) | Componentes | Server Actions chamadas (`@/server/actions/admin/…`) |
|---|---|---|---|
| `/admin` Central de trabalho | — (atalhos filtrados) | `inicio/PainelInicial` | nenhuma (só leitura e links) |
| `/admin/saques` | `saques.ver` · `saques.pagar` | `saques/SecaoDeSaques`, `FilaDeSaques` | `saques`: `aprovarSaque`, `conferirSaque`, `marcarSaquePago`, `recusarSaque` |
| `/admin/bancada` | `bancada.ver` · `bancada.analisar`, `acervo.cadastro_direto`, `acervo.cadastro_sem_envio` | `bancada/BancadaWeb`, `GravadorDeVideo`, `QuadroDeCaixas`, `acervo/CadastroDiretoDeMoeda` | `bancada`: `atualizarBancadaNoPainel`, `abrirAnaliseNoPainel`, `assinarVideoNoPainel`, `fecharAnaliseNoPainel`, `salvarCaixaNoPainel`, `cadastrarMoedaDiretaNoPainel`, `cadastrarMoedaSemEnvioNoPainel` |
| `/admin/logistica` | `logistica.ver` · `logistica.expedir`, `logistica.etiquetas` | `logistica/PainelLogistica`, `ExpedicaoDaRetirada`, `AtualizarRastreio` | `logistica`: `emitirEtiquetaRetirada`, `cancelarEtiquetaRetirada`, `marcarRetiradaPostadaManual`, `atualizarRastreiosAgora` |
| `/admin/cs` Atendimento | `cs.ver` · `cs.responder`, `cs.canais` | `cs/CaixaDeAtendimento`, `ListaDeConversas`, `Conversa`, `CartaoDoCliente` | `cs`: 11 (responder, mídia, iniciar, anotar, situação, atribuir, etiquetas, contato, conferir canal, atualizar) |
| `/admin/usuarios` | `usuarios.ver` · `usuarios.criar` | `usuarios/FiltroDeUsuarios`, `TabelaDeUsuarios`, `CriarUsuario` | `usuarios`: `criarUsuarioNoPainel` |
| `/admin/usuarios/[email]` Ficha do cliente (7 abas) | `usuarios.ver` · `usuarios.editar`, `saques.ver` | `usuarios/CabecalhoDaFicha`, `AbaCadastro`, `AbaFinanceiro`, `AbaMercado`, `AbaAcervo`, `AbaLogistica`, `AbaAtividade`, `AbaNotas`, `AcoesDaConta`, `registros/*` | `usuarios`: 9 (cadastro, bancários, saldo, inadimplência, situação, senha, quitar fatura, nota) · `emails` · `registros`: 7 (editar/excluir/cancelar lote, ordem, envio, plano) |
| `/admin/moedas` Auditoria | `bancada.auditoria` | `moedas/FiltroDeMoedas`, `TabelaDeMoedas`, `VerificarCorrente` | `bancada`: `verificarCorrenteNoPainel` |
| `/admin/moedas/[codigo]` Ficha da moeda | `bancada.auditoria` · `logistica.etiquetas` | `moedas/BotaoVideo`, `TabelaDeMoedas` | `bancada`: `urlDoVideoNoPainel` |
| `/admin/moedas/[codigo]/cliente` (ver como o cliente vê) | `bancada.auditoria` | `FolhaDoRecibo` (do cliente) | nenhuma |
| `/admin/resultados/financeiro` | `resultados.ver` · `saques.ver`, `saques.pagar` | `resultados/Financeiro`, `TabelaDre`, `GraficoMensal`, `saques/SecaoDeSaques` | `contabil`: `verificarLedgerNoPainel` |
| `/admin/resultados/controle` | `resultados.ver` · `contabil.lancar` | `financeiro/AnaliseFinanceira`, `LancamentosDoPeriodo`, `PainelRecorrentes`, `PainelSetores`, `SeletorPeriodo` | `financeiro`: 4 (recorrentes, setores, lançar vencidos) |
| `/admin/resultados/contabil` | `resultados.ver` · `contabil.lancar`, `contabil.parametros` | `resultados/Contabil` | `contabil`: lançar/estornar manual, alíquota, ledger, Sheets |
| `/admin/resultados/fiscal` Notas fiscais | `resultados.ver` · `resultados.nfse` | `resultados/NotasFiscais` | `fiscal`: enviar fila, reprocessar, baixar XML |
| `/admin/resultados/kpis` Indicadores | `resultados.ver` | `resultados/Indicadores` | nenhuma |
| `/admin/resultados/uso` | `resultados.ver` ou `admin.auditoria` | `resultados/Uso`, `FiltroTrilha` | nenhuma |
| `/admin/configuracao` | `config.ver` · `config.taxas`, `config.catalogo` | `configuracao/FormGrupoConfig`, `CatalogoDeMoedas`, `DocumentoPublicado` | `config`: salvar configuração, publicar documento, salvar tipo de moeda |
| `/admin/equipe` | `admin.membros` ou `admin.papeis` | `equipe/PainelEquipe` | `equipe`: 5 (membro, papel) · `emails` |
| `/admin/resultados` | — | redireciona para `financeiro` | — |

Escritas não listadas aqui (`registros`, `emails`) são chamadas pelas fichas e pelo cadastro. **Nenhuma delas muda nesta frente.**

## 3. O que o painel precisa manter visível e correto (contrato)

| Regra | Onde | Por quê |
|---|---|---|
| Ação irreversível em dois passos, com o objeto no botão ("Confirmar: pagar o saque de R$ X a Fulano") | `ConfirmarAcao` (nenhum `window.confirm` no painel) | README de `components/admin` regra 8 |
| Ação sem permissão não aparece, e a página sem permissão mostra `SemPermissao` | `pode()`, `SemPermissao` | menu esconde, servidor recusa |
| Ambiente sem banco: aviso explícito em vez de tela vazia | `AvisoSemBanco`, `Indisponivel` | ver §6 |
| Tabela nova em `<TabelaRolavel rotulo=…>` (`Pecas.tsx`) com `table.audit-table`, `<caption class="adm-sr">` e `th scope` | todas as 46 | regra 8; desde 30/10/2026 o `div.table-scroll` é o componente |
| Data e hora por `formatos.ts` (fuso de Brasília) | todas | regra 4 |
| Elementos que o registro de uso conta levam `data-uso="área:gesto"` | vários | regra 7 |
| Alvo de toque de 44 px | `admin.css` (32 ocorrências) | regra 6 |

## 4. Ganchos que o tutorial do admin (frente 3) vai usar

A frente 3 monta o tutorial do `/admin` pelo mesmo padrão do cliente (âncoras por seletor e texto, nunca `data-` novo em cada tela).
Para não quebrar isso, **esta frente não renomeia**: os `href` do menu, o texto dos `h1` e `h2` listados em §6, a classe
`.adm-main`, `#conteudo` e os rótulos de botão que a tabela do §6 cita. Mudança de texto de título entra no MD de execução.

## 5. Auditorias (30/10/2026, antes de mexer)

Varredura estática dos 84 arquivos .tsx de `src/components/admin` e `src/app/(admin)` (regex sobre o código sem comentários) e de `admin.css`:

| Medida | Resultado |
|---|---|
| `window.confirm` / `alert` / `prompt` | 0 |
| `<button>` sem `type` | 0 |
| `<table>` sem `<caption>` | 0 · `<th>` sem `scope` 0 · `<img>` sem `alt` 0 |
| Clique em `div`/`span` | 1 — o fundo da gaveta (`.sb-backdrop`, `aria-hidden`), esperado |
| `style={{}}` inline | **48** (Indicadores 6, BancadaWeb 5, Uso 5, Conversa 4, Contábil 4, PainelEquipe 3, PainelLogistica 3, AbaCadastro 3, …; parte é valor dinâmico de gráfico) |
| Cor hexadecimal literal | 0 no `.tsx` e 0 no `admin.css` (tudo por `--ro-*`) |
| `admin.css`: `prefers-reduced-motion` sim · `:focus-visible` 7 · `44px` 32 · `dvh` **0** · `@media print` **não** | |
| Campos sem nome acessível (heurística) | 2 candidatos — conferidos pelo axe no §6 |

## 6. Medição no navegador (30/10/2026) — ambiente local isolado

`next start` em `127.0.0.1:3105`, `.env.test.local` ignorado pelo Git (banco, Supabase, Mercado Pago, Correios e NFS-e vazios),
store em memória com as 7 contas do seed, nenhuma credencial de produção no ambiente. Sessão: `gabriel.silva@aureacustodia.com.br`
(entra como `dev` pelo bootstrap — todas as permissões). Chrome, 375 / 768 / 1440 px, escuro e claro; as 18 rotas com conteúdo (a 19ª, `/admin/resultados`, só redireciona).

| Medida | Resultado |
|---|---|
| Rolagem horizontal | **0** em todas as 108 combinações (18 rotas × 3 larguras × 2 temas) |
| Erros de console / `pageerror` | **0** |
| Rota que redireciona sem querer | 0 |
| axe 4.10 (WCAG 2.0/2.1/2.2 A e AA) | **3 achados em 3 regras** — ver R1 e R2 abaixo |

**Inventário capturado** (1440 px, escuro; `h1` · `h2` · o que a tela mostra com os dados locais):

| Rota | `h1` | `h2` | Tabelas (colunas × linhas) | Observação |
|---|---|---|---|---|
| `/admin` | Central de trabalho | Tudo em dia · Saúde do painel · Resultados de outubro de 2026 · Operação agora · Ir para | — | 23 links |
| `/admin/saques` | Saques | Pedidos de saque | — | fila vazia |
| `/admin/bancada` | Bancada de análise | — | — | 15 campos; "Atualizar fila" |
| `/admin/logistica` | Logística | Envios para a custódia · Retiradas físicas | — | "Atualizar rastreio agora", "Filtrar envios e retiradas" |
| `/admin/cs` | Atendimento | — | — | **aviso "Ambiente sem banco de dados"** |
| `/admin/usuarios` | Usuários | Contas | 7 × 7 | aviso sem banco |
| `/admin/usuarios/[email]` | Ficha do cliente | Rogério Siqueira | — | "Editar cadastro" |
| `/admin/moedas` | Auditoria de moedas | Integridade da corrente · Acervo | 7 × 87 | "Verificar corrente"; 175 links |
| `/admin/moedas/[codigo]` | Ficha da moeda | RO-000016 · Recibo · Análise de origem · Proveniência · Envio de origem · Retiradas | — | |
| `/admin/moedas/[codigo]/cliente` | Ficha da moeda | REAL OLÍMPICO | — | recibo do cliente, só leitura |
| `/admin/resultados/financeiro` | Financeiro | Receita mês a mês · DRE — exercício de 2026 · Receita por linha | 4 × 19 e 2 × 5 | aviso sem banco; "Conferir o livro-razão" |
| `/admin/resultados/controle` | Controle financeiro | Do faturamento ao resultado · Receitas por tipo · Custos por conta · Custos por setor · Impostos do período · Tarifas do Mercado Pago · Notas fiscais do período · Próximos 30 dias | — | aviso sem banco |
| `/admin/resultados/contabil` | Contábil | — (abas: Lançamentos manuais · Alíquotas · Plano de contas · Exportações e integração) | — | aviso sem banco |
| `/admin/resultados/fiscal` | Notas fiscais (NFS-e) | — | — | "Enviar fila agora" |
| `/admin/resultados/kpis` | Indicadores do negócio | Mercado · Acervo e contas · Envios e análise · Faturas de custódia e planos | 5 × 2, 3 × 9, 3 × 1 | aviso sem banco |
| `/admin/resultados/uso` | Uso da plataforma | — | — | aviso sem banco |
| `/admin/configuracao` | Configuração do site | Taxas e comissões | — | aviso sem banco |
| `/admin/equipe` | Equipe e papéis | Membros do painel | 2 × 1 | aviso sem banco |

**Achados do axe:**
- **R1 — contraste do recibo na rota "ver como o cliente vê"** (`/admin/moedas/[codigo]/cliente`, 4 elementos; o primeiro é `.cert-sub` e, na frente 1,
  os quatro eram `.cert-sub`, `.cert-code`, `.seal-badge` e `.cert-foot`): 4,33:1 e 3,89:1 contra o mínimo de 4,5:1. É a mesma falha que a frente 1 corrigiu em `recibo.css` (PR #13); o admin
  usa o mesmo certificado. `recibo.css` não é desta frente — a correção local fica em `admin.css`, no escopo da rota.
- **R2 — região rolável sem acesso por teclado** (`.table-scroll` do DRE em Financeiro, 3 tabelas em Indicadores, a de Equipe, dependendo da largura):
  tabela que rola de lado não recebe foco, e quem navega por teclado não alcança as colunas escondidas. Há **46** `.table-scroll` no painel, e o
  nome acessível de cada um já existe no `<caption>` da tabela dentro.

**Limites deste ambiente (não são defeitos):** sem Postgres, 9 das 18 rotas medidas abrem com o aviso "Ambiente sem banco de dados" e os dados reais
(ledger, conversas de WhatsApp, usuários da tabela de membros, DRE com valores, fila de NFS-e, trilha de auditoria) não existem. Fica **sem medida**:
a Central de trabalho com itens em "Pede ação agora", a caixa de atendimento com uma conversa aberta, os papéis do banco (só `dev` aqui, então a visão
de `socio` e `operacao` não foi vista), os gráficos com série real e a bancada com câmera. O que se mede aqui é casco, estados vazios e de aviso, formulários e tabelas.

**R1 e R2 corrigidos no bloco 2 (30/10/2026):** axe nas 18 rotas × 3 larguras × 2 temas = 0 violações (ver MD_EXECUCAO).

**R3 e R4 corrigidos no bloco 3 (30/10/2026):** 17 títulos distintos e axe de boa prática (`heading-order`, `landmark-unique`) em 0. Os `h1` e `h2` do §6 não mudaram,
exceto: Bancada passou a ter `h2` (Fila · Caixas do cofre · Entradas sem envio postal) e Notas fiscais passou a ter `h2` (Envio à Sefin Nacional) onde antes havia `h3`.

**R5 (parcial), R7 e R8 tratados no bloco 4 (30/10/2026):** código do recibo sem quebra no acervo, `dvh` no menu e na busca, impressão do painel só com o conteúdo (conferida em PDF A4).
