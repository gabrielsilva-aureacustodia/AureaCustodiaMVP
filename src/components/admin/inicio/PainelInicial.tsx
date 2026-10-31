/**
 * O painel inicial do admin — uma home só, em três composições (plano do Admin, seção
 * 1.4, e a seção 8.4 da arquitetura de referência):
 *
 *  - `gestao` (sócios): resultados do mês primeiro;
 *  - `operacional` (bancada e logística): o que está esperando agora, primeiro;
 *  - `desenvolvimento` (dev): a saúde do painel primeiro.
 *
 * A VARIANTE ORGANIZA, NÃO CONCEDE. Cada seção só existe se a página a carregou, e a
 * página só carrega o que a permissão do membro alcança. Um sócio sem `bancada.ver` não
 * vê a seção de operação em nenhuma variante.
 *
 * CENTRAL DE TRABALHO (25/10/2026, polimento do painel). Antes das seções, uma fila "Pede ação
 * agora": cada alerta que o painel JÁ calculava (saques esperando, envios na bancada, retiradas a
 * separar, faturas atrasadas, livro-razão quebrado) vira uma linha com o número, o que ele
 * significa e o botão do próximo passo, que leva à lista já filtrada. O que está zerado desce para
 * "Em dia", em uma linha só — o padrão "pede ação × em dia" dos painéis de operação estudados em
 * docs/polimento/admin/BENCHMARK.md. Nenhum número novo: tudo sai de `dados` e `saques`, que a
 * página já carregava conforme a permissão.
 *
 * DUAS ZONAS (25/10/2026, rodada 2). À esquerda, o trabalho: a fila "Pede ação agora" e a primeira
 * seção da variante do papel; à direita, o contexto: as outras seções. A fila de saques e o "Ir
 * para" vêm embaixo, na largura toda. Os números que pedem
 * ação viram links para a lista que os explica (só quando o papel abre aquela lista).
 *
 * Sem 'use client': desenhado no servidor.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { temPermissao, type ChavePermissao, type MembroAdmin } from '@/domain/admin/permissoes'
import type { DadosPainelInicial } from '@/server/admin/resultados'
import type { DadosDaFilaDeSaques } from '@/server/admin/saques'

import { dataHora, dinheiro, numero } from '../formatos'
import type { ItemNav } from '../navegacao'
import { Indicador, Secao, Vazio, TabelaRolavel } from '../Pecas'
import { SecaoDeSaques } from '../saques/SecaoDeSaques'

type SecaoInicio = 'resultados' | 'operacao' | 'sistema' | 'atalhos'

interface Pendencia {
  chave: string
  quantidade: number
  /** O que é, no plural de quem lê o número. */
  titulo: string
  /** Por que importa e o que fazer, numa frase. */
  explicacao: string
  acao: string
  href: string
  /** A lista de destino confere esta permissão; sem ela o botão não aparece. */
  permissao: ChavePermissao
  urgente: boolean
  /** Texto do selo "Em dia" quando zerado. */
  emDia: string
}

