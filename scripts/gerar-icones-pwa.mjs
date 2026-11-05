/**
 * Gera os ícones do PWA a partir do emblema OFICIAL (public/brand/logo-real-olimpico-emblema.png).
 *
 * Nada aqui desenha ou recolore a marca: o script só REDIMENSIONA o emblema e o assenta no azul-noite da
 * identidade (--ro-noite-950, #081226). É o mesmo recorte de sempre em quatro tamanhos, e pode ser rodado de novo
 * se o arquivo oficial mudar:
 *
 *     node scripts/gerar-icones-pwa.mjs
 *
 * POR QUE QUATRO ARQUIVOS E NÃO UM
 *  - `any` (192, 512): usado como está — lista de apps, diálogo de instalação, atalhos.
 *  - `maskable` (512): o Android recorta o ícone na forma que o sistema escolher (círculo, quadrado arredondado,
 *    gota). Só a área central, um círculo de 80% do lado, é garantida. O emblema é redondo e ocupa 68% do lado: sobra
 *    folga mesmo no recorte mais agressivo, e o azul-noite sangra até a borda para não aparecer faixa branca.
 *  - `apple-touch` (180): o iPhone NÃO lê o manifesto para o ícone; lê o `<link rel="apple-touch-icon">`, quer PNG
 *    opaco (transparência vira preto) e arredonda os cantos sozinho. Vai para `src/app/apple-icon.png`, que o Next
 *    liga ao <head> pela convenção de arquivo.
 *
 * Todos saem OPACOS — é o que o iOS exige e o que evita "quadrado preto" em lançadores antigos. O PNG indexado
 * (paleta) não tem transparência alguma, porque a entrada já foi achatada sobre o azul-noite.
 */

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const EMBLEMA = join(raiz, 'public', 'brand', 'logo-real-olimpico-emblema.png')
const FUNDO = '#081226'

/** Emblema com `fracao` do lado, centralizado sobre o azul-noite, sem transparência. */
async function compor(tamanho, fracao, destino) {
  const lado = Math.round(tamanho * fracao)
  const emblema = await sharp(EMBLEMA).resize(lado, lado, { fit: 'contain', kernel: 'lanczos3' }).png().toBuffer()
  await sharp({ create: { width: tamanho, height: tamanho, channels: 3, background: FUNDO } })
    .composite([{ input: emblema, gravity: 'center' }])
    // Paleta de 256 cores: o medalhão é um degradê dourado sobre fundo chapado e aguenta a quantização sem perda
    // visível. Um PWA "leve" começa pelos ícones — o 512 passou de 300 KB para uma fração disso.
    .png({ palette: true, quality: 90, colors: 256, effort: 10 })
    .toFile(destino)
  console.log(`${destino.replace(raiz, '.')}  ${tamanho}x${tamanho}  emblema a ${Math.round(fracao * 100)}%`)
}

mkdirSync(join(raiz, 'public', 'pwa'), { recursive: true })

await compor(192, 0.88, join(raiz, 'public', 'pwa', 'icon-192.png'))
await compor(512, 0.88, join(raiz, 'public', 'pwa', 'icon-512.png'))
await compor(512, 0.68, join(raiz, 'public', 'pwa', 'icon-maskable-512.png'))
await compor(180, 0.8, join(raiz, 'src', 'app', 'apple-icon.png'))
