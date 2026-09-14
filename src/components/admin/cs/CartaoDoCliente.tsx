'use client'

/**
 * Coluna 3 da tela de CS: quem é a pessoa do outro lado (plano do Admin, seção 2.5) — saldo,
 * moedas custodiadas, envios em andamento com a etapa atual, faturas em aberto, retiradas e
 * últimos acessos, com o link para a ficha completa.
 *
 * É o que transforma a caixa de mensagens em CRM. Quando o telefone não casou com conta
 * nenhuma, o atendente vincula à mão pelo e-mail. Embaixo, o quadro do canal: qual provedor
 * atende e, para quem configura canais, o botão que pergunta ao WhatsApp se ele está
 * conectado.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

import type { ResumoConta } from '@/domain/admin/usuarios'
import type { CanalNaTela } from '@/server/admin/atendimento'
import type { ConversaAberta } from '@/server/admin/cs'
import { atualizarContatoNoPainel, conferirCanalNoPainel } from '@/server/actions/admin/cs'

import { useAdmin } from '../AdminProvider'
import { data, dataHora, dinheiro, nomeDoMes, numero } from '../formatos'
import type { Executar } from './CaixaDeAtendimento'

const ETAPA_RETIRADA: Record<string, string> = { solicitada: 'Solicitada', paga: 'Paga', separacao: 'Em separação', postada: 'Postada' }

export function CartaoDoCliente({
  aberta,
  cliente,
  canal,
  executar,
}: {
  aberta: ConversaAberta | null
  cliente: ResumoConta | null
  canal: CanalNaTela
  executar: Executar
}): ReactNode {
  const { pode } = useAdmin()
  return (
    <>
      <div className="panel adm-secao">
        <h3>Cliente</h3>
        {!aberta ? (
          <p className="adm-fraco">Abra uma conversa para ver a ficha de quem está falando.</p>
        ) : !aberta.conversa.contato.userEmail ? (
          <SemConta contatoId={aberta.conversa.contato.id} podeVincular={pode('cs.responder')} executar={executar} />
        ) : !cliente ? (
          <p className="adm-fraco">Carregando a ficha de {aberta.conversa.contato.userEmail}…</p>
        ) : (
          <Resumo cliente={cliente} contatoId={aberta.conversa.contato.id} podeVerFicha={pode('usuarios.ver')} podeVincular={pode('cs.responder')} executar={executar} />
        )}
      </div>
      <Canal canal={canal} podeConferir={pode('cs.canais')} />
    </>
  )
}

function Resumo({
  cliente,
  contatoId,
  podeVerFicha,
  podeVincular,
  executar,
}: {
  cliente: ResumoConta
  contatoId: number
  podeVerFicha: boolean
  podeVincular: boolean
  executar: Executar
}): ReactNode {
  return (
    <>
      <div className="adm-fraco">{cliente.email}</div>
      <div className="adm-etiquetas" style={{ margin: '8px 0 12px' }}>
        {cliente.inadimplente ? <span className="pill adm-pill-vermelho">Inadimplente</span> : null}
        <span className={cliente.comCadastro ? 'pill g' : 'pill y'}>{cliente.comCadastro ? 'Cadastro completo' : 'Cadastro incompleto'}</span>
      </div>
      <dl className="adm-pares">
        <div>
          <dt>Saldo</dt>
          <dd>{dinheiro(cliente.saldo)}</dd>
        </div>
        <div>
          <dt>Moedas na custódia</dt>
          <dd>
            {numero(cliente.moedasCustodiadas)}
            {cliente.recibosBloqueados ? <span className="adm-fraco"> · {cliente.recibosBloqueados} recibo(s) bloqueado(s)</span> : null}
          </dd>
        </div>
        <div>
          <dt>Último acesso</dt>
          <dd>{dataHora(cliente.ultimoAcesso)}</dd>
        </div>
        <div>
          <dt>Acesso anterior</dt>
          <dd>{dataHora(cliente.acessoAnterior)}</dd>
        </div>
      </dl>

      <div className="adm-subtitulo">Envios em andamento</div>
      {cliente.enviosEmAndamento.length ? (
        <ul className="adm-lista">
          {cliente.enviosEmAndamento.map((e) => (
            <li key={e.protocolo}>
              <b>{e.protocolo}</b> — {e.etapa} · {numero(e.quantidade)} × {e.tipoMoeda}
              {e.codigoRastreio ? <span className="adm-fraco"> · {e.codigoRastreio}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-fraco">Nenhum.</p>
      )}

      <div className="adm-subtitulo">Faturas em aberto</div>
      {cliente.faturasEmAberto.length ? (
        <>
          <ul className="adm-lista">
            {cliente.faturasEmAberto.map((f) => (
              <li key={f.id}>
                {nomeDoMes(f.competencia)}: {dinheiro(f.valor)} · vence {data(f.vencimento)}
                {f.atrasada ? <span className="adm-negativo"> · atrasada</span> : null}
              </li>
            ))}
          </ul>
          <p className="adm-fraco">Total em aberto: {dinheiro(cliente.valorEmAberto)}</p>
        </>
      ) : (
        <p className="adm-fraco">Nenhuma.</p>
      )}

      <div className="adm-subtitulo">Retiradas em curso</div>
      {cliente.retiradasEmCurso.length ? (
        <ul className="adm-lista">
          {cliente.retiradasEmCurso.map((r) => (
            <li key={r.id}>
              <b>{r.id}</b> — {r.coinId} · {ETAPA_RETIRADA[r.status] ?? r.status} ({r.modalidade})
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-fraco">Nenhuma.</p>
      )}

      <div className="adm-acoes" style={{ marginTop: 12 }}>
        {podeVerFicha ? (
          <Link href={`/admin/usuarios/${encodeURIComponent(cliente.email)}`} className="btn btn-outline adm-btn-compacto">
            Abrir ficha completa
          </Link>
        ) : null}
        {podeVincular ? (
          <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => void executar(() => atualizarContatoNoPainel(contatoId, { userEmail: null }))}>
            Desvincular conta
          </button>
        ) : null}
      </div>
    </>
  )
}

function SemConta({ contatoId, podeVincular, executar }: { contatoId: number; podeVincular: boolean; executar: Executar }): ReactNode {
  const [email, setEmail] = useState('')
  return (
    <>
      <p className="adm-fraco">
        O telefone desta conversa não casou com o cadastro de nenhuma conta — ou casou com mais de uma.
      </p>
      {podeVincular ? (
        <form
          className="adm-form"
          onSubmit={async (e) => {
            e.preventDefault()
            const r = await executar(() => atualizarContatoNoPainel(contatoId, { userEmail: email }))
            if (r.ok) setEmail('')
          }}
        >
          <div className="field adm-campo-largo">
            <label htmlFor="cs-vincular">E-mail da conta</label>
            <input id="cs-vincular" className="tinput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-gold adm-btn-compacto">
            Vincular
          </button>
        </form>
      ) : null}
    </>
  )
}

function Canal({ canal, podeConferir }: { canal: CanalNaTela; podeConferir: boolean }): ReactNode {
  const { run } = useAdmin()
  const [ocupado, setOcupado] = useState(false)
  return (
    <div className="panel">
      <h3>Canal</h3>
      <dl className="adm-pares">
        <div>
          <dt>Provedor</dt>
          <dd>{canal.entregaDeVerdade ? `Evolution API · instância ${canal.identificador}` : 'Nenhum — registro só no painel'}</dd>
        </div>
      </dl>
      {canal.pendencias.length ? <p className="adm-fraco">Falta configurar: {canal.pendencias.join(', ')}.</p> : null}
      {podeConferir && canal.entregaDeVerdade ? (
        <div className="adm-acoes">
          <button
            type="button"
            className="btn btn-outline adm-btn-compacto"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true)
              await run(() => conferirCanalNoPainel())
              setOcupado(false)
            }}
          >
            {ocupado ? 'Perguntando ao WhatsApp…' : 'Conferir conexão'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
