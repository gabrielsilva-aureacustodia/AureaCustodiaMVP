# Regras fiscais e contábeis que o sistema SEMPRE segue

**Real Olímpico — AUREA CUSTODIA LTDA, CNPJ 68.071.452/0001-06, Belo Horizonte/MG. Lucro Presumido.**
Versão 1, 22/10/2026. Escrito a partir da reunião com o contador (16/10/2026), das três NFS-e-modelo que ele
emitiu em 22/10/2026 e das pesquisas anexadas em `pesquisa/`.

> **Respostas do contador (Túlio Monteiro, 23/10/2026)** estão aplicadas neste documento e no código — a lista
> completa, uma a uma, está em `LACUNAS_E_PERGUNTAS.md` §0.
>
> **Status de cada regra.** Toda regra traz um selo:
> **[CONFIRMADO]** — está nas notas emitidas pelo contador ou na fala dele na reunião;
> **[LEI]** — sai de texto oficial lido (Planalto, CFC, CPC, gov.br/nfse, PBH);
> **[PROPOSTA]** — desenho nosso em cima da norma, que precisa do aval do contador antes de virar código.
> As dúvidas abertas estão em `LACUNAS_E_PERGUNTAS.md`. Fontes de cada afirmação: nos anexos de `pesquisa/` e em
> `FONTES.md`.

> **Isto não é parecer contábil.** Escriturar e assinar demonstrações é atribuição do contador habilitado (ITG 2000,
> item 12). O papel do sistema é produzir registros que o contador consiga usar sem retrabalho.

---

## A explicação para o Rogério, em seis frases

1. Só é **receita** da empresa o que o Real Olímpico cobra **pelo próprio serviço**: custódia, comissão e tarifas.
2. O dinheiro que o cliente deposita, que vai do comprador para o vendedor ou que o cliente saca **é do cliente**: a
   empresa só guarda. Na contabilidade isso é uma **dívida com o cliente** (passivo), não receita — e por isso não paga
   imposto.
3. Cada receita gera **uma nota fiscal de serviço (NFS-e)** na hora em que acontece, pelo sistema nacional do governo,
   que é gratuito.
4. No Lucro Presumido o imposto é calculado sobre a **receita cobrada** (os R$ 2,00 da custódia, por exemplo), e **não**
   sobre o lucro nem sobre o que sobra depois da taxa do Mercado Pago. A taxa do Mercado Pago é uma **despesa** da
   empresa. Isso é lei e o STF já decidiu assim para taxa de cartão (Tema 1024).
5. Todo movimento, inclusive os que não passam pelo banco (uma compra paga com saldo), vira um **lançamento contábil
   completo**: de onde saiu, para onde foi, quanto, quando, por quê e com qual documento.
6. Erro nunca se apaga: corrige-se com **outro lançamento** que diz o que estava errado, quando e quem autorizou.

---

## R1. O que é receita, o que não é, e por quê

