'use client'

/**
 * Formulário dos dois caminhos internos de entrada de moeda no acervo.
 *
 * Registra no acervo de um cliente moeda que já está no armazém e já foi
 * conferida fora do sistema: acervo recebido antes de a plataforma existir,
 * moeda entregue em mãos, acervo próprio da empresa. Não há envio postal para
 * rastrear. No modo direto ela já foi conferida; no modo sem envio ela entra na
 * fila normal da bancada e só nasce como ativo depois da aprovação.
 *
 * O formulário aparece em dois lugares, com o mesmo componente: na aba Acervo da
 * ficha do cliente, com o e-mail já preenchido e travado, e na bancada, onde o
 * e-mail é digitado. Cada modo exige sua permissão no módulo `acervo`, que só
 * sócio e desenvolvimento recebem — o papel `operacao` recebe automaticamente
 * apenas `bancada.*` e `logistica.*`.
 *
 * A MOEDA NASCE IGUAL À DA BANCADA. Código da mesma série, recibo derivado do
 * código e hash vindo de uma análise encadeada na mesma corrente SHA-256. O que
 * a distingue está dentro do hash: o protocolo é `RO-DIR-nnnn` em vez de
 * `RO-ENV-nnnn`. Por isso o aviso abaixo do botão não é enfeite — quem usa isto
 * precisa saber que está emitindo recibo de custódia de verdade, negociável no
 * marketplace, sem ninguém ter pesado a moeda no sistema.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'

import type { CoinType } from '@/domain/types'
import { cadastrarMoedaDiretaNoPainel, cadastrarMoedaSemEnvioNoPainel } from '@/server/actions/admin/bancada'

import { useAdmin } from '../AdminProvider'

export function CadastroDiretoDeMoeda({
  catalogo,
  emailFixo,
  modo,
}: {
  catalogo: readonly CoinType[]
  /** Quando vem preenchido, o campo de e-mail some: a ficha já sabe de quem é. */
  emailFixo?: string
  modo: 'direto' | 'sem_envio'
}): ReactNode {
  const { run } = useAdmin()
  const router = useRouter()

  const primeiro = catalogo[0]
  const [email, setEmail] = useState(emailFixo ?? '')
  const [tipoMoeda, setTipoMoeda] = useState(primeiro?.key ?? '')
  const [ano, setAno] = useState(String(primeiro?.anoPadrao ?? new Date().getFullYear()))
  const [quantidade, setQuantidade] = useState('1')
  const [pesoMg, setPesoMg] = useState('')
  const [caixa, setCaixa] = useState('')
  const [observacao, setObservacao] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const direto = modo === 'direto'
  const prefixoId = direto ? 'cd' : 'cse'

  return (
    <details className="adm-detalhes adm-secao">
      <summary>{direto ? 'Cadastro direto' : 'Cadastro sem envio'}</summary>
      <div className="adm-detalhes-corpo">
        <p className="adm-fraco" style={{ marginBottom: 12 }}>
          {direto
            ? 'Para moeda que já está no armazém e já foi conferida fora do sistema. A moeda nasce com recibo e hash sem passar pela bancada.'
            : 'Para moeda que já está no armazém, mas ainda precisa ser analisada. O lote entra na fila da bancada sem criar um envio postal.'}
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setOcupado(true)
            const r = await run(() =>
              (direto ? cadastrarMoedaDiretaNoPainel : cadastrarMoedaSemEnvioNoPainel)({
                userEmail: emailFixo ?? email,
                tipoMoeda,
                ano: Number(ano),
                quantidade: Number(quantidade),
                pesoMg: pesoMg.trim() ? Number(pesoMg) : 0,
                caixa: caixa.trim() || null,
                observacao: observacao.trim() || null,
              }),
            )
            setOcupado(false)
            if (r.ok) {
              setQuantidade('1')
              setObservacao('')
              router.refresh()
            }
          }}
        >
          <div className="adm-form">
            {emailFixo ? null : (
              <div className="field adm-campo-largo">
                <label htmlFor={`${prefixoId}-email`}>E-mail do cliente</label>
                <input
                  id={`${prefixoId}-email`}
                  className="tinput"
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            )}

            <div className="field adm-campo-largo">
              <label htmlFor={`${prefixoId}-tipo`}>Tipo de moeda</label>
              <select
                id={`${prefixoId}-tipo`}
                className="tinput"
                value={tipoMoeda}
                onChange={(ev) => {
                  setTipoMoeda(ev.target.value)
                  const t = catalogo.find((x) => x.key === ev.target.value)
                  if (t) setAno(String(t.anoPadrao))
                }}
              >
                {catalogo.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.key}
                    {t.negociavel ? '' : ' (não negociável)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor={`${prefixoId}-ano`}>Ano</label>
              <input id={`${prefixoId}-ano`} className="tinput" type="number" value={ano} onChange={(ev) => setAno(ev.target.value)} />
            </div>

            <div className="field">
              <label htmlFor={`${prefixoId}-qtd`}>Quantidade</label>
              <input
                id={`${prefixoId}-qtd`}
                className="tinput"
                type="number"
                min={1}
                max={500}
                value={quantidade}
                onChange={(ev) => setQuantidade(ev.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor={`${prefixoId}-peso`}>Peso aferido, em miligramas (opcional)</label>
              <input
                id={`${prefixoId}-peso`}
                className="tinput"
                type="number"
                min={0}
                value={pesoMg}
                onChange={(ev) => setPesoMg(ev.target.value)}
                placeholder="deixe vazio se não houve pesagem"
              />
            </div>

            <div className="field">
              <label htmlFor={`${prefixoId}-caixa`}>Caixa física (opcional)</label>
              <input id={`${prefixoId}-caixa`} className="tinput" value={caixa} onChange={(ev) => setCaixa(ev.target.value)} placeholder="EB-001" />
            </div>

            <div className="field adm-campo-largo">
              <label htmlFor={`${prefixoId}-obs`}>Motivo do {direto ? 'cadastro direto' : 'cadastro sem envio'}</label>
              <input
                id={`${prefixoId}-obs`}
                className="tinput"
                value={observacao}
                onChange={(ev) => setObservacao(ev.target.value)}
                placeholder="Ex.: acervo já em custódia, anterior à plataforma"
              />
            </div>
          </div>

          <div className="adm-acoes" style={{ marginTop: 10 }}>
            <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado} data-uso={direto ? 'acervo-cadastro-direto' : 'acervo-cadastro-sem-envio'}>
              {ocupado ? 'Registrando…' : direto ? 'Registrar no acervo' : 'Enviar para a bancada'}
            </button>
          </div>

          <p className="adm-fraco" style={{ marginTop: 10 }}>
            {direto
              ? 'Cada moeda registrada aqui emite recibo sem passar pela pesagem da bancada. O seu e-mail fica gravado como operador e aprovador.'
              : 'Nenhuma moeda nem recibo é criado agora. A bancada fará a análise normal e emitirá os recibos apenas para as unidades aprovadas.'}
          </p>
        </form>
      </div>
    </details>
  )
}
