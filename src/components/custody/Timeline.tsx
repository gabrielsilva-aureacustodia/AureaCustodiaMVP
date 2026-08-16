/**
 * Linha do tempo do acompanhamento (passo 4 do wizard) — port de
 * aurea-mvp-teste.html, `tlStageNote` (2164-2173) e o bloco `tlHtml` de
 * `sendStepAnalise` (2177-2182).
 *
 * O original repetia o array das cinco etapas dentro de cada função que
 * precisava dele (2177 no desenho, 2206 no avanço). Aqui a lista é uma só —
 * ETAPAS_ENVIO, em @/domain/types — e a ORDEM DELA É A MÁQUINA DE ESTADOS: o
 * índice da etapa atual separa o que já aconteceu (✓ verde) do que ainda vai
 * acontecer. Duplicar o array de novo abriria a porta para a tela e a regra
 * discordarem sobre qual é a próxima etapa.
 *
 * Sem 'use client' pelo mesmo motivo de WizardSteps: é marcação pura.
 */

import type { ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { ETAPAS_ENVIO } from '@/domain/types'
import type { Envio, EtapaEnvio } from '@/domain/types'

/**
 * Texto de apoio de cada etapa. Só 'Envio postado' é variável: antes da
 * postagem a frase é a espera; depois, a data real do carimbo.
 *
 * O `default` é inalcançável (EtapaEnvio é uma união fechada de cinco valores),
 * mas está no original e fica: se um dia entrar uma sexta etapa, a tela mostra
 * um texto vazio em vez de quebrar.
 */
function notaDaEtapa(etapa: EtapaEnvio, envio: Envio): string {
  switch (etapa) {
    case 'Protocolo gerado':
      return 'Protocolo registrado com sucesso.'
    case 'Envio postado':
      return envio.dataPostagem
        ? 'Objeto postado via Correios em ' + fdate(envio.dataPostagem) + '.'
        : 'Aguardando postagem.'
    case 'Recebido pela custódia':
      return 'Objeto recebido em nosso centro de custódia.'
    case 'Em análise física':
      return 'Item em análise física e registro fotográfico pela equipe.'
    case 'Recibo emitido':
      return 'Custódia validada — recibo NFT emitido.'
    default:
      return ''
  }
}

export interface TimelineProps {
  envio: Envio
}

export function Timeline({ envio }: TimelineProps): ReactNode {
  const atual = ETAPAS_ENVIO.indexOf(envio.etapaAtual)

  return (
    <div className="timeline">
      {ETAPAS_ENVIO.map((etapa, i) => {
        const done = i < atual
        const active = i === atual
        return (
          // A etapa é única dentro da lista e não muda de posição — chave estável.
          <div className="tl-item" key={etapa}>
            <div className={`tl-dot ${done ? 'done' : active ? 'active' : ''}`}>
              {done ? '✓' : i + 1}
            </div>
            <div className="tl-body">
              <h4>{etapa}</h4>
              <p>{notaDaEtapa(etapa, envio)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
