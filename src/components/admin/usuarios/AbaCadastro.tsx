'use client'

/**
 * A aba Cadastro da ficha: dados pessoais e endereço, dados bancários, aceites dos documentos
 * legais, o login no Supabase Auth e o histórico de ativação.
 *
 * ACEITES. A frente A (A3) grava cada aceite com documento, versão, canal, IP e hash em
 * `aurea.aceites_documentos`. Enquanto a A3 não chega a este banco, a aba mostra o aceite
 * antigo de `settings.legalAcceptance` e diz que o registro formal vem depois.
 *
 * DADOS BANCÁRIOS só aparecem com `usuarios.dados_bancarios`: sem a permissão, o servidor nem
 * manda o dado (`dadosBancarios` chega `undefined`), e esta aba mostra o aviso.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { descreverDadosBancarios, formatarCep, formatarCpf, formatarTelefone } from '@/domain/cadastro'
import type { AbaCadastro as DadosAbaCadastro } from '@/server/admin/ficha'
import { editarCadastroNoPainel, editarDadosBancariosNoPainel } from '@/server/actions/admin/usuarios'

import { useAdmin } from '../AdminProvider'
import { Indisponivel } from '../Blocos'
import { dataHora } from '../formatos'

const CANAL: Record<string, string> = {
  cadastro_email: 'Cadastro por e-mail',
  cadastro_google: 'Cadastro com Google',
  entrada: 'Na entrada',
  banner_atualizacao: 'Faixa de termos atualizados',
  conta_documentos: 'Minha conta',
  admin: 'Pelo painel',
}

function Par({ rotulo, children }: { rotulo: string; children: ReactNode }): ReactNode {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

export function AbaCadastro({ email, nome, dados, semBanco }: { email: string; nome: string; dados: DadosAbaCadastro; semBanco: boolean }): ReactNode {
  const { pode } = useAdmin()
  const [editando, setEditando] = useState(false)
  const c = dados.cadastro

  return (
    <>
      <div className="adm-cartao-papel" style={{ padding: 0, border: 0 }}>
        <div className="adm-topo-ficha" style={{ marginBottom: 6 }}>
          <div className="adm-subtitulo" style={{ margin: 0 }}>
            Dados pessoais
          </div>
          {pode('usuarios.editar') ? (
            <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEditando(!editando)}>
              {editando ? 'Fechar edição' : 'Editar cadastro'}
            </button>
          ) : null}
        </div>
        {editando ? (
          <EditarCadastro email={email} nome={nome} dados={dados} aoSalvar={() => setEditando(false)} />
        ) : c ? (
          <dl className="adm-pares">
            <Par rotulo="Nome completo">{c.nomeCompleto}</Par>
            <Par rotulo="CPF">{formatarCpf(c.cpf)}</Par>
            <Par rotulo="Nascimento">{c.dataNascimento.split('-').reverse().join('/')}</Par>
            <Par rotulo="Telefone">{formatarTelefone(c.telefone)}</Par>
            <Par rotulo="Endereço">
              {`${c.endereco.logradouro}, ${c.endereco.numero}${c.endereco.complemento ? ` — ${c.endereco.complemento}` : ''} · ${c.endereco.bairro} · ${c.endereco.cidade}/${c.endereco.uf} · CEP ${formatarCep(c.endereco.cep)}`}
            </Par>
            <Par rotulo="Cadastro concluído em">{dataHora(c.completadoEm)}</Par>
          </dl>
        ) : (
          <p className="adm-fraco">A conta ainda não preencheu o cadastro formal.</p>
        )}
      </div>

      <div className="adm-subtitulo">Dados bancários</div>
      {dados.dadosBancarios === undefined ? (
        <p className="adm-fraco">Seu papel no painel não inclui ver dados bancários.</p>
      ) : (
        <DadosBancarios email={email} dados={dados.dadosBancarios} temCadastro={Boolean(c)} podeEditar={pode('usuarios.editar')} />
      )}

      <div className="adm-subtitulo">Aceites dos documentos</div>
      {dados.aceites ? (
        dados.aceites.length ? (
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Versão</th>
                  <th>Canal</th>
                  <th>Quando</th>
                  <th>IP</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {dados.aceites.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.documento.replace(/_/g, ' ')}
                      {a.documento === 'clausula_arbitragem' && a.nomeDigitado ? <div className="adm-fraco">assinada como {a.nomeDigitado}</div> : null}
                    </td>
                    <td>{a.versao}</td>
                    <td>{CANAL[a.canal] ?? a.canal}</td>
                    <td>{dataHora(a.createdAt)}</td>
                    <td className="adm-mono">{a.ip ?? '—'}</td>
                    <td className="adm-mono">{a.hash.slice(0, 16)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="adm-fraco">
              Cláusula de arbitragem: {dados.aceites.some((a) => a.documento === 'clausula_arbitragem') ? 'assinada' : 'não assinada'}.
            </p>
          </div>
        ) : (
          <p className="adm-fraco">Nenhum aceite registrado para esta conta.</p>
        )
      ) : (
        <>
          {dados.aceiteAntigo ? (
            <dl className="adm-pares">
              <Par rotulo="Termos de Uso">versão {dados.aceiteAntigo.termsVersion}</Par>
              <Par rotulo="Política de Privacidade">versão {dados.aceiteAntigo.privacyVersion}</Par>
              <Par rotulo="Aceito em">{dataHora(Date.parse(dados.aceiteAntigo.acceptedAt))}</Par>
            </dl>
          ) : (
            <p className="adm-fraco">Sem aceite registrado nas preferências da conta.</p>
          )}
          <Indisponivel
            titulo="Registro formal dos aceites"
            quando={
              semBanco
                ? 'Existe só com banco configurado.'
                : 'Disponível depois da A3: documento, versão, canal, data e hora, IP, hash e a assinatura da cláusula de arbitragem.'
            }
          />
        </>
      )}

      <div className="adm-subtitulo">Login (Supabase Auth)</div>
      {dados.identidadeIndisponivel ? (
        <p className="adm-fraco">{dados.identidadeIndisponivel}</p>
      ) : dados.identidade ? (
        <dl className="adm-pares">
          <Par rotulo="Criado em">{dataHora(dados.identidade.criadaEm ? Date.parse(dados.identidade.criadaEm) : null)}</Par>
          <Par rotulo="E-mail confirmado em">{dataHora(dados.identidade.confirmadaEm ? Date.parse(dados.identidade.confirmadaEm) : null)}</Par>
          <Par rotulo="Último login">{dataHora(dados.identidade.ultimoLogin ? Date.parse(dados.identidade.ultimoLogin) : null)}</Par>
          <Par rotulo="Entra por">{dados.identidade.provedores.join(', ')}</Par>
          <Par rotulo="Bloqueio">{dados.identidade.bloqueadaAte ? `bloqueado até ${dataHora(Date.parse(dados.identidade.bloqueadaAte))}` : 'sem bloqueio'}</Par>
        </dl>
      ) : (
        <p className="adm-fraco">Esta conta não tem login no Supabase Auth — é do catálogo de demonstração ou ainda não criou senha.</p>
      )}

      <div className="adm-subtitulo">Ativação</div>
      {dados.historicoSituacao === null ? (
        <p className="adm-fraco">{semBanco ? 'O histórico de ativação existe só com banco configurado.' : 'Histórico de ativação indisponível.'}</p>
      ) : dados.historicoSituacao.length ? (
        <ul className="adm-lista">
          {dados.historicoSituacao.map((s, i) => (
            <li key={i}>
              {s.ativa ? 'Reativada' : 'Desativada'} por {s.autor} em {dataHora(s.em)}
              {s.motivo ? ` — ${s.motivo}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-fraco">Ativa desde a criação.</p>
      )}
    </>
  )
}

function EditarCadastro({ email, nome, dados, aoSalvar }: { email: string; nome: string; dados: DadosAbaCadastro; aoSalvar: () => void }): ReactNode {
  const { run } = useAdmin()
  const c = dados.cadastro
  const [campos, setCampos] = useState({
    nome,
    cpf: c ? formatarCpf(c.cpf) : '',
    nomeCompleto: c?.nomeCompleto ?? '',
    dataNascimento: c?.dataNascimento ?? '',
    telefone: c ? formatarTelefone(c.telefone) : '',
    logradouro: c?.endereco.logradouro ?? '',
    numero: c?.endereco.numero ?? '',
    complemento: c?.endereco.complemento ?? '',
    bairro: c?.endereco.bairro ?? '',
    cidade: c?.endereco.cidade ?? '',
    uf: c?.endereco.uf ?? '',
    cep: c ? formatarCep(c.endereco.cep) : '',
  })
  const [ocupado, setOcupado] = useState(false)
  const campo = (chave: keyof typeof campos, rotulo: string, extra: { largo?: boolean; tipo?: string } = {}): ReactNode => (
    <div className={extra.largo ? 'field adm-campo-largo' : 'field'}>
      <label htmlFor={`cadastro-${chave}`}>{rotulo}</label>
      <input
        id={`cadastro-${chave}`}
        className="tinput"
        type={extra.tipo ?? 'text'}
        value={campos[chave]}
        onChange={(e) => setCampos({ ...campos, [chave]: e.target.value })}
      />
    </div>
  )

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setOcupado(true)
        const r = await run(() =>
          editarCadastroNoPainel(email, {
            nome: campos.nome,
            cpf: campos.cpf,
            nomeCompleto: campos.nomeCompleto,
            dataNascimento: campos.dataNascimento,
            telefone: campos.telefone,
            endereco: { logradouro: campos.logradouro, numero: campos.numero, complemento: campos.complemento, bairro: campos.bairro, cidade: campos.cidade, uf: campos.uf, cep: campos.cep },
          }),
        )
        setOcupado(false)
        if (r.ok) aoSalvar()
      }}
    >
      <p className="adm-fraco">
        Qualquer campo pode ser corrigido, inclusive o CPF. O nome de exibição é o que aparece no topo do app.
      </p>
      <div className="adm-form">
        {campo('nome', 'Nome de exibição', { largo: true })}
        {campo('nomeCompleto', 'Nome completo', { largo: true })}
        {campo('cpf', 'CPF')}
        {campo('dataNascimento', 'Nascimento', { tipo: 'date' })}
        {campo('telefone', 'Telefone')}
      </div>
      <div className="adm-form">
        {campo('logradouro', 'Logradouro', { largo: true })}
        {campo('numero', 'Número')}
        {campo('complemento', 'Complemento')}
        {campo('bairro', 'Bairro')}
        {campo('cidade', 'Cidade')}
        {campo('uf', 'UF')}
        {campo('cep', 'CEP')}
      </div>
      <div className="adm-acoes">
        <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado} data-uso="usuarios-editar-cadastro">
          {ocupado ? 'Salvando…' : 'Salvar cadastro'}
        </button>
      </div>
    </form>
  )
}

function DadosBancarios({
  email,
  dados,
  temCadastro,
  podeEditar,
}: {
  email: string
  dados: DadosAbaCadastro['dadosBancarios']
  temCadastro: boolean
  podeEditar: boolean
}): ReactNode {
  const { run } = useAdmin()
  const [editando, setEditando] = useState(false)
  const [campos, setCampos] = useState({
    chavePix: dados?.chavePix ?? '',
    tipoChavePix: dados?.tipoChavePix ?? '',
    banco: dados?.banco ?? '',
    agencia: dados?.agencia ?? '',
    conta: dados?.conta ?? '',
    tipoConta: dados?.tipoConta ?? '',
  })

  return (
    <>
      <p>{descreverDadosBancarios(dados ?? undefined)}</p>
      {podeEditar && temCadastro ? (
        editando ? (
          <form
            className="adm-form"
            onSubmit={async (e) => {
              e.preventDefault()
              const r = await run(() => editarDadosBancariosNoPainel(email, campos))
              if (r.ok) setEditando(false)
            }}
          >
            <div className="field adm-campo-largo">
              <label htmlFor="banco-pix">Chave Pix</label>
              <input id="banco-pix" className="tinput" value={campos.chavePix} onChange={(e) => setCampos({ ...campos, chavePix: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="banco-tipo-pix">Tipo da chave</label>
              <select id="banco-tipo-pix" className="tinput" value={campos.tipoChavePix} onChange={(e) => setCampos({ ...campos, tipoChavePix: e.target.value })}>
                <option value="">—</option>
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Aleatória</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="banco-banco">Banco</label>
              <input id="banco-banco" className="tinput" value={campos.banco} onChange={(e) => setCampos({ ...campos, banco: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="banco-agencia">Agência</label>
              <input id="banco-agencia" className="tinput" value={campos.agencia} onChange={(e) => setCampos({ ...campos, agencia: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="banco-conta">Conta</label>
              <input id="banco-conta" className="tinput" value={campos.conta} onChange={(e) => setCampos({ ...campos, conta: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="banco-tipo-conta">Tipo de conta</label>
              <select id="banco-tipo-conta" className="tinput" value={campos.tipoConta} onChange={(e) => setCampos({ ...campos, tipoConta: e.target.value })}>
                <option value="">—</option>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>
            <div className="adm-acoes">
              <button type="submit" className="btn btn-gold adm-btn-compacto">
                Salvar dados bancários
              </button>
              <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="adm-acoes">
            <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEditando(true)}>
              Editar dados bancários
            </button>
          </div>
        )
      ) : null}
      {podeEditar && !temCadastro ? <p className="adm-fraco">Os dados bancários são gravados junto com o cadastro: preencha o cadastro antes.</p> : null}
    </>
  )
}
