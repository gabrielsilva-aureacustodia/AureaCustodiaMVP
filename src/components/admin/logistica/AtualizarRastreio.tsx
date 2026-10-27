'use client'

/**
 * "Atualizar rastreio agora" no `/admin/logistica` (27/10/2026).
 *
 * O rastreio dos Correios roda sozinho uma vez por dia, às 06:00 (limite do plano Hobby da Vercel), e
 * uma postagem feita de manhã só aparecia no dia seguinte. O botão roda a mesma rodada na hora; o
 * resultado sai no aviso do painel e a página se refaz com as etapas novas (`run`, do AdminProvider).
 *
 * ESCONDER BOTÃO NÃO PROTEGE NADA: a Server Action `atualizarRastreiosAgora` confere `logistica.expedir`
 * por conta própria e grava `admin.logistica.atualizar_rastreio`.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { atualizarRastreiosAgora } from '@/server/actions/admin/logistica'

import { useAdmin } from '../AdminProvider'

export function AtualizarRastreio(): ReactNode {
  const { run } = useAdmin()
  const [ocupado, setOcupado] = useState(false)

  async function atualizar(): Promise<void> {
    setOcupado(true)
    await run(() => atualizarRastreiosAgora())
    setOcupado(false)
  }

  return (
    <div className="adm-rastreio-agora">
      <button type="button" className="btn btn-outline adm-btn-compacto" onClick={atualizar} disabled={ocupado} aria-busy={ocupado}>
        {ocupado ? 'Consultando os Correios…' : 'Atualizar rastreio agora'}
      </button>
      <span className="adm-fraco">Sozinho, o rastreio roda todo dia às 06:00.</span>
    </div>
  )
}
