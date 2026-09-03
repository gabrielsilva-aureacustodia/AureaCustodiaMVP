/**
 * Hash determinístico e encadeado — a base da trilha de auditoria (módulo M4).
 *
 * NÃO É PORT: o monolito só tinha `genHash()` em codes.ts, que sorteia um texto
 * com cara de hash e não prova nada (RA-05). Este arquivo é a resposta a essa
 * dívida: SHA-256 de verdade, calculado sobre campos em ordem fixa, e cada
 * lançamento incorporando o hash do anterior. Alterar uma linha antiga muda o
 * hash dela, e com ele o de todas as posteriores — a adulteração fica
 * detectável sem precisar de terceiro nem de blockchain.
 *
 * POR QUE O SHA-256 ESTÁ ESCRITO À MÃO AQUI
 * ----------------------------------------
 * A regra de @/domain é "sem I/O, sem async, sem importar nada de fora". O
 * `node:crypto` é síncrono mas só existe no servidor; o WebCrypto do navegador
 * é assíncrono. Uma implementação pura resolve os dois lados e, mais
 * importante, fixa o algoritmo: o hash gravado no banco tem de ser reproduzível
 * em qualquer máquina, em qualquer ano, com qualquer versão do Node. São
 * sessenta linhas do FIPS 180-4, conferidas contra os vetores oficiais em
 * hash.test.ts — e contra o `node:crypto`, no mesmo teste.
 *
 * A FÓRMULA É CONGELADA
 * ---------------------
 * `hashEncadeado(anterior, campos)` = SHA-256( anterior + '\n' + campos.join('|') )
 *
 *  - `anterior` é o hash hexadecimal do lançamento anterior, ou GENESIS (64
 *    zeros) para o primeiro;
 *  - cada campo vira texto por `campoCanonico`: número inteiro em decimal,
 *    `null` vira string vazia, texto entra como está (sem trim, sem acento
 *    removido — normalizar aqui seria um jeito de dois textos diferentes
 *    produzirem o mesmo hash);
 *  - o separador é `|` e a ordem dos campos é a de CAMPOS_DO_LANCAMENTO em
 *    ledger.ts. Um campo a mais, uma vírgula trocada, muda todos os hashes
 *    seguintes — e é por isso que a lista está escrita no código e não em
 *    configuração.
 *
 * Mudar esta fórmula depois de haver linha gravada exige uma migration que
 * recalcule a cadeia inteira e registre a troca. Não é edição casual.
 */

/** Hash "anterior" do primeiro lançamento: sessenta e quatro zeros. */
export const GENESIS: string = '0'.repeat(64)

export type CampoDeHash = string | number | null

/** Forma canônica de um campo antes de entrar no hash. Ver o cabeçalho. */
export function campoCanonico(v: CampoDeHash): string {
  if (v === null) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Campo numérico inválido para o hash: ${String(v)}`)
    return String(v)
  }
  return v
}

/** O texto exato que é hasheado. Exportado para que o teste e a auditoria externa o reproduzam. */
export function textoParaHash(hashAnterior: string, campos: readonly CampoDeHash[]): string {
  return hashAnterior + '\n' + campos.map(campoCanonico).join('|')
}

/** SHA-256 do texto canônico, em hexadecimal minúsculo. */
export function hashEncadeado(hashAnterior: string, campos: readonly CampoDeHash[]): string {
  return sha256Hex(textoParaHash(hashAnterior, campos))
}

/* ---------------------------------------------------------------------------
 * SHA-256 (FIPS 180-4), puro. Entrada em UTF-8.
 * ------------------------------------------------------------------------- */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

/** Codifica em UTF-8 sem depender de TextEncoder (que o domínio não assume existir). */
function utf8(texto: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < texto.length; i++) {
    let cp = texto.charCodeAt(i)
    // Par substituto: junta os dois code units num code point.
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < texto.length) {
      const baixo = texto.charCodeAt(i + 1)
      if (baixo >= 0xdc00 && baixo <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (baixo - 0xdc00)
        i++
      }
    }
    if (cp < 0x80) bytes.push(cp)
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f))
    else if (cp < 0x10000)
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    else
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      )
  }
  return bytes
}

export function sha256Hex(texto: string): string {
  const msg = utf8(texto)
  const bitLen = msg.length * 8

  // Padding: 0x80, zeros até 56 mod 64, e o tamanho em bits (64 bits big-endian).
  msg.push(0x80)
  while (msg.length % 64 !== 56) msg.push(0)
  // Tamanhos até 2^53 bits: a parte alta cabe num inteiro de 32 bits sem perda.
  const alto = Math.floor(bitLen / 0x100000000)
  const baixo = bitLen >>> 0
  msg.push((alto >>> 24) & 0xff, (alto >>> 16) & 0xff, (alto >>> 8) & 0xff, alto & 0xff)
  msg.push((baixo >>> 24) & 0xff, (baixo >>> 16) & 0xff, (baixo >>> 8) & 0xff, baixo & 0xff)

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const w = new Uint32Array(64)
  for (let off = 0; off < msg.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4
      w[i] = ((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => x.toString(16).padStart(8, '0')).join('')
}
