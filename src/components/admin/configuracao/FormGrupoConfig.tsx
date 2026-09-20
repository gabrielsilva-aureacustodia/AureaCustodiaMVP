'use client'

/**
 * O formulário de um grupo da configuração — taxas, operacional, parâmetros dos Termos ou canais de
 * atendimento (plano do Admin, 3.3).
 *
 * Cada campo mostra o valor vigente, quem mudou e quando (ou "padrão do código"), e aceita o valor no
 * formato de quem digita: "0,5" para percentual, "1,00" para reais. A leitura do que foi digitado é a
 * mesma do servidor (src/domain/admin/configuracao.ts) — aqui só serve para a simulação ao lado
 * responder enquanto se digita. Quem grava e recusa é a Server Action.
 *
 * A SIMULAÇÃO é o que torna a mudança de taxa explicável antes de salvar: "com esta tabela, uma
 * negociação de R$ 300 rende R$ X para o Real Olímpico".
 */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  definicoesDoGrupo,
  formatarValor,
  lerReais,
  lerValorDigitado,
  simularNegociacao,
  tabelaDeTaxasDe,
  valorParaCampo,
  type GrupoConfig,
  type ValoresConfig,
} from '@/domain/admin/configuracao'
import { salvarConfiguracaoNoPainel } from '@/server/actions/admin/config'

import { useAdmin } from '../AdminProvider'
import { dataHora, dinheiro } from '../formatos'

export interface MetaGravada {
  atualizadoEm: number
  atualizadoPor: string
}

function Simulacao({ valores, campos }: { valores: ValoresConfig; campos: Record<string, string> }): ReactNode {
  const [precoTexto, setPrecoTexto] = useState('300,00')
  const taxas = useMemo(() => {
    const v: ValoresConfig = { ...valores }
    for (const def of definicoesDoGrupo('taxas')) {
      const r = lerValorDigitado(def, campos[def.chave] ?? '')
      if (r.ok) v[def.chave] = r.valor
    }
    return tabelaDeTaxasDe(v)
  }, [valores, campos])
  const preco = lerReais(precoTexto) ?? 0
  const s = simularNegociacao(taxas, preco)
  const hoje = simularNegociacao(tabelaDeTaxasDe(valores), preco)

  return (
    <aside className="adm-simulacao" aria-live="polite">
      <b>Simulação</b>
      <label className="field">
        <span>Uma negociação de</span>
        <input className="tinput" inputMode="decimal" value={precoTexto} onChange={(e) => setPrecoTexto(e.target.value)} />
      </label>
      <dl className="adm-pares" style={{ marginBottom: 0 }}>
        <div>
          <dt>O comprador paga</dt>
          <dd>
            {dinheiro(s.compradorPaga)} <span className="adm-fraco">(comissão {dinheiro(s.comissaoComprador)})</span>
          </dd>
        </div>
        <div>
          <dt>O vendedor recebe</dt>
          <dd>
            {dinheiro(s.vendedorRecebe)} <span className="adm-fraco">(comissão {dinheiro(s.comissaoVendedor)})</span>
          </dd>
        </div>
        <div>
          <dt>O Real Olímpico recebe</dt>
          <dd>
            <b>{dinheiro(s.aureaRecebe)}</b>
            {s.aureaRecebe !== hoje.aureaRecebe ? <span className="adm-fraco"> · hoje {dinheiro(hoje.aureaRecebe)}</span> : null}
          </dd>
        </div>
      </dl>
    </aside>
  )
}

export function FormGrupoConfig({
  grupo,
  valores,
  gravados,
  podeEditar,
  aviso,
}: {
  grupo: GrupoConfig
  valores: ValoresConfig
  gravados: Record<string, MetaGravada>
  podeEditar: boolean
  /** Frase acima do botão — o que salvar este grupo provoca. */
  aviso?: string
}): ReactNode {
  const { run } = useAdmin()
  const definicoes = useMemo(() => definicoesDoGrupo(grupo), [grupo])
  const inicial = useMemo(() => Object.fromEntries(definicoes.map((d) => [d.chave, valorParaCampo(d, valores[d.chave])])), [definicoes, valores])
  const [campos, setCampos] = useState<Record<string, string>>(inicial)
  const [salvando, setSalvando] = useState(false)

  const erros = definicoes.map((d) => ({ chave: d.chave, r: lerValorDigitado(d, campos[d.chave] ?? '') })).filter((x) => !x.r.ok)
  const mudou = definicoes.some((d) => (campos[d.chave] ?? '') !== inicial[d.chave])

  return (
    <form
      className="adm-config"
      onSubmit={async (e) => {
        e.preventDefault()
        setSalvando(true)
        await run(() => salvarConfiguracaoNoPainel(grupo, campos))
        setSalvando(false)
      }}
    >
      <div className="adm-config-campos">
        {definicoes.map((d) => {
          const meta = gravados[d.chave]
          const erro = erros.find((x) => x.chave === d.chave)
          return (
            <label key={d.chave} className="field adm-config-campo">
              <span>{d.rotulo}</span>
              <input
                className="tinput"
                value={campos[d.chave] ?? ''}
                disabled={!podeEditar}
                inputMode={d.tipo === 'texto' ? undefined : d.tipo === 'inteiro' ? 'numeric' : 'decimal'}
                aria-invalid={erro ? true : undefined}
                onChange={(e) => setCampos({ ...campos, [d.chave]: e.target.value })}
              />
              <small className="adm-fraco">
                Vigente: <b>{formatarValor(d, valores[d.chave])}</b> · {meta ? `mudado por ${meta.atualizadoPor} em ${dataHora(meta.atualizadoEm)}` : 'padrão do código'}
              </small>
              <small className="adm-fraco">{d.descricao}</small>
              {erro && !erro.r.ok ? <small className="adm-alerta-texto">{erro.r.erro}</small> : null}
            </label>
          )
        })}
      </div>
      {grupo === 'taxas' ? <Simulacao valores={valores} campos={campos} /> : null}
      {podeEditar ? (
        <div className="adm-acoes adm-config-rodape">
          {aviso ? <span className="adm-fraco">{aviso}</span> : null}
          <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={salvando || !mudou || erros.length > 0}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          {mudou ? (
            <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setCampos(inicial)} disabled={salvando}>
              Desfazer
            </button>
          ) : null}
        </div>
      ) : (
        <p className="adm-fraco">Seu papel vê a configuração, mas não edita (permissão “Editar taxas e parâmetros”).</p>
      )}
    </form>
  )
}
