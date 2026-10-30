/**
 * /admin/moedas/[codigo]/cliente — o recibo como o dono da moeda o vê, só para leitura.
 *
 * O botão "Ver como o cliente vê" da ficha apontava para /recibos/[coinId], a página do app do
 * cliente, que confere a POSSE pela sessão e responde 404 a quem não é o dono — a equipe incluída
 * (30/10/2026). Trocar a sessão para entrar como o cliente está fora de questão; em vez disso o
 * servidor lê a moeda pelo mesmo caminho da ficha e desenha a mesma folha (<FolhaDoRecibo>), sem
 * nenhuma ação: nem vender, nem retirar, nem baixar. Pede `bancada.auditoria`, como a ficha.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { FolhaDoRecibo } from '@/components/recibo/FolhaDoRecibo'
import { isNegociavel } from '@/domain/constants'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFichaDaMoeda } from '@/server/admin/moedas'
import { carregarCatalogo } from '@/server/config/carregar'

export const dynamic = 'force-dynamic'

function codigoDaRota(bruto: string): string {
  try {
    return decodeURIComponent(bruto).trim().toUpperCase()
  } catch {
    return ''
  }
}

export default async function MoedaComoOClienteVePage({ params }: { params: Promise<{ codigo: string }> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'bancada.auditoria')) return <SemPermissao permissoes={['bancada.auditoria']} />

  const codigo = codigoDaRota((await params).codigo)
  const ficha = codigo ? await carregarFichaDaMoeda(codigo) : null
  if (!ficha) {
    return (
      <div className="panel">
        <h3>Moeda não encontrada</h3>
        <p className="adm-fraco">Nenhuma moeda com o código {codigo || '(vazio)'} no acervo.</p>
        <Link href="/admin/moedas" className="btn btn-outline adm-btn-compacto">
          Voltar à auditoria
        </Link>
      </div>
    )
  }

  const { linha } = ficha
  const catalogo = await carregarCatalogo()
  const extinto = linha.recibo.status === 'Extinto'
  const bloqueado = linha.recibo.status === 'Bloqueado'
  const status = extinto
    ? 'Moeda retirada da custódia — recibo extinto'
    : bloqueado
      ? 'Bloqueado — restrição financeira'
      : 'Moeda física recebida e custodiada'

  return (
    <>
      <Link href={`/admin/moedas/${encodeURIComponent(linha.codigo)}`} className="back-link">
        ‹ Voltar à ficha da moeda
      </Link>
      <div className="note" role="note">
        Visão somente leitura do recibo de {linha.nomeDono}. Nenhuma ação do cliente está disponível aqui, e a sessão da equipe não muda.
      </div>
      <div className="cert-wrap">
        <FolhaDoRecibo
          tipoMoeda={linha.tipoMoeda}
          ano={linha.ano}
          codigo={linha.recibo.codigo}
          hash={linha.recibo.hash}
          dataEmissao={linha.recibo.dataEmissao}
          proprietario={linha.nomeDono}
          status={status}
          negociavel={isNegociavel(linha.tipoMoeda, catalogo)}
          extinto={extinto}
          bloqueado={bloqueado}
          pendencia={false}
        />
      </div>
    </>
  )
}
