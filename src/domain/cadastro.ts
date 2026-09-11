/**
 * Regras de domínio e utilitários para o Cadastro Formal Progressivo (Agente B).
 *
 * Módulo 100% puro — sem dependências de banco de dados, servidor ou React.
 */

import type { Cadastro, DadosBancarios } from './types'

/**
 * Verifica se um usuário possui o cadastro formal completo e confirmado,
 * habilitando operações financeiras (depósito, compra e saque).
 */
export function temCadastroCompleto(user?: { cadastro?: Cadastro } | null): boolean {
  if (!user || !user.cadastro) return false
  const c = user.cadastro

  if (!c.cpf || c.cpf.trim().length === 0) return false
  if (!c.nomeCompleto || c.nomeCompleto.trim().length < 3) return false
  if (!c.dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(c.dataNascimento.trim())) return false

  const telDigitos = (c.telefone || '').replace(/\D/g, '')
  if (telDigitos.length < 10 || telDigitos.length > 11) return false

  const e = c.endereco
  if (!e) return false
  if (!e.logradouro?.trim()) return false
  if (!e.numero?.trim()) return false
  if (!e.bairro?.trim()) return false
  if (!e.cidade?.trim()) return false
  if (!e.uf?.trim() || e.uf.trim().length !== 2) return false
  const cepDigitos = (e.cep || '').replace(/\D/g, '')
  if (cepDigitos.length !== 8) return false

  return temDadosBancarios(user)
}

/**
 * Verifica se o usuário possui dados bancários ou chave Pix configurados para recebimento de saques.
 *
 * Regra da Trava 1 (Seção 3.3 do Plano Executivo):
 * O saque de dinheiro exige dados bancários/Pix do titular. Sem eles, o botão fica desabilitado
 * e o prazo D+3 nem começa a contar.
 */
export function temDadosBancarios(user?: { cadastro?: Cadastro } | null): boolean {
  if (!user || !user.cadastro || !user.cadastro.dadosBancarios) return false
  const db = user.cadastro.dadosBancarios

  const temPix = Boolean(db.chavePix?.trim() && db.tipoChavePix)
  const temConta = Boolean(
    db.banco?.trim() && db.agencia?.trim() && db.conta?.trim() && db.tipoConta,
  )

  return temPix || temConta
}

/**
 * Formata CPF para exibição: 000.000.000-00.
 */
export function formatarCpf(cpf: string): string {
  const digitos = (cpf || '').replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 3) return digitos
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`
  if (digitos.length <= 9) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
  }
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

/**
 * Formata CEP para exibição: 00000-000.
 */
export function formatarCep(cep: string): string {
  const digitos = (cep || '').replace(/\D/g, '').slice(0, 8)
  if (digitos.length <= 5) return digitos
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}

/**
 * Formata telefone brasileiro para exibição: (00) 0000-0000 ou (00) 00000-0000.
 */
export function formatarTelefone(tel: string): string {
  const digitos = (tel || '').replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 2) return digitos.length ? `(${digitos}` : ''
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

/**
 * Monta descrição resumida e amigável da forma de recebimento configurada.
 */
export function descreverDadosBancarios(db?: DadosBancarios): string {
  if (!db) return 'Nenhum dado cadastrado'
  if (db.chavePix && db.tipoChavePix) {
    const tipoMap: Record<string, string> = {
      cpf: 'CPF',
      email: 'E-mail',
      telefone: 'Telefone',
      aleatoria: 'Chave Aleatória',
    }
    const tipo = tipoMap[db.tipoChavePix] || 'Pix'
    return `Pix (${tipo}): ${db.chavePix}`
  }
  if (db.banco && db.agencia && db.conta) {
    const tipo = db.tipoConta === 'poupanca' ? 'Poupança' : 'Corrente'
    return `${db.banco} · Ag. ${db.agencia} · C/${tipo[0]} ${db.conta}`
  }
  return 'Incompleto'
}
