'use client'

/**
 * Os botões de expedição de UMA retirada no `/admin/logistica` (22/10/2026, contrato com os Correios).
 *
 * Até aqui a retirada paga não tinha botão nenhum: `avancarStatusRetirada` existia no servidor, mas
 * nenhuma tela a chamava, e a moeda ficava em "Paga" esperando alguém mexer no banco. Agora:
 *  - com o contrato configurado: "Emitir etiqueta dos Correios" → o código aparece, com "Imprimir
 *    etiqueta" (o PDF oficial, pela rota `/api/retiradas/etiqueta/[id]`) e "Cancelar etiqueta";
 *  - sem contrato (desenvolvimento, ou contrato ainda não cadastrado no ambiente): o campo para
 *    digitar o código da postagem feita no balcão.
 *
 * 25/10/2026: "Cancelar etiqueta" deixou o `window.confirm` pela confirmação no lugar, com o código
 * do objeto no botão ("Confirmar: cancelar a etiqueta AA123…BR"); os links de etiqueta dizem de qual
 * retirada são e que abrem em nova aba.
 *
 * ESCONDER BOTÃO NÃO PROTEGE NADA. `podeExpedir` só decide o que aparece; cada Server Action de
 * `src/server/actions/admin/logistica.ts` confere `logistica.expedir` por conta própria.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import type { StatusRetirada } from '@/domain/types'
import {
  cancelarEtiquetaRetirada,
  emitirEtiquetaRetirada,
  marcarRetiradaPostadaManual,
} from '@/server/actions/admin/logistica'

import { useAdmin } from '../AdminProvider'
import { ConfirmarAcao } from '../ConfirmarAcao'

export interface EtiquetaDaRetirada {
  codigoObjeto: string
  prazoPostagem: string | null
}

export function ExpedicaoDaRetirada({
  retiradaId,
  status,
  etiqueta,
  contratoCorreios,
  podeExpedir,
  podeEtiqueta,
}: {
  retiradaId: string
  status: StatusRetirada
  /** A pré-postagem ativa, quando há. */
  etiqueta: EtiquetaDaRetirada | null
  /** `correiosConfigurado()` lido no servidor. */
  contratoCorreios: boolean
  podeExpedir: boolean
  podeEtiqueta: boolean
}): ReactNode {
  const { run } = useAdmin()
  const [ocupado, setOcupado] = useState(false)
  const [codigo, setCodigo] = useState('')

  const href = `/api/retiradas/etiqueta/${encodeURIComponent(retiradaId)}`
  const expedivel = status === 'paga' || status === 'separacao'

  const novaAba = <span className="adm-sr"> da retirada {retiradaId} (abre em nova aba)</span>

  async function executar(acao: () => Promise<{ ok: boolean }>): Promise<void> {
    setOcupado(true)
    const r = await run(acao)
    setOcupado(false)
    if (r.ok) setCodigo('')
  }

  // Fora de paga/separação não há o que expedir: fica só a reimpressão de antes.
  if (!expedivel) {
    return podeEtiqueta ? (
      <a className="btn btn-outline adm-btn-compacto" href={href} target="_blank" rel="noreferrer">
        Etiqueta
        {novaAba}
      </a>
    ) : null
  }

  if (etiqueta) {
    return (
      <div className="adm-acoes-linha">
        <div className="adm-linha-cheia">
          <span className="adm-mono" translate="no">
            {etiqueta.codigoObjeto}
          </span>
          <div className="adm-fraco">
            etiqueta emitida · aguardando postagem
            {etiqueta.prazoPostagem ? ` · postar até ${etiqueta.prazoPostagem}` : ''}
          </div>
        </div>
        {podeEtiqueta ? (
          <a className="btn btn-gold adm-btn-compacto" href={href} target="_blank" rel="noreferrer" data-uso="retirada:imprimir_etiqueta">
            Imprimir etiqueta
            {novaAba}
          </a>
        ) : null}
        {podeExpedir ? (
          <ConfirmarAcao
            rotulo="Cancelar etiqueta"
            objeto={`cancelar a etiqueta ${etiqueta.codigoObjeto}`}
            detalhe="Use só quando a caixa ainda NÃO foi postada (endereço errado, pacote refeito). Depois é preciso emitir outra."
            aoConfirmar={() => executar(() => cancelarEtiquetaRetirada(retiradaId))}
            perigo
            desabilitado={ocupado}
            usoNome="retirada:cancelar_etiqueta"
          />
        ) : null}
      </div>
    )
  }

  if (!podeExpedir) {
    return podeEtiqueta ? (
      <a className="btn btn-outline adm-btn-compacto" href={href} target="_blank" rel="noreferrer">
        Etiqueta
        {novaAba}
      </a>
    ) : null
  }

  if (contratoCorreios) {
    return (
      <button
        type="button"
        className="btn btn-gold adm-btn-compacto"
        disabled={ocupado}
        data-uso="retirada:emitir_etiqueta"
        onClick={() => void executar(() => emitirEtiquetaRetirada(retiradaId))}
      >
        {ocupado ? 'Emitindo…' : 'Emitir etiqueta dos Correios'}
        <span className="adm-sr"> para a retirada {retiradaId}</span>
      </button>
    )
  }

  // Sem contrato neste ambiente: posta-se no balcão e o código vem do comprovante.
  return (
    <form
      className="adm-acoes-linha"
      onSubmit={(ev) => {
        ev.preventDefault()
        void executar(() => marcarRetiradaPostadaManual(retiradaId, codigo))
      }}
    >
      <div className="adm-fraco adm-linha-cheia">
        Contrato dos Correios não configurado: poste no balcão e informe o código.
      </div>
      <input
        className="tinput adm-mono adm-campo-codigo"
        aria-label={`Código de rastreio da retirada ${retiradaId}`}
        placeholder="AA123456789BR"
        value={codigo}
        onChange={(ev) => setCodigo(ev.target.value)}
        maxLength={20}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="characters"
        translate="no"
      />
      <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado || !codigo.trim()} data-uso="retirada:postar_manual">
        Marcar como postada
        <span className="adm-sr"> a retirada {retiradaId}</span>
      </button>
      {podeEtiqueta ? (
        <a className="btn btn-outline adm-btn-compacto" href={href} target="_blank" rel="noreferrer">
          Etiqueta
          {novaAba}
        </a>
      ) : null}
    </form>
  )
}
