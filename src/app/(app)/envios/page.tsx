'use client'

/**
 * 1.3 — Enviar moeda para custódia.
 *
 * Port de aurea-mvp-teste.html, linhas 2029-2230: `renderSend`, `sendStepMoeda`,
 * `sendStepProtocolo`, `sendStepCorreios` e `sendStepAnalise`. O título da tela
 * ('Enviar moeda para custódia' / 'Cadastre sua moeda para análise...') não
 * aparece aqui porque a Topbar o deriva da rota — ver o cabeçalho dela.
 *
 * O PASSO ATUAL NASCE DO ESTADO DO SERVIDOR, NÃO DE UMA GLOBAL
 * ------------------------------------------------------------
 * O monolito guardava `sendStep` e `activeEnvioId` em variáveis de módulo, e a
 * retomada acontecia dentro de `go('send')` (linhas 1113-1117): procurava o
 * envio pendente do usuário, o mais recente primeiro, e abria no passo 3 ou 4.
 * Aqui a mesma derivação roda no primeiro render — sobre `state.envios`, que já
 * vem preenchido do servidor. Isso importa por dois motivos:
 *
 *  - quem entrou por link direto, recarregou a página ou trocou de aparelho cai
 *    no mesmo lugar de quem navegou pela barra lateral: o passo é uma
 *    consequência do envio, não da memória da aba;
 *  - o HTML do servidor e o do cliente concordam, porque os dois derivam do
 *    mesmo estado — nada de piscar o passo 1 antes de pular para o 4.
 *
 * Depois da abertura, os avanços de tela são locais (1->2, 2->3 ao gerar o
 * protocolo, 3->4 ao continuar), exatamente como no original. Em particular, o
 * usuário PERMANECE no passo 3 depois de marcar a postagem — o `markPostado`
 * mexia no estado e chamava render() sem tocar em `sendStep`, e a tela então
 * mostra o código de rastreio com o botão "Continuar para acompanhamento".
 * Reagir à mudança de etapa e saltar sozinho para o passo 4 seria mais "certo"
 * e não é o que o produto faz.
 *
 * AS FOTOS FICAM NA MEMÓRIA DA ABA. Nada de imagem é enviado ao servidor — ver o
 * cabeçalho de components/custody/PhotoSlot.tsx.
 */

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'

import { COIN_TYPES, coinTypeInfo } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { AppState, Envio, UserEmail } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { PhotoSlot } from '@/components/custody/PhotoSlot'
import type { Fotos, FotoSlot } from '@/components/custody/PhotoSlot'
import { Timeline } from '@/components/custody/Timeline'
import { WizardSteps } from '@/components/custody/WizardSteps'
import { advanceAnalysis, createProtocol, markPosted } from '@/server/actions/custody'

/** Os quatro passos da tela. */
type Passo = 1 | 2 | 3 | 4

/** Posição do wizard: o passo mostrado e o protocolo que ele acompanha. */
interface EstadoWizard {
  passo: Passo
  protocolo: string | null
}

/**
 * Anos oferecidos no passo 1: de 2016 até 1980, decrescente (linha 2065).
 * Construído no módulo porque a lista é fixa — recriá-la a cada render seria
 * trabalho puro sem ganho nenhum.
 */
const ANOS: number[] = (() => {
  const out: number[] = []
  for (let y = 2016; y >= 1980; y--) out.push(y)
  return out
})()

/** Estado inicial do formulário — o `sendForm` da linha 898. */
const FOTOS_VAZIAS: Fotos = { frente: null, verso: null }

/**
 * A retomada do `go('send')` original (linhas 1113-1117).
 *
 * Pendente = envio do usuário que ainda não chegou em 'Recibo emitido'. Havendo
 * mais de um, vale o mais recente (createdAt decrescente). 'Protocolo gerado'
 * ainda espera a postagem, então abre no passo 3; qualquer etapa posterior já é
 * acompanhamento, passo 4.
 */
function retomada(state: AppState, session: UserEmail): EstadoWizard {
  const pendente = state.envios
    .filter((e) => e.userEmail === session && e.etapaAtual !== 'Recibo emitido')
    .sort((a, b) => b.createdAt - a.createdAt)[0]

  if (!pendente) return { passo: 1, protocolo: null }
  return {
    passo: pendente.etapaAtual === 'Protocolo gerado' ? 3 : 4,
    protocolo: pendente.protocolo,
  }
}

