/**
 * Validações do cadastro (QA Davi 22/11/2026, B03 + A16). Módulo PURO: roda igual no navegador (para avisar no campo) e
 * no servidor (que é quem decide — a tela é conveniência, nunca barreira).
 *
 * POR QUÊ. O relatório gravou, pela tela de Dados pessoais, nascimento 14/04/2027, nome "a a a", telefone
 * (11) 11111-1111 e Pix "e-mail" 123123123123123. O Pix é o DESTINO do saque: tipo errado leva o dinheiro a lugar
 * nenhum. Nada aqui consulta a Receita (Datavalid/Consulta CPF é serviço pago e a decisão é do Gabriel): é só
 * consistência interna, que pega erro de digitação e lixo óbvio a custo zero.
 *
 * Cada função devolve `null` quando está válido, ou a mensagem pronta para o campo.
 */

import { validarCpf } from './cpf'

/** Partículas que podem ter menos de 2 letras (regra 3 do relatório). */
const PARTICULAS = new Set(['da', 'de', 'di', 'do', 'das', 'dos', 'e'])

export const IDADE_MINIMA = 18

export const MSG_NOME = 'Informe nome e sobrenome, como estão no seu documento.'

/** Regra 1: sem espaço nas pontas e sem espaço duplo. Usada antes de validar E antes de salvar. */
export function normalizarNome(nome: string): string {
  return (nome ?? '').replace(/\s+/g, ' ').trim()
}

const SO_LETRAS = /^[\p{L}][\p{L}'’-]*$/u

/** Nome completo (cadastro formal e cadastro por e-mail): as 7 regras do relatório, sem o item 8 (Receita). */
export function validarNomeCompleto(bruto: string): string | null {
  const nome = normalizarNome(bruto)
  if (nome.length < 5 || nome.length > 120) return MSG_NOME
  const palavras = nome.split(' ')
  if (palavras.length < 2) return MSG_NOME
  for (const palavra of palavras) {
    if (!SO_LETRAS.test(palavra)) return MSG_NOME
    const base = palavra.toLowerCase()
    if (PARTICULAS.has(base)) continue
    if (base.replace(/['’-]/g, '').length < 2) return MSG_NOME
    // Mesma letra 3 ou mais vezes seguidas ("aaa").
    if (/(.)\1\1/iu.test(palavra)) return MSG_NOME
  }
  // Só partículas não é nome ("de da").
  if (palavras.every((p) => PARTICULAS.has(p.toLowerCase()))) return MSG_NOME
  return null
}

/** Nome de exibição (Dados pessoais): o mínimo — 2 caracteres ou mais, sem número. */
export function validarNomeDeExibicao(bruto: string): string | null {
  const nome = normalizarNome(bruto)
  if (nome.length < 2) return 'Informe um nome de exibição com pelo menos 2 letras.'
  if (nome.length > 120) return 'O nome de exibição é longo demais (máximo 120 caracteres).'
  if (/\d/.test(nome)) return 'O nome de exibição não pode ter números.'
  return null
}

/** Hoje no calendário de Brasília (UTC-3), 'AAAA-MM-DD' — o servidor roda em UTC e viraria o dia às 21h. */
function hojeEmBrasilia(agora: Date): string {
  return new Date(agora.getTime() - 3 * 3_600_000).toISOString().slice(0, 10)
}

/** Data real no formato 'AAAA-MM-DD' (rejeita 2026-02-31). */
function dataReal(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso
}

/** Nascimento: data real, não futura e 18 anos ou mais (Termos, cap. 2). `agora` existe para o teste. */
export function validarNascimento(iso: string, agora: Date = new Date()): string | null {
  const valor = (iso ?? '').trim()
  if (!dataReal(valor)) return 'Informe uma data de nascimento válida.'
  const hoje = hojeEmBrasilia(agora)
  if (valor > hoje) return 'A data de nascimento não pode ser futura.'
  if (valor < '1900-01-01') return 'Informe uma data de nascimento válida.'
  const [ay, am, ad] = hoje.split('-').map(Number)
  const [by, bm, bd] = valor.split('-').map(Number)
  let idade = ay - by
  if (am < bm || (am === bm && ad < bd)) idade -= 1
  if (idade < IDADE_MINIMA) return `É preciso ter ${IDADE_MINIMA} anos ou mais para abrir a conta.`
  return null
}

/** DDDs em uso no Brasil. */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
])

export const MSG_TELEFONE = 'Informe um telefone válido com DDD, por exemplo (11) 91234-5678.'

/** Telefone com DDD real: 11 dígitos (celular, começa em 9) ou 10 (fixo, começa em 2 a 5), sem número repetido. */
export function validarTelefone(bruto: string): string | null {
  let d = (bruto ?? '').replace(/\D/g, '')
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length !== 10 && d.length !== 11) return MSG_TELEFONE
  if (!DDDS.has(Number(d.slice(0, 2)))) return MSG_TELEFONE
  const numero = d.slice(2)
  if (new Set(numero).size === 1) return MSG_TELEFONE
  if (d.length === 11 && numero[0] !== '9') return MSG_TELEFONE
  if (d.length === 10 && !/[2-5]/.test(numero[0])) return MSG_TELEFONE
  return null
}

export type TipoChavePix = 'cpf' | 'email' | 'telefone' | 'aleatoria'

const EMAIL_PIX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/
const ALEATORIA_PIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Chave Pix conferida pelo TIPO escolhido — o destino do saque. */
export function validarChavePix(tipo: TipoChavePix | undefined, chave: string): string | null {
  const valor = (chave ?? '').trim()
  switch (tipo) {
    case 'cpf':
      return validarCpf(valor) ? null : 'CPF inválido: confira os 11 números.'
    case 'email':
      return EMAIL_PIX.test(valor) && valor.length <= 77
        ? null
        : 'A chave Pix do tipo e-mail precisa ter @ e domínio, por exemplo nome@exemplo.com.br.'
    case 'telefone':
      return validarTelefone(valor) === null ? null : 'A chave Pix do tipo telefone precisa ter DDD e número válidos.'
    case 'aleatoria':
      return ALEATORIA_PIX.test(valor)
        ? null
        : 'A chave aleatória tem 36 caracteres, com hífens, como 123e4567-e89b-12d3-a456-426614174000.'
    default:
      return 'Escolha o tipo da chave Pix.'
  }
}
