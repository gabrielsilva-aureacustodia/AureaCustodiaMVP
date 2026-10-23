# Pesquisa contábil e tributária: escrituração, receita e tributos de uma plataforma de custódia e marketplace

**Entidade:** AUREA CUSTODIA LTDA (marca Real Olímpico), Belo Horizonte/MG. Tributada pelo Lucro Presumido, com PIS/COFINS cumulativos.
**Data da pesquisa:** 22/10/2026
**Finalidade:** dizer o que os registros gerados pelo sistema (ledger, razão auxiliar por cliente, extratos, DRE e controle financeiro) precisam conter para atender à lei e às normas contábeis, e como cada evento deve ser lançado.

**Legenda de confiabilidade (usada em todo o texto):**
- **[OFICIAL: conferido]**: li o texto no site oficial (Planalto, CFC, CVM/CPC ou Receita Federal) durante esta pesquisa.
- **[OFICIAL: não conferido]**: a norma é oficial, mas não consegui abrir o texto oficial (o portal normas.receita.fazenda.gov.br carrega por JavaScript e não abre em leitura automatizada). O conteúdo veio de transcrição ou de resumo de terceiros.
- **[SECUNDÁRIA]**: comentário de consultoria, blog, fórum ou escritório. Serve de indício, não de fundamento.
- **[PROPOSTA]**: sugestão minha de modelagem, sem base normativa direta. Precisa do aval do contador.

> Este material não é parecer contábil nem jurídico. A escrituração e as demonstrações são atribuição exclusiva do profissional de contabilidade habilitado (ITG 2000, item 12; CTG 2001 (R3), item 13). Tudo o que está aqui serve para o sistema produzir registros que o contador consiga usar.

---

## 0. Resumo executivo

1. **O dinheiro dos clientes não é receita: é passivo.** Em contabilidade, passivo é o que a empresa deve a alguém. A receita da Áurea é só o que ela cobra pelo próprio serviço: comissão, custódia e tarifa de saque. Isso vale para a norma contábil (CPC 47, item 47 e itens B34 a B36) e para a lei tributária (DL 1.598/77, art. 12, inciso III, "resultado auferido nas operações de conta alheia"). A Receita Federal tem consulta específica sobre marketplace no mesmo sentido (SC Cosit 170/2021, que só consegui ler por fontes secundárias).
2. **No Lucro Presumido, os tributos incidem sobre a receita bruta faturada, e não sobre o lucro nem sobre o valor líquido que o Mercado Pago repassa.** A taxa do gateway (o intermediador de pagamento, aqui o Mercado Pago) é despesa da empresa e não reduz a base de PIS, COFINS, ISS, IRPJ ou CSLL. O STF fixou isso para as taxas de cartão no Tema 1024. O que de fato não é tributado é o dinheiro de cliente que passa pela conta do Mercado Pago, porque ele nunca foi receita.
3. **O ledger por cliente do sistema é um "registro auxiliar"** (ITG 2000, item 18; RIR/2018, art. 273, §§ 3º e 5º). Ele precisa de contrapartida em partidas dobradas no Livro Diário. Como hoje cada lançamento tem uma perna só, o sistema precisa gerar, ou permitir que o contador gere, o lançamento com conta devedora e conta credora (ITG 2000, item 6).
4. **Toda correção é um lançamento novo, nunca uma edição.** Existem três formas: estorno, transferência ou complementação. O histórico precisa dizer o motivo, a data e onde está o lançamento original (ITG 2000, itens 31 a 36). Lançamento feito fora da época deve dizer a data real do fato e por que foi registrado depois. O ledger append-only com hash encadeado já segue essa filosofia.
5. **A conciliação diária é a defesa fiscal.** A regra é: saldo na conta Mercado Pago (mais o que estiver em trânsito) = soma dos saldos dos clientes + valores a repassar + recursos próprios. Sem essa prova, a lei permite à Receita presumir receita omitida a partir de depósitos de origem não comprovada (Lei 9.430/96, art. 42) e de obrigações já pagas que continuam no passivo (DL 1.598/77, art. 12, § 2º).
6. **O frete repassado sem margem é zona cinzenta.** A Receita tem entendido que custos cobrados do tomador do serviço integram o preço e, portanto, a receita bruta (SC Cosit 144/2023, fonte secundária). Por outro lado, quem age em nome e por conta de terceiro só tem como receita o próprio resultado (DL 1.598, art. 12, III; CPC 47, B36). Como o contrato com os Correios está no CNPJ da Áurea, o contador precisa decidir. O sistema já separa esses valores no tipo `frete`, o que permite qualquer uma das duas leituras.
7. **ECD em 2026:** o Lucro Presumido só fica dispensado da ECD se mantiver Livro Caixa e não distribuir lucro isento acima da base presumida (IN RFB 2.003/2021, art. 3º, § 1º, V, e § 3º). A partir de 2026, há ainda retenção de 10% de IR na fonte sobre lucros acima de R$ 50 mil por mês para a mesma pessoa física (Lei 15.270/2025, que incluiu o art. 6º-A na Lei 9.250/95).
8. **IBS e CBS em 2026** são ano de teste: CBS de 0,9% (LC 214/2025, art. 346) e IBS de 0,1% (art. 343). O valor é compensável com PIS/COFINS (art. 348, I), e quem cumpre as obrigações acessórias fica dispensado de recolher (art. 348, § 1º). Na prática, o destaque na NFS-e é informativo.

---

## 1. Lei e normas da escrituração

### 1.1 Código Civil, arts. 1.179 a 1.195 [OFICIAL: conferido]
Fonte: https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm

- **Art. 1.179:** o empresário e a sociedade empresária precisam manter um sistema de contabilidade, mecanizado ou não, com escrituração uniforme dos livros, em correspondência com a documentação, e levantar todo ano o balanço patrimonial e o de resultado econômico. O § 1º deixa o número e a espécie de livros a critério da empresa, ressalvado o art. 1.180.
- **Art. 1.180:** o **Diário é indispensável**. Ele pode ser substituído por fichas quando a escrituração for mecanizada ou eletrônica.
- **Art. 1.181:** os livros obrigatórios precisam ser autenticados no Registro Público de Empresas Mercantis. No caso digital, a autenticação passa pelo SPED (ver 1.7).
- **Art. 1.182:** a escrituração fica a cargo de contabilista legalmente habilitado.
- **Art. 1.183:** a escrituração é feita em idioma e moeda nacionais, em forma contábil, em ordem cronológica de dia, mês e ano, sem espaços em branco, entrelinhas, borrões, rasuras, emendas ou transportes para as margens. O parágrafo único permite códigos numéricos ou abreviaturas, **desde que constem de livro próprio autenticado**. Para o sistema, isso significa que a tabela de tipos de lançamento e de históricos padronizados precisa estar documentada.
- **Art. 1.184:** no Diário são lançadas, "com individuação, clareza e caracterização do documento respectivo, dia a dia", todas as operações da empresa. O **§ 1º admite escrituração resumida**, com totais de até 30 dias, para contas com operações numerosas, **desde que haja livros auxiliares** para o registro individualizado e se guardem os documentos. Esse é o fundamento para o Diário trazer totais e o ledger por cliente trazer o detalhe. O § 2º manda lançar no Diário o balanço e a DRE, assinados pelo contador e pela empresa.
- **Arts. 1.185 e 1.186:** quem usa fichas pode substituir o Diário pelo livro "Balancetes Diários e Balanços", que registra a posição diária de cada conta e as demonstrações de fim de exercício.
- **Art. 1.188:** o balanço deve exprimir "com fidelidade e clareza" a situação real e indicar o ativo e o passivo separadamente.
- **Art. 1.189:** a DRE acompanha o balanço "na forma da lei especial", o que remete à Lei 6.404/76.
- **Art. 1.193:** as restrições ao exame dos livros não valem para o fisco.
- **Art. 1.194:** a empresa precisa conservar a escrituração, a correspondência e os demais papéis "enquanto não ocorrer prescrição ou decadência" dos atos neles registrados.
- Não encontrei no Código Civil exigência de "balancete" periódico fora do art. 1.186, que trata do livro Balancetes Diários, nem colunas obrigatórias para o Diário ou o Razão. Essas formalidades estão na ITG 2000 e no CTG 2001 (1.4).

### 1.2 Lei 6.404/76, arts. 177 e 187 [OFICIAL: conferido]
Fonte: https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm

- **Art. 177, caput:** a escrituração é mantida em registros permanentes, com métodos uniformes no tempo, e registra as mutações patrimoniais **"segundo o regime de competência"**. O § 2º exige que os efeitos da lei tributária fiquem em livros auxiliares ou em lançamentos adicionais, sem distorcer a escrituração societária.
- **Art. 187:** a DRE discrimina:
  - I: receita bruta, deduções, abatimentos e impostos;
  - II: receita líquida, custo dos serviços e lucro bruto;
  - III: despesas com vendas, despesas financeiras deduzidas das receitas, despesas gerais e administrativas e outras despesas operacionais;
  - IV: lucro operacional, outras receitas e outras despesas (redação da Lei 11.941/2009);
  - V: resultado antes do IR e a provisão para o imposto;
  - VI: participações;
  - VII: lucro líquido.
- **Art. 187, § 1º:** no resultado entram "as receitas e os rendimentos ganhos no período, independentemente da sua realização em moeda" e os custos e despesas correspondentes. Essa é a definição legal de competência.
- **Aplicação a uma LTDA:** a Lei 6.404 é a lei das S.A. Para a LTDA, ela vale como a "lei especial" a que remete o CC, art. 1.189, e por meio das NBC. A estrutura da DRE é a referência de mercado.

### 1.3 Regulamento do Imposto de Renda (Decreto 9.580/2018) [OFICIAL: conferido]
Fonte: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm

- **Art. 272:** a empresa precisa seguir sistema de contabilidade com escrituração uniforme, em correspondência com a documentação.
- **Art. 273:** o Diário é indispensável e precisa ser entregue em meio digital ao SPED.
  - § 1º: o Diário registra, com individuação, clareza e caracterização do documento, dia a dia, todas as operações.
  - § 2º: a individuação inclui **"a consignação expressa, no lançamento, das características principais dos documentos"**. Na prática, o lançamento precisa citar o documento de origem: ID do pedido, ID do pagamento no Mercado Pago, número da NFS-e, ID do saque.
  - § 3º: o Diário pode ser resumido, com totais de até 30 dias, para operações numerosas, com livros auxiliares e documentos guardados.
  - § 5º: os livros auxiliares, **"tais como livro-caixa e livro contas-correntes"**, ficam dispensados de autenticação quando as operações já estiverem lançadas em detalhe em livros autenticados. O ledger por cliente é, na essência, um livro de contas-correntes de clientes.
- **Art. 274:** o Livro Razão, que resume e totaliza os lançamentos do Diário por conta ou subconta, é exigência expressa **para o Lucro Real** (Lei 8.218/91, art. 14). O § 1º exige escrituração individualizada e em ordem cronológica. No Lucro Presumido, o Razão continua sendo prática contábil e consequência natural da ECD (ver 1.7).
- **Art. 600:** a empresa do Lucro Presumido precisa manter: (I) escrituração contábil nos termos da legislação comercial; (II) Livro Registro de Inventário; e (III) livros e documentos em boa guarda até a decadência e a prescrição. O **parágrafo único dispensa o inciso I para quem mantiver livro-caixa** com toda a movimentação financeira, inclusive bancária (Lei 8.981/95, art. 45).

### 1.4 ITG 2000 (R1): Escrituração Contábil (CFC) [OFICIAL: conferido]
Fonte: https://www1.cfc.org.br/sisweb/SRE/docs/ITG2000(R1).pdf