/** Monta a fila a partir do que a página já carregou — nada é lido aqui. */
function pendencias(dados: DadosPainelInicial, saques: DadosDaFilaDeSaques | null): Pendencia[] {
  const lista: Pendencia[] = []
  if (saques) {
    const r = saques.resumo
    lista.push({
      chave: 'saques',
      quantidade: r.quantidade,
      titulo: r.quantidade === 1 ? 'saque esperando a equipe' : 'saques esperando a equipe',
      explicacao: `${dinheiro(r.valorLiquido)} a pagar. O dinheiro já saiu do saldo do cliente${r.atrasados ? `; ${numero(r.atrasados)} passou(aram) do prazo D+3 prometido` : ''}.`,
      acao: 'Abrir a fila de saques',
      href: '/admin/saques',
      permissao: 'saques.ver',
      urgente: r.atrasados > 0,
      emDia: 'Nenhum saque esperando',
    })
  }
  if (dados.operacao) {
    const o = dados.operacao
    lista.push({
      chave: 'bancada',
      quantidade: o.aguardandoBancada,
      titulo: o.aguardandoBancada === 1 ? 'envio esperando a bancada' : 'envios esperando a bancada',
      explicacao: 'Recebidos ou em análise: a moeda só entra no acervo do cliente depois do fechamento da análise.',
      acao: 'Abrir a bancada',
      href: '/admin/bancada',
      permissao: 'bancada.ver',
      urgente: false,
      emDia: 'Bancada sem fila',
    })
    lista.push({
      chave: 'retiradas',
      quantidade: o.retiradasASeparar,
      titulo: o.retiradasASeparar === 1 ? 'retirada paga a separar' : 'retiradas pagas a separar',
      explicacao: 'O cliente já pagou a retirada: separar a moeda, emitir a etiqueta e postar.',
      acao: 'Ver as retiradas',
      href: '/admin/logistica?ver=retiradas',
      permissao: 'logistica.ver',
      urgente: false,
      emDia: 'Nenhuma retirada a separar',
    })
  }
  if (dados.resultados) {
    const n = dados.resultados.faturasAtrasadas
    lista.push({
      chave: 'faturas',
      quantidade: n,
      titulo: n === 1 ? 'fatura de custódia atrasada' : 'faturas de custódia atrasadas',
      explicacao: 'Passaram do vencimento: a moeda do cliente fica travada para negociação até ele pagar.',
      acao: 'Ver contas inadimplentes',
      href: '/admin/usuarios?inadimplente=1',
      permissao: 'usuarios.ver',
      urgente: n > 0,
      emDia: 'Nenhuma fatura atrasada',
    })
  }
  if (dados.sistema?.cadeiaOk === false) {
    lista.push({
      chave: 'cadeia',
      quantidade: 1,
      titulo: 'quebra na cadeia do livro-razão',
      explicacao: 'Um lançamento não confere com o hash do anterior. Confira no Financeiro antes de qualquer fechamento.',
      acao: 'Conferir o livro-razão',
      href: '/admin/resultados/financeiro',
      permissao: 'resultados.ver',
      urgente: true,
      emDia: '',
    })
  }
  return lista
}

const ORDEM: Record<MembroAdmin['papel']['variantePainel'], readonly SecaoInicio[]> = {
  gestao: ['resultados', 'operacao', 'atalhos', 'sistema'],
  operacional: ['operacao', 'atalhos', 'resultados', 'sistema'],
  desenvolvimento: ['sistema', 'resultados', 'operacao', 'atalhos'],
}

