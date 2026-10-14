import { NextRequest, NextResponse, after } from 'next/server'

import { reagirAoAvisoDoGateway } from '@/server/saques/pagamento'

/**
 * Aviso de mudança de status de um saque enviado pelo Mercado Pago (Payouts) — 14/10/2026.
 *
 * NADA DAQUI É CONFIANÇA. A documentação do Mercado Pago não descreve nenhuma assinatura verificável
 * para este aviso, então o corpo é tratado como um dedo apontando para um saque, e só: dele sai no
 * máximo um id de payout e uma referência, e `reagirAoAvisoDoGateway` CONSULTA o Mercado Pago com o nosso
 * token antes de mudar qualquer coisa. Um aviso falso (de quem descobrir a URL) só faz uma consulta
 * a mais; não paga, não recusa e não estorna nada.
 *
 * Responde 200 sempre que o corpo for lido: 500 faz o Mercado Pago reenviar, e reenviar um aviso que
 * não aponta para nenhum saque nosso é só barulho. A consulta roda depois da resposta (`after`).
 */

function agendarDepoisDaResposta(tarefa: () => Promise<void>): void {
  try {
    after(tarefa)
  } catch {
    // Fora do escopo de uma requisição (suíte de testes): roda solta, a resposta sai na hora.
    void tarefa()
  }
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 100) : null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let corpo: unknown = null
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const c = (corpo ?? {}) as { external_reference?: unknown; payout?: { id?: unknown; external_reference?: unknown } }
  const payoutId = texto(c.payout?.id)
  const referencia = texto(c.payout?.external_reference) ?? texto(c.external_reference)

  agendarDepoisDaResposta(async () => {
    try {
      await reagirAoAvisoDoGateway(referencia, payoutId)
    } catch (err) {
      console.error('[webhook payouts] falha ao conferir o saque:', err)
    }
  })
  return NextResponse.json({ ok: true })
}