- **Item 2:** vale para todas as entidades, de qualquer porte.
- **Item 4:** o nível de detalhe deve acompanhar a complexidade das operações. **A ITG não impõe plano de contas.**
- **Item 5:** a escrituração precisa ser feita (a) em idioma e moeda nacionais; (b) em forma contábil; (c) em ordem cronológica; (d) sem espaços em branco, entrelinhas, borrões, rasuras ou emendas; (e) com base em documentos de origem externa ou interna ou, na falta deles, em elementos que comprovem os fatos.
- **Item 6, o conteúdo mínimo de cada registro:**
  - (a) **data do registro**, que é a data em que o fato contábil ocorreu;
  - (b) **conta devedora**;
  - (c) **conta credora**;
  - (d) **histórico** que represente a essência econômica da transação, ou código de histórico padronizado com tabela auxiliar em livro próprio;
  - (e) **valor**;
  - (f) **informação que identifique, de forma única, todos os registros que integram um mesmo lançamento**.
- **Item 7:** o registro deve ter **"número de identificação do lançamento em ordem sequencial"** ligado ao documento de origem.
- **Item 8:** a terminologia deve expressar a essência econômica.
- **Itens 9 e 10:** formalidades extrínsecas. No livro digital, assinatura digital da entidade e do contador e, quando a lei exigir, autenticação.
- **Item 11:** códigos e abreviaturas nos históricos são permitidos se forem permanentes e uniformes e se o significado constar no Diário ou em registro especial.
- **Item 12:** escriturar e emitir demonstrações é atribuição exclusiva do profissional habilitado.
- **Item 14:** no Diário são lançadas, em ordem cronológica, com individualização, clareza e referência ao documento, todas as operações e quaisquer outros fatos que mudem o patrimônio.
- **Item 18:** **"Os registros auxiliares, quando adotados, devem obedecer aos preceitos gerais da escrituração contábil."** Isso alcança o ledger por cliente.
- **Itens 26 a 28:** documentação contábil é tudo o que comprova os lançamentos, de origem interna ou externa, incluindo "registros". O item 28 trata da digitalização de documentos em papel.
- **Itens 31 a 36, retificação de lançamento:**
  - 31: a retificação corrige registro feito com erro e pode ser feita por **(a) estorno, (b) transferência ou (c) complementação**;
  - 32: em qualquer forma, **"o histórico do lançamento deve precisar o motivo da retificação, a data e a localização do lançamento de origem"**;
  - 33: estorno é o lançamento inverso ao feito erroneamente, que o anula totalmente;
  - 34: transferência regulariza conta debitada ou creditada indevidamente, levando o registro para a conta certa;
  - 35: complementação aumenta ou reduz o valor registrado antes;
  - 36: **lançamento extemporâneo** (feito fora da época devida) precisa trazer no histórico "as datas efetivas das ocorrências e a razão do registro extemporâneo".

### 1.5 CTG 2001 (R3): escrituração em forma digital para o SPED [OFICIAL: conferido]
Fonte: https://www1.cfc.org.br/sisweb/SRE/docs/CTG2001(R3).pdf

- **Item 5:** repete os elementos mínimos do item 6 da ITG 2000.
- **Item 7, "fórmulas" de lançamento:** cada lançamento nasce de **um único fato contábil** e pode ter (a) um débito e um crédito; (b) um débito e vários créditos; (c) vários débitos e um crédito; ou (d) vários débitos e vários créditos, quando forem do mesmo fato. Exemplo: uma negociação gera um lançamento com um débito (comprador) e dois créditos (vendedor e receita).
- **Item 8:** **o plano de contas precisa ter no mínimo 4 níveis**, seguir a estrutura dos arts. 177 a 182 da Lei 6.404, e no SPED só vão as contas com saldo ou movimento.
- **Item 9:** as demonstrações de encerramento entram no Diário com assinatura digital.
- **Itens 10 a 12:** Diário e Razão digitais formam "um conjunto único de informações". Os livros auxiliares seguem a ITG 2000.
- **Item 15:** depois de autenticada pelo SPED, a escrituração **só pode ser substituída** quando o erro não puder ser corrigido por lançamento extemporâneo (itens 31 a 36 da ITG 2000). A regra, portanto, é corrigir com lançamento novo.

### 1.6 Normas de apresentação e Estrutura Conceitual

**CPC 00 (R2) / NBC TG Estrutura Conceitual** [OFICIAL: conferido]. Fontes: https://s3.sa-east-1.amazonaws.com/static.cpc.aatb.com.br/Documentos/573_CPC00(R2).pdf e https://www1.cfc.org.br/sisweb/SRE/docs/NBCTGEC.pdf
- **Item 1.17:** o regime de competência "reflete os efeitos de transações e outros eventos e circunstâncias [...] nos períodos em que esses efeitos ocorrem, mesmo que os pagamentos e recebimentos à vista resultantes ocorram em período diferente".
- **Item 4.26:** "Passivo é uma obrigação presente da entidade de transferir um recurso econômico como resultado de eventos passados." É a base conceitual para o saldo do cliente ser passivo.

**CPC 26 (R1) / NBC TG 26 (R5): Apresentação das Demonstrações Contábeis** [OFICIAL: conferido]. Fontes: https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_26_R1_rev_14.pdf e https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG26(R5).pdf
- **Item 32:** é proibido compensar ativos com passivos ou receitas com despesas, salvo quando uma norma exigir ou permitir. A receita de comissão não pode aparecer líquida da taxa do Mercado Pago na DRE: a receita entra pelo bruto e a taxa entra como despesa.
- **Item 33:** ativos, passivos, receitas e despesas são informados separadamente.
- **Item 34:** a receita é medida pela contraprestação a que a entidade espera ter direito (remete ao CPC 47).
- **Item 82:** rubricas mínimas da DRE.
- **Itens 99 a 103:** as despesas podem ser analisadas por natureza ou por função.

**Porte da Áurea: normas simplificadas** [OFICIAL: conferido para a NBC TG 1002; SECUNDÁRIA para os limites da NBC TG 1001]. Fonte: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1002.pdf
- A **NBC TG 1002 (Microentidades)** vale para organizações com fins lucrativos e **receita bruta de até R$ 4,8 milhões por ano** (item P2), para exercícios iniciados a partir de 01/01/2023. Pelo faturamento atual, é provável que a Áurea se enquadre aqui. Se for o caso, o contador pode aplicar essa norma simplificada em vez das NBC TG completas (47, 23, 26).
  - Item 5.1, DRE mínima: receita bruta; deduções; receita líquida; custo dos serviços; resultado bruto; despesas com vendas; despesas administrativas; outras receitas e despesas operacionais; resultado antes do financeiro; receitas financeiras; despesas financeiras; resultado antes dos tributos sobre o lucro; tributos sobre o lucro; resultado líquido.
  - Item 2.13: proíbe compensar ativos e passivos ou receitas e despesas.
  - Itens 23.5 e 23.6: a receita de serviço é apropriada quando o serviço é transferido. Serviço prestado ao longo do tempo é apropriado de forma linear.
  - **Item 23.7, expediente prático:** pode-se contabilizar a receita pela emissão da nota fiscal quando isso representar adequadamente o desempenho.
  - Itens 5.2 e 10.5 a 10.6: correção de erro de exercício anterior vai para **lucros ou prejuízos acumulados** (ajuste de exercícios anteriores), e não para o resultado.
