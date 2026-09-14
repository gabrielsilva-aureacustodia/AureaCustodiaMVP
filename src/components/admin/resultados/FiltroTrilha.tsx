'use client'

/**
 * O filtro da trilha de auditoria na aba Uso: trecho do ator e começo da ação.
 *
 * Como o período, o filtro mora na URL — a página (Server Component) é quem consulta
 * o banco com ele. Enviar o formulário é navegar; o resultado é um link que se pode
 * mandar para alguém ("todas as ações do painel feitas pelo Rogério em agosto").
 */

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'

import type { PeriodoEscolhido } from '@/domain/admin/periodo'

/** Atalhos para os prefixos que mais se procuram. */
const ATALHOS: ReadonlyArray<{ rotulo: string; acao: string }> = [
  { rotulo: 'Tudo', acao: '' },
  { rotulo: 'Ações do painel', acao: 'admin.' },
  { rotulo: 'Negociações', acao: 'negociacao' },
  { rotulo: 'Anúncios', acao: 'anuncio.' },
  { rotulo: 'Envios', acao: 'envio.' },
  { rotulo: 'Retiradas', acao: 'retirada.' },
  { rotulo: 'Acessos recusados', acao: 'admin.acesso.' },
]

export function FiltroTrilha({ ator, acao, periodo }: { ator: string; acao: string; periodo: PeriodoEscolhido }): ReactNode {
  const router = useRouter()
  const pathname = usePathname()
  const [atorDigitado, setAtorDigitado] = useState(ator)
  const [acaoDigitada, setAcaoDigitada] = useState(acao)

  function aplicar(novoAtor: string, novaAcao: string): void {
    const q = new URLSearchParams({ ano: periodo.consulta.ano })
    if (periodo.consulta.mes) q.set('mes', periodo.consulta.mes)
    else if (periodo.consulta.trimestre) q.set('trimestre', periodo.consulta.trimestre)
    if (novoAtor.trim()) q.set('ator', novoAtor.trim())
    if (novaAcao.trim()) q.set('acao', novaAcao.trim())
    router.push(`${pathname}?${q.toString()}`)
  }

  return (
    <>
      <form
        className="adm-form"
        onSubmit={(e) => {
          e.preventDefault()
          aplicar(atorDigitado, acaoDigitada)
        }}
      >
        <div className="field adm-campo-largo">
          <label htmlFor="trilha-ator">Quem (trecho do e-mail)</label>
          <input id="trilha-ator" className="tinput" value={atorDigitado} onChange={(e) => setAtorDigitado(e.target.value)} placeholder="ex.: rogerio" />
        </div>
        <div className="field adm-campo-largo">
          <label htmlFor="trilha-acao">Ação (começa com)</label>
          <input id="trilha-acao" className="tinput" value={acaoDigitada} onChange={(e) => setAcaoDigitada(e.target.value)} placeholder="ex.: admin." />
        </div>
        <button type="submit" className="btn btn-gold adm-btn-compacto">
          Filtrar
        </button>
      </form>
      <div className="adm-abas" aria-label="Atalhos de filtro">
        {ATALHOS.map((a) => (
          <button
            key={a.rotulo}
            type="button"
            className={acao === a.acao ? 'chart-tab on' : 'chart-tab'}
            onClick={() => {
              setAcaoDigitada(a.acao)
              aplicar(atorDigitado, a.acao)
            }}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
    </>
  )
}
