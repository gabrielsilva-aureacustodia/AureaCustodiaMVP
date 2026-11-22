# Benchmark — painéis administrativos de finanças, trading, contabilidade, marketplace, leilão e acervo

```
Branch:    feat/admin-real-olimpico          Data: 25/10/2026
Coleta:    VM do Colab, sessão ro-admin (toolkits/pesquisa-na-vm/vm.sh), 18 alvos × 2 larguras (1440 e 375 px),
           capturas e auditoria em JSON no scratchpad da sessão (mídia de terceiro: fora do Git). Reserva: navegador
           embutido (Refine logado em demo aberta; Shopify Polaris redirecionou). VM desligada no fim.
Marcas:    [OBSERVADO] visto na captura ou no navegador nesta sessão · [LIDO] lido em texto público nesta sessão ·
           [CONHECIMENTO] padrão público conhecido do produto, não reconferido hoje · [INFERÊNCIA] conclusão nossa
```

## 1. O que foi possível ver

| Alvo | Resultado da VM | Observação |
|---|---|---|
| Stripe Docs — Dashboard e Payouts | 200 | Documentação do Dashboard: "Pesquisar no Dashboard", "Dashboard móvel", "Processamento em lote", "Fluxos de trabalho" no menu [OBSERVADO]; atalho `/` na busca da documentação [OBSERVADO] |
| Mercado Pago — relatórios (dev) | 404 | URL de relatórios mudou; ficou o conhecimento do painel de Pix e saques [CONHECIMENTO] |
| Shopify Polaris (IndexTable, resource index) | conexão fechada na VM; no navegador redireciona para shopify.dev/docs/api/polaris | Padrões do Shopify Admin por [CONHECIMENTO] |
| Conta Azul | 200 | Vitrine com "Reduza a inadimplência", "Conciliação Bancária", "Cobranças Automáticas", NFS-e [OBSERVADO] |
| QuickBooks | erro HTTP/2 na VM | [CONHECIMENTO] |
| Xero | 200 | "Reconcile bank transactions", "Run financial reports" como as duas tarefas da home [OBSERVADO] |
| Linear (features) | 200 | Página de produto; padrões de Cmd+K, filtros e visões por [CONHECIMENTO] |
| Refine (demo Finefoods) | 200, **sem login** | Dashboard com cartões + gráfico + linha do tempo de pedidos com selo de situação (ícone + cor + texto); lista de pedidos com **filtros na URL** (`?filters[0][field]=…&currentPage=1`), filtro por coluna no cabeçalho, ações da linha num menu "⋮", "Export" no topo, busca no cabeçalho com atalho `/` [OBSERVADO] |
| React Admin (demo Posters Galore) | 200, tela de login com "demo / demo" | **Não entramos**: digitar senha em site de terceiro fica fora do que este agente faz, mesmo em demo. Padrões por [CONHECIMENTO] |
| Retool (use case admin panel) | 200 | Vitrine; padrões de tabela com ações em lote por [CONHECIMENTO] |
| Intercom Inbox / Zendesk Agent Workspace | 200 | Zendesk: "Route customers to the right agent", "real-time monitoring" [OBSERVADO]; inbox em 3 colunas por [CONHECIMENTO] |
| Heritage Auctions (consignação) / Catawiki (vender) | **403 na VM** (bloqueio do IP do Colab) | Portais de consignação por [CONHECIMENTO] |
| CollectiveAccess (site e demo) | 200; demo pede "demo / demo" | Não entramos (mesmo motivo do React Admin). Registro de acervo por [CONHECIMENTO] |

## 2. Por tema

### 2.1 Navegação agrupada por tarefa
- **Stripe Dashboard**: menu por trabalho (Pagamentos, Saldos, Clientes, Produtos) e não por time; "Início" mostra o que
  pede atenção (disputas, pagamentos com falha) antes dos gráficos [CONHECIMENTO].
