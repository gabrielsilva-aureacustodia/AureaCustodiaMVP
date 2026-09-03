/**
 * GET /api/relatorios — o índice: quais relatórios existem, em quais formatos,
 * e como montar a URL de cada um. É a página que um integrador abre primeiro.
 *
 * Mesma autorização das rotas filhas (sessão de administrador ou token).
 */

import { NextRequest, NextResponse } from 'next/server'

import { autorizarRelatorio } from '@/server/relatorios/acesso'
import { NOMES_RELATORIOS, TITULOS } from '@/server/relatorios/dados'
import { configuracaoSheets } from '@/server/relatorios/sheets'
import { getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessao = await getSessionEmail().catch(() => null)
  const auth = req.headers.get('authorization')
  const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : req.nextUrl.searchParams.get('token')
  const acesso = autorizarRelatorio(sessao, token)
  if (!acesso.ok) return NextResponse.json({ error: acesso.erro }, { status: acesso.status, headers: SEM_CACHE })

  const origem = req.nextUrl.origin
  const { faltando } = configuracaoSheets()
  return NextResponse.json(
    {
      relatorios: NOMES_RELATORIOS.map((nome) => ({
        nome,
        titulo: TITULOS[nome],
        json: `${origem}/api/relatorios/${nome}`,
        csv: `${origem}/api/relatorios/${nome}.csv`,
        xlsx: `${origem}/api/relatorios/${nome}.xlsx`,
      })),
      pastaCompleta: `${origem}/api/relatorios/tudo.xlsx`,
      parametros: {
        ano: 'aaaa (padrão: ano corrente)',
        mes: '1–12 (opcional)',
        trimestre: '1–4 (opcional)',
        recortar: '1 para recortar ledger, auditoria, extratos e negociações pelo período',
        token: 'AUREA_RELATORIOS_TOKEN, quando não há sessão (ou Authorization: Bearer)',
      },
      googleSheets: {
        push: `${origem}/api/relatorios/sheets (POST)`,
        configurado: faltando.length === 0,
        faltando,
      },
      acesso: { ator: acesso.ator, via: acesso.via },
    },
    { headers: SEM_CACHE },
  )
}
