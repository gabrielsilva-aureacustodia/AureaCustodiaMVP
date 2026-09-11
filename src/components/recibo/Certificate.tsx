'use client'

/**
 * 3.1 RECIBO DE CUSTÓDIA (CERTIFICADO) — port de aurea-mvp-teste.html, 1895-1948
 * (`renderNftDetail`), mais `goSellFromNft` (1949) e o gatilho do PDF (1968).
 *
 * Client Component porque três coisas aqui são vivas: a etiqueta "já está
 * anunciada", o botão "Colocar à venda" (que liga/desliga conforme a oferta
 * exista ou não) e a própria presença da moeda no inventário. O ciclo de 10s do
 * AppProvider alimenta os três — no monolito era o `render()` do startSync.
 *
 * O CERTIFICADO IGNORA O TEMA DE PROPÓSITO: fundo creme e tintas fixas nos dois
 * modos, porque é o mesmo documento que sai em PDF. Quem garante isso é o
 * styles/recibo.css; aqui não há uma cor sequer escrita à mão.
 *
 * SOBRE "CÓDIGO SIMULADO": o rótulo abaixo do QR é requisito de negócio, não
 * enfeite. Não existe blockchain por trás deste recibo e a interface não pode
 * sugerir verificação externa. O componente QrCode já o imprime dentro da
 * própria <div> — por isso ele entra direto no .cert-seal, sem invólucro.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { isNegociavel } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { medianSellPrice } from '@/domain/market'
import { brl } from '@/domain/money'
import { coinStatusDigital } from '@/domain/selectors'
import type { Retirada } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { CoinArt } from '@/components/svg/CoinArt'
import { QrCode } from '@/components/svg/QrCode'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { ModalSolicitarRetirada } from '@/components/recibo/ModalSolicitarRetirada'
import { obterRetiradaPorCoin } from '@/server/actions/custody'

/**
 * Texto exibido quando o gerador de PDF não carrega. É o mesmo da linha 1973 do
 * monolito, e o módulo @/lib/pdf/recibo-pdf já lança um Error com ele — este
 * literal só cobre o caso improvável de vir um throw que não seja Error.
 */
const FALHA_PDF =
  'Não foi possível carregar o gerador de PDF — verifique sua conexão e tente novamente.'

export interface CertificateProps {
  /** Código do ativo vindo da rota: /recibos/RO-000042. */
  coinId: string
}

