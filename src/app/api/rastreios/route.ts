import { NextResponse } from 'next/server'

import { getSessionEmail } from '@/server/session'
import { rastreiosPorProtocolo } from '@/server/shipping/rastreios'
import { getState } from '@/server/state'

/**
 * O que a tela de envios mostra sobre o objeto postal.
 *
 * Lê `aurea.rastreios`, gravada pelo job agendado — **nunca a API dos
 * Correios**. É a regra do M6: consulta por visita de página gera custo,
 * esbarra em limite de requisição e deixa a tela lenta.
 *
 * Só devolve os protocolos do próprio usuário. Sem esse recorte, um código de
 * rastreio alheio — que é um dado de entrega, ligado a um endereço — sairia
 * para quem pedisse.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401 })

  const [state, rastreios] = await Promise.all([getState(), rastreiosPorProtocolo()])
  const meus = new Set(
    state.envios.filter((e) => e.userEmail === email).map((e) => e.protocolo),
  )

  const saida: Record<string, { statusAtual: string; etapaDescricao: string; atualizadoEm: number }> = {}
  for (const [protocolo, r] of Object.entries(rastreios)) {
    if (!meus.has(protocolo)) continue
    saida[protocolo] = {
      statusAtual: r.statusAtual,
      etapaDescricao: r.etapaDescricao,
      atualizadoEm: r.dataUltimaAtualizacao,
    }
  }

  return NextResponse.json({ rastreios: saida })
}
