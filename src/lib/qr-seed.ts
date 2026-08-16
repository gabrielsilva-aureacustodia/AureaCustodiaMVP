/**
 * PRNG determinístico do "QR" decorativo da Áurea Custódia.
 *
 * O MVP tinha DUAS cópias do mesmo gerador — `qrSVG` (linha 1819, 14 células) e
 * `drawPdfQR` (linha 1951, 12 células) — e as duas precisavam desenhar o MESMO
 * padrão para o mesmo recibo, senão o QR da tela e o do PDF divergiriam e o
 * usuário perceberia. Aqui o gerador vive num lugar só: o componente
 * `components/svg/QrCode.tsx` e o gerador de PDF importam esta função.
 *
 * ATENÇÃO — não "conserte" a aritmética abaixo. `seed * 1103515245` estoura os
 * 53 bits de precisão do double e perde bits baixos antes do `>>> 0`. Isso é um
 * defeito de um LCG escrito em JS, mas é EXATAMENTE o defeito do original:
 * trocar por `Math.imul` produziria um padrão diferente e quebraria a paridade
 * com os recibos já emitidos. Não há criptografia aqui — é enfeite visual.
 */

/**
 * Matriz `cells x cells` de células preenchidas, em ordem linha-a-linha —
 * a mesma ordem de consumo do PRNG do original, o que garante o mesmo desenho.
 */
export function qrMatrix(seed: string, cells: number): boolean[][] {
  // Hash 31x da string-semente (código do NFT + hash), idêntico ao do MVP.
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0

  const rnd = (): number => {
    s = (s * 1103515245 + 12345) >>> 0
    return (s >>> 8) / 0xffffff
  }

  const matrix: boolean[][] = []
  for (let r = 0; r < cells; r++) {
    const row: boolean[] = []
    // 0.46 é a densidade do original — mexer aqui muda o desenho de todo recibo.
    for (let c = 0; c < cells; c++) row.push(rnd() < 0.46)
    matrix.push(row)
  }
  return matrix
}
