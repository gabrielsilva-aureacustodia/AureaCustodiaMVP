# Fontes consultadas (22/10/2026)

Lista consolidada. O que cada fonte sustenta, item a item, está nos anexos de `pesquisa/` e em `TAXAS_MERCADO_PAGO.md`.
**Oficial** = lida no site do órgão; **secundária** = comentário de terceiro, serve de indício.

## Documentos da empresa
- NFS-e nº 1, 2 e 3 emitidas pelo contador em 22/10/2026 (DANFSe v2.0, PDFs do Gabriel).
- Ata automática da reunião com o contador, 16/10/2026 (Gemini).
- "Aurea Custodia - Contábil" — roteiro do Gabriel para a reunião.

## NFS-e Nacional (oficiais)
- Documentação técnica atual: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- APIs, produção restrita e produção: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
- Manual dos Contribuintes – APIs do Emissor Público Nacional v1.2: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf/@@download/file
- Manual dos Contribuintes – APIs do ADN v1.0: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf
- Manual Integrado v1.00.02: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/manualintegradosnnfse_v1-00-02-producao.pdf
- Anexo I – leiaute e regras DPS/NFS-e v1.01: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx
- Anexo II – eventos v1.01: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_ii-sefin_adn-pedregevt_evt-snnfse-v1-01-20260122.xlsx
- Anexo B – NBS e lista de serviços: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx
- Anexo C – indicador de operação IBS/CBS: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo-c-indop-ibscbs-snnfse-v1-01.xlsx
- Anexo VIII – correlação item × NBS × IndOp × cClassTrib: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/anexoviii-correlacaoitemnbsindopcclasstrib_ibscbs_v1-01-00.xlsx
- Esquemas XSD v1.01: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/nfse-esquemas_xsd-v1-01-20260209.zip
- Nota Técnica 009 v1.01: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nota-tecnica-009-se-cgnfs-e-v-1-01.pdf — Anexo VI: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/anexovi-leiautesrn_rtc_ibscbs-v1-04-01-nt009.xlsx
- NT 008 (DANFSe) v1.02: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nt-008-se-cgnfse-danfse-20260714-v1-02.pdf
- Perguntas e Respostas NFS-e v1.1 (22/09/2026): https://www.gov.br/nfse/pt-br/perguntas-frequentes/perguntas-e-respostas-nfs-e-v-1-1-20260922.pdf
- Notícias CGNFS-e: prazos de IBS/CBS https://www.gov.br/nfse/pt-br/noticias/cgnfs-e-orienta-sobre-os-prazos-para%20destaque-de-ibs-cbs-nas-notas-fiscais-de-servico · NT 009 em testes https://www.gov.br/nfse/pt-br/noticias/cgnfs-e-informa-disponibilizadas-no-ambiente-de-testes-o-release-1-das-evolucoes-da-nota-tecnica-009 · Ato Técnico Conjunto nº 7 https://www.gov.br/nfse/pt-br/noticias/publicado-o-ato-tecnico-conjunto-rfb-cgibs-no-7-aprovando-a-versao-1-01-da-nota-tecnica-009-nfs-e-e-a-nota-tecnica-010-da-nfs-e-via · DANFSe https://www.gov.br/nfse/pt-br/noticias/danfse-novos-ajustes-de-leiaute-e-prorrogacao-do-prazo-para-adequacao · lista https://www.gov.br/nfse/pt-br/noticias
- Swaggers: https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index · https://sefin.nfse.gov.br/SefinNacional/docs/index · https://adn.nfse.gov.br/contribuintes/docs/index.html · https://adn.nfse.gov.br/parametrizacao/docs/index.html · https://adn.nfse.gov.br/danfse/docs/index.html
- Emissor Web de testes: https://www.producaorestrita.nfse.gov.br/EmissorNacional/
- Tabela CST/cClassTrib (Portal NF-e, Informe Técnico 2025.002): https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=jxTMMQeEVM8=

