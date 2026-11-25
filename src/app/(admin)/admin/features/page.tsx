/**
 * /admin/features — os interruptores do site. SÓ a superadmin (papel `dev`): quem não é `dev` vê o aviso
 * de acesso e nada mais, e a Server Action confere o papel de novo antes de gravar.
 */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { PainelDeFeatures } from '@/components/admin/features/PainelDeFeatures'
import { tituloDaPagina } from '@/components/admin/navegacao'
import { SemPermissao } from '@/components/admin/Blocos'
import { SLUG_DEV } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFeatures } from '@/server/config/features'

export const metadata: Metadata = { title: tituloDaPagina('/admin/features') }

export const dynamic = 'force-dynamic'

export default async function PaginaFeatures(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (membro.papel.slug !== SLUG_DEV) return <SemPermissao permissoes={['admin.papeis']} />
  const iniciais = await carregarFeatures()
  return (
    <div className="adm-pagina">
      <PainelDeFeatures iniciais={iniciais} />
    </div>
  )
}
