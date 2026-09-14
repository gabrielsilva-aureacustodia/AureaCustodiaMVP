/**
 * O topo da ficha: quem é a conta e o que chama atenção nela antes de qualquer aba — saldo,
 * moedas, faturas em aberto, inadimplência, situação e se é conta da equipe ou do catálogo de
 * demonstração. Sem 'use client'.
 */

import type { ReactNode } from 'react'

import type { CabecalhoFicha } from '@/server/admin/ficha'

import { Cartao } from '../Blocos'
import { data, dataHora, dinheiro, numero } from '../formatos'

export function CabecalhoDaFicha({ cabecalho }: { cabecalho: CabecalhoFicha }): ReactNode {
  const { resumo, situacao } = cabecalho
  return (
    <>
      <div className="adm-topo-ficha">
        <div>
          <h2>{resumo.nome}</h2>
          <div className="adm-fraco">
            {resumo.email}
            {cabecalho.criadaEm ? ` · conta criada em ${data(cabecalho.criadaEm)}` : ''}
          </div>
        </div>
        <div className="adm-etiquetas">
          {situacao.ativa ? <span className="pill g">Ativa</span> : <span className="pill adm-pill-vermelho">Desativada</span>}
          {resumo.inadimplente ? <span className="pill adm-pill-vermelho">Inadimplente{resumo.marcaManual ? ' (marca manual)' : ''}</span> : null}
          <span className={resumo.comCadastro ? 'pill g' : 'pill y'}>{resumo.comCadastro ? 'Cadastro completo' : 'Cadastro incompleto'}</span>
          {cabecalho.ehDaEquipe ? <span className="pill y">Equipe do painel</span> : null}
          {cabecalho.ehDoCatalogo ? <span className="pill n">Catálogo de demonstração</span> : null}
        </div>
      </div>

      {!situacao.ativa ? (
        <div className="note adm-secao">
          <span>
            Desativada por {situacao.autor ?? '—'} em {dataHora(situacao.em)}
            {situacao.motivo ? `: ${situacao.motivo}` : '.'}
          </span>
        </div>
      ) : null}

      <div className="adm-grade">
        <Cartao rotulo="Saldo" valor={dinheiro(resumo.saldo)} />
        <Cartao
          rotulo="Moedas na custódia"
          valor={numero(resumo.moedasCustodiadas)}
          detalhe={resumo.recibosBloqueados ? `${numero(resumo.recibosBloqueados)} recibo(s) bloqueado(s)` : undefined}
        />
        <Cartao
          rotulo="Faturas em aberto"
          valor={dinheiro(resumo.valorEmAberto)}
          detalhe={`${numero(resumo.faturasEmAberto.length)} fatura(s)`}
          tom={resumo.faturasEmAberto.some((f) => f.atrasada) ? 'alerta' : 'normal'}
        />
        <Cartao rotulo="Último acesso" valor={dataHora(resumo.ultimoAcesso)} detalhe={`anterior: ${dataHora(resumo.acessoAnterior)}`} />
      </div>
    </>
  )
}