### `tpOper` e `indFinal` (pesquisa de 23/10/2026)
- Anexo I v1.01 (definição dos campos e regras E0903–E0906) e Anexo VI / NT 009 (reinserção do `indFinal`), listados
  acima.
- LC 214/2025, art. 57 (uso ou consumo pessoal), na redação da LC 227/2026: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
- Nibo, "Serviço prestado para ente governamental e tipo de operação na NFS-e Nacional" (secundária: confirma o uso do
  campo na intermediação 10.05, sem recomendar valor): https://ajuda.nibo.com.br/pt-BR/articles/14669678-servico-prestado-para-ente-governamental-e-tipo-de-operacao-na-nfs-e-nacional
- Focus NFe, guias municipais (secundária: o `indFinal` aceita 0 ou 1, sem regra para pessoa física): https://focusnfe.com.br/guides/nfse/municipios-integrados/santos-sp/
- Senior, NFS-e na reforma tributária (secundária): https://documentacao.senior.com.br/seniorxplatform/manual-do-usuario/erp/mercado/faturamento/nota-servico-reforma.htm

## Belo Horizonte (oficiais)
- Portaria SMFA 75/2025 (com a 88/2025): https://fazenda.pbh.gov.br/internet/legislacao/formkey.asp?key=1354
- FAQ NFS-e Nacional da PBH v7.1: http://fazenda.pbh.gov.br/nfse/FAQ/
- Lei Municipal 8.725/2003, art. 14 (alíquotas de ISS): https://fazenda.pbh.gov.br/internet/legislacao/formchave.asp?key=542
- BH adere ao Emissor Nacional: https://prefeitura.pbh.gov.br/noticias/belo-horizonte-adere-ao-emissor-nacional-de-nota-fiscal-de-servico-eletronica
- Correlação CTISS × código nacional (não abriu, página em JavaScript): https://servicos.pbh.gov.br/servicos+issqn-correlacao-ctiss-codigo-de-tributacao-do-issqn-codigo-de-tributacao-nacional+68fa794eb5ad6a681fc1ec16

## Leis e decretos (Planalto, oficiais)
- Código Civil, arts. 1.179–1.195: https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm
- Lei 6.404/1976, arts. 177 e 187: https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm
- Decreto-Lei 1.598/1977, art. 12: https://www.planalto.gov.br/ccivil_03/decreto-lei/del1598.htm
- CTN, arts. 150, 173, 174 e 195: https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm
- RIR/2018 (Decreto 9.580), arts. 272–274 e 600: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm
- LC 116/2003 (ISS e lista de serviços): https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm
- LC 214/2025 (IBS/CBS), arts. 10–12, 57, 62, 343, 346, 348: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
- LC 224/2025: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm
- Lei 9.249/1995: https://www.planalto.gov.br/ccivil_03/leis/l9249.htm · Lei 7.689/1988: https://www.planalto.gov.br/ccivil_03/leis/l7689.htm
- Lei 9.718/1998: https://www.planalto.gov.br/ccivil_03/leis/l9718compilada.htm · Lei 9.715/1998: https://www.planalto.gov.br/ccivil_03/leis/l9715.htm
- Lei 10.637/2002: https://www.planalto.gov.br/ccivil_03/leis/2002/l10637.htm · Lei 10.833/2003: https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm
- Lei 9.430/1996, art. 42: https://www.planalto.gov.br/ccivil_03/leis/l9430.htm · Lei 8.218/1991: https://www.planalto.gov.br/ccivil_03/leis/l8218.htm
- Lei 15.270/2025 (retenção sobre lucros): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm
- Lei 12.741/2012 (tributos aproximados): https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12741.htm
- Lei 12.865/2013: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12865.htm
- MP 2.200-2/2001: https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm · Lei 14.063/2020: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm · Lei 12.682/2012: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12682.htm · Decreto 10.278/2020: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/d10278.htm