export function Certificate({ coinId }: CertificateProps): ReactNode {
  const { state, me } = useApp()
  const modal = useModal()
  const toast = useToast()
  const router = useRouter()

  const [retirada, setRetirada] = useState<Retirada | null>(null)

  // A página (Server Component) já garantiu a posse antes de renderizar; esta
  // busca é sobre o estado VIVO. Ela falha quando a moeda sai do inventário com
  // a tela aberta — venda casada por outra aba, por exemplo —, e é exatamente o
  // ramo "não encontrado" do original (linha 1900).
  const coin = me.coins.find((c) => c.id === coinId)

  const extinto = coin?.recibo.status === 'Extinto'

  useEffect(() => {
    if (extinto && coin) {
      void obterRetiradaPorCoin(coin.id).then((res) => {
        if (res.ok && res.data) setRetirada(res.data)
      })
    }
  }, [coin, extinto])

  if (!coin) {
    return (
      <>
        <Link href="/recibos" className="back-link">
          ‹ Voltar para meus recibos
        </Link>
        <div className="empty">
          Este recibo não foi encontrado — a moeda pode ter sido negociada ou retirada.
        </div>
      </>
    )
  }

  // `mine` do original é sempre true aqui: a página derruba em notFound() quem
  // pede o certificado de moeda alheia. O nome do proprietário atual continua
  // impresso porque é campo do documento — e é o mesmo que vai para o PDF.
  const ownerName = me.name

  const listed = state.sellOffers.some((o) => o.coinId === coin.id)
  // Antes isto era `coin.tipoMoeda === COIN.name`, o atalho válido enquanto
  // existia um ativo negociável só. Com a Direitos Humanos no mercado, esse
  // atalho apagaria o botão "Colocar à venda" de uma moeda perfeitamente
  // negociável e ainda mostraria a nota dizendo que ela não tem mercado.
  const sellable = isNegociavel(coin.tipoMoeda)
  const statusTxt = extinto
    ? 'Moeda retirada da custódia — recibo extinto'
    : 'Moeda física recebida e custodiada'

  // Mesma regra de valor da grade 1.4 (linha 1858): mediana de 24h para o ativo
  // negociável, valor de ficha para os demais tipos.
  const med = sellable ? medianSellPrice(state, coin.tipoMoeda) : null
  const valorEstimado = med ?? coin.valorEstimado

  /**
   * Baixa o recibo em PDF. O import é dinâmico em dois níveis — este módulo
   * carrega @/lib/pdf/recibo-pdf sob demanda, e ele carrega o jsPDF — porque
   * nada disso pode entrar no bundle de quem só está olhando o certificado.
   *
   * O toast é responsabilidade de quem chama: o módulo de PDF devolve void e
   * não avisa ninguém (ver o cabeçalho dele). As duas mensagens são as do
   * original, linhas 1973 e 2025.
   */
  // Arrow function, e não `function baixarPdf()`: o TypeScript só mantém o
  // estreitamento de um const dentro de closures CRIADAS depois do retorno
  // antecipado. Uma declaração de função é içada para o topo do escopo, então
  // `coin` voltaria a ser `Coin | undefined` aqui dentro e o strict reprovaria.
  const baixarPdf = async (): Promise<void> => {
    // `coin` é const e já foi estreitado pelo retorno antecipado lá em cima, por
    // isso continua sendo Coin aqui dentro — não há guarda redundante a fazer.
    try {
      const { baixarReciboPdf } = await import('@/lib/pdf/recibo-pdf')
      await baixarReciboPdf({ coin, ownerName })
      toast('Recibo em PDF gerado com sucesso.')
    } catch (err) {
      toast(err instanceof Error ? err.message : FALHA_PDF)
    }
  }

  return (
    <>
      <Link href="/recibos" className="back-link">
        ‹ Voltar para meus recibos
      </Link>

      <div className="cert-wrap">
        <div className="cert">
          {extinto ? (
            <div className="cert-stamp-extinto" aria-label="Recibo Extinto">
              RECIBO EXTINTO
              <br />
              <span style={{ fontSize: '11px', letterSpacing: '0.08em', fontWeight: 600 }}>
                RETIRADA FÍSICA SOLICITADA
              </span>
            </div>
          ) : null}

          {/* .cert-art tem 150px e a .coin-svg lá dentro, 64px. A arte não
              preenche o quadro — é assim no monolito, e a folga é o respiro
              acima do brasão. */}
          <div className="cert-art">
            <CoinArt type={coin.tipoMoeda} />
          </div>
          <h2 className="serif">REAL OLÍMPICO</h2>
          <div className="cert-sub">Real Olímpico</div>
          <div className="cert-rule"></div>
          <div className="cert-title">Recibo de Custódia</div>
          <div className="cert-code">{coin.recibo.codigo}</div>

          {/* Os CINCO campos do documento, nesta ordem e com estes textos. É a
              mesma lista que @/lib/pdf/recibo-pdf imprime: tela e PDF precisam
              dizer a mesma coisa, senão o recibo baixado contradiz o que a
              pessoa viu. Dado novo entra no painel lateral, não aqui. */}
          <div className="cert-fields">
            <div className="cf-row">
              <span className="k">Moeda</span>
              <span className="v">
                {coin.tipoMoeda}
                {!sellable ? ' ' + coin.ano : ''}
              </span>
            </div>
            <div className="cf-row">
              <span className="k">Status</span>
              <span className="v">{statusTxt}</span>
            </div>
            <div className="cf-row">
              <span className="k">Data de emissão</span>
              {/* Congelada na emissão: não muda quando a moeda troca de dono. */}
              <span className="v">{coin.recibo.dataEmissao}</span>
            </div>
            <div className="cf-row">
              <span className="k">Proprietário atual</span>
              <span className="v">{ownerName}</span>
            </div>
            <div className="cf-row">
              <span className="k">Hash (curto)</span>
              <span className="v">{coin.recibo.hash}</span>
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
            {/* Semente = código + hash, igual ao original (linha 1932): o mesmo
                recibo desenha sempre o mesmo padrão, na tela e no PDF. */}
            <QrCode seed={coin.recibo.codigo + coin.recibo.hash} size={78} />
          </div>

          <div className="cert-foot">
            Este recibo certifica a custódia e o vínculo documental.
            <br />A moeda física permanece sob guarda da Áurea Custódia.
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: '16px' }}>
            <h3>Ações</h3>
            {/* Retirada física conectada à Server Action e modal de endereço/pagamento */}
            <button
              className="btn btn-outline"
              type="button"
              style={{ width: '100%', marginBottom: '10px' }}
              disabled={extinto || listed}
              onClick={() => modal.open(<ModalSolicitarRetirada coin={coin} />)}
            >
              {extinto ? '✓ Retirada física solicitada' : 'Solicitar retirada'}
            </button>
            {/* No monolito este botão levava a global `preselectCoinId` para a
                tela de venda; aqui a pré-seleção viaja na URL, que é o mesmo
                mecanismo com estado visível e recarregável. */}
            <button
              className="btn btn-outline"
              type="button"
              style={{ width: '100%', marginBottom: '10px' }}
              disabled={!sellable || listed || extinto}
              onClick={() => router.push(`/vender?moeda=${coin.id}`)}
            >
              Colocar à venda
            </button>
            <button
              className="btn btn-gold"
              type="button"
              style={{ width: '100%' }}
              onClick={() => void baixarPdf()}
            >
              Baixar recibo PDF
            </button>

            {/* As notas explicam o estado dos botões */}
            {extinto ? (
              <div className="note" style={{ marginTop: '10px' }}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.5" />
                </svg>
                O recibo desta moeda foi extinto para retirada física da custódia.
              </div>
            ) : null}
            {!sellable ? (
              <div className="note" style={{ marginTop: '10px' }}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.5" />
                </svg>
                Este tipo de moeda ainda não está disponível para negociação no marketplace de
                teste. Hoje são negociáveis a &quot;Entrega da Bandeira Olímpica&quot; e a
                &quot;Direitos Humanos&quot;.
              </div>
            ) : null}
            {listed ? (
              <div className="note" style={{ marginTop: '10px' }}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.5" />
                </svg>
                Esta moeda já está anunciada no mercado.
              </div>
            ) : null}
          </div>

          {/* Painel de Acompanhamento da Retirada quando extinto */}
          {extinto ? (
            <div className="panel" style={{ marginBottom: '16px' }}>
              <h3>
                <svg viewBox="0 0 24 24">
                  <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Retirada Física
              </h3>
              <div className="summary-row">
                <span className="k">Status da saída</span>
                <span className="v">
                  <span className={`badge-retirada badge-${retirada?.status ?? 'solicitada'}`}>
                    {retirada?.status ?? 'solicitada'}
                  </span>
                </span>
              </div>
              <div className="summary-row">
                <span className="k">Modalidade</span>
                <span className="v">
                  {retirada?.modalidade === 'segura' ? 'Transporte Blindado' : 'Correios (AR)'}
                </span>
              </div>
              {retirada ? (
                <div className="summary-row">
                  <span className="k">Prazo limite</span>
                  <span className="v">D+30 ({fdate(retirada.dataLimiteD30)})</span>
                </div>
              ) : null}
              {retirada?.codigoRastreio ? (
                <div className="summary-row">
                  <span className="k">Código de rastreio</span>
                  <span className="v" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {retirada.codigoRastreio}
                  </span>
                </div>
              ) : null}
              {retirada ? (
                <div className="summary-row">
                  <span className="k">Destino</span>
                  <span className="v">
                    {retirada.endereco.cidade} / {retirada.endereco.uf}
                  </span>
                </div>
              ) : null}
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                O recibo documental desta moeda foi extinto. A moeda física está em processo de expedição para o endereço confirmado.
              </div>
              <div style={{ marginTop: '10px' }}>
                <Link href="/retirada" className="back-link" style={{ margin: 0, fontSize: '12.5px' }}>
                  Ver todas as minhas retiradas ›
                </Link>
              </div>
            </div>
          ) : null}

          {/* ACRÉSCIMO A ESTE PORT (registrado em issues). O escopo desta tela
              pede código do ativo, situação física, situação digital e valor
              estimado — nada disso existe no certificado do monolito. Ficam
              FORA do documento, num painel lateral com classes já existentes,
              para que o .cert continue idêntico ao que o PDF imprime. */}
          <div className="panel" style={{ marginBottom: '16px' }}>
            <h3>Dados da moeda</h3>
            <div className="summary-row">
              <span className="k">Código da moeda</span>
              <span className="v">{coin.id}</span>
            </div>
            <div className="summary-row">
              <span className="k">Status físico</span>
              <span className="v">{coin.statusFisico}</span>
            </div>
            {/* Derivado em tempo de leitura: 'Negociando' tem precedência sobre
                'Alienado' — o que importa é haver oferta aberta agora. */}
            <div className="summary-row">
              <span className="k">Status digital</span>
              <span className="v">{coinStatusDigital(state, coin)}</span>
            </div>
            <div className="summary-row total">
              <span className="k">Valor estimado</span>
              <span className="v">{brl(valorEstimado)}</span>
            </div>
          </div>

          <div className="panel">
            <div className="note">
              Guarda institucional com validação documental. Segurança, integridade e
              confidencialidade em cada etapa do processo.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
