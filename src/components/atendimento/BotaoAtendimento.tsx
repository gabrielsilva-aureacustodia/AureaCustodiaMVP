'use client'

/**
 * O botão flutuante de atendimento: dúvida, pedido, reclamação ou erro, de qualquer tela logada.
 *
 * NÃO TAMPA NADA. Canto inferior direito, 44 px, com a margem segura do aparelho (`env(safe-area-inset-*)`);
 * acima do "Ver tutorial" quando ele existe (atendimento.css). É só o ícone em toda largura (compacto, com `title`
 * e `aria-label`); a folha de envio vira faixa de ponta a ponta no celular. Escape fecha e devolve o foco ao botão. Não impede a página de
 * rolar nem escurece nada: a pessoa pode copiar um dado da tela enquanto escreve.
 *
 * SÓ PARA LOGADOS, nas duas áreas (cliente e painel). Visitante não tem como receber a resposta, então a
 * página pública não monta este componente (decisão registrada em docs/atendimento/DESENHO.md).
 *
 * O ENVIO VAI POR `fetch` MULTIPART em /api/atendimento/casos: o print pode ter 2 MB e a Server Action
 * aceita 1 MB. O número no selo vem de `listarMeusCasosAction` (respostas que o cliente ainda não viu).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { LIMITE_ANEXO_BYTES, LIMITE_TEXTO, TIPOS_DE_CASO, paginaDeOrigemSegura, type TipoDeCaso } from '@/domain/atendimento/casos'
import { listarMeusCasosAction } from '@/server/actions/atendimento'

const TRACO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function BotaoAtendimento(): ReactNode {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [novas, setNovas] = useState(0)
  const [tipo, setTipo] = useState<TipoDeCaso>('duvida')
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const entradaArquivo = useRef<HTMLInputElement>(null)
  const ids = useId()

  // Página de origem: sempre só o caminho. Para erro vai à vista; nos demais tipos vai junto em silêncio.
  const origem = paginaDeOrigemSegura(pathname) ?? '/'

  const atualizarSelo = useCallback(async () => {
    const r = await listarMeusCasosAction()
    if (r.ok && r.data) setNovas(r.data.novas)
  }, [])

  useEffect(() => {
    void atualizarSelo()
    // Respostas novas aparecem sem recarregar a página; 60 s basta para atendimento.
    const t = window.setInterval(() => void atualizarSelo(), 60_000)
    return () => window.clearInterval(t)
  }, [atualizarSelo, pathname])

  const fechar = useCallback(() => {
    setAberto(false)
    botao.current?.focus()
  }, [])

  useEffect(() => {
    if (!aberto) return
    campo.current?.focus()
    const aoTeclar = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') fechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, fechar])

  function escolherArquivo(f: File | null): void {
    setErro(null)
    if (f && f.size > LIMITE_ANEXO_BYTES) {
      setErro('A imagem passa de 2 MB. Escolha uma menor.')
      if (entradaArquivo.current) entradaArquivo.current.value = ''
      return
    }
    setArquivo(f)
  }

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (enviando) return
    if (!texto.trim()) {
      setErro('Escreva a mensagem.')
      campo.current?.focus()
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const dados = new FormData()
      dados.set('tipo', tipo)
      dados.set('texto', texto)
      dados.set('pagina', origem)
      if (arquivo) dados.set('anexo', arquivo)
      const resp = await fetch('/api/atendimento/casos', { method: 'POST', body: dados })
      const corpo = (await resp.json().catch(() => ({}))) as { erro?: string }
      if (!resp.ok) {
        setErro(corpo.erro ?? 'Não foi possível enviar agora. Tente de novo.')
        return
      }
      setEnviado(true)
      setTexto('')
      setArquivo(null)
      if (entradaArquivo.current) entradaArquivo.current.value = ''
    } catch {
      setErro('Sem conexão. Confira a internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  function novoEnvio(): void {
    setEnviado(false)
    setTipo('duvida')
    window.setTimeout(() => campo.current?.focus(), 0)
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="atd-fab"
        aria-expanded={aberto}
        aria-controls={`${ids}-folha`}
        aria-label={novas > 0 ? `Atendimento, ${novas} resposta${novas > 1 ? 's' : ''} nova${novas > 1 ? 's' : ''}` : 'Atendimento'}
        title="Atendimento"
        data-tutorial-ui
        data-uso="atendimento:abrir"
        onClick={() => setAberto((a) => !a)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" {...TRACO}>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
          <path d="M9 11h6M9 14h3.5" />
        </svg>
        {novas > 0 ? <span className="atd-fab-selo" aria-hidden="true">{novas}</span> : null}
      </button>

      {aberto ? (
        <section id={`${ids}-folha`} className="atd-folha" role="dialog" aria-modal="false" aria-labelledby={`${ids}-titulo`} data-tutorial-ui>
          <header className="atd-cabeca">
            <div>
              <h2 id={`${ids}-titulo`}>Fale com a equipe</h2>
              <p>A resposta aparece em Atendimento, na sua conta.</p>
            </div>
            <button type="button" className="atd-fechar" onClick={fechar} aria-label="Fechar atendimento">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          {enviado ? (
            <div className="atd-ok" role="status">
              <p>
                <b>Recebemos o seu pedido.</b>
                <br />A equipe responde por aqui.
              </p>
              <div className="atd-acoes" style={{ justifyContent: 'center' }}>
                <Link href="/atendimento" className="btn btn-gold" onClick={() => setAberto(false)}>
                  Ver meus pedidos
                </Link>
                <button type="button" className="btn btn-outline" onClick={novoEnvio}>
                  Enviar outro
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void enviar(e)} noValidate>
              <fieldset className="atd-tipos">
                <legend>Sobre o quê?</legend>
                {TIPOS_DE_CASO.map((t) => (
                  <button key={t.chave} type="button" className="chip" aria-pressed={tipo === t.chave} onClick={() => setTipo(t.chave)}>
                    {t.rotulo}
                  </button>
                ))}
              </fieldset>

              <div className="field">
                <label htmlFor={`${ids}-texto`}>{tipo === 'erro' ? 'O que aconteceu?' : 'Sua mensagem'}</label>
                <textarea
                  id={`${ids}-texto`}
                  ref={campo}
                  className="obs"
                  rows={5}
                  maxLength={LIMITE_TEXTO}
                  value={texto}
                  aria-invalid={erro && !texto.trim() ? true : undefined}
                  aria-describedby={erro ? `${ids}-erro` : undefined}
                  onChange={(e) => setTexto(e.target.value)}
                />
                <span className="atd-contagem" aria-hidden="true">
                  {texto.length}/{LIMITE_TEXTO}
                </span>
              </div>

              {tipo === 'erro' ? (
                <p className="atd-origem">
                  Página do erro: <code>{origem}</code>
                </p>
              ) : null}

              <div className="atd-anexo">
                <input
                  ref={entradaArquivo}
                  id={`${ids}-arquivo`}
                  className="atd-entrada-oculta"
                  type="file"
                  tabIndex={-1}
                  aria-label="Anexar imagem"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)}
                />
                <button type="button" className="btn btn-outline" onClick={() => entradaArquivo.current?.click()}>
                  {arquivo ? 'Trocar imagem' : 'Anexar imagem'}
                </button>
                {arquivo ? (
                  <>
                    <span className="atd-anexo-nome">{arquivo.name}</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setArquivo(null)
                        if (entradaArquivo.current) entradaArquivo.current.value = ''
                      }}
                    >
                      Remover
                    </button>
                  </>
                ) : (
                  <span className="atd-anexo-nome">PNG, JPEG ou WebP, até 2 MB (opcional)</span>
                )}
              </div>

              {erro ? (
                <p id={`${ids}-erro`} className="atd-erro" role="alert">
                  {erro}
                </p>
              ) : null}

              <div className="atd-acoes">
                <Link href="/atendimento" className="btn btn-ghost" onClick={() => setAberto(false)}>
                  Meus pedidos
                </Link>
                <button type="submit" className="btn btn-gold" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}
    </>
  )
}
