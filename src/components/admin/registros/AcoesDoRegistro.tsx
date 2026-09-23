'use client'

/**
 * Os botões de editar e excluir de um registro do painel — anúncio de venda,
 * ordem de compra, envio ou plano de custódia.
 *
 * POR QUE UM COMPONENTE SÓ PARA ISSO (23/09/2026)
 * ----------------------------------------------
 * A mesma dupla de botões aparece em quatro lugares: nas abas Mercado,
 * Logística e Financeiro da ficha do cliente, e na página de Logística, que
 * lista os envios de todo mundo. Repetir o JSX em quatro arquivos foi
 * exatamente o que fez os cartões de plano de custódia divergirem entre si em
 * 21/09 — um com selo, outro sem, na mesma tela.
 *
 * A CONFIRMAÇÃO NÃO É CERIMÔNIA
 * -----------------------------
 * Excluir aqui é irreversível e atinge dado de outra pessoa. O botão pede uma
 * segunda confirmação no próprio lugar, sem modal: o primeiro clique troca o
 * rótulo para "Confirmar exclusão", o segundo executa, e um terceiro botão
 * desiste. Modal seria mais cerimonioso e menos claro sobre QUAL linha vai
 * sumir — aqui a confirmação acontece do lado do registro.
 *
 * Quem não tem a permissão não recebe o botão. Isso é conveniência de tela: a
 * recusa de verdade está na Server Action, que confere por conta própria.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { useAdmin } from '../AdminProvider'

export interface AcoesDoRegistroProps {
  /** O que aparece no título do botão: "o anúncio", "o envio RO-ENV-0004". */
  descricao: string
  /** Chamada no segundo clique. Ausente = sem botão de excluir. */
  aoExcluir?: () => Promise<{ ok: boolean; error?: string; message?: string }>
  /** Abre o formulário de edição. Ausente = sem botão de editar. */
  aoEditar?: () => void
}

export function AcoesDoRegistro({
  descricao,
  aoExcluir,
  aoEditar,
}: AcoesDoRegistroProps): ReactNode {
  // A permissão vem do contexto, e não por prop: quatro telas montam este
  // componente, e passar o booleano em cada uma é quatro chances de passar o
  // errado. `run` já refaz os Server Components da rota depois da ação.
  const { pode, run } = useAdmin()
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const mostraEditar = pode('registros.editar') && aoEditar
  const mostraExcluir = pode('registros.excluir') && aoExcluir
  if (!mostraEditar && !mostraExcluir) return null

  async function excluir(): Promise<void> {
    if (!aoExcluir) return
    setOcupado(true)
    try {
      const r = await run(aoExcluir)
      if (r.ok) setConfirmando(false)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {mostraEditar && !confirmando ? (
        <button type="button" className="btn btn-outline adm-btn-compacto" onClick={aoEditar}>
          Editar
        </button>
      ) : null}

      {mostraExcluir ? (
        confirmando ? (
          <>
            <button
              type="button"
              className="btn btn-outline adm-btn-compacto"
              disabled={ocupado}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-gold adm-btn-compacto"
              disabled={ocupado}
              onClick={() => void excluir()}
              title={`Excluir ${descricao} definitivamente`}
            >
              {ocupado ? 'Excluindo…' : 'Confirmar exclusão'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-outline adm-btn-compacto"
            onClick={() => setConfirmando(true)}
          >
            Excluir
          </button>
        )
      ) : null}
    </div>
  )
}
