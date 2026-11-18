/**
 * O "Documento Auxiliar da NFS-e" em PDF (frente G, 18/11/2026).
 *
 * `montarNotaPdf` devolve o documento sem baixar; o teste confere o que vai impresso e o que NÃO pode ir: uma
 * página só, a chave de acesso e o endereço de consulta pública, a marca de cancelada quando for o caso, e
 * nada do que é interno da plataforma.
 */

import { describe, expect, it } from 'vitest'

import { paraNotaDoCliente, type LinhaDaNota } from '@/domain/nfse/notas-do-cliente'
import { lerDadosDaNota } from '@/domain/nfse/xml-da-nota'

import { dataHoraDaNota, montarNotaPdf } from './nota-pdf'

const CHAVE = '31062002268071452000106000000000005426110748266219'

const XML =
  `<NFSe><infNFSe Id="NFS${CHAVE}"><nNFSe>54</nNFSe><xLocPrestacao>Belo Horizonte</xLocPrestacao>` +
  `<xTribMun>Armazenamento e guarda de bens</xTribMun><dhProc>2026-11-16T15:15:56-03:00</dhProc>` +
  `<emit><CNPJ>68071452000106</CNPJ><xNome>AUREA CUSTODIA LTDA</xNome><enderNac><xLgr>RUA DOS TABAIARES</xLgr><nro>12</nro><UF>MG</UF></enderNac></emit>` +
  `<valores><vBC>10.00</vBC><pAliqAplic>5.00</pAliqAplic><vISSQN>0.50</vISSQN><vLiq>10.00</vLiq></valores>` +
  `<DPS><infDPS><tpAmb>1</tpAmb><serie>1</serie><nDPS>51</nDPS><dCompet>2026-11-16</dCompet>` +
  `<toma><CPF>11122233396</CPF><xNome>MARIA DE TESTE</xNome></toma>` +
  `<serv><cServ><cTribNac>110401</cTribNac><cTribMun>001</cTribMun><xDescServ>CUSTODIA MENSAL TESTE</xDescServ><cNBS>106029000</cNBS></cServ></serv>` +
  `<valores><vServPrest><vServ>10.00</vServ></vServPrest></valores></infDPS></DPS></NFSe>`

function linha(sobre: Partial<LinhaDaNota> = {}): LinhaDaNota {
  return {
    id: 1, servico: 'custodia', refFato: 'FAT-INTERNA-1', valorCents: 1000, ocorridoEm: 1, competencia: '2026-11-16',
    descricao: 'x', quantidadeMoedas: 5, status: 'autorizada', ambiente: 'producao', numeroNfse: '54', chaveAcesso: CHAVE,
    autorizadaEm: 1, canceladaEm: null, motivoCancelamento: null, codigoDoErro: null, temXml: true, ...sobre,
  }
}

async function bruto(sobre: Partial<LinhaDaNota> = {}): Promise<string> {
  const dados = lerDadosDaNota(XML)
  if (!dados) throw new Error('XML de teste inválido')
  const doc = await montarNotaPdf({ nota: paraNotaDoCliente(linha(sobre)), dados })
  expect(doc.getNumberOfPages()).toBe(1)
  return doc.output()
}

describe('montarNotaPdf', () => {
  it('imprime a chave, o endereço de consulta pública e o aviso de que o oficial é o XML', async () => {
    const pdf = await bruto()
    expect(pdf).toContain(`(${CHAVE})`)
    expect(pdf).toContain(`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${CHAVE}`)
    expect(pdf).toContain('Documento Auxiliar da NFS-e')
    expect(pdf).toContain('XML da NFS-e')
  })

  it('imprime os dados que vieram do XML, com a máscara dos documentos', async () => {
    const pdf = await bruto()
    for (const esperado of ['68.071.452/0001-06', '111.222.333-96', 'MARIA DE TESTE', 'CUSTODIA MENSAL TESTE', '110401 / 001', '16/11/2026 15:15:56', '16/11/2026']) {
      expect(pdf).toContain(esperado)
    }
    expect(pdf).toContain('R$ 10,00')
    expect(pdf).toContain('R$ 0,50')
  })

  it('nota emitida não leva marca de cancelada', async () => {
    const pdf = await bruto()
    expect(pdf).not.toContain('CANCELADA')
    expect(pdf).toContain('NFS-e Gerada')
  })

  it('nota cancelada leva a faixa e a marca d\'água, e o motivo em palavras', async () => {
    const pdf = await bruto({ status: 'cancelada', canceladaEm: Date.UTC(2026, 10, 14, 22, 41), motivoCancelamento: '2|justificativa livre interna' })
    expect(pdf).toContain('NFS-e CANCELADA em')
    expect(pdf).toContain('(CANCELADA)')
    expect(pdf).toContain('NFS-e Cancelada')
    expect(pdf).not.toContain('justificativa livre interna')
  })

  it('não imprime nada interno da plataforma (referência do fato, e-mail)', async () => {
    const pdf = await bruto()
    expect(pdf).not.toContain('FAT-INTERNA-1')
    expect(pdf).not.toContain('@')
  })

  it('o que falta no XML sai como "-", sem quebrar', async () => {
    const doc = await montarNotaPdf({
      nota: paraNotaDoCliente(linha()),
      dados: lerDadosDaNota(`<NFSe><infNFSe Id="NFS${CHAVE}"><nNFSe>7</nNFSe></infNFSe></NFSe>`)!,
    })
    expect(doc.getNumberOfPages()).toBe(1)
    expect(doc.output()).toContain('(-)')
  })
})

describe('dataHoraDaNota', () => {
  it('reescreve o instante da nota sem trocar o fuso', () => {
    expect(dataHoraDaNota('2026-11-16T15:15:56-03:00')).toBe('16/11/2026 15:15:56')
    expect(dataHoraDaNota(null)).toBe('-')
    expect(dataHoraDaNota('lixo')).toBe('-')
  })
})
