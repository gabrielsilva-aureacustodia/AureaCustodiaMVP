/**
 * GET /api/crypto — série diária de BTC/ETH/USDT em centavos de BRL, usada pela
 * tela 2.3 (Comparação de referência).
 *
 * Substitui o `ensureCryptoData()` do monolito (linhas 2251-2285), que rodava no
 * NAVEGADOR a cada login e guardava o resultado em window.storage sob a chave
 * CRYPTO_KEY. Aquele desenho disparava 4 requisições à CoinGecko por login de
 * cada usuário, direto do IP dele — com sete contas de teste em uso simultâneo
 * era fácil bater no limite de 5-15 chamadas/min do plano gratuito e a série
 * degradar para o fallback simulado.
 *
 * Aqui a coleta é do servidor e o cache é o `revalidate`: no máximo uma coleta
 * por hora, compartilhada por todos os usuários e por todas as abas.
 *
 * Sem verificação de sessão, e por dois motivos: cotação pública de cripto não é
 * dado de ninguém, e chamar cookies() aqui tornaria a rota dinâmica — o que
 * anularia o `revalidate` e traria de volta o problema de volume que este
 * desenho existe para resolver.
 */

import { NextResponse } from 'next/server'

import { fetchCryptoSeries } from '@/lib/coingecko'

/**
 * Uma hora, em segundos — o mesmo REVALIDATE_S que @/lib/coingecko usa nos
 * fetches internos. Os dois precisam concordar: cache da rota mais curto que o
 * cache dos fetches só devolveria o mesmo corpo com mais trabalho.
 */
export const revalidate = 3600

/**
 * 30 dias: o histórico que o original pedia à CoinGecko
 * (`market_chart?...&days=30&interval=daily`, linhas 2258-2260) e o mesmo
 * comprimento da série simulada de fallback.
 */
const DIAS = 30

export async function GET(): Promise<NextResponse> {
  // fetchCryptoSeries NUNCA lança: qualquer falha vira a série simulada marcada
  // com `simulated: true`, e as telas 2.2/2.3 avisam o usuário. Por isso não há
  // try/catch aqui — não existe caminho de erro para tratar.
  const data = await fetchCryptoSeries(DIAS)
  return NextResponse.json(data)
}
