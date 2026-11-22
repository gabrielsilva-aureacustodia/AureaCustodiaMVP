/**
 * Validação e formatação de formato de CPF — regra de negócio pura (src/domain/).
 *
 * Não consulta bases externas (Receita Federal / Serasa). Apenas validação
 * de integridade algorítmica pelos dois dígitos verificadores (módulo 11)
 * e rejeição de sequências com dígitos idênticos.
 *
 * LGPD: Esta camada não registra nem emite logs contendo o CPF do usuário.
 */

/** Remove pontuação e caracteres não numéricos. */
export function limparCpf(valor: string): string {
  return valor.replace(/\D/g, '')
}

/**
 * Valida o formato e os dígitos verificadores do CPF.
 * Aceita CPF formatado ('000.000.000-00') ou somente números ('00000000000').
 */
export function validarCpf(valor: string | null | undefined): boolean {
  if (!valor) return false

  const cpf = limparCpf(valor)
  if (cpf.length !== 11) return false

  // Rejeita sequências de dígitos todos iguais (ex.: 00000000000, 11111111111)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // 1º dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i)
  }
  let resto = soma % 11
  const digito1 = resto < 2 ? 0 : 11 - resto
  if (digito1 !== parseInt(cpf.charAt(9), 10)) return false

  // 2º dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i)
  }
  resto = soma % 11
  const digito2 = resto < 2 ? 0 : 11 - resto
  if (digito2 !== parseInt(cpf.charAt(10), 10)) return false

  return true
}

/** Formata string de 11 dígitos no padrão '000.000.000-00'. Devolve string limpa se tamanho incorreto. */
export function formatarCpf(valor: string): string {
  const cpf = limparCpf(valor)
  if (cpf.length !== 11) return valor
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * CNPJ (conta PJ, 22/11/2026). Mesma barreira do CPF: 14 dígitos, dois verificadores em módulo 11 com os
 * pesos oficiais, e rejeição de sequência de um dígito só. Não consulta a Receita; só pega erro de digitação.
 */
export function validarCnpj(valor: string | null | undefined): boolean {
  if (!valor) return false
  const cnpj = valor.replace(/\D/g, '')
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const digito = (base: string): number => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i]!
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  const d1 = digito(cnpj.slice(0, 12))
  if (d1 !== Number(cnpj[12])) return false
  return digito(cnpj.slice(0, 13)) === Number(cnpj[13])
}

/** O documento do titular: CPF (11 dígitos) ou CNPJ (14), cada um com os seus dígitos verificadores. */
export function validarDocumento(valor: string | null | undefined): boolean {
  const d = (valor ?? '').replace(/\D/g, '')
  return d.length === 14 ? validarCnpj(d) : validarCpf(d)
}

/** Máscara de digitação: '000.000.000-00' até 11 dígitos, '00.000.000/0000-00' a partir do 12º. */
export function formatarDocumento(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
