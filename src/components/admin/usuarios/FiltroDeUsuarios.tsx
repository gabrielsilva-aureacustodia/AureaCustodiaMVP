/**
 * O filtro da lista de usuários: um formulário GET, sem JavaScript próprio.
 *
 * `next/form` faz a navegação sem recarregar a página inteira, e os campos viram a query
 * da URL (`?busca=&cadastro=&inadimplente=1…`) — a mesma que `lerFiltroUsuarios` lê no
 * servidor. Sem 'use client': é desenhado pelo Server Component da página.
 */

import Form from 'next/form'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { FiltroUsuarios } from '@/domain/admin/usuarios'

export function FiltroDeUsuarios({ filtro }: { filtro: FiltroUsuarios }): ReactNode {
  // Quantos filtros estão valendo: o "Limpar filtros (N)" só aparece quando há o que limpar.
  const ativos = [filtro.busca, filtro.cadastro, filtro.criadoDe, filtro.criadoAte, filtro.inadimplente, filtro.comSaldo, filtro.comMoeda].filter(Boolean).length
  return (
    // Celular: os campos ficam numa gaveta "Filtros (N)", aberta quando há filtro valendo; no
    // computador o resumo some e os campos ficam sempre à vista (admin.css, ::details-content).
    <details className="adm-filtros-gaveta" open={ativos > 0}>
      <summary>Filtros{ativos ? ` (${ativos})` : ''}</summary>
      <Form action="/admin/usuarios" className="adm-form">
        <div className="field adm-campo-largo">
          <label htmlFor="usuarios-busca">Nome, e-mail ou CPF</label>
          <input id="usuarios-busca" name="busca" type="search" className="tinput" autoComplete="off" spellCheck={false} defaultValue={filtro.busca} placeholder="ex.: Ana, @gmail, 529.982" />
        </div>
        <div className="field">
          <label htmlFor="usuarios-cadastro">Cadastro</label>
          <select id="usuarios-cadastro" name="cadastro" className="tinput" defaultValue={filtro.cadastro ?? ''}>
            <option value="">Todos</option>
            <option value="com">Completo</option>
            <option value="sem">Incompleto ou ausente</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="usuarios-de">Criada de</label>
          <input id="usuarios-de" name="de" type="date" className="tinput" defaultValue={filtro.criadoDe ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="usuarios-ate">até</label>
          <input id="usuarios-ate" name="ate" type="date" className="tinput" defaultValue={filtro.criadoAte ?? ''} />
        </div>
        <label className="adm-check">
          <input type="checkbox" name="inadimplente" value="1" defaultChecked={filtro.inadimplente} />
          Inadimplentes
        </label>
        <label className="adm-check">
          <input type="checkbox" name="saldo" value="1" defaultChecked={filtro.comSaldo} />
          Com saldo
        </label>
        <label className="adm-check">
          <input type="checkbox" name="moeda" value="1" defaultChecked={filtro.comMoeda} />
          Com moeda
        </label>
        <div className="adm-acoes">
          <button type="submit" className="btn btn-outline adm-btn-compacto">
            Filtrar contas
          </button>
          {ativos ? (
            <Link href="/admin/usuarios" className="btn btn-outline adm-btn-compacto">
              Limpar filtros ({ativos})
            </Link>
          ) : null}
        </div>
      </Form>
    </details>
  )
}