Toda movimentação recebe exatamente uma das naturezas abaixo. A coluna "Por que" é o texto que o sistema mostra nos
relatórios quando o movimento **não** é receita (pedido do Gabriel: "descrição detalhada explicando o que são e porque
não constam como receita").

| Movimentação | Natureza | Por que (texto para o relatório) | Base |
|---|---|---|---|
| Custódia mensal (ciclo da moeda) | **Receita de serviço** | Preço do serviço de guarda prestado pelo Real Olímpico. | [CONFIRMADO] NFS-e nº 1; DL 1.598 art. 12, II |
| Custódia do 1º mês cobrada na compra (`origem: 'compra'`) | **Receita de serviço (custódia)** | Mesma natureza da custódia mensal; nunca entra na comissão. | [CONFIRMADO] mesma natureza; regra de 21/10/2026 |
| Comissão do comprador | **Receita de serviço (intermediação)** | Preço da intermediação cobrado do comprador. | [CONFIRMADO] NFS-e nº 2 |
| Comissão do vendedor | **Receita de serviço (intermediação)** | Preço da intermediação cobrado do vendedor. | [CONFIRMADO] NFS-e nº 3 |
| Tarifa de saque (R$ 5,00) | **Receita de serviço (armazenamento)** | Movimentação do armazenamento onde o saque acontece: NFS-e 11.04.01, como a custódia. | [CONFIRMADO] contador, 23/10/2026 |
| Taxa de retirada física (R$ 50 / R$ 180) | **Receita de serviço (armazenamento)** | Movimentação do armazenamento: NFS-e 11.04.01. | [CONFIRMADO] contador, 23/10/2026 |
| Futuras taxas de logística com margem | **Receita de serviço** | Se houver margem sobre o custo dos Correios, a margem é preço de serviço. | [PROPOSTA] |
| Depósito do cliente (Pix/cartão) | **Não é receita — passivo "Recursos de clientes"** | Dinheiro do cliente, guardado por ordem dele; a empresa tem a obrigação de devolvê-lo ou usá-lo por ordem do cliente. | [CONFIRMADO] contador, 16/10; CPC 00 item 4.26 |
| Valor da moeda pago pelo comprador ao vendedor | **Não é receita — transferência entre clientes** | O Real Olímpico é **agente** na venda: não é dono da moeda, não assume risco de estoque nem define o preço. Só a comissão é receita. | [LEI] CPC 47 itens 47, B34–B37; DL 1.598 art. 12, III |
| Saque do cliente (valor líquido) | **Não é receita nem despesa — baixa do passivo** | Devolução ao cliente de dinheiro que já era dele. | [LEI] CPC 00 |
| Saldo inicial / migração | **Não é receita — abertura do passivo** | Registro do saldo que a conta já tinha. | [PROPOSTA] |
| Frete do envio pago pelo cliente (preço do contrato, sem margem) | **Não é receita — despesa do cliente** | O Real Olímpico recebe o dinheiro do cliente e paga aos Correios uma despesa que é dele. Fica fora do resultado inteiro: não é receita, não gera NFS-e, e a fatura dos Correios desses envios também não é despesa da empresa. | [CONFIRMADO] contador, 23/10/2026 (leitura A de `pesquisa/PESQUISA_CONTABIL_E_TRIBUTARIA.md` §2.5) |
| Taxa do Mercado Pago sobre qualquer recebimento | **Despesa** (não reduz a receita) | Custo de receber pelo gateway. A receita continua sendo o valor cobrado do cliente. | [LEI] CPC 26 item 32 (proibido compensar); STF Tema 1024 |
| Estorno/cancelamento de serviço já faturado | **Dedução da receita (serviço cancelado)** | Serviço que não se concretizou sai da base de tributos. | [LEI] DL 1.598 art. 12 §1º, I; Lei 9.718 art. 3º §2º, I |
| Chargeback de depósito | **Não é receita** — reverte o passivo; o que faltar vira crédito a recuperar ou perda | O cliente desfez a entrada de dinheiro dele. | [PROPOSTA] |
| IBS/CBS destacados em 2026 | **Informativo** — sem receita e sem despesa enquanto houver dispensa | Ano de teste: dispensado de recolher quem cumpre as obrigações acessórias. | [LEI] LC 214 art. 348 §1º |
| Aporte de sócio | **Patrimônio líquido** (capital) | Dinheiro do dono, não de cliente nem receita. | [LEI] |

**Regra derivada:** nenhuma tela, relatório ou exportação pode somar dinheiro de cliente com receita. "Faturamento do
Mercado Pago" (tudo que entrou na conta) e "Receita bruta" são números diferentes e os dois aparecem lado a lado,
com a diferença explicada linha a linha (ver R11).

---

## R2. Toda receita gera NFS-e no ato

1. **Quando:** no instante em que a receita é reconhecida.
   - A comissão, no casamento da negociação.
   - A custódia, **somente no pagamento** da fatura, com a data e a hora do pagamento ([DECIDIDO] Gabriel,
     23/10/2026; ver R5.3). **Fatura não paga não gera nota e não gera imposto, nunca.**
   - A tarifa de saque, **no pedido do saque**, que é quando o dinheiro sai do saldo ("o dia da movimentação do
     dinheiro", contador, 23/10/2026). Se a equipe recusar o saque, a tarifa volta ao saldo e a nota é
     **cancelada** na Sefin (evento 101101, motivo "serviço não prestado"). [CONFIRMADO + código]
   - A taxa de retirada física, quando a retirada passa a **paga**, com a hora do pagamento. [CONFIRMADO] O pedido da nota (DPS) sai **na mesma transação lógica** que grava o lançamento; o envio à Sefin roda
   logo em seguida, com fila e nova tentativa. [PROPOSTA]
2. **Uma nota por fato gerador, por tomador, por serviço — automática, sempre.** O leiaute aceita **uma** data de
   competência e **um** serviço por nota, então: uma NFS-e por ciclo de custódia de cada lote; uma NFS-e para a
   comissão do comprador e **outra** para a do vendedor (cada um é tomador de um serviço diferente). Custódia e
   comissão nunca dividem nota. [LEI] leiaute DPS v1.01; [CONFIRMADO] o contador emitiu assim; **[DECIDIDO] Gabriel,
   23/10/2026**: é a prioridade, porque cada nota casa com uma linha do livro-razão dos clientes e prova o movimento de
   dinheiro entre as contas.
   **Consolidado sob demanda, pelo painel** ([DECIDIDO] Gabriel, 23/10/2026): o Admin tem a opção de gerar um
   consolidado por cliente e período quando alguém pedir (o próprio cliente, um banco em auditoria). Não se gera o
   consolidado o tempo todo. **Cuidado que define como ele é feito** [LEI → PROPOSTA]: o mesmo serviço não pode ter
   duas NFS-e. Uma nota fiscal consolidada de operações que já têm nota individual faturaria o serviço **duas vezes**:
   ISS, PIS e COFINS em dobro e documento sem lastro. Por isso o consolidado tem dois modos:
   - **Demonstrativo consolidado** (padrão): documento do sistema, não fiscal. Lista as NFS-e do período (número,
     chave, data, valor, serviço), os totais por serviço e os lançamentos do livro-razão ligados a cada uma. Pode
     ser gerado quantas vezes for preciso. Atende ao cliente e ao banco.
   - **NFS-e consolidada fiscal**: só para operações **sem** nota individual. Exemplos: as operações anteriores à
     automação, que serão faturadas em retroativo, ou uma nota individual que ficou rejeitada. O painel bloqueia a
     inclusão de operação que já tem nota. A data de competência dela, já que reúne vários dias, é pergunta ao
     contador.
3. **Tomador identificado sempre, com endereço em todas as notas** (contador, 23/10/2026: "pode colocar endereço
   do cliente em todas as NFS-e, mesmo não sendo obrigatório na da custódia"): CPF (ou CNPJ) e nome. Na **intermediação** é **obrigatório** também o endereço
   completo com CEP — a Sefin rejeita sem ele (regras E0187/E0234), porque o IBS/CBS da intermediação pertence ao
   município do cliente (cIndOp 100301). O CPF precisa existir na base da Receita (E0207). **Consequência no produto:
   o cadastro precisa de endereço completo e CPF válido antes de a pessoa negociar.** [LEI] Anexo I v1.01
4. **Nota emitida não se edita.** Erro → cancelamento (evento 101101, até 730 dias em BH) ou substituição (nova DPS
   apontando a anterior). Substituição não pode trocar tomador, competência, subitem nem local. [LEI] Portaria SMFA
   75/2025; Anexo I
5. **Todo lançamento de receita guarda a chave de acesso (50 dígitos) e o número da NFS-e**, e toda NFS-e guarda o ID
   do lançamento e do fato (negociação, fatura, saque). Receita sem nota, ou nota sem lançamento, é pendência
   visível no painel. [PROPOSTA]
6. **O documento oficial é o XML** autorizado. O PDF (DANFSe) é gerado pela plataforma, no leiaute nacional v2.0,
   porque a API oficial de PDF foi suspensa em 03/08/2026. [LEI] P&R NFS-e v1.1 item 17.8

---

## R3. Códigos de tributação por tipo de receita

| Receita | cTribNac | cTribMun (BH) | NBS | Descrição na nota | ISS BH | cIndOp | CST / cClassTrib | Status |
|---|---|---|---|---|---|---|---|---|
| Custódia mensal / 1º mês na compra | **11.04.01** | **001** | **1.0602.90.00** | `CUSTODIA MENSAL - MM/AAAA - N MOEDA(S)` | **5%** | **050101** | 000 / 000001 | [CONFIRMADO] NFS-e nº 1 |
| Comissão do comprador | **10.05.01** | **003** | **1.0201.00.00** | `INTERMEDIACAO NA COMPRA DE MOEDA` | **3%** | **100301** | 000 / 000001 | [CONFIRMADO] NFS-e nº 2 |
| Comissão do vendedor | **10.05.01** | **003** | **1.0201.00.00** | `INTERMEDIACAO NA VENDA DE MOEDA` | **3%** | **100301** | 000 / 000001 | [CONFIRMADO] NFS-e nº 3 |
| Tarifa de saque | **11.04.01** | **001** | **1.0602.90.00** | `TARIFA DE SAQUE - REF SAQ-…` | **5%** | **050101** | 000 / 000001 | [CONFIRMADO] contador, 23/10/2026 |
| Taxa de retirada da moeda | **11.04.01** | **001** | **1.0602.90.00** | `TAXA DE RETIRADA DE MOEDA DA CUSTODIA - MOEDA RO-… - REF RET-…` | **5%** | **050101** | 000 / 000001 | [CONFIRMADO] contador, 23/10/2026 |
| Frete do envio | — | — | — | **sem NFS-e**: despesa do cliente, não é serviço da empresa | — | — | — | [CONFIRMADO] contador, 23/10/2026 |

Campos fixos em toda nota [CONFIRMADO salvo indicação]:

- Prestador: CNPJ 68071452000106, **inscrição municipal 1.795.745/001-4** (campo `IM` = `17957450014`, conselho do
  contador de 23/10/2026), **não optante do Simples** (`opSimpNac` = 1), regime especial nenhum. A Sefin só aceita a
  IM se BH a tiver no cadastro nacional complementar (CNC); sem esse registro ela recusa com **E0120**, e o envio
  repete a mesma DPS sem a IM — foi o que a produção restrita respondeu em 23/10/2026, e as notas do contador também
  saíram sem IM. Recusa não gera nota nem gasta número.
- Local da prestação e município de incidência do ISS: **Belo Horizonte, IBGE 3106200**. Atenção: no subitem 11.04 o
  ISS é do município **onde a moeda está guardada** (LC 116 art. 3º, XVII) — se o cofre sair de BH, muda. [LEI]
- ISS **não retido** (tomadores são pessoas físicas).
- **A alíquota do ISS não vai na DPS**: para não optante em município conveniado, enviá-la é erro (E0617); a Sefin
  aplica 5% ou 3% sozinha. O sistema só a usa para exibir e conferir. [LEI]
- PIS/COFINS: CST 01, **0,65% e 3,00%** (cumulativo do Lucro Presumido), não retidos. [CONFIRMADO]
- Tributos aproximados (Lei 12.741/2012): Federais **11,33%**; Estaduais 0%; Municipais = alíquota do ISS.
  [CONFIRMADO]; a fonte dos 11,33% (tabela IBPT?) é pergunta ao contador.
- IBS/CBS 2026: a DPS informa CST, cClassTrib e cIndOp; **quem calcula os valores é a Sefin**. Base = valor −
  ISS − PIS − COFINS (na custódia de R$ 2,00: 2,00 − 0,10 − 0,01 − 0,06 = **1,83**); CBS 0,9%, IBS estadual 0,1%. O
  total da nota **não** soma IBS/CBS em 2026. [LEI] LC 214 art. 12 §2º, arts. 343 e 346
- **Indicador de operação (`cIndOp`) = 100301 na intermediação e 050101 na custódia** (e na tarifa de saque e na
  retirada, que usam o código da custódia). [CONFIRMADO] contador, 23/10/2026.
- **`tpOper` (tipo de operação), só nas notas de intermediação = `5`** ("fornecimento e recebimento do pagamento
  concomitantes"). [PESQUISA, 23/10/2026; a resposta do contador à pergunta tratou do indicador de operação acima]
  - **Por que é obrigatório:** a regra E0903 do Anexo I exige o `tpOper` em todo serviço 10.05, mesmo que o campo
    tenha sido desenhado para imóveis e compras governamentais (LC 214 arts. 10 §2º e 254 IV).
  - **Por que 5:** a comissão é debitada no mesmo instante em que a negociação casa, então o serviço e o pagamento
    acontecem juntos. Os valores 2 e 3 exigiriam referenciar outra NFS-e (E0905). O 1 e o 4 descrevem pagamento
    antes ou depois do serviço, o que não acontece aqui.
  - **Na custódia o campo não vai:** a regra E0904 rejeita o `tpOper` fora dos subitens 25.05, 15.09, 17.12 e 10.05.
- **`indFinal` = `0` (não)** em todas as notas. [CONFIRMADO] contador, 23/10/2026: o "sim" é o da nota sem dados
  do cliente (o cupom de um estacionamento); aqui todas têm cliente identificado.
- **Grupo IBS/CBS sempre informado** — no Emissor Web é a pergunta do início do preenchimento, que o contador
  manda responder "SIM" (23/10/2026). A DPS automática sempre leva o grupo `IBSCBS`. [CONFIRMADO]
  - **O que o campo marca:** o art. 57 lista bens e serviços de uso pessoal (joias, metais preciosos, obras de arte,
    antiguidades, recreativos…) para impedir que um **contribuinte** adquirente tome crédito de IBS/CBS sobre eles.
  - **Por que 0:** os tomadores são pessoas físicas, que não tomam crédito, e o serviço não é fornecido de graça nem
    abaixo do valor de mercado (inciso II).
  - **Ponto de atenção:** a LC 227/2026 incluiu no art. 57 a alínea "g", "serviços relacionados à aquisição ou à
    manutenção" desses bens. Se o contador entender que a custódia de moeda de metal precioso se enquadra, o valor
    muda para 1. É uma linha de configuração, sem mexer na lógica.
  - **Sobre o leiaute:** o campo é opcional. O Anexo I v1.01 o dava como "a descontinuar", e a NT 009 o reinseriu
    para 01/12/2026. Se a produção restrita o recusar antes disso, ele é omitido.
- **Série da DPS por API: entre 00001 e 49999** (a 70000 das notas do contador é exclusiva do Emissor Web). A
  numeração da NFS-e (nNFSe) é única por emitente e continua: as nossas virão a partir do nº 4. [LEI] Anexo I E0010
- O texto da nota segue as notas do contador (maiúsculas, sem acento) e cita a razão social **AUREA CUSTODIA LTDA**,
  nunca a marca. Nenhuma palavra proibida pelo jurídico (ver CLAUDE.md).

---

## R4. Valores e arredondamento

1. **Dinheiro sempre em centavos inteiros** (regra da casa). A nota recebe o valor em reais com duas casas.
2. **A base de todo tributo é o valor bruto cobrado do cliente** — nunca o líquido recebido do Mercado Pago.
   [LEI] Lei 9.718 art. 3º §2º (sem exclusão de taxa de gateway); STF Tema 1024; LC 116 art. 7º
3. **Percentuais nunca entram fixos no código** (regra já existente da DRE). Vêm de `aurea.parametros_contabeis` e,
   para a nota, da própria Sefin. **Mudança necessária:** hoje existe **um** `issBp` para toda a receita; BH cobra 5% na
   custódia e 3% na intermediação, então o ISS precisa ser **por tipo de serviço** (ver `LACUNAS_E_PERGUNTAS.md`).
4. Arredondamento do PIS/COFINS da nota: a regra E0694/E0696 confere `vPis = base × alíquota` com margem. Em
   R$ 2,00, PIS = 0,013 → 0,01. Testar na produção restrita. [LEI + teste pendente]

---

## R5. Data, hora e competência

1. **Todo fato tem dois carimbos:** a **data/hora do fato** (quando aconteceu) e a **data/hora do registro** (quando
   foi gravado). Normalmente coincidem; num lançamento extemporâneo, não, e os dois aparecem. [LEI] ITG 2000 itens 6 e
   36; ECD I200 `DT_LCTO_EXT`
2. **Fuso: Brasília** (UTC−3) para competência, vencimento e virada de mês — a mesma regra do ciclo de custódia. O
   banco grava em UTC; relatório e nota mostram Brasília.
3. **Competência da NFS-e (`dCompet`) = data do fato gerador.** Pode ser passada (o contador emitiu em 22/10 com
   competência 07/10), nunca futura. [LEI] Anexo I E0015
   **Custódia: a nota sai no PAGAMENTO** ([DECIDIDO] Gabriel, 23/10/2026; [CONFIRMADO] contador, 23/10/2026: "tem
   que ser o dia da movimentação do dinheiro, ou seja, o dia do pagamento"). São duas datas diferentes:
   - **Data da nota (emissão e competência) = data e hora do pagamento** da fatura. É a partir do pagamento que a nota
     conta. Fatura não paga não gera nota nem imposto, nunca.
   - **Período de guarda que a nota cobre = o ciclo da moeda**, que começa no **aceite**: a data e a hora exatas em
     que a plataforma gera o recibo e o hash, ou seja, quando a moeda é gravada no banco e aparece no acervo do
     cliente. Vale tanto para a moeda aprovada no painel quanto para a aprovada na análise do envio. O período vai na
     descrição da nota.
   - **Exemplo do Gabriel:** moeda aceita em 25/10 e fatura paga em 05/11. A nota é emitida em 05/11, com competência
     05/11, e é a custódia do período de 25/10 a 25/11. Descrição no padrão do contador:
     `CUSTODIA MENSAL - 25/10/2026 A 25/11/2026 - 1 MOEDA`.
   - Na nota, `dCompet` leva só a data, porque o campo não tem hora. A hora exata do pagamento fica na data do fato
     do lançamento, no livro-razão e no histórico.
   - **Lacuna:** hoje a moeda guarda o aceite **só como data** (`Coin.entrada` e `recibo.dataEmissao` são `DateBR`).
     Falta um carimbo com hora, que fica em `types.ts`, superfície protegida. Ver L16 em `LACUNAS_E_PERGUNTAS.md`.
   - **Ciclos seguintes e moeda comprada:** o código aplica a mesma regra do pagamento. Há uma nota a cada
     pagamento mensal e uma no momento da compra (a custódia do 1º mês é paga dentro dela), sempre com o período
     do ciclo pago. É aplicação direta da decisão; falta a confirmação do Gabriel.
4. **Regime de competência na contabilidade:** a receita pertence ao período em que o serviço foi prestado, não ao
   do recebimento. [LEI] Lei 6.404 arts. 177 e 187 §1º; CPC 00 item 1.17
   - Comissão: momento do casamento da negociação (CPC 47 item 38).
   - Custódia: **no pagamento**, junto com a nota ([DECIDIDO] Gabriel, 23/10/2026, R5.3). Fatura em aberto não é
     receita. O sistema guarda o início e o fim do ciclo pago para a descrição da nota e para o contador.

---

## R6. Escrituração: todo evento vira lançamento em partidas dobradas

Hoje o livro-razão do sistema tem **uma perna por movimento** (a do cliente). A norma exige, em cada lançamento:
data, **conta devedora, conta credora**, histórico, valor e um identificador que una todas as partidas do mesmo
lançamento, com **numeração sequencial**. [LEI] ITG 2000 itens 6 e 7; CTG 2001 itens 5 a 7; RIR art. 273 §2º

1. **Cada fato gera um lançamento completo** (débitos = créditos), com `num_lcto` único e sequencial, ligado ao
   documento de origem (ID da negociação, ID do pagamento no Mercado Pago, nº da NFS-e, ID do saque, protocolo do
   envio). Uma negociação gera **um** lançamento com várias partidas (CTG 2001 item 7). [LEI]
2. **O livro-razão de cada cliente é o razão auxiliar** da conta de passivo "Recursos de clientes a repassar". A soma
   dos saldos de todos os clientes precisa ser **igual, todo dia**, ao saldo dessa conta no Diário. [LEI] ITG 2000 item
   18; RIR art. 273 §§3º e 5º; CC art. 1.184 §1º
3. O ledger atual (append-only, hash SHA-256 encadeado) **continua** sendo a fonte; as partidas dobradas são derivadas
   dele por uma tabela fixa "tipo de evento → contas" (seção 8). Assim nada do que existe se perde. [PROPOSTA]
4. **Plano de contas com no mínimo 4 níveis**, mapeável para o Plano de Contas Referencial da Receita (ECD, registro
   I051). Proposta completa em `pesquisa/PESQUISA_CONTABIL_E_TRIBUTARIA.md` §6.2; resumo na seção 8. [LEI] CTG 2001
   item 8
5. Códigos e abreviaturas nos históricos só valem com **tabela de significado** publicada (este documento cumpre esse
   papel para os tipos de evento). [LEI] CC art. 1.183 parágrafo único; ITG 2000 item 11

---

## R7. As colunas de cada registro

Nenhuma norma fixa leiaute de colunas; ela fixa o conteúdo mínimo. Traduzido em colunas [LEI → PROPOSTA]:

**Livro Diário (empresa)**
`Nº lançamento` · `Data do fato` · `Data do registro` · `Tipo (N normal / X extemporâneo)` · `Conta devedora (código e
nome)` · `Conta credora (código e nome)` · `Valor` · `Histórico` · `Documento de origem` · `Participante (cliente)` ·
`ID do evento no sistema`

**Livro Razão (por conta da empresa)**
`Data do fato` · `Nº lançamento` · `Histórico` · `Contrapartida` · `Débito` · `Crédito` · `Saldo após (D/C)` — com
saldo inicial e final do período.

**Razão auxiliar do cliente (o livro-razão de cada usuário no painel)**
Tudo do Razão, mais: `Cliente` · `Tipo do evento` · `Natureza (receita / recurso de cliente / dedução…)` ·
`Por que não é receita` (quando for o caso) · `NFS-e (nº e chave)` quando gerar receita · `Moeda (tipo e qtd)` ·
`Origem (automático / painel: quem)` · `Motivo e lançamento corrigido` (correções) · `Hash anterior` · `Hash`.

**Extrato do cliente (padrão de mercado digital, como extrato bancário)**
`Data e hora` · `Descrição` · `Documento` · `Entrada` · `Saída` · `Saldo`. O extrato é a visão do cliente da subconta
dele; não precisa mostrar contas da empresa, mas cada linha precisa bater com uma linha do razão auxiliar.

**Razonete (conta T)** — recurso de conferência, não obrigatório: débito à esquerda, crédito à direita, saldo embaixo.
Útil na tela contábil do painel para mostrar como um evento moveu cada conta.

**Exportação para o contador (ECD)** — o formato acima já cobre os registros I200 (lançamento: nº, data, valor, N/X,
data do fato no extemporâneo) e I250 (partidas: conta, D/C, valor, histórico, documento, participante). [LEI,
SECUNDÁRIA para o leiaute exato]

---

## R8. Histórico: o texto de cada lançamento

O histórico precisa expressar a **essência econômica** do fato. Padrão: **o quê + de quem + quanto/quantas +
referência do documento + data/hora do fato + (correções) motivo, lançamento corrigido e quem autorizou**.
[LEI] ITG 2000 itens 6(d), 8 e 32

Modelos [PROPOSTA]:

- Depósito: `Depósito Pix do cliente {nome} — pagamento Mercado Pago {id} em {data hora}. Recurso de cliente, não é receita.`
- Negociação: `Negociação {T-id} em {data hora}: {qtd} moeda(s) {tipo} a R$ {preço}; comprador {A}, vendedor {B}. Comissão 0,5% + R$ 1,00 por moeda de cada lado — NFS-e {nº comprador} e {nº vendedor}. O valor da moeda é repasse entre clientes, não é receita.`
- Custódia: `Custódia do lote {L} — ciclo {início} a {fim}, {n} moeda(s) × R$ 2,00 — fatura {F} — NFS-e {nº}.`
- Saque: `Saque Pix solicitado por {cliente} em {data hora}: R$ {líquido} ao cliente + tarifa R$ 5,00 (NFS-e {nº}). O valor líquido é devolução de recurso do cliente.`
- Taxa do gateway: `Tarifa Mercado Pago do pagamento {id} ({meio}, liberação {data}): R$ {taxa} sobre R$ {bruto}.`
- Correções: ver R9.

---

## R9. Correções feitas pelo painel administrativo

1. **Nada se edita nem se apaga.** Correção é sempre lançamento novo, de uma destas formas [LEI] ITG 2000 itens 31–36:
   - **Estorno** — o inverso exato de um lançamento errado (cobrança em duplicidade, cobrança indevida);
   - **Transferência** — move o valor da conta errada para a certa (crédito no cliente A que era do B);
   - **Complementação** — completa ou reduz a diferença (cobrado a maior ou a menor);
   - **Extemporâneo** — fato que devia ter sido lançado em outra data (cobrança retroativa de custódia).
2. **O painel exige, antes de gravar:** forma da correção, **motivo** (texto + categoria), **nº do lançamento
   corrigido** quando houver, **data real do fato**, documento de suporte (incidente, fatura, pagamento) e quem
   autorizou. O histórico é montado desses campos. [LEI → PROPOSTA]
3. **"Ajuste sem causa" não é destino final.** Diferença sem explicação vai para a conta transitória "Diferenças de
   conciliação a apurar" e fica como pendência até a retificação. [LEI] DL 1.598 art. 12 §2º (passivo com obrigação
   inexistente é presunção de omissão de receita)
4. **Correção em receita já com NFS-e:** cancelar a nota (ou substituí-la) e registrar o estorno como **serviço
   cancelado** (dedução). Correção que muda receita de mês **já apurado** exige retificar a apuração daquele mês —
   decisão e procedimento do contador. Exercício já encerrado vai a "Ajustes de exercícios anteriores" no patrimônio
   líquido, não ao resultado do ano. [LEI] NBC TG 1002 itens 5.2 e 10.5; CPC 23 item 42
5. Correção que o sistema faz porque um saldo mudou sem fato gerador (o `ajuste` automático de hoje) continua
   existindo como alarme, mas aparece como **pendente de retificação** até alguém classificá-lo. (Já é o
   comportamento desde 21/10/2026, ver `docs/TERMINOLOGIA_CONTABIL_LIVRO_RAZAO.md`.)
6. Toda correção aparece **em todos os lugares** ao mesmo tempo: extrato do cliente, razão auxiliar, Diário, DRE e
   controle financeiro — porque todos leem o mesmo lançamento.

Modelos de histórico de correção (com os campos obrigatórios) estão em
`pesquisa/PESQUISA_CONTABIL_E_TRIBUTARIA.md` §5.3.

---

## R10. Taxas do Mercado Pago

1. **A taxa nunca é fixa no código.** Para cada pagamento, a taxa real é `transaction_amount −
   transaction_details.net_received_amount`, lida do próprio Mercado Pago (já é assim hoje). [CONFIRMADO no código]
2. Cada taxa vira **lançamento de despesa** ligado ao pagamento (conta "Tarifas de meios de pagamento"), e o
   recebimento entra **pelo bruto** na receita ou no passivo do cliente. Nunca receita líquida. [LEI] CPC 26 item 32
3. Taxa sobre **depósito de cliente** é despesa da empresa enquanto a empresa a absorver (o cliente recebe o valor
   cheio). Se um dia for repassada ao cliente, sai do saldo dele e deixa de ser despesa. [PROPOSTA]
4. **Conciliação mensal contra o relatório de Liberações do Mercado Pago** (`/v1/account/release_report`), que traz
   bruto, taxa, líquido, data de liberação e a nossa referência externa. Esse relatório também é o **comprovante da
   despesa** para o contador. [LEI do provedor: documentação oficial]
5. Tabela de taxas vigentes, fluxo a fluxo, com exemplos em R$ 100,00 e R$ 2,00: `TAXAS_MERCADO_PAGO.md`.

---

## R11. Segregação do dinheiro e conciliação diária

1. Na contabilidade, a conta do Mercado Pago tem duas subcontas: **recursos de clientes** e **recursos próprios**.
   Quando uma receita é cobrada do saldo do cliente, o valor passa de uma para a outra. [PROPOSTA; ver ressalva
   regulatória neutra em `pesquisa/PESQUISA_CONTABIL_E_TRIBUTARIA.md` §7]
2. **Todo dia o sistema confere** [PROPOSTA, base: fala do contador em 16/10 — "desde que a contabilidade realize o
   fechamento adequado dos saldos"]:

   ```
   Saldo disponível no Mercado Pago + valores em liberação
     = soma dos saldos dos clientes
     + saques pedidos e ainda não pagos
     + fretes recebidos e ainda não repassados (se forem repasse)
     + receita de custódia recebida e ainda não apropriada (se houver diferimento)
     + recursos próprios ainda no Mercado Pago
   ```
   Diferença → "Diferenças de conciliação a apurar", com alerta no painel.
3. **Por que isso é obrigatório e não capricho:** desde a IN RFB 2.278/2025 o Mercado Pago informa à Receita a
   movimentação da conta (e-Financeira). Esse volume é muito maior que a receita. Depósito cuja origem não se comprove
   é **presumido receita omitida** (Lei 9.430 art. 42). A conciliação, ligando cada pagamento a um cliente e a um
   lançamento, é a prova de que não é. [LEI]
4. Transferências internas entre clientes (compra paga com saldo) **não têm documento bancário**: o documento é o
   próprio registro do sistema com data, hora, partes, valores e ID — confirmado como suficiente pelo contador, desde
   que os saldos fechem. [CONFIRMADO]

---

## R12. Tributos sobre a receita (Lucro Presumido)

| Tributo | Base | Alíquota | Observação |
|---|---|---|---|
| ISS (BH) | receita de cada serviço | 5% custódia (11.04) · 3% intermediação (10.05) | [CONFIRMADO] notas; [LEI] Lei Municipal 8.725/2003 art. 14 |
| PIS | receita bruta | 0,65% | cumulativo; [CONFIRMADO] |
| COFINS | receita bruta | 3% | cumulativo; [CONFIRMADO] |
| IRPJ | 32% da receita bruta de serviços | 15% + 10% sobre o que passar de R$ 60 mil de base no trimestre | [LEI] Lei 9.249 arts. 3º e 15 |
| CSLL | 32% da receita bruta de serviços | 9% | [LEI] Lei 9.249 art. 20; Lei 7.689 art. 3º |
| IBS / CBS 2026 | valor − ISS − PIS − COFINS | 0,1% / 0,9% | destaque na nota; recolhimento dispensado se as obrigações acessórias estiverem em dia (LC 214 art. 348 §1º) |

Os valores numéricos continuam **fora do código**: o contador preenche em `/admin/resultados/contabil`. A tabela acima
é o que ele deve preencher, conforme as notas que ele mesmo emitiu.

---

## R13. Guarda dos registros

- XML de cada NFS-e e de cada evento (cancelamento, substituição), lançamentos, trilha do painel, comprovantes do
  Mercado Pago e relatórios de liberação: **no mínimo 5 anos contados do 1º dia do ano seguinte** (CTN arts. 173, 174
  e 195), **recomendado 10 anos**, e nunca apagar com processo aberto. [LEI + PROPOSTA]
- Dado fiscal tem base legal na LGPD para ser retido (cumprimento de obrigação legal); a política de retenção de dados
  pessoais precisa citar isso.
- Documento eletrônico com integridade comprovada (o hash encadeado) vale como prova (MP 2.200-2 art. 10 §2º; Lei
  12.682 art. 2º-A). [LEI]

---

## R14. Pré-requisitos para emitir (o que a empresa precisa ter)

1. **Certificado digital e-CNPJ A1 (ICP-Brasil)** da AUREA CUSTODIA LTDA, que assina cada nota e autentica a conexão.
   A API não aceita usuário e senha, nem procuração de terceiro. [LEI] P&R NFS-e itens 17.1 e 17.2
   **[TEMOS] — recebido em 23/10/2026:** e-CNPJ A1 emitido pela AC SAFEWEB RFB v5, titular "AUREA CUSTODIA
   LTDA:68071452000106", **válido de 04/08/2026 a 04/08/2027** (renovar antes de julho/2027; vencido, a emissão para).
   Tem os usos que a API exige: assinatura digital, não repúdio e autenticação de cliente TLS.
   **Onde fica:**
   - o arquivo original em `docs/privado/certificados/`, pasta que o Git ignora;
   - no `.env.local`, em `NFSE_CERT_PFX_BASE64` (o arquivo em Base64) e `NFSE_CERT_SENHA`;
   - em produção, nessas mesmas duas variáveis, marcadas como *Sensitive* na Vercel.
   **Nunca no repositório**: o repositório é público, e o arquivo com a senha permite assinar como a empresa (notas,
   e-CAC, contratos). Também não precisa estar lá, porque o código lê o certificado da variável de ambiente, só no
   servidor.
2. **Cadastro do cliente** com CPF válido e endereço completo com CEP (R2.3).
3. **Respostas do contador** às perguntas de `LACUNAS_E_PERGUNTAS.md` (tarifa de saque, frete, granularidade,
   competência da custódia, `tpOper`, `indFinal`).
4. **Testes na produção restrita** (ambiente de testes oficial) antes de ligar em produção — já no leiaute da
   **NT 009**, que vira obrigatório em **01/12/2026**.

---

## Seção 8 — Tabela "evento → partidas" (resumo)

Contas pelo plano proposto (códigos ilustrativos; o contador mapeia ao referencial da Receita). Exemplos completos com
razonetes: `pesquisa/PESQUISA_CONTABIL_E_TRIBUTARIA.md` §6.3. Taxas do Mercado Pago nos exemplos são as de tabela.

| Evento | Débito | Crédito | NFS-e |
|---|---|---|---|
| Depósito Pix R$ 100 (taxa 0,99%) | MP recursos de clientes 99,01 · Tarifas de meios de pagamento 0,99 | Recursos de clientes – cliente 100,00 | não |
| Negociação R$ 200 (comprador paga 202, vendedor recebe 198) | Recursos de clientes – comprador 202,00 | Recursos de clientes – vendedor 198,00 · Receita de intermediação 2,00 (comprador) · Receita de intermediação 2,00 (vendedor) | 2 notas 10.05 |
| Custódia do 1º mês na compra | Recursos de clientes – comprador 2,00 | Receita de custódia 2,00 | 1 nota 11.04 |
| Custódia paga com saldo | Recursos de clientes – cliente 2,00 | Receita de custódia 2,00 | 1 nota 11.04 |
| Custódia paga no cartão (taxa ~4,98%) | MP em liberação 1,90 · Tarifas de meios de pagamento 0,10 | Receita de custódia 2,00 | 1 nota 11.04 |
| Pedido de saque (R$ 100 + R$ 5) | Recursos de clientes – cliente 105,00 | Saques a pagar 100,00 · Receita de tarifa de saque 5,00 | 1 nota 11.04.01, no pedido |
| Pagamento do saque | Saques a pagar 100,00 | MP recursos de clientes 100,00 | não |
| Saque recusado | Saques a pagar 100,00 · Serviço cancelado 5,00 | Recursos de clientes – cliente 105,00 | nota cancelada sozinha (evento 101101) |
| Frete do envio (despesa do cliente — contador, 23/10/2026) | Recursos de clientes – cliente | Fretes de clientes a pagar aos Correios (e, no pagamento da fatura: D Fretes a pagar / C caixa) | não |
| Tarifa de saque | (já no pedido de saque, acima) | Receita de armazenamento 5,00 | 1 nota 11.04.01 |
| Taxa de retirada paga | Recursos de clientes – cliente (ou caixa, se Pix/cartão) | Receita de armazenamento | 1 nota 11.04.01 |
| Estorno de cobrança indevida | Receita (ou Serviço cancelado, se já houver nota) | Recursos de clientes – cliente | cancelar a nota |
| Fechamento do mês | ISS, PIS, COFINS (deduções) | ISS, PIS, COFINS a recolher | — |
| Segregação após cada receita cobrada do saldo | MP recursos próprios | MP recursos de clientes | — |
