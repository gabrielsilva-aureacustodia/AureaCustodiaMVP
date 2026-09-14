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
  return (
    <Form action="/admin/usuarios" className="adm-form">
      <div className="field adm-campo-largo">
        <label htmlFor="usuarios-busca">Nome, e-mail ou CPF</label>
        <input id="usuarios-busca" name="busca" className="tinput" defaultValue={filtro.busca} placeholder="ex.: Ana, @gmail, 529.982" />
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
        <button type="submit" className="btn btn-gold adm-btn-compacto">
          Filtrar
        </button>
        <Link href="/admin/usuarios" className="btn btn-outline adm-btn-compacto">
          Limpar
        </Link>
      </div>
    </Form>
  )
}
