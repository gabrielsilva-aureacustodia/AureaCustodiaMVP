/* ============================================================================
 * PUBLICAÇÃO DE VERSÃO DE DOCUMENTO LEGAL — exclusivo de servidor.
 *
 * Utilizado para registrar no banco (aurea.documentos_legais) uma nova versão
 * de termos, política, taxas ou arbitragem (pelo painel de administração C3).
 * ==========================================================================*/

import 'server-only'

import type { ChaveDocumento } from '@/domain/documentos-legais/types'
import { sha256Hex } from '@/domain/hash'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  buscarDocumentoVigente,
  inserirDocumentoLegal,
} from '@/server/db/repositories/documentos'

export interface PublicacaoResultado {
  chave: ChaveDocumento
  versao: string
  hash: string
  vigenteDesde: number
}

export async function publicarVersaoDocumento(
  chave: ChaveDocumento,
  conteudo: string,
  ator: string,
  versaoDesejada?: string,
  vigenteDesdeMs?: number,
): Promise<PublicacaoResultado> {
  const hash = sha256Hex(conteudo)
  const agora = Date.now()
  const vigenteDesde = vigenteDesdeMs ?? agora

  if (!bancoConfigurado()) {
    return {
      chave,
      versao: versaoDesejada ?? '1.0',
      hash,
      vigenteDesde,
    }
  }

  return executarNoBanco(async (tx) => {
    let versao = versaoDesejada
    if (!versao) {
      const atual = await buscarDocumentoVigente(tx, chave)
      if (!atual) {
        versao = '1.0'
      } else {
        const num = parseFloat(atual.versao)
        versao = isNaN(num) ? `${atual.versao}.1` : (num + 0.1).toFixed(1)
      }
    }

    const reg = await inserirDocumentoLegal(tx, {
      chave,
      versao,
      vigenteDesde,
      hashConteudo: hash,
      conteudo,
      publicadoPor: ator,
      createdAt: agora,
    })

    return {
      chave: reg.chave,
      versao: reg.versao,
      hash: reg.hashConteudo,
      vigenteDesde: reg.vigenteDesde,
    }
  })
}
