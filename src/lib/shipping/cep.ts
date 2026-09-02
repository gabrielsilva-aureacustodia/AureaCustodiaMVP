import 'server-only'

/**
 * Consulta de Endereço por CEP (LGPD Compliant).
 *
 * RESTRIÇÃO LGPD INEGOCIÁVEL:
 *  - Consultar CEP serve exclusivamente para autocompletar endereço de envio/retirada.
 *  - NENHUM histórico de CEP consultado é persistido em banco de dados ou logs permanentes.
 */

import { normalizarCep } from './correios'
import type { EnderecoCep } from './types'

/**
 * Consulta logradouro, bairro, cidade e UF a partir do CEP.
 * Não salva histórico de buscas.
 */
export async function consultarCep(cepInput: string): Promise<EnderecoCep> {
  const cep = normalizarCep(cepInput)

  if (cep.length !== 8) {
    return {
      cep: cepInput,
      logradouro: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      valido: false,
    }
  }

  // Fallback para CEP da Central de Custódia
  if (cep === '01310100') {
    return {
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      complemento: 'Andar 14',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
      valido: true,
    }
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      // Timeout seguro de 4s
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return fallbackCep(cep)
    }

    const data = (await res.json()) as {
      cep?: string
      logradouro?: string
      complemento?: string
      bairro?: string
      localidade?: string
      uf?: string
      erro?: boolean
    }

    if (data.erro) {
      return {
        cep,
        logradouro: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        valido: false,
      }
    }

    return {
      cep: data.cep || cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
      valido: true,
    }
  } catch {
    return fallbackCep(cep)
  }
}

/** Fallback determinístico para quando não há conectividade externa */
function fallbackCep(cep: string): EnderecoCep {
  const ufMap: Record<string, string> = {
    '0': 'SP',
    '1': 'SP',
    '2': 'RJ',
    '3': 'MG',
    '4': 'BA',
    '5': 'PE',
    '6': 'CE',
    '7': 'DF',
    '8': 'PR',
    '9': 'RS',
  }

  const primeiroDigito = cep[0] || '0'
  const uf = ufMap[primeiroDigito] || 'SP'

  return {
    cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
    logradouro: 'Logradouro de Demonstração',
    complemento: '',
    bairro: 'Centro',
    cidade: uf === 'SP' ? 'São Paulo' : 'Capital',
    uf,
    valido: true,
  }
}
