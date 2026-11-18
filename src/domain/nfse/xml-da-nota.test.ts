/**
 * Leitura do XML da NFS-e para o PDF do cliente (frente G, 18/11/2026).
 *
 * O XML de exemplo tem a MESMA FORMA de uma nota de custódia autorizada em produção (lida em 18/11/2026,
 * só leitura), com dados inventados no lugar dos reais: sem CPF, nome nem endereço de ninguém.
 */

import { describe, expect, it } from 'vitest'

import { centavosDoTexto, documentoParaTela, enderecoDeConsultaDaNota, lerDadosDaNota } from './xml-da-nota'

const CHAVE = '31062002268071452000106000000000005426110748266219'

const XML_DE_CUSTODIA =`<?xml version="1.0" encoding="utf-8"?><NFSe versao="1.01" xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe Id="NFS${CHAVE}"><xLocEmi>Belo Horizonte</xLocEmi><xLocPrestacao>Belo Horizonte</xLocPrestacao><nNFSe>54</nNFSe><cLocIncid>3106200</cLocIncid><xLocIncid>Belo Horizonte</xLocIncid><xTribNac>Armazenamento, depósito, guarda de bens de qualquer espécie.</xTribNac><xTribMun>Armazenamento, depósito e guarda de bens de qualquer espécie</xTribMun><xNBS>Serviços de armazenagem não classificados em subposições anteriores</xNBS><verAplic>SefinNacional_1.6.0</verAplic><ambGer>2</ambGer><tpEmis>1</tpEmis><procEmi>1</procEmi><cStat>100</cStat><dhProc>2026-11-16T15:15:56-03:00</dhProc><nDFSe>125385014</nDFSe><emit><CNPJ>68071452000106</CNPJ><xNome>AUREA CUSTODIA LTDA</xNome><enderNac><xLgr>RUA DOS TABAIARES</xLgr><nro>12</nro><xBairro>FLORESTA</xBairro><cMun>3106200</cMun><UF>MG</UF><CEP>30150040</CEP></enderNac><fone>3100000000</fone><email>contato@exemplo.com.br</email></emit><valores><vBC>10.00</vBC><pAliqAplic>5.00</pAliqAplic><vISSQN>0.50</vISSQN><vLiq>10.00</vLiq></valores><IBSCBS><cLocalidadeIncid>3106200</cLocalidadeIncid><xLocalidadeIncid>Belo Horizonte</xLocalidadeIncid><valores><vBC>9.13</vBC><vCalcReeRepRes>0.00</vCalcReeRepRes><uf><pIBSUF>0.10</pIBSUF><pAliqEfetUF>0.10</pAliqEfetUF></uf><mun><pIBSMun>0.00</pIBSMun><pAliqEfetMun>0.00</pAliqEfetMun></mun><fed><pCBS>0.90</pCBS><pAliqEfetCBS>0.90</pAliqEfetCBS></fed></valores><totCIBS><vTotNF>10.00</vTotNF><gIBS><vIBSTot>0.01</vIBSTot><gIBSUFTot><vIBSUF>0.01</vIBSUF></gIBSUFTot><gIBSMunTot><vIBSMun>0.00</vIBSMun></gIBSMunTot></gIBS><gCBS><vCBS>0.08</vCBS></gCBS></totCIBS></IBSCBS><DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="DPS310620026807145200010600001000000000000051"><tpAmb>1</tpAmb><dhEmi>2026-11-16T15:15:25-03:00</dhEmi><verAplic>RealOlimpico-1.0</verAplic><serie>1</serie><nDPS>51</nDPS><dCompet>2026-11-16</dCompet><tpEmit>1</tpEmit><cLocEmi>3106200</cLocEmi><prest><CNPJ>68071452000106</CNPJ><regTrib><opSimpNac>1</opSimpNac><regEspTrib>0</regEspTrib></regTrib></prest><toma><CPF>11122233396</CPF><xNome>MARIA &amp; FILHOS DE TESTE</xNome><end><endNac><cMun>3137601</cMun><CEP>30000000</CEP></endNac><xLgr>RUA DE TESTE</xLgr><nro>100</nro><xBairro>CENTRO</xBairro></end></toma><serv><locPrest><cLocPrestacao>3106200</cLocPrestacao></locPrest><cServ><cTribNac>110401</cTribNac><cTribMun>001</cTribMun><xDescServ>CUSTODIA MENSAL - 16/11/2026 A 16/12/2026 - 5 MOEDAS - REF FAT-2026-11-TESTE-ENT-D16-1</xDescServ><cNBS>106029000</cNBS></cServ></serv><valores><vServPrest><vServ>10.00</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun><tribFed><piscofins><CST>01</CST><vBCPisCofins>10.00</vBCPisCofins><pAliqPis>0.65</pAliqPis><pAliqCofins>3.00</pAliqCofins><vPis>0.07</vPis><vCofins>0.30</vCofins><tpRetPisCofins>0</tpRetPisCofins></piscofins></tribFed></trib></valores></infDPS><Signature>...</Signature></DPS></NFSe>`

