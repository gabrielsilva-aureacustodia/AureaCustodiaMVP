'use client'

/**
 * A câmera e a gravação do procedimento, no navegador (plano do Admin, 3.4, itens 2 e 4).
 *
 * É O MESMO RITUAL DA ESTAÇÃO ELECTRON, com os aprendizados de 10/09/2026 que estão em
 * estacao/renderer/app.js: a câmera escolhida fica lembrada neste computador; o `deviceId` pode ter
 * mudado e a abertura cai para "qualquer câmera" AVISANDO; o formato de gravação é tentado até um
 * funcionar de verdade (`isTypeSupported` mente num fluxo sem áudio); sem microfone, porque a
 * conversa da sala é dado pessoal que ninguém pediu; e a câmera que morreu é reaberta antes de
 * gravar.
 *
 * O VÍDEO SOBE DIRETO PARA O SUPABASE STORAGE, por URL assinada no servidor — a Vercel recusa corpo
 * acima de 4,5 MB. `PUT` sem cabeçalho de autorização: a assinatura já está na URL (estacao/CONTRATO.md).
 *
 * O QUE O NAVEGADOR NÃO RESOLVE: gravar em disco antes de subir quando a internet oscila, e
 * sobreviver a um refresh no meio do procedimento. A cópia local aqui é um link "Baixar a gravação"
 * que vale enquanto a página estiver aberta. Para bancada sem rede estável, o `.exe` (RA-45).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { assinarVideoNoPainel } from '@/server/actions/admin/bancada'

const CAMERA_LEMBRADA = 'aurea-bancada-web-camera'
const RESOLUCAO = { width: { ideal: 1920 }, height: { ideal: 1080 } }
const PRAZO_MIDIA_MS = 8000

const FORMATOS: ReadonlyArray<{ mime: string; ext: 'webm' | 'mp4' }> = [
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
  { mime: 'video/mp4', ext: 'mp4' },
  { mime: '', ext: 'webm' },
]

type Envio = 'sem_gravacao' | 'enviando' | 'enviado' | 'nao_subiu'

function comPrazo<T>(promessa: Promise<T>, oQue: string): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${oQue} não respondeu em ${PRAZO_MIDIA_MS / 1000}s`)), PRAZO_MIDIA_MS)),
  ])
}

function lembrar(id: string): void {
  try {
    if (id) localStorage.setItem(CAMERA_LEMBRADA, id)
  } catch {
    /* navegação privada: seguir sem lembrar */
  }
}

function lembrada(): string {
  try {
    return localStorage.getItem(CAMERA_LEMBRADA) ?? ''
  } catch {
    return ''
  }
}