export function PainelInicial({
  membro,
  dados,
  atalhos,
  saques = null,
  podePagarSaques = false,
}: {
  membro: MembroAdmin
  dados: DadosPainelInicial
  atalhos: readonly ItemNav[]
  saques?: DadosDaFilaDeSaques | null
  podePagarSaques?: boolean
}): ReactNode {
  const pode = (p: ChavePermissao): boolean => temPermissao(membro, p)
  const se = (p: ChavePermissao, href: string): string | undefined => (pode(p) ? href : undefined)

  const secoes: Record<Exclude<SecaoInicio, 'atalhos'>, ReactNode> = {
    resultados: dados.resultados ? (
      <Secao
        key="resultados"
        id="inicio-resultados"
        titulo={`Resultados de ${dados.resultados.rotulo}`}
        descricao="Do livro-razão do mês corrente."
        acoes={
          <Link href="/admin/resultados/financeiro" className="btn btn-outline">
            Abrir o Financeiro
          </Link>
        }
      >
        <div className="adm-inds">
          <Indicador rotulo="Receita bruta" valor={dinheiro(dados.resultados.receitaBruta)} tom="ouro" />
          <Indicador rotulo="Resultado líquido" valor={dinheiro(dados.resultados.resultadoLiquido)} tom={dados.resultados.resultadoLiquido < 0 ? 'alerta' : 'neutro'} />
          <Indicador rotulo="Negociações" valor={numero(dados.resultados.negociacoes)} detalhe={`volume ${dinheiro(dados.resultados.volume)}`} href={se('resultados.ver', '/admin/resultados/kpis')} />
          <Indicador rotulo="Moedas em custódia" valor={numero(dados.resultados.moedasEmCustodia)} href={se('bancada.auditoria', '/admin/moedas')} />
          <Indicador
            rotulo="Faturas atrasadas"
            valor={numero(dados.resultados.faturasAtrasadas)}
            tom={dados.resultados.faturasAtrasadas ? 'alerta' : 'ok'}
            href={dados.resultados.faturasAtrasadas ? se('usuarios.ver', '/admin/usuarios?inadimplente=1') : undefined}
          />
        </div>
      </Secao>
    ) : null,
    operacao: dados.operacao ? (
      <Secao key="operacao" id="inicio-operacao" titulo="Operação agora" descricao="Envios e retiradas de todas as contas, neste momento.">
        <div className="adm-inds">
          <Indicador rotulo="Esperando a bancada" valor={numero(dados.operacao.aguardandoBancada)} detalhe="recebidos ou em análise" tom={dados.operacao.aguardandoBancada ? 'atencao' : 'neutro'} href={se('bancada.ver', '/admin/bancada')} />
          <Indicador rotulo="Envios a caminho" valor={numero(dados.operacao.aCaminho)} detalhe="postados pelo cliente" href={se('logistica.ver', '/admin/logistica?ver=envios')} />
          <Indicador rotulo="Retiradas a separar" valor={numero(dados.operacao.retiradasASeparar)} detalhe="pagas ou em separação" tom={dados.operacao.retiradasASeparar ? 'atencao' : 'neutro'} href={se('logistica.ver', '/admin/logistica?ver=retiradas')} />
          <Indicador rotulo="Retiradas postadas" valor={numero(dados.operacao.retiradasPostadas)} detalhe="a caminho do cliente" href={se('logistica.ver', '/admin/logistica?ver=retiradas&situacao=todos')} />
        </div>
      </Secao>
    ) : null,
    sistema: dados.sistema ? (
      <Secao key="sistema" id="inicio-sistema" titulo="Saúde do painel" descricao="Banco, cadeia do livro-razão, registro de uso e o seu acesso.">
        <div className="adm-inds">
          <Indicador rotulo="Banco de dados" valor={dados.sistema.bancoConfigurado ? 'conectado' : 'sem banco'} tom={dados.sistema.bancoConfigurado ? 'ok' : 'alerta'} detalhe={dados.sistema.bancoConfigurado ? undefined : 'falta POSTGRES_URL'} />
          <Indicador
            rotulo="Cadeia do livro-razão"
            valor={dados.sistema.cadeiaOk === null ? '—' : dados.sistema.cadeiaOk ? 'íntegra' : 'quebrada'}
            tom={dados.sistema.cadeiaOk === false ? 'alerta' : dados.sistema.cadeiaOk ? 'ok' : 'neutro'}
            detalhe={dados.sistema.cadeiaOk === null ? 'conferida na Central de Resultados' : undefined}
          />
          <Indicador rotulo="Registro de uso, 24 h" valor={numero(dados.sistema.eventosUltimas24h)} detalhe="páginas e cliques anotados" href={se('resultados.ver', '/admin/resultados/uso')} />
          <Indicador rotulo="Seu acesso" valor={membro.papel.nome} detalhe={membro.origem === 'ambiente' ? 'pela lista do ambiente' : 'cadastrado na equipe'} />
        </div>
        {dados.sistema.ultimasAcoesDoPainel ? (
          <>
            <h3 className="adm-subtitulo">Últimas ações no painel</h3>
            {dados.sistema.ultimasAcoesDoPainel.length ? (
              <TabelaRolavel rotulo="Últimas ações no painel: quando, quem e o quê">
                <table className="audit-table">
                  <caption className="adm-sr">Últimas ações no painel: quando, quem e o quê</caption>
                  <thead>
                    <tr>
                      <th scope="col">Quando</th>
                      <th scope="col">Quem</th>
                      <th scope="col">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.sistema.ultimasAcoesDoPainel.map((a) => (
                      <tr key={a.id}>
                        <td className="adm-fraco">{dataHora(a.createdAt)}</td>
                        <td>{a.ator}</td>
                        <td className="adm-mono">{a.acao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabelaRolavel>
            ) : (
              <Vazio titulo="Nenhuma ação registrada no painel ainda.">Toda ação da equipe aparece aqui, com quem fez.</Vazio>
            )}
          </>
        ) : null}
      </Secao>
    ) : null,
  }

  const todas = pendencias(dados, saques)
  const abertas = todas.filter((p) => p.quantidade > 0).sort((x, y) => Number(y.urgente) - Number(x.urgente))
  const emDia = todas.filter((p) => p.quantidade === 0 && p.emDia)
  const ordem = ORDEM[membro.papel.variantePainel].filter((s): s is Exclude<SecaoInicio, 'atalhos'> => s !== 'atalhos' && !!secoes[s as Exclude<SecaoInicio, 'atalhos'>])
  // A primeira seção da variante fica na zona principal; as outras vão para a lateral.
  const [principal, ...laterais] = ordem

  return (
    <>
      <p className="adm-saudacao">
        <span>
          Olá, <b>{membro.nome.split(' ')[0]}</b>.
        </span>
        <span>
          Seu papel é <b>{membro.papel.nome}</b>, com {numero(membro.permissoes.length)} permissão(ões)
          {membro.origem === 'ambiente' ? ', pela lista de administradores do ambiente' : ''}. O menu mostra só o que ele alcança.
        </span>
      </p>

      <div className="adm-zonas">
        <div className="adm-zona-principal">
          {todas.length ? (
            <Secao
              id="inicio-pendencias"
              titulo={abertas.length ? 'Pede ação agora' : 'Tudo em dia'}
              descricao={abertas.length ? 'O mais urgente primeiro. Cada botão abre a lista já filtrada.' : 'Nenhuma fila esperando a equipe neste momento.'}
              aberta
            >
              {abertas.length ? (
                <ul className="adm-fila">
                  {abertas.map((p) => (
                    <li key={p.chave} className={p.urgente ? 'adm-fila-item adm-urgente' : 'adm-fila-item'}>
                      <span className="adm-fila-num">{numero(p.quantidade)}</span>
                      <span className="adm-fila-texto">
                        <b>
                          {p.titulo}
                          {p.urgente ? <span className="adm-sr"> (urgente)</span> : null}
                        </b>
                        <span>{p.explicacao}</span>
                      </span>
                      {pode(p.permissao) ? (
                        <Link href={p.href} className={p.urgente ? 'btn btn-gold' : 'btn btn-outline'} data-uso={`inicio-admin:pendencia:${p.chave}`}>
                          {p.acao}
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {emDia.length ? (
                <ul className="adm-em-dia" aria-label="Em dia">
                  {emDia.map((p) => (
                    <li key={p.chave}>{p.emDia}</li>
                  ))}
                </ul>
              ) : null}
            </Secao>
          ) : null}

          {principal ? secoes[principal] : null}
        </div>

        <aside className="adm-zona-lateral" aria-label="Contexto">
          {laterais.map((s) => secoes[s])}
        </aside>
      </div>

      {/* A fila de saques ocupa a largura toda: sete colunas não cabem ao lado da lateral. */}
      {saques && saques.resumo.quantidade > 0 ? <SecaoDeSaques dados={saques} podePagar={podePagarSaques} compacto /> : null}
      {atalhos.length ? (
        <Secao id="inicio-atalhos" titulo="Ir para" descricao="As áreas que o seu papel abre — as mesmas do menu, com o que se faz em cada uma.">
          <ul className="adm-atalhos adm-atalhos-grade">
            {atalhos.map((a) => (
              <li key={a.href}>
                <Link href={a.href} data-uso={`inicio-admin:${a.href}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {a.icone}
                  </svg>
                  <span>
                    <b>{a.titulo}</b>
                    <span>{a.subtitulo}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}
    </>
  )
}
