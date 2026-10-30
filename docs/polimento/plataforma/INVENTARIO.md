# Inventário da plataforma do cliente — lista de verificação do fim

```
Frente:   4 — Plataforma do cliente (feat/plataforma-real-olimpico)
Base:     main @ d0398d5
Feito em: 25/10/2026, antes do redesenho (sessão 1)
Uso:      no fechamento, cada linha é conferida no navegador (desktop e 375px, claro e escuro).
          Coluna ✔ preenchida na verificação final.
```

## 0. O que toda rota de `(app)` recebe do servidor

`src/app/(app)/layout.tsx` (Server Component) — **nenhuma tela busca nada além disto, salvo onde a tabela diz**:

| Busca | Origem | Para quê |
|---|---|---|
| `getSessionEmail()` | `@/server/session` | sem sessão → `/entrar` |
| `getState()` | `@/server/state` | `AppState` inteiro no `AppProvider` (re-sincroniza por `/api/state` a cada 10 s) |
| `barrarContaDesativada()` | `@/server/auth/conta-desativada` | conta desativada → `/entrar/sair` |
| `podeAbrirPainelAdmin()` | `@/server/admin/acesso` | liga o item "Administração" do menu |
| `carregarConfiguracaoDoSite()` + `configDoCliente()` | `@/server/config/carregar` | taxas, catálogo, `depositoMax` |
| `documentosPendentesDeAceite()` | `@/server/config/documentos` | faixa "versão nova dos termos" na topbar |

Montados no layout: `AppProvider`, `TutorialProvider`, `SidebarProvider`, `Sidebar`, `Topbar`, `ModalHost`, `RegistroDeUso`.

## 1. Casco (todas as rotas)

| Elemento | Ação / destino | ✔ |
|---|---|---|
| Menu: Início, Mercado, Compras, Vendas, Envios, Recibos, Minha conta (+ Administração se equipe) | `next/link` | |
| Academy "EM BREVE" | sem ação (vitrine) | |
| Botão "Abrir menu" (≤ fronteira da gaveta) | abre a gaveta; Esc e toque no fundo fecham; fecha ao navegar | |
| Modo escuro (topbar e gaveta) | `useTheme().toggle` (cliente) | |
| Sair (topbar e gaveta) | `logout()` ← `actions/auth` → `/` | |
| Faixa de termos: "Aceitar termos" | `aceitarTermosVigentes()` ← `actions/legal` | |
| Faixa de termos: "Lembrar depois", links "Ler termos" `/termos` e "Tabela de Taxas" `/taxas` | cliente / links | |
| Botão fixo "Ver tutorial desta página" | `TutorialProvider.abrirDaPagina` | |
| Pular para o conteúdo | âncora `#conteudo-principal` | |

## 2. Rotas

### `/inicio` — `app/(app)/inicio/page.tsx`
Busca: só o layout. Componentes: `HomeStats`, `BlocosDeMoedas`, `HomeBlocks`.

| Elemento | Ação | ✔ |
|---|---|---|
| 3 indicadores (Moedas no Mercado, Volume negociado, Última negociação + sync 10s) | leitura | |
| 2 cartões de moeda (foto, tiragem, Maior oferta de compra, Média de mercado, Referência externa) | leitura (`destaqueDeMercado`) | |
| Blocos: Comprar moeda `/compras`, Vender moeda `/vender`, Enviar moeda para custódia `/envios`, Meus recibos `/recibos`, Mercado `/mercado` | links | |
| Bloco "Depositar em conta" | abre `ModalDeposito` (ou `ModalCadastro motivo=deposito` antes) → `iniciarDeposito()` ← `actions/payments` | |

### `/mercado` — `app/(app)/mercado/page.tsx`
Busca extra: `fetch('/api/crypto')` (cotações da comparação); `useBloqueioPorPendencia().consultar()` →
`situacaoDoBloqueioPorPendencia()` ← `actions/bloqueio-por-debito` (vendedores pausados saem da vitrine).

