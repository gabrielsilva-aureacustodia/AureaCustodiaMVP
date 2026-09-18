/**
 * A marca de inadimplência tem uma dona só: a equipe (E8, parte do RA-52).
 *
 * O defeito que isto conserta: `user.inadimplente` era escrita por cinco processos automáticos — o
 * ciclo mensal, dois pagamentos de fatura com saldo e duas liquidações do gateway. Como todos
 * gravavam o resultado de `isInadimplente(user, faturas)`, que IGNORA a marca quando recebe
 * faturas, qualquer fatura paga apagava a marca que a equipe tinha posto à mão. E o ciclo gravava
 * `true` em quem tinha fatura vencida, que a ficha depois chamava de "marca manual".
 *
 * Depois da E8: `user.inadimplente` é só a marca da equipe (`marcarInadimplencia`). A
 * inadimplência POR FATURA é calculada na hora por quem lê — lista, ficha, indicadores e o
 * bloqueio de venda e retirada da E4.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { resumirConta } from '@/domain/admin/usuarios'
import { isInadimplente } from '@/domain/custody'
import { seedState } from '@/domain/seed'
import type { FaturaCustodia } from '@/domain/types'
import { getState, mutateState } from '@/server/state'

import { pagarFaturaCustodiaComSaldo, processarCicloFaturamento } from './faturamento'

const EMAIL = 'gabrielsilva@testeaurea.com.br'

function faturaVencida(id: string, agora: number): FaturaCustodia {
  return {
    id,
    userEmail: EMAIL,
    competencia: '2026-08',
    quantidadeMoedas: 1,
    moedaIds: ['RO-000001'],
    valorCents: 200,
    status: 'atrasada',
    dataEmissao: agora - 60 * 86_400_000,
    dataVencimento: agora - 40 * 86_400_000,
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
  }
}

describe('Nenhum processo automático grava user.inadimplente (E8)', () => {
  beforeEach(async () => {
    await mutateState((s) => {
      const limpo = seedState()
      s.users = limpo.users
      s.faturasCustodia = []
    })
  })

  it('o ciclo mensal não grava a coluna, mas conta a inadimplência por fatura', async () => {
    const agora = Date.now()
    await mutateState((s) => {
      s.faturasCustodia = [faturaVencida('FAT-E8-ciclo', agora)]
      s.users[EMAIL].balance = 0
    })

    const rel = await processarCicloFaturamento('2026-09', agora)

    const s = await getState()
    expect(s.users[EMAIL].inadimplente).toBeFalsy()
    expect(rel.usuariosInadimplentes).toBeGreaterThanOrEqual(1)
  })

  it('pagar fatura com saldo NÃO apaga a marca posta pela equipe', async () => {
    const agora = Date.now()
    await mutateState((s) => {
      s.faturasCustodia = [faturaVencida('FAT-E8-marca', agora)]
      s.users[EMAIL].balance = 5_000
      // A equipe marcou a conta à mão, por um motivo que não é fatura.
      s.users[EMAIL].inadimplente = true
    })

    const res = await pagarFaturaCustodiaComSaldo('FAT-E8-marca', EMAIL)
    expect(res.ok).toBe(true)

    const s = await getState()
    // A marca da equipe continua. Só a equipe a tira.
    expect(s.users[EMAIL].inadimplente).toBe(true)
    // A fatura está paga, então a inadimplência POR FATURA sumiu sozinha.
    const faturas = s.faturasCustodia ?? []
    expect(faturas.find((f) => f.id === 'FAT-E8-marca')?.status).toBe('paga')
  })

  it('resumirConta separa as duas origens: fatura vencida não vira marca manual', async () => {
    const agora = Date.now()
    await mutateState((s) => {
      s.faturasCustodia = [faturaVencida('FAT-E8-resumo', agora)]
      s.users[EMAIL].inadimplente = false
    })

    const s = await getState()
    const resumo = resumirConta(s, EMAIL, [], agora)

    // Vê-se como inadimplente, porque a fatura venceu...
    expect(resumo?.inadimplente).toBe(true)
    // ...mas a equipe não marcou nada.
    expect(resumo?.marcaManual).toBe(false)
  })

  it('isInadimplente continua sendo a fonte da inadimplência por fatura', async () => {
    const agora = Date.now()
    const s = await getState()
    const user = s.users[EMAIL]
    expect(isInadimplente(user, [faturaVencida('FAT-E8-fonte', agora)], agora)).toBe(true)
    expect(isInadimplente(user, [], agora)).toBe(false)
  })
})
