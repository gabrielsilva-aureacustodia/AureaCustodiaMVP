/**
 * Peças de apresentação do painel que servem a mais de uma tela: o cartão de número,
 * o aviso de "seu papel não inclui esta área", o de "esta área chega na próxima
 * entrega" e o de "disponível quando outra frente entrar".
 *
 * Sem 'use client' e sem hook: são desenhadas tanto por Server Components (as páginas)
 * quanto dentro de componentes de cliente. Nada aqui busca dado ou decide permissão —
 * quem decide é a página, no servidor, antes de chamar estes blocos.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { PERMISSOES, type ChavePermissao } from '@/domain/admin/permissoes'

export function Cartao({
  rotulo,
  valor,
  detalhe,
  tom = 'normal',
}: {
  rotulo: string
  valor: string
  detalhe?: ReactNode
  tom?: 'normal' | 'alerta' | 'positivo'
}): ReactNode {
  return (
    <div className={`adm-cartao adm-tom-${tom}`}>
      <div className="adm-cartao-rotulo">{rotulo}</div>
      <div className="adm-cartao-valor">{valor}</div>
      {detalhe ? <div className="adm-cartao-detalhe">{detalhe}</div> : null}
    </div>
  )
}

function IconeAviso(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </svg>
  )
}

/** A página foi aberta pela URL por quem não tem a permissão. Nenhum dado foi carregado. */
export function SemPermissao({ permissoes }: { permissoes: readonly ChavePermissao[] }): ReactNode {
  const rotulos = permissoes.map((c) => PERMISSOES.find((p) => p.chave === c)?.rotulo ?? c)
  return (
    <div className="panel adm-aviso" role="alert">
      <h3>
        <IconeAviso />
        Seu papel no painel não inclui esta área
      </h3>
      <p>
        Ela pede {rotulos.length > 1 ? 'uma destas permissões' : 'a permissão'}: <b>{rotulos.join(' ou ')}</b>.
      </p>
      <p>
        Quem administra a equipe pode mudar o seu papel em <b>Equipe e papéis</b>.
      </p>
      <div className="adm-acoes">
        <Link href="/admin" className="btn btn-outline">
          Voltar ao painel
        </Link>
      </div>
    </div>
  )
}

/** Área declarada no menu desde a C1, construída numa entrega seguinte. */
export function AreaEmConstrucao({ etapa, oQueVem }: { etapa: string; oQueVem: readonly string[] }): ReactNode {
  return (
    <div className="panel adm-aviso">
      <h3>
        <IconeAviso />
        Esta área entra na próxima entrega do painel
      </h3>
      <p>O menu já a mostra para quem tem a permissão. O que ela vai trazer:</p>
      <ul className="adm-lista">
        {oQueVem.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p className="adm-nota-tecnica">Etapa {etapa} da frente de painel administrativo.</p>
    </div>
  )
}

/** Um indicador que depende de trabalho de outra frente que ainda não chegou à `main`. */
export function Indisponivel({ titulo, quando }: { titulo: string; quando: string }): ReactNode {
  return (
    <div className="adm-indisponivel">
      <div className="adm-cartao-rotulo">{titulo}</div>
      <div className="adm-indisponivel-texto">{quando}</div>
    </div>
  )
}

/** O aviso de ambiente sem banco, igual em toda tela que depende de tabela. */
export function AvisoSemBanco({ children }: { children?: ReactNode }): ReactNode {
  return (
    <div className="note adm-secao">
      <IconeAviso />
      <span>
        Este ambiente está sem <code>POSTGRES_URL</code>: o estado vem da memória e não existem ledger, trilha,
        papéis nem registro de uso. {children}
      </span>
    </div>
  )
}
