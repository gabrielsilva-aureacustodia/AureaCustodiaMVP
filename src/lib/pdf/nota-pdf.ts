/**
 * "Documento Auxiliar da NFS-e" em PDF — a folha que o cliente baixa em Minha conta › Notas fiscais
 * (frente G, 18/11/2026).
 *
 * O QUE É E O QUE NÃO É — o documento fiscal da nota é o XML autorizado pela Sefin Nacional; este PDF é só a
 * representação gráfica dele, para quem não lê XML. A API oficial que gerava o DANFSe foi suspensa em
 * 03/08/2026 (NT 008 v1.02) e quem emite passou a desenhar o próprio PDF. Esta folha segue a ORDEM dos blocos
 * do DANFSe (identificação, prestador, tomador, serviço, tributação, valores) mas NÃO é o DANFSe v2.0 completo
 * da NT 008: não leva o QR Code (o projeto não tem biblioteca de QR e a frente não instala dependência). No
 * lugar dele, a folha imprime a chave de acesso e o endereço de consulta pública, e diz que o oficial é o XML.
 * Se o Gabriel quiser o layout oficial, é tarefa à parte, a combinar com o contador.
 *
 * Roda no CLIENTE, como o recibo (`recibo-pdf.ts`): o jsPDF monta o documento e o navegador baixa. O import é
 * dinâmico porque o jsPDF pesa algumas centenas de KB e só entra no clique de "Baixar PDF".
 *
 * Tudo vem do XML autorizado (`DadosDaNotaXml`) — o que o governo registrou, não o que a plataforma pediu — e o
 * que faltar sai como "-", como o DANFSe do contador faz. Dinheiro em centavos, formatado por `brl`.
 */

import type { jsPDF } from 'jspdf'

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import { competenciaParaTela, type NotaDoCliente } from '@/domain/nfse/notas-do-cliente'
import { documentoParaTela, enderecoDeConsultaDaNota, type DadosDaNotaXml, type EnderecoDaNota } from '@/domain/nfse/xml-da-nota'

const MARGEM = 12
const LARGURA = 210 - MARGEM * 2
const CINZA_ROTULO = 110
const CINZA_FUNDO = 238

/** O NBSP que o `toLocaleString` põe depois do "R$" vira espaço comum: a fonte padrão do PDF o desenha mal. */
function dinheiro(centavos: number | null): string {
  return centavos === null ? '-' : brl(centavos).replace(/ /g, ' ')
}

function texto(valor: string | null | undefined): string {
  return valor && valor.trim() !== '' ? valor.trim() : '-'
}

/** '2026-11-16T15:15:56-03:00' → '16/11/2026 15:15:56', sem passar por `Date`: o fuso é o que está escrito na nota. */
export function dataHoraDaNota(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}` : '-'
}

function enderecoEmTexto(e: EnderecoDaNota): string {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ')
  const partes = [rua, e.bairro, e.cep ? `CEP ${e.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : null, e.uf].filter(Boolean)
  return partes.length ? partes.join(' - ') : '-'
}

function situacao(nota: NotaDoCliente): string {
  if (nota.estado === 'cancelada') return 'NFS-e Cancelada'
  if (nota.estado === 'cancelando') return 'Cancelamento em andamento'
  return 'NFS-e Gerada'
}

interface Campo {
  rotulo: string
  valor: string
  /** Fração da largura da linha (a soma de uma linha deve dar 1). */
  fracao: number
}

/** Uma barra cinza com o título do bloco; devolve o `y` logo abaixo dela. */
function secao(doc: jsPDF, y: number, titulo: string): number {
  doc.setFillColor(CINZA_FUNDO, CINZA_FUNDO, CINZA_FUNDO)
  doc.rect(MARGEM, y, LARGURA, 5.2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30)
  doc.text(titulo.toUpperCase(), MARGEM + 2, y + 3.7)
  return y + 5.2
}