export default function EnviosPage(): ReactNode {
  const { state, session, run } = useApp()
  const router = useRouter()

  // Inicializador preguiçoso: a derivação roda uma vez, no primeiro render (que
  // acontece no servidor e no cliente com o MESMO state, então hidrata limpo).
  const [wizard, setWizard] = useState<EstadoWizard>(() => retomada(state, session))

  /* ---------- formulário do passo 1 (o `sendForm` da linha 898) ---------- */
  const [tipoMoeda, setTipoMoeda] = useState<string>(COIN_TYPES[0].key)
  const [ano, setAno] = useState<number>(COIN_TYPES[0].anoPadrao)
  /**
   * A quantidade é guardada como TEXTO e só depois interpretada.
   *
   * O original tinha `oninput` sem re-render: apagar o campo deixava o DOM vazio
   * enquanto `sendForm.quantidade` já valia 1. Um input controlado por número
   * faria o "1" reaparecer embaixo do cursor no meio da digitação — mudança de
   * comportamento que o usuário sente. O texto preserva o que foi digitado; o
   * número usado pela regra é sempre o clamp abaixo.
   */
  const [qtdTexto, setQtdTexto] = useState<string>('1')
  const [fotos, setFotos] = useState<Fotos>(FOTOS_VAZIAS)
  const [confirmOk, setConfirmOk] = useState<boolean>(false)

  /** `Math.max(1, parseInt(...)||1)` da linha 2077. */
  const quantidade = Math.max(1, parseInt(qtdTexto, 10) || 1)

  /* ---------- ações ---------- */

  const escolherFoto = useCallback((slot: FotoSlot, dataUrl: string) => {
    setFotos((f) => ({ ...f, [slot]: dataUrl }))
  }, [])

  const removerFoto = useCallback((slot: FotoSlot) => {
    setFotos((f) => ({ ...f, [slot]: null }))
  }, [])

  /** `generateProtocol` (2114-2127): gera, guarda o protocolo e vai ao passo 3. */
  const gerarProtocolo = useCallback(async () => {
    const res = await run(() => createProtocol(tipoMoeda, ano, quantidade))
    // Só avança se o servidor confirmou. Recusa (dados inválidos, sessão caída)
    // mantém o usuário no passo 2 com o toast explicando.
    if (res.ok && res.data) setWizard({ passo: 3, protocolo: res.data.protocolo })
  }, [run, tipoMoeda, ano, quantidade])

  /**
   * `markPostado` (2153-2163). Note que NÃO troca de passo: o usuário fica no 3
   * vendo o rastreio recém-gerado.
   */
  const marcarPostado = useCallback(async () => {
    // Cópia local antes do teste: é ela que entra no fecho passado a run(), e
    // assim o tipo já sai estreitado para string, sem asserção.
    const protocolo = wizard.protocolo
    if (!protocolo) return
    await run(() => markPosted(protocolo))
  }, [run, wizard.protocolo])

  /** `advanceAnalysis` (2202-2230). Sem toast, como no original. */
  const avancarEtapa = useCallback(async () => {
    const protocolo = wizard.protocolo
    if (!protocolo) return
    await run(() => advanceAnalysis(protocolo))
  }, [run, wizard.protocolo])

  /**
   * "Novo envio" — o `go('send')` da linha 2196. Zera o formulário e refaz a
   * derivação: o envio recém-concluído já não conta como pendente, mas se
   * houver outro em aberto a tela abre nele, que é o que o original fazia.
   */
  const novoEnvio = useCallback(() => {
    setTipoMoeda(COIN_TYPES[0].key)
    setAno(COIN_TYPES[0].anoPadrao)
    setQtdTexto('1')
    setFotos(FOTOS_VAZIAS)
    setConfirmOk(false)
    setWizard(retomada(state, session))
  }, [state, session])

  /* ---------- envio em foco (passos 3 e 4) ---------- */
  const envio: Envio | null =
    state.envios.find((e) => e.protocolo === wizard.protocolo) ?? null

  const temFotos = Boolean(fotos.frente) && Boolean(fotos.verso)
  const podeContinuar = quantidade >= 1 && temFotos

  return (
    <>
      <WizardSteps step={wizard.passo} />

      {/* ============================ PASSO 1 ============================ */}
      {wizard.passo === 1 && (
        <div className="cols-rev">
          <div className="panel">
            <h3>
              <svg viewBox="0 0 24 24">
                <ellipse cx="12" cy="6.5" rx="7" ry="3" />
                <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
              </svg>
              Dados do envio
            </h3>

            <div className="field-lbl">Tipo de moeda</div>
            <select
              className="tinput"
              value={tipoMoeda}
              onChange={(e) => {
                // Trocar o tipo reposiciona o ano no padrão do catálogo — é o
                // que a linha 2073 fazia antes de redesenhar.
                setTipoMoeda(e.target.value)
                setAno(coinTypeInfo(e.target.value).anoPadrao)
              }}
            >
              {COIN_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.key}
                </option>
              ))}
            </select>

            <div className="field-lbl">Ano</div>
            <select
              className="tinput"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value, 10))}
            >
              {ANOS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <div className="field-lbl">Quantidade</div>
            <input
              type="number"
              min={1}
              className="tinput"
              value={qtdTexto}
              onChange={(e) => setQtdTexto(e.target.value)}
            />

            <div className="field-lbl">Fotos da moeda</div>
            <div className="photo-row">
              <PhotoSlot
                slot="frente"
                label="Frente"
                data={fotos.frente}
                onSelect={escolherFoto}
                onRemove={removerFoto}
              />
              <PhotoSlot
                slot="verso"
                label="Verso"
                data={fotos.verso}
                onSelect={escolherFoto}
                onRemove={removerFoto}
              />
            </div>

            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Envie fotos nítidas da frente e do verso da moeda. Imagens claras ajudam na
              avaliação preliminar.
            </div>

            <div className="warn-box">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l9 16H3z" />
                <path d="M12 10v4M12 17v.5" />
              </svg>
              Envie a moeda em seu lacre original, ou em recipiente/plástico/caixa segura, para
              preservar sua conservação até a validação da nossa equipe.
            </div>

            <button
              type="button"
              className="btn btn-gold"
              disabled={!podeContinuar}
              onClick={() => setWizard((w) => ({ ...w, passo: 2 }))}
            >
              Continuar
            </button>
          </div>

          {/* A coluna direita do .cols-rev existe como <div> avulsa também no
              original — é ela que o responsive.css empilha abaixo no celular. */}
          <div>
            <div className="panel">
              <h3>
                <svg viewBox="0 0 24 24">
                  <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                </svg>
                Instruções de segurança
              </h3>
              <div className="how-row">
                <div className="hi">
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="7" width="16" height="13" rx="2" />
                    <path d="M8 7V4h8v3" />
                  </svg>
                </div>
                Embale com proteção — use plástico bolha ou material acolchoado.
              </div>
              <div className="how-row">
                <div className="hi">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 7l9-4 9 4-9 4z" />
                    <path d="M3 7v10l9 4 9-4V7" />
                  </svg>
                </div>
                Use envio rastreável, com código de rastreamento e seguro.
              </div>
              <div className="how-row">
                <div className="hi">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                Aguarde a validação da custódia — acompanhe o status por aqui.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ PASSO 2 ============================ */}
      {wizard.passo === 2 && (
        <div className="panel" style={{ maxWidth: 640, margin: '0 auto' }}>
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M6 3h9l4 4v14H6z" />
              <path d="M9 11h7M9 15h7" />
            </svg>
            Confirme os dados antes de gerar o protocolo
          </h3>

          <div className="summary-box">
            <div className="sr">
              <span className="k">Tipo de moeda</span>
              <span className="v">{tipoMoeda}</span>
            </div>
            <div className="sr">
              <span className="k">Ano</span>
              <span className="v">{ano}</span>
            </div>
            <div className="sr">
              <span className="k">Quantidade</span>
              <span className="v">{quantidade}</span>
            </div>
            {/* Texto fixo: chegar ao passo 2 já exige as duas fotos. */}
            <div className="sr">
              <span className="k">Fotos anexadas</span>
              <span className="v">Frente e verso ✓</span>
            </div>
          </div>

          {/* Caixa de confirmação. role/tabIndex/onKeyDown são acréscimo deste
              port — o original era uma <div> com onclick, invisível para teclado
              e leitor de tela. Não muda um pixel nem o comportamento do mouse. */}
          <div
            className={confirmOk ? 'confirm-box on' : 'confirm-box'}
            role="checkbox"
            aria-checked={confirmOk}
            tabIndex={0}
            onClick={() => setConfirmOk((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setConfirmOk((v) => !v)
              }
            }}
          >
            <span className="cb">{confirmOk ? '✓' : ''}</span>
            <span>
              Confirmo que os dados acima estão corretos e que vou enviar exatamente estas moedas
              para custódia. Estou ciente de que informações incorretas podem atrasar a análise.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => setWizard((w) => ({ ...w, passo: 1 }))}
            >
              Voltar
            </button>
            <button
              type="button"
              className="btn btn-gold"
              style={{ flex: 1 }}
              disabled={!confirmOk}
              onClick={() => void gerarProtocolo()}
            >
              Gerar protocolo
            </button>
          </div>
        </div>
      )}

      {/* ============================ PASSO 3 ============================ */}
      {wizard.passo === 3 &&
        (!envio ? (
          <div className="empty">Protocolo não encontrado.</div>
        ) : (
          <div className="panel" style={{ maxWidth: 640, margin: '0 auto' }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
              Enviar pelos Correios
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-muted)',
                marginBottom: '14px',
              }}
            >
              Protocolo <b style={{ color: 'var(--gold)' }}>{envio.protocolo}</b> gerado. Embale a
              moeda com segurança e poste no endereço abaixo.
            </p>

            {/* Endereço fictício — ver a nota logo abaixo, que é do original. */}
            <div className="mailbox-card">
              <div className="mb-row">
                <span className="k">Destinatário</span>
                <span className="v">Áurea Custódia — Central de Recebimento</span>
              </div>
              <div className="mb-row">
                <span className="k">Caixa Postal</span>
                <span className="v">15.230</span>
              </div>
              <div className="mb-row">
                <span className="k">CEP</span>
                <span className="v">01000-970 — São Paulo/SP</span>
              </div>
              <div className="mb-row">
                <span className="k">Referência</span>
                <span className="v">{envio.protocolo}</span>
              </div>
            </div>

            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Endereço simulado para fins de teste. Prefira sempre serviços com código de
              rastreamento e seguro.
            </div>

            {/* <a> externo, não next/link: sai da aplicação. */}
            <a
              href="https://www.correios.com.br"
              target="_blank"
              rel="noopener"
              className="btn btn-outline"
              style={{ width: '100%', marginTop: 14, textDecoration: 'none' }}
            >
              Abrir postagem online dos Correios
            </a>

            {envio.dataPostagem ? (
              <>
                <div className="summary-box" style={{ marginTop: 16 }}>
                  <div className="sr">
                    <span className="k">Código de rastreio</span>
                    <span className="v">{envio.codigoRastreio}</span>
                  </div>
                  <div className="sr">
                    <span className="k">Data de postagem</span>
                    <span className="v">{fdate(envio.dataPostagem)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ width: '100%', marginTop: 10 }}
                  onClick={() => setWizard((w) => ({ ...w, passo: 4 }))}
                >
                  Continuar para acompanhamento
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-gold"
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => void marcarPostado()}
              >
                Marcar como postado (simulado)
              </button>
            )}
          </div>
        ))}

      {/* ============================ PASSO 4 ============================ */}
      {wizard.passo === 4 &&
        (!envio ? (
          <div className="empty">Protocolo não encontrado.</div>
        ) : (
          <div className="panel" style={{ maxWidth: 640, margin: '0 auto' }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
              </svg>
              Acompanhamento — {envio.protocolo}
            </h3>

            <Timeline envio={envio} />

            {envio.etapaAtual === 'Recibo emitido' ? (
              <>
                <div className="summary-box" style={{ marginTop: 18 }}>
                  <div className="sr">
                    <span className="k">Moeda(s) gerada(s)</span>
                    <span className="v">{envio.codigosAtivosGerados.join(', ')}</span>
                  </div>
                  <div className="sr">
                    <span className="k">Taxa de custódia anual (nova faixa)</span>
                    {/* A cobrança é a do usuário, recalculada pelo acervo inteiro
                        no momento da emissão — não é a taxa deste envio. */}
                    <span className="v">
                      {state.custodyCharges[session]
                        ? brl(state.custodyCharges[session].valorCobrado)
                        : '—'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => router.push('/recibos')}
                  >
                    Ver meus recibos NFT
                  </button>
                  <button
                    type="button"
                    className="btn btn-gold"
                    style={{ flex: 1 }}
                    onClick={novoEnvio}
                  >
                    Novo envio
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ width: '100%', marginTop: 18 }}
                  onClick={() => void avancarEtapa()}
                >
                  Simular avanço de etapa (ambiente de teste)
                </button>
                <div className="note" style={{ marginTop: 10 }}>
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16.5v.5" />
                  </svg>
                  Em produção, cada etapa avança automaticamente conforme a equipe de custódia
                  confirma o recebimento e a análise física.
                </div>
              </>
            )}
          </div>
        ))}
    </>
  )
}
