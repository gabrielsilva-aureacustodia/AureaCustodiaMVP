/**
 * O filtro da auditoria de moedas: um formulário GET, sem JavaScript próprio.
 *
 * Os campos viram a query da URL (`?busca=&tipo=&situacao=&analise=&caixa=`) — a mesma que
 * `lerFiltroMoedas` lê no servidor. Sem 'use client': é desenhado pelo Server Component da página.
 */

import Form from 'next/form'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ROTULO_SITUACAO, SITUACOES_MOEDA, type FiltroMoedas } from '@/domain/admin/moedas'

export function FiltroDeMoedas({ filtro, tipos, caixas }: { filtro: FiltroMoedas; tipos: string[]; caixas: string[] }): ReactNode {
  const ativos = [filtro.busca, filtro.tipo, filtro.situacao !== 'todas', filtro.analise !== 'todas', filtro.caixa].filter(Boolean).length
  return (
    // Celular: os campos ficam numa gaveta "Filtros (N)", aberta quando há filtro valendo; no
    // computador o resumo some e os campos ficam sempre à vista (admin.css, ::details-content).
    <details className="adm-filtros-gaveta" open={ativos > 0}>
      <summary>Filtros{ativos ? ` (${ativos})` : ''}</summary>
      <Form action="/admin/moedas" className="adm-form">
        <div className="field adm-campo-largo">
          <label htmlFor="moedas-busca">Código, recibo, hash, dono ou protocolo</label>
          <input id="moedas-busca" name="busca" className="tinput" defaultValue={filtro.busca} placeholder="ex.: RO-000042, REC-, 5dfddb59, @gmail" />
        </div>
        <div className="field">
          <label htmlFor="moedas-tipo">Tipo</label>
          <select id="moedas-tipo" name="tipo" className="tinput" defaultValue={filtro.tipo}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="moedas-situacao">Situação</label>
          <select id="moedas-situacao" name="situacao" className="tinput" defaultValue={filtro.situacao}>
            <option value="todas">Todas</option>
            {SITUACOES_MOEDA.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SITUACAO[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="moedas-analise">Análise</label>
          <select id="moedas-analise" name="analise" className="tinput" defaultValue={filtro.analise}>
            <option value="todas">Todas</option>
            <option value="com">Passou pela bancada</option>
            <option value="sem">Sem análise</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="moedas-caixa">Caixa</label>
          <input id="moedas-caixa" name="caixa" className="tinput" list="moedas-caixas" defaultValue={filtro.caixa} placeholder="EB-001" />
          <datalist id="moedas-caixas">
            {caixas.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="adm-acoes">
          <button type="submit" className="btn btn-outline adm-btn-compacto">
            Filtrar o acervo
          </button>
          {ativos ? (
            <Link href="/admin/moedas" className="btn btn-outline adm-btn-compacto">
              Limpar filtros ({ativos})
            </Link>
          ) : null}
        </div>
      </Form>
    </details>
  )
}