- **Shopify Admin**: Pedidos, Produtos, Clientes, Conteúdo, Finanças, Análises — o operacional em cima, a análise
  depois, as configurações isoladas no rodapé do menu [CONHECIMENTO].
- **Linear**: Caixa de entrada / Minhas tarefas em cima; times e visões abaixo; configurações fora do menu principal
  [CONHECIMENTO].
- **K2CON (B4b)**: menu da administração em 7 grupos; "Pede ação agora" × "Em dia" no painel [LIDO].
- **Real Olímpico antes**: grupos pela etapa em que cada tela nasceu (Central de Resultados, Atendimento, Operação,
  Sistema); **Saques**, fila de dinheiro de cliente parado, morava entre relatórios contábeis [OBSERVADO no código].

### 2.2 Densidade e tabela larga
- Refine e Shopify: linha alta só quando há miniatura; colunas numéricas à direita; selo de situação com ícone
  [OBSERVADO/CONHECIMENTO].
- Doc 35 §5 e tópico 35 passo 4b do `aprendizado_frontend`: **1ª coluna sticky** com fundo opaco e hover que acompanha;
  `th scope`; coluna secundária em "Mais detalhes" no celular [LIDO].
- Real Olímpico antes: **44 tabelas, nenhuma com 1ª coluna fixa nem nome acessível; 13 com 7+ colunas** [MEDIDO,
  `auditoria/tabelas.py`].

### 2.3 Filtros e busca
- Refine: filtro no cabeçalho de cada coluna e estado inteiro na URL [OBSERVADO].
- Shopify: barra de filtros com **chips do filtro aplicado** removíveis e "visões salvas" [CONHECIMENTO].
- Linear, Stripe, Refine: **busca global com atalho** (Cmd/Ctrl+K ou `/`) que também navega [OBSERVADO no Refine e na
  documentação da Stripe; CONHECIMENTO no Linear].
- Real Olímpico antes: filtros já na URL em usuários, moedas, logística, fiscal e uso; **nenhuma busca global**.

### 2.4 Ações em lote
- Shopify IndexTable e Retool: seleção por linha + barra de ações em lote [CONHECIMENTO].
- Real Olímpico: não há Server Action que aceite lista (exceto `reprocessarNotas('todas' | ids)`). Lote de saque,
  etiqueta ou exclusão exigiria action nova → **PROPOSTAS_BACKEND.md**, não aplicado.

### 2.5 Fila de trabalho
- Zendesk/Intercom: visões "Sem dono", "Minhas", "Todas"; contagem por visão; roteamento [OBSERVADO/CONHECIMENTO].
- Heritage/Catawiki (consignação): o consignante e o especialista veem **etapas** (recebido → avaliado → fotografado →
  em leilão → pago) [CONHECIMENTO]. É o mesmo desenho do envio → bancada → acervo daqui.
- Stripe "Início": lista curta do que pede ação, cada item com o botão do próximo passo [CONHECIMENTO].

### 2.6 Confirmação de ação sensível
- Stripe: reembolso e pagamento pedem confirmação que repete **valor e destinatário** no texto do botão/diálogo
  ("Reembolsar R$ X") [CONHECIMENTO].
- GitHub/Linear: exclusão irreversível em "zona de perigo", às vezes exigindo digitar o nome [CONHECIMENTO].
- Doc 35 §6: "Confirmar: fechar o pedido 123" — objeto no nome acessível, porque "Confirmar" ×11 na mesma tela é
  indistinguível para leitor de tela [LIDO].
- Real Olímpico antes: `window.confirm` em **aprovar saque** e **cancelar etiqueta**; "Confirmar exclusão" genérico;
  "Confirmar pagamento" sem valor nem cliente [MEDIDO].

### 2.7 Trilha de auditoria visível
- Stripe: cada objeto tem a linha do tempo de eventos ("Logs", "Eventos") na própria ficha [CONHECIMENTO].
- CollectiveAccess: histórico de alterações por registro de acervo; proveniência como campo de primeira classe
  [CONHECIMENTO].