- A NBC TG 1001 (Pequenas Empresas) cobre receita entre R$ 4,8 milhões e R$ 78 milhões [SECUNDÁRIA: https://cfc.org.br/noticias/contador-conheca-as-normas-de-contabilidade-voltadas-para-as-micro-e-pequenas-empresas/].

### 1.7 Diário, Razão, razonete e extrato: colunas

**O que a norma exige.** Nenhuma norma fixa um leiaute de colunas. Ela fixa conteúdo mínimo: ITG 2000, itens 6 e 7; CTG 2001, itens 5 a 7; RIR, art. 273, §§ 1º e 2º. Traduzindo para colunas, este é o mínimo defensável [PROPOSTA baseada nessas normas]:

| Livro | Colunas mínimas |
|---|---|
| **Diário** | nº sequencial do lançamento · data do fato · (data do registro, se diferente, obrigatória no extemporâneo) · conta devedora (código e nome) · conta credora (código e nome) · histórico · valor · referência do documento (ID do pedido, ID do pagamento MP, nº da NFS-e, ID do saque) · identificador que agrupa as partidas do mesmo lançamento |
| **Razão** (por conta ou subconta) | data · nº do lançamento no Diário (remissão) · histórico · contrapartida · débito · crédito · saldo após o lançamento, com indicação D/C · saldo inicial e final do período |
| **Razão auxiliar de clientes** (o ledger atual) | o mesmo do Razão, mais: identificação do cliente (subconta) · tipo do evento · ID do documento · hash anterior e hash do registro · usuário ou processo que gerou (painel ou automático) · para ajustes, o motivo e a remissão ao lançamento corrigido |

- **Razonete (conta T):** é só um recurso didático e de conferência. Tem o débito à esquerda e o crédito à direita, e não é exigido por norma. Débito aumenta ativo e despesa; crédito aumenta passivo, PL e receita. Os exemplos da seção 6 usam essa convenção.
- **"Padrão de mercado digital" para extrato ao cliente** (data e hora · histórico · documento · débito · crédito · saldo): **não encontrei norma contábil que o imponha**. É prática de mercado (extrato bancário). O extrato ao cliente não é livro contábil: é a visão que o cliente tem da subconta dele no passivo da Áurea. Do ponto de vista dele, o crédito na conta da Áurea aparece como "entrada". Recomendo que o extrato **mostre o saldo após cada evento e a referência ao documento**, porque isso permite ao contador e ao cliente conciliar linha a linha [PROPOSTA].
- **Como o ledger atual (uma perna só) se encaixa:** cada linha do ledger é uma partida numa subconta do passivo "Saldos de clientes". Para atender à ITG 2000, item 6, alíneas (b), (c) e (f), cada evento precisa produzir **todas as partidas** do lançamento, inclusive a receita, a conta Mercado Pago e as contas a repassar, sob um **ID de lançamento comum**. Os tipos atuais se mapeiam assim:

| Tipo no sistema | Partida na subconta do cliente | Contrapartida contábil típica |
|---|---|---|
| `saldo_inicial` | crédito (o cliente passa a ter saldo) | conta de abertura ou transferência de saldos; só para a migração |
| `deposito` | crédito | D Mercado Pago (recursos de clientes) / valores a receber do gateway |
| `compra` | débito | C subconta do vendedor (valor líquido) e C receita de intermediação |
| `venda` | crédito | (parte do mesmo lançamento da compra) |
| `comissao` | débito | C receita de intermediação |
| `custodia` | débito | C receita de custódia, ou C passivo de contrato (receita diferida), ou C clientes - custódia a receber |
| `estorno` | inverso do original | inverso do original, com remissão |
| `ajuste` | D ou C | contrapartida conforme a causa (ver seção 5) |
| `saque` | débito | C saques a pagar, depois C Mercado Pago (recursos de clientes) |
| `taxa_saque` | débito | C receita de tarifa de saque |
| `taxa_retirada` | débito | C receita de serviço (retirada física; subitem da NFS-e a confirmar) |
| `frete` | débito | C fretes a repassar aos Correios **ou** C receita de frete (ver 2.5) |

### 1.8 ECD (SPED Contábil): obrigatoriedade e registros

**Obrigatoriedade (IN RFB 2.003/2021)** [OFICIAL: não conferido no portal da RFB; texto lido em transcrição integral em http://www.normaslegais.com.br/legislacao/instrucao-normativa-rfb-2003-2021.htm; norma original em http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=115842]
- **Art. 3º, caput:** a ECD é obrigatória para as pessoas jurídicas "obrigadas a manter escrituração contábil nos termos da legislação comercial".
- **§ 1º, V:** ficam dispensadas as empresas do Lucro Presumido "que cumprirem o disposto no parágrafo único do art. 45 da Lei nº 8.981/1995", ou seja, que **mantêm Livro Caixa** com toda a movimentação financeira e bancária.
- **§ 3º:** a dispensa do inciso V **não vale** para quem distribuir lucros sem retenção de IR na fonte em montante superior à base de cálculo do IR, diminuída dos impostos e contribuições.
- **§ 6º:** quem não é obrigado pode entregar a ECD de forma facultativa, inclusive para cumprir o art. 1.179 do CC.
- **Art. 5º:** prazo até o último dia útil de junho do ano seguinte (redação da IN RFB 2.142/2023), até as 23h59min59s de Brasília.
- **Art. 2º, § único (na transcrição):** os livros são assinados com certificado ICP-Brasil.
- **Leitura para a Áurea [PROPOSTA, a confirmar]:** como o sistema já mantém uma escrituração por competência, com DRE, e a intenção é distribuir lucro com base no resultado contábil, o caminho natural é **escrituração contábil completa e ECD**. Isso também é o que dá suporte à distribuição isenta acima da presunção. A RFB e o CARF entendem que quem apura pelo regime de caixa só distribui isento até a base presumida [SECUNDÁRIA: https://www.portalcontnews.com.br/?p=315243; https://revistas.apet.org.br/index.php/rdcf/article/download/16/109].
- **Novidade de 2026, a Lei 15.270/2025** [OFICIAL: conferido]: incluiu o art. 6º-A na Lei 9.250/95. Lucros pagos pela mesma empresa à mesma pessoa física acima de R$ 50.000,00 no mês sofrem retenção de 10% sobre o total. Fonte: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm

**Registros do Bloco I** [SECUNDÁRIA: transcrição do Manual de Orientação do Leiaute da ECD por consultoria; conferir no manual vigente em sped.rfb.gov.br]

| Registro | Campos | Observações |
|---|---|---|
| **I050**, plano de contas (https://www.vriconsulting.com.br/guias/guiasIndex.php?idGuia=669) | REG · DT_ALT · COD_NAT · IND_CTA · NIVEL · COD_CTA · COD_CTA_SUP · CTA | COD_NAT: 01 ativo, 02 passivo, 03 PL, 04 resultado, 05 compensação, 09 outras. IND_CTA: S (sintética) ou A (analítica). Mínimo de 4 níveis (CTG 2001, item 8). |
| **I051**, mapeamento para o Plano de Contas Referencial da RFB (https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=670) | ligação entre a conta da empresa e a conta referencial | Só contas analíticas são mapeadas. A natureza precisa coincidir (erro impeditivo a partir do leiaute 9). Para o Lucro Presumido, o referencial usual é o "PJ em Geral". |
| **I200**, lançamento (https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=678) | REG · NUM_LCTO (identificador único) · DT_LCTO · VL_LCTO · IND_LCTO · DT_LCTO_EXT | IND_LCTO: N normal, E encerramento, **X extemporâneo**. Com X, a DT_LCTO_EXT (data real do fato) é obrigatória. Se a data exata não puder ser determinada, usa-se a data de encerramento do exercício em que o fato ocorreu. |
| **I250**, partidas (https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=679) | REG · COD_CTA · COD_CCUS · VL_DC · IND_DC (D/C) · NUM_ARQ (localização do documento) · COD_HIST_PAD · HIST (até 65.535 caracteres) · COD_PART (participante, tabela 0150) | A soma dos débitos e a soma dos créditos de cada I200 precisam bater com VL_LCTO. No extemporâneo, o HIST traz o motivo, a data e o número do lançamento de origem. Segundo fonte secundária (TOTVS), o PVA não aceita lançamento extemporâneo X em conta de resultado (https://tdn.totvs.com/display/public/PROT/ECD_SPED_CONTABIL_Alteracoes_para_Leiaute_7_00). Conferir no manual. |

- **Implicação para o sistema [PROPOSTA]:** gravar em cada lançamento um `num_lcto` único e sequencial, `dt_fato`, `dt_registro`, `ind_lcto` (N/X) e um campo `documento` (que vira NUM_ARQ). Isso permite exportar o I200/I250 sem retrabalho. Cada cliente pode ser subconta analítica do passivo **ou** um "participante" (COD_PART) numa conta única. Com centenas de clientes, a segunda opção costuma ser mais leve, mas a escolha é do contador.
- **Plano de Contas Referencial:** o plano da empresa é livre (ITG 2000, item 4), mas precisa ser mapeado para o referencial da RFB (I051 na ECD; P100 e P150 na ECF do Lucro Presumido) [SECUNDÁRIA: https://www.cigam.com.br/wiki/index.php/Registro_P100_e_P150_da_ECF-_Escritura%C3%A7%C3%A3o_Cont%C3%A1bil_Fiscal]. **Não reproduzi códigos referenciais** porque não consegui abrir a tabela oficial. Eles vêm das tabelas dinâmicas do programa da ECD/ECF.

### 1.9 Validade dos documentos eletrônicos [OFICIAL: conferido]
- **MP 2.200-2/2001, art. 10** (https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm): documentos eletrônicos são documentos públicos ou particulares para todos os fins legais. O § 1º presume verdadeiras as declarações assinadas com certificado ICP-Brasil. O **§ 2º admite outros meios de comprovar autoria e integridade**, inclusive certificados fora da ICP-Brasil, "desde que admitido pelas partes como válido ou aceito pela pessoa a quem for oposto o documento". Os registros do sistema, com trilha de auditoria e hash encadeado, servem como prova de integridade. O aceite nos Termos de Uso reforça essa prova.
- **Lei 14.063/2020** (https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm): o art. 4º classifica as assinaturas eletrônicas em simples, avançada e qualificada (ICP-Brasil). **Atenção:** o art. 2º restringe esse capítulo às interações com e entre entes públicos. Para relações privadas, o fundamento continua sendo a MP 2.200-2.
- **Lei 12.682/2012, art. 2º-A** (incluído pela Lei 13.874/2019; https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12682.htm): autoriza o armazenamento eletrônico de documentos privados. O documento digital tem o mesmo valor probatório do original, "inclusive para atender ao poder fiscalizatório do Estado" (§ 2º). Os documentos podem ser eliminados depois de decorrida a decadência ou a prescrição (§ 3º).
- **Decreto 10.278/2020** (https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/d10278.htm): regulamenta a digitalização de documentos físicos para que produzam os mesmos efeitos dos originais (art. 1º). O art. 4º exige integridade, confiabilidade, rastreabilidade e auditabilidade. Vale para comprovantes em papel, como recibos dos Correios e termos de entrega de moedas.
- **ECD:** precisa de assinatura com certificado ICP-Brasil da empresa e do contador (IN RFB 2.003/2021, art. 2º; CTG 2001, item 13).

### 1.10 Prazos de guarda [OFICIAL: conferido]
- **CTN, art. 173** (https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm): o direito de lançar o tributo se extingue em 5 anos contados do primeiro dia do exercício seguinte àquele em que o lançamento poderia ter sido feito.
- **CTN, art. 150, § 4º:** no lançamento por homologação, o prazo é de 5 anos a partir do fato gerador, salvo dolo, fraude ou simulação. Nesses casos aplica-se a regra do art. 173.
- **CTN, art. 174:** a cobrança prescreve em 5 anos da constituição definitiva do crédito.
- **CTN, art. 195, parágrafo único:** os livros obrigatórios e os comprovantes dos lançamentos são guardados **"até que ocorra a prescrição dos créditos tributários"** das operações a que se referem.
- **CC, art. 1.194, e RIR, art. 600, III:** guarda enquanto não houver decadência ou prescrição.
- **Na prática [PROPOSTA]:** como a decadência (até 5 anos contados do 1º dia do exercício seguinte) e a prescrição (5 anos após a constituição) se somam, um fato de janeiro/2026 pode precisar de prova até cerca de 2036, se houver lançamento de ofício perto do fim do prazo. Recomendo **reter ledger, trilha de auditoria, NFS-e e comprovantes do Mercado Pago por no mínimo 10 anos** e nunca apagá-los enquanto houver processo administrativo ou judicial aberto. O mínimo absoluto, sem litígio, fica em torno de 6 anos. A LGPD (retenção de dados pessoais) é ponto à parte: o dado fiscal tem base legal para ser retido (cumprimento de obrigação legal).

---

## 2. Reconhecimento de receita

### 2.1 Principal ou agente: o marketplace reconhece só a comissão [OFICIAL: conferido]
Fontes: CPC 47 (https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_47_Rev_14.pdf); NBC TG 47 (https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG47.pdf)

- **Item B34:** quando outra parte participa do fornecimento, a entidade decide se a promessa dela é fornecer o bem ela mesma (é **principal**) ou providenciar que outra parte o forneça (é **agente**). A decisão é feita para cada bem ou serviço.
- **Item B36:** o agente **não controla** o bem antes de ele ir ao cliente e reconhece como receita "o valor de qualquer taxa ou comissão". A comissão pode ser o valor líquido que sobra depois de pagar à outra parte.
- **Item B37, indicadores de que a entidade é principal:** (a) é a responsável principal pela entrega; (b) **tem risco de estoque**; (c) define o preço.
  - Na Áurea, a moeda é do vendedor; a Áurea não a compra nem assume risco de estoque; o preço é definido pelas ofertas dos clientes. **A Áurea é agente na venda da moeda.**
  - Por isso, na negociação de R$ 200, a receita é **R$ 4,00**: R$ 2,00 de cada lado, sendo 0,5% de R$ 200 = R$ 1,00, mais R$ 1,00 por moeda.
- **Item 47:** o preço da transação exclui **"quantias cobradas em nome de terceiros"**.
- **Na lei tributária:** o DL 1.598/77, art. 12, inclui na receita bruta "III - o resultado auferido nas operações de conta alheia" [OFICIAL: conferido, https://www.planalto.gov.br/ccivil_03/decreto-lei/del1598.htm].
- **Na Receita Federal:** a **SC Cosit 170/2021** concluiu que a receita bruta do marketplace é só a comissão de intermediação. A receita "não compreenderá a entrada de recursos que não lhe pertencem e que serão repassados aos terceiros", para IRPJ, CSLL, PIS e COFINS [SECUNDÁRIA: https://www.migalhas.com.br/depeso/356011/a-solucao-de-consulta-cosit-70-21-e-a-tributacao-do-marketplace; https://tributodevido.com.br/portal/tributacao-em-marketplace/]. Segundo essas fontes, a consulta enquadrou a comissão no inciso II (preço do serviço). O comentário destaca dois requisitos: contrato entre o vendedor e a plataforma, e documento fiscal de cada operação.
  - Para a Áurea, isso significa: Termos de Uso que descrevam a intermediação e NFS-e da comissão.
  - **Ressalva:** solução de consulta só vincula formalmente quem consultou e as que forem vinculadas a ela, mas mostra o entendimento da RFB.

### 2.2 Quando reconhecer [OFICIAL: conferido]
- **Custódia, mensal: obrigação satisfeita ao longo do tempo.** O CPC 47, item 35(a), aplica-se quando o cliente "recebe e consome simultaneamente os benefícios", e o item B3 cita "serviços rotineiros ou recorrentes". Pelo item B16, quando o valor faturado corresponde diretamente ao desempenho (R$ 2,00 por moeda por mês), pode-se reconhecer pelo valor que se tem direito a faturar. Na NBC TG 1002, os itens 23.5 e 23.6 mandam apropriar de forma linear.
  - **Consequência:** como o ciclo é por moeda e conta do dia de aceite (por exemplo, de 02/10 a 01/11), uma fatura paga em 02/10 cobre dois meses-calendário. Pelo rigor do CPC 47, a parte não decorrida em 31/10 é **passivo de contrato**, ou receita diferida (item 106: quando o cliente paga antes de a entidade transferir o serviço, a entidade "deve apresentar o contrato como passivo de contrato").
  - Para microentidade, a NBC TG 1002, item 23.7, permite reconhecer na emissão da NFS-e se isso representar adequadamente o desempenho. Com valores mensais pequenos e recorrentes, o efeito tende a ser imaterial. **Decisão do contador.**
- **Comissão: obrigação satisfeita em momento específico** (CPC 47, item 38): no casamento da negociação, quando a moeda muda de dono.
- **Tarifa de saque:** no momento em que o saque é processado. Se o saque for recusado e estornado, a tarifa também é estornada.
- **Custódia do 1º mês embutida na compra** (regra de 21/10/2026): é receita de custódia, e não comissão, apropriada ao longo dos 30 dias de cobertura pelo mesmo critério acima.

### 2.3 Dinheiro de clientes é passivo, com subcontas por cliente
- **Por que não é receita:** o depósito do cliente gera para a Áurea a obrigação de devolvê-lo ou de usá-lo por ordem do cliente. Isso é passivo pela definição do CPC 00, item 4.26 [OFICIAL: conferido]. Não é contraprestação por serviço; o CPC 47, item 47, exclui valores cobrados em nome de terceiros. Para o fisco, não é "preço da prestação de serviços" (DL 1.598, art. 12, II) nem resultado próprio (inciso III).
- **Estrutura recomendada [PROPOSTA, com base na ITG 2000, item 18, no RIR, art. 273, §§ 3º e 5º, e no CC, art. 1.184, § 1º]:**
  - Conta sintética no passivo circulante, **"Recursos de clientes a repassar"** (ou "Saldos de clientes"), com **subcontas analíticas por cliente** ou, alternativamente, uma conta analítica com controle por participante (COD_PART na ECD).
  - O **ledger do sistema é o razão auxiliar** dessa conta. O saldo da conta de controle no Diário precisa ser igual, todo dia, à soma dos saldos do ledger.
  - Contas separadas para: saques solicitados a pagar; fretes a repassar; receita diferida de custódia.
- **Por que a conciliação é crítica (riscos fiscais concretos)** [OFICIAL: conferido]:
  - **Lei 9.430/96, art. 42** (https://www.planalto.gov.br/ccivil_03/leis/l9430.htm): valores creditados em conta de depósito ou de investimento cuja origem o titular, intimado, não comprove "mediante documentação hábil e idônea" **são presumidos omissão de receita**. Os depósitos de clientes na conta Mercado Pago precisam ser rastreáveis um a um: ID do pagamento MP ligado ao cliente e ao lançamento.
  - **DL 1.598/77, art. 12, § 2º:** saldo credor de caixa ou "a manutenção, no passivo, de obrigações já pagas" autoriza presunção de omissão de receita. **Saldo de cliente que já foi sacado e continua no passivo, ou saldo inflado por erro, é exatamente isso.** Ajustes e estornos precisam estar em dia.
  - **e-Financeira:** desde a IN RFB 2.278/2025, instituições de pagamento (como o Mercado Pago) passaram a ter as obrigações de prestar informações da e-Financeira (IN RFB 1.571/2015). Na prática, a RFB passa a ver a movimentação da conta da Áurea [SECUNDÁRIA: https://www.mattosfilho.com.br/unico/instituicoes-pagamento-entregar-e-financeira/]. **O volume que passa pela conta será muito maior que a receita, e a escrituração precisa explicar a diferença.**
- **Equação de conciliação diária [PROPOSTA]:**
  ```
  Saldo MP (disponível) + Valores MP em liberação (a receber do gateway)
     = Σ saldos de clientes (passivo)
     + Saques solicitados ainda não pagos
     + Fretes recebidos ainda não repassados (se tratados como repasse)
     + Receita diferida de custódia ainda não apropriada (já recebida)
     + Tributos retidos ou a recolher já provisionados com o caixa no MP (se for o caso)
     + Recursos próprios em MP (receitas recebidas − despesas pagas pelo MP − tributos pagos pelo MP − transferências para o banco próprio + aportes)
  ```
  Toda diferença vai para uma conta transitória, **"Diferenças de conciliação a apurar"**, com investigação e lançamento de regularização documentado. Nunca é "absorvida" em receita ou despesa sem histórico.

### 2.4 Depósitos, transferências entre clientes, saques e devoluções
Os lançamentos estão na seção 6. O princípio de cada um:
- **Depósito:** entra caixa (ativo) e nasce a obrigação com o cliente (passivo). **Não passa pelo resultado.** A única exceção é a taxa do gateway, se a Áurea a absorver.
- **Negociação entre clientes:** **não mexe no caixa.** É uma transferência entre subcontas do passivo, mais a parte retida pela Áurea como receita (passivo → receita). É aqui que o relatório detalhado de cada evento, que o contador disse ser suficiente em 16/10/2026, serve de documento: a negociação não tem documento bancário, então o comprovante é o registro do sistema, com data, hora, partes, preço e ID.
- **Saque:** baixa o passivo e baixa o caixa. A tarifa de R$ 5,00 é receita.
- **Devolução, estorno de pagamento ou chargeback:** inverte o depósito. Se o cliente já gastou o saldo, nasce um **crédito a receber do cliente** (ativo) ou uma **perda**. O passivo nunca fica negativo.

### 2.5 Frete pago pelo cliente ao preço de contrato, sem margem
O sistema hoje lança o frete fora da receita bruta (ledger `frete`). Há duas leituras possíveis:

**(A) Repasse, com a Áurea como agente: fora da receita bruta.**
- Base contábil: CPC 47, B34 a B36. A Áurea providencia que os Correios prestem o transporte ao cliente, sem margem e sem risco relevante, e o item 47 exclui valores cobrados em nome de terceiros [OFICIAL: conferido].
- Base tributária: DL 1.598, art. 12, III ("operações de conta alheia") [OFICIAL: conferido].
- Apoio adicional: a SC Cosit 149/2021, sobre rateio de custos sem margem entre empresas, excluiu os reembolsos da base no Lucro Presumido e no PIS/COFINS cumulativo, desde que **sem margem de lucro** e com outras condições [SECUNDÁRIA: https://crespogregio.com.br/publicada-solucao-de-consulta-cosit-no-149-que-traz-regras-para-o-rateio-de-custos-e-despesas-de-empresas-no-lucro-presumido/; texto em https://www.econeteditora.com.br/bdi/st/st21/PDF/sc_cosit_149_2021.pdf]. Esse caso é de *cost sharing* entre empresas, e não de repasse a cliente. A analogia é fraca.

**(B) Reembolso que integra o preço do serviço: dentro da receita bruta.**
- A **SC Cosit 144/2023** entendeu que, no Lucro Presumido e no PIS/COFINS cumulativo, a receita bruta de serviços é o preço total, "independentemente da denominação". Custos e despesas faturados contra o tomador integram a base, e nota de débito não basta [SECUNDÁRIA: https://tributodevido.com.br/portal/reembolso-despesas-integra-receita-bruta/; https://pradvogados.com.br/2023/08/04/receita-federal-afirma-que-valor-reembolsado-ao-prestador-de-servicos-por-este-ter-arcado-com-despesa-e-tributado-pelo-irpj-csll-pis-e-cofins/]. Segundo os comentários, ela se vincula parcialmente à SC Cosit 247/2017.

**O fato que pesa:** o contrato Correios Platinum está **no CNPJ da Áurea**, e é a Áurea quem paga os Correios. Isso aproxima o caso da leitura (B), porque a Áurea é a tomadora do serviço dos Correios e o cliente reembolsa a Áurea.

A leitura (A) fica mais forte se:
- os Termos disserem que a Áurea contrata o frete **em nome e por conta do cliente**, como mandatária;
- o valor for exatamente o do contrato, sem margem, com o comprovante dos Correios ligado a cada cobrança;
- o valor transitar por conta de passivo "a repassar".

Mesmo assim, há risco de o fisco tratar como receita. Isso também afeta o ISS, porque o frete seria preço de qual serviço?

**Recomendação [PROPOSTA]:** manter o frete em conta própria (já existe), **levar a decisão ao contador** e, se ele optar por (B), tributar o frete como receita e lançar o custo dos Correios como custo do serviço. O resultado líquido é zero, mas há tributo sobre o bruto: cerca de 11,33% federal mais o ISS.

### 2.6 Tarifa de saque de R$ 5,00
- É preço de serviço prestado pela Áurea ao cliente (processar e enviar o Pix), portanto **receita bruta** (DL 1.598, art. 12, II) [OFICIAL: conferido], com NFS-e.
- **O subitem da lista da LC 116 é ponto para o contador.** As opções são o item 15, de serviços do setor bancário ou financeiro, cujo caput diz "inclusive aqueles prestados por instituições financeiras", e o item 10.
- O custo do Pix de saída, se houver, é despesa.
- Se a Áurea **repassar ao cliente** exatamente a tarifa do Mercado Pago, sem margem, valem as mesmas dúvidas do 2.5.

---

## 3. Tributos sobre a receita no Lucro Presumido

### 3.1 Receita bruta: definição [OFICIAL: conferido]
DL 1.598/77, art. 12, com redação da Lei 12.973/2014 (https://www.planalto.gov.br/ccivil_03/decreto-lei/del1598.htm):
- A receita bruta compreende: **I** o produto da venda de bens em conta própria; **II** o preço da prestação de serviços em geral; **III** o resultado auferido nas operações de conta alheia; **IV** as demais receitas da atividade principal.
- **§ 1º, receita líquida:** é a receita bruta menos devoluções e **vendas canceladas**, descontos incondicionais, tributos sobre ela incidentes e ajuste a valor presente.
- **§ 4º:** não se incluem "os tributos não cumulativos cobrados, destacadamente, do comprador ou contratante [...] na condição de mero depositário". Isso é relevante para o IBS e a CBS a partir da reforma; conferir com o contador.
- **§ 5º:** incluem-se na receita bruta os tributos sobre ela incidentes. **ISS, PIS e COFINS estão "dentro" do preço.**

### 3.2 IRPJ e CSLL [OFICIAL: conferido]
- **IRPJ:** base presumida de **32%** da receita bruta para "prestação de serviços em geral" (Lei 9.249/95, art. 15, § 1º, III, "a"; https://www.planalto.gov.br/ccivil_03/leis/l9249.htm). A base é a receita bruta do art. 12 do DL 1.598, **deduzida só das devoluções, vendas canceladas e descontos incondicionais**. Alíquota de 15% (art. 3º) e adicional de 10% sobre a parcela que exceder R$ 20.000 por mês do período, ou seja, R$ 60.000 por trimestre (art. 3º, § 1º).
- **CSLL:** base presumida de **32%** (Lei 9.249, art. 20, I, redação da LC 167/2019) e alíquota de **9%** (Lei 7.689/88, art. 3º, III; https://www.planalto.gov.br/ccivil_03/leis/l7689.htm).
- **Carga efetiva sobre a receita bruta de serviço:** IRPJ de 4,80% (15% × 32%), mais o adicional se o lucro presumido do trimestre passar de R$ 60 mil, e CSLL de 2,88% (9% × 32%).
- **LC 224/2025, art. 4º, § 4º, VII, e § 5º** (https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm) [OFICIAL: conferido]: acréscimo de 10% nos percentuais de presunção, de 32% para 35,2%, **só sobre a parcela da receita bruta anual acima de R$ 5 milhões**. Não afeta a Áurea no porte atual. Há notícia de liminar do TRF-3 suspendendo o acréscimo para uma empresa [SECUNDÁRIA: https://www.omie.com.br/blog/trf3-suspende-adicional-lucro-presumido-lc-224-2025/index.md].

### 3.3 PIS e COFINS cumulativos [OFICIAL: conferido]
- O Lucro Presumido fica no regime **cumulativo**: Lei 10.637/2002, art. 8º, II (PIS; https://www.planalto.gov.br/ccivil_03/leis/2002/l10637.htm), e Lei 10.833/2003, art. 10, II (COFINS; https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm).
- **Alíquotas:** PIS de **0,65%** (Lei 9.715/98, art. 8º, I; https://www.planalto.gov.br/ccivil_03/leis/l9715.htm) e COFINS de **3%** (Lei 9.718/98, art. 8º; https://www.planalto.gov.br/ccivil_03/leis/l9718compilada.htm).
- **Base:** o faturamento, que é a receita bruta do art. 12 do DL 1.598 (Lei 9.718, arts. 2º e 3º).
- **Exclusões taxativas (art. 3º, § 2º):** vendas canceladas e descontos incondicionais; reversões de provisões e recuperações de créditos baixados que não sejam receita nova; receita de venda de ativo não circulante. O antigo inciso III, que excluía valores transferidos a outras pessoas jurídicas, foi **revogado** (MP 2.158-35/2001). **Não existe exclusão para taxas de gateway ou de cartão.**
- No regime cumulativo **não há créditos**: despesas não abatem nada.

### 3.4 ISS [OFICIAL: conferido]
LC 116/2003 (https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm):
- Subitem **10.05**: "Agenciamento, corretagem ou intermediação de bens móveis ou imóveis, não abrangidos em outros itens ou subitens, [...] por quaisquer meios."
- Subitem **11.04**: "Armazenamento, depósito, carga, descarga, arrumação e guarda de bens de qualquer espécie."
- **Art. 7º:** a base de cálculo é **"o preço do serviço"**.
- **Arts. 8º, II, e 8º-A:** alíquota máxima de 5% e mínima de 2%. A alíquota de Belo Horizonte para cada subitem está na Lei municipal 8.725/2003, art. 14, mas **não consegui confirmar o percentual**; conferir na NFS-e emitida ou com o contador (https://fazenda.pbh.gov.br/).
- **Art. 3º, XVII:** no subitem 11.04, o ISS é devido **no local do armazenamento ou da guarda do bem**. Se o cofre ficar fora de BH, o ISS da custódia é do município do cofre.

### 3.5 A pergunta do Rogério: "o imposto não deveria ser sobre o lucro, e não sobre o bruto do Mercado Pago?"
Resposta em três partes, com fundamento:

1. **O "bruto do Mercado Pago" não é a base de nada.** O dinheiro que os clientes depositam e sacam é dinheiro deles. Ele passa pela conta da Áurea, mas não é receita (seções 2.1 e 2.3; DL 1.598, art. 12, III; SC Cosit 170/2021). **Ele não é tributado**, desde que a escrituração mostre a origem e o destino de cada real (Lei 9.430, art. 42).
2. **A base é a receita bruta faturada, e não o lucro e não o líquido recebido do Mercado Pago.** No Lucro Presumido, a lei não olha o lucro real da empresa: ela **presume** que o lucro é 32% da receita bruta de serviços e cobra IRPJ e CSLL sobre esse lucro presumido (Lei 9.249, arts. 15 e 20). PIS, COFINS e ISS incidem diretamente sobre a receita bruta (Lei 9.718, art. 3º; LC 116, art. 7º). Por isso **nenhuma despesa reduz a base**: nem a taxa do Mercado Pago, nem os Correios, nem salários. É o preço da simplicidade do regime. Quem quer tributar o lucro efetivo precisa estar no Lucro Real, que tem outras obrigações e outro regime de PIS/COFINS. Essa comparação é tarefa do contador.
3. **A taxa do Mercado Pago não sai da base.** O STF julgou exatamente isso para as administradoras de cartão: **Tema 1024 (RE 1.049.811)**, com a tese "É constitucional a inclusão dos valores retidos pelas administradoras de cartões na base de cálculo das contribuições ao PIS e da COFINS devidas por empresa que recebe pagamentos por meio de cartões de crédito e débito" (mérito em 21/03/2022, trânsito em julgado em 25/06/2022) [OFICIAL do Judiciário, nota técnica do TRF5: https://arquivos.trf5.jus.br/TRF5/Nota_Tecnica_Sobrestamento/2022/08/05/20220805_E97523_Governanca_do_Dessobrestamento_no_Tema_1024_STF.PDF; SECUNDÁRIA: https://www.coad.com.br/home/noticias-detalhe/101842/empresas-devem-pagar-piscofins-sobre-taxas-de-administracao-de-cartao-de-credito]. Se a custódia de R$ 2,00 é paga no cartão e o Mercado Pago repassa R$ 1,90, a receita é R$ 2,00 e a taxa de R$ 0,10 é despesa.

**Exemplo numérico** (negociação de R$ 200; ISS hipotético de 5%, a confirmar; sem adicional de IR):

| Item | Base | Valor |
|---|---|---|
| Dinheiro do comprador que vai ao vendedor (R$ 198) | **não é receita** | R$ 0,00 de tributo |
| Receita de intermediação da Áurea | R$ 4,00 | |
| PIS (0,65%) | R$ 4,00 | R$ 0,026 |
| COFINS (3%) | R$ 4,00 | R$ 0,120 |
| IRPJ (15% × 32%) | R$ 4,00 | R$ 0,192 |
| CSLL (9% × 32%) | R$ 4,00 | R$ 0,115 |
| ISS (5%, hipotético) | R$ 4,00 | R$ 0,200 |
| **Total aproximado** | | **R$ 0,65 (cerca de 16,3% da receita)** |

### 3.6 IBS e CBS: ano de teste de 2026 [OFICIAL: conferido para a LC 214; SECUNDÁRIA para o Ato Conjunto]
Fonte: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
- **Art. 343:** em 2026, IBS com alíquota estadual de **0,1%**.
- **Art. 346:** em 2026, CBS com alíquota de **0,9%**.
- **Art. 348:**
  - I: o valor recolhido de IBS e CBS **é compensado** com PIS/COFINS devidos no mesmo período;
  - II: se não houver débito suficiente, compensa-se com outro tributo federal ou pede-se ressarcimento em até 60 dias;
  - III, "c": não se aplica ao Simples Nacional (não é o caso da Áurea);
  - **§ 1º: fica dispensado o recolhimento** para quem cumprir as obrigações acessórias;
  - § 2º: o dispensado continua pagando PIS/COFINS integralmente.
- **Ato Conjunto RFB/CGIBS nº 1/2025:** trata das obrigações acessórias de 2026, admite os modelos atuais (inclusive a NFS-e) e afasta penalidade pela falta dos campos de IBS e CBS até o 1º dia do 4º mês após a publicação do regulamento [SECUNDÁRIA: https://www.mayerbrown.com/pt/insights/publications/2025/12/joint-normative-act-ato-conjunto-rfbcgibs-no-12025-the-brazilian-federal-revenue-service-rfb-and-the-ibs-management-committee-cgibs-set-forth-the-ancillary; https://sovos.com/pt-br/atualizacoes-regulatorias/tributos/brasil-ato-conjunto-rfb-cgibs-no-1-2025-esclarece-documentos-fiscais-eletronicos-e-penalidades-de-ibs-e-cbs-em-2026/]. Há divergência entre as fontes sobre a data a partir da qual o destaque é exigido.
- **Como aparece no sistema e na contabilidade [PROPOSTA]:**
  - Destaque **informativo** na NFS-e: 0,9% de CBS e 0,1% de IBS sobre o valor do serviço.
  - Se a Áurea estiver dispensada de recolher (art. 348, § 1º), **não há lançamento de despesa nem de passivo**. Basta um controle extracontábil ou conta de compensação.
  - Se recolher, o valor vai para "Tributos a compensar" (ativo) e é abatido do PIS/COFINS.
  - Em nenhum caso o IBS ou a CBS de 2026 aumentam o custo.
  - Pelo DL 1.598, art. 12, § 4º, o tributo não cumulativo destacado "na condição de mero depositário" não integra a receita bruta. Confirmar com o contador como isso se aplica ao destaque de 2026.

---

## 4. Classificação de custos e despesas
Não encontrei norma que fixe a rubrica da taxa de gateway. O que existe é princípio: CPC 26, itens 99 a 103, permite apresentar as despesas por natureza ou por função, e o art. 187 da Lei 6.404 define as linhas da DRE. O resto é prática.

| Despesa | Classificação mais aceita | Fundamento ou observação |
|---|---|---|
| **Taxa do Mercado Pago sobre o recebimento de custódia, comissão ou tarifa** (MDR, a taxa de processamento do cartão ou do Pix) | **Despesas com vendas / comerciais**, como "Tarifas de meios de pagamento". Há quem classifique como despesa financeira. | Prática: a taxa é necessária para concretizar o recebimento da venda [SECUNDÁRIA: https://www.contabeis.com.br/forum/contabilidade/177783/taxa-aluguel-da-administradora-de-cartao/]. A NBC TG 1002, item 23.2, trata "desconto financeiro por pagamento antecipado" como dedução, o que não se confunde com a MDR. |
| **Taxa de antecipação de recebíveis do cartão** | **Despesa financeira** | Custo do dinheiro no tempo. |
| **Taxa do Mercado Pago sobre depósito de cliente, absorvida pela Áurea** | Despesa operacional, por exemplo "Custos de processamento de depósitos de clientes", em despesas com vendas ou no custo do serviço de intermediação [PROPOSTA] | Não é custo de uma receita específica, e sim de manter clientes ativos. **Se for cobrada do cliente**, sem margem, abate o saldo dele e **não é despesa da Áurea**. |
| **Tarifas bancárias** (conta corrente, TED, manutenção) | Despesas financeiras ou administrativas | Prática de mercado. |
| **Correios do envio do cliente** | Na leitura (A) do 2.5: **não é despesa**, porque transita em "Fretes a repassar". Na leitura (B): **custo dos serviços prestados**. | Ver 2.5. |
| **Correios da retirada** (etiqueta de saída) e outros fretes que a Áurea assume | Custo dos serviços prestados ou despesa com vendas | Conforme quem suporta o custo. |
| **Chargeback, contestação de cartão** | (i) Se for de **depósito de cliente**: reverte o passivo do cliente. A falta que sobrar vira crédito a receber ou **perda**, como despesa operacional, por exemplo "Perdas com contestações e fraudes". (ii) Se for de **receita** (custódia paga no cartão): **dedução da receita, como serviço cancelado** (DL 1.598, art. 12, § 1º, I; Lei 9.718, art. 3º, § 2º, I), e a tarifa de chargeback é despesa. | Serviço cancelado sai da base de PIS/COFINS e da base presumida de IRPJ e CSLL. Perda por fraude **não** sai da base no Lucro Presumido. |
| **Custódia física** (cofre, seguro, aluguel do espaço) | Custo dos serviços prestados (custódia) | Lei 6.404, art. 187, II. |
| **Infraestrutura** (Vercel, banco de dados, e-mail) | Despesas administrativas, ou custo do serviço se for alocável | Escolha de política, que deve ser mantida estável (Lei 6.404, art. 177). |

**Lembrete:** no Lucro Presumido, **a classificação não muda o tributo**. Só deduções de receita (cancelamentos e descontos incondicionais) mexem na base. A classificação importa para a DRE gerencial, para a ECD/ECF e para uma eventual migração ao Lucro Real.

---

## 5. Correções feitas pelo painel administrativo

### 5.1 Regras [OFICIAL: conferido]
- **ITG 2000, itens 31 a 36:** estorno, transferência ou complementação. O histórico precisa trazer **o motivo, a data e a localização do lançamento de origem**. O lançamento extemporâneo precisa trazer **a data efetiva da ocorrência e a razão do registro tardio**.
- **CTG 2001 (R3), item 15:** depois da entrega da ECD, a regra é corrigir por lançamento extemporâneo, e não substituir o livro.
- **CPC 23 / NBC TG 23 (R2)** (https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_23_rev_14.pdf; https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG23(R2).pdf):
  - definição (item 5): erros de períodos anteriores são omissões e incorreções decorrentes da falta de uso, ou do uso incorreto, de informação confiável que estava disponível;
  - item 41: erro do período corrente é corrigido antes da emissão das demonstrações;
  - item 42: erro **material** de período anterior é corrigido **retrospectivamente**, reapresentando o comparativo ou os saldos de abertura.
- **NBC TG 1002, itens 5.2 e 10.5 a 10.6:** a correção de erro de exercício anterior vai para **lucros ou prejuízos acumulados**, e não para o resultado do ano.
- **ECD:** lançamento com IND_LCTO = **X** e DT_LCTO_EXT = data real do fato. Segundo fonte secundária, o PVA não aceita X em conta de resultado (ver 1.8). Na prática, a correção de resultado de exercício já encerrado vai a lucros ou prejuízos acumulados.
- **Efeito tributário:** se a correção muda a receita de um mês **já apurado** (PIS, COFINS e ISS mensais; IRPJ e CSLL trimestrais), em regra é preciso **retificar a apuração e as declarações daquele período** (DCTFWeb e EFD-Contribuições, conforme o caso) e não "jogar" a diferença no mês corrente. **Confirmar com o contador** os procedimentos e os limites de materialidade.

### 5.2 Tipos de correção e como lançar [PROPOSTA baseada nas normas acima]

| Situação | Forma (ITG 2000) | Lançamento |
|---|---|---|
| Cobrança de custódia que **deveria ter sido feita** em mês anterior (cobrança retroativa) | **Complementação**, extemporânea se o mês já estiver fechado | D Saldo do cliente (ou Clientes - custódia a receber) / C Receita de custódia. Data do fato = competência original. Se o exercício estiver encerrado: C Lucros acumulados - ajustes de exercícios anteriores. |
| Cobrança feita **por engano** | **Estorno** | Inverso exato do original, com remissão ao nº do lançamento original e ao hash. Se a NFS-e já foi emitida: cancelar a NFS-e ou registrar como serviço cancelado (dedução). |
| Valor cobrado a maior ou a menor | **Complementação** | Só pela diferença, para mais ou para menos. |
| Valor lançado no cliente errado (A no lugar de B) | **Transferência** | D Saldo B / C Saldo A, ou o inverso, com remissão. |
| Saldo inflado por **erro do sistema** (crédito indevido) | **Estorno** do crédito indevido. Se o cliente já sacou, nasce "Valores a recuperar de clientes" ou "Perdas operacionais". | O passivo não pode conter "obrigação inexistente" (DL 1.598, art. 12, § 2º). |
| Saldo **a menor** por erro do sistema (crédito devido não lançado) | Complementação, contra a conta onde está o dinheiro ou contra perda operacional se a Áurea assumir | Se a Áurea arcar com o valor: D Perdas operacionais - erros de sistema / C Saldo do cliente. **Nunca** contra receita. |
| Ajuste sem causa identificada | **Proibido como solução final** | Usar "Diferenças de conciliação a apurar" até achar a causa. |

### 5.3 Modelos de histórico [PROPOSTA]
O padrão é: **o que** + **de quem** + **referência ao original** + **motivo** + **data do fato** + **quem autorizou**.
- *Complementação extemporânea:* "Custódia ref. ciclo 02/08/2026 a 01/09/2026, lote L-0123, cliente C-0045, 3 moedas × R$ 2,00, não cobrada na data por falha do job de faturamento (incidente INC-2026-031). Registro extemporâneo em 20/10/2026; fato ocorrido em 02/08/2026. Autorizado por [usuário admin] em 20/10/2026. Doc.: fatura F-2026-0890."
- *Estorno:* "Estorno integral do lançamento nº 000123456 de 15/10/2026 (hash a1b2…), cobrança de custódia em duplicidade para o cliente C-0045, lote L-0123. Motivo: o job diário emitiu duas faturas para o mesmo ciclo (INC-2026-033). Autorizado por [usuário] em 16/10/2026."
- *Transferência:* "Transferência do lançamento nº 000123500 de 10/10/2026, creditado indevidamente ao cliente C-0012 em vez de C-0021 (depósito Pix MP ID 1234567890). Correção da conta creditada. Autorizado por [usuário]."
- *Ajuste por erro de sistema:* "Regularização de saldo do cliente C-0077: crédito indevido de R$ 15,00 em 05/10/2026 (lanç. nº 000123300), gerado pelo arredondamento da comissão na versão 1.4.2. Estorno do excedente; diferença já sacada levada a Valores a recuperar de clientes. Autorizado por [usuário] em 21/10/2026."
- *Devolução de pagamento:* "Devolução (refund) do pagamento MP ID 9876543210 de 03/10/2026, custódia do lote L-0130 (fatura F-2026-0901), cancelada a pedido do cliente C-0090 em 04/10/2026. NFS-e nº 456 cancelada. Tarifa MP não devolvida: R$ 0,10."

**No sistema [PROPOSTA]:** o painel deve exigir motivo (texto livre mais categoria), o **ID do lançamento corrigido** (quando houver), a **data do fato** e o documento de suporte. O ledger deve gravar `dt_fato` ≠ `dt_registro` e `ind_lcto = 'X'` quando aplicável. A trilha `audit_log` com `admin.<area>.<verbo>` já atende à rastreabilidade (Decreto 10.278, art. 4º, II, por analogia).

---

## 6. Plano de contas proposto e lançamentos-modelo

### 6.1 Premissas
- Os **códigos são ilustrativos** [PROPOSTA]. O contador mapeia cada conta analítica para o Plano de Contas Referencial da RFB (ECD, I051; ECF, P100 e P150, "PJ em Geral"). Não reproduzo códigos referenciais porque não consegui abrir a tabela oficial (ver 1.8).
- Respeita o mínimo de 4 níveis do CTG 2001, item 8, e a estrutura dos arts. 177 a 182 e 187 da Lei 6.404.
- **Segregação do Mercado Pago:** se a conta MP for uma só, a separação entre "recursos próprios" e "recursos de clientes" é **por subconta contábil** (gerencial). A soma das duas subcontas bate com o extrato MP. A segregação deixa a conciliação do 2.3 visível no balanço. Uma conta MP **separada de fato** para recursos de clientes é decisão de negócio e jurídica, fora do escopo desta pesquisa (ver seção 7).

### 6.2 Estrutura

```
1        ATIVO
1.1      ATIVO CIRCULANTE
1.1.1    Disponibilidades
1.1.1.01   Caixa (se houver)
1.1.1.02   Bancos conta movimento - [banco da empresa]
1.1.1.03   Mercado Pago - recursos próprios
1.1.1.04   Mercado Pago - recursos de clientes (vinculados)
1.1.2    Créditos
1.1.2.01   Mercado Pago - valores em liberação (a receber do gateway) - próprios
1.1.2.02   Mercado Pago - valores em liberação - de clientes
1.1.2.03   Clientes - custódia a receber (faturas emitidas em aberto)
1.1.2.04   Valores a recuperar de clientes (saldo negativo por chargeback ou erro)
1.1.2.05   (-) Perdas estimadas com créditos de clientes
1.1.3    Tributos a recuperar / compensar
1.1.3.01   CBS a compensar (2026, se recolhida)
1.1.3.02   IBS a compensar (2026, se recolhido)
1.1.3.03   Tributos retidos por terceiros (se houver)
1.1.4    Despesas antecipadas
1.2      ATIVO NÃO CIRCULANTE
1.2.3    Imobilizado (cofre, equipamentos da bancada) / 1.2.4 Intangível (software)

2        PASSIVO
2.1      PASSIVO CIRCULANTE
2.1.1    Obrigações com clientes
2.1.1.01   Recursos de clientes a repassar (controle) ── subcontas: Cliente C-0001 … C-n (razão auxiliar = ledger)
2.1.1.02   Saques de clientes solicitados a pagar
2.1.1.03   Fretes recebidos de clientes a repassar aos Correios (se a leitura A do 2.5)
2.1.1.04   Receita diferida - custódia paga antecipadamente (passivo de contrato)
2.1.1.05   Pagamentos de clientes a identificar (depósito sem cliente vinculado)
2.1.2    Fornecedores
2.1.2.01   Correios (contrato)
2.1.2.02   Mercado Pago - tarifas a pagar (se faturadas à parte)
2.1.2.03   Outros fornecedores
2.1.3    Obrigações tributárias
2.1.3.01   ISS a recolher
2.1.3.02   PIS a recolher
2.1.3.03   COFINS a recolher
2.1.3.04   IRPJ a recolher
2.1.3.05   CSLL a recolher
2.1.3.06   IRRF a recolher (serviços tomados; 10% sobre dividendos > R$ 50 mil/mês - Lei 15.270)
2.1.3.07   CBS / IBS a recolher (só se não houver dispensa)
2.1.4    Obrigações trabalhistas e sociais (se houver)
2.1.5    Lucros a distribuir
2.1.9    Contas transitórias
2.1.9.01   Diferenças de conciliação a apurar

3        PATRIMÔNIO LÍQUIDO
3.1.1.01   Capital social
3.4.1.01   Lucros ou prejuízos acumulados
3.4.1.02   Ajustes de exercícios anteriores (correção de erros - CPC 23 / NBC TG 1002 seç. 10)

4        RECEITAS (conta de resultado - COD_NAT 04)
4.1      RECEITA BRUTA DE SERVIÇOS
4.1.1.01   Receita de custódia (NFS-e 11.04)
4.1.1.02   Receita de intermediação - comissão do comprador (NFS-e 10.05)
4.1.1.03   Receita de intermediação - comissão do vendedor (NFS-e 10.05)
4.1.1.04   Receita de tarifa de saque (subitem a definir)
4.1.1.05   Receita de retirada / expedição (subitem a definir)
4.1.1.06   Receita de frete (somente se a leitura B do 2.5)
4.2      (-) DEDUÇÕES DA RECEITA BRUTA
4.2.1.01   (-) Serviços cancelados / estornos de receita
4.2.1.02   (-) Descontos incondicionais concedidos
4.2.2.01   (-) ISS sobre serviços
4.2.2.02   (-) PIS sobre faturamento
4.2.2.03   (-) COFINS sobre faturamento
4.3      OUTRAS RECEITAS
4.3.1.01   Receitas financeiras (rendimento do saldo MP, se houver)
4.3.1.02   Recuperação de perdas

5        CUSTOS E DESPESAS (COD_NAT 04)
5.1      CUSTO DOS SERVIÇOS PRESTADOS
5.1.1.01   Custo da custódia física (cofre, seguro, aluguel)
5.1.1.02   Fretes Correios assumidos pela Áurea / frete do cliente (se leitura B)
5.1.1.03   Infraestrutura tecnológica alocada
5.2      DESPESAS COM VENDAS / COMERCIAIS
5.2.1.01   Tarifas de meios de pagamento - recebimento de serviços (MP)
5.2.1.02   Tarifas de processamento de depósitos de clientes absorvidas (MP)
5.2.1.03   Tarifas de Pix de saque absorvidas
5.3      DESPESAS ADMINISTRATIVAS
5.3.1.01   Serviços de terceiros (contabilidade, jurídico)
5.3.1.02   Infraestrutura e software
5.3.1.03   Tarifas bancárias (se não classificadas em 5.4)
5.4      DESPESAS FINANCEIRAS
5.4.1.01   Juros e encargos / antecipação de recebíveis
5.5      OUTRAS DESPESAS OPERACIONAIS
5.5.1.01   Perdas com chargebacks e fraudes
5.5.1.02   Perdas operacionais - erros de sistema assumidos
6        TRIBUTOS SOBRE O LUCRO
6.1.1.01   IRPJ (presumido)
6.1.1.02   CSLL (presumida)
```

### 6.3 Lançamentos-modelo (partidas dobradas e razonetes)
Convenção: **D** = débito, **C** = crédito. As taxas do Mercado Pago são **hipotéticas** e servem só para ilustrar; os valores reais vêm do contrato ou do extrato MP. Os tributos sobre a receita (ISS, PIS, COFINS) são provisionados **no fechamento do mês** em um lançamento único (ver E10).

**E1. Depósito por Pix de R$ 100,00, com taxa MP hipotética de R$ 0,99 absorvida pela Áurea** (o cliente recebe R$ 100 de saldo):
```
D 1.1.1.04 MP - recursos de clientes ............ 99,01
D 5.2.1.02 Tarifas de processamento de depósitos .... 0,99
   C 2.1.1.01 Recursos de clientes a repassar - Cliente A ... 100,00
Histórico: "Depósito Pix MP ID 111… do cliente A em 21/10/2026 14:03; tarifa MP absorvida."
-- recomposição da segregação (a taxa foi paga com dinheiro que é da empresa):
D 1.1.1.04 MP - recursos de clientes ............. 0,99
   C 1.1.1.03 MP - recursos próprios ................ 0,99
```
*Variante com a taxa repassada ao cliente:* D MP clientes 99,01 / C Cliente A 99,01. Não há despesa, e o cliente vê o crédito líquido. **Não é receita** em nenhum dos dois casos.

Razonetes (E1, caso absorvido):
```
   MP - rec. clientes          Cliente A (passivo)        Tarifas depósitos (desp.)     MP - rec. próprios
  D        |   C              D      |    C               D      |    C                 D      |   C
  99,01    |                         |  100,00            0,99   |                             |  0,99
   0,99    |                         |
 --------  |                         | --------
 100,00    |                         |  100,00
```

**E2. Negociação de R$ 200,00, com comissão dos dois lados** (o comprador A paga R$ 202, o vendedor B recebe R$ 198, a Áurea retém R$ 4). **Não há movimento de caixa.**
```
D 2.1.1.01 Recursos de clientes - Cliente A (comprador) .... 202,00
   C 2.1.1.01 Recursos de clientes - Cliente B (vendedor) ...... 198,00
   C 4.1.1.02 Receita de intermediação - comissão comprador ...... 2,00
   C 4.1.1.03 Receita de intermediação - comissão vendedor ....... 2,00
Histórico: "Negociação T-000789 em 21/10/2026 15:20:11, 1 moeda Direitos Humanos, preço R$ 200,00;
comprador A, vendedor B; comissão 0,5% + R$ 1,00 por lado. NFS-e 10.05 nº … (A) e nº … (B)."
-- segregação (R$ 4 de receita deixam de ser dinheiro de cliente):
D 1.1.1.03 MP - recursos próprios .... 4,00
   C 1.1.1.04 MP - recursos de clientes .... 4,00
```
*Regra vigente desde 21/10/2026:* a compra também cobra a custódia do 1º mês, R$ 2,00 por moeda. Esse valor é um lançamento à parte, no mesmo ID de negociação, como no E3, e **nunca** entra em `Trade.fee` nem na comissão.

**E3. Custódia de R$ 2,00 paga com saldo** (ciclo de 02/10 a 01/11):
```
D 2.1.1.01 Recursos de clientes - Cliente A .... 2,00
   C 4.1.1.01 Receita de custódia ........................ 2,00
   (rigor CPC 47 item 106, se o ciclo cruza o fim do mês: C 4.1.1.01 1,94 (30/31 avos decorridos) e C 2.1.1.04 Receita diferida 0,06,
    apropriando em 01/11. Simplificação admitida pela NBC TG 1002 item 23.7 se o contador aceitar.)
-- segregação:
D 1.1.1.03 MP - recursos próprios .... 2,00
   C 1.1.1.04 MP - recursos de clientes .... 2,00
```

**E4. Custódia de R$ 2,00 paga com cartão, taxa MP hipotética de R$ 0,10 e liberação em D+30:**
```
(na aprovação do pagamento)
D 1.1.2.01 MP - valores em liberação (próprios) .... 1,90
D 5.2.1.01 Tarifas de meios de pagamento ............ 0,10
   C 4.1.1.01 Receita de custódia ......................... 2,00   ← base de PIS/COFINS/ISS/IRPJ/CSLL = R$ 2,00 (STF Tema 1024)
(na liberação)
D 1.1.1.03 MP - recursos próprios .... 1,90
   C 1.1.2.01 MP - valores em liberação ..... 1,90
```
*Se a fatura foi emitida antes e paga depois:* na emissão, D 1.1.2.03 Clientes - custódia a receber / C Receita. No pagamento, D MP (ou valores em liberação) e D Tarifa / C 1.1.2.03.

**E5. Saque de R$ 100,00 líquidos com tarifa de R$ 5,00** (o cliente tem R$ 105 debitados):
```
(pedido - solicitarSaque)
D 2.1.1.01 Recursos de clientes - Cliente A .... 105,00
   C 2.1.1.02 Saques solicitados a pagar ................. 100,00
   C 4.1.1.04 Receita de tarifa de saque ................... 5,00
D 1.1.1.03 MP - recursos próprios .... 5,00          (segregação da tarifa)
   C 1.1.1.04 MP - recursos de clientes .... 5,00
(pagamento pela equipe - Pix)
D 2.1.1.02 Saques solicitados a pagar .... 100,00
   C 1.1.1.04 MP - recursos de clientes ......... 100,00
(se o Pix de saída tiver custo para a Áurea, hipotético R$ 0,50)
D 5.2.1.03 Tarifas de Pix de saque .... 0,50
   C 1.1.1.03 MP - recursos próprios ....... 0,50
(se o saque for RECUSADO - estorno integral do pedido, com remissão)
D 2.1.1.02 Saques solicitados a pagar .... 100,00
D 4.1.1.04 Receita de tarifa de saque ........ 5,00   (ou 4.2.1.01 Serviços cancelados, se a NFS-e já foi emitida)
   C 2.1.1.01 Recursos de clientes - Cliente A ...... 105,00
D 1.1.1.04 MP - recursos de clientes .... 5,00
   C 1.1.1.03 MP - recursos próprios ......... 5,00
```

**E6. Frete do envio de R$ 30,00 pago pelo cliente com saldo:**
```
LEITURA A (repasse - fora da receita):
D 2.1.1.01 Recursos de clientes - Cliente A .... 30,00
   C 2.1.1.03 Fretes a repassar aos Correios ............ 30,00
D 1.1.1.03 MP - recursos próprios .... 30,00          (o dinheiro sai da custódia de clientes)
   C 1.1.1.04 MP - recursos de clientes ....... 30,00
(fatura dos Correios do período)
D 2.1.1.03 Fretes a repassar aos Correios .... 30,00
   C 2.1.2.01 Fornecedores - Correios ................ 30,00
(pagamento)
D 2.1.2.01 Fornecedores - Correios .... 30,00
   C 1.1.1.02/03 Banco ou MP próprio ........... 30,00

LEITURA B (reembolso integra o preço - SC Cosit 144/2023):
D 2.1.1.01 Recursos de clientes - Cliente A .... 30,00
   C 4.1.1.06 Receita de frete ............................ 30,00   ← tributável
D 5.1.1.02 Custo - fretes Correios .... 30,00
   C 2.1.2.01 Fornecedores - Correios ......... 30,00
(+ segregação MP clientes → próprios, como acima)
```
*Pago por Pix ou cartão em vez de saldo:* troca-se o débito no cliente por D MP próprio ou valores em liberação, e a taxa do gateway vai para despesa (E4).

**E7. Cobrança retroativa feita pelo painel e o estorno dela:**
```
(20/10/2026 - complementação extemporânea: custódia de agosto não cobrada, exercício 2026 ainda aberto)
D 2.1.1.01 Recursos de clientes - Cliente C .... 6,00
   C 4.1.1.01 Receita de custódia .......................... 6,00
Histórico: "Custódia ciclo 02/08 a 01/09/2026, lote L-0123, 3 moedas × R$ 2,00, não cobrada na data por falha do job
(INC-031). Registro extemporâneo em 20/10/2026; fato em 02/08/2026. Autorizado por [admin]. Fatura F-…"
ECD: IND_LCTO = X ; DT_LCTO_EXT = 02/08/2026 (ver ressalva sobre X em conta de resultado, item 1.8).
Tributos: a receita pertence à competência de agosto → retificar a apuração de agosto/3º trimestre (confirmar com o contador).

(21/10/2026 - descobre-se que a cobrança foi indevida: o lote já tinha fatura paga) → ESTORNO
D 4.1.1.01 Receita de custódia ........... 6,00   (ou 4.2.1.01 Serviços cancelados, se a NFS-e foi emitida e não pode ser cancelada)
   C 2.1.1.01 Recursos de clientes - Cliente C .... 6,00
Histórico: "Estorno integral do lançamento nº 000124001 de 20/10/2026 (hash …): cobrança retroativa indevida,
lote L-0123 já coberto pela fatura F-… paga em 02/08/2026. Autorizado por [admin] em 21/10/2026."
(+ segregação inversa: D MP clientes / C MP próprios 6,00)
```
*Se o exercício da competência original já tiver sido encerrado:* a contrapartida da correção é **3.4.1.02 Ajustes de exercícios anteriores**, e não receita do ano (NBC TG 1002, item 5.2; CPC 23, item 42).

**E8. Devolução de pagamento cancelado (refund de custódia paga no cartão, E4) e chargeback de depósito:**
```
(refund da custódia de R$ 2,00; o MP não devolve a tarifa de R$ 0,10)
D 4.2.1.01 (-) Serviços cancelados ........ 2,00        (dedução: sai da base - DL 1.598 art.12 §1º I; Lei 9.718 art.3º §2º I)
   C 1.1.1.03 MP - recursos próprios (ou 1.1.2.01 se ainda em liberação) ... 2,00
NFS-e correspondente: cancelada (ou registrada a dedução, conforme regra municipal).
A tarifa de 0,10 permanece em 5.2.1.01.

(chargeback de depósito de R$ 100,00 do cliente D, que já gastou R$ 60,00 do saldo)
D 2.1.1.01 Recursos de clientes - Cliente D .... 40,00   (zera o saldo restante)
D 1.1.2.04 Valores a recuperar de clientes ..... 60,00
   C 1.1.1.04 MP - recursos de clientes .............. 100,00
(se considerado irrecuperável)
D 5.5.1.01 Perdas com chargebacks e fraudes .... 60,00
   C 1.1.2.04 Valores a recuperar de clientes .......... 60,00
(+ recomposição da segregação: D MP clientes / C MP próprios 60,00 - a empresa cobre o buraco com recurso próprio)
```

**E9. Ajuste de saldo por erro do sistema** (crédito indevido de R$ 15,00 ao cliente E, ainda não sacado):
```
D 2.1.1.01 Recursos de clientes - Cliente E .... 15,00
   C [conta de onde o valor deveria ter saído / 2.1.9.01 Diferenças a apurar até identificar] .... 15,00
Histórico com remissão, motivo (bug, versão), data do fato e autorizador (ver 5.3).
```

**E10. Fechamento do mês: tributos sobre a receita** (ilustração para uma receita bruta mensal de R$ 1.000,00 com ISS hipotético de 5%):
```
D 4.2.2.01 (-) ISS .......... 50,00     C 2.1.3.01 ISS a recolher ....... 50,00
D 4.2.2.02 (-) PIS ........... 6,50     C 2.1.3.02 PIS a recolher ........ 6,50
D 4.2.2.03 (-) COFINS ....... 30,00     C 2.1.3.03 COFINS a recolher .... 30,00
(trimestral) D 6.1.1.01 IRPJ 48,00 (1.000 × 32% × 15%) / C 2.1.3.04 ; D 6.1.1.02 CSLL 28,80 / C 2.1.3.05
CBS/IBS 2026: controle informativo (sem lançamento) se dispensado do recolhimento - LC 214 art. 348 §1º.
```

---

## 7. Dinheiro de clientes e a Lei 12.865/2013 (nota neutra)
[OFICIAL: conferido] https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12865.htm
- **Art. 6º, III:** instituição de pagamento é a pessoa jurídica que, aderindo a arranjos de pagamento, tem como atividade, entre outras, "a) disponibilizar serviço de aporte ou saque de recursos mantidos em conta de pagamento" e "c) gerir conta de pagamento".
- **Art. 6º, IV:** conta de pagamento é a "conta de registro detida em nome de usuário final de serviços de pagamento utilizada para a execução de transações de pagamento".
- **Art. 6º, § 4º:** ficam fora da lei os arranjos e instituições cujo volume, abrangência e natureza, segundo parâmetros do BCB e do CMN, não ofereçam risco ao varejo de pagamentos.
- **Art. 12:** nas instituições de pagamento, os recursos em contas de pagamento são **patrimônio separado** e não respondem por obrigações da instituição.

**Nota:** o risco jurídico desse enquadramento foi analisado e **encerrado pelo jurídico da empresa** (RA-01, Gabriel, 11/09/2026). Esta pesquisa **não recomenda mudança**. Do ponto de vista **contábil**, a recomendação, independente de enquadramento, é a mesma das seções 2.3 e 6: o saldo dos clientes fica em conta própria do passivo, com subcontas e conciliação diária, e a parte do caixa que pertence aos clientes é identificada (subconta "MP - recursos de clientes"). Isso dá transparência ao balanço e protege a empresa nas presunções de omissão de receita.

---

## 8. Pontos para confirmar com o contador
1. **Norma aplicável:** NBC TG 1002 (microentidade, receita até R$ 4,8 milhões) ou NBC TG completas (47, 23, 26)? Isso define se a custódia pode ser reconhecida na emissão da NFS-e (expediente prático, item 23.7) ou precisa de receita diferida pró-rata (CPC 47, item 106).
2. **ECD ou Livro Caixa:** a Áurea vai manter escrituração completa e entregar a ECD (IN RFB 2.003/2021, art. 3º)? A distribuição de lucros prevista ultrapassa a base presumida (art. 3º, § 3º)? Como fica a retenção de 10% acima de R$ 50 mil por mês por sócio (Lei 9.250/95, art. 6º-A)?
3. **Regime de caixa ou de competência** na apuração do Lucro Presumido (IRPJ, CSLL, PIS, COFINS) e a coerência disso com a distribuição de lucros.
4. **Frete:** leitura A (repasse, fora da receita) ou leitura B (integra a receita bruta, conforme a SC Cosit 144/2023)? Se for A, que redação nos Termos de Uso sustenta o mandato, e como documentar? Há ISS sobre o frete?
5. **Tarifa de saque (R$ 5,00) e taxa de retirada:** qual subitem da LC 116 e qual código de tributação na NFS-e de BH?
6. **Alíquota de ISS de BH** para os subitens 10.05 e 11.04, e o **local do cofre** (LC 116, art. 3º, XVII: o ISS da custódia é do município onde a moeda está guardada).
7. **NFS-e por evento ou consolidada:** uma NFS-e por negociação, por lado (comprador e vendedor), ou consolidada por cliente e período? Isso tem efeito nos requisitos citados para a SC Cosit 170/2021.
8. **Subcontas por cliente ou participante (COD_PART)** na ECD, e o formato de exportação do razão auxiliar (o ledger) que o contador quer receber.
9. **Taxa do Mercado Pago:** em qual rubrica classificar (despesa com vendas, financeira ou custo)? A política para depósitos de clientes é absorver a taxa ou repassá-la?
10. **Correção de períodos já apurados:** materialidade, retificação de DCTFWeb e EFD-Contribuições, e quando lançar contra ajustes de exercícios anteriores.
11. **Lançamento extemporâneo em conta de resultado na ECD** (restrição do PVA citada por fonte secundária): qual procedimento o contador adota?
12. **IBS e CBS 2026:** a Áurea está dispensada do recolhimento (LC 214, art. 348, § 1º)? Como preencher os campos na NFS-e de BH e a partir de que data o destaque é exigido (há divergência entre as fontes sobre o Ato Conjunto RFB/CGIBS 1/2025)?
13. **e-Financeira (IN RFB 2.278/2025):** confirmar que o volume informado pelo Mercado Pago é conciliável com a escrituração (depósitos e saques de clientes × receita).
14. **Prazo de retenção** dos registros (proposta: 10 anos) e a compatibilização com a política de retenção de dados da LGPD.
15. **Chargeback de receita × perda:** tratamento como serviço cancelado (dedução) ou como despesa, caso a caso.
16. **LC 214/2025, responsabilidade de plataformas digitais:** pela Lei 214, a plataforma pode ter responsabilidade pelo IBS e pela CBS das operações intermediadas a partir de 2027. **Não pesquisei esse ponto a fundo.** Avaliar antes de 2027, considerando que as vendas são entre pessoas físicas.

---

## 9. Fontes

### Oficiais, conferidas nesta pesquisa
- Código Civil (Lei 10.406/2002), arts. 1.179 a 1.195: https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm
- Lei 6.404/1976, arts. 177 e 187: https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm
- Decreto-Lei 1.598/1977, art. 12: https://www.planalto.gov.br/ccivil_03/decreto-lei/del1598.htm
- Lei 9.249/1995, arts. 3º, 15 e 20: https://www.planalto.gov.br/ccivil_03/leis/l9249.htm
- Lei 7.689/1988, art. 3º: https://www.planalto.gov.br/ccivil_03/leis/l7689.htm
- Lei 9.718/1998, arts. 2º, 3º e 8º: https://www.planalto.gov.br/ccivil_03/leis/l9718compilada.htm
- Lei 9.715/1998, art. 8º: https://www.planalto.gov.br/ccivil_03/leis/l9715.htm
- Lei 10.637/2002, art. 8º, II: https://www.planalto.gov.br/ccivil_03/leis/2002/l10637.htm
- Lei 10.833/2003, art. 10, II: https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm
- Lei 9.430/1996, art. 42: https://www.planalto.gov.br/ccivil_03/leis/l9430.htm
- Lei 8.218/1991, art. 14: https://www.planalto.gov.br/ccivil_03/leis/l8218.htm
- RIR/2018 (Decreto 9.580/2018), arts. 272 a 274 e 600: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm
- CTN (Lei 5.172/1966), arts. 150, § 4º, 173, 174 e 195: https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm
- LC 116/2003, arts. 3º, 7º, 8º e 8º-A e lista anexa: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm
- LC 214/2025, arts. 343, 346 e 348: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
- LC 224/2025, art. 4º, §§ 4º e 5º: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm
- Lei 15.270/2025, que inclui o art. 6º-A na Lei 9.250/1995: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm
- MP 2.200-2/2001, art. 10: https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm
- Lei 14.063/2020, arts. 2º e 4º: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm
- Lei 12.682/2012, art. 2º-A: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12682.htm
- Decreto 10.278/2020, arts. 1º e 4º: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/d10278.htm
- Lei 12.865/2013, arts. 6º e 12: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12865.htm
- ITG 2000 (R1): https://www1.cfc.org.br/sisweb/SRE/docs/ITG2000(R1).pdf
- CTG 2001 (R3): https://www1.cfc.org.br/sisweb/SRE/docs/CTG2001(R3).pdf
- NBC TG 1002, Microentidades: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1002.pdf
- NBC TG 47: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG47.pdf (existência conferida; conteúdo lido na versão CPC 47)
- NBC TG 26 (R5): https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG26(R5).pdf (existência conferida; conteúdo lido no CPC 26)
- NBC TG 23 (R2): https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG23(R2).pdf (existência conferida; conteúdo lido no CPC 23)
- NBC TG Estrutura Conceitual: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTGEC.pdf
- CPC 00 (R2): https://s3.sa-east-1.amazonaws.com/static.cpc.aatb.com.br/Documentos/573_CPC00(R2).pdf
- CPC 47 (Rev. 14): https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_47_Rev_14.pdf
- CPC 26 (R1) (Rev. 14): https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_26_R1_rev_14.pdf
- CPC 23 (Rev. 14): https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_23_rev_14.pdf
- STF Tema 1024 (nota técnica do TRF5 com a tese e as datas): https://arquivos.trf5.jus.br/TRF5/Nota_Tecnica_Sobrestamento/2022/08/05/20220805_E97523_Governanca_do_Dessobrestamento_no_Tema_1024_STF.PDF

### Oficiais, não conferidas no portal oficial (texto lido em transcrição)
- IN RFB 2.003/2021 (ECD), arts. 2º, 3º e 5º. Original: http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=115842 ; transcrição: http://www.normaslegais.com.br/legislacao/instrucao-normativa-rfb-2003-2021.htm
- SC Cosit 149/2021 (rateio sem margem): https://www.econeteditora.com.br/bdi/st/st21/PDF/sc_cosit_149_2021.pdf (cópia em site de terceiro; **não abri o PDF**: o conteúdo citado veio dos comentários secundários listados abaixo)

### Secundárias
- SC Cosit 170/2021 (marketplace): https://www.migalhas.com.br/depeso/356011/a-solucao-de-consulta-cosit-70-21-e-a-tributacao-do-marketplace ; https://tributodevido.com.br/portal/tributacao-em-marketplace/
- SC Cosit 144/2023 (reembolso integra a receita): https://tributodevido.com.br/portal/reembolso-despesas-integra-receita-bruta/ ; https://pradvogados.com.br/2023/08/04/receita-federal-afirma-que-valor-reembolsado-ao-prestador-de-servicos-por-este-ter-arcado-com-despesa-e-tributado-pelo-irpj-csll-pis-e-cofins/
- SC Cosit 149/2021 (comentário): https://crespogregio.com.br/publicada-solucao-de-consulta-cosit-no-149-que-traz-regras-para-o-rateio-de-custos-e-despesas-de-empresas-no-lucro-presumido/
- STF Tema 1024 (notícia): https://www.coad.com.br/home/noticias-detalhe/101842/empresas-devem-pagar-piscofins-sobre-taxas-de-administracao-de-cartao-de-credito
- Registros da ECD (I050, I051, I200, I250): https://www.vriconsulting.com.br/guias/guiasIndex.php?idGuia=669 ; https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=670 ; https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=678 ; https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=679 ; https://tdn.totvs.com/display/public/PROT/ECD_SPED_CONTABIL_Alteracoes_para_Leiaute_7_00
- P100 e P150 da ECF: https://www.cigam.com.br/wiki/index.php/Registro_P100_e_P150_da_ECF-_Escritura%C3%A7%C3%A3o_Cont%C3%A1bil_Fiscal
- Distribuição de lucros no Lucro Presumido × regime de caixa: https://www.portalcontnews.com.br/?p=315243 ; https://revistas.apet.org.br/index.php/rdcf/article/download/16/109
- Ato Conjunto RFB/CGIBS 1/2025: https://www.mayerbrown.com/pt/insights/publications/2025/12/joint-normative-act-ato-conjunto-rfbcgibs-no-12025-the-brazilian-federal-revenue-service-rfb-and-the-ibs-management-committee-cgibs-set-forth-the-ancillary ; https://sovos.com/pt-br/atualizacoes-regulatorias/tributos/brasil-ato-conjunto-rfb-cgibs-no-1-2025-esclarece-documentos-fiscais-eletronicos-e-penalidades-de-ibs-e-cbs-em-2026/
- e-Financeira para instituições de pagamento (IN RFB 2.278/2025): https://www.mattosfilho.com.br/unico/instituicoes-pagamento-entregar-e-financeira/
- LC 224/2025 (liminar no TRF-3): https://www.omie.com.br/blog/trf3-suspende-adicional-lucro-presumido-lc-224-2025/index.md
- Classificação da taxa de cartão (fórum de contadores): https://www.contabeis.com.br/forum/contabilidade/177783/taxa-aluguel-da-administradora-de-cartao/
- NBC TG 1001 e 1002 (limites e vigência): https://cfc.org.br/noticias/contador-conheca-as-normas-de-contabilidade-voltadas-para-as-micro-e-pequenas-empresas/
- ISS em Belo Horizonte (Lei 8.725/2003; alíquota não confirmada): https://fazenda.pbh.gov.br/

### O que **não** consegui verificar
- O texto oficial das Soluções de Consulta Cosit 170/2021 e 144/2023 no portal da RFB, que só abre por JavaScript.
- As tabelas oficiais do Plano de Contas Referencial (códigos) e o Manual de Orientação do Leiaute da ECD vigente.
- A alíquota de ISS de Belo Horizonte para os subitens 10.05 e 11.04.
- O texto oficial do Ato Conjunto RFB/CGIBS 1/2025 e da IN RFB 2.278/2025.
