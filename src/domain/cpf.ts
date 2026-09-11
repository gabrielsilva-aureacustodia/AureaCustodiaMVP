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
