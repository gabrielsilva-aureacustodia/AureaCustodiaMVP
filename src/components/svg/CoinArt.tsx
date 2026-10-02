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
      <defs>
        {/* Anel externo bimetálico em ouro polido com gradiente de relevo */}
        <linearGradient id="coinGoldRing" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#fcedbe" />
          <stop offset="25%" stopColor="#c9a24b" />
          <stop offset="50%" stopColor="#e3b95c" />
          <stop offset="75%" stopColor="#8f691d" />
          <stop offset="100%" stopColor="#c9a24b" />
        </linearGradient>

        {/* Núcleo em aço inoxidável / cuproníquel acetinado */}
        <radialGradient id="coinSilverCore" cx="45%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#edf2f7" />
          <stop offset="75%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>

        {/* Chanfro da borda externa */}
        <linearGradient id="coinBevelOuter" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff3cc" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#5d4310" stopOpacity="0.7" />
        </linearGradient>

        {/* Junção bimetálica com ranhura de profundidade */}
        <linearGradient id="coinInnerBevel" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#fff3cc" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4f380c" stopOpacity="0.75" />
        </linearGradient>

        {/* Reflexo luminoso transversal */}
        <linearGradient id="coinGleam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Anel dourado externo chanfrado */}
      <circle cx={50} cy={50} r={47.5} fill="url(#coinGoldRing)" stroke="url(#coinBevelOuter)" strokeWidth={1} />

      {/* Serrilha perimetral numismática em baixo-relevo */}
      <circle
        cx={50}
        cy={50}
        r={45.5}
        fill="none"
        stroke={SERRILHA}
        strokeWidth={1.3}
        strokeDasharray="2 1.8"
        opacity="0.85"
      />

      {/* Ranhura de transição da cunhagem bimetálica */}
      <circle cx={50} cy={50} r={33.6} fill="none" stroke="url(#coinInnerBevel)" strokeWidth={0.8} />

      {/* Núcleo prateado acetinado */}
      <circle cx={50} cy={50} r={32.8} fill="url(#coinSilverCore)" />

      {/* Brilho translúcido em arco sobre o metal */}
      <path
        d="M 23 35 A 32.8 32.8 0 0 1 77 35 Q 50 48 23 35 Z"
        fill="url(#coinGleam)"
        pointerEvents="none"
      />

      {/* Motivo central gravado */}
      <g style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.22))' }}>
        {motivo}
      </g>

      {/* Ano cunhado na parte inferior */}
      <text
        x={50}
        y={88.5}
        textAnchor="middle"
        fontSize={8.5}
        fill={LEGENDA}
        fontFamily="var(--ff-serif, 'Georgia', serif)"
        fontWeight="bold"
        letterSpacing="0.06em"
        style={{ filter: 'drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.35))' }}
      >
        {ano}
      </text>

      {/* Inscrição BRASIL no topo */}
      <text
        x={50}
        y={18}
        textAnchor="middle"
        fontSize={7.5}
        fill={LEGENDA}
        fontFamily="var(--ff-serif, 'Georgia', serif)"
        fontWeight="bold"
        letterSpacing="0.14em"
        style={{ filter: 'drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.35))' }}
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
