# Inventário — o que a landing e as páginas públicas dizem hoje (base `main @ d0398d5`)

Lista fechada. **Nenhum número, prova, taxa, promessa ou função daqui muda** na Frente 3. A coluna "Origem" diz de
onde o valor sai; valor que sai de constante ou de `src/server/config/` continua saindo de lá. No fechamento, cada
linha ganha ✅ (conferido na tela nova) ou a nota do que mudou de lugar.

Legenda de origem: **CFG** = tabela vigente (`carregarTabelaDeTaxas()` → `src/server/config/carregar.ts`, banco
`aurea.config_plataforma` sobre `TAXAS_PADRAO`); **CONST** = `src/domain/constants.ts` / `fees.ts`; **BANCO** =
livro de ordens real (`carregarDestaquesDaLanding()`); **JSX** = texto digitado no componente, sem fonte no código.

## 1. Blocos atuais da landing (`src/components/landing/LandingPage.tsx`, nesta ordem)

| # | Bloco | Classe | Conteúdo | Interativo |
|---|---|---|---|---|
| 0 | Cabeçalho fixo | `.landing-header` | emblema + "Real Olímpico / Custódia de moedas comemorativas"; Entrar, Criar conta | não |
| 1 | Herói | `.landing-hero` | "Transforme seus itens de colecionador em liquidez" + 2 moedas reais (`MoedaRealista`, `priority`) | inclinação da moeda |
| 2 | Reserva de valor | `.landing-reserve` | "Um novo conceito de reserva de valor" (ouro/prata, itens de alto valor, marketplace simples) | não |
| 3 | Vitrine de mercado | `.landing-market` | 2 cartões: Bandeira 2012 e Direitos Humanos 1998, com `DestaqueDoCard` | links "Negociar" → /cadastrar |
| 4 | Exame do espécime | `CoinSpecimenViewer` | anverso/reverso + ficha técnica da Bandeira | alterna face (client) |
| 5 | Como funciona | `.landing-process` | 3 etapas: custódia segura, recibo lastreado, marketplace | não |
| 6 | Nossa história | `.landing-origin` | Rogério Siqueira: o desafio e a solução | não |
| 7 | Segurança | `.landing-assurance` | cofres, carros fortes, itens intocados + tabela "Domicílio × Real Olímpico" (4 critérios) | não |
| 8 | Simulador | `FeeSimulator` | valor de referência → comissão, líquido do vendedor, custo do comprador, custódia/mês | client |
| 9 | Perguntas frequentes | `.landing-faq-section` | 4 perguntas (`details`) | nativo |
| 10 | Posicionamento | `.landing-positioning` | citação "não é corretora / não é instituição financeira / não é plataforma de ativos digitais" | link /termos |
| 11 | Rodapé | `.landing-footer` | AUREA CUSTODIA LTDA · CNPJ 68.071.452/0001-06; Termos, Privacidade | não |

## 2. Números, taxas e provas — e a origem de cada um