- Real Olímpico: trilha em `/admin/resultados/uso` (admin.auditoria) e "Últimas ações" no início para dev; a ficha do
  usuário tem a aba Atividade. Ficha da moeda já mostra recibo, hash e análise.

### 2.8 Gráficos de resultado
- Xero/Conta Azul/QuickBooks: fluxo de caixa e DRE como primeira tela financeira; período no topo [OBSERVADO na vitrine
  Xero/Conta Azul].
- Refine: cartão com número + tendência + gráfico pequeno [OBSERVADO].
- Real Olímpico: Financeiro já tem DRE, receita por linha e fluxo mês a mês com seletor de período na URL; mantido.

### 2.9 Celular
- Shopify Admin e Stripe têm app próprio; o painel web no celular vira lista de cartões [CONHECIMENTO].
- Refine a 375 px: menu vira gaveta, tabela rola de lado [OBSERVADO na captura 375].
- Real Olímpico antes: gaveta herdada do app (bom); topbar com 6 peças quebrando em várias linhas; tabelas rolando sem
  referência da linha.

## 3. Comparação explícita com os métodos do repositório de frontend

| Método (`aprendizado_frontend`) | O que diz | Como estava aqui | Decisão |
|---|---|---|---|
| Tópico 35 passo 1 — um primário por bloco | Repetidos por linha são secundários | 9 arquivos com mais de um `btn-gold` (ex.: "Conferir" dourado em toda linha da fila de saques) | D7 |
| Tópico 35 passo 2 — filtro na URL, "Limpar filtros", contagem junto | — | URL sim; contagem em parte das telas | Mantido; contagem e vazio por motivo onde faltava (D9) |
| Tópico 35 passo 4 — página longa: "Nesta página", `scroll-margin-top`, alvo 44 px | — | Configuração com 5 grupos sem índice | D10 |
| Tópico 35 passo 4b — `th scope`, 1ª coluna = cabeçalho, vazio por motivo, selo cor+ícone+texto | — | 0 de 44 tabelas com `scope` | D4 |
| Doc 35 §4 — componente só de marcação sem `"use client"` | — | `Blocos`, `navegacao`, `PainelInicial`, `SecaoDeSaques` já sem; `loading.tsx` novo sem | D5 |
| Doc 35 §5 — 1ª coluna sticky, fundo opaco, hover junto | — | Nenhuma | D4 |
| Doc 35 §6 — nome acessível único por destino ("Confirmar: …") | — | "Confirmar pagamento" ×N, "Excluir" ×N, "Editar" ×N | D3 |
| Tópico 29 — QA final (axe, 375 px, teclado, reduced motion) | — | `responsive.css` já zera animação | Seguido no fechamento |
| Toolkit direção de design — hierarquia, ênfase, ponto focal | Um ponto focal por tela | Início abria com saudação em painel grande | D2 |
| K2CON B4b — menu agrupado, migalhas, legenda nas tabelas, "Pede ação agora × Em dia", confirmação estreita em célula | — | Nada disso | D1, D2, D3, D6 |
| Ferramentas `auditoria-botoes-campos.py` / `auditoria-tabelas-largas.py` | Medir antes e depois | Adaptadas às classes daqui (`auditoria/`) | Números em INVENTARIO §7 |

## 4. Decisões (cada uma com a referência)