| Elemento | Ação | ✔ |
|---|---|---|
| `MinhasOfertas` (topo): Editar/Cancelar anúncio | `ModalEditarLote` → `editLot()` / `cancelLot()` ← `actions/sell` | |
| `MinhasOfertas`: Editar/Cancelar oferta de compra | `ModalEditarBid` → `editBid()` / `cancelBid()` ← `actions/market` | |
| `MinhasOfertas`: posição na fila, "Executadas recentemente", aviso "anúncios pausados" | leitura | |
| Ofertas de venda: abrir/fechar, filtro por tipo (Todas + negociáveis), filtro Mínimo/Máximo + Limpar, Ver mais (+10) | cliente | |
| `LotCard`: − / + quantidade, **Comprar** | abre `ConfirmarCompraModal` | |
| `ConfirmarCompraModal`: linhas preço, quantidade, subtotal, taxa de compra, **`LinhaCustodiaNaCompra`**, total, saldo | leitura | |
| "Pagar com saldo em conta" | `buyLot()` ← `actions/market` | |
| "Pagar com Pix" / "Cartão ou boleto" | `ModalCadastro motivo=compra` se cadastro incompleto; `iniciarCompraDireta()` ← `actions/payments`; Pix copia e cola + QR | |
| Ofertas de compra: abrir/fechar, filtro por tipo, Mínimo/Máximo + Limpar, Ver mais (+10) | cliente | |
| `BidRow` (minha): Editar / Cancelar | `ModalEditarBid`/`editBid()`; `cancelBid()` | |
| Gráfico "Preço médio histórico" + abas de período (`PeriodTabs`) | cliente | |
| 3 indicadores (Moedas em custódia, Volume, Última negociação) | leitura | |
| "Comparação simples" (linhas clicáveis) | `router.push('/mercado/comparacoes')` | |

### `/mercado/comparacoes` — `app/(app)/mercado/comparacoes/page.tsx`
Busca extra: `fetch('/api/crypto')`. Voltar `/mercado`; `.warn-box` obrigatório com o texto do original
(exceção de terminologia: descreve o mercado externo). Abas de período (cliente).

### `/compras` — `app/(app)/compras/page.tsx`
| Elemento | Ação | ✔ |
|---|---|---|
| `ReservasEmAberto` (topo, só se houver reserva pós-paga) | `listarMinhasReservas()`; "Pagar com saldo" → `pagarReservaComSaldo()` ← `actions/reserva` | |
| `TipoSelector` "Moeda que deseja comprar" (com nº de anúncios por tipo) | cliente | |
| Quantidade desejada, Preço unitário máximo, resumo (subtotal, taxa, **`LinhaCustodiaNaCompra`**, total) | cliente | |
| "Como você quer pagar": Com saldo / Pré-pago (**pós-pago comentado, continua comentado**) | cliente | |
| "Publicar oferta de compra" (saldo) | `publishBid()` ← `actions/market` | |
| "Pagar e publicar oferta" (pré-pago) | `ModalOfertaPrePaga` → `publicarOfertaPrePagaComSaldo()` / `iniciarOfertaPrePaga()` ← `actions/reserva` | |
| Painel "Mercado": média 7 dias, última negociação, últimas negociações | leitura | |
| `ComoPrecoEFormado`, `ComoNegociacaoAcontece` | leitura | |
| `MinhasOfertas` | ver /mercado | |

### `/vender` — `app/(app)/vender/page.tsx`
Busca extra: `useBloqueioPorPendencia().consultar()`. Lê `?moeda=RO-…` no cliente (pré-seleção vinda do recibo).