| # | Item | Valor hoje | Onde aparece | Origem | Observação |
|---|---|---|---|---|---|
| N1 | Comissão de negociação, cada lado | 0,5% + R$ 1,00 por moeda | FAQ, simulador | **CFG** (`comissaoCompradorBp/Fixa`, `comissaoVendedorBp/Fixa`) | hoje **digitado** no FAQ e no simulador (`0.005`, `1.0`); passa a vir da tabela vigente |
| N2 | Cobrada dos dois lados | comprador e vendedor | FAQ, simulador | regra (CLAUDE.md, `comissaoPorMoeda`) | conceito, não muda |
| N3 | Custódia mensal por moeda | R$ 2,00 / mês | FAQ, simulador, `/academy` | **CFG** (`custodiaMensalPorMoeda`) | simulador lia `TAXAS_PADRAO` (padrão, não o vigente); FAQ e Academy digitados |
| N4 | Sem prazo mínimo, sem plano anual | — | FAQ, simulador | regra (21/09/2026) | conceito |
| N5 | 1º mês de custódia entra na compra | R$ 2,00 (`custodiaDaCompraPorMoeda`) | `/taxas` (não na landing) | **CFG** + `custoDeCompraPorMoeda` | o simulador da landing calculava o custo do comprador **sem** este mês (preço + comissão): a fórmula correta é `custoDeCompraPorMoeda` (regra de 21/10/2026) |
| N6 | Tarifa de saque | R$ 5,00 | `/taxas` | **CFG** (`taxaSaqueFixa`) | não aparecia na landing |
| N7 | Retirada comum / segura / parcelas | R$ 50,00 / R$ 180,00 / 2x | `/taxas` | **CFG** | só em /taxas |
| N8 | Prazo de saque | D+3 dias úteis | `/taxas`, `/academy` | **JSX** | não muda |
| N9 | Prazo de preparo da retirada física | 30 dias corridos + Correios | `/academy` | **JSX** | não muda |
| N10 | Moedas negociáveis | Entrega da Bandeira Olímpica; Direitos Humanos | herói, vitrine | `TIPOS_DA_LANDING` (`src/server/mercado/destaques.ts`) + `COIN_TYPES.negociavel` | a landing usava `TIPO_BANDEIRA`/`TIPO_DH` locais com os mesmos textos |
| N11 | Maior oferta de compra (por tipo) | do livro | vitrine | **BANCO** (`destaqueDeMercado`) | sem oferta → "Sem ofertas de compra no momento" |
| N12 | Média de mercado (por tipo) | do livro | vitrine | **BANCO** | sem negociação → "Sem negociações ainda" |
| N13 | Referência de mercado externo — flor de cunho | valor + fonte + data | vitrine | **CONST** (`ROTULO_REFERENCIA_EXTERNA`, referência por tipo) | rótulo exato, pedido de 21/10/2026 |
| N14 | Tiragem da Bandeira 2012 | 2.016.000 | ficha do espécime | **CONST** (`COIN_TYPES[0].tiragem`) | ficha digitava; passa a ler a constante |
| N15 | Tiragem da Direitos Humanos | 600 mil | cartão da vitrine | **CONST** (`COIN_TYPES[1].tiragem` = 600.000) | idem |
| N16 | Diâmetro / peso da Bandeira | 27,00 mm / 7,00 g (± 0,01 g) | ficha | `COIN_TYPES.detail` diz "27mm · 7g"; o "± 0,01 g" é JSX | mantido como está |
| N17 | Espessura / bordo / composição da Bandeira | 1,95 mm; serrilhado intermitente; núcleo aço inox, anel aço revestido de bronze | ficha | **JSX** | sem fonte no código — ver PROPOSTAS_BACKEND |
| N18 | Composição da Direitos Humanos | "Cuproníquel" | cartão da vitrine | **JSX** | `COIN_TYPES` diz "Bimetálica" — contradição registrada em PROPOSTAS, texto mantido |
| N19 | Estado de conservação | Flor de Cunho / Soberba | ficha, Academy | **JSX** | mantido |
| N20 | Selos dos cartões | "100% Custodiado", "Alta liquidez", "Raridade chave" | vitrine | **JSX** | mantidos |
| N21 | Códigos dos cartões | BR-2012-BANDEIRA, BR-1998-DH | vitrine | **JSX** | mantidos |
| N22 | Cofre | "Cofre Sicoob", "mesmos cofres, carros fortes… que bancos como o Sicoob" | vitrine, segurança, ficha, simulador | **JSX** | promessa factual dos sócios; mantida palavra por palavra no sentido |
| N23 | Itens intocados | "não serão tocados, após a avaliação, nem mesmo por nós"; lacre após laudo | segurança | **JSX** | promessa mantida |
| N24 | Perícia de entrada | pesagem de precisão, diâmetro, espessura, magnetismo, cunho; laudo; lacre | FAQ, ficha | **JSX** | conceito (estação/bancada) |
| N25 | Resgate físico a qualquer momento | Termos de Uso | FAQ, Academy | regra | mantida |
| N26 | Sem frete a cada negociação | posse muda sem despachar o item | história, tabela, simulador | conceito central | mantido |
| N27 | Presets do simulador | R$ 180,00 / R$ 450,00 / R$ 1.200,00 ("Série completa Rio 2016") | simulador | **JSX** | exemplos de entrada, não preços; mantidos com o rótulo "exemplo" |
| N28 | Razão social e CNPJ | AUREA CUSTODIA LTDA · 68.071.452/0001-06 | rodapé landing e páginas legais | **JSX** | onde já aparece, continua |
| N29 | Posicionamento | não é corretora; não é instituição financeira; não é plataforma de ativos digitais; serviço de guarda com marketplace de recibos | landing, Academy | **JSX** | texto da citação mantido (Academy: intacto) |
| N30 | Fundador | Rogério Siqueira, colecionador da série Real Olímpico; guarda em casa e fretes com valor declarado | história, Academy | **JSX** | fato mantido |
| N31 | Depósito simulado | R$ 100.000 por operação (`DEPOSITO_MAX`) | plataforma (não na landing) | **CONST** | não entra na landing |