| # | Decisão | Referência |
|---|---|---|
| D1 | **Menu em três grupos por tarefa**: Operação do dia (Saques, Bancada, Logística, Atendimento, Usuários, Auditoria de moedas), Gestão (Financeiro, Contábil, Notas fiscais, Indicadores, Uso e auditoria), Configuração (Configuração do site, Equipe e papéis). Rótulos únicos (o grupo "Configuração" e o item "Configuração do site" não colidem). URLs iguais; o menu continua escondendo pelo papel. | Stripe, Shopify, Linear (§2.1); K2CON B4b |
| D2 | **`/admin` vira Central de trabalho**: "Pede ação agora" com número, frase do que significa e o botão do próximo passo (lista já filtrada); o que está zerado vira chip "Em dia". Só alertas que a página já calculava. As seções antigas (resultados, operação, saúde, áreas) continuam, na ordem da variante do papel. | Stripe Início, Zendesk visões (§2.5); K2CON B4b; tópico 35 4b (próximo passo) |
| D3 | **Confirmação com o objeto no nome**, sem `window.confirm`: "Confirmar: pagar o saque de R$ X a Fulano", "Confirmar: recusar o saque de R$ X de Fulano e devolver R$ Y ao saldo", "Confirmar: excluir o envio RO-ENV-…". Confirmação estreita no próprio lugar (linha da tabela), destrutiva em vermelho. | Stripe (§2.6); doc 35 §6; K2CON B4b |
| D4 | **Toda tabela com 1ª coluna fixa** (uma regra em `admin.css` cobre as 44), `th scope="col"`, legenda escondida (`caption`) para leitor de tela. | Doc 35 §5; tópico 35 4b; Refine/Shopify (§2.2) |
| D5 | **Estado "carregando"** para todas as telas por um `loading.tsx` sem `"use client"`; vazio por motivo nas listas. | Doc 35 §4; tópico 35 4b |
| D6 | **Busca global Ctrl+K e `/`**: vai para qualquer área do papel e abre as listas que já aceitam `?busca=` (contas, acervo, logística, notas). Só navegação: quem filtra é a página no servidor. | Linear, Stripe, Refine (§2.3) |
| D7 | **Um primário por bloco**: na fila de saques, "Conferir" e ações repetidas viram secundárias; primário só no "Aprovar e enviar Pix". | Tópico 35 passo 1 |
| D8 | **Topbar enxuta**: título + migalha (nas fichas `Usuários › e-mail` e `Moedas › código`), busca e o chip da conta, que abre tema, "Voltar ao app" e "Sair do painel". Pular para o conteúdo. | K2CON B4b (topo enxuto, migalhas); tópico 35 passo 4 |
| D9 | **Subnavegação da Gestão** (Financeiro · Contábil · Notas fiscais · Indicadores · Uso) no topo de cada tela de resultados, para comparar sem voltar ao menu. | Stripe/Xero relatórios (§2.8) |
| D10 | **"Nesta página"** na configuração e na ficha do usuário, com âncoras. | Tópico 35 passo 4 |
| D11 | **Zona de perigo** na ficha do usuário (desativar conta, senha) separada do ajuste do dia a dia. | GitHub/Linear (§2.6); tópico 35 passo 1 |
| D12 | **Não aplicado (vai para PROPOSTAS_BACKEND.md)**: ações em lote, visões salvas, contadores no menu, trilha por registro na ficha da moeda, roteamento automático do CS — todos pedem Server Action ou consulta nova. | §2.4, §2.5, §2.7 |

## 5. Rodada 2 (25/10/2026) — remodelagem com liberdade de disposição

Régua: [BRIEF_DE_DESIGN.md](BRIEF_DE_DESIGN.md) (modelo `toolkits/direcao-de-design`). Peças por papel conforme a
`taxonomia-de-componentes.md` (componente → padrão → bloco → página).

