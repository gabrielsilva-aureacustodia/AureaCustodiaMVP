'use client'

/**
 * O botão "verificar corrente" e o resultado dele (plano do Admin, 3.5).
 *
 * É a prova de integridade do acervo, e ela existe para ser usada: roda `conferirCadeia()` nas
 * análises, `verificarCadeia()` no livro-razão e cruza o hash de cada recibo com o da análise que
 * aprovou a moeda. O índice da primeira divergência aparece na tela — "a corrente quebrou" sem dizer
 * onde não serve para nada.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import type { VerificacaoDoAcervo } from '@/domain/admin/moedas'
import { verificarCorrenteNoPainel } from '@/server/actions/admin/bancada'
import { useToast } from '@/components/ui/Toast'

import { numero } from '../formatos'

export function VerificarCorrente(): ReactNode {
  const toast = useToast()
  const [rodando, setRodando] = useState(false)
  const [v, setV] = useState<VerificacaoDoAcervo | null>(null)
  const [quando, setQuando] = useState<string>('')

  async function verificar(): Promise<void> {
    setRodando(true)
    const r = await verificarCorrenteNoPainel().catch(() => null)
    setRodando(false)
    if (!r) {
      toast('Sem resposta do servidor.')
      return
    }
    const msg = r.ok ? r.message : r.error
    if (msg) toast(msg)
    if (r.ok && r.data) {
      setV(r.data)
      setQuando(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }))
    }
  }

  return (
    <div className="adm-secao">
      <div className="adm-acoes">
        <button type="button" className="btn btn-gold adm-btn-compacto" onClick={() => void verificar()} disabled={rodando}>
          {rodando ? 'Conferindo…' : 'Verificar corrente'}
        </button>
        {quando ? <span className="adm-fraco">Última conferência às {quando}.</span> : null}
      </div>
      {v ? (
        <div className="adm-verificacao" role="status">
          <div className={v.analises.integra ? 'ok' : 'quebra'}>
            <b>Análises da bancada</b>
            {v.analises.integra ? (
              <span>{numero(v.analises.total)} análise(s), corrente íntegra.</span>
            ) : (
              <span className="adm-negativo">
                Primeira divergência na posição {numero((v.analises.primeiraQuebra ?? 0) + 1)} — análise {v.analises.protocolo}. Dali em diante nenhum hash confere.
              </span>
            )}
          </div>
          <div className={v.ledger === null ? '' : v.ledger.integra ? 'ok' : 'quebra'}>
            <b>Livro-razão</b>
            {v.ledger === null ? (
              <span className="adm-fraco">Ambiente sem banco: não há livro-razão para conferir.</span>
            ) : v.ledger.integra ? (
              <span>{numero(v.ledger.total)} lançamento(s), corrente íntegra.</span>
            ) : (
              <span className="adm-negativo">
                Primeira divergência no lançamento {v.ledger.id ?? `da posição ${numero((v.ledger.primeiraQuebra ?? 0) + 1)}`}: {v.ledger.motivo}.
              </span>
            )}
          </div>
          <div className={v.recibos.divergentes.length === 0 ? 'ok' : 'quebra'}>
            <b>Recibo × análise</b>
            {v.recibos.divergentes.length === 0 ? (
              <span>{numero(v.recibos.conferidos)} recibo(s) com o hash da análise que aprovou a moeda.</span>
            ) : (
              <span className="adm-negativo">
                {numero(v.recibos.divergentes.length)} recibo(s) com hash diferente da análise:{' '}
                {v.recibos.divergentes
                  .slice(0, 10)
                  .map((d) => `${d.codigo} (${d.analise})`)
                  .join(', ')}
                {v.recibos.divergentes.length > 10 ? '…' : ''}
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
