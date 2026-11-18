'use client'

/**
 * A aba "Gasto de marketing": a equipe digita o que gastou, por canal e por intervalo de dias, e o CAC do painel
 * passa a ter numerador. O site não tem como saber o que se gasta em anúncio, evento ou material — por isso é
 * entrada manual, e por isso sem entrada o CAC fica em "—" (nenhum número é inventado).
 *
 * Nada se edita nem se apaga: errou, cancela (com motivo) e lança de novo. A linha cancelada continua na lista,
 * riscada, e na trilha (`admin.marketing.registrar` e `admin.marketing.cancelar`). Quem registra precisa de
 * `contabil.lancar`; a Server Action confere de novo, esconder o formulário é só conveniência.
 */

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { CANAIS_DE_MARKETING, janelaDoPeriodo, rotuloDoCanal } from '@/domain/kpis'
import { parsePrice } from '@/domain/money'
import { cancelarGastoNoPainel, registrarGastoNoPainel } from '@/server/actions/admin/marketing'
import type { GastoGravado } from '@/server/db/repositories/marketing'

import { useAdmin } from '../AdminProvider'
import { dataHora, dinheiro, numero } from '../formatos'
import { Secao, Selo, TabelaRolavel } from '../Pecas'

function diaBr(dia: string): string {
  const [a, m, d] = dia.split('-')
  return `${d}/${m}/${a}`
}

function intervaloBr(g: Pick<GastoGravado, 'de' | 'ate'>): string {
  return g.de === g.ate ? diaBr(g.de) : `${diaBr(g.de)} a ${diaBr(g.ate)}`
}

/** O mês de `hoje` inteiro, em dias de Brasília — o intervalo mais comum (uma fatura mensal da campanha). */
function mesInteiro(hoje: string): { de: string; ate: string } {
  const [ano, mes] = hoje.split('-').map(Number)
  const j = janelaDoPeriodo({ ano: ano!, mes: mes!, trimestre: null }, '')
  return { de: j.de, ate: j.ate }
}

function LinhaDoGasto({ g, podeLancar }: { g: GastoGravado; podeLancar: boolean }): ReactNode {
  const { run } = useAdmin()
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const cancelada = g.canceladoEm !== null
  return (
    <tr className={cancelada ? 'adm-linha-apagada' : undefined}>
      <td>{rotuloDoCanal(g.canal)}</td>
      <td>{intervaloBr(g)}</td>
      <td className="adm-num">{dinheiro(g.valor)}</td>
      <td className="adm-num">{numero(g.visitas)}</td>
      <td>
        {g.observacao || <span className="adm-fraco">—</span>}
        <div className="adm-fraco">
          {g.criadoPor} · {dataHora(g.criadoEm)}
        </div>
      </td>
      <td>
        {cancelada ? (
          <>
            <Selo tom="atencao">Cancelada</Selo>
            <div className="adm-fraco">
              {g.canceladoPor} · {dataHora(g.canceladoEm)} · {g.motivoCancelamento}
            </div>
          </>
        ) : podeLancar ? (
          cancelando ? (
            <form
              className="adm-campo-inline"
              onSubmit={async (e) => {
                e.preventDefault()
                const r = await run(() => cancelarGastoNoPainel(g.id, motivo))
                if (r.ok) setCancelando(false)
              }}
            >
              <label htmlFor={`gasto-motivo-${g.id}`} className="adm-sr">
                Motivo do cancelamento da entrada de {dinheiro(g.valor)} em {rotuloDoCanal(g.canal)}
              </label>
              <input id={`gasto-motivo-${g.id}`} className="tinput" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="motivo, ex.: valor errado" autoComplete="off" />
              <button type="submit" className="btn btn-danger adm-btn-compacto" disabled={motivo.trim().length < 3}>
                Cancelar entrada
              </button>
              <button type="button" className="btn btn-ghost adm-btn-compacto" onClick={() => setCancelando(false)}>
                Voltar
              </button>
            </form>
          ) : (
            <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setCancelando(true)}>
              Cancelar<span className="adm-sr"> a entrada de {dinheiro(g.valor)} em {rotuloDoCanal(g.canal)}, {intervaloBr(g)}</span>
            </button>
          )
        ) : (
          <Selo tom="ok">Vigente</Selo>
        )}
      </td>
    </tr>
  )
}