| Elemento | Ação | ✔ |
|---|---|---|
| `.warn-box` de pendência (`MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA`) + "Abrir faturas de custódia" | link `/conta/faturas` | |
| **`AvisoDebitoCustodia`** ("Custódia a pagar"/"Custódia vencida", "Pagar agora") | link `/conta/faturas` | |
| Detalhes do anúncio: `TipoSelector` "Tipo de moeda a vender", Quantidade a ofertar, Preço unitário de venda, resumo (subtotal, comissão, Você recebe), Observação, Aceito os termos | cliente | |
| "Publicar anúncio" (desabilitado sem qty/preço/termos ou com pendência) | `publishOffer()` ← `actions/sell` | |
| Escolha as moedas: `TipoSelector` (2º), Selecionar todas, Limpar seleção, `CoinPicker` (pastas `Folder`, marcar moeda) | cliente | |
| `ComoPrecoEFormado`, `ComoNegociacaoAcontece`, `MinhasOfertas` | leitura / ver /mercado | |

### `/envios` — `app/(app)/envios/page.tsx` (wizard de 5 passos + histórico)
Busca extra: `fetch('/api/rastreios')`; etiqueta `GET /api/envios/etiqueta/<protocolo>`.

| Passo / elemento | Ação | ✔ |
|---|---|---|
| 1 Dados do envio: tipo, ano, quantidade, CEP + "Buscar" | `consultarCepEnvio()` ← `actions/custody` | |
| 1 Modalidade dos Correios + cotação | `cotarFreteEnvio()` | |
| 1 Instruções de segurança, aviso, "Continuar" | cliente | |
| 2 Revisão + "Confirmo…" + Voltar / "Gerar protocolo" | `createProtocol()` | |
| 3 Plano de custódia (`CartaoDePlano`), `PainelPagamento` da fatura | `contratarPlanoCustodia()`, `pagarFaturaComSaldo()` / `iniciarPixFatura()` / `iniciarCartaoFatura()` ← `actions/plano-custodia` | |
| 3 "Pagar depois" / Voltar | `contratarPlanoCustodia()` | |
| 4 Frete: cotação (`cotarFreteDoEnvio()`), tentar de novo, `PainelPagamento` do frete | `pagarFreteComSaldo()` / `iniciarPixFrete()` / `iniciarCartaoFrete()` | |
| 4 "Emitir etiqueta" / "Baixar etiqueta" | `emitirEtiquetaDoEnvio()`; link `/api/envios/etiqueta/…` | |
| 4 Código de rastreio + "Marcar como postado" | `markPosted()` | |
| 5 Conclusão: "Ver meus recibos", "Novo envio" | `/recibos`; cliente | |
| `RastreioCorreios` (eventos do envio) | `fetch('/api/rastreios')` | |
| `HistoricoEnvios`: filtros, retomar envio, link para recibo | cliente / links | |
| **`AvisoDebitoCustodia`** | link `/conta/faturas` | |

### `/recibos` — `app/(app)/recibos/page.tsx`
| Elemento | Ação | ✔ |
|---|---|---|
| Moedas em custódia (`ReciboCard` → "Ver recibo") | `/recibos/<id>` | |
| Vazio → link para Envios | link | |
| **`AvisoDebitoCustodia`**, **`ResumoDaCustodia`** | links `/conta/faturas`, `/conta/custodia` | |
| "Auditoria de estoque" | `router.push('/recibos/auditoria')` | |
| Resumo (totais) + link "Retiradas físicas" | `/retirada` | |

### `/recibos/[coinId]` — Server Component (`getSessionEmail`, `getState`) → `Certificate`
| Elemento | Ação | ✔ |
|---|---|---|
| Certificado (QR com **"código simulado"** — não sai) | leitura | |
| "Baixar PDF" | `baixarReciboPdf()` ← `lib/pdf` (cliente) | |
| "Colocar à venda" | `/vender?moeda=<id>` | |
| "Solicitar retirada" | `ModalSolicitarRetirada` → `consultarCepEnvio()`, `solicitarRetirada()`, `pagarRetiradaComSaldo()`, `iniciarPixRetirada()`, `iniciarCartaoRetirada()` ← `actions/custody` | |
| Retirada em andamento | `obterRetiradaPorCoin()`; link `/retirada` | |
| Aviso de bloqueio por custódia + link faturas | link | |

