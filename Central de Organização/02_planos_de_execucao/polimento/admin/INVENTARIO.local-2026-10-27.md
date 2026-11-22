# Inventário do painel administrativo — a lista de verificação do fim

```
Branch:   feat/admin-real-olimpico (base main @ d0398d5)
Feito:    25/10/2026, antes de qualquer edição de tela
Fontes:   src/app/(admin)/README.md, src/server/actions/admin/README.md, src/domain/admin/permissoes.ts (só leitura),
          grep dos call sites em src/components/admin/ e das chamadas a registrarAcaoAdmin em src/server/
Regra:    tudo o que está aqui EXISTE ANTES do redesenho e precisa EXISTIR DEPOIS — mesma permissão na página, mesmo
          botão (ou um equivalente que chame a mesma Server Action), mesma permissão na action, mesmo verbo na trilha.
```

Como ler: **Pág.** = permissão que o Server Component confere antes de carregar dado (sem ela, `<SemPermissao>`).
**Botão** = o que a tela mostra (condição de exibição entre colchetes). **Action** = a Server Action de
`src/server/actions/admin/`; ela confere a própria permissão (coluna **Perm. da action**) e grava o verbo
`admin.<area>.<verbo>` em `aurea.audit_log`. Recusa da action grava `admin.acesso.recusado`.

Coluna **Fim** = marcada no fechamento, depois de clicar no navegador (desktop e 375 px, claro e escuro).

## 0. Casco e porta

| Rota / peça | Pág. | Botão / gesto | Action | Perm. da action | Trilha | Fim |
|---|---|---|---|---|---|---|
| `/painel` | sem sessão → formulário; conta fora da equipe → explicação; membro → `/admin` | Entrar no painel | `login` (`actions/auth.ts`) | — | (login do app) | |
| | | Entrar com Google | `loginWithGoogle` | — | — | |
| | | Sair e entrar com outra conta | `logout` | — | — | |
| | | Entrar no site do cliente / Ir para o site | link `/entrar`, `/` | — | — | |
| `/admin/*` (layout) | `membroDaPagina()`: sem sessão ou fora da equipe → **`/painel`** (RA-48); `AUREA_ADMIN_EMAILS`/seed → `dev` (RA-40) | menu filtrado por `permiteItem` | — | — | registro de uso (`RegistroDeUso`) | |
| Topbar | — | abrir menu (gaveta < 1080 px), Modo escuro, Voltar ao app (`/inicio`), Sair | `useLogout` | — | — | |
| `error.tsx` | — | falha de uma tela sem derrubar o casco | — | — | — | |

## 1. `/admin` — painel inicial

Pág.: qualquer membro. Carrega por permissão: `resultados.ver` (resultados), `bancada.ver|logistica.ver` (operação),
variante `desenvolvimento` (saúde do sistema), `admin.auditoria` (trilha), `saques.ver` (fila de saques no topo).

| Botão | Action | Perm. da action | Trilha | Fim |
|---|---|---|---|---|
| Atalhos para cada área permitida (cartões) | — | — | — | |
| Fila compacta de saques (mesmos botões da §2) [saques.ver; ações com saques.pagar] | ver §2 | `saques.pagar` | `admin.saques.*` | |

## 2. `/admin/saques` (Pág.: `saques.ver`) — também embutida em `/admin`, `/admin/resultados/financeiro` e na aba Financeiro da ficha

| Botão [condição] | Action | Perm. da action | Trilha | Fim |
|---|---|---|---|---|
| Aprovar e enviar Pix [solicitado, `saques.pagar`] — hoje com `window.confirm` | `aprovarSaque` | `saques.pagar` | `admin.saques.aprovar` | |
| Reenviar [falhou, `saques.pagar`] | `aprovarSaque` | `saques.pagar` | `admin.saques.aprovar` | |
| Conferir no Mercado Pago [em processamento] | `conferirSaque` | `saques.pagar` | `admin.saques.conferir` | |
| Marcar como pago → comprovante → confirmar | `marcarSaquePago` | `saques.pagar` | `admin.saques.pagar_manual` | |
| Recusar → motivo → confirmar (devolve o valor TOTAL; ledger `estorno`) | `recusarSaque` | `saques.pagar` | `admin.saques.recusar` | |

