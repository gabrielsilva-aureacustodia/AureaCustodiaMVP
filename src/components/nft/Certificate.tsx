'use client'

/**
 * 3.1 RECIBO NFT (CERTIFICADO) — port de aurea-mvp-teste.html, linhas 1895-1948
 * (`renderNftDetail`), mais `goSellFromNft` (1949) e o gatilho do PDF (1968).
 *
 * Client Component porque três coisas aqui são vivas: a etiqueta "já está
 * anunciada", o botão "Colocar à venda" (que liga/desliga conforme a oferta
 * exista ou não) e a própria presença da moeda no inventário. O ciclo de 10s do
 * AppProvider alimenta os três — no monolito era o `render()` do startSync.
 *
 * O CERTIFICADO IGNORA O TEMA DE PROPÓSITO: fundo creme e tintas fixas nos dois
 * modos, porque é o mesmo documento que sai em PDF. Quem garante isso é o
 * styles/nft.css; aqui não há uma cor sequer escrita à mão.
 *
 * SOBRE "CÓDIGO SIMULADO": o rótulo abaixo do QR é requisito de negócio, não
 * enfeite. Não existe blockchain por trás deste recibo e a interface não pode
 * sugerir verificação externa. O componente QrCode já o imprime dentro da
 * própria <div> — por isso ele entra direto no .cert-seal, sem invólucro.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { COIN } from '@/domain/constants'
import { medianSellPrice } from '@/domain/market'
import { brl } from '@/domain/money'
import { coinStatusDigital } from '@/domain/selectors'
import { useApp } from '@/components/providers/AppProvider'
import { CoinArt } from '@/components/svg/CoinArt'
import { QrCode } from '@/components/svg/QrCode'
import { useToast } from '@/components/ui/Toast'

/**
 * Texto exibido quando o gerador de PDF não carrega. É o mesmo da linha 1973 do
 * monolito, e o módulo @/lib/pdf/nft-receipt já lança um Error com ele — este
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
  const toast = useToast()
  const router = useRouter()

  // A página (Server Component) já garantiu a posse antes de renderizar; esta
  // busca é sobre o estado VIVO. Ela falha quando a moeda sai do inventário com
  // a tela aberta — venda casada por outra aba, por exemplo —, e é exatamente o
  // ramo "não encontrado" do original (linha 1900).
  const coin = me.coins.find((c) => c.id === coinId)

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
  const sellable = coin.tipoMoeda === COIN.name
  const extinto = coin.nft.status === 'Extinto'
  const statusTxt = extinto
    ? 'Moeda retirada da custódia — recibo extinto'
    : 'Moeda física recebida e custodiada'

  // Mesma regra de valor da grade 1.4 (linha 1858): mediana de 24h para o ativo
  // negociável, valor de ficha para os demais tipos.
  const med = medianSellPrice(state)
  const valorEstimado = sellable && med ? med : coin.valorEstimado

  /**
   * Baixa o recibo em PDF. O import é dinâmico em dois níveis — este módulo
   * carrega @/lib/pdf/nft-receipt sob demanda, e ele carrega o jsPDF — porque
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
      const { downloadNftReceipt } = await import('@/lib/pdf/nft-receipt')
      await downloadNftReceipt({ coin, ownerName })
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
          {/* .cert-art tem 150px e a .coin-svg lá dentro, 64px. A arte não
              preenche o quadro — é assim no monolito, e a folga é o respiro
              acima do brasão. */}
          <div className="cert-art">
            <CoinArt type={coin.tipoMoeda} />
          </div>
          <h2 className="serif">REAL OLÍMPICO</h2>
          <div className="cert-sub">Real Olímpico</div>
          <div className="cert-rule"></div>
          <div className="cert-title">Recibo NFT de Custódia</div>
          <div className="cert-code">{coin.nft.codigo}</div>

          {/* Os CINCO campos do documento, nesta ordem e com estes textos. É a
              mesma lista que @/lib/pdf/nft-receipt imprime: tela e PDF precisam
              dizer a mesma coisa, senão o recibo baixado contradiz o que a
              pessoa viu. Dado novo entra no painel lateral, não aqui. */}
          <div className="cert-fields">
            <div className="cf-row">
              <span className="k">Ativo</span>
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
              <span className="v">{coin.nft.dataEmissao}</span>
            </div>
            <div className="cf-row">
              <span className="k">Proprietário atual</span>
              <span className="v">{ownerName}</span>
            </div>
            <div className="cf-row">
              <span className="k">Hash (curto)</span>
              <span className="v">{coin.nft.hash}</span>
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
            <QrCode seed={coin.nft.codigo + coin.nft.hash} size={78} />
          </div>

          <div className="cert-foot">
            Este recibo certifica a custódia e o vínculo documental.
            <br />A moeda física permanece sob guarda da Áurea Custódia.
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: '16px' }}>
            <h3>Ações</h3>
            {/* Retirada física é o bloco 4.3, fora do escopo do pré-MVP. O botão
                existe desabilitado no original para sinalizar o caminho. */}
            <button
              className="btn btn-outline"
              type="button"
              style={{ width: '100%', marginBottom: '10px' }}
              disabled
            >
              Solicitar retirada
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

            {/* As duas notas do original explicam POR QUE o botão acima está
                apagado. Sem elas o desabilitado vira mistério. */}
            {!sellable ? (
              <div className="note" style={{ marginTop: '10px' }}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.5" />
                </svg>
                Este tipo de moeda ainda não está disponível para negociação no marketplace de teste
                — só &quot;Entrega da Bandeira Olímpica&quot;.
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

          {/* ACRÉSCIMO A ESTE PORT (registrado em issues). O escopo desta tela
              pede código do ativo, situação física, situação digital e valor
              estimado — nada disso existe no certificado do monolito. Ficam
              FORA do documento, num painel lateral com classes já existentes,
              para que o .cert continue idêntico ao que o PDF imprime. */}
          <div className="panel" style={{ marginBottom: '16px' }}>
            <h3>Dados do ativo</h3>
            <div className="summary-row">
              <span className="k">Código do ativo</span>
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
