'use client'

/**
 * Equipe e papéis — quem acessa o painel e o que cada papel pode fazer.
 *
 * É a tela que torna os papéis "ajustáveis pelo próprio painel, sem deploy" (plano do
 * Admin, seção 1.2): dar acesso a alguém, trocar o papel, desativar, criar um papel
 * "contador" que só vê resultados e lança despesas.
 *
 *  - Membros: `admin.membros`.
 *  - Papéis: `admin.papeis`.
 * Quem tem só uma das duas vê a outra parte em modo leitura. Toda mudança passa pela
 * Server Action, que confere a permissão de novo e grava a trilha.
 *
 * SEM CONFIRMAÇÃO OBRIGATÓRIA. A mudança vale na hora e fica na trilha com antes e
 * depois — desfazer é outra mudança. As únicas recusas são as que protegem o próprio
 * painel: o papel dev tem todas as permissões, e nunca pode faltar um dev ativo.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { MODULOS, PERMISSOES, SLUG_DEV, VARIANTES, type VariantePainel } from '@/domain/admin/permissoes'
import type { VisaoEquipe } from '@/server/admin/rbac'
import {
  adicionarMembroNoPainel,
  alterarMembroNoPainel,
  alterarPapelNoPainel,
  criarPapelNoPainel,
  excluirPapelNoPainel,
} from '@/server/actions/admin/equipe'

import { useAdmin } from '../AdminProvider'
import { dataHora, numero } from '../formatos'

const ROTULO_VARIANTE: Record<VariantePainel, string> = {
  desenvolvimento: 'Desenvolvimento — governança do sistema',
  gestao: 'Gestão — indicadores dos sócios',
  operacional: 'Operacional — execução do dia',
}

export function PainelEquipe({ equipe, semBanco }: { equipe: VisaoEquipe; semBanco: boolean }): ReactNode {
  const { pode } = useAdmin()
  return (
    <>
      {semBanco ? (
        <div className="note adm-secao">
          <span>
            Este ambiente está sem <code>POSTGRES_URL</code>: não há tabela de membros nem de papéis. Entra no painel, como
            dev, quem está na lista do ambiente — abaixo.
          </span>
        </div>
      ) : null}
      <Membros equipe={equipe} podeEditar={pode('admin.membros') && !semBanco} />
      <Papeis equipe={equipe} podeEditar={pode('admin.papeis') && !semBanco} />
    </>
  )
}

/* ---------- membros ---------- */