/** Uma linha de campos com rótulo pequeno em cima e valor embaixo; quebra o valor e devolve o `y` abaixo. */
function linha(doc: jsPDF, y: number, campos: readonly Campo[]): number {
  doc.setFontSize(9)
  const quebrados = campos.map((c) => doc.splitTextToSize(c.valor, LARGURA * c.fracao - 4) as string[])
  const altura = 4.4 + Math.max(...quebrados.map((q) => q.length)) * 4 + 1
  let x = MARGEM
  campos.forEach((c, i) => {
    const largura = LARGURA * c.fracao
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.rect(x, y, largura, altura)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(CINZA_ROTULO)
    doc.text(c.rotulo.toUpperCase(), x + 2, y + 3.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(20)
    doc.text(quebrados[i], x + 2, y + 7.4)
    x += largura
  })
  return y + altura
}

/**
 * Monta o documento SEM baixar — separado de `baixarNotaPdf` para o teste ler o que vai impresso (o `doc.save`
 * depende do DOM do navegador), como em `recibo-pdf.ts`.
 */
export async function montarNotaPdf(params: { nota: NotaDoCliente; dados: DadosDaNotaXml }): Promise<jsPDF> {
  const { nota, dados } = params

  const mod = await import('jspdf').catch((): never => {
    throw new Error('Não foi possível carregar o gerador de PDF — verifique sua conexão e tente novamente.')
  })
  const doc = new mod.jsPDF({ unit: 'mm', format: 'a4' })

  const cancelada = nota.estado === 'cancelada'
  const chave = dados.chaveAcesso ?? nota.chaveAcesso

  // Marca d'água, desenhada primeiro para ficar por baixo dos campos.
  if (cancelada) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(80)
    doc.setTextColor(235, 215, 215)
    doc.text('CANCELADA', 40, 190, { angle: 38 })
  }

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(20)
  doc.text('Documento Auxiliar da NFS-e', MARGEM, MARGEM + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(CINZA_ROTULO)
  doc.text('Nota Fiscal de Serviço eletrônica (NFS-e) - Padrão Nacional', MARGEM, MARGEM + 10)
  let y = MARGEM + 14

  if (cancelada) {
    doc.setFillColor(196, 40, 40)
    doc.rect(MARGEM, y, LARGURA, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255)
    const quando = nota.canceladaEm ? ` em ${fdate(nota.canceladaEm)}` : ''
    const motivo = nota.motivoDoCancelamento ? ` - ${nota.motivoDoCancelamento}` : ''
    doc.text(`NFS-e CANCELADA${quando}${motivo}`, MARGEM + 3, y + 5.4)
    y += 10.5
  }

  y = secao(doc, y, 'Identificação da NFS-e')
  y = linha(doc, y, [
    { rotulo: 'Número da NFS-e', valor: texto(dados.numero ?? nota.numero), fracao: 0.2 },
    { rotulo: 'Competência da NFS-e', valor: texto(dados.competencia ? competenciaParaTela(dados.competencia) : null), fracao: 0.25 },
    { rotulo: 'Data e hora da emissão', valor: dataHoraDaNota(dados.autorizadaEmIso), fracao: 0.3 },
    { rotulo: 'Situação', valor: situacao(nota), fracao: 0.25 },
  ])
  y = linha(doc, y, [
    { rotulo: 'Número da DPS', valor: texto(dados.numeroDps), fracao: 0.3 },
    { rotulo: 'Série da DPS', valor: texto(dados.serieDps), fracao: 0.3 },
    { rotulo: 'Ambiente', valor: dados.tipoDeAmbiente === '1' ? 'Produção' : dados.tipoDeAmbiente === '2' ? 'Homologação' : '-', fracao: 0.4 },
  ])

  // A chave em fonte de largura fixa, para o cliente conferir no portal sem trocar um dígito.
  const alturaChave = 11
  doc.setDrawColor(200)
  doc.rect(MARGEM, y, LARGURA, alturaChave)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(CINZA_ROTULO)
  doc.text('CHAVE DE ACESSO DA NFS-E', MARGEM + 2, y + 3.2)
  doc.setFont('courier', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(20)
  doc.text(texto(chave), MARGEM + 2, y + 8)
  y += alturaChave + 3

  y = secao(doc, y, 'Prestador / Fornecedor')
  y = linha(doc, y, [
    { rotulo: 'CNPJ / CPF', valor: documentoParaTela(dados.prestador.documento), fracao: 0.3 },
    { rotulo: 'Nome / Nome empresarial', valor: texto(dados.prestador.nome), fracao: 0.7 },
  ])
  y = linha(doc, y, [{ rotulo: 'Endereço', valor: enderecoEmTexto(dados.prestador.endereco), fracao: 1 }])
  y += 3

  y = secao(doc, y, 'Tomador / Adquirente')
  y = linha(doc, y, [
    { rotulo: 'CNPJ / CPF', valor: documentoParaTela(dados.tomador.documento), fracao: 0.3 },
    { rotulo: 'Nome / Nome empresarial', valor: texto(dados.tomador.nome), fracao: 0.7 },
  ])
  y = linha(doc, y, [{ rotulo: 'Endereço', valor: enderecoEmTexto(dados.tomador.endereco), fracao: 1 }])
  y += 3

  y = secao(doc, y, 'Serviço prestado')
  y = linha(doc, y, [
    { rotulo: 'Código de tributação nacional / municipal', valor: `${texto(dados.servico.codigoNacional)} / ${texto(dados.servico.codigoMunicipal)}`, fracao: 0.4 },
    { rotulo: 'Código da NBS', valor: texto(dados.servico.nbs), fracao: 0.25 },
    { rotulo: 'Local da prestação', valor: texto(dados.servico.localDaPrestacao), fracao: 0.35 },
  ])
  y = linha(doc, y, [{ rotulo: 'Serviço (tributação municipal)', valor: texto(dados.servico.textoMunicipal ?? dados.servico.textoNacional), fracao: 1 }])
  y = linha(doc, y, [{ rotulo: 'Descrição do serviço', valor: texto(dados.servico.descricao), fracao: 1 }])
  y += 3

  y = secao(doc, y, 'Tributação municipal (ISSQN)')
  y = linha(doc, y, [
    { rotulo: 'Base de cálculo do ISSQN', valor: dinheiro(dados.issqn.baseCents), fracao: 0.25 },
    { rotulo: 'Alíquota aplicada', valor: dados.issqn.aliquota === null ? '-' : `${dados.issqn.aliquota.toFixed(2).replace('.', ',')} %`, fracao: 0.25 },
    { rotulo: 'Retenção do ISSQN', valor: dados.issqn.retido === null ? '-' : dados.issqn.retido ? 'Retido' : 'Não retido', fracao: 0.25 },
    { rotulo: 'ISSQN apurado', valor: dinheiro(dados.issqn.valorCents), fracao: 0.25 },
  ])
  y += 3

  y = secao(doc, y, 'Tributação federal e IBS/CBS')
  y = linha(doc, y, [
    { rotulo: 'PIS (apuração própria)', valor: dinheiro(dados.federal.pisCents), fracao: 0.25 },
    { rotulo: 'COFINS (apuração própria)', valor: dinheiro(dados.federal.cofinsCents), fracao: 0.25 },
    { rotulo: 'Base de cálculo IBS/CBS', valor: dinheiro(dados.ibsCbs.baseCents), fracao: 0.25 },
    { rotulo: 'Total do IBS / CBS', valor: `${dinheiro(dados.ibsCbs.ibsCents)} / ${dinheiro(dados.ibsCbs.cbsCents)}`, fracao: 0.25 },
  ])
  y += 3

  y = secao(doc, y, 'Valor total da NFS-e')
  y = linha(doc, y, [
    { rotulo: 'Valor da operação / serviço', valor: dinheiro(dados.valores.servicoCents ?? nota.valorCents), fracao: 0.5 },
    { rotulo: 'Valor líquido da NFS-e', valor: dinheiro(dados.valores.liquidoCents ?? nota.valorCents), fracao: 0.5 },
  ])
  y += 6

  // Rodapé: o que esta folha é, e como conferir a nota no governo.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60)
  const aviso = doc.splitTextToSize(
    'Esta folha é uma representação gráfica para conferência. O documento fiscal oficial é o arquivo XML da NFS-e, que também pode ser baixado em Minha conta > Notas fiscais. ' +
      'A autenticidade da nota pode ser verificada no portal nacional da NFS-e, pela chave de acesso acima, no endereço:',
    LARGURA,
  ) as string[]
  doc.text(aviso, MARGEM, y)
  y += aviso.length * 3.8 + 1
  if (chave) {
    const url = enderecoDeConsultaDaNota(chave)
    doc.setTextColor(20, 70, 160)
    doc.textWithLink(url, MARGEM, y, { url })
  }

  return doc
}

/** Gera e baixa o PDF. O nome do arquivo vem da ação (`NFSe-<chave>.pdf`). */
export async function baixarNotaPdf(params: { nota: NotaDoCliente; dados: DadosDaNotaXml; nome: string }): Promise<void> {
  const doc = await montarNotaPdf({ nota: params.nota, dados: params.dados })
  doc.save(params.nome)
}
