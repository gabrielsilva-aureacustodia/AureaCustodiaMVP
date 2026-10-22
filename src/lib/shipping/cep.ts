import 'server-only'

/**
 * Consulta de Endereço por CEP (LGPD Compliant).
 *
 * RESTRIÇÃO LGPD INEGOCIÁVEL:
 *  - Consultar CEP serve exclusivamente para autocompletar endereço de envio/retirada.
 *  - NENHUM histórico de CEP consultado é persistido em banco de dados ou logs permanentes.
 */

import { normalizarCep } from './correios'
import { consultarCepCorreios } from './cws/cep'
import { correiosConfigurado } from './cws/config'
import type { EnderecoCep } from './types'

/**
 * Consulta logradouro, bairro, cidade e UF a partir do CEP.
 * Não salva histórico de buscas.
 */
export async function consultarCep(cepInput: string): Promise<EnderecoCep> {
  const digitos = cepInput.replace(/\D/g, '')

  // Valide antes de normalizar: normalizarCep completa zeros à esquerda para
  // cálculos internos e, portanto, sempre devolve oito caracteres.
  if (digitos.length !== 8) {
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

  const cep = normalizarCep(cepInput)

  // Fallback para CEP da Central de Custódia (Caixa Postal oficial)
  if (cep === '30315970') {
    return {
      cep: '30315-970',
      logradouro: 'Caixa Postal 7990',
      complemento: 'AGF Bandeirantes',
      bairro: 'Comiteco',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      valido: true,
    }
  }

  // Com o contrato (22/10/2026), a primeira fonte é a base oficial dos Correios — a mesma que vai
  // validar o endereço na pré-postagem. CEP que ela não conhece é inválido; se a API cair, o
  // ViaCEP responde no lugar.
  const comContrato = correiosConfigurado()
  if (comContrato) {
    try {
      const oficial = await consultarCepCorreios(cep)
      if (oficial) return oficial
      return { cep, logradouro: '', complemento: '', bairro: '', cidade: '', uf: '', valido: false }
    } catch {
      /* API dos Correios fora: segue para o ViaCEP */
    }
  }

  // Sem conexão com nenhuma fonte, o endereço inventado do `fallbackCep` só vale sem contrato
  // (desenvolvimento local). Com contrato, o endereço vai parar numa etiqueta de verdade, e um
  // "Logradouro de Demonstração" ali é pacote extraviado — melhor dizer que o CEP não foi encontrado.
  const semFonte = (): EnderecoCep =>
    comContrato
      ? { cep, logradouro: '', complemento: '', bairro: '', cidade: '', uf: '', valido: false }
      : fallbackCep(cep)

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
      return semFonte()
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
    return semFonte()
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
