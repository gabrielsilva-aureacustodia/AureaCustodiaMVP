/**
 * Núcleo criptográfico da sessão — a prova de que a troca de `node:crypto` por
 * Web Crypto não mexeu em nada visível.
 *
 * O teste que importa aqui é o da EQUIVALÊNCIA. Até 19/09/2026 o cookie era
 * assinado com `createHmac('sha256', segredo).update(payload).digest('hex')`.
 * A separação do núcleo (para o middleware poder conferir a mesma assinatura)
 * reescreveu isso em `crypto.subtle`. Se a saída diferisse em um único byte,
 * todos os cookies em circulação virariam inválidos e o deploy deslogaria a
 * plataforma inteira — sem erro nenhum no build, no typecheck ou no lint.
 *
 * Por isso a suíte constrói o cookie do jeito ANTIGO, com `node:crypto`, e
 * exige que o núcleo novo o aceite.
 */

import { createHmac } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import {
  assinar,
  assinaturaConfere,
  base64urlParaTexto,
  emailDoCookie,
  textoParaBase64url,
  valorDoCookie,
} from '@/server/session-core'

const SEGREDO = 'segredo-de-teste-nao-usar-em-producao'
const EMAIL = 'rogeriopena@testeaurea.com.br'

beforeAll(() => {
  process.env.SESSION_SECRET = SEGREDO
})

/** O cookie exatamente como o código anterior a 19/09/2026 o produzia. */
function cookieDoJeitoAntigo(email: string): string {
  const payload = Buffer.from(email, 'utf8').toString('base64url')
  const assinatura = createHmac('sha256', SEGREDO).update(payload).digest('hex')
  return `${payload}.${assinatura}`
}

describe('equivalência com a implementação anterior', () => {
  it('produz a mesma assinatura que node:crypto, byte a byte', async () => {
    for (const payload of ['abc', '', 'ç-ã-é', 'a'.repeat(500), EMAIL]) {
      const esperada = createHmac('sha256', SEGREDO).update(payload).digest('hex')
      await expect(assinar(payload)).resolves.toBe(esperada)
    }
  })

  it('codifica base64url igual ao Buffer', () => {
    for (const texto of [EMAIL, 'ç', 'a+b/c', '', 'Ação & Reação']) {
      expect(textoParaBase64url(texto)).toBe(Buffer.from(texto, 'utf8').toString('base64url'))
    }
  })

  it('decodifica de volta o que codificou, inclusive com acento', () => {
    for (const texto of [EMAIL, 'ç-ã-é', 'Ação & Reação', 'a']) {
      expect(base64urlParaTexto(textoParaBase64url(texto))).toBe(texto)
    }
  })

  it('ACEITA um cookie emitido pela versão antiga — ninguém é deslogado no deploy', async () => {
    await expect(emailDoCookie(cookieDoJeitoAntigo(EMAIL))).resolves.toBe(EMAIL)
  })

  it('emite um cookie que a verificação antiga também aceitaria', async () => {
    expect(await valorDoCookie(EMAIL)).toBe(cookieDoJeitoAntigo(EMAIL))
  })
})

describe('recusa o que precisa recusar', () => {
  it('recusa ausência de cookie', async () => {
    await expect(emailDoCookie(undefined)).resolves.toBeNull()
    await expect(emailDoCookie(null)).resolves.toBeNull()
    await expect(emailDoCookie('')).resolves.toBeNull()
  })

  it('recusa valor sem o ponto separador', async () => {
    await expect(emailDoCookie('semponto')).resolves.toBeNull()
    await expect(emailDoCookie('.assinaturasempayload')).resolves.toBeNull()
  })

  it('recusa assinatura adulterada', async () => {
    const valido = await valorDoCookie(EMAIL)
    const corte = valido.lastIndexOf('.')
    const payload = valido.slice(0, corte)
    await expect(emailDoCookie(`${payload}.${'0'.repeat(64)}`)).resolves.toBeNull()
  })

  it('recusa payload trocado mantendo a assinatura — o ataque que o HMAC existe para barrar', async () => {
    const valido = await valorDoCookie(EMAIL)
    const assinatura = valido.slice(valido.lastIndexOf('.') + 1)
    const outroPayload = textoParaBase64url('gabrielsilva@testeaurea.com.br')
    await expect(emailDoCookie(`${outroPayload}.${assinatura}`)).resolves.toBeNull()
  })

  it('recusa assinatura feita com outro segredo', async () => {
    const payload = textoParaBase64url(EMAIL)
    const deOutroSegredo = createHmac('sha256', 'outro-segredo').update(payload).digest('hex')
    await expect(emailDoCookie(`${payload}.${deOutroSegredo}`)).resolves.toBeNull()
  })
})

describe('comparação em tempo constante', () => {
  it('aceita iguais e recusa diferentes', () => {
    expect(assinaturaConfere('abc', 'abc')).toBe(true)
    expect(assinaturaConfere('abc', 'abd')).toBe(false)
    expect(assinaturaConfere('abc', 'ab')).toBe(false)
    expect(assinaturaConfere('', '')).toBe(true)
  })

  it('não sai no primeiro caractere diferente', () => {
    // Diferença no primeiro e no último caractere precisam dar o mesmo veredito;
    // o que o teste garante é o resultado, não o tempo — medir tempo em teste é
    // instável. A leitura do laço em session-core.ts é que fecha o argumento.
    expect(assinaturaConfere('xbc', 'abc')).toBe(false)
    expect(assinaturaConfere('abx', 'abc')).toBe(false)
  })
})

describe('barreira de import', () => {
  /*
   * session-core.ts é o único módulo da sessão SEM `server-only`, porque o
   * middleware precisa dele. Essa exceção só é segura enquanto ninguém mais o
   * importa — se uma tela puxasse o núcleo, o segredo sairia da fronteira de
   * servidor sem nada acusar. A regra é verificada aqui, não confiada ao
   * comentário no topo do arquivo.
   */
  /*
   * Só estes dois em código de produção. Arquivos de teste ficam de fora da
   * regra porque o risco que ela existe para conter — o núcleo cair no bundle
   * do navegador junto com o segredo — não alcança o que nunca é publicado.
   */
  const PERMITIDOS = ['src/server/session.ts', 'src/middleware.ts']

  function arquivosDeCodigo(dir: string, achados: string[] = []): string[] {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome)
      if (statSync(caminho).isDirectory()) arquivosDeCodigo(caminho, achados)
      else if (/\.tsx?$/.test(nome)) achados.push(caminho)
    }
    return achados
  }

  it('só session.ts e o middleware importam session-core', () => {
    const intrusos = arquivosDeCodigo('src')
      .filter((f) => /from '@\/server\/session-core'|from '\.\/session-core'/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(/\\/g, '/'))
      .filter((f) => !PERMITIDOS.includes(f) && !f.endsWith('.test.ts'))

    expect(intrusos, 'importe @/server/session, não o núcleo').toEqual([])
  })
})
