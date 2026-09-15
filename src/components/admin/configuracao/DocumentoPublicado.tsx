'use client'

/**
 * A versão publicada de um documento contratual, ao lado do formulário que a muda.
 *
 * Quando o texto que a configuração vigente produz não tem o hash da última versão publicada — a
 * taxa foi salva e a publicação falhou —, aparece "Publicar a versão vigente". Esconder a diferença
 * deixaria o cliente pagando uma taxa que a Tabela publicada não mostra.
 */

import type { ReactNode } from 'react'

import type { ActionResult } from '@/domain/types'
import { publicarDocumentoNoPainel } from '@/server/actions/admin/config'

import { BotaoAcao } from '../BotaoAcao'

export interface ResumoDocumento {
  chave: string
  nome: string
  versao: string
  hash: string
  vigenteDesde: string
  confere: boolean
  doBanco: boolean
  rota: string
}

export function DocumentoPublicado({ doc, podePublicar }: { doc: ResumoDocumento; podePublicar: boolean }): ReactNode {
  return (
    <div className={`note adm-secao${doc.confere ? '' : ' adm-negativo'}`}>
      <span>
        <b>{doc.nome}</b> · versão {doc.versao} · em vigor desde {doc.vigenteDesde} ·{' '}
        <a href={doc.rota} target="_blank" rel="noreferrer">
          ver a página
        </a>
        <br />
        <span className="adm-mono adm-fraco">hash {doc.hash}</span>
        {!doc.doBanco ? <span className="adm-fraco"> · versão do código, ainda sem publicação no banco</span> : null}
        {!doc.confere ? (
          <>
            <br />
            A configuração vigente produz um texto diferente do publicado.{' '}
            {podePublicar ? (
              <BotaoAcao acao={(): Promise<ActionResult<unknown>> => publicarDocumentoNoPainel(doc.chave)} variante="gold" usoNome={`config.publicar.${doc.chave}`}>
                Publicar a versão vigente
              </BotaoAcao>
            ) : null}
          </>
        ) : null}
      </span>
    </div>
  )
}
