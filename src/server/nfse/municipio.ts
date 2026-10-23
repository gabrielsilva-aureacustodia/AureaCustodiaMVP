/**
 * Código IBGE do município do cliente, a partir do CEP.
 *
 * A nota exige o município do tomador pelo código IBGE (`endNac/cMun`), e a Sefin confere se o CEP
 * pertence a ele. O cadastro do cliente guarda cidade e UF por extenso — escrita livre, que não
 * casa com tabela nenhuma. O CEP casa: o ViaCEP (gratuito, sem chave) devolve o IBGE dele, e um
 * CEP inexistente também é dito aqui, antes de gastar uma ida à Sefin.
 */

const POR_CEP = new Map<string, string>()

export async function codigoIbgeDoCep(cep: string): Promise<string | null> {
  const digitos = cep.replace(/\D/g, '')
  if (digitos.length !== 8) return null
  const conhecido = POR_CEP.get(digitos)
  if (conhecido) return conhecido
  try {
    const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal: AbortSignal.timeout(10_000) })
    if (!r.ok) return null
    const dados = (await r.json()) as { ibge?: string; erro?: boolean | string }
    if (dados.erro || !dados.ibge || !/^\d{7}$/.test(dados.ibge)) return null
    POR_CEP.set(digitos, dados.ibge)
    return dados.ibge
  } catch {
    return null
  }
}
