/**
 * Recibo NFT de custódia em PDF — porte de `downloadNftPdf` / `drawPdfQR`
 * (MVP, linhas 1951-2026).
 *
 * Roda no CLIENTE: o jsPDF monta um Blob e dispara o download pelo DOM, coisa
 * que não existe no servidor. O import é dinâmico dentro da função porque o
 * jsPDF pesa algumas centenas de KB e só é usado quando o usuário clica em
 * "Baixar recibo PDF" — não pode entrar no bundle inicial da aplicação.
 *
 * Todas as coordenadas, cores e tamanhos vêm do original, em pontos (unit:'pt')
 * numa página de 480x660. Não são números escolhidos ao acaso: mexer em um
 * desloca a moldura, o selo ou o QR.
 */

import type { jsPDF } from 'jspdf'
import type { Coin } from '@/domain/types'
import { COIN } from '@/domain/constants'
import { qrMatrix } from '@/lib/qr-seed'

/**
 * Desenha o "QR" decorativo ponto a ponto. Usa o mesmo PRNG do QR em SVG da
 * tela (ver lib/qr-seed.ts) para que o recibo impresso e o recibo em tela
 * mostrem o desenho idêntico para o mesmo NFT.
 */
function drawPdfQR(doc: jsPDF, seedStr: string, x: number, y: number, size: number): void {
  const cells = 12
  const cell = size / cells
  const matrix = qrMatrix(seedStr, cells)

  doc.setFillColor(20, 20, 20)
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (matrix[r][c]) doc.rect(x + c * cell, y + r * cell, cell * 0.9, cell * 0.9, 'F')
    }
  }

  // Os três "olhos" do QR, desenhados por cima da trama: preto, miolo creme,
  // ponto preto no centro.
  const finders: Array<[number, number]> = [
    [0, 0],
    [cells - 3, 0],
    [0, cells - 3],
  ]
  for (const [cx, cy] of finders) {
    doc.setFillColor(20, 20, 20)
    doc.rect(x + cx * cell, y + cy * cell, cell * 3, cell * 3, 'F')
    doc.setFillColor(245, 240, 228)
    doc.rect(x + (cx + 0.5) * cell, y + (cy + 0.5) * cell, cell * 2, cell * 2, 'F')
    doc.setFillColor(20, 20, 20)
    doc.rect(x + (cx + 1.1) * cell, y + (cy + 1.1) * cell, cell * 0.8, cell * 0.8, 'F')
  }
}

/**
 * Gera e baixa o recibo. Diferente do MVP, não conhece `state` nem exibe toast:
 * quem chama já resolveu o dono da moeda e é quem avisa o usuário
 * ('Recibo em PDF gerado com sucesso.' era a mensagem original).
 *
 * A única exceção que pode escapar daqui é a falha de carregamento do jsPDF, e
 * ela sai com o texto exato que o MVP mostrava, para o chamador só repassar ao
 * toast.
 *
 * FIDELIDADE: o recibo imprime CINCO campos e não inclui o valor estimado. Uma
 * versão anterior deste port aceitava `valorEstimado` e o ignorava — parâmetro
 * que não faz nada é convite a erro de quem chama, então ele saiu do contrato.
 * Imprimir valor no recibo é mudança de escopo, e vem junto com o
 * reposicionamento da página.
 */
export async function downloadNftReceipt(params: {
  coin: Coin
  ownerName: string
}): Promise<void> {
  const { coin, ownerName } = params

  const mod = await import('jspdf').catch((): never => {
    throw new Error('Não foi possível carregar o gerador de PDF — verifique sua conexão e tente novamente.')
  })
  const doc = new mod.jsPDF({ unit: 'pt', format: [480, 660] })

  // Fundo pergaminho + moldura dupla dourada.
  doc.setFillColor(245, 240, 228)
  doc.rect(0, 0, 480, 660, 'F')
  doc.setDrawColor(184, 148, 66)
  doc.setLineWidth(1.4)
  doc.rect(20, 20, 440, 620)
  doc.setLineWidth(0.5)
  doc.rect(26, 26, 428, 608)

  // Cabeçalho institucional. O subtítulo espaçado imita o lettering da marca.
  doc.setTextColor(20, 36, 66)
  doc.setFont('times', 'bold')
  doc.setFontSize(26)
  doc.text('REAL OLÍMPICO', 240, 92, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(138, 108, 42)
  doc.text('R E A L   O L Í M P I C O', 240, 108, { align: 'center' })
  doc.setDrawColor(201, 162, 75)
  doc.setLineWidth(1.4)
  doc.line(210, 124, 270, 124)

  doc.setFont('times', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(20, 36, 66)
  doc.text('Recibo NFT de Custódia', 240, 150, { align: 'center' })
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(138, 108, 42)
  doc.text(coin.nft.codigo, 240, 168, { align: 'center' })

  // Os CINCO campos do original, nesta ordem. Não acrescente linha aqui: o `y`
  // é acumulador (30pt por campo) e tudo que vem depois — selo, QR e rodapé —
  // é posicionado a partir dele. Um campo a mais empurra o recibo inteiro
  // 30pt para baixo e desmonta a página de 660pt.
  // O ano só aparece junto do tipo quando NÃO é a moeda negociável — para ela
  // o ano é sempre 2012 e repetir seria ruído.
  const fields: Array<[string, string]> = [
    ['Ativo', coin.tipoMoeda + (coin.tipoMoeda !== COIN.name ? ' ' + coin.ano : '')],
    ['Status', coin.nft.status === 'Extinto' ? 'Retirado da custódia' : 'Moeda física recebida e custodiada'],
    ['Data de emissão', coin.nft.dataEmissao],
    ['Proprietário atual', ownerName],
    ['Hash (curto)', coin.nft.hash],
  ]
  let y = 198
  for (const [k, v] of fields) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(107, 98, 72)
    doc.text(k, 56, y)
    doc.setFont('times', 'bold')
    doc.setTextColor(20, 36, 66)
    doc.text(v, 424, y, { align: 'right' })
    doc.setDrawColor(227, 219, 192)
    doc.setLineWidth(0.6)
    doc.line(56, y + 7, 424, y + 7)
    y += 30
  }

  // Selo circular "CUSTÓDIA VERIFICADA" à esquerda, QR à direita.
  doc.setDrawColor(138, 108, 42)
  doc.setLineWidth(1)
  doc.circle(112, y + 40, 24)
  doc.setFont('times', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(138, 108, 42)
  doc.text('CUSTÓDIA', 112, y + 37, { align: 'center' })
  doc.text('VERIFICADA', 112, y + 47, { align: 'center' })

  drawPdfQR(doc, coin.nft.codigo + coin.nft.hash, 320, y + 12, 78)
  doc.setFontSize(7)
  doc.setTextColor(160, 142, 94)
  doc.text('código simulado', 359, y + 98, { align: 'center' })

  doc.setFont('times', 'italic')
  doc.setFontSize(9.5)
  doc.setTextColor(138, 117, 80)
  doc.text('Este recibo certifica a custódia e o vínculo documental.', 240, y + 130, { align: 'center' })
  doc.text('A moeda física permanece sob guarda da Áurea Custódia.', 240, y + 143, { align: 'center' })
  // Mesma tarja do rodapé da aplicação: o PDF sai do ambiente e precisa dizer
  // sozinho que é documento de teste.
  doc.setFontSize(8)
  doc.setTextColor(160, 142, 94)
  doc.text('Ambiente de teste · Pré-MVP · Dados fictícios', 240, y + 156, { align: 'center' })

  doc.save(`recibo-${coin.nft.codigo}.pdf`)
}
