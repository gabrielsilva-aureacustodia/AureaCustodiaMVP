'use client'

/**
 * Os botões de gestão de cada tipo de registro do painel.
 *
 * POR QUE UM COMPONENTE POR TIPO, E NÃO UM SÓ COM A AÇÃO POR PROP
 * --------------------------------------------------------------
 * As abas da ficha e a página de Logística são Server Components. Função não
 * atravessa a fronteira servidor → cliente como propriedade: passar
 * `aoExcluir={() => excluirEnvio(p)}` de lá quebra na serialização. Então cada
 * wrapper é um Client Component que importa a própria Server Action e recebe
 * só o identificador, que é texto.
 *
 * A confirmação, o estado de ocupado e a leitura de permissão ficam todos em
 * `AcoesDoRegistro`, que estes quatro compartilham.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { parsePrice } from '@/domain/money'
import {
  cancelarPlanoCustodia,
  editarEnvio,
  editarLoteDeVenda,
  excluirEnvio,
  excluirLoteDeVenda,
  excluirOrdemDeCompra,
  excluirPlanoCustodia,
} from '@/server/actions/admin/registros'

import { useAdmin } from '../AdminProvider'
import { AcoesDoRegistro } from './AcoesDoRegistro'

export { AcoesDoRegistro }

/**
 * Campo de edição que aparece embaixo da linha.
 *
 * Inline e não em modal, pelo mesmo motivo da confirmação de exclusão: em
 * tabela com dezenas de linhas, o que importa é ficar claro QUAL registro está
 * sendo mexido, e a modal perde isso.
 */
function CampoInline({
  rotulo,
  valorInicial,
  aoSalvar,
  aoFechar,
  tipo = 'text',
}: {
  rotulo: string
  valorInicial: string
  aoSalvar: (valor: string) => Promise<void>
  aoFechar: () => void
  tipo?: 'text' | 'number'
}): ReactNode {
  const [valor, setValor] = useState(valorInicial)
  const [ocupado, setOcupado] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
      <label style={{ fontSize: 12 }}>{rotulo}</label>
      <input
        className="tinput"
        type={tipo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        style={{ maxWidth: 140 }}
      />
      <button
        type="button"
        className="btn btn-gold adm-btn-compacto"
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true)
          try {
            await aoSalvar(valor)
            aoFechar()
          } finally {
            setOcupado(false)
          }
        }}
      >
        {ocupado ? 'Salvando…' : 'Salvar'}
      </button>
      <button type="button" className="btn btn-outline adm-btn-compacto" onClick={aoFechar}>
        Cancelar
      </button>
    </div>
  )
}

/** Anúncio de venda: corrige o preço do lote inteiro, ou tira do livro. */
export function AcoesDoLote({ lotId, precoCents }: { lotId: string; precoCents: number }): ReactNode {
  const { run } = useAdmin()
  const [editando, setEditando] = useState(false)

  return (
    <>
      <AcoesDoRegistro
        descricao="o anúncio"
        aoExcluir={() => excluirLoteDeVenda(lotId)}
        aoEditar={() => setEditando(true)}
      />
      {editando ? (
        <CampoInline
          rotulo="Preço unitário"
          valorInicial={(precoCents / 100).toFixed(2).replace('.', ',')}
          aoFechar={() => setEditando(false)}
          aoSalvar={async (v) => {
            // `parsePrice` é o mesmo conversor do app: aceita "285", "285,00"
            // e "R$ 285,00", e devolve centavos inteiros.
            await run(() => editarLoteDeVenda(lotId, parsePrice(v)))
          }}
        />
      ) : null}
    </>
  )
}

/** Ordem de compra: só exclusão — preço e quantidade o cliente edita na tela dele. */
export function AcoesDaOrdemDeCompra({ bidId }: { bidId: string }): ReactNode {
  return (
    <AcoesDoRegistro descricao="a ordem de compra" aoExcluir={() => excluirOrdemDeCompra(bidId)} />
  )
}

/** Envio: corrige a quantidade declarada, ou apaga — se não tiver virado acervo. */
export function AcoesDoEnvio({
  protocolo,
  quantidade,
}: {
  protocolo: string
  quantidade: number
}): ReactNode {
  const { run } = useAdmin()
  const [editando, setEditando] = useState(false)

  return (
    <>
      <AcoesDoRegistro
        descricao={`o envio ${protocolo}`}
        aoExcluir={() => excluirEnvio(protocolo)}
        aoEditar={() => setEditando(true)}
      />
      {editando ? (
        <CampoInline
          rotulo="Quantidade"
          tipo="number"
          valorInicial={String(quantidade)}
          aoFechar={() => setEditando(false)}
          aoSalvar={async (v) => {
            await run(() => editarEnvio(protocolo, Number(v)))
          }}
        />
      ) : null}
    </>
  )
}

/**
 * Plano de custódia: cancelar ou apagar.
 *
 * Cancelar é o que o atendimento quer quase sempre — o cliente desistiu, a
 * cobrança para, e o registro fica para explicar o que houve. Apagar é para
 * erro de sistema e teste, e a ação recusa se houver fatura já paga.
 */
export function AcoesDoPlano({ planoId, cancelado }: { planoId: string; cancelado: boolean }): ReactNode {
  const { pode, run } = useAdmin()
  const [ocupado, setOcupado] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {pode('registros.editar') && !cancelado ? (
        <button
          type="button"
          className="btn btn-outline adm-btn-compacto"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true)
            try {
              await run(() => cancelarPlanoCustodia(planoId))
            } finally {
              setOcupado(false)
            }
          }}
        >
          {ocupado ? 'Cancelando…' : 'Cancelar plano'}
        </button>
      ) : null}
      <AcoesDoRegistro
        descricao={`o plano ${planoId}`}
        aoExcluir={() => excluirPlanoCustodia(planoId)}
      />
    </div>
  )
}
