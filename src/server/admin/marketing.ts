/**
 * O gasto de marketing do painel no banco (migration 057): registrar e cancelar a entrada que a equipe digita.
 *
 * Mesmo desenho de `financeiro.ts`: parametrizado pelo `Executor`, sem `server-only`, validação no domínio
 * (`validarGastoDeMarketing`, src/domain/kpis.ts) e a linha `admin.marketing.<verbo>` gravada NA MESMA
 * TRANSAÇÃO da escrita. Nada aqui mexe em saldo, ledger ou DRE: o gasto alimenta só o CAC do painel de KPIs.
 *
 * Nada se edita nem se apaga: errou, cancela (com motivo) e lança de novo.
 */

import { rotuloDoCanal, validarGastoDeMarketing, type EntradaDeGasto } from '@/domain/kpis'
import { brl } from '@/domain/money'
import { cancelarGasto, inserirGasto } from '@/server/db/repositories/marketing'
import type { Executor } from '@/server/db/sql'

import { registrarAcaoAdmin } from './auditar'
import type { ResultadoAdmin } from './contabil'

export async function registrarGasto(executar: Executor, ator: string, entrada: EntradaDeGasto, agora: number = Date.now()): Promise<ResultadoAdmin<{ id: number }>> {
  const v = validarGastoDeMarketing(entrada)
  if (!v.ok) return { ok: false, erro: v.erro }
  const g = v.valor

  return executar<ResultadoAdmin<{ id: number }>>(async (tx) => {
    const id = await inserirGasto(tx, { ...g, criadoPor: ator, agora })
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'marketing',
      verbo: 'registrar',
      entidade: 'marketing_gasto',
      entidadeId: String(id),
      detalhes: { canal: g.canal, de: g.de, ate: g.ate, valorCents: g.valor, visitas: g.visitas, observacao: g.observacao },
      agora,
    })
    return { ok: true, mensagem: `Gasto de ${brl(g.valor)} em ${rotuloDoCanal(g.canal)} registrado (${g.de} a ${g.ate}).`, dados: { id } }
  })
}

export async function cancelarGastoRegistrado(executar: Executor, ator: string, idBruto: unknown, motivoBruto: unknown, agora: number = Date.now()): Promise<ResultadoAdmin> {
  if (typeof idBruto !== 'number' || !Number.isInteger(idBruto) || idBruto <= 0) return { ok: false, erro: 'Entrada de gasto inválida.' }
  const motivo = typeof motivoBruto === 'string' ? motivoBruto.trim() : ''
  if (motivo.length < 3) return { ok: false, erro: 'Diga em poucas palavras por que a entrada está sendo cancelada.' }
  if (motivo.length > 200) return { ok: false, erro: 'O motivo passa de 200 caracteres.' }

  return executar<ResultadoAdmin>(async (tx) => {
    const cancelada = await cancelarGasto(tx, idBruto, ator, motivo, agora)
    if (!cancelada) return { ok: false, erro: 'Entrada não encontrada ou já cancelada.' }
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'marketing',
      verbo: 'cancelar',
      entidade: 'marketing_gasto',
      entidadeId: String(idBruto),
      detalhes: { canal: cancelada.canal, de: cancelada.de, ate: cancelada.ate, valorCents: cancelada.valor, motivo },
      agora,
    })
    return { ok: true, mensagem: `Entrada de ${brl(cancelada.valor)} cancelada. Lance outra se precisar corrigir o valor.` }
  })
}