| # | Decisão | Referência |
|---|---|---|
| D13 | **Peças comuns** em `Pecas.tsx` (Secao com h2 + contexto + ações, Indicador que vira link, Selo cor+símbolo+texto, Abas por URL com contagem, Vazio), todas sem `"use client"`. O `<Cartao>` antigo ganha o mesmo desenho por CSS. | taxonomia de componentes; doc 35 §4; Carbon (selo) |
| D14 | **Hierarquia de título**: h1 na topbar, h2 nas seções (antes h3 logo abaixo do h1). | conceito 14 (hierarquia); doc 34 §4 achado 3 |
| D15 | **Duas zonas** a partir de 1280 px (trabalho à esquerda, contexto à direita) na Central, Financeiro, ficha do cliente e ficha da moeda; tabela de 7+ colunas sempre na largura toda. | Stripe (detalhe de pagamento), Shopify (pedido), conceito 15 (grade) |
| D16 | **Número que pede ação é link** para a lista filtrada que o explica (Central, Logística, Usuários, ficha). | Stripe Início, Refine (cartões) |
| D17 | **Abas por situação/tipo** em vez de filtro escondido ou página longa: Saques (esperando × Mercado Pago × resolvidos), Logística (tudo × envios × retiradas), Notas fiscais (por situação, com contagem), Equipe (membros × papéis). Mesmos parâmetros de URL. | Zendesk/Intercom (visões), Shopify (abas de índice) |
| D18 | **Configuração no desenho de ajustes**: seções numa coluna à esquerda no computador. | Stripe/Linear Settings |
| D19 | **Ficha da moeda como registro de acervo**: cartão de identidade e **linha do tempo de proveniência** montada com os dados já carregados. | CollectiveAccess, Heritage (consignação) |
| D20 | **Gráfico de receita mês a mês** no Financeiro: uma série, colunas finas, rótulo só no maior e no último, dica no hover e no foco, tabela logo abaixo; ouro mais fechado no tema claro (contraste validado pelo script da skill dataviz). | skill dataviz; Xero/Conta Azul (fluxo como 1ª tela financeira) |
| D21 | **Menos movimento e sombra dentro do painel** (cartão e botão não "pulam" no hover). | brief §6 (movimento só de estado); conceito 09 |
| D22 | **Celular**: indicadores em 2 colunas, abas numa linha rolando de lado, cartão de identidade empilhado, padding menor. | tópico 35 passo 4; K2CON B4b |

## 6. Rodada 3 (25/10/2026) — o painel com a marca da Frente 1

Base: `feat/brandbook-real-olimpico`, mesclada localmente (merge `065b327`, sem push). Régua: o brandbook (§9
componentes, registro "cofre, denso" para o admin) e a skill `revisao-de-design` do `aprendizado_frontend`.

| # | Decisão | Referência |
|---|---|---|
| D23 | **Tokens da marca no lugar dos do painel**: `admin.css` passou a ler `--ro-*` (cor, raio, tipo, duração, curva); os consertos manuais de tema claro saíram, porque o par claro/escuro já vem resolvido do contrato. | brandbook §3–§6 |
| D24 | **Componentes da marca por baixo das peças do painel**: `Selo` → `<Selo>`, `Vazio` → `<EstadoVazio>`, carregando → `<Esqueleto>`, avisos de ambiente → `<Aviso>`, menu → `<LogoEmblema>`. As telas não mudaram de API. | brandbook §9.4, §9.6, §9.8 |
| D25 | **Ação irreversível em vermelho, cancelar como fantasma**: `ConfirmarAcao perigo` usa `.btn-danger` no gatilho e na confirmação; Recusar saque, Excluir registro e Estornar lançamento também. Ações de perigo marcadas: 4 → 12. | brandbook §9.1; conceito 08 (ênfase) |
| D26 | **Tabela, abas e indicador no desenho da marca**: `.audit-table` com o desenho de `.ro-tabela`, abas como segmento `.ro-abas`, indicador com `container-type` e valor em `clamp()` para caber em coluna estreita. | brandbook §9.3, §9.5 |
| D27 | **Fila de saques vira cartões no celular** (≤ 560 px): cada linha um cartão, cada célula com o seu rótulo (`data-rotulo`), ações em largura cheia. Só CSS, a mesma tabela. | K2CON B4b (TabelaDados) |
| D28 | **Hierarquia sem salto** (revisão de design): Configuração, Equipe e Logística iam do h1 ao h3; o título de painel virou h2 e o h4 interno virou h3, com o desenho de antes. | conceito 14; skill revisao-de-design passo 4.2 |