## Normas contábeis (CFC / CPC, oficiais)
- ITG 2000 (R1): https://www1.cfc.org.br/sisweb/SRE/docs/ITG2000(R1).pdf
- CTG 2001 (R3): https://www1.cfc.org.br/sisweb/SRE/docs/CTG2001(R3).pdf
- NBC TG 1002 (microentidades): https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG1002.pdf
- NBC TG Estrutura Conceitual: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTGEC.pdf · CPC 00 (R2): https://s3.sa-east-1.amazonaws.com/static.cpc.aatb.com.br/Documentos/573_CPC00(R2).pdf
- NBC TG 47 / CPC 47: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG47.pdf · https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_47_Rev_14.pdf
- NBC TG 26 / CPC 26: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG26(R5).pdf · https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_26_R1_rev_14.pdf
- NBC TG 23 / CPC 23: https://www1.cfc.org.br/sisweb/SRE/docs/NBCTG23(R2).pdf · https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_23_rev_14.pdf
- STF Tema 1024 (nota técnica do TRF5): https://arquivos.trf5.jus.br/TRF5/Nota_Tecnica_Sobrestamento/2022/08/05/20220805_E97523_Governanca_do_Dessobrestamento_no_Tema_1024_STF.PDF

## Receita Federal (oficial, lida em transcrição — o portal só abre com JavaScript)
- IN RFB 2.003/2021 (ECD): http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=115842 · transcrição: http://www.normaslegais.com.br/legislacao/instrucao-normativa-rfb-2003-2021.htm
- SC Cosit 149/2021: https://www.econeteditora.com.br/bdi/st/st21/PDF/sc_cosit_149_2021.pdf

## Mercado Pago (oficiais)
- Checkout (taxas): https://www.mercadopago.com.br/ferramentas-para-vender/check-out
- Link de pagamento (taxas e parcelamento): https://www.mercadopago.com.br/ferramentas-para-vender/link-de-pagamento
- Assinaturas (taxas): https://www.mercadopago.com.br/ferramentas-para-vender/assinaturas
- Termos e Condições de Uso: https://www.mercadopago.com.br/ajuda/299
- Conta digital (tarifas): https://www.mercadopago.com.br/conta
- QR Code presencial (referência): https://www.mercadopago.com.br/ajuda/quanto-custa-receber-pagamentos-com-codigo-qr_3605
- Blog Checkout Pro × Transparente: https://www.mercadopago.com.br/blog/checkout-pro-vs-transparente
- Obter pagamento (API): https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/get-payment/get
- Reembolsos: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/payment-management/cancellations-and-refunds/introduction
- Assinaturas — fatura autorizada: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-authorized-payment/get · visão geral: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/landing
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- Payouts: https://www.mercadopago.com.br/developers/pt/docs/payouts/integration-configuration/money-transfers · https://www.mercadopago.com.br/developers/en/docs/payouts/resources/endpoints-map
- Relatório de Liberações: https://www.mercadopago.com.br/developers/pt/reference/releases-report/create-report/post · campos: https://www.mercadopago.com.br/developers/pt/docs/reports/released-money/report-fields
- Relatório Dinheiro em conta: https://www.mercadopago.com.br/developers/pt/reference/settlements-report/create-report/post · campos: https://mercadopago.com.br/developers/en/docs/reports/account-money/report-fields

## Implementações de referência (não oficiais)
- open-nfse (TypeScript, MIT, com cópia dos Swaggers): https://github.com/fm-s/open-nfse · https://github.com/fm-s/open-nfse/tree/main/specs
- nfse-php: https://github.com/nfse-nacional/nfse-php · gildonei/nfse-nacional: https://packagist.org/packages/gildonei/nfse-nacional
- Fórum ACBr (rejeições na produção restrita): https://www.projetoacbr.com.br/forum/topic/92867-nfs-e-nacional-sefin-produ%C3%A7%C3%A3o-restrita-%E2%80%94-e999-mesmo-com-xmldsig-ok-e-dps-equivalente-ao-emissor-web/
- Vercel, limites de variáveis: https://vercel.com/docs/environment-variables · https://vercel.com/docs/limits

