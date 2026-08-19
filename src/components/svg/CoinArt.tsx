import type { ReactElement, ReactNode } from 'react'

import { coinTypeInfo } from '@/domain/constants'

/**
 * Arte das moedas em custódia (aurea-mvp-teste.html, linhas 937-946 e 1795-1817).
 *
 * O desenho é sempre o mesmo disco — anel dourado, serrilha, núcleo prateado,
 * ano embaixo e BRASIL em cima — trocando só o motivo central conforme o tipo
 * da moeda. Componente puramente apresentacional: nada de estado, nada de
 * 'use client'.
 *
 * SOBRE AS CORES: aqui elas descrevem METAL, não tema. Uma moeda é dourada no
 * claro e no escuro, então os valores do MVP viraram tokens `--coin-*` no
 * :root de styles/tokens.css, fora dos blocos de tema. Nada de literal nem de
 * fallback dentro do var(): a regra do port é que a cor só existe num arquivo.
 * O corpo da moeda usa `--gold` direto porque o token do projeto já é
 * exatamente o `#c9a24b` do original.
 */

const OURO = 'var(--gold)'
const SERRILHA = 'var(--coin-rim)'
const NUCLEO = 'var(--coin-core)'
const CLARO = 'var(--coin-light)'
const SOMBRA = 'var(--coin-shade)'
const GRAVACAO = 'var(--coin-engrave)'
const LEGENDA = 'var(--coin-legend)'

/** Motivo usado quando o tipo não está no catálogo — o mesmo do original. */
const MOTIVO_PADRAO = 'Bandeira Olímpica'

/**
 * Motivos centrais por tipo de moeda.
 *
 * Os traços são cópia literal do MVP, coordenada por coordenada: qualquer
 * ajuste "de bom gosto" muda a arte de recibos já emitidos.
 */
