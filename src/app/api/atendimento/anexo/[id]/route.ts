import { NextResponse } from 'next/server'

import { temPermissao } from '@/domain/admin/permissoes'
import { carregarMembro } from '@/server/admin/acesso'
import { buscarAnexo } from '@/server/db/repositories/casos'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { getSessionEmail } from '@/server/session'

/**
 * A imagem anexada a um caso. Só o dono do caso e quem tem `cs.ver` a leem; qualquer outro recebe 404
 * (e não 403: não confirma que o anexo existe). `private, no-store` e `nosniff`: print de tela mostra dado
 * pessoal e não pode ficar em cache compartilhado.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ erro: 'Sessão expirada.' }, { status: 401 })
  const id = Number((await ctx.params).id)
  if (!Number.isSafeInteger(id) || id <= 0 || !bancoConfigurado()) return NextResponse.json({ erro: 'Não encontrado.' }, { status: 404 })

  const anexo = await executarNoBanco((tx) => buscarAnexo(tx, id), { somenteLeitura: true })
  if (!anexo) return NextResponse.json({ erro: 'Não encontrado.' }, { status: 404 })
  if (anexo.userEmail !== email) {
    const membro = await carregarMembro(email)
    if (!membro || !temPermissao(membro, 'cs.ver')) return NextResponse.json({ erro: 'Não encontrado.' }, { status: 404 })
  }
  return new NextResponse(Buffer.from(anexo.conteudo), {
    headers: {
      'Content-Type': anexo.tipoMime,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