## 3. Central de Resultados

### `/admin/resultados` → redireciona para `financeiro`

### `/admin/resultados/financeiro` (Pág.: `resultados.ver`; período na URL `?ano=&mes=&trimestre=`)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Seletor de período (ano, mês, trimestre) | navegação | — | — | |
| Seção de saques [saques.ver] | §2 | | | |
| DRE, receita por linha, cartões, fluxo mês a mês | leitura | — | — | |
| Exportar CSV/XLSX [resultados.exportar] | links `/api/relatorios/*` | (rota confere) | — | |
| Conferir o livro-razão | `verificarLedgerNoPainel` | `resultados.ver` | `admin.resultados.verificar_ledger` | |

### `/admin/resultados/contabil` (Pág.: `resultados.ver`; `?aba=` lançamentos / alíquotas / contas / exportações)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Abas | navegação `?aba=` | — | — | |
| Lançar (data, conta, descrição, valor) | `lancarManualNoPainel` | `contabil.lancar` | `admin.contabil.lancar` | |
| Estornar → motivo → Confirmar estorno / Cancelar | `estornarManualNoPainel` | `contabil.lancar` | `admin.contabil.estornar` | |
| Alíquota: Salvar / Limpar (valores vêm de `parametros_contabeis`) | `definirAliquotaNoPainel` | `contabil.parametros` | `admin.contabil.parametro` | |
| Plano de contas | leitura | — | — | |
| Enviar ao Google Sheets | `enviarAoSheetsNoPainel` | `resultados.exportar` | `admin.resultados.enviar_sheets` | |
| Downloads CSV/XLSX | `/api/relatorios/*` | (rota confere) | — | |

### `/admin/resultados/fiscal` (Pág.: `resultados.ver`; `?status=&busca=`) — NFS-e só exibição/reenvio

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Filtrar (situação, busca) | navegação | — | — | |
| Enviar a fila agora [resultados.nfse] | `enviarFilaDeNotas` | `resultados.nfse` | `admin.fiscal.enviar_fila` | |
| Reprocessar todas as com erro [resultados.nfse] | `reprocessarNotas('todas')` | `resultados.nfse` | `admin.fiscal.reprocessar` | |
| XML (por linha) | `baixarXmlNfse` | `resultados.ver` | — | |
| Reprocessar (por linha) [resultados.nfse] | `reprocessarNotas([id])` | `resultados.nfse` | `admin.fiscal.reprocessar` | |

### `/admin/resultados/kpis` (Pág.: `resultados.ver`) — leitura (indicadores)
### `/admin/resultados/uso` (Pág.: `resultados.ver` OU `admin.auditoria`)

| Peça | Condição | Fim |
|---|---|---|
| Uso (páginas, jornadas, pico) | `resultados.ver` | |
| Trilha de auditoria com filtro `?ator=&acao=` | `admin.auditoria` | |

## 4. Atendimento

### `/admin/cs` (Pág.: `cs.ver`) — polling de 5 s por `atualizarAtendimentoNoPainel` (`cs.ver`, sem trilha)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Filtros da lista (abertas, minhas, etc.) e busca | `atualizarAtendimentoNoPainel` | `cs.ver` | — | |
| Nova conversa → telefone, nome, texto → Iniciar / Cancelar | `iniciarConversaNoPainel` | `cs.responder` | `admin.cs.responder` | |
| Responder (texto) | `responderNoPainel` | `cs.responder` | `admin.cs.responder` | |
| Anexar arquivo → enviar | `enviarMidiaNoPainel` | `cs.responder` | `admin.cs.enviar_midia` | |
| Nota interna | `anotarConversaNoPainel` | `cs.responder` | `admin.cs.anotar` | |
| Situação (select) | `mudarSituacaoDaConversaNoPainel` | `cs.responder` | `admin.cs.situacao` | |
| Responsável (select) | `atribuirConversaNoPainel` | `cs.responder` | `admin.cs.atribuir` | |
| Etiqueta (marcar/desmarcar) / Nova etiqueta | `etiquetarConversaNoPainel` / `criarEtiquetaNoPainel` | `cs.responder` | `admin.cs.etiquetar` / `admin.cs.criar_etiqueta` | |
| Ficha: vincular conta / desvincular | `atualizarContatoNoPainel` | `cs.responder` | `admin.cs.contato` | |
| Conferir canal (WhatsApp) [cs.canais] | `conferirCanalNoPainel` | `cs.canais` | `admin.cs.conferir_canal` | |