function tempo(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function GravadorDeVideo({
  protocolo,
  habilitado,
  videoConfigurado,
  videoFaltando,
  aoMudar,
}: {
  protocolo: string
  habilitado: boolean
  videoConfigurado: boolean
  videoFaltando: readonly string[]
  /** Caminho no Storage quando o vídeo subiu; `null` sem vídeo. `gravando` segura o fechamento. */
  aoMudar(estado: { caminho: string | null; gravando: boolean }): void
}): ReactNode {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fluxo = useRef<MediaStream | null>(null)
  const gravador = useRef<MediaRecorder | null>(null)
  const pedacos = useRef<Blob[]>([])
  const formato = useRef<(typeof FORMATOS)[number]>(FORMATOS[0])
  const urlLocal = useRef<string | null>(null)

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [camera, setCamera] = useState('')
  const [aviso, setAviso] = useState('')
  const [gravando, setGravando] = useState(false)
  const [inicio, setInicio] = useState(0)
  const [agora, setAgora] = useState(0)
  const [envio, setEnvio] = useState<Envio>('sem_gravacao')
  const [copia, setCopia] = useState<{ url: string; nome: string } | null>(null)

  const pararFluxo = useCallback(() => {
    fluxo.current?.getTracks().forEach((t) => t.stop())
    fluxo.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const listar = useCallback(async (): Promise<void> => {
    try {
      const todos = await comPrazo(navigator.mediaDevices.enumerateDevices(), 'A lista de câmeras')
      setCameras(todos.filter((d) => d.kind === 'videoinput'))
    } catch {
      setAviso('O sistema não devolveu a lista de câmeras. Usando a padrão — se for a errada, recarregue a página.')
    }
  }, [])

  const ligar = useCallback(
    async (deviceId: string): Promise<void> => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setAviso('Este navegador não dá acesso à câmera. Use o Chrome ou o Edge atualizados, num endereço https.')
        return
      }
      pararFluxo()
      let caiu = false
      try {
        let aberto: MediaStream | null = null
        if (deviceId) {
          try {
            aberto = await comPrazo(navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId }, ...RESOLUCAO }, audio: false }), 'A câmera escolhida')
          } catch (e) {
            // Só a ausência do dispositivo justifica abrir outra. Permissão negada ou câmera em uso
            // são problemas reais, e escondê-los faria o operador gravar sem saber o quê.
            const nome = e instanceof Error ? e.name : ''
            if (nome !== 'NotFoundError' && nome !== 'OverconstrainedError') throw e
            caiu = true
          }
        }
        if (!aberto) aberto = await comPrazo(navigator.mediaDevices.getUserMedia({ video: { ...RESOLUCAO }, audio: false }), 'A câmera')
        fluxo.current = aberto
        if (videoRef.current) videoRef.current.srcObject = aberto
        const real = aberto.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId
        if (real) {
          setCamera(real)
          lembrar(real)
        }
        setAviso(caiu ? 'A câmera escolhida não está mais disponível — abri a que o sistema ofereceu. Confira antes de gravar.' : '')
        await listar()
      } catch (e) {
        setAviso(`Não consegui abrir a câmera: ${e instanceof Error ? e.message : 'erro desconhecido'}. Confira o cabo e se outro programa está usando a webcam.`)
      }
    },
    [listar, pararFluxo],
  )

  // Troca de envio: nova gravação, câmera reaberta; ao sair da página, câmera desligada.
  useEffect(() => {
    setEnvio('sem_gravacao')
    setCopia(null)
    aoMudar({ caminho: null, gravando: false })
    if (habilitado) void ligar(lembrada())
    return () => {
      if (gravador.current && gravador.current.state !== 'inactive') gravador.current.stop()
      pararFluxo()
    }
    // `aoMudar` e `ligar` mudam de identidade a cada render do pai; o que decide é o envio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolo, habilitado])

  useEffect(() => {
    if (!gravando) return
    const t = setInterval(() => setAgora(Date.now()), 500)
    return () => clearInterval(t)
  }, [gravando])

  useEffect(
    () => () => {
      if (urlLocal.current) URL.revokeObjectURL(urlLocal.current)
    },
    [],
  )

  async function subir(blob: Blob, ext: 'webm' | 'mp4'): Promise<void> {
    if (!videoConfigurado) {
      setEnvio('nao_subiu')
      setAviso(`Gravação guardada só nesta página: o vídeo não sobe sem ${videoFaltando.join(' e ')} no ambiente. A análise pode ser fechada sem vídeo.`)
      aoMudar({ caminho: null, gravando: false })
      return
    }
    setEnvio('enviando')
    setAviso('Enviando a gravação para o armazenamento…')
    const assinatura = await assinarVideoNoPainel(protocolo, ext).catch(() => null)
    if (!assinatura?.ok || !assinatura.data) {
      setEnvio('nao_subiu')
      setAviso(`${assinatura?.error ?? 'Sem resposta do servidor.'} Baixe a gravação antes de sair da página.`)
      aoMudar({ caminho: null, gravando: false })
      return
    }
    try {
      const r = await fetch(assinatura.data.url, { method: 'PUT', headers: { 'Content-Type': `video/${ext}`, 'x-upsert': 'true' }, body: blob })
      if (!r.ok) throw new Error(`o armazenamento respondeu ${r.status}`)
      setEnvio('enviado')
      setAviso('Gravação enviada para o armazenamento. Ela entra na análise ao fechar.')
      aoMudar({ caminho: assinatura.data.caminho, gravando: false })
    } catch (e) {
      setEnvio('nao_subiu')
      setAviso(`A gravação não subiu (${e instanceof Error ? e.message : 'erro de rede'}). Baixe a cópia antes de sair da página; a análise pode ser fechada sem vídeo.`)
      aoMudar({ caminho: null, gravando: false })
    }
  }

  function aoParar(): void {
    const f = formato.current
    const blob = new Blob(pedacos.current, { type: f.mime || 'video/webm' })
    if (urlLocal.current) URL.revokeObjectURL(urlLocal.current)
    urlLocal.current = URL.createObjectURL(blob)
    setCopia({ url: urlLocal.current, nome: `${protocolo}.${f.ext}` })
    void subir(blob, f.ext)
  }

  async function comecar(): Promise<void> {
    const trilha = fluxo.current?.getVideoTracks()[0]
    if (!trilha || trilha.readyState !== 'live') {
      setAviso('A câmera parou. Reabrindo…')
      await ligar(camera)
      const nova = fluxo.current?.getVideoTracks()[0]
      if (!nova || nova.readyState !== 'live') {
        setAviso('A câmera não está disponível. Confira o cabo e a seleção, e tente de novo.')
        return
      }
    }
    pedacos.current = []
    for (const f of FORMATOS) {
      if (f.mime && !MediaRecorder.isTypeSupported(f.mime)) continue
      let g: MediaRecorder
      try {
        g = new MediaRecorder(fluxo.current as MediaStream, f.mime ? { mimeType: f.mime } : undefined)
      } catch {
        continue
      }
      g.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) pedacos.current.push(e.data)
      }
      g.onstop = aoParar
      try {
        g.start(1000)
      } catch {
        continue
      }
      gravador.current = g
      formato.current = f
      setGravando(true)
      setInicio(Date.now())
      setAgora(Date.now())
      setEnvio('sem_gravacao')
      setAviso('')
      aoMudar({ caminho: null, gravando: true })
      return
    }
    // Falhar em silêncio seria o pior desfecho: o operador faria a análise inteira achando que gravou.
    setAviso('Não consegui iniciar a gravação neste navegador, em nenhum formato. A análise pode ser fechada sem vídeo.')
  }

  function parar(): void {
    gravador.current?.stop()
    setGravando(false)
  }

  if (!habilitado) return null

  return (
    <div className="adm-bancada-video">
      <div className="adm-form" style={{ marginBottom: 8 }}>
        <label className="field">
          <span>Câmera</span>
          <select
            className="tinput"
            value={camera}
            disabled={gravando}
            onChange={(e) => {
              setCamera(e.target.value)
              void ligar(e.target.value)
            }}
          >
            {cameras.length === 0 ? <option value="">Câmera padrão</option> : null}
            {cameras.map((c, i) => (
              <option key={c.deviceId || i} value={c.deviceId}>
                {c.label || `Câmera ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <div className="adm-acoes">
          <button type="button" className={`btn ${gravando ? 'btn-outline' : 'btn-gold'} adm-btn-compacto`} onClick={() => (gravando ? parar() : void comecar())} disabled={envio === 'enviando'}>
            {gravando ? 'Parar' : envio === 'sem_gravacao' ? 'Gravar' : 'Gravar de novo'}
          </button>
          <span className={`adm-bancada-cronometro${gravando ? ' on' : ''}`} aria-live="polite">
            {gravando ? tempo(agora - inicio) : '00:00'}
          </span>
        </div>
      </div>
      {/* muted e playsInline: sem eles o celular abre o vídeo em tela cheia e o navegador recusa tocar sozinho. */}
      <video ref={videoRef} className="adm-bancada-previa" autoPlay muted playsInline />
      {aviso ? <p className={`adm-fraco${envio === 'nao_subiu' ? ' adm-negativo' : ''}`}>{aviso}</p> : null}
      {copia ? (
        <p className="adm-fraco">
          <a href={copia.url} download={copia.nome}>
            Baixar a gravação
          </a>{' '}
          — a cópia vale enquanto esta página estiver aberta.
        </p>
      ) : null}
    </div>
  )
}
