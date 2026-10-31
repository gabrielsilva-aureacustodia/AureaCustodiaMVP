import { NextResponse } from 'next/server'

import { abrirCaso } from '@/server/atendimento/casos'
import { ehTabelaAusente } from '@/server/admin/portas'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { getSessionEmail } from '@/server/session'

/**
 * Abre um caso de atendimento (tipo, texto, página de origem e uma imagem opcional).
 *
 * É rota e não Server Action porque o print pode ter até 2 MB e a Server Action aceita 1 MB por padrão.
 * Só logado: o visitante não tem como receber a resposta (decisão registrada em docs/atendimento/DESENHO.md).
 * Quem confere o tipo da imagem é o domínio, pelos primeiros bytes — o `type` do arquivo é só alegação.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<NextResponse> {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ erro: 'Sessão expirada. Entre de novo.' }, { status: 401 })
  if (!bancoConfigurado()) return NextResponse.json({ erro: 'O atendimento não está disponível neste ambiente.' }, { status: 503 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ erro: 'Não foi possível ler o envio.' }, { status: 400 })
  }
  const arquivo = form.get('anexo')
  const anexo = arquivo instanceof File && arquivo.size > 0 ? { nome: arquivo.name, bytes: new Uint8Array(await arquivo.arrayBuffer()) } : null

  try {
    const r = await abrirCaso(executarNoBanco, email, { tipo: form.get('tipo'), texto: form.get('texto'), paginaOrigem: form.get('pagina'), anexo })
    if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 400 })
    return NextResponse.json({ ok: true, mensagem: r.mensagem, casoId: r.dados?.casoId })
  } catch (err) {
    // Entre o deploy e o `npm run db:migrate` da 048 as tabelas não existem: diz isso, em vez do erro genérico.
    if (ehTabelaAusente(err)) return NextResponse.json({ erro: 'O atendimento está sendo ativado neste ambiente. Tente de novo mais tarde.' }, { status: 503 })
    console.error('[atendimento] falha ao abrir o caso:', err)
    return NextResponse.json({ erro: 'Não foi possível enviar agora. Tente de novo em instantes.' }, { status: 500 })
  }
}