### `/admin/usuarios` (Pág.: `usuarios.ver`; filtro na URL)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Filtro de usuários (busca, situação) | navegação | — | — | |
| Criar conta [usuarios.criar] | `criarUsuarioNoPainel` | `usuarios.criar` | `admin.usuarios.criar` | |
| Linha → ficha | link | — | — | |

### `/admin/usuarios/[email]` (Pág.: `usuarios.ver`; `?aba=` cadastro, financeiro, acervo, mercado, logística, atividade, notas)

| Botão [condição] | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Ajustar saldo (crédito/débito, motivo) [usuarios.editar] — lançamento `ajuste` do ledger | `ajustarSaldoNoPainel` | `usuarios.editar` | `admin.usuarios.ajustar_saldo` | |
| Marcar / desmarcar inadimplência (motivo) | `marcarInadimplenciaNoPainel` | `usuarios.editar` | `admin.usuarios.marcar_inadimplente` / `desmarcar_inadimplente` | |
| Desativar / reativar conta (motivo) — Supabase Auth | `mudarSituacaoDaContaNoPainel` | `usuarios.editar` | `admin.usuarios.desativar` / `ativar` | |
| Enviar link de redefinição / Reenviar | `redefinirSenhaNoPainel('link')` / `reenviarRedefinicaoSenhaNoPainel` | `usuarios.editar` | `admin.usuarios.redefinir_senha` / `admin.email.reenviar` | |
| Senha provisória | `redefinirSenhaNoPainel('provisoria')` | `usuarios.editar` | `admin.usuarios.redefinir_senha` | |
| Reenviar aviso de reserva | `reenviarAvisoDeReservaNoPainel` | `usuarios.editar` | `admin.email.reenviar` | |
| Aba Cadastro: Editar / Salvar cadastro | `editarCadastroNoPainel` | `usuarios.editar` | `admin.usuarios.editar_cadastro` | |
| Aba Cadastro: Dados bancários [usuarios.dados_bancarios] Editar/Salvar/Cancelar | `editarDadosBancariosNoPainel` | `usuarios.editar` **e** `usuarios.dados_bancarios` | `admin.usuarios.editar_dados_bancarios` | |
| Aba Financeiro: Quitar fatura com saldo | `quitarFaturaComSaldoNoPainel` | `usuarios.editar` | `admin.usuarios.quitar_fatura` | |
| Aba Financeiro: saques da conta [saques.ver] | §2 | `saques.pagar` | `admin.saques.*` | |
| Aba Financeiro: plano — Cancelar [registros.editar] / Excluir [registros.excluir] | `cancelarPlanoCustodia` / `excluirPlanoCustodia` | `registros.editar` / `registros.excluir` | `admin.registros.cancelar_plano` / `excluir_plano` | |
| Aba Acervo: Cadastro direto [acervo.cadastro_direto] / sem envio [acervo.cadastro_sem_envio] | `cadastrarMoedaDiretaNoPainel` / `cadastrarMoedaSemEnvioNoPainel` | idem | `admin.acervo.cadastro_direto` / `cadastro_sem_envio` | |
| Aba Mercado: anúncio Editar preço / Excluir | `editarLoteDeVenda` / `excluirLoteDeVenda` | `registros.editar` / `registros.excluir` | `admin.registros.editar_lote_venda` / `excluir_lote_venda` | |
| Aba Mercado: ordem de compra Excluir | `excluirOrdemDeCompra` | `registros.excluir` | `admin.registros.excluir_ordem_compra` | |
| Aba Logística: envio Editar quantidade / Excluir | `editarEnvio` / `excluirEnvio` | `registros.editar` / `registros.excluir` | `admin.registros.editar_envio` / `excluir_envio` | |
| Aba Atividade | leitura | — | — | |
| Aba Notas: Anotar | `anotarUsuarioNoPainel` | `usuarios.editar` | `admin.usuarios.anotar` | |

