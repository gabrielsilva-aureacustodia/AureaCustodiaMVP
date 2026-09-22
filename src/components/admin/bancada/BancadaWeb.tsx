'use client'

/**
 * A bancada de análise no navegador (plano do Admin, 3.4): a fila à esquerda, o procedimento à
 * direita — câmera, uma ficha por moeda e o fechamento.
 *
 * O FECHAMENTO É O MESMO DA ESTAÇÃO. O botão chama `fecharAnaliseNoPainel`, que valida com as
 * regras da rota e passa para `fecharAnalise()` de src/server/estacao/analise.ts. A moeda nasce lá,
 * com o hash encadeado pela fórmula congelada, e o operador é o membro da sessão.
 *
 * A validação da tela é a mesma do servidor (src/domain/admin/bancada.ts) — roda aqui antes do
 * clique só para o operador saber na hora, com a moeda ainda na mesa. Quem recusa de verdade é o
 * servidor.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { pesoPadraoOuInicial, validarMoedasDaBancada, type ItemDaFilaBancada, type MoedaDigitada } from '@/domain/admin/bancada'
import { caixaCorrente, chaveDeCaixa, proximasPosicoesDaCaixa, type OcupacaoDaCaixa } from '@/domain/admin/caixas'
import type { ActionResult } from '@/domain/types'
import { abrirAnaliseNoPainel, atualizarBancadaNoPainel, fecharAnaliseNoPainel } from '@/server/actions/admin/bancada'
import type { SaidaFechamento } from '@/server/estacao/analise'
import { useToast } from '@/components/ui/Toast'

import { dataHora, numero } from '../formatos'
import { GravadorDeVideo } from './GravadorDeVideo'
import { QuadroDeCaixas } from './QuadroDeCaixas'

function recalcularPosicoes(
  lista: MoedaDigitada[],
  manuais: Set<number>,
  caixas: OcupacaoDaCaixa[],
): MoedaDigitada[] {
  const porCaixa = new Map<string, number[]>()
  lista.forEach((m, idx) => {
    if (m.veredito !== 'aprovada') return
    const chave = chaveDeCaixa(m.caixa)
    const indices = porCaixa.get(chave) ?? []
    indices.push(idx)
    porCaixa.set(chave, indices)
  })

  const copia = [...lista]

  for (const [chave, indices] of porCaixa.entries()) {
    const cObj = caixas.find((c) => chaveDeCaixa(c.codigo) === chave)
    const ignorar = new Set<number>()
    const naoManuais: number[] = []

    for (const idx of indices) {
      if (manuais.has(idx)) {
        const n = parseInt(copia[idx].posicao, 10)
        if (Number.isInteger(n) && n > 0) {
          ignorar.add(n)
        }
      } else {
        naoManuais.push(idx)
      }
    }

    if (naoManuais.length > 0) {
      const posicoes = proximasPosicoesDaCaixa(cObj, naoManuais.length, ignorar)
      naoManuais.forEach((idx, k) => {
        copia[idx] = { ...copia[idx], posicao: posicoes[k] !== undefined ? String(posicoes[k]) : '' }
      })
    }
  }

  return copia
}

export function BancadaWeb({
  filaInicial,
  caixasIniciais,
  caixasCadastradas,
  podeAnalisar,
  operador,
  videoConfigurado,
  videoFaltando,
}: {
  filaInicial: ItemDaFilaBancada[]
  caixasIniciais: OcupacaoDaCaixa[]
  caixasCadastradas: boolean
  podeAnalisar: boolean
  operador: string
  videoConfigurado: boolean
  videoFaltando: string[]
}): ReactNode {
  const toast = useToast()
  const [fila, setFila] = useState(filaInicial)
  const [caixas, setCaixas] = useState(caixasIniciais)
  const [atualizando, setAtualizando] = useState(false)
  const [envio, setEnvio] = useState<ItemDaFilaBancada | null>(null)
  const [moedas, setMoedas] = useState<MoedaDigitada[]>([])
  const [posicoesManuais, setPosicoesManuais] = useState<Set<number>>(new Set())
  const [video, setVideo] = useState<{ caminho: string | null; gravando: boolean }>({ caminho: null, gravando: false })
  const [erros, setErros] = useState<string[]>([])
  const [fechando, setFechando] = useState(false)
  const [resultado, setResultado] = useState<{ protocolo: string; saida: SaidaFechamento } | null>(null)

  async function atualizar(): Promise<void> {
    setAtualizando(true)
    const r = await atualizarBancadaNoPainel().catch((): ActionResult<never> => ({ ok: false, error: 'Sem resposta do servidor.' }))
    setAtualizando(false)
    if (r.ok && r.data) {
      setFila(r.data.fila)
      setCaixas(r.data.caixas)
    } else if (r.error) {
      toast(r.error)
    }
  }

  async function escolher(item: ItemDaFilaBancada): Promise<void> {
    if (video.gravando) {
      toast('Pare a gravação antes de trocar de envio.')
      return
    }
    setEnvio(item)
    const caixaSugerida = item.caixaInicial || caixaCorrente(caixas)
    const pesoSugerido = pesoPadraoOuInicial(item.tipoMoeda, item.pesoInicialMg)
    const cObj = caixas.find((c) => chaveDeCaixa(c.codigo) === chaveDeCaixa(caixaSugerida))
    const posicoes = proximasPosicoesDaCaixa(cObj, item.quantidade)

    setMoedas(
      Array.from({ length: item.quantidade }, (_, i) => ({
        veredito: 'aprovada',
        gramas: pesoSugerido,
        caixa: caixaSugerida,
        posicao: posicoes[i] !== undefined ? String(posicoes[i]) : '',
        motivoRecusa: '',
      })),
    )
    setPosicoesManuais(new Set())
    setErros([])
    setResultado(null)
    if (!podeAnalisar) return
    // Abrir a fase é informação para o cliente; falhar aqui não impede o procedimento físico.
    const r = await abrirAnaliseNoPainel(item.protocolo).catch(() => null)
    if (r && !r.ok && r.error) toast(`A fase não avançou no site: ${r.error}`)
    if (r?.ok) setFila((f) => f.map((x) => (x.protocolo === item.protocolo ? { ...x, etapaAtual: 'Em análise física' } : x)))
  }

  function mudar(i: number, campo: keyof MoedaDigitada, valor: string): void {
    if (campo === 'posicao') {
      const novasManuais = new Set(posicoesManuais)
      if (valor.trim() !== '') {
        novasManuais.add(i)
      } else {
        novasManuais.delete(i)
      }
      setPosicoesManuais(novasManuais)

      let novas = moedas.map((m, j) => (j === i ? { ...m, posicao: valor } : m))
      if (valor.trim() === '') {
        novas = recalcularPosicoes(novas, novasManuais, caixas)
      }
      setMoedas(novas)
      return
    }

    if (campo === 'caixa') {
      const caixaAnterior = moedas[i]?.caixa ?? ''
      const todasIguais = moedas.every((m) => m.veredito !== 'aprovada' || chaveDeCaixa(m.caixa) === chaveDeCaixa(caixaAnterior))

      let novas = moedas.map((m, j) => {
        if (j === i || (i === 0 && todasIguais && m.veredito === 'aprovada')) {
          return { ...m, caixa: valor }
        }
        return m
      })
      novas = recalcularPosicoes(novas, posicoesManuais, caixas)
      setMoedas(novas)
      return
    }

    if (campo === 'veredito') {
      let novas = moedas.map((m, j) => {
        if (j === i) {
          const aprovada = valor === 'aprovada'
          const caixaPadrao = m.caixa || (envio ? envio.caixaInicial || caixaCorrente(caixas) : '')
          return {
            ...m,
            veredito: valor as MoedaDigitada['veredito'],
            caixa: aprovada ? caixaPadrao : m.caixa,
          }
        }
        return m
      })
      novas = recalcularPosicoes(novas, posicoesManuais, caixas)
      setMoedas(novas)
      return
    }

    setMoedas((ms) => ms.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)))
  }

  function aplicarCaixaEmTodas(caixaNome: string): void {
    const novas = moedas.map((m) => (m.veredito === 'aprovada' ? { ...m, caixa: caixaNome } : m))
    setMoedas(recalcularPosicoes(novas, posicoesManuais, caixas))
  }

  async function fechar(): Promise<void> {
    if (!envio) return
    if (video.gravando) {
      setErros(['Pare a gravação antes de fechar.'])
      return
    }
    const local = validarMoedasDaBancada(moedas, envio.quantidade, video.caminho)
    if (!local.ok) {
      setErros(local.erros)
      return
    }
    setErros([])
    setFechando(true)
    const r = await fecharAnaliseNoPainel(envio.protocolo, moedas, video.caminho).catch((): ActionResult<never> => ({ ok: false, error: 'Sem resposta do servidor. Confira a fila antes de repetir.' }))
    setFechando(false)
    if (!r.ok || !r.data) {
      setErros([r.error ?? 'Falha ao gravar a análise.'])
      return
    }
    toast(r.message ?? 'Análise gravada.')
    setResultado({ protocolo: envio.protocolo, saida: r.data })
    setEnvio(null)
    setMoedas([])
    void atualizar()
  }

  return (
    <div className="adm-bancada">
      <section className="panel adm-bancada-fila" aria-label="Fila da bancada">
        <div className="adm-cs-cabecalho">
          <h3>Fila</h3>
          <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => void atualizar()} disabled={atualizando}>
            {atualizando ? 'Atualizando…' : 'Atualizar fila'}
          </button>
        </div>
        {fila.length === 0 ? (
          <p className="empty">Nenhum envio recebido esperando análise.</p>
        ) : (
          <div className="adm-cs-itens">
            {fila.map((item) => (
              <button key={item.protocolo} type="button" className={`adm-cs-item${envio?.protocolo === item.protocolo ? ' on' : ''}`} onClick={() => void escolher(item)}>
                <span className="adm-cs-item-topo">
                  <span className="adm-cs-nome">{item.protocolo}</span>
                  <span className="adm-cs-hora">{item.recebidoEm ? dataHora(item.recebidoEm) : ''}</span>
                </span>
                <span className="adm-cs-previa">
                  {item.cliente} · {numero(item.quantidade)} × {item.tipoMoeda} ({item.ano})
                </span>
                <span className="adm-fraco">{item.etapaAtual}</span>
                {item.origem === 'cadastro_sem_envio' ? <span className="adm-fraco">Cadastro sem envio</span> : null}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel adm-bancada-procedimento" aria-label="Procedimento">
        {resultado ? (
          <div className="note adm-secao" role="status">
            <span>
              <b>{resultado.protocolo}</b>: {resultado.saida.aprovadas} aprovada(s), {resultado.saida.recusadas} recusada(s).
              <ul className="adm-lista" style={{ margin: '6px 0 0 18px' }}>
                {resultado.saida.analises.map((a) => (
                  <li key={a.protocolo}>
                    {a.protocolo} · {a.codigoMoeda ?? 'recusada'} · <span className="adm-mono">{a.hash}</span>
                  </li>
                ))}
              </ul>
            </span>
          </div>
        ) : null}

        {!envio ? (
          <p className="empty">Escolha um envio da fila para começar o procedimento.</p>
        ) : (
          <>
            <div className="adm-cs-cabecalho">
              <div>
                <h3>{envio.protocolo}</h3>
                <p className="adm-fraco">
                  {envio.cliente} · {numero(envio.quantidade)} {envio.quantidade === 1 ? 'moeda' : 'moedas'} · {envio.tipoMoeda} {envio.ano}
                  {envio.codigoRastreio ? ` · rastreio ${envio.codigoRastreio}` : ''}
                </p>
                {envio.observacao ? <p className="adm-fraco">Observação: {envio.observacao}</p> : null}
              </div>
              <span className="adm-fraco">Operador: {operador}</span>
            </div>

            {!podeAnalisar ? (
              <p className="note">Seu papel vê a fila, mas não grava análise (permissão “Analisar moedas”).</p>
            ) : (
              <>
                <GravadorDeVideo protocolo={envio.protocolo} habilitado={podeAnalisar} videoConfigurado={videoConfigurado} videoFaltando={videoFaltando} aoMudar={setVideo} />

                {moedas.map((m, i) => (
                  <fieldset key={i} className="adm-bancada-moeda">
                    <legend>
                      Moeda {i + 1} de {moedas.length}
                    </legend>
                    <div className="adm-etiquetas" role="group" aria-label={`Veredito da moeda ${i + 1}`}>
                      {(['aprovada', 'recusada'] as const).map((v) => (
                        <button key={v} type="button" className="adm-etiqueta adm-etiqueta-botao" aria-pressed={m.veredito === v} onClick={() => mudar(i, 'veredito', v)}>
                          {v === 'aprovada' ? 'Aprovar' : 'Recusar'}
                        </button>
                      ))}
                    </div>
                    <div className="adm-form" style={{ marginTop: 10, marginBottom: 0 }}>
                      {/* Texto e não number: o Chromium descarta "27,05" num input numérico (estacao/renderer/app.js). */}
                      <label className="field">
                        <span>Peso (g)</span>
                        <input className="tinput" type="text" inputMode="decimal" autoComplete="off" placeholder="27,05" value={m.gramas} onChange={(e) => mudar(i, 'gramas', e.target.value)} />
                      </label>
                      {m.veredito === 'aprovada' ? (
                        <>
                          <label className="field">
                            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Caixa</span>
                              {moedas.length > 1 && m.caixa ? (
                                <button
                                  type="button"
                                  className="adm-fraco"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.85em' }}
                                  onClick={() => aplicarCaixaEmTodas(m.caixa)}
                                  title="Usar esta caixa em todas as moedas do envio"
                                >
                                  Replicar para todas
                                </button>
                              ) : null}
                            </span>
                            <input className="tinput" type="text" list="adm-bancada-caixas" placeholder="EB-001" value={m.caixa} onChange={(e) => mudar(i, 'caixa', e.target.value)} />
                          </label>
                          <label className="field">
                            <span>
                              Posição
                              {posicoesManuais.has(i) ? <span className="adm-fraco"> (editada à mão)</span> : null}
                            </span>
                            <input className="tinput" type="text" inputMode="numeric" placeholder="7" value={m.posicao} onChange={(e) => mudar(i, 'posicao', e.target.value)} />
                          </label>
                        </>
                      ) : (
                        <label className="field adm-campo-largo">
                          <span>Motivo da recusa</span>
                          <input className="tinput" type="text" placeholder="Peso fora da tolerância" value={m.motivoRecusa} onChange={(e) => mudar(i, 'motivoRecusa', e.target.value)} />
                        </label>
                      )}
                    </div>
                  </fieldset>
                ))}
                <datalist id="adm-bancada-caixas">
                  {caixas.filter((c) => c.cadastrada && c.ativa).map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.rotulo || c.codigo}
                    </option>
                  ))}
                </datalist>

                {erros.length > 0 ? (
                  <div className="note adm-secao" role="alert">
                    <ul className="adm-lista" style={{ margin: 0 }}>
                      {erros.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="adm-acoes">
                  <button type="button" className="btn btn-gold" onClick={() => void fechar()} disabled={fechando || video.gravando}>
                    {fechando ? 'Gravando a análise…' : 'Fechar análise'}
                  </button>
                  <span className="adm-fraco">{video.caminho ? 'Com vídeo.' : 'Sem vídeo — a análise registra a ausência no hash.'}</span>
                </div>
              </>
            )}
          </>
        )}
      </section>

      <QuadroDeCaixas caixas={caixas} cadastradas={caixasCadastradas} podeEditar={podeAnalisar} aoSalvar={() => void atualizar()} />
    </div>
  )
}
