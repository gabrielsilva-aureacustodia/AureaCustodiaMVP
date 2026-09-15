/**
 * A validação das ações contábeis do painel — lançamento manual, estorno e alíquota.
 *
 * Estas regras vieram das ações da tela antiga `/relatorios`, removidas na E3,
 * agora num lugar puro e testado. O painel é agora o único caminho de escrita contábil,
 * usando estas funções com a permissão do papel conferida em cada ação.
 *
 * Toda entrada chega de uma Server Action — um endpoint HTTP —, então nada aqui confia
 * no tipo que o TypeScript promete: número pode ser NaN, texto pode ser vazio, chave
 * pode ser inventada.
 */

import { CATALOGO_PARAMETROS, contaPorCodigo, type ChaveParametro, type ContaContabil } from '@/domain/dre'
import type { Cents, Timestamp } from '@/domain/types'

/** Teto de um lançamento manual: R$ 10.000.000,00. Anteparo contra o zero a mais, não regra de negócio. */
export const LANCAMENTO_MAX: Cents = 1_000_000_000

export type Validacao<T> = { ok: true; valor: T } | { ok: false; erro: string }

/**
 * 'aaaa-mm-dd' (o `<input type="date">`) → milissegundos ao MEIO-DIA local. Meia-noite
 * viraria o dia anterior em UTC, e o lançamento de 1º de setembro cairia na DRE de agosto.
 */
export function dataDeInput(s: unknown): Timestamp | null {
  if (typeof s !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(ano, mes - 1, dia, 12, 0, 0)
  // 2026-02-31 vira 3 de março no Date: a data não existe, então é recusada.
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null
  return d.getTime()
}

export function validarLancamento(entrada: {
  dataISO: unknown
  contaCodigo: unknown
  descricao: unknown
  valorCents: unknown
}): Validacao<{ data: Timestamp; conta: ContaContabil; descricao: string; valor: Cents }> {
  const data = dataDeInput(entrada.dataISO)
  if (data === null) return { ok: false, erro: 'Informe uma data válida.' }
  const conta = typeof entrada.contaCodigo === 'string' ? contaPorCodigo(entrada.contaCodigo) : undefined
  if (!conta) return { ok: false, erro: 'Conta contábil desconhecida.' }
  if (conta.automatica) return { ok: false, erro: 'Esta conta é alimentada pelo livro-razão e não aceita lançamento manual.' }
  const descricao = typeof entrada.descricao === 'string' ? entrada.descricao.trim().slice(0, 200) : ''
  if (descricao.length < 3) return { ok: false, erro: 'Descreva o lançamento (mínimo 3 caracteres).' }
  const bruto = typeof entrada.valorCents === 'number' && Number.isFinite(entrada.valorCents) ? Math.floor(entrada.valorCents) : 0
  if (bruto <= 0) return { ok: false, erro: 'Informe um valor válido.' }
  if (bruto > LANCAMENTO_MAX) return { ok: false, erro: 'O lançamento máximo é R$ 10.000.000,00.' }
  return { ok: true, valor: { data, conta, descricao, valor: bruto } }
}

export function validarEstorno(id: unknown, motivo: unknown): Validacao<{ id: number; motivo: string }> {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return { ok: false, erro: 'Lançamento inválido.' }
  const m = typeof motivo === 'string' ? motivo.trim().slice(0, 200) : ''
  if (m.length < 3) return { ok: false, erro: 'Informe o motivo do estorno.' }
  return { ok: true, valor: { id, motivo: m } }
}

/**
 * Alíquota: pontos-base inteiros de 0 a 10000 (0% a 100%), ou centavos não negativos
 * para o limite do adicional de IRPJ. `null` limpa o parâmetro — a DRE volta a zerar a
 * linha e declarar a pendência.
 */
export function validarAliquota(
  chave: unknown,
  valor: unknown,
): Validacao<{ chave: ChaveParametro; valor: number | null; rotulo: string; unidade: 'bp' | 'centavos' }> {
  const item = CATALOGO_PARAMETROS.find((p) => p.chave === chave)
  if (!item) return { ok: false, erro: 'Parâmetro desconhecido.' }
  if (valor === null) return { ok: true, valor: { chave: item.chave, valor: null, rotulo: item.rotulo, unidade: item.unidade } }
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) return { ok: false, erro: 'Informe um valor inteiro não negativo.' }
  if (item.unidade === 'bp' && valor > 10000) return { ok: false, erro: 'Percentual acima de 100%.' }
  return { ok: true, valor: { chave: item.chave, valor, rotulo: item.rotulo, unidade: item.unidade } }
}