### `/recibos/auditoria`
| Elemento | Ação | ✔ |
|---|---|---|
| Tabela de estoque (6 colunas), totais | leitura | |
| "Exportar planilha" | `exportAuditXlsx()` ← `lib/xlsx` (cliente) | |
| Voltar `/recibos` | link | |

### `/retirada`
Busca extra: `obterMinhasRetiradas()` ← `actions/custody`; etiqueta `GET /api/retiradas/etiqueta/<id>`.

| Elemento | Ação | ✔ |
|---|---|---|
| Lista de retiradas (status, rastreio, link recibo) | leitura / links | |
| "Pagar" | `ModalPagarRetirada` → `pagarRetiradaComSaldo()` / `iniciarPixRetirada()` / `iniciarCartaoRetirada()` | |
| "Cancelar solicitação" | `cancelarSolicitacaoRetirada()` | |
| "Baixar etiqueta" | link `/api/retiradas/etiqueta/…` | |
| Vazio → "Meus recibos" | link | |
| Resumo de saídas | leitura | |

### `/conta`
| Elemento | Ação | ✔ |
|---|---|---|
| "Complete seu cadastro" + "Completar cadastro" | `ModalCadastro` → `salvarCadastro()` ← `actions/account`, `consultarCepEnvio()` | |
| Saldo: "Depositar" | `ModalDeposito` (cadastro antes) → `iniciarDeposito()` | |
| Saldo: "Sacar" / "Cadastrar dados" | `ModalSaque` (dados bancários antes) → `solicitarSaque()` | |
| Saque em processamento (D+3), aviso de devolução se recusado | leitura | |
| Moedas em custódia / à venda / à compra | leitura | |
| Minhas moedas (`LinhaMoeda` + "Ver recibo"), "Ver todas as moedas" / "Mostrar menos" | `/recibos/<id>`; cliente | |
| **`AvisoDebitoCustodia`**, **`ResumoDaCustodia`** | links | |
| Configurações rápidas: Dados pessoais (`ModalDadosPessoais` → `updatePersonal()`, `verificarTrocaEmail()`), Segurança `/conta/configuracoes`, Extrato `/conta/extrato`, Minha custódia `/conta/custodia`, Faturas e planos `/conta/faturas`, Notificações (`ModalNotificacoes` → `toggleNotif()`), Retiradas físicas `/retirada` | modais / links | |
| Documentos legais: Termos `/termos`, Tabela de Taxas `/taxas`, Política de Privacidade `/privacidade` | links | |

### `/conta/custodia`
| Elemento | Ação | ✔ |
|---|---|---|
| Resumo (Preço por moeda, Mensalidade do acervo, Guarda paga até, Próxima cobrança / Prazo para pagar, Já pago) | leitura | |
| Planos (PLC-…), "Cancelar assinatura deste plano" → confirmação em 2 etapas | `cancelarMinhaAssinaturaCustodia()` ← `actions/plano-custodia` | |
| Extrato de pagamentos da custódia (tabela), Em aberto, link Faturas | leitura / link | |

### `/conta/faturas` → `FaturasCustodia`
| Elemento | Ação | ✔ |
|---|---|---|
| Lista de faturas e planos (`listarMinhasFaturas()`, `listarMeusPlanos()`) | `actions/plano-custodia` | |
| Abas/filtros, selecionar fatura, `PainelPagamento` | `pagarFaturaComSaldo()` / `iniciarPixFatura()` / `iniciarCartaoFatura()` | |
| Prazos (vencimento, carência de 1 dia) e status | leitura | |

### `/conta/extrato`
| Elemento | Ação | ✔ |
|---|---|---|
| Filtros (chips), tabela de 8 colunas | cliente | |
| "Exportar CSV" / "Exportar Excel" | `lib/export/statement-export` (cliente) | |
| Notas (taxa da Tabela, custódia fica em Faturas) | links `/taxas`, `/conta/faturas` | |

