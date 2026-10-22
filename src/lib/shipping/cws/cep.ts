import 'server-only'

/**
 * CEP oficial dos Correios (API CEP v2 da CWS). Mesma regra de LGPD de `../cep.ts`: a consulta
 * serve para preencher o endereço e nada dela é gravado.
 */

import type { EnderecoCep } from '../types'
import { chamarCws } from './cliente'

interface RespostaCep {
  cep?: string
  uf?: string
  localidade?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  /** Em CEP de unidade (agência, caixa postal) o logradouro vem com o número junto. */
  nomeLogradouro?: string
  tipoLogradouro?: string
}

/** O endereço do CEP, ou `null` quando os Correios não o conhecem. Lança se a API falhar. */
export async function consultarCepCorreios(cep8: string): Promise<EnderecoCep | null> {
  const r = await chamarCws<RespostaCep>(`/cep/v2/enderecos/${cep8}`)
  if (!r?.cep || !r.uf) return null
  const logradouro =
    r.tipoLogradouro && r.nomeLogradouro ? `${r.tipoLogradouro} ${r.nomeLogradouro}` : (r.logradouro ?? '')
  return {
    cep: `${cep8.slice(0, 5)}-${cep8.slice(5)}`,
    logradouro,
    complemento: r.complemento ?? '',
    bairro: r.bairro ?? '',
    cidade: r.localidade ?? '',
    uf: r.uf,
    valido: true,
  }
}
