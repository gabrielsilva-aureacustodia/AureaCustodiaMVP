'use client'

/**
 * As ações sobre a conta (plano do Admin, seção 2.6): ajustar saldo, marcar ou desmarcar
 * inadimplência, ativar e desativar, redefinir senha. Editar cadastro e anotar ficam nas
 * abas Cadastro e Notas, perto do que mudam.
 *
 * Cada ação é um bloco recolhível com o que ela precisa e nada mais. O que protege é o
 * servidor: o ajuste vira lançamento no livro-razão com o motivo na trilha, e a conta da
 * equipe não é desativada por aqui.
 *
 * 25/10/2026 (polimento do painel): as ações do dia a dia (saldo, inadimplência, aviso) ficam
 * em cima; desativar a conta e trocar a senha descem para a "Zona de perigo", à parte. Creditar
 * ou debitar e desativar pedem a confirmação com o objeto no botão ("Confirmar: creditar R$ 50,00
 * na conta de Ana") — dinheiro e acesso de cliente não mudam num clique solto. As mesmas Server
 * Actions, com os mesmos argumentos.
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
import { reenviarAvisoDeReservaNoPainel, reenviarRedefinicaoSenhaNoPainel } from '@/server/actions/admin/emails'

import { useAdmin } from '../AdminProvider'
import { ConfirmarAcao } from '../ConfirmarAcao'
import { dataHora, dinheiro } from '../formatos'

export function AcoesDaConta({ cabecalho }: { cabecalho: CabecalhoFicha }): ReactNode {
  const { resumo } = cabecalho
  return (
    <section className="adm-secao" aria-labelledby="ficha-acoes">
      <h3 className="adm-titulo-secao" id="ficha-acoes">
        Ações da conta
      </h3>
      <AjustarSaldo email={resumo.email} nome={resumo.nome} saldo={resumo.saldo} />
      <Inadimplencia email={resumo.email} marcaManual={resumo.marcaManual} inadimplentePorFatura={resumo.inadimplente && !resumo.marcaManual} />
      <AvisoDeReserva email={resumo.email} reservas={cabecalho.reservasAbertas} envios={cabecalho.ultimosEnvios} />
      <div className="adm-zona-perigo">
        <h4>Zona de perigo</h4>
        <p className="adm-fraco">Mexem no acesso do cliente. Ficam registradas na trilha com quem fez e o motivo.</p>
        <Situacao email={resumo.email} nome={resumo.nome} ativa={cabecalho.situacao.ativa} ehDaEquipe={cabecalho.ehDaEquipe} semBanco={cabecalho.semBanco} />
        <Senha email={resumo.email} ehDoCatalogo={cabecalho.ehDoCatalogo} ultimoEnvio={cabecalho.ultimosEnvios.redefinicao_senha ?? null} />
      </div>
    </section>
  )
}

function AjustarSaldo({ email, nome, saldo }: { email: string; nome: string; saldo: number }): ReactNode {
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
          // Enter no campo não manda nada: o lançamento só sai pelo "Confirmar: …".
          onSubmit={(e) => e.preventDefault()}
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
            <input id="ajuste-valor" className="tinput" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field adm-campo-largo">
            <label htmlFor="ajuste-motivo">Motivo</label>
            <input id="ajuste-motivo" className="tinput" autoComplete="off" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: estorno de tarifa cobrada em dobro" />
          </div>
          <ConfirmarAcao
            rotulo={centavos > 0 ? `${sentido === 'credito' ? 'Creditar' : 'Debitar'} ${dinheiro(centavos)}` : 'Ajustar'}
            objeto={`${sentido === 'credito' ? 'creditar' : 'debitar'} ${dinheiro(centavos)} ${sentido === 'credito' ? 'na' : 'da'} conta de ${nome}`}
            detalhe={`Saldo passa de ${dinheiro(saldo)} para ${dinheiro(sentido === 'credito' ? saldo + centavos : saldo - centavos)}. Entra no livro-razão como ajuste.`}
            aoConfirmar={async () => {
              setOcupado(true)
              const r = await run(() => ajustarSaldoNoPainel(email, centavos, sentido, motivo))
              setOcupado(false)
              if (r.ok) {
                setValor('')
                setMotivo('')
              }
            }}
            variante="gold"
            desabilitado={ocupado || centavos <= 0}
            usoNome="usuarios-ajustar-saldo"
          />
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
            <input id="inadimplencia-motivo" className="tinput" autoComplete="off" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-outline adm-btn-compacto">
            {marcaManual ? 'Retirar a marca manual' : 'Marcar como inadimplente'}
          </button>
        </form>
      </div>
    </details>
  )
}

function Situacao({ email, nome, ativa, ehDaEquipe, semBanco }: { email: string; nome: string; ativa: boolean; ehDaEquipe: boolean; semBanco: boolean }): ReactNode {
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
            <form className="adm-form" onSubmit={(e) => e.preventDefault()}>
              <div className="field adm-campo-largo">
                <label htmlFor="situacao-motivo">Motivo</label>
                <input id="situacao-motivo" className="tinput" autoComplete="off" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </div>
              <ConfirmarAcao
                rotulo={ativa ? 'Desativar' : 'Reativar'}
                objeto={`${ativa ? 'desativar' : 'reativar'} a conta de ${nome}`}
                detalhe={ativa ? 'O login por senha e por Google para de funcionar na hora.' : 'O login volta a funcionar na hora.'}
                aoConfirmar={async () => {
                  const r = await run(() => mudarSituacaoDaContaNoPainel(email, !ativa, motivo))
                  if (r.ok) setMotivo('')
                }}
                perigo={ativa}
              />
            </form>
          </>
        )}
      </div>
    </details>
  )
}

function Senha({ email, ehDoCatalogo, ultimoEnvio }: { email: string; ehDoCatalogo: boolean; ultimoEnvio: number | null }): ReactNode {
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
              <button
                type="button"
                className="btn btn-outline adm-btn-compacto"
                data-uso="usuarios-link-senha"
                onClick={() => void run(() => (ultimoEnvio ? reenviarRedefinicaoSenhaNoPainel(email) : redefinirSenhaNoPainel(email, 'link', '')))}
              >
                {ultimoEnvio ? 'Reenviar e-mail de redefinição' : 'Enviar link de redefinição por e-mail'}
              </button>
              {ultimoEnvio ? <span className="adm-fraco">Último envio em {dataHora(ultimoEnvio)}.</span> : null}
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
                <input id="senha-provisoria" className="tinput" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" spellCheck={false} autoCapitalize="none" />
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

function AvisoDeReserva({ email, reservas, envios }: { email: string; reservas: CabecalhoFicha['reservasAbertas']; envios: Record<string, number> }): ReactNode {
  const { run } = useAdmin()
  if (reservas.length === 0) return null
  return (
    <details className="adm-detalhes">
      <summary>Aviso de reserva</summary>
      <div className="adm-detalhes-corpo">
        <p className="adm-fraco">
          Compras pós-pagas com o prazo de pagamento correndo. Use quando a pessoa disser que não recebeu o aviso — o texto é o
          mesmo do aviso automático.
        </p>
        {reservas.map((r) => {
          const ultimo = envios[`aviso_reserva:${r.id}`]
          return (
            <div key={r.id} className="adm-acoes adm-secao">
              <span>
                {r.tipoMoeda} · {dinheiro(r.totalCents)} · vence {dataHora(r.expiraEm)}
              </span>
              <button type="button" className="btn btn-outline adm-btn-compacto" data-uso="usuarios-reenviar-aviso-reserva" onClick={() => void run(() => reenviarAvisoDeReservaNoPainel(email, r.id))}>
                Reenviar aviso
              </button>
              {ultimo ? <span className="adm-fraco">Último reenvio em {dataHora(ultimo)}.</span> : null}
            </div>
          )
        })}
      </div>
    </details>
  )
}
