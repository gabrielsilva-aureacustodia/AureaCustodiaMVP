'use client'

/**
 * O catálogo de tipos de moeda (plano do Admin, 3.3): a lista na ordem da vitrine, a edição de cada
 * tipo e a criação de um novo.
 *
 * O interruptor "negociável" é o que `isNegociavel()` consulta desde a C3 — ligar põe o tipo em
 * Comprar e Vender; desligar tira o tipo do mercado sem mexer nas moedas já custodiadas. "Aceita envio"
 * decide se o tipo aceita envio novo. O nome (a chave) não muda depois de criado: está gravado em
 * moeda, envio e negociação.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import type { EntradaTipoMoeda, TipoMoedaGravado } from '@/domain/admin/catalogo'
import { salvarTipoDeMoedaNoPainel } from '@/server/actions/admin/config'

import { useAdmin } from '../AdminProvider'
import { numero } from '../formatos'

type Rascunho = { [K in keyof EntradaTipoMoeda]: EntradaTipoMoeda[K] extends boolean ? boolean : string }

const NOVO: Rascunho = { chave: '', anoPadrao: '', tiragem: '', categoria: '', negociavel: false, detail: '', ord: '', ativo: true }

function paraRascunho(t: TipoMoedaGravado): Rascunho {
  return { chave: t.chave, anoPadrao: String(t.anoPadrao), tiragem: t.tiragem, categoria: t.categoria, negociavel: t.negociavel, detail: t.detail, ord: String(t.ord), ativo: t.ativo }
}

function FormTipo({ inicial, criando, categorias, aoTerminar }: { inicial: Rascunho; criando: boolean; categorias: string[]; aoTerminar(): void }): ReactNode {
  const { run } = useAdmin()
  const [r, setR] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  return (
    <form
      className="adm-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setSalvando(true)
        const res = await run(() => salvarTipoDeMoedaNoPainel(r, criando))
        setSalvando(false)
        if (res.ok) {
          if (criando) setR(NOVO)
          aoTerminar()
        }
      }}
    >
      <label className="field adm-campo-largo">
        <span>Nome do tipo</span>
        <input className="tinput" value={r.chave} disabled={!criando} placeholder="Ex.: Paralímpicos 2016" onChange={(e) => setR({ ...r, chave: e.target.value })} />
      </label>
      <label className="field">
        <span>Ano padrão</span>
        <input className="tinput" inputMode="numeric" value={r.anoPadrao} placeholder="2016" onChange={(e) => setR({ ...r, anoPadrao: e.target.value })} />
      </label>
      <label className="field">
        <span>Tiragem</span>
        <input className="tinput" value={r.tiragem} placeholder="20.000" onChange={(e) => setR({ ...r, tiragem: e.target.value })} />
      </label>
      <label className="field">
        <span>Pasta (categoria)</span>
        <input className="tinput" list="adm-categorias" value={r.categoria} onChange={(e) => setR({ ...r, categoria: e.target.value })} />
        <datalist id="adm-categorias">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className="field">
        <span>Ordem na vitrine</span>
        <input className="tinput" inputMode="numeric" value={r.ord} placeholder="10" onChange={(e) => setR({ ...r, ord: e.target.value })} />
      </label>
      <label className="field adm-campo-largo">
        <span>Ficha técnica</span>
        <input className="tinput" value={r.detail} placeholder="Rio 2016 · Tiragem 20.000 · Bimetálica 27mm" onChange={(e) => setR({ ...r, detail: e.target.value })} />
      </label>
      <label className="adm-check">
        <input type="checkbox" checked={r.negociavel} onChange={(e) => setR({ ...r, negociavel: e.target.checked })} />
        Negociável no mercado
      </label>
      <label className="adm-check">
        <input type="checkbox" checked={r.ativo} onChange={(e) => setR({ ...r, ativo: e.target.checked })} />
        Aceita envio novo para a custódia
      </label>
      <div className="adm-acoes">
        <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={salvando}>
          {salvando ? 'Salvando…' : criando ? 'Criar tipo' : 'Salvar tipo'}
        </button>
      </div>
    </form>
  )
}

export function CatalogoDeMoedas({ tipos, moedasPorTipo, podeEditar, semTabela }: { tipos: TipoMoedaGravado[]; moedasPorTipo: Record<string, number>; podeEditar: boolean; semTabela: boolean }): ReactNode {
  const [editando, setEditando] = useState<string | null>(null)
  const categorias = [...new Set(tipos.map((t) => t.categoria))]

  return (
    <>
      {semTabela ? <p className="note">O catálogo editável precisa do banco com a migration 024. Até lá, vale o catálogo do código, mostrado abaixo sem edição.</p> : null}
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th className="adm-num">Ordem</th>
              <th>Tipo</th>
              <th>Pasta</th>
              <th>Mercado</th>
              <th>Envio</th>
              <th className="adm-num">Moedas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tipos.map((t) => (
              <tr key={t.chave}>
                <td className="adm-num">{t.ord}</td>
                <td>
                  <b>{t.chave}</b>
                  <div className="adm-fraco">
                    {t.anoPadrao} · tiragem {t.tiragem || '—'}
                  </div>
                  <div className="adm-fraco">{t.detail}</div>
                </td>
                <td>{t.categoria}</td>
                <td>{t.negociavel ? <span className="pill g">negociável</span> : <span className="pill n">fora do mercado</span>}</td>
                <td>{t.ativo ? <span className="pill g">aceita envio</span> : <span className="pill n">sem envio novo</span>}</td>
                <td className="adm-num">{numero(moedasPorTipo[t.chave] ?? 0)}</td>
                <td>
                  {podeEditar && !semTabela ? (
                    <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEditando(editando === t.chave ? null : t.chave)}>
                      {editando === t.chave ? 'Fechar' : 'Editar'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando
        ? (() => {
            const t = tipos.find((x) => x.chave === editando)
            return t ? (
              <>
                <div className="adm-subtitulo">Editar {t.chave}</div>
                <FormTipo key={t.chave} inicial={paraRascunho(t)} criando={false} categorias={categorias} aoTerminar={() => setEditando(null)} />
              </>
            ) : null
          })()
        : null}

      {podeEditar && !semTabela ? (
        <>
          <div className="adm-subtitulo">Criar tipo de moeda</div>
          <FormTipo inicial={NOVO} criando categorias={categorias} aoTerminar={() => undefined} />
        </>
      ) : null}
    </>
  )
}
