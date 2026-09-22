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
 * A FOTO FICA NA MEMÓRIA DA ABA. Nada de imagem é enviado ao servidor — ver o
 * cabeçalho de components/custody/PhotoSlot.tsx. Desde 14/09/2026 é uma foto só,
 * do item, sem frente e verso obrigatórios.
 */

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { COIN_TYPES, coinTypeInfo, tiposAtivos } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { custodiaDoEnvio } from '@/domain/custodia-texto'
import { brl } from '@/domain/money'
import { valorDoPlano } from '@/domain/plano-custodia'
import type { AppState, Cents, Envio, UserEmail } from '@/domain/types'
import { temCadastroCompleto } from '@/domain/cadastro'
import { AvisoDebitoCustodia } from '@/components/custody/AvisoDebitoCustodia'
import { useApp } from '@/components/providers/AppProvider'
import { ModalCadastro } from '@/components/account/ModalCadastro'
import { useModal } from '@/components/ui/Modal'
import { PhotoSlot } from '@/components/custody/PhotoSlot'
import { Timeline } from '@/components/custody/Timeline'
import { WizardSteps } from '@/components/custody/WizardSteps'
import { PainelPagamento } from '@/components/pagamento/PainelPagamento'
import { consultarCepEnvio, cotarFreteEnvio, createProtocol, markPosted } from '@/server/actions/custody'
import { contratarPlanoCustodia, iniciarCartaoFatura, iniciarPixFatura, pagarFaturaComSaldo } from '@/server/actions/plano-custodia'
import type { ModalidadePlanoCustodia } from '@/domain/types'
import type { ModalidadeEnvio } from '@/lib/shipping'
import { normalizarRastreio, RASTREIO_INVALIDO, rastreioValido } from '@/domain/rastreio'
// Direto de `endereco-central`, nunca do barril `@/lib/shipping`: o barril arrasta
// `correios.ts`, que é `server-only` e derrubaria o build deste Client Component.
import { ENDERECO_CENTRAL_AUREA, RAZAO_SOCIAL_POSTAL } from '@/lib/shipping/endereco-central'
import { isEnvioDesconsiderado, prazoPostagemEnvio } from '@/domain/envios'
import { HistoricoEnvios } from '@/components/custody/HistoricoEnvios'

/** Os cinco passos da tela. */
type Passo = 1 | 2 | 3 | 4 | 5

/** O que `/api/rastreios` devolve por protocolo. */
interface RastreioNaTela {
  statusAtual: string
  etapaDescricao: string
  atualizadoEm: number
}

/**
 * O último estado do objeto nos Correios, lido do BANCO.
 *
 * A tela nunca chama a API dos Correios: quem consulta é o job agendado
 * (`/api/cron/shipping`), que grava em `aurea.rastreios`. Consultar por visita
 * geraria custo, esbarraria no limite de requisições e deixaria a página lenta
 * — e o estado de um objeto postal muda algumas vezes por dia, não a cada F5.
 *
 * Sem banco configurado a consulta volta vazia e o bloco explica isso, em vez
 * de sumir sem motivo aparente.
 */