### `/conta/configuracoes`
| Elemento | Ação | ✔ |
|---|---|---|
| Dados pessoais / Alterar senha (`ModalSenha` → `changePassword()`) / 2FA (`toggle2FA()`) / Notificações / Tema | `actions/account` / cliente | |
| Resumo de segurança, Produtos ativos | leitura | |
| Documentos e aceites (`listarMeusAceites()`), link comprovante `/conta/aceites/<id>` | `actions/legal` | |
| Cláusula de arbitragem: assinar (`assinarClausulaArbitragem()`), `verificarStatusArbitragem()` | `actions/legal` | |

### `/conta/aceites/[id]`
Busca: `obterComprovanteAceite(id)` ← `actions/legal` (no cliente). Voltar `/conta/configuracoes`.

### `/relatorios`
Server Component que só **redireciona** para `/admin/resultados/financeiro` (Frente 5). Nada a redesenhar.

## 3. Avisos de regra (precisam continuar visíveis e corretos)

| Aviso | Onde | ✔ |
|---|---|---|
| `AvisoDebitoCustodia` — "Custódia a pagar" / "Custódia vencida", quantas moedas presas, "Pagar agora" | /vender, /conta, /recibos, /envios (+ /inicio no redesenho) | |
| `LinhaCustodiaNaCompra` — "Custódia (1º mês)" com o (i) e link `/taxas` | modal de compra (/mercado), /compras | |
| Depósito: limite por operação (`depositoMax`) e modo **simulado** (o `PainelPagamento` avisa quando o gateway está simulado) | `ModalDeposito` | |
| Trava de negociação por custódia não paga (moeda presa no `CoinPicker`, publicar desabilitado com pendência, anúncios pausados) | /vender, /mercado | |
| Prazos de fatura (vencimento, 1 dia de carência), "Guarda paga até", "Prazo para pagar" | /conta/custodia, /conta/faturas, `ResumoDaCustodia` | |
| Tarifa de saque (R$ 5,00, líquido + tarifa sai do saldo; recusa devolve) | `ModalSaque`, /conta | |
| Pós-pago oculto (bloco comentado em /compras) | /compras | |
| QR do recibo com **"código simulado"** — o QR saiu em 20/09/2026 (topo de `Certificate.tsx`); nada a conferir na tela. Ver PROPOSTAS P2 | /recibos/[coinId] | n/a |
| "A plataforma não recomenda preço" | /mercado, /compras, `ComoPrecoEFormado` | |
| Um livro por tipo de moeda | /compras (nota), `ComoNegociacaoAcontece` | |

## 4. Âncoras do tutorial (contrato com `src/domain/tutorial.ts`, superfície protegida)

As âncoras vivem no domínio (seletor CSS + texto contido + `subir`/`proximo`), **não** em `data-*` nas telas.
Como o domínio não pode ser editado nesta frente, **o redesenho preserva a marcação que elas procuram**:

