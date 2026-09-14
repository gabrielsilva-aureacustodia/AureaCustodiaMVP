'use client'

/**
 * As ações sobre a conta (plano do Admin, seção 2.6): ajustar saldo, marcar ou desmarcar
 * inadimplência, ativar e desativar, redefinir senha. Editar cadastro e anotar ficam nas
 * abas Cadastro e Notas, perto do que mudam.
 *
 * Cada ação é um bloco recolhível com o que ela precisa e nada mais — nenhuma caixa de
 * "tem certeza?". O que protege é o servidor: o ajuste vira lançamento no livro-razão com o
 * motivo na trilha, e a conta da equipe não é desativada por aqui.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { parsePrice } from '@/domain/money'
import type { CabecalhoFicha } from '@/server/admin/ficha'
import {
  ajustarSaldoNoPainel,
  marcarInadimplenciaNoPainel,
  mudarSituacaoDaContaNoPainel,
  redefinirSenhaNoPainel,
} from '@/server/actions/admin/usuarios'

import { useAdmin } from '../AdminProvider'
import { dinheiro } from '../formatos'

export function AcoesDaConta({ cabecalho }: { cabecalho: CabecalhoFicha }): ReactNode {
  const { resumo } = cabecalho
  return (
    <div className="adm-secao">
      <AjustarSaldo email={resumo.email} saldo={resumo.saldo} />
      <Inadimplencia email={resumo.email} marcaManual={resumo.marcaManual} inadimplentePorFatura={resumo.inadimplente && !resumo.marcaManual} />
      <Situacao email={resumo.email} ativa={cabecalho.situacao.ativa} ehDaEquipe={cabecalho.ehDaEquipe} semBanco={cabecalho.semBanco} />
      <Senha email={resumo.email} ehDoCatalogo={cabecalho.ehDoCatalogo} />
    </div>
  )
}

function AjustarSaldo({ email, saldo }: { email: string; saldo: number }): ReactNode {
  const { run } = useAdmin()
  const [valor, setValor] = useState('')
  const [sentido, setSentido] = useState<'credito' | 'debito'>('credito')
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const centavos = parsePrice(valor)

  return (
    <details className="adm-detalhes">
      <summary>Ajustar saldo</summary>
      <div className="adm-detalhes-corpo">
        <p className="adm-fraco">
          Saldo atual: {dinheiro(saldo)}. O ajuste entra no livro-razão como lançamento de ajuste, e o motivo fica na trilha de
          auditoria.
        </p>
        <form
          className="adm-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setOcupado(true)
            const r = await run(() => ajustarSaldoNoPainel(email, centavos, sentido, motivo))
            setOcupado(false)
            if (r.ok) {
              setValor('')
              setMotivo('')
            }
          }}
        >
          <div className="field">
            <label htmlFor="ajuste-sentido">Sentido</label>
            <select id="ajuste-sentido" className="tinput" value={sentido} onChange={(e) => setSentido(e.target.value === 'debito' ? 'debito' : 'credito')}>
              <option value="credito">Crédito (soma)</option>
              <option value="debito">Débito (subtrai)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ajuste-valor">Valor (R$)</label>
            <input id="ajuste-valor" className="tinput" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field adm-campo-largo">
            <label htmlFor="ajuste-motivo">Motivo</label>
            <input id="ajuste-motivo" className="tinput" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: estorno de tarifa cobrada em dobro" />
          </div>
          <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado} data-uso="usuarios-ajustar-saldo">
            {centavos > 0 ? `${sentido === 'credito' ? 'Creditar' : 'Debitar'} ${dinheiro(centavos)}` : 'Ajustar'}
          </button>
        </form>
      </div>
    </details>
  )
}

function Inadimplencia({ email, marcaManual, inadimplentePorFatura }: { email: string; marcaManual: boolean; inadimplentePorFatura: boolean }): ReactNode {
  const { run } = useAdmin()
  const [motivo, setMotivo] = useState('')
  return (
    <details className="adm-detalhes">
      <summary>Inadimplência</summary>
      <div className="adm-detalhes-corpo">
        <p className="adm-fraco">
          {marcaManual
            ? 'A conta tem a marca manual de inadimplência.'
            : inadimplentePorFatura
              ? 'A conta está inadimplente por fatura vencida — isso some quando a fatura for paga, não por aqui.'
              : 'A conta não tem marca manual de inadimplência.'}
        </p>
        <form
          className="adm-form"
          onSubmit={async (e) => {
            e.preventDefault()
            const r = await run(() => marcarInadimplenciaNoPainel(email, !marcaManual, motivo))
            if (r.ok) setMotivo('')
          }}
        >
          <div className="field adm-campo-largo">
            <label htmlFor="inadimplencia-motivo">Motivo (opcional)</label>
            <input id="inadimplencia-motivo" className="tinput" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-outline adm-btn-compacto">
            {marcaManual ? 'Retirar a marca manual' : 'Marcar como inadimplente'}
          </button>
        </form>
      </div>
    </details>
  )
}

function Situacao({ email, ativa, ehDaEquipe, semBanco }: { email: string; ativa: boolean; ehDaEquipe: boolean; semBanco: boolean }): ReactNode {
  const { run } = useAdmin()
  const [motivo, setMotivo] = useState('')
  return (
    <details className="adm-detalhes">
      <summary>{ativa ? 'Desativar conta' : 'Reativar conta'}</summary>
      <div className="adm-detalhes-corpo">
        {semBanco ? (
          <p className="adm-fraco">Sem banco configurado: a situação da conta é gravada em tabela própria do painel.</p>
        ) : ativa && ehDaEquipe ? (
          <p className="adm-fraco">Esta conta é da equipe do painel. Para desativá-la, tire-a da equipe antes, em Equipe e papéis.</p>
        ) : (
          <>
            <p className="adm-fraco">
              {ativa
                ? 'Desativar bloqueia o login pelo Supabase (senha e Google) e registra quem desativou e por quê.'
                : 'Reativar desbloqueia o login pelo Supabase e registra quem reativou.'}
            </p>
            <form
              className="adm-form"
              onSubmit={async (e) => {
                e.preventDefault()
                const r = await run(() => mudarSituacaoDaContaNoPainel(email, !ativa, motivo))
                if (r.ok) setMotivo('')
              }}
            >
              <div className="field adm-campo-largo">
                <label htmlFor="situacao-motivo">Motivo</label>
                <input id="situacao-motivo" className="tinput" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-outline adm-btn-compacto">
                {ativa ? 'Desativar' : 'Reativar'}
              </button>
            </form>
          </>
        )}
      </div>
    </details>
  )
}

function Senha({ email, ehDoCatalogo }: { email: string; ehDoCatalogo: boolean }): ReactNode {
  const { run } = useAdmin()
  const [senha, setSenha] = useState('')
  return (
    <details className="adm-detalhes">
      <summary>Redefinir senha</summary>
      <div className="adm-detalhes-corpo">
        {ehDoCatalogo ? (
          <p className="adm-fraco">Conta do catálogo de demonstração: ela entra sem Supabase, com a senha do catálogo (RA-19).</p>
        ) : (
          <>
            <div className="adm-acoes adm-secao">
              <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => void run(() => redefinirSenhaNoPainel(email, 'link', ''))}>
                Enviar link de redefinição por e-mail
              </button>
            </div>
            <form
              className="adm-form"
              onSubmit={async (e) => {
                e.preventDefault()
                const r = await run(() => redefinirSenhaNoPainel(email, 'provisoria', senha))
                if (r.ok) setSenha('')
              }}
            >
              <div className="field adm-campo-largo">
                <label htmlFor="senha-provisoria">Senha provisória</label>
                <input id="senha-provisoria" className="tinput" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" className="btn btn-outline adm-btn-compacto">
                Definir senha provisória
              </button>
            </form>
          </>
        )}
      </div>
    </details>
  )
}