## 5. Operação

### `/admin/bancada` (Pág.: `bancada.ver`; analisar com `bancada.analisar`)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Atualizar fila | `atualizarBancadaNoPainel` | `bancada.ver` | — | |
| Escolher envio da fila (abre a análise) | `abrirAnaliseNoPainel` | `bancada.analisar` | `admin.bancada.abrir` | |
| Câmera: Gravar / Parar → sobe o vídeo | `assinarVideoNoPainel` | `bancada.analisar` | `admin.bancada.assinar_video` | |
| Veredito por moeda (aceita/recusa…), campos | estado local | — | — | |
| Fechar análise (mesmo serviço da estação, `src/server/estacao/analise.ts`) | `fecharAnaliseNoPainel` | `bancada.analisar` | `admin.bancada.analisar` (`origem: bancada_web`) | |
| Quadro de caixas: Nova caixa / Editar / Salvar | `salvarCaixaNoPainel` | `bancada.analisar` | `admin.bancada.caixa` | |
| Cadastro direto de moeda [acervo.cadastro_direto] | `cadastrarMoedaDiretaNoPainel` | `acervo.cadastro_direto` | `admin.acervo.cadastro_direto` | |
| Cadastro sem envio [acervo.cadastro_sem_envio] | `cadastrarMoedaSemEnvioNoPainel` | `acervo.cadastro_sem_envio` | `admin.acervo.cadastro_sem_envio` | |

### `/admin/moedas` (Pág.: `bancada.auditoria`; filtro na URL)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Filtro do acervo | navegação | — | — | |
| Verificar a corrente | `verificarCorrenteNoPainel` | `bancada.auditoria` | `admin.moedas.verificar` | |
| Linha → ficha da moeda | link | — | — | |

### `/admin/moedas/[codigo]` (Pág.: `bancada.auditoria`)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Ver vídeo da análise | `urlDoVideoNoPainel` | `bancada.auditoria` | `admin.moedas.ver_video` | |
| Recibo, quinze campos, caixa, etiqueta [logistica.etiquetas] | leitura / links | — | — | |

### `/admin/logistica` (Pág.: `logistica.ver`; etiquetas `logistica.etiquetas`; expedir `logistica.expedir`)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Abas / filtros de envios e retiradas | navegação | — | — | |
| Envio: Editar quantidade / Excluir | `editarEnvio` / `excluirEnvio` | `registros.editar` / `registros.excluir` | `admin.registros.*` | |
| Etiquetas de envio (reimpressão) [logistica.etiquetas] | link | — | — | |
| Retirada: Emitir etiqueta nos Correios [logistica.expedir] | `emitirEtiquetaRetirada` | `logistica.expedir` | `admin.logistica.emitir_etiqueta` | |
| Retirada: Cancelar etiqueta (hoje com `window.confirm`) | `cancelarEtiquetaRetirada` | `logistica.expedir` | `admin.logistica.cancelar_etiqueta` | |
| Retirada: Postada no balcão (código) | `marcarRetiradaPostadaManual` | `logistica.expedir` | `admin.logistica.postar_manual` | |

## 6. Sistema

### `/admin/configuracao` (Pág.: `config.ver`) — campos, validações, `config_historico` e publicação de versão NÃO mudam

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Taxas: Salvar / Desfazer (com simulação) | `salvarConfiguracaoNoPainel('taxas')` | `config.taxas` | `admin.config.taxas` | |
| Publicar Tabela de Taxas | `publicarDocumentoNoPainel('tabela_de_taxas')` | `config.taxas` | `admin.config.publicar_documento` | |
| Operacional: Salvar / Desfazer | `salvarConfiguracaoNoPainel('operacional')` | `config.taxas` | `admin.config.operacional` | |
| Termos: Salvar / Desfazer; Publicar Termos | `salvarConfiguracaoNoPainel('termos')` / `publicarDocumentoNoPainel('termos_de_uso')` | `config.taxas` | `admin.config.termos` / `publicar_documento` | |
| Canais (SAC): Salvar / Desfazer | `salvarConfiguracaoNoPainel('sac')` | `config.taxas` | `admin.config.sac` | |
| Catálogo: Novo tipo / Editar / Salvar | `salvarTipoDeMoedaNoPainel` | `config.catalogo` | `admin.config.catalogo` | |
| Integrações, histórico | leitura | — | — | |