| Rota | Seletor + texto | Exigência na marcação |
|---|---|---|
| /inicio | `.stats` | HomeStats mantém `.stats` |
| /inicio | `.blocks h3` "Comprar moeda", "Vender moeda", "Enviar moeda para custódia", "Meus recibos", "Depositar em conta", "Mercado" → sobe a `a, .block` (depósito: `a, .block, div`) | blocos continuam `.block` com `<h3>` dentro de `.blocks` |
| /mercado | `h3` "Minhas ofertas", "Ofertas de venda", "Ofertas de compra", "Preço médio histórico", "Comparação simples" → `.panel` | cada um é `<h3>` dentro de `.panel` |
| /mercado | `button.btn` "Comprar" | botão do `LotCard` continua `button.btn` com "Comprar" |
| /compras | `h3` "Fazer oferta de compra", "Mercado" → `.panel`; `.panel` contendo "Moeda que deseja comprar" | idem |
| /compras | `.field-lbl` "Quantidade desejada", "Como você quer pagar" → **elemento seguinte** (`proximo`) | rótulo `.field-lbl` imediatamente antes do campo/grade |
| /compras | `button.btn-gold` contendo "oferta"; `.note` contendo "acontece automaticamente" | idem |
| /vender | `h3` "Detalhes do anúncio", "Escolha as moedas" → `.panel`; `.panel` contendo "Tipo de moeda a vender" | idem |
| /vender | `label, .field-lbl` "Quantidade a ofertar", "Preço unitário de venda" → seguinte | idem |
| /vender | `button.btn-gold` "Publicar anúncio" | idem |
| /envios | `h3` "Dados do envio", "Instruções de segurança" → `.panel`; `.field-lbl` "Modalidade dos Correios" → seguinte; `button.btn-gold` "Continuar" | idem |
| /envios, qualquer | `.note, .warn-box` contendo "Custódia a pagar" / "Custódia vencida" (gatilho contextual); `a` "Pagar agora" | `AvisoDebitoCustodia` mantém as classes `.note`/`.warn-box` e o link |
| /recibos | `h3` "Moedas em custódia", "Minha custódia", "Auditoria de estoque", "Resumo" → `.panel` | idem |
| /conta | `h3` "Minhas moedas", "Minha custódia", "Configurações rápidas" → `.panel`; `.qk-name` "Dados pessoais" → `.qk-row`; `.note` "Complete seu cadastro"; `a` "Termos" | idem |
| tour | véu escuro (`.tour-camada`), camada sem escurecer (`.dicas-camada`), exemplo de custódia (`useTutorial().exemplo` em `AvisoDebitoCustodia` e `ResumoDaCustodia`) | não mexer nas duas camadas; o exemplo continua somado só no desenho |

## 5. Auditorias (ferramentas adaptadas em `ferramentas/`)

| Medida | Antes (25/10, d0398d5) | Depois (25/10, fim da sessão 1) |
|---|---|---|
| Arquivos auditados (páginas de `(app)` + componentes das áreas) | 58 | 59 (+`ResumoDaConta`) |
| Arquivos com mais de um primário (`btn-gold`) | 11 | 8 (modais com etapas e o wizard de 5 passos: uma primária por etapa) |
| Total de `btn-gold` | 66 | 50 |
| Campos de texto | 50 | 48 |
| Campos sem dica de teclado (`inputMode`/`autoComplete`/`type`) | 32 | 26 (restam os das modais de cadastro e retirada, que não foram reescritas) |
| Clique em `<div>`/`<span>` (não alcançável por teclado) | 31 | 11 (todos com `role` + teclado, ou o fundo da gaveta) |
| `<button>` sem `type` | 3 | 6 — falso positivo: comentários que citam `<button>`; nenhum botão real sem `type` |
| Tabelas | 7 | 7 |
| Tabelas com 5+ colunas | 6 | 6 |
| Com `th scope="row"` | 0 | **7** |
| Com 1ª coluna fixa | 0 | **7** |

As ferramentas originais (`auditoria-botoes-campos.py`, `auditoria-tabelas-largas.py`) rodadas sem adaptação:
"TELAS com >1 primário: 0 de 44" e nenhuma tabela — falso negativo, porque procuram `estilo.botao` e `<Tabela>`.

## 6. Verificação no navegador (25/10/2026) — ✔ resumido

Servidor local isolado (store em memória com as 7 contas do seed, sem banco, sem NFS-e, sem Mercado Pago), desktop
1366 e 375 px, escuro e claro:
- ✔ Casco: menu agrupado, gaveta abre/fecha, cabeçalho gruda no celular, tema, sair.
- ✔ Faturas geradas pelo cron local e quitadas; ✔ cadastro completo pela modal; ✔ depósito (limite visível; Pix sem
  gateway diz que nenhuma cobrança foi aberta); ✔ anúncio publicado (motivo do botão desabilitado aparece);
  ✔ oferta de compra com "Custódia (1º mês)" e (i); ✔ compra por outra conta com saldo (R$ 304,50 = preço + taxa +
  1º mês) e crédito ao vendedor (R$ 297,50); ✔ cotação por moeda reflete as ofertas; ✔ envio dos 5 passos
  (protocolo → plano pago com saldo → etiqueta 200 → postagem → acompanhamento); ✔ PDF do recibo; ✔ retirada
  solicitada (taxa R$ 50,00, "pagar depois"); ✔ /retirada vazia (lista vem do Postgres — PROPOSTAS P6).