export function GastoDeMarketing({
  gastos,
  hoje,
  podeLancar,
  semBanco,
  migracaoPendente,
}: {
  gastos: readonly GastoGravado[] | null
  hoje: string
  podeLancar: boolean
  semBanco: boolean
  migracaoPendente: boolean
}): ReactNode {
  const { run } = useAdmin()
  const mes = mesInteiro(hoje)
  const [canal, setCanal] = useState<string>(CANAIS_DE_MARKETING[0].chave)
  const [de, setDe] = useState(mes.de)
  const [ate, setAte] = useState(hoje)
  const [valor, setValor] = useState('')
  const [visitas, setVisitas] = useState('')
  const [observacao, setObservacao] = useState('')
  const pode = podeLancar && !semBanco && !migracaoPendente

  async function registrar(e: FormEvent): Promise<void> {
    e.preventDefault()
    const bruto = visitas.trim().replace(/\./g, '')
    // Texto que não é número vai como está: quem recusa é o servidor, com a mensagem certa.
    const visitasEnviadas = bruto === '' ? null : /^\d+$/.test(bruto) ? Number(bruto) : visitas
    const r = await run(() => registrarGastoNoPainel({ canal, de, ate, valorCents: parsePrice(valor), visitas: visitasEnviadas, observacao }))
    if (r.ok) {
      setValor('')
      setVisitas('')
      setObservacao('')
    }
  }

  return (
    <>
      {semBanco ? <p className="note adm-secao"><span>Sem banco (POSTGRES_URL) não dá para guardar o gasto: o formulário fica desligado.</span></p> : null}
      {migracaoPendente ? (
        <p className="note adm-secao">
          <span>O banco ainda não tem a tabela do gasto de marketing (migration 057). Rode npm run db:migrate — até lá, o formulário fica desligado.</span>
        </p>
      ) : null}

      <Secao
        id="gasto-novo"
        titulo="Registrar gasto"
        descricao="Digite o que foi gasto, o canal e os dias a que o valor se refere — um dia, uma semana ou o mês inteiro. O painel divide o valor igualmente pelos dias do intervalo para calcular o CAC de cada janela."
      >
        {podeLancar ? (
          <form className="adm-form-financeiro" onSubmit={registrar}>
            <div className="adm-form">
              <div className="field adm-campo-largo">
                <label htmlFor="gasto-canal">Canal</label>
                <select id="gasto-canal" className="tinput" value={canal} onChange={(e) => setCanal(e.target.value)} disabled={!pode}>
                  {CANAIS_DE_MARKETING.map((c) => (
                    <option key={c.chave} value={c.chave}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="gasto-de">Primeiro dia</label>
                <input id="gasto-de" className="tinput" type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} disabled={!pode} />
              </div>
              <div className="field">
                <label htmlFor="gasto-ate">Último dia</label>
                <input id="gasto-ate" className="tinput" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} disabled={!pode} />
              </div>
            </div>
            <p className="adm-acoes-linha adm-mt10">
              <button type="button" className="btn btn-ghost adm-btn-compacto" onClick={() => { setDe(hoje); setAte(hoje) }} disabled={!pode}>
                Só hoje
              </button>
              <button type="button" className="btn btn-ghost adm-btn-compacto" onClick={() => { setDe(mes.de); setAte(mes.ate) }} disabled={!pode}>
                Mês inteiro
              </button>
            </p>
            <div className="adm-form">
              <div className="field">
                <label htmlFor="gasto-valor">Valor gasto (R$)</label>
                <input id="gasto-valor" className="tinput" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" autoComplete="off" disabled={!pode} />
              </div>
              <div className="field">
                <label htmlFor="gasto-visitas">Visitas ao site (opcional)</label>
                <input id="gasto-visitas" className="tinput" inputMode="numeric" value={visitas} onChange={(e) => setVisitas(e.target.value)} placeholder="do gerenciador de anúncios" autoComplete="off" disabled={!pode} />
              </div>
              <div className="field adm-campo-largo">
                <label htmlFor="gasto-obs">Observação (opcional)</label>
                <input id="gasto-obs" className="tinput" value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={200} placeholder="ex.: campanha de tráfego para cadastro" autoComplete="off" disabled={!pode} />
              </div>
            </div>
            <div className="adm-acoes">
              <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={!pode || parsePrice(valor) <= 0}>
                Registrar gasto
              </button>
            </div>
          </form>
        ) : (
          <div className="empty">Registrar gasto pede a permissão de lançar (contabil.lancar). Você pode ver os lançamentos abaixo.</div>
        )}
      </Secao>

      <Secao id="gasto-lista" titulo="Entradas registradas" descricao="As mais recentes primeiro. Entrada errada não se edita: cancela-se, com motivo, e lança-se outra.">
        {gastos && gastos.length ? (
          <TabelaRolavel rotulo="Entradas de gasto de marketing">
            <table className="audit-table">
              <caption className="adm-sr">Entradas de gasto de marketing</caption>
              <thead>
                <tr>
                  <th scope="col">Canal</th>
                  <th scope="col">Dias</th>
                  <th scope="col" className="adm-num">Valor</th>
                  <th scope="col" className="adm-num">Visitas</th>
                  <th scope="col">Observação e quem lançou</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <LinhaDoGasto key={g.id} g={g} podeLancar={pode} />
                ))}
              </tbody>
            </table>
          </TabelaRolavel>
        ) : (
          <div className="empty">{gastos === null ? 'Sem leitura do banco: nenhuma entrada para mostrar.' : 'Nenhum gasto registrado ainda.'}</div>
        )}
      </Secao>
    </>
  )
}