### `/admin/equipe` (Pág.: `admin.membros` OU `admin.papeis`)

| Botão | Action | Perm. | Trilha | Fim |
|---|---|---|---|---|
| Adicionar membro (e-mail, nome, papel) — manda o e-mail | `adicionarMembroNoPainel` | `admin.membros` | `admin.membros.adicionar` | |
| Trocar papel / ativar / desativar membro | `alterarMembroNoPainel` | `admin.membros` | `admin.membros.alterar` | |
| Reenviar convite | `reenviarConviteDeEquipeNoPainel` | `admin.membros` | `admin.email.reenviar` | |
| Novo papel (slug, nome, rank, variante, permissões) | `criarPapelNoPainel` | `admin.papeis` | `admin.papeis.criar` | |
| Salvar papel | `alterarPapelNoPainel` | `admin.papeis` | `admin.papeis.alterar` | |
| Excluir papel | `excluirPapelNoPainel` | `admin.papeis` | `admin.papeis.excluir` | |

## 7. Auditorias de ferramentas — antes

Adaptadas de `aprendizado_frontend/ferramentas/` às classes deste painel (`.btn-gold` = primário, `.audit-table` em
`.table-scroll`): cópias em [`auditoria/`](auditoria/). Rodadas sobre `src/app/(admin)`, `src/app/painel` e
`src/components/admin` (70 arquivos).

| Medida | Antes | Depois |
|---|---|---|
| Tabelas (`<table>`) | 44 | 44 (nenhuma removida) |
| Tabelas com 7+ colunas | 13 | 13 (colunas mantidas; 1ª coluna fixa resolve a leitura) |
| Tabelas com 1ª coluna fixa | **0** | **44** (uma regra em `admin.css`) |
| Tabelas com nome acessível (`<caption>`/`aria-label`) | **0** | **44** |
| Tabelas sem `scope` em `<th>` | 44 | 2 (tabelas de pares sem cabeçalho: últimas ações, análise de origem) |
| Células com 3+ ações | 2 | 2 (fila de saques e estorno contábil; as ações aparecem por situação, nunca as cinco juntas) |
| Arquivos com mais de um primário (`btn-gold`) | 9 | 9 por grep — os restantes são estados exclusivos (antes/depois da confirmação) ou blocos distintos; "Filtrar" ×4 e "Conferir" deixaram de ser primários |
| Campos sensíveis sem `autoComplete`/`inputMode` | 14 | 4 (falsos positivos do grep: o atributo vem depois de um `=>`) |
| `window.confirm` (confirmação sem o objeto no botão) | 2 (aprovar saque, cancelar etiqueta) | **0** |
| `style={{…}}` inline | 72 | 52 |
| Arquivos `'use client'` | 32 | 35 (+ busca, confirmação, faixa da Gestão; `loading.tsx` e `resultados/layout.tsx` sem) |
| `aria-label` | 22 | 32 |

Saída completa: `auditoria/botoes-antes.txt`, `auditoria/tabelas-antes.txt`, `auditoria/botoes-depois.txt` e `auditoria/tabelas-depois.txt`.

## 8. Fechamento (25/10/2026)

Servidor de teste **sem banco e sem integrações** (ver MD_EXECUCAO, S1), em `http://127.0.0.1:3105`, papel `dev` pela
lista do ambiente. A memória começa vazia (0 contas), então **ações que dependem de uma linha** (aprovar/pagar/recusar
um saque, emitir/cancelar etiqueta, excluir/editar registro, estornar lançamento, quitar fatura) não tinham linha para
clicar: para elas valem (a) a leitura do código — cada botão chama a mesma Server Action com os mesmos argumentos, só
passou por `ConfirmarAcao` — e (b) os testes `acoes.test.ts`, `saques.test.ts` e `logistica.test.ts` verdes.