describe('lerDadosDaNota', () => {
  const dados = lerDadosDaNota(XML_DE_CUSTODIA)

  it('acha a chave de acesso, o número e quando a Sefin autorizou', () => {
    expect(dados?.chaveAcesso).toBe(CHAVE)
    expect(dados?.numero).toBe('54')
    expect(dados?.autorizadaEmIso).toBe('2026-11-16T15:15:56-03:00')
    expect(dados?.competencia).toBe('2026-11-16')
    expect(dados?.serieDps).toBe('1')
    expect(dados?.numeroDps).toBe('51')
    expect(dados?.ambienteGerador).toBe('2')
    expect(dados?.tipoDeAmbiente).toBe('1')
  })

  it('separa prestador e tomador, e desfaz as entidades do XML', () => {
    expect(dados?.prestador.documento).toBe('68071452000106')
    expect(dados?.prestador.nome).toBe('AUREA CUSTODIA LTDA')
    expect(dados?.prestador.endereco).toMatchObject({ logradouro: 'RUA DOS TABAIARES', numero: '12', uf: 'MG', cep: '30150040' })
    expect(dados?.tomador.documento).toBe('11122233396')
    expect(dados?.tomador.nome).toBe('MARIA & FILHOS DE TESTE')
    expect(dados?.tomador.endereco.logradouro).toBe('RUA DE TESTE')
  })

  it('lê o serviço do pedido e os textos que a Sefin acrescentou à nota', () => {
    expect(dados?.servico).toMatchObject({
      codigoNacional: '110401',
      codigoMunicipal: '001',
      nbs: '106029000',
      textoMunicipal: 'Armazenamento, depósito e guarda de bens de qualquer espécie',
      localDaPrestacao: 'Belo Horizonte',
    })
    expect(dados?.servico.descricao).toContain('CUSTODIA MENSAL')
  })

  it('lê os valores em centavos, cada um do seu bloco (ISSQN, PIS/COFINS e IBS/CBS não se misturam)', () => {
    expect(dados?.valores).toEqual({ servicoCents: 1000, liquidoCents: 1000 })
    expect(dados?.issqn).toEqual({ baseCents: 1000, aliquota: 5, valorCents: 50, retido: false })
    expect(dados?.federal).toEqual({ pisCents: 7, cofinsCents: 30 })
    // A base do IBS/CBS (9,13) é outra que a do ISSQN (10,00): o `vBC` aparece nos dois blocos.
    expect(dados?.ibsCbs).toEqual({ baseCents: 913, ibsCents: 1, cbsCents: 8 })
  })

  it('devolve null para o que não é uma NFS-e', () => {
    expect(lerDadosDaNota(null)).toBeNull()
    expect(lerDadosDaNota('')).toBeNull()
    expect(lerDadosDaNota('<outra>coisa</outra>')).toBeNull()
  })

  it('o que falta no XML vira null, não quebra', () => {
    const minimo = `<NFSe><infNFSe Id="NFS${CHAVE}"><nNFSe>7</nNFSe></infNFSe></NFSe>`
    const d = lerDadosDaNota(minimo)
    expect(d?.numero).toBe('7')
    expect(d?.tomador.nome).toBeNull()
    expect(d?.valores.servicoCents).toBeNull()
    expect(d?.issqn.retido).toBeNull()
  })
})

describe('centavosDoTexto', () => {
  it('converte sem passar por float', () => {
    expect(centavosDoTexto('10.00')).toBe(1000)
    expect(centavosDoTexto('0.07')).toBe(7)
    expect(centavosDoTexto('2.5')).toBe(250)
    expect(centavosDoTexto('3')).toBe(300)
    expect(centavosDoTexto('0.29')).toBe(29)
  })
  it('recusa o que não é o formato da Sefin', () => {
    expect(centavosDoTexto(null)).toBeNull()
    expect(centavosDoTexto('1,00')).toBeNull()
    expect(centavosDoTexto('abc')).toBeNull()
    expect(centavosDoTexto('-1.00')).toBeNull()
  })
})

describe('documentoParaTela e consulta pública', () => {
  it('põe a máscara de CNPJ e de CPF', () => {
    expect(documentoParaTela('68071452000106')).toBe('68.071.452/0001-06')
    expect(documentoParaTela('11122233396')).toBe('111.222.333-96')
    expect(documentoParaTela(null)).toBe('-')
  })
  it('o endereço de consulta leva a chave depois do "chave=" (NT 008)', () => {
    expect(enderecoDeConsultaDaNota(CHAVE)).toBe(`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${CHAVE}`)
  })
})
