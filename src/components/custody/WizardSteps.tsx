/**
 * Trilha de etapas do wizard de envio — port de aurea-mvp-teste.html, linhas
 * 2032-2037 (o bloco `stepsHtml` que abria o renderSend).
 *
 * SEM 'use client' DE PROPÓSITO
 * -----------------------------
 * O componente não tem estado, efeito nem manipulador: recebe o número do passo
 * e devolve marcação. Quem o importa é a página de envios, que já é cliente, de
 * modo que ele viaja junto no mesmo bundle — a diretiva não mudaria nada e
 * apenas sugeriria uma fronteira que não existe.
 *
 * Os rótulos são os quatro do original ('Moeda','Protocolo','Correios',
 * 'Análise'), não os cinco de ETAPAS_ENVIO. São coisas diferentes: aqui está o
 * caminho que o USUÁRIO percorre na tela; ETAPAS_ENVIO é o ciclo de vida do
 * objeto físico, que a linha do tempo do passo 4 desenha.
 */

import { Fragment } from 'react'
import type { ReactNode } from 'react'

/** Os quatro rótulos do `stepsDef` original (linha 2032), na ordem. */
const PASSOS: readonly string[] = ['Moeda', 'Protocolo', 'Correios', 'Análise']

export interface WizardStepsProps {
  /** Passo atual, de 1 a 4. */
  step: number
}

export function WizardSteps({ step }: WizardStepsProps): ReactNode {
  return (
    <div className="wizard-steps">
      {PASSOS.map((label, i) => {
        const n = i + 1
        // Mesma classificação do original: passado vira 'done' (bolinha dourada
        // com ✓), o atual vira 'active' (só a borda dourada) e o futuro fica sem
        // classe nenhuma.
        const cls = n < step ? 'done' : n === step ? 'active' : ''
        return (
          // O rótulo é único e estável — melhor chave que o índice, que mudaria
          // de significado se a trilha ganhasse um passo no meio.
          <Fragment key={label}>
            <div className="wz-step">
              <div className={`wz-num ${cls}`}>{n < step ? '✓' : n}</div>
              <div className={`wz-label ${n === step ? 'on' : ''}`}>{label}</div>
            </div>
            {/* O tracinho separador não existe depois do último passo. */}
            {i < PASSOS.length - 1 && <div className="wz-line" />}
          </Fragment>
        )
      })}
    </div>
  )
}
