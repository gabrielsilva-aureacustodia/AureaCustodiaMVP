/**
 * As ações contábeis do painel no banco: lançamento manual, estorno, alíquota e a
 * conferência da cadeia do livro-razão (aba Contábil da Central de Resultados).
 *
 * Mesmo desenho de `rbac.ts`: parametrizado pelo `Executor`, sem `server-only`, e a
 * linha `admin.contabil.<verbo>` gravada NA MESMA TRANSAÇÃO da escrita. A validação é a
 * de src/domain/admin/contabil.ts.
 *
 * Nada aqui mexe em saldo nem passa por `mutateState`: lançamento manual e alíquota
 * são base contábil da empresa, não dinheiro de cliente.
 */

import { validarAliquota, validarEstorno, validarLancamento } from '@/domain/admin/contabil'
import { GENESIS } from '@/domain/hash'
import { verificarCadeia } from '@/domain/ledger'
import { brl } from '@/domain/money'
import {
  garantirCatalogos,
  gravarParametro,
  inserirLancamentoManual,
  listarLancamentosManuais,
} from '@/server/db/repositories/contabil'
import { listarLancamentos } from '@/server/db/repositories/ledger'
import type { Executor } from '@/server/db/sql'

import { registrarAcaoAdmin } from './auditar'

export type ResultadoAdmin<T = undefined> = { ok: true; mensagem: string; dados?: T } | { ok: false; erro: string }

export async function lancarManual(
  executar: Executor,
  ator: string,
  entrada: { dataISO: unknown; contaCodigo: unknown; descricao: unknown; valorCents: unknown },
): Promise<ResultadoAdmin<{ id: number }>> {
  const v = validarLancamento(entrada)
  if (!v.ok) return { ok: false, erro: v.erro }
  const { data, conta, descricao, valor } = v.valor

  const id = await executar(async (tx) => {
    const agora = Date.now()
    await garantirCatalogos(tx)
    const novo = await inserirLancamentoManual(tx, { data, contaCodigo: conta.codigo, descricao, valor, criadoPor: ator }, agora)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'contabil',
      verbo: 'lancar',
      entidade: 'lancamento_manual',
      entidadeId: String(novo),
      detalhes: { contaCodigo: conta.codigo, valor, data, descricao },
      agora,
    })
    return novo
  })
  return { ok: true, mensagem: `Lançamento registrado em ${conta.nome}: ${brl(valor)}.`, dados: { id } }
}

/** Estorno é um lançamento espelho apontando para o original; nada é apagado. */
export async function estornarManual(executar: Executor, ator: string, idBruto: unknown, motivoBruto: unknown): Promise<ResultadoAdmin> {
  const v = validarEstorno(idBruto, motivoBruto)
  if (!v.ok) return { ok: false, erro: v.erro }
  const { id, motivo } = v.valor

  return executar<ResultadoAdmin>(async (tx) => {
    const todos = await listarLancamentosManuais(tx)
    const alvo = todos.find((l) => l.id === id)
    if (!alvo) return { ok: false, erro: 'Lançamento não encontrado.' }
    if (alvo.estornaId !== null) return { ok: false, erro: 'Um estorno não pode ser estornado.' }
    if (todos.some((l) => l.estornaId === id)) return { ok: false, erro: 'Este lançamento já foi estornado.' }
    const agora = Date.now()
    await inserirLancamentoManual(
      tx,
      { data: alvo.data, contaCodigo: alvo.contaCodigo, descricao: `Estorno de #${id}: ${motivo}`, valor: alvo.valor, criadoPor: ator, estornaId: id },
      agora,
    )
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'contabil',
      verbo: 'estornar',
      entidade: 'lancamento_manual',
      entidadeId: String(id),
      detalhes: { motivo, valor: alvo.valor, contaCodigo: alvo.contaCodigo },
      agora,
    })
    return { ok: true, mensagem: `Lançamento #${id} estornado.` }
  })
}

export async function definirAliquota(executar: Executor, ator: string, chave: unknown, valor: unknown): Promise<ResultadoAdmin> {
  const v = validarAliquota(chave, valor)
  if (!v.ok) return { ok: false, erro: v.erro }
  const p = v.valor

  await executar(async (tx) => {
    const agora = Date.now()
    await garantirCatalogos(tx)
    await gravarParametro(tx, p.chave, p.valor, ator, agora)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'contabil',
      verbo: 'parametro',
      entidade: 'parametro',
      entidadeId: p.chave,
      detalhes: { valor: p.valor, unidade: p.unidade },
      agora,
    })
  })
  const legivel = p.valor === null ? 'não configurado' : p.unidade === 'bp' ? `${(p.valor / 100).toLocaleString('pt-BR')}%` : brl(p.valor)
  return { ok: true, mensagem: `${p.rotulo}: ${legivel}.` }
}

/**
 * Reconfere a cadeia inteira do livro-razão. É leitura, e fica na trilha porque alguém
 * pediu a conferência — o registro de que ela foi feita, e com que resultado, é parte
 * do valor dela.
 */
export async function verificarLedger(
  executar: Executor,
  ator: string,
): Promise<ResultadoAdmin<{ lancamentos: number; primeiraQuebra: number | null }>> {
  const { total, verificacao } = await executar(async (tx) => {
    const livro = await listarLancamentos(tx)
    const verificacao = verificarCadeia(livro, GENESIS)
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'resultados',
      verbo: 'verificar_ledger',
      entidade: 'ledger',
      detalhes: { lancamentos: livro.length, ok: verificacao.ok, primeiraQuebra: verificacao.primeiraQuebra },
    })
    return { total: livro.length, verificacao }
  })
  if (!verificacao.ok) {
    return {
      ok: false,
      erro: `Cadeia quebrada no lançamento de índice ${verificacao.primeiraQuebra}: ${verificacao.motivo}. Alguém alterou o livro por fora do sistema.`,
    }
  }
  return { ok: true, mensagem: `Livro-razão íntegro: ${total} lançamento(s), cadeia de hashes conferida.`, dados: { lancamentos: total, primeiraQuebra: null } }
}