## Secundárias (indício, não fundamento)
- SC Cosit 170/2021 (marketplace): https://www.migalhas.com.br/depeso/356011/a-solucao-de-consulta-cosit-70-21-e-a-tributacao-do-marketplace · https://tributodevido.com.br/portal/tributacao-em-marketplace/
- SC Cosit 144/2023 (reembolso integra receita): https://tributodevido.com.br/portal/reembolso-despesas-integra-receita-bruta/ · https://pradvogados.com.br/2023/08/04/receita-federal-afirma-que-valor-reembolsado-ao-prestador-de-servicos-por-este-ter-arcado-com-despesa-e-tributado-pelo-irpj-csll-pis-e-cofins/
- SC Cosit 149/2021 (comentário): https://crespogregio.com.br/publicada-solucao-de-consulta-cosit-no-149-que-traz-regras-para-o-rateio-de-custos-e-despesas-de-empresas-no-lucro-presumido/
- Tema 1024 (notícia): https://www.coad.com.br/home/noticias-detalhe/101842/empresas-devem-pagar-piscofins-sobre-taxas-de-administracao-de-cartao-de-credito
- ECD, registros I050/I051/I200/I250: https://www.vriconsulting.com.br/guias/guiasIndex.php?idGuia=669 · https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=670 · https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=678 · https://vriconsulting.com.br/guias/guiasIndex.php?idGuia=679 · https://tdn.totvs.com/display/public/PROT/ECD_SPED_CONTABIL_Alteracoes_para_Leiaute_7_00
- ECF P100/P150: https://www.cigam.com.br/wiki/index.php/Registro_P100_e_P150_da_ECF-_Escritura%C3%A7%C3%A3o_Cont%C3%A1bil_Fiscal
- Distribuição de lucros × regime de caixa: https://www.portalcontnews.com.br/?p=315243 · https://revistas.apet.org.br/index.php/rdcf/article/download/16/109
- Ato Conjunto RFB/CGIBS 1/2025: https://www.mayerbrown.com/pt/insights/publications/2025/12/joint-normative-act-ato-conjunto-rfbcgibs-no-12025-the-brazilian-federal-revenue-service-rfb-and-the-ibs-management-committee-cgibs-set-forth-the-ancillary · https://sovos.com/pt-br/atualizacoes-regulatorias/tributos/brasil-ato-conjunto-rfb-cgibs-no-1-2025-esclarece-documentos-fiscais-eletronicos-e-penalidades-de-ibs-e-cbs-em-2026/
- e-Financeira para instituições de pagamento: https://www.mattosfilho.com.br/unico/instituicoes-pagamento-entregar-e-financeira/
- LC 224 (liminar TRF-3): https://www.omie.com.br/blog/trf3-suspende-adicional-lucro-presumido-lc-224-2025/index.md
- Classificação da taxa de cartão (fórum): https://www.contabeis.com.br/forum/contabilidade/177783/taxa-aluguel-da-administradora-de-cartao/
- NBC TG 1001/1002 (limites): https://cfc.org.br/noticias/contador-conheca-as-normas-de-contabilidade-voltadas-para-as-micro-e-pequenas-empresas/
- Tabela IBPT: https://inventti.com.br/tabela-ibpt/ · STF Tema 296: https://juris.damasio.com.br/temas/stf/296 · guarda de documentos: https://jus.com.br/artigos/10687/decadencia-e-conservacao-de-documentos-fiscais · cClassTrib 000001: https://buscadorncm.com.br/cclasstrib/000001

## Não foi possível verificar
Texto oficial das SC Cosit 170/2021 e 144/2023; códigos do Plano de Contas Referencial; Manual da ECD vigente; texto
oficial do Ato Conjunto RFB/CGIBS 1/2025 e da IN RFB 2.278/2025; tabela CTISS de BH (códigos 001 e 003 fora do DANFSe);
taxa do Payouts e do Pix enviado pela conta PJ do Mercado Pago.
