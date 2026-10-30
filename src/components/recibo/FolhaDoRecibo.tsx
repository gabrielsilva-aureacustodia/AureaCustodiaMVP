/**
 * A folha do recibo de custódia — só a apresentação, sem estado, sem hook e sem sessão.
 *
 * Saiu de <Certificate> em 30/10/2026 para a tela do cliente e a visão de somente leitura do Admin
 * (/admin/moedas/[codigo]/cliente) desenharem o MESMO documento: o botão "Ver como o cliente vê"
 * apontava para /recibos/[coinId], que só abre para o dono da moeda e dava 404 para a equipe.
 */

import type { ReactNode } from 'react'

import { CoinArt } from '@/components/svg/CoinArt'

export interface FolhaDoReciboProps {
  tipoMoeda: string
  ano: number
  codigo: string
  hash: string
  dataEmissao: string
  proprietario: string
  status: string
  negociavel: boolean
  extinto: boolean
  bloqueado: boolean
  pendencia: boolean
}

export function FolhaDoRecibo({ tipoMoeda, ano, codigo, hash, dataEmissao, proprietario, status, negociavel, extinto, bloqueado, pendencia }: FolhaDoReciboProps): ReactNode {
  return (
    <div className="cert">
      {extinto ? (
        <div className="cert-stamp-extinto" aria-label="Recibo Extinto">
          RECIBO EXTINTO
          <br />
          <span className="cert-stamp-sub">
            RETIRADA FÍSICA SOLICITADA
          </span>
        </div>
      ) : bloqueado ? (
        <div className="cert-stamp-bloqueado" aria-label="Recibo Bloqueado">
          RECIBO BLOQUEADO
          <br />
          <span className="cert-stamp-sub">
            {pendencia ? 'PENDÊNCIA DE CUSTÓDIA' : 'RESTRIÇÃO ADMINISTRATIVA'}
          </span>
        </div>
      ) : null}

      {/* .cert-art tem 150px e a .coin-svg lá dentro, 64px. A arte não
          preenche o quadro — é assim no monolito, e a folga é o respiro
          acima do brasão. */}
      <div className="cert-art">
        <CoinArt type={tipoMoeda} />
      </div>
      <h2 className="serif">REAL OLÍMPICO</h2>
      <div className="cert-sub">Real Olímpico</div>
      <div className="cert-rule"></div>
      <div className="cert-title">Recibo de Custódia</div>
      <div className="cert-code">{codigo}</div>

      {/* Os CINCO campos do documento, nesta ordem e com estes textos. É a
          mesma lista que @/lib/pdf/recibo-pdf imprime: tela e PDF precisam
          dizer a mesma coisa, senão o recibo baixado contradiz o que a
          pessoa viu. Dado novo entra no painel lateral, não aqui. */}
      <div className="cert-fields">
        <div className="cf-row">
          <span className="k">Moeda</span>
          <span className="v">
            {tipoMoeda}
            {!negociavel ? ' ' + ano : ''}
          </span>
        </div>
        <div className="cf-row">
          <span className="k">Status</span>
          <span className="v">{status}</span>
        </div>
        <div className="cf-row">
          <span className="k">Data de emissão</span>
          {/* Congelada na emissão: não muda quando a moeda troca de dono. */}
          <span className="v">{dataEmissao}</span>
        </div>
        <div className="cf-row">
          <span className="k">Proprietário atual</span>
          <span className="v">{proprietario}</span>
        </div>
        <div className="cf-row">
          <span className="k">Hash (curto)</span>
          <span className="v">{hash}</span>
        </div>
      </div>

      <div className="cert-seal">
        <div className="seal-badge">
          <svg className="seal-ico" viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Custódia
          <br />
          verificada
        </div>
      </div>

      <div className="cert-foot">
        Este recibo certifica a custódia e o vínculo documental.
        <br />A moeda física permanece sob guarda do Real Olímpico.
      </div>
    </div>
  )
}
