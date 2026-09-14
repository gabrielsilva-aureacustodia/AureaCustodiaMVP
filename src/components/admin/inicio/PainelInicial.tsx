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
 * Sem 'use client': desenhado no servidor.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { MembroAdmin } from '@/domain/admin/permissoes'
import type { DadosPainelInicial } from '@/server/admin/resultados'

import { Cartao } from '../Blocos'
import { dataHora, dinheiro, numero } from '../formatos'
import type { ItemNav } from '../navegacao'

type Secao = 'resultados' | 'operacao' | 'sistema' | 'atalhos'

const ORDEM: Record<MembroAdmin['papel']['variantePainel'], readonly Secao[]> = {
  gestao: ['resultados', 'operacao', 'atalhos', 'sistema'],
  operacional: ['operacao', 'atalhos', 'resultados', 'sistema'],
  desenvolvimento: ['sistema', 'resultados', 'operacao', 'atalhos'],
}

export function PainelInicial({ membro, dados, atalhos }: { membro: MembroAdmin; dados: DadosPainelInicial; atalhos: readonly ItemNav[] }): ReactNode {
  const secoes: Record<Secao, ReactNode> = {
    resultados: dados.resultados ? (
      <section key="resultados" className="adm-secao" aria-labelledby="inicio-resultados">
        <h3 className="adm-titulo-secao" id="inicio-resultados">
          Resultados de {dados.resultados.rotulo}
        </h3>
        <div className="adm-grade">
          <Cartao rotulo="Receita bruta" valor={dinheiro(dados.resultados.receitaBruta)} />
          <Cartao rotulo="Resultado líquido" valor={dinheiro(dados.resultados.resultadoLiquido)} tom={dados.resultados.resultadoLiquido < 0 ? 'alerta' : 'normal'} />
          <Cartao rotulo="Negociações" valor={numero(dados.resultados.negociacoes)} detalhe={`volume ${dinheiro(dados.resultados.volume)}`} />
          <Cartao rotulo="Moedas em custódia" valor={numero(dados.resultados.moedasEmCustodia)} />
          <Cartao rotulo="Faturas atrasadas" valor={numero(dados.resultados.faturasAtrasadas)} tom={dados.resultados.faturasAtrasadas ? 'alerta' : 'normal'} />
        </div>
      </section>
    ) : null,
    operacao: dados.operacao ? (
      <section key="operacao" className="adm-secao" aria-labelledby="inicio-operacao">
        <h3 className="adm-titulo-secao" id="inicio-operacao">
          Operação agora
        </h3>
        <div className="adm-grade">
          <Cartao rotulo="Envios esperando a bancada" valor={numero(dados.operacao.aguardandoBancada)} tom={dados.operacao.aguardandoBancada ? 'positivo' : 'normal'} detalhe="recebidos ou em análise" />
          <Cartao rotulo="Envios a caminho" valor={numero(dados.operacao.aCaminho)} detalhe="postados pelo cliente" />
          <Cartao rotulo="Retiradas a separar" valor={numero(dados.operacao.retiradasASeparar)} detalhe="pagas ou em separação" />
          <Cartao rotulo="Retiradas postadas" valor={numero(dados.operacao.retiradasPostadas)} detalhe="a caminho do cliente" />
        </div>
      </section>
    ) : null,
    sistema: dados.sistema ? (
      <section key="sistema" className="adm-secao" aria-labelledby="inicio-sistema">
        <h3 className="adm-titulo-secao" id="inicio-sistema">
          Saúde do painel
        </h3>
        <div className="adm-grade">
          <Cartao rotulo="Banco de dados" valor={dados.sistema.bancoConfigurado ? 'conectado' : 'sem POSTGRES_URL'} tom={dados.sistema.bancoConfigurado ? 'positivo' : 'alerta'} />
          <Cartao
            rotulo="Cadeia do livro-razão"
            valor={dados.sistema.cadeiaOk === null ? '—' : dados.sistema.cadeiaOk ? 'íntegra' : 'quebrada'}
            tom={dados.sistema.cadeiaOk === false ? 'alerta' : 'normal'}
            detalhe={dados.sistema.cadeiaOk === null ? 'conferida na Central de Resultados' : undefined}
          />
          <Cartao rotulo="Registro de uso, últimas 24 h" valor={numero(dados.sistema.eventosUltimas24h)} detalhe="páginas e cliques anotados" />
          <Cartao rotulo="Seu acesso" valor={membro.papel.nome} detalhe={membro.origem === 'ambiente' ? 'pela lista do ambiente' : 'cadastrado na equipe'} />
        </div>
        {dados.sistema.ultimasAcoesDoPainel ? (
          <div className="panel">
            <h3>Últimas ações no painel</h3>
            {dados.sistema.ultimasAcoesDoPainel.length ? (
              <div className="table-scroll">
                <table className="audit-table">
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
              </div>
            ) : (
              <div className="empty">Nenhuma ação registrada no painel ainda.</div>
            )}
          </div>
        ) : null}
      </section>
    ) : null,
    atalhos: atalhos.length ? (
      <section key="atalhos" className="adm-secao" aria-labelledby="inicio-atalhos">
        <h3 className="adm-titulo-secao" id="inicio-atalhos">
          Áreas do painel
        </h3>
        <div className="adm-grade">
          {atalhos.map((a) => (
            <Link key={a.href} href={a.href} className="adm-cartao adm-atalho" data-uso={`inicio-admin:${a.href}`}>
              <span className="adm-atalho-titulo">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {a.icone}
                </svg>
                {a.titulo}
              </span>
              <span className="adm-cartao-detalhe">{a.subtitulo}</span>
            </Link>
          ))}
        </div>
      </section>
    ) : null,
  }

  return (
    <>
      <div className="panel adm-secao">
        <h3>Olá, {membro.nome.split(' ')[0]}</h3>
        <p className="adm-fraco">
          Seu papel é <b>{membro.papel.nome}</b>, com {numero(membro.permissoes.length)} permissão(ões)
          {membro.origem === 'ambiente' ? ', pela lista de administradores do ambiente' : ''}. O menu mostra só o que ele alcança.
        </p>
      </div>
      {ORDEM[membro.papel.variantePainel].map((s) => secoes[s])}
    </>
  )
}