function RastreioCorreios({ protocolo }: { protocolo: string }): ReactNode {
  const [rastreio, setRastreio] = useState<RastreioNaTela | null>(null)
  const [correiosConfigurado, setCorreiosConfigurado] = useState<boolean>(true)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    void (async () => {
      try {
        const res = await fetch('/api/rastreios')
        if (!res.ok) return
        const dados = (await res.json()) as {
          rastreios: Record<string, RastreioNaTela>
          correiosConfigurado?: boolean
        }
        if (ativo) {
          setRastreio(dados.rastreios[protocolo] ?? null)
          if (dados.correiosConfigurado !== undefined) {
            setCorreiosConfigurado(dados.correiosConfigurado)
          }
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    // Cancelamento: sair da tela antes da resposta não pode virar setState em
    // componente desmontado.
    return () => {
      ativo = false
    }
  }, [protocolo])

  if (carregando) return null

  if (!correiosConfigurado || rastreio?.statusAtual === 'indisponivel') {
    return (
      <div className="note" style={{ marginTop: 14 }}>
        <b>Correios:</b> não foi possível consultar os Correios agora. A consulta é feita por rotina
        agendada quando a integração postal estiver disponível.
      </div>
    )
  }

  if (rastreio?.statusAtual === 'nao_encontrado') {
    return (
      <div className="note" style={{ marginTop: 14 }}>
        <b>Correios:</b> o objeto ainda não consta na base de dados dos Correios. Pode levar algumas
        horas após a postagem para a agência registrar o pacote.
      </div>
    )
  }

  return (
    <div className="note" style={{ marginTop: 14 }}>
      {rastreio ? (
        <>
          <b>Correios:</b> {rastreio.etapaDescricao || rastreio.statusAtual}. Última consulta em{' '}
          {fdate(rastreio.atualizadoEm)}.
        </>
      ) : (
        <>
          <b>Correios:</b> rastreio ainda não consultado. A atualização é feita por rotina
          agendada, uma vez por dia — a tela nunca consulta os Correios sozinha.
        </>
      )}
    </div>
  )
}

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
/**
 * Um cartão de plano de custódia no passo 3.
 *
 * Nasceu quando havia dois planos — anual e 24 meses — e manter dois blocos de
 * JSX gêmeos foi o que deixou o antigo cartão mensal com selo e o anual sem, na
 * mesma tela. O plano de 24 meses saiu em 20/09/2026 e o mensal voltou em
 * 21/09/2026: são dois cartões de novo, e é o componente que garante que os
 * dois digam as coisas no mesmo lugar.
 */
function CartaoDePlano({
  titulo,
  selecionado,
  aoEscolher,
  total,
  periodo,
  porMoeda,
  parcela,
  selos,
  vantagens,
}: {
  titulo: string
  selecionado: boolean
  aoEscolher: () => void
  total: Cents
  /** O que vem depois do preço: 'pelos 12 meses'. */
  periodo: string
  /** A linha abaixo do preço: quanto sai por moeda por mês. */
  porMoeda: string
  /** A linha do parcelamento no cartão. */
  parcela: string
  selos: string[]
  vantagens: string[]
}): ReactNode {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selecionado}
      className="plan-card"
      onClick={aoEscolher}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          aoEscolher()
        }
      }}
      style={{
        padding: 16,
        borderRadius: 8,
        border: selecionado ? '2px solid var(--gold)' : '1px solid var(--line-soft)',
        background: selecionado ? 'rgba(212, 175, 55, 0.08)' : 'var(--input-bg)',
        cursor: 'pointer',
        position: 'relative',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        {selos.length > 0 && (
          <div style={{ position: 'absolute', top: -10, right: 12, display: 'flex', gap: 6 }}>
            {selos.map((selo, i) => (
              <span
                key={selo}
                style={{
                  background: i === 0 ? 'var(--gold)' : '#1a7f37',
                  color: i === 0 ? '#000' : '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  textTransform: i === 0 ? 'uppercase' : 'none',
                }}
              >
                {selo}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>{titulo}</span>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: 'var(--gold)',
            }}
          >
            {selecionado ? '●' : ''}
          </span>
        </div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)' }}>
          {brl(total)}
          <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}> {periodo}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>{porMoeda}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>{parcela}</div>
      </div>

      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.4 }}>
        {vantagens.map((v) => (
          <span key={v}>
            {'✓'} {v}
            <br />
          </span>
        ))}
      </div>
    </div>
  )
}

const ANOS: number[] = (() => {
  const out: number[] = []
  for (let y = 2016; y >= 1980; y--) out.push(y)
  return out
})()

/**
 * A retomada do wizard de envio com 5 passos:
 * - Se não há envio pendente -> Passo 1 (Dados do envio).
 * - Se 'Protocolo gerado':
 *   - Se ainda não tem plano de custódia contratado -> Passo 3 (Plano de custódia).
 *   - Se já tem plano contratado (pago ou pagar depois) -> Passo 4 (Postagem Correios).
 * - Qualquer etapa posterior ('Objeto postado' etc.) -> Passo 5 (Acompanhamento / Análise).
 */