- ✔ Tutorial: tour inteiro desktop e 375 px (foco nos blocos novos, folha na base no celular, exemplo de custódia em
  Minha conta, some no fim); dicas por página: Início 7/7, Mercado 5/6 (o "Comprar" só existe com lote alheio — com
  outra conta apareceu), Compras 5/5, Vendas 5/5, Envios 5/5 (no passo 1), Recibos 4/4, Conta 4/4.
- ✔ 375 px: nenhuma rolagem horizontal nas 16 rotas.
- Não clicado: "Cancelar solicitação" de retirada (a lista não tem itens sem banco). Desde 30/10/2026 a pergunta é a
  `ModalCancelarRetirada`, não mais o `window.confirm` nativo.

## 7. Atualização de 30/10/2026 (sessão 2 — polimento pelas cinco lentes do Distilla)

Base: `main` @ `d29727a`, branch `polish/aurea-plataforma-cliente`. O inventário acima continua valendo; esta seção só
registra o que mudou desde 25/10 e o que sobrou.

**O que mudou na área do cliente desde 25/10** (`git log --since=2026-10-25 -- "src/app/(app)" src/components src/styles`):

| Commit | Efeito na plataforma do cliente |
|---|---|
| `61706fb` (26/10) | Ciclo da moeda comprada antes de 21/10 começa no 1º pagamento; `/conta/custodia` mostra uma linha por data de cobrança (`ProximasCobrancas`). Âncoras do tutorial de custódia seguem valendo. |
| `32ff769`, `10f107b` (27/10) | Só painel/logística — nada no cliente. |
| `8df2bad` (30/10) | "Ver como o cliente vê" no `/admin` e vídeo da bancada — sem mudança nas rotas de `(app)`. |

**Auditorias rodadas de novo em 30/10** (`ferramentas/auditoria-*-ro.py`, sem mudança de método):

| Medida | 25/10 (depois) | 30/10 (antes desta sessão) |
|---|---|---|
| Arquivos com mais de um primário | 8 | 7 |
| Total de `btn-gold` | 50 | 49 |
| Campos de texto | 48 | 48 |
| Campos sem dica de teclado | 26 → 9 | **9** (`ModalCadastro`: número, complemento, bairro, banco, conta; `ModalSolicitarRetirada`: documento, número, bairro; `PainelPagamento`: 1) |
| Clique em `<div>`/`<span>` | 11 | 8 — o único real é o `✕` do `PhotoSlot` (`<div className="rm" onClick>`) |
| Tabelas / 5+ colunas / `th scope="row"` / 1ª coluna fixa | 7 / 6 / 7 / 7 | 7 / 6 / 7 / 7 |

**Residuais encontrados por leitura (lista de trabalho desta sessão):**

| # | Achado | Lente | Evidência |
|---|---|---|---|
| R1 ✔ | `(app)` não tem `error.tsx` nem `loading.tsx` (o `(admin)` tem os dois): erro numa tela do cliente cai na página genérica do Next, sem menu | 4 — estados | `find "src/app/(app)" -name error.tsx` vazio |
| R2 ✔ | `/retirada` cancela com `window.confirm` nativo (já registrado em 25/10 como "não clicado") | 4 — estados; 1 — consistência | `retirada/page.tsx:50` |
| R3 ✔ | `✕` de remover foto é `<div onClick>` sem nome acessível nem teclado | 2/5 — toque e acessibilidade | `components/custody/PhotoSlot.tsx:58` |
| R4 ✔ | `.app{min-height:100vh}` sem `dvh`: salto com a barra de endereço no celular | 2 — responsividade | `shell.css:13` |
| R5 | `SellerBidRow.tsx` não é importado por nenhum arquivo (componente órfão, com 4 estilos inline) | 3 — componentes | `grep -rn SellerBidRow src` só acha o próprio arquivo |
| R6 ✔ | Recibo sem `@media print` (a tela do recibo imprime com o menu e a gaveta) | 5 — acabamento | só `legal.css` e `landing.css` têm `@media print` |
| R7 ◐ | Campos do cadastro/retirada ainda sem dica de teclado (9 acima) | 2 — celular | auditoria |