| Verificação | Resultado |
|---|---|
| 21 rotas (`/admin`, saques, bancada, logística, cs, usuários, ficha, moedas, ficha da moeda, resultados/*, configuração em 4 abas, equipe) | 200, título certo, nenhuma `SemPermissao` com o papel dev |
| Conta fora da equipe em `/admin`, `/saques`, `/usuarios`, `/configuracao`, `/equipe`, `/resultados/financeiro` | redireciona para **`/painel`** (RA-48) |
| Sem sessão em `/admin/bancada` | **`/painel`** |
| Ação recusada por permissão | coberta por `acoes.test.ts` (51 testes; recusa não chama o serviço) — sem banco não há papéis para montar um membro restrito no navegador |
| Clicados no navegador | Central de trabalho; menu (desktop e gaveta 375 px); menu da conta (tema, voltar, sair visível); busca Ctrl+K com Enter (área e lista filtrada); faixa da Gestão levando `?ano=&mes=`; Notas fiscais: "Enviar fila agora" → confirmação → toast do servidor; Financeiro: "Conferir o livro-razão" → toast; Contábil: "Lançar" → toast; Auditoria de moedas: "Verificar corrente" → resultado; Usuários: "Criar conta" → validação do servidor; filtros e gaveta "Filtros (N)" a 375 px; tema claro e escuro |
| Tabela larga a 375 px | 1ª coluna fica parada ao rolar de lado (conferido com tabela de 8 colunas injetada, porque a memória não tem linhas) |
| Rolagem lateral da página a 375 px | nenhuma (`scrollWidth = 375`) |
| Console | sem erro |
| `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` | verdes (lint: 0 erro; os avisos restantes são de arquivos fora desta frente; testes: 1383 passaram, 1 pulado) |

## 9. Rodada 2 (25/10/2026) — o que mudou de LUGAR (nada saiu)

| Antes | Agora | Mesma action / mesma permissão |
|---|---|---|
| Financeiro abria com a fila de saques inteira (pendentes + 5 resolvidos) | Fila **compacta** no Financeiro só quando há pedido esperando; os resolvidos estão em `/admin/saques?ver=resolvidos` | sim (`saques.*`) |
| `/admin/saques`: uma tabela com tudo | Abas `?ver=esperando` · `mercadopago` · `resolvidos`, com contagem | sim |
| Logística: "Ver" (envios/retiradas) dentro do filtro | Abas acima do filtro, mesmo parâmetro `?ver=`; o filtro leva a aba atual | sim |
| Notas fiscais: filtro de situação em botões | Abas com a contagem de cada situação; mesmo `?status=` | sim (`resultados.nfse` nos botões de envio) |
| Equipe: membros e papéis na mesma página | Abas `?aba=membros` · `papeis` (quem só tem `admin.papeis` abre direto em papéis; as duas continuam acessíveis) | sim (`admin.membros`, `admin.papeis`) |
| Configuração: abas em cima | Coluna de seções à esquerda (≥1080 px); mesmo `?aba=` | sim |
| Ficha da moeda: botão "Auditoria" no topo | Migalha "Auditoria de moedas" na topbar; "Ver como o cliente vê" no cabeçalho do Recibo; "Ver vídeo" no cabeçalho da Análise | sim (`bancada.auditoria`) |
| Central: "Áreas do painel" em cartões no meio | "Ir para" no fim da página, em grade | — (navegação) |
| Ficha do cliente: cabeçalho com nome + selos e cartões | Cartão de identidade + indicadores que levam à aba certa | — (leitura) |
| Usuários: "Criar conta" acima do painel | Dentro da seção "Contas", como bloco "+ Criar conta de cliente" | sim (`usuarios.criar`) |

Auditorias da rodada 2: `auditoria/botoes-rodada2.txt` e `auditoria/tabelas-rodada2.txt` — 44/44 tabelas com 1ª coluna
fixa e legenda, **0 sem `scope`** (as duas tabelas de pares ganharam cabeçalho), `style={{}}` 52 → 46, `aria-label` 32 → 39,
`window.confirm` 0.
