/**
 * /admin/moedas — a auditoria do acervo (plano do Admin, seção 3.5).
 *
 * Toda moeda do sistema, com código, tipo, ano, dono, recibo e hash, caixa e posição, o laudo de
 * origem (peso e operador), o vídeo e a situação física. O botão "verificar corrente" confere as
 * análises, o livro-razão e o cruzamento recibo × análise.
 *
 * O filtro mora na URL, como na lista de usuários. Ver pede `bancada.auditoria`; a verificação e o
 * vídeo passam por Server Actions que conferem a mesma permissão de novo.
 */

import type { ReactNode } from 'react'

import { Cartao, SemPermissao } from '@/components/admin/Blocos'
import { FiltroDeMoedas } from '@/components/admin/moedas/FiltroDeMoedas'
import { TabelaDeMoedas } from '@/components/admin/moedas/TabelaDeMoedas'
import { VerificarCorrente } from '@/components/admin/moedas/VerificarCorrente'
import { numero } from '@/components/admin/formatos'
import { lerFiltroMoedas } from '@/domain/admin/moedas'
import type { ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarAuditoriaDeMoedas } from '@/server/admin/moedas'

export const dynamic = 'force-dynamic'

export default async function MoedasPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'bancada.auditoria')) return <SemPermissao permissoes={['bancada.auditoria']} />

  const filtro = lerFiltroMoedas(await searchParams)
  const dados = await carregarAuditoriaDeMoedas(filtro)
  const r = dados.resumo

  return (
    <>
      <div className="adm-grade">
        <Cartao rotulo="Moedas no sistema" valor={numero(r.total)} detalhe={`${numero(r.comAnalise)} passaram pela bancada`} />
        <Cartao rotulo="Custodiadas" valor={numero(r.custodiadas)} tom="positivo" />
        <Cartao rotulo="Em retirada" valor={numero(r.emRetirada)} detalhe={`${numero(r.retiradas)} já retirada(s)`} />
        <Cartao rotulo="Análises sem vídeo" valor={numero(r.semVideo)} detalhe="o vídeo não é obrigatório (RA-23)" tom={r.semVideo > 0 ? 'alerta' : 'normal'} />
        <Cartao rotulo="Recibo × análise" valor={r.hashDivergente === 0 ? 'Confere' : `${numero(r.hashDivergente)} divergente(s)`} tom={r.hashDivergente === 0 ? 'positivo' : 'alerta'} />
      </div>

      <div className="panel">
        <h3>Integridade</h3>
        <p className="adm-fraco">
          Cada análise carrega o hash da anterior, e o recibo de uma moeda que passou pela bancada é o hash da análise que a aprovou. Alterar um
          registro antigo quebra a corrente dali em diante.
        </p>
        <VerificarCorrente />
      </div>

      <div className="panel">
        <h3>Acervo</h3>
        {dados.retiradasIndisponiveis ? <p className="note">As retiradas não puderam ser lidas agora: toda moeda aparece como custodiada.</p> : null}
        <FiltroDeMoedas filtro={filtro} tipos={dados.tipos} caixas={dados.caixas} />
        <TabelaDeMoedas linhas={dados.linhas} total={dados.totalFiltrado} />
      </div>
    </>
  )
}