Não são bugs de negócio: nenhum mexe em regra, valor, Server Action ou permissão. R5 é só registro — apagar arquivo
não foi pedido. Estados sem `loading.tsx` por rota ficam para a medição no navegador.

**Checks da base (30/10, antes de mexer):** `typecheck` ok · `lint` 0 erros / 16 avisos (todos fora desta frente) ·
`test` 156 de 157 arquivos; o único vermelho foi `src/server/admin/banco.test.ts` ("Hook timed out in 10000ms"), que
**passa sozinho (46/46)** — lentidão da máquina com a suíte inteira, não regressão · `build` ok.

✔ = corrigido no bloco 2 (30/10/2026). ◐ = complemento e bairro receberam `autoComplete`; número, CPF/CNPJ, banco e conta ficam
sem dica de propósito (não há token que sirva).

## 8. Medição no navegador (30/10/2026, sessão 2)

Servidor local isolado (`next dev` em `127.0.0.1:3104`, `NODE_ENV=test`, `.env.test.local` ignorado pelo Git e com banco,
Supabase, Mercado Pago, Correios e NFS-e vazios; store em memória com as 7 contas do seed; nenhuma credencial de produção
no ambiente). Conta `gabrielsilva@testeaurea.com.br`, Chrome 1440 × 900, 768 × 1024 e 375 × 812, tema claro e escuro.
Script e saída ficam no scratchpad da sessão (não entram no Git).

| Medida | Resultado |
|---|---|
| Rotas abertas | 15 (todas as de `(app)` menos `/relatorios`, que só redireciona, e `/conta/aceites/[id]`) × 3 larguras × 2 temas |
| Rolagem horizontal (`scrollWidth > clientWidth`) | **0** em todas |
| Erros de console / `pageerror` | **0** em todas (a dica de hidratação do CD-13 só aparece em produção) |
| axe-core 4.10 (WCAG 2.0/2.1/2.2 A e AA), 375 e 1440 px | **primeira rodada: 5 achados em 2 regras; depois da correção: 0** |
| Impressão do recibo (`media=print`, PDF A4) | só a folha do recibo, nas cores dela, em uma página, nos dois temas |

**Achados do axe, os dois reais e corrigidos:**
1. `color-contrast` no recibo (`.cert-sub`, `.cert-code`, `.seal-badge` = 4,33:1; `.cert-foot` = 3,89:1; mínimo 4,5:1).
   Em 25/10 o axe deu 0 — os papéis do certificado mudaram com a marca. Correção só no `.cert`
   (`--cert-ink-gold: ouro-800`, `--cert-ink-foot: pergaminho-600`); a landing, que lê o mesmo token, não mudou.
2. `aria-valid-attr-value` em `/conta/faturas`: a aba apontava (`aria-controls`) para um painel que ainda não existia
   enquanto a tela carregava. O estado "carregando" agora já é o `tabpanel` da aba ativa.

**Não verificado nesta sessão:** a modal `ModalCancelarRetirada` e o `✕` do `PhotoSlot` (exigem uma retirada em
"solicitada" e o passo de fotos do envio, e foram escritos mas não clicados); `error.tsx` (precisa forçar uma falha);
768 px no axe (só overflow e console); LCP e INP; WebKit/Firefox; leitor de tela. As telas de `/conta/aceites/[id]` e
os modais de depósito/cadastro/retirada não entraram nesta rodada do axe.