const MOTIVOS: Record<string, ReactNode | undefined> = {
  'Entrega da Bandeira Olímpica': (
    <path
      d="M35 34 v32 M35 34 h27 l-5 7 5 7 h-27"
      fill={CLARO}
      stroke={SOMBRA}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  ),

  /*
   * Direitos Humanos (R$ 1, 1998). Motivo NOVO — não há traçado equivalente no
   * monolito, que não conhecia esta moeda.
   *
   * O desenho evoca o anverso da moeda real: o globo com os meridianos e a
   * figura humana de braços abertos à frente dele. É uma evocação, não um
   * fac-símile — a plataforma desenha um ícone reconhecível, não reproduz a
   * arte cunhada pela Casa da Moeda.
   *
   * NENHUM anel olímpico aqui, e não por acaso: a restrição de propriedade
   * intelectual do COB vale para toda arte de moeda do projeto, inclusive a das
   * moedas que não são olímpicas.
   */
  'Direitos Humanos': (
    <>
      {/* Globo: círculo, equador e dois meridianos. */}
      <circle cx={50} cy={48} r={17} fill="none" stroke={GRAVACAO} strokeWidth={1.8} />
      <path d="M33 48 H67" fill="none" stroke={GRAVACAO} strokeWidth={1.3} />
      <ellipse cx={50} cy={48} rx={7} ry={17} fill="none" stroke={GRAVACAO} strokeWidth={1.3} />
      {/* Figura humana de braços abertos, sobreposta ao globo. */}
      <circle cx={50} cy={38} r={4} fill={GRAVACAO} />
      <path
        d="M50 42 V60 M38 50 L50 46 L62 50 M50 60 L43 68 M50 60 L57 68"
        fill="none"
        stroke={GRAVACAO}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  'Bandeira Olímpica': (
    <g fill="none" stroke={GRAVACAO} strokeWidth={2.4}>
      <circle cx={38} cy={42} r={7} />
      <circle cx={50} cy={42} r={7} />
      <circle cx={62} cy={42} r={7} />
      <circle cx={44} cy={52} r={7} />
      <circle cx={56} cy={52} r={7} />
    </g>
  ),

  Atletismo: (
    <>
      <path
        d="M40 66 L47 50 L42 42 L50 38 L56 46 L64 40 M47 50 L56 54 L60 66"
        fill="none"
        stroke={GRAVACAO}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={52} cy={32} r={4.5} fill={GRAVACAO} />
    </>
  ),

  'Vôlei': (
    <>
      <circle cx={50} cy={37} r={7.5} fill="none" stroke={GRAVACAO} strokeWidth={2} />
      <path
        d="M38 68 L46 52 L58 50 L66 60 M46 52 L44 42"
        fill="none"
        stroke={GRAVACAO}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  'Natação': (
    <>
      <path
        d="M30 46 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0"
        fill="none"
        stroke={GRAVACAO}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d="M42 60 L54 52 L66 56 M42 60 L36 68"
        fill="none"
        stroke={GRAVACAO}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  Futebol: (
    <>
      <circle cx={50} cy={50} r={17} fill="none" stroke={GRAVACAO} strokeWidth={2} />
      <path d="M50 38 L58 44 L55 53 L45 53 L42 44 Z" fill={GRAVACAO} />
      {/* Sem `fill` de propósito: o original também omite, e o preenchimento
          padrão é o que fecha os gomos do lado de fora do pentágono. */}
      <path
        d="M50 38 V33 M58 44 L64 40 M55 53 L59 60 M45 53 L41 60 M42 44 L36 40"
        stroke={GRAVACAO}
        strokeWidth={1.3}
      />
    </>
  ),

  Vela: (
    <>
      <path
        d="M50 30 V66 M50 34 L66 52 L50 56 Z"
        fill={CLARO}
        stroke={GRAVACAO}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path d="M38 66 H62" stroke={GRAVACAO} strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),

  'Rio 2016 – Estádio': (
    <>
      <ellipse cx={50} cy={52} rx={24} ry={12} fill="none" stroke={GRAVACAO} strokeWidth={2} />
      <ellipse cx={50} cy={52} rx={15} ry={7} fill="none" stroke={GRAVACAO} strokeWidth={1.3} />
      <path d="M26 52 q24 -20 48 0" fill="none" stroke={GRAVACAO} strokeWidth={1.3} />
    </>
  ),

  'Mascote Vinicius': (
    <>
      <ellipse cx={50} cy={48} rx={15} ry={17} fill={CLARO} stroke={GRAVACAO} strokeWidth={1.6} />
      <circle cx={44} cy={45} r={2.6} fill={GRAVACAO} />
      <circle cx={57} cy={45} r={2.6} fill={GRAVACAO} />
      <path
        d="M44 55 q6 5 12 0"
        fill="none"
        stroke={GRAVACAO}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        d="M50 31 q-4 -6 -8 -4 M50 31 q4 -6 8 -4"
        fill="none"
        stroke={GRAVACAO}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </>
  ),
}

interface CoinDiscProps {
  motivo: ReactNode
  /** Ano cunhado embaixo do motivo. */
  ano: number
  className: string
  rotulo: string
}

/** O disco em si: idêntico nas duas variantes, só o miolo muda. */
function CoinDisc({ motivo, ano, className, rotulo }: CoinDiscProps): ReactElement {
  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label={rotulo}>
      <circle cx={50} cy={50} r={47} fill={OURO} />
      {/* Serrilha: o tracejado é o que dá leitura de moeda cunhada. */}
      <circle
        cx={50}
        cy={50}
        r={47}
        fill="none"
        stroke={SERRILHA}
        strokeWidth={1.5}
        strokeDasharray="2.5 2.5"
      />
      <circle cx={50} cy={50} r={33} fill={NUCLEO} />
      {motivo}
      <text
        x={50}
        y={88}
        textAnchor="middle"
        fontSize={8.5}
        fill={LEGENDA}
        fontFamily="serif"
        fontWeight="bold"
      >
        {ano}
      </text>
      <text
        x={50}
        y={18}
        textAnchor="middle"
        fontSize={7.5}
        fill={LEGENDA}
        fontFamily="serif"
        letterSpacing={1}
      >
        BRASIL
      </text>
    </svg>
  )
}

export interface CoinArtProps {
  /** Chave do catálogo COIN_TYPES — `coin.tipoMoeda`. */
  type: string
  className?: string
}

/**
 * Arte por tipo de moeda. Tipo desconhecido cai na Bandeira Olímpica, e o ano
 * vem do catálogo (`anoPadrao`), não da moeda: é o ano de cunhagem do modelo.
 */
export function CoinArt({ type, className = 'coin-svg' }: CoinArtProps): ReactElement {
  const motivo = MOTIVOS[type] ?? MOTIVOS[MOTIVO_PADRAO]
  const info = coinTypeInfo(type)
  return (
    <CoinDisc motivo={motivo} ano={info.anoPadrao} className={className} rotulo={`Moeda ${type}`} />
  )
}

export interface CoinSvgProps {
  className?: string
}

/**
 * Moeda genérica do mercado e da tela de venda (linha 937 do original).
 *
 * Ali o ativo negociado é sempre o mesmo — Real Olímpico 2012 —, então o
 * desenho é fixo e não consulta o catálogo. O motivo é a entrega da bandeira,
 * com traçado próprio, ligeiramente diferente do usado no certificado.
 */
export function CoinSvg({ className = 'coin-svg' }: CoinSvgProps): ReactElement {
  return (
    <CoinDisc
      className={className}
      ano={2012}
      rotulo="Moeda Real Olímpico"
      motivo={
        <path
          d="M35 36 v30 M35 36 h26 l-4.5 6 4.5 6 h-26"
          fill={CLARO}
          stroke={SOMBRA}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      }
    />
  )
}
