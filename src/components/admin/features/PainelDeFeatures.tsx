'use client'

/**
 * Os interruptores de /admin/features. Cada botão chama a Server Action, que confere o papel `dev`
 * e grava a troca; o estado na tela só muda depois que o servidor confirma. Nada aqui decide
 * permissão — só mostra.
 */

import Link from 'next/link'
import { useState, useTransition } from 'react'
import type { ReactNode } from 'react'

import { DEFINICOES_FEATURES, ROTULO_GRUPO_FEATURE, type FeaturesVigentes, type GrupoFeature } from '@/domain/admin/features'
import { alternarFeatureNoPainel } from '@/server/actions/admin/features'
import { useToast } from '@/components/ui/Toast'

const GRUPOS: readonly GrupoFeature[] = ['negociacao', 'visual', 'atendimento']

const ATALHOS_GERAIS: ReadonlyArray<{ href: string; rotulo: string; texto: string }> = [
  { href: '/admin/configuracao?aba=taxas', rotulo: 'Taxas e comissões', texto: 'Comissão, custódia, saque e retirada.' },
  { href: '/admin/configuracao?aba=operacional', rotulo: 'Parâmetros operacionais', texto: 'Limite de depósito, ciclo de sincronização, prazos e frete.' },
  { href: '/admin/configuracao?aba=catalogo', rotulo: 'Catálogo de moedas', texto: 'Tipos de moeda e quem é negociável.' },
  { href: '/admin/configuracao?aba=integracoes', rotulo: 'Integrações', texto: 'Quais serviços externos estão ligados.' },
]

export function PainelDeFeatures({ iniciais }: { iniciais: FeaturesVigentes }): ReactNode {
  const [valores, setValores] = useState<FeaturesVigentes>(iniciais)
  const [pendente, iniciar] = useTransition()
  const [trocando, setTrocando] = useState<string | null>(null)
  const avisar = useToast()

  function trocar(chave: string, ligada: boolean): void {
    setTrocando(chave)
    iniciar(async () => {
      const r = await alternarFeatureNoPainel(chave, ligada)
      if (r.ok) {
        setValores((v) => ({ ...v, [chave]: r.data?.ligada ?? ligada }))
        avisar(r.message ?? 'Salvo.')
      } else {
        avisar(r.error ?? 'Não foi possível salvar.')
      }
      setTrocando(null)
    })
  }

  return (
    <>
      {GRUPOS.map((g) => (
        <div className="panel" key={g}>
          <h2>{ROTULO_GRUPO_FEATURE[g]}</h2>
          {DEFINICOES_FEATURES.filter((d) => d.grupo === g).map((d) => {
            const ligada = valores[d.chave] ?? d.padrao
            return (
              <div className="sec-row" key={d.chave} style={{ alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{d.rotulo}</b>
                  <p className="adm-fraco" style={{ margin: '4px 0 0' }}>{d.descricao}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ligada}
                  aria-label={`${d.rotulo}: ${ligada ? 'ligada' : 'desligada'}`}
                  className={ligada ? 'btn' : 'btn btn-outline'}
                  disabled={pendente}
                  style={{ minWidth: 112, minHeight: 44 }}
                  onClick={() => trocar(d.chave, !ligada)}
                >
                  {trocando === d.chave ? 'Salvando…' : ligada ? 'Ligada' : 'Desligada'}
                </button>
              </div>
            )
          })}
        </div>
      ))}
      <div className="panel">
        <h2>Configurações gerais do site</h2>
        <p className="adm-fraco">Valores, taxas e parâmetros que o site inteiro lê ficam na Configuração do site.</p>
        <div className="adm-grade-larga">
          {ATALHOS_GERAIS.map((a) => (
            <Link key={a.href} href={a.href} className="panel">
              <b>{a.rotulo}</b>
              <p className="adm-fraco" style={{ margin: '4px 0 0' }}>{a.texto}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
