/**
 * Constantes e catálogos da Áurea Custódia.
 *
 * Port fiel do bloco de configuração do MVP monolítico (aurea-mvp-teste.html,
 * linhas 751-792). Nada aqui é derivado nem calculado: são os números e textos
 * combinados com o negócio, e mudar qualquer um deles muda o produto.
 */

import type { CoinType, Cents } from '@/domain/types'

/**
 * Chave única de persistência do estado compartilhado.
 *
 * O MVP usava 'aurea-market-v4'; a versão Next.js sobe para v5 justamente para
 * NÃO herdar o banco antigo — o formato do estado mudou e a migração seria mais
 * cara que recomeçar limpo. A variável de ambiente existe para que preview e
 * produção na Vercel possam viver em bancos separados sem recompilar.
 */
export const STORE_KEY: string = process.env.AUREA_STORE_KEY ?? 'aurea-market-v5'

/** Comissão percentual da corretagem: 0,5% sobre o preço unitário. */
export const FEE_PCT: number = 0.005

/** Parcela fixa da comissão, somada ao percentual: R$ 1,00 por moeda negociada. */
export const FEE_FIXED: Cents = 100

/**
 * Ciclo de sincronização entre contas, em ms. As sessões são independentes e
 * compartilham um único estado; 10s é o intervalo em que cada uma relê o banco
 * para enxergar o que as outras fizeram.
 */
export const SYNC_MS: number = 10000

/**
 * Logos oficiais da marca (arquivos enviados pelo Gabriel). No MVP vinham
 * embutidas em base64 dentro do HTML; aqui são estáticos servidos de /public.
 * NUNCA gerar logo alternativa — estas são as versões aprovadas.
 */
export const LOGO_AUREA: string = '/brand/logo-aurea.webp'
export const LOGO_REAL: string = '/brand/logo-real-olimpico.webp'

/**
 * A moeda-referência do marketplace. É a única negociável, então boa parte da
 * interface fala dela no singular, com nome curto, nome completo e ficha técnica.
 */
export const COIN: { name: string; full: string; detail: string } = {
  name: 'Entrega da Bandeira Olímpica',
  full: 'R$ 1 — Entrega da Bandeira Olímpica (2012)',
  detail: 'Londres 2012 – Rio 2016 · Tiragem 2.016.000 · Bimetálica 27mm · 7g',
}

/**
 * Catálogo de moedas olímpicas brasileiras aceitas em custódia.
 *
 * Só "Entrega da Bandeira Olímpica" (a primeira, e é por isso que a ordem
 * importa) é negociável no marketplace por enquanto — as demais entram em
 * custódia normalmente, mas ainda não aparecem em Comprar/Vender.
 */
export const COIN_TYPES: CoinType[] = [
  { key: 'Entrega da Bandeira Olímpica', anoPadrao: 2012, tiragem: '2.016.000' },
  { key: 'Bandeira Olímpica', anoPadrao: 2016, tiragem: '20.000' },
  { key: 'Atletismo', anoPadrao: 2016, tiragem: '18.500' },
  { key: 'Vôlei', anoPadrao: 2016, tiragem: '17.200' },
  { key: 'Natação', anoPadrao: 2016, tiragem: '16.800' },
  { key: 'Futebol', anoPadrao: 2016, tiragem: '19.400' },
  { key: 'Vela', anoPadrao: 2016, tiragem: '12.100' },
  { key: 'Rio 2016 – Estádio', anoPadrao: 2016, tiragem: '21.700' },
  { key: 'Mascote Vinicius', anoPadrao: 2016, tiragem: '25.300' },
]

/**
 * Contas de demonstração do ambiente de teste.
 *
 * PORT FIEL: as senhas continuam em texto puro, exatamente como no MVP. Trocar
 * por hash é a Etapa 2 da migração e está fora deste escopo — mexer agora
 * quebraria a paridade de comportamento que este port precisa provar.
 */
export const ACCOUNTS: Record<string, { pass: string; name: string }> = {
  'rogeriopena@testeaurea.com.br': { pass: '12345678', name: 'Rogério Pena' },
  'gabrielsilva@testeaurea.com.br': { pass: '12345678', name: 'Gabriel Silva' },
  'alex@testeaurea.com.br': { pass: '12345678', name: 'Alex' },
  'pegge@testeaurea.com.br': { pass: '12345678', name: 'Pegge' },
  'rozane@testeaurea.com.br': { pass: '12345678', name: 'Rozane' },
  'goturuba@testeaurea.com.br': { pass: '12345678', name: 'Goturuba' },
  'solares@testeaurea.com.br': { pass: '12345678', name: 'Solares' },
}

/**
 * Busca a ficha de um tipo de moeda pela chave.
 *
 * Cai no primeiro item do catálogo quando a chave não existe: a interface
 * precisa de algo para renderizar, e a moeda-referência é o palpite seguro.
 */
export function coinTypeInfo(key: string): CoinType {
  return COIN_TYPES.find((t) => t.key === key) || COIN_TYPES[0]
}