function retomada(state: AppState, session: UserEmail): EstadoWizard {
  const pendente = state.envios
    .filter((e) => e.userEmail === session && e.etapaAtual !== 'Recibo emitido' && !isEnvioDesconsiderado(e))
    .sort((a, b) => b.createdAt - a.createdAt)[0]

  if (!pendente) return { passo: 1, protocolo: null }

  if (pendente.etapaAtual === 'Protocolo gerado') {
    const temPlano = (state.planosCustodia || []).some((p) => p.protocoloEnvio === pendente.protocolo)
    return {
      passo: temPlano ? 4 : 3,
      protocolo: pendente.protocolo,
    }
  }

  return {
    passo: 5,
    protocolo: pendente.protocolo,
  }
}

export default function EnviosPage(): ReactNode {
  const { state, session, me, run, taxas, catalogo } = useApp()
  // Catálogo e taxas vigentes (C3): só tipo ativo aceita envio novo, e o preço da custódia é o da Tabela.
  const tiposDeEnvio = tiposAtivos(catalogo)
  const primeiroTipoEnvio = tiposDeEnvio[0] ?? COIN_TYPES[0]
  const modal = useModal()
  const router = useRouter()

  // Inicializador preguiçoso: a derivação roda uma vez, no primeiro render (que
  // acontece no servidor e no cliente com o MESMO state, então hidrata limpo).
  const [wizard, setWizard] = useState<EstadoWizard>(() => retomada(state, session))

  /* ---------- formulário do passo 1 (o `sendForm` da linha 898) ---------- */
  const [tipoMoeda, setTipoMoeda] = useState<string>(primeiroTipoEnvio.key)
  const [ano, setAno] = useState<number>(primeiroTipoEnvio.anoPadrao)
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
  const [foto, setFoto] = useState<string | null>(null)
  const [confirmOk, setConfirmOk] = useState<boolean>(false)
  const [modalidade, setModalidade] = useState<ModalidadeEnvio>('SEDEX')
  const [rastreioDigitado, setRastreioDigitado] = useState('')
  const [erroRastreio, setErroRastreio] = useState('')
  const [cepOrigem, setCepOrigem] = useState<string>('')
  const [enderecoDescricao, setEnderecoDescricao] = useState<string | null>(null)
  const [cotacaoFrete, setCotacaoFrete] = useState<{ valorTotal: number; prazo: number } | null>(null)
  const [buscandoCep, setBuscandoCep] = useState<boolean>(false)
  const [todosRastreios, setTodosRastreios] = useState<Record<string, RastreioNaTela>>({})

  // Carrega o retrato de rastreio de todos os envios do cliente
  useEffect(() => {
    let ativo = true
    void (async () => {
      try {
        const res = await fetch('/api/rastreios')
        if (!res.ok) return
        const dados = (await res.json()) as { rastreios: Record<string, RastreioNaTela> }
        if (ativo && dados.rastreios) {
          setTodosRastreios(dados.rastreios)
        }
      } catch {
        /* silencioso */
      }
    })()
    return () => {
      ativo = false
    }
  }, [wizard.passo, wizard.protocolo])

  const handleContinuarEnvio = useCallback(
    (protocoloAlvo: string) => {
      const eAlvo = state.envios.find((e) => e.protocolo === protocoloAlvo)
      if (!eAlvo) return
      if (eAlvo.etapaAtual === 'Protocolo gerado') {
        const temPlano = (state.planosCustodia || []).some((p) => p.protocoloEnvio === protocoloAlvo)
        setWizard({ passo: temPlano ? 4 : 3, protocolo: protocoloAlvo })
      } else {
        setWizard({ passo: 5, protocolo: protocoloAlvo })
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [state.envios, state.planosCustodia],
  )

  /** `Math.max(1, parseInt(...)||1)` da linha 2077. */
  const quantidade = Math.max(1, parseInt(qtdTexto, 10) || 1)

  const handleBuscarCep = useCallback(async () => {
    const cepLimpo = cepOrigem.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await consultarCepEnvio(cepLimpo)
      if (res.ok && res.data) {
        setEnderecoDescricao(`${res.data.logradouro}, ${res.data.bairro} — ${res.data.cidade}/${res.data.uf}`)
        const cot = await cotarFreteEnvio(cepLimpo, modalidade, quantidade * 15000)
        if (cot.ok && cot.data) {
          setCotacaoFrete({
            valorTotal: cot.data.valorTotalCents,
            prazo: cot.data.prazoDiasUteis,
          })
        }
      } else {
        setEnderecoDescricao('CEP não encontrado.')
      }
    } finally {
      setBuscandoCep(false)
    }
  }, [cepOrigem, modalidade, quantidade])

  /* ---------- plano de custódia (passo 3) ---------- */
  const [modalidadePlano, setModalidadePlano] = useState<ModalidadePlanoCustodia>('mensal')
  const [faturaId, setFaturaId] = useState<string | null>(null)

  // Quando o usuário entra no passo 3 ou troca a modalidade, garante que o plano/fatura está inicializado
  useEffect(() => {
    if (wizard.passo === 3 && wizard.protocolo) {
      let ativo = true
      void (async () => {
        const res = await contratarPlanoCustodia(wizard.protocolo!, modalidadePlano)
        if (ativo && res.ok && res.data) {
          setFaturaId(res.data.faturaId)
        }
      })()
      return () => {
        ativo = false
      }
    }
  }, [wizard.passo, wizard.protocolo, modalidadePlano])

  /* ---------- ações ---------- */

  const escolherFoto = useCallback((dataUrl: string) => setFoto(dataUrl), [])

  const removerFoto = useCallback(() => setFoto(null), [])

  /** `generateProtocol` (2114-2127): gera, guarda o protocolo e vai ao passo 3 (escolha de plano). */
  const gerarProtocolo = useCallback(async () => {
    const res = await run(() => createProtocol(tipoMoeda, ano, quantidade, modalidade))
    // Só avança se o servidor confirmou. Recusa (dados inválidos, sessão caída)
    // mantém o usuário no passo 2 com o toast explicando.
    if (res.ok && res.data) setWizard({ passo: 3, protocolo: res.data.protocolo })
  }, [run, tipoMoeda, ano, quantidade, modalidade])

  /** Avança para o passo 4 sem pagar agora (deixa fatura pendente). */
  const handlePagarDepois = useCallback(async () => {
    if (!wizard.protocolo) return
    const res = await run(() => contratarPlanoCustodia(wizard.protocolo!, modalidadePlano))
    if (res.ok) {
      setWizard({ passo: 4, protocolo: wizard.protocolo })
    }
  }, [wizard.protocolo, modalidadePlano, run])

  /**
   * `markPostado` (2153-2163). Note que NÃO troca de passo: o usuário fica no 3
   * vendo o rastreio recém-gerado.
   */
  const marcarPostado = useCallback(async () => {
    // Cópia local antes do teste: é ela que entra no fecho passado a run(), e
    // assim o tipo já sai estreitado para string, sem asserção.
    const protocolo = wizard.protocolo
    if (!protocolo) return

    // O código vem do comprovante dos Correios, digitado pelo cliente. Até
    // 21/09/2026 o servidor inventava um; ver a nota em src/domain/rastreio.ts.
    const codigo = normalizarRastreio(rastreioDigitado)
    if (!rastreioValido(codigo)) {
      setErroRastreio(RASTREIO_INVALIDO)
      return
    }
    setErroRastreio('')
    await run(() => markPosted(protocolo, codigo))
  }, [run, wizard.protocolo, rastreioDigitado])

  /**
   * "Novo envio" — o `go('send')` da linha 2196. Zera o formulário e refaz a
   * derivação: o envio recém-concluído já não conta como pendente, mas se
   * houver outro em aberto a tela abre nele, que é o que o original fazia.
   */
  const novoEnvio = useCallback(() => {
    setTipoMoeda(primeiroTipoEnvio.key)
    setAno(primeiroTipoEnvio.anoPadrao)
    setQtdTexto('1')
    setFoto(null)
    setConfirmOk(false)
    setWizard(retomada(state, session))
  }, [state, session, primeiroTipoEnvio])

  /* ---------- envio em foco (passos 3 e 4) ---------- */
  const envio: Envio | null =
    state.envios.find((e) => e.protocolo === wizard.protocolo) ?? null

  const podeContinuar = quantidade >= 1 && Boolean(foto)

  /**
   * Gatilho de cadastro do envio (D-7, 11/09/2026).
   *
   * Enviar moeda é uma das três atividades que exigem cadastro formal, junto
   * com depositar e comprar. As outras duas já abriam a modal; esta era a que
   * faltava. A modal REABRE a cada tentativa enquanto o cadastro não fechar —
   * é proposital, para o cliente não ter de procurar onde se cadastra.
   */
  function continuarParaProtocolo(): void {
    if (!temCadastroCompleto(me)) {
      modal.open(
        <ModalCadastro
          motivo="envio"
          onSuccess={() => setWizard((w) => ({ ...w, passo: 2 }))}
        />,
      )
      return
    }
    setWizard((w) => ({ ...w, passo: 2 }))
  }

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
                setAno(coinTypeInfo(e.target.value, catalogo).anoPadrao)
              }}
            >
              {tiposDeEnvio.map((t) => (
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

            <div className="field-lbl">Modalidade dos Correios</div>
            <select
              className="tinput"
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value as ModalidadeEnvio)}
            >
              <option value="SEDEX">SEDEX com seguro (Mais rápido — 1 a 2 dias úteis)</option>
              <option value="PAC">PAC com seguro (Econômico — 4 a 6 dias úteis)</option>
            </select>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2, marginBottom: 12 }}>
              🔒 Carta comum não é permitida por regimento postal para envio de valores/moedas.
            </div>

            <div className="field-lbl">CEP de Origem (Remetente)</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="00000-000"
                maxLength={9}
                className="tinput"
                style={{ flex: 1 }}
                value={cepOrigem}
                onChange={(e) => setCepOrigem(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline"
                disabled={buscandoCep || cepOrigem.replace(/\D/g, '').length !== 8}
                onClick={() => void handleBuscarCep()}
              >
                {buscandoCep ? 'Buscando...' : 'Buscar CEP'}
              </button>
            </div>
            {enderecoDescricao && (
              <div className="note" style={{ marginTop: -4, marginBottom: 12 }}>
                📍 <b>Endereço:</b> {enderecoDescricao}
                {cotacaoFrete && (
                  <div style={{ marginTop: 4 }}>
                    📦 <b>Estimativa Correios:</b> {brl(cotacaoFrete.valorTotal)} (Prazo: {cotacaoFrete.prazo} dias úteis)
                  </div>
                )}
              </div>
            )}

            <div className="field-lbl">Foto do item</div>
            <div className="photo-row single">
              <PhotoSlot data={foto} onSelect={escolherFoto} onRemove={removerFoto} />
            </div>

            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Envie uma foto nítida do item. Imagens claras ajudam na avaliação preliminar.
            </div>

            <div className="warn-box">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l9 16H3z" />
                <path d="M12 10v4M12 17v.5" />
              </svg>
              Envie a moeda em envelope lacrado, para preservar sua conservação até a validação
              da nossa equipe.
            </div>

            <button
              type="button"
              className="btn btn-gold"
              disabled={!podeContinuar}
              onClick={continuarParaProtocolo}
            >
              Continuar
            </button>
          </div>

          {/* A coluna direita do .cols-rev existe como <div> avulsa também no
              original — é ela que o responsive.css empilha abaixo no celular. */}
          <div>
            {/* Antes das instruções: quem chega aqui para enviar outra moeda
                precisa ver primeiro que a custódia da anterior está em aberto. */}
            <AvisoDebitoCustodia estilo={{ marginTop: 0, marginBottom: 14 }} />

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
            <div className="sr">
              <span className="k">Modalidade Correios</span>
              <span className="v">{modalidade} (com seguro)</span>
            </div>
            {enderecoDescricao && (
              <div className="sr">
                <span className="k">Origem do Remetente</span>
                <span className="v">{enderecoDescricao}</span>
              </div>
            )}
            {/* Texto fixo: chegar ao passo 2 já exige a foto. */}
            <div className="sr">
              <span className="k">Foto anexada</span>
              <span className="v">Foto do item ✓</span>
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
          <div className="panel" style={{ maxWidth: 680, margin: '0 auto' }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Plano de custódia
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: 18 }}>
              Protocolo <b style={{ color: 'var(--gold)' }}>{envio.protocolo}</b> gerado para {envio.quantidade} moeda(s).
              A custódia no Real Olímpico é de {brl(taxas.custodiaMensalPorMoeda)} por moeda / mês.
            </p>

            {(() => {
              const prazo = prazoPostagemEnvio(envio)
              if (!envio.dataPostagem && prazo.mensagemAlerta && !prazo.expirado) {
                return (
                  <div
                    className="warn-box"
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ flexShrink: 0, width: 20, height: 20 }}>
                      <path d="M12 8v5M12 16.5v.5" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    <div>
                      <b>Prazo de postagem:</b> {prazo.mensagemAlerta}
                    </div>
                  </div>
                )
              }
              return null
            })()}

            <div style={{ maxWidth: 380, margin: '0 auto 20px' }}>
              <CartaoDePlano
                titulo="Plano Mensal"
                selecionado={true}
                aoEscolher={() => setModalidadePlano('mensal')}
                total={envio.quantidade * taxas.custodiaMensalPorMoeda}
                periodo="por mês"
                porMoeda={`${brl(taxas.custodiaMensalPorMoeda)} por moeda / mês`}
                parcela="Cobrança mensal enquanto a moeda estiver guardada"
                selos={['Sem fidelidade']}
                vantagens={[
                  'Sem fidelidade ou carência',
                  'Cancela quando quiser, retirando a moeda',
                  'No cartão: cobrança recorrente mensal automática',
                  'No saldo ou Pix: renovação mensal',
                ]}
              />
            </div>

            <div className="note" style={{ marginBottom: 16 }}>
              🛡️ <b>Garantia Real Olímpico:</b> Caso alguma moeda seja recusada na análise física, o valor da custódia pago correspondente é <b>estornado integralmente</b> para o seu saldo.
            </div>

            {/* Painel de Pagamento Inline */}
            <div style={{ marginTop: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 10 }}>
                Pagar custódia agora
              </div>
              {faturaId ? (
                <PainelPagamento
                  valorCents={(state.faturasCustodia ?? []).find((f) => f.id === faturaId)?.valorCents ?? valorDoPlano(modalidadePlano, envio.quantidade, { ...taxas }).total}
                  parcelasMax={valorDoPlano(modalidadePlano, envio.quantidade, { ...taxas }).parcelasMax}
                  saldoDisponivel={me?.balance ?? 0}
                  pagarComSaldo={async () => {
                    const res = await pagarFaturaComSaldo(faturaId)
                    if (!res.ok) throw new Error(res.error)
                  }}
                  iniciarPix={async () => {
                    const res = await iniciarPixFatura(faturaId)
                    return res.ok && res.data ? res.data : null
                  }}
                  iniciarCartao={async () => {
                    const res = await iniciarCartaoFatura(faturaId)
                    return res.ok && res.data ? res.data : null
                  }}
                  aoConcluir={() => {
                    setWizard({ passo: 4, protocolo: envio.protocolo })
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  Carregando opções de pagamento...
                </div>
              )}
            </div>

            {/* Ação secundária: Pagar depois */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line-soft)', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', minHeight: 44 }}
                onClick={() => void handlePagarDepois()}
              >
                Pagar depois (avançar para postagem nos Correios) →
              </button>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 8 }}>
                Você pode enviar a moeda agora e quitar a fatura a qualquer momento em <b>Minha conta › Faturas</b>.
              </div>
            </div>
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

            {/*
              Até 20/09/2026 este bloco trazia "Avenida Paulista, 1500 — São Paulo/SP"
              digitado à mão, herdado do monolito. A etiqueta em PDF já usava a caixa
              postal verdadeira, então quem imprimia acertava e quem lia a tela postava
              a moeda para um endereço que não existe. Agora os dois leem
              ENDERECO_CENTRAL_AUREA, a mesma constante, e não há como divergirem.

              O endereçamento é só caixa postal + CEP: os Correios exigem que a caixa
              postal seja o único endereçamento do objeto (cláusula 3.1 do Termo de
              Assinatura), e logradouro ou bairro impressos junto atrapalham a triagem.
            */}
            <div className="mailbox-card">
              <div className="mb-row">
                <span className="k">Destinatário</span>
                <span className="v">{RAZAO_SOCIAL_POSTAL}</span>
              </div>
              <div className="mb-row">
                <span className="k">Endereço</span>
                <span className="v">{ENDERECO_CENTRAL_AUREA.logradouro}</span>
              </div>
              <div className="mb-row">
                <span className="k">CEP</span>
                <span className="v">
                  {ENDERECO_CENTRAL_AUREA.cep} — {ENDERECO_CENTRAL_AUREA.cidade}/
                  {ENDERECO_CENTRAL_AUREA.uf}
                </span>
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
              Envio via PAC ou SEDEX com declaração de conteúdo obrigatória como &quot;Moeda comemorativa / colecionável&quot;.
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <a
                href={`/api/envios/etiqueta/${envio.protocolo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                🖨️ Imprimir Etiqueta Postal
              </a>
              <a
                href="https://www.correios.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Abrir Correios Online ↗
              </a>
            </div>

            {(() => {
              const prazo = prazoPostagemEnvio(envio)
              if (!envio.dataPostagem && prazo.mensagemAlerta && !prazo.expirado) {
                return (
                  <div
                    className="warn-box"
                    style={{
                      marginTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ flexShrink: 0, width: 20, height: 20 }}>
                      <path d="M12 8v5M12 16.5v.5" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    <div>
                      <b>Prazo de postagem:</b> {prazo.mensagemAlerta}
                    </div>
                  </div>
                )
              }
              return null
            })()}

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
                  onClick={() => setWizard((w) => ({ ...w, passo: 5 }))}
                >
                  Continuar para acompanhamento
                </button>
              </>
            ) : (
              <>
                <div className="field-lbl" style={{ marginTop: 16 }}>
                  Código de rastreio dos Correios
                </div>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  placeholder="AA123456789BR"
                  aria-label="Código de rastreio dos Correios"
                  value={rastreioDigitado}
                  onChange={(e) => {
                    setRastreioDigitado(e.target.value)
                    if (erroRastreio) setErroRastreio('')
                  }}
                  style={{ width: '100%', minHeight: 44 }}
                />

                {erroRastreio ? (
                  <div className="note" style={{ marginTop: 8 }}>
                    {erroRastreio}
                  </div>
                ) : (
                  <div className="note" style={{ marginTop: 8 }}>
                    Depois de postar na agência, digite aqui o código impresso no comprovante dos
                    Correios. É com ele que você e a nossa equipe acompanham o pacote até a central
                    de custódia.
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ width: '100%', marginTop: 12 }}
                  disabled={!rastreioValido(normalizarRastreio(rastreioDigitado))}
                  onClick={() => void marcarPostado()}
                >
                  Confirmar postagem
                </button>
              </>
            )}
          </div>
        ))}

      {/* ============================ PASSO 5 ============================ */}
      {wizard.passo === 5 &&
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

            <RastreioCorreios protocolo={envio.protocolo} />

            {envio.etapaAtual === 'Recibo emitido' ? (
              <>
                <div className="summary-box" style={{ marginTop: 18 }}>
                  <div className="sr">
                    <span className="k">Moeda(s) gerada(s)</span>
                    <span className="v">{envio.codigosAtivosGerados.join(', ')}</span>
                  </div>
                  {(() => {
                    const plano = (state.planosCustodia ?? []).find(
                      (p) => p.protocoloEnvio === envio.protocolo && p.status !== 'cancelado',
                    )
                    const custodia = custodiaDoEnvio(envio, plano, taxas)
                    return (
                      <div className="sr">
                        <span className="k">{custodia.rotulo}</span>
                        {/* O texto dizia "Taxa de custódia anual (nova faixa)" e
                            mostrava a cobrança única do mecanismo antigo — rótulo,
                            periodicidade e valor, os três de um modelo que a D-3
                            aposentou. Além disso, usava o campo do formulário do
                            passo 1 (que volta a '1' ao recarregar a página),
                            mostrando R$ 2,00 a quem recarregava. Agora deriva do
                            protocolo congelado e do plano contratado. */}
                        <span className="v">
                          {brl(custodia.valorCents)} / {custodia.periodo}
                        </span>
                      </div>
                    )
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => router.push('/recibos')}
                  >
                    Ver meus recibos
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
                <div className="note" style={{ marginTop: 18 }}>
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16.5v.5" />
                  </svg>
                  Cada etapa avança conforme a equipe de custódia confirma o recebimento e
                  conclui a análise física na bancada. Você acompanha por aqui.
                </div>
              </>
            )}
          </div>
        ))}

      {/* ============================ HISTÓRICO DE ENVIOS ============================ */}
      <HistoricoEnvios
        envios={state.envios.filter((e) => e.userEmail === session)}
        rastreios={todosRastreios}
        onContinuarEnvio={handleContinuarEnvio}
      />
    </>
  )
}