function Membros({ equipe, podeEditar }: { equipe: VisaoEquipe; podeEditar: boolean }): ReactNode {
  const { run, membro } = useAdmin()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [papel, setPapel] = useState(equipe.papeis.find((p) => p.slug === 'socio')?.slug ?? equipe.papeis[0]?.slug ?? '')
  const [ocupado, setOcupado] = useState(false)

  async function adicionar(): Promise<void> {
    setOcupado(true)
    const r = await run(() => adicionarMembroNoPainel(email, nome, papel))
    setOcupado(false)
    if (r.ok) {
      setEmail('')
      setNome('')
    }
  }

  async function alterar(emailDoMembro: string, alteracoes: { papelSlug?: string; status?: string }): Promise<void> {
    setOcupado(true)
    await run(() => alterarMembroNoPainel(emailDoMembro, alteracoes))
    setOcupado(false)
  }

  const soAmbiente = equipe.bootstrap.filter((b) => !b.naTabela)

  return (
    <div className="panel adm-secao">
      <h3>Membros do painel</h3>
      <p className="adm-fraco adm-secao">
        Quem está aqui entra em <code>/admin</code> com o mesmo login do app, sem segunda senha. O papel decide o que cada um
        vê e faz. Desativar vale na tela seguinte da pessoa.
      </p>

      {podeEditar ? (
        <form
          className="adm-form"
          onSubmit={(e) => {
            e.preventDefault()
            void adicionar()
          }}
        >
          <div className="field adm-campo-largo">
            <label htmlFor="membro-email">E-mail</label>
            <input id="membro-email" type="email" className="tinput" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@aureacustodia.com.br" required />
          </div>
          <div className="field">
            <label htmlFor="membro-nome">Nome</label>
            <input id="membro-nome" className="tinput" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="membro-papel">Papel</label>
            <select id="membro-papel" className="tinput" value={papel} onChange={(e) => setPapel(e.target.value)}>
              {equipe.papeis.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={ocupado} data-uso="equipe:adicionar-membro">
            Dar acesso
          </button>
        </form>
      ) : null}

      {equipe.membros.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Membro</th>
                <th>Papel</th>
                <th>Situação</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {equipe.membros.map((m) => (
                <tr key={m.email} style={m.status === 'inativo' ? { opacity: 0.65 } : undefined}>
                  <td>
                    <b>{m.nomeExibicao || m.email}</b>
                    {m.email === membro.email ? <span className="pill n" style={{ marginLeft: 6 }}>você</span> : null}
                    <div className="adm-fraco">{m.email}</div>
                  </td>
                  <td>
                    {podeEditar ? (
                      <select
                        className="tinput"
                        style={{ minHeight: 44, marginBottom: 0, minWidth: 150 }}
                        value={m.papelSlug}
                        disabled={ocupado}
                        aria-label={`Papel de ${m.email}`}
                        onChange={(e) => void alterar(m.email, { papelSlug: e.target.value })}
                      >
                        {equipe.papeis.map((p) => (
                          <option key={p.slug} value={p.slug}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    ) : (
                      m.papelNome
                    )}
                  </td>
                  <td>
                    <span className="adm-acoes">
                      <span className={m.status === 'ativo' ? 'pill g' : 'pill n'}>{m.status}</span>
                      {podeEditar ? (
                        <button
                          type="button"
                          className="btn btn-outline adm-btn-compacto"
                          disabled={ocupado}
                          onClick={() => void alterar(m.email, { status: m.status === 'ativo' ? 'inativo' : 'ativo' })}
                        >
                          {m.status === 'ativo' ? 'Desativar' : 'Reativar'}
                        </button>
                      ) : null}
                    </span>
                  </td>
                  <td className="adm-fraco">
                    {dataHora(m.createdAt)} · {m.criadoPor}
                    {m.atualizadoEm ? <div>alterado em {dataHora(m.atualizadoEm)} · {m.atualizadoPor}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nenhum membro cadastrado na tabela ainda. Por enquanto, entra quem está na lista do ambiente.</div>
      )}

      {soAmbiente.length ? (
        <>
          <h4 className="adm-subtitulo">Entram pela lista do ambiente, como dev</h4>
          <p className="adm-fraco adm-secao">
            São os e-mails de <code>AUREA_ADMIN_EMAILS</code> — ou, sem a variável, as contas de demonstração. Definir um papel
            para um deles cadastra a pessoa na tabela, e a partir daí vale o papel escolhido.
          </p>
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Papel</th>
                </tr>
              </thead>
              <tbody>
                {soAmbiente.map((b) => (
                  <tr key={b.email}>
                    <td>
                      <b>{b.nome || b.email}</b>
                      <div className="adm-fraco">{b.email}</div>
                    </td>
                    <td>
                      {podeEditar ? (
                        <select
                          className="tinput"
                          style={{ minHeight: 44, marginBottom: 0, minWidth: 150 }}
                          value={SLUG_DEV}
                          disabled={ocupado}
                          aria-label={`Papel de ${b.email}`}
                          onChange={(e) => void alterar(b.email, { papelSlug: e.target.value })}
                        >
                          {equipe.papeis.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        'Desenvolvimento (pelo ambiente)'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}

/* ---------- papéis ---------- */

function MatrizDePermissoes({
  marcadas,
  aoMudar,
  desabilitado,
  prefixo,
}: {
  marcadas: readonly string[]
  aoMudar: (lista: string[]) => void
  desabilitado: boolean
  prefixo: string
}): ReactNode {
  const conjunto = new Set(marcadas)
  return (
    <div className="adm-matriz">
      {MODULOS.map((m) => (
        <div key={m.modulo} style={{ display: 'contents' }}>
          <div className="adm-matriz-modulo">{m.rotulo}</div>
          {PERMISSOES.filter((p) => p.modulo === m.modulo).map((p) => (
            <label key={p.chave} className="adm-check" title={p.descricao}>
              <input
                type="checkbox"
                id={`${prefixo}-${p.chave}`}
                checked={conjunto.has(p.chave)}
                disabled={desabilitado}
                onChange={(e) => {
                  const nova = new Set(conjunto)
                  if (e.target.checked) nova.add(p.chave)
                  else nova.delete(p.chave)
                  aoMudar(PERMISSOES.map((x) => x.chave).filter((c) => nova.has(c)))
                }}
              />
              <span>{p.rotulo}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

function Papeis({ equipe, podeEditar }: { equipe: VisaoEquipe; podeEditar: boolean }): ReactNode {
  return (
    <div className="panel adm-secao">
      <h3>Papéis e permissões</h3>
      <p className="adm-fraco adm-secao">
        O menu, as telas e as ações perguntam pela permissão, não pelo nome do papel: um papel novo com &ldquo;Ver a Central
        de Resultados&rdquo; já enxerga o Financeiro. A ordem (rank) só organiza esta lista. O papel dev tem todas as
        permissões, sempre — é por ele que a equipe é administrada.
      </p>
      {podeEditar ? <NovoPapel /> : null}
      {equipe.papeis.map((p) => (
        <CartaoPapel key={`${p.slug}:${p.nome}:${p.rank}:${p.variantePainel}:${p.permissoes.join(',')}:${p.membros}`} papel={p} podeEditar={podeEditar} />
      ))}
    </div>
  )
}

function NovoPapel(): ReactNode {
  const { run } = useAdmin()
  const [aberto, setAberto] = useState(false)
  const [slug, setSlug] = useState('')
  const [nome, setNome] = useState('')
  const [rank, setRank] = useState('20')
  const [variante, setVariante] = useState<VariantePainel>('gestao')
  const [permissoes, setPermissoes] = useState<string[]>(['resultados.ver'])
  const [ocupado, setOcupado] = useState(false)

  if (!aberto) {
    return (
      <div className="adm-acoes adm-secao">
        <button type="button" className="btn btn-gold adm-btn-compacto" onClick={() => setAberto(true)} aria-expanded={false}>
          Criar papel
        </button>
      </div>
    )
  }

  async function criar(): Promise<void> {
    setOcupado(true)
    const r = await run(() => criarPapelNoPainel({ slug, nome, rank: Number(rank), variantePainel: variante, permissoes }))
    setOcupado(false)
    if (r.ok) setAberto(false)
  }

  return (
    <div className="adm-cartao-papel">
      <h4>Novo papel</h4>
      <div className="adm-form">
        <div className="field">
          <label htmlFor="papel-nome">Nome</label>
          <input id="papel-nome" className="tinput" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="Contador" />
        </div>
        <div className="field">
          <label htmlFor="papel-slug">Identificador</label>
          <input id="papel-slug" className="tinput" value={slug} maxLength={40} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="contador" />
        </div>
        <div className="field">
          <label htmlFor="papel-rank">Ordem (rank)</label>
          <input id="papel-rank" className="tinput" inputMode="numeric" value={rank} onChange={(e) => setRank(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </div>
        <div className="field adm-campo-largo">
          <label htmlFor="papel-variante">Painel inicial</label>
          <select id="papel-variante" className="tinput" value={variante} onChange={(e) => setVariante(e.target.value as VariantePainel)}>
            {VARIANTES.map((v) => (
              <option key={v} value={v}>
                {ROTULO_VARIANTE[v]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <MatrizDePermissoes marcadas={permissoes} aoMudar={setPermissoes} desabilitado={ocupado} prefixo="novo" />
      <div className="adm-acoes">
        <button type="button" className="btn btn-gold adm-btn-compacto" disabled={ocupado} onClick={() => void criar()} data-uso="equipe:criar-papel">
          Criar
        </button>
        <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function CartaoPapel({ papel, podeEditar }: { papel: VisaoEquipe['papeis'][number]; podeEditar: boolean }): ReactNode {
  const { run } = useAdmin()
  const ehDev = papel.slug === SLUG_DEV
  const [nome, setNome] = useState(papel.nome)
  const [rank, setRank] = useState(String(papel.rank))
  const [variante, setVariante] = useState<VariantePainel>(papel.variantePainel)
  const [permissoes, setPermissoes] = useState<string[]>([...papel.permissoes])
  const [ocupado, setOcupado] = useState(false)

  const mudou =
    nome !== papel.nome || rank !== String(papel.rank) || variante !== papel.variantePainel || permissoes.join(',') !== papel.permissoes.join(',')

  async function salvar(): Promise<void> {
    setOcupado(true)
    await run(() =>
      alterarPapelNoPainel(papel.slug, {
        nome,
        rank: Number(rank),
        variantePainel: variante,
        ...(ehDev ? {} : { permissoes }),
      }),
    )
    setOcupado(false)
  }

  async function excluir(): Promise<void> {
    setOcupado(true)
    await run(() => excluirPapelNoPainel(papel.slug))
    setOcupado(false)
  }

  return (
    <div className="adm-cartao-papel">
      <h4>
        {papel.nome}
        <span className="pill n">{papel.slug}</span>
        {papel.sistema ? <span className="pill y">de sistema</span> : null}
        <span className="adm-fraco">
          rank {papel.rank} · {numero(papel.membros)} membro(s) · {numero(papel.permissoes.length)} permissão(ões)
        </span>
      </h4>
      {podeEditar ? (
        <div className="adm-form">
          <div className="field">
            <label htmlFor={`nome-${papel.slug}`}>Nome</label>
            <input id={`nome-${papel.slug}`} className="tinput" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`rank-${papel.slug}`}>Ordem (rank)</label>
            <input id={`rank-${papel.slug}`} className="tinput" inputMode="numeric" value={rank} onChange={(e) => setRank(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
          <div className="field adm-campo-largo">
            <label htmlFor={`variante-${papel.slug}`}>Painel inicial</label>
            <select id={`variante-${papel.slug}`} className="tinput" value={variante} onChange={(e) => setVariante(e.target.value as VariantePainel)}>
              {VARIANTES.map((v) => (
                <option key={v} value={v}>
                  {ROTULO_VARIANTE[v]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <p className="adm-fraco">{ROTULO_VARIANTE[papel.variantePainel]}</p>
      )}
      <MatrizDePermissoes marcadas={permissoes} aoMudar={setPermissoes} desabilitado={!podeEditar || ehDev || ocupado} prefixo={papel.slug} />
      {ehDev ? <p className="adm-fraco adm-secao">As permissões do dev não se editam: ele recebe todas, inclusive as que forem criadas depois.</p> : null}
      {podeEditar ? (
        <div className="adm-acoes">
          <button type="button" className="btn btn-gold adm-btn-compacto" disabled={!mudou || ocupado} onClick={() => void salvar()} data-uso="equipe:salvar-papel">
            Salvar alterações
          </button>
          {!papel.sistema ? (
            <button type="button" className="btn btn-outline adm-btn-compacto" disabled={ocupado} onClick={() => void excluir()} data-uso="equipe:excluir-papel">
              Excluir papel
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