## 3. Páginas públicas — o que não muda

| Página | Arquivo | Conteúdo/função que fica intacta |
|---|---|---|
| `/entrar` | `entrar/page.tsx` + `LoginForm` | `login`, `loginWithGoogle`; campos `loginEmail`/`loginPass`; revelar senha 3 s; mensagens de `?erro`/`?status`; link /cadastrar |
| `/cadastrar` | `cadastrar/page.tsx` + `RegisterForm` | `registerWithEmail`, `registerWithGoogle`; 4 campos; cláusula arbitral opcional com assinatura; aviso de cadastro fechado; links Termos/Privacidade/Taxas |
| `/entrar/nova-senha` | `NovaSenhaForm` | `definirNovaSenha`; destino `/inicio` ou `/admin` |
| `/entrar/callback`, `/entrar/sair` | rotas | **não tocadas** |
| `/taxas` | `taxas/page.tsx` | toda a tabela vem de CFG; exemplo de R$ 200,00; hash e versão do documento vigente |
| `/termos` | `termos/page.tsx` | texto jurídico do documento vigente (banco) — **só layout** |
| `/privacidade` | `privacidade/page.tsx` | texto de `DOCUMENTOS_VIGENTES` — **só layout** |
| `/suporte` | `suporte/page.tsx` | canais de `carregarCanaisDeAtendimento()`; horário; prazo de 2 dias úteis; aviso antifraude |
| `/academy` | `academy/page.tsx` | todo o texto educativo; o "R$ 2,00" passa a vir de CFG |

## 4. Conferência no fechamento (25/10/2026, na tela nova)

| Itens | Resultado |
|---|---|
| N1, N2, N3, N4 | ✅ herói, faixa de preços, simulador e FAQ leem a tabela vigente (`carregarTabelaDeTaxas`); nada digitado. Mostrado: 0,5% + R$ 1,00 por moeda, de cada lado; R$ 2,00 por moeda/mês, sem prazo mínimo |
| N5 | ✅ **corrigido para a regra vigente**: o simulador usa `custoDeCompraPorMoeda` (preço + comissão + 1º mês). R$ 180 → R$ 183,90 / R$ 178,10; R$ 450 → R$ 455,25 / R$ 446,75 (conferido clicando) |
| N6 | ✅ agora também na landing (faixa "Quanto custa"), de `taxaSaqueFixa` |
| N7, N8, N9 | ✅ inalterados em /taxas e /academy |
| N10 | ✅ as duas moedas negociáveis, mesmos nomes de tipo |
| N11, N12, N13 | ✅ `DestaqueDoCard` intacto (teste passa) + faixa "Mercado agora" com a mesma função de domínio |
| N14, N15 | ✅ tiragem lida de `COIN_TYPES` (2.016.000; 600.000) |
| N16–N19 | ✅ mesmos valores na ficha (ver PROPOSTAS P2/P3) |
| N20–N23 | ✅ mantidos (selos, códigos, Cofre Sicoob, "nem nós") |
| N24–N26 | ✅ perícia, resgate e "sem frete a cada venda" mantidos |
| N27 | ✅ exemplos R$ 180 / R$ 450 / R$ 1.200, agora rotulados "valores de exemplo" |
| N28 | ✅ AUREA CUSTODIA LTDA · CNPJ no rodapé de todas as páginas públicas e no casco de acesso |
| N29 | ✅ citação de posicionamento inteira no fim da landing + faixa "é / não é" no topo + FAQ "Isso é um investimento?" |
| N30 | ✅ história do Rogério mantida (copy simplificado) |
| N31 | — fora da landing, como antes |
| Páginas públicas (§3) | ✅ formulários, campos, ações e textos jurídicos iguais; só casco e CSS mudaram |
