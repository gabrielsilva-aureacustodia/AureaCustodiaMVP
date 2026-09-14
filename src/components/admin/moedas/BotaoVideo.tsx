'use client'

/**
 * "Assistir" o vídeo de uma análise. O servidor confere a permissão e devolve uma URL de leitura que
 * vale por dez minutos (src/server/admin/video.ts); o balde continua privado.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { urlDoVideoNoPainel } from '@/server/actions/admin/bancada'
import { useToast } from '@/components/ui/Toast'

export function BotaoVideo({ caminho }: { caminho: string }): ReactNode {
  const toast = useToast()
  const [abrindo, setAbrindo] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  if (url) {
    return (
      <video className="adm-bancada-previa" src={url} controls preload="metadata">
        <a href={url}>Abrir o vídeo</a>
      </video>
    )
  }

  return (
    <button
      type="button"
      className="btn btn-outline adm-btn-compacto"
      disabled={abrindo}
      onClick={async () => {
        setAbrindo(true)
        const r = await urlDoVideoNoPainel(caminho).catch(() => null)
        setAbrindo(false)
        if (r?.ok && r.data) setUrl(r.data.url)
        else toast(r?.error ?? 'Sem resposta do servidor.')
      }}
    >
      {abrindo ? 'Abrindo…' : 'Assistir ao vídeo'}
    </button>
  )
}
