/**
 * O topo da ficha: quem é a conta e o que chama atenção nela antes de qualquer aba — saldo,
 * moedas, faturas em aberto, inadimplência, situação e se é conta da equipe ou do catálogo de
 * demonstração. Sem 'use client'.
 *
 * Rodada 2 (25/10/2026): um cartão de identidade (iniciais, nome, e-mail, data de criação e os
 * selos de situação) seguido dos indicadores. A fatura atrasada leva direto à aba Financeiro.
 */

import type { ReactNode } from 'react'

import { initials } from '@/domain/codes'
import type { CabecalhoFicha } from '@/server/admin/ficha'

import { data, dataHora, dinheiro, numero } from '../formatos'
import { Indicador, Selo } from '../Pecas'

export function CabecalhoDaFicha({ cabecalho }: { cabecalho: CabecalhoFicha }): ReactNode {
  const { resumo, situacao } = cabecalho
  const atrasada = resumo.faturasEmAberto.some((f) => f.atrasada)
  const base = `/admin/usuarios/${encodeURIComponent(resumo.email)}`
  return (
    <>
      <div className="adm-identidade">
        <span className="adm-identidade-avatar" aria-hidden="true">
          {initials(resumo.nome)}
        </span>
        <div className="adm-identidade-texto">
          <h2>{resumo.nome}</h2>
          <p>
            <span translate="no">{resumo.email}</span>
            {cabecalho.criadaEm ? ` · conta criada em ${data(cabecalho.criadaEm)}` : ''}
          </p>
        </div>
        <div className="adm-etiquetas adm-identidade-selos">
          {situacao.ativa ? <Selo tom="ok">Ativa</Selo> : <Selo tom="alerta">Desativada</Selo>}
          {resumo.inadimplente ? <Selo tom="alerta">Inadimplente{resumo.marcaManual ? ' (marca manual)' : ''}</Selo> : null}
          <Selo tom={resumo.comCadastro ? 'ok' : 'atencao'}>{resumo.comCadastro ? 'Cadastro completo' : 'Cadastro incompleto'}</Selo>
          {cabecalho.ehDaEquipe ? (
            <span title="Este e-mail também tem acesso ao painel administrativo: é a mesma pessoa, não duas.">
              <Selo tom="ouro">Também é membro da equipe</Selo>
            </span>
          ) : null}
          {cabecalho.ehDoCatalogo ? <Selo>Catálogo de demonstração</Selo> : null}
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

      <div className="adm-inds">
        <Indicador rotulo="Saldo" valor={dinheiro(resumo.saldo)} tom="ouro" />
        <Indicador
          rotulo="Moedas na custódia"
          valor={numero(resumo.moedasCustodiadas)}
          detalhe={resumo.recibosBloqueados ? `${numero(resumo.recibosBloqueados)} recibo(s) bloqueado(s)` : undefined}
          href={`${base}?aba=acervo`}
        />
        <Indicador
          rotulo="Faturas em aberto"
          valor={dinheiro(resumo.valorEmAberto)}
          detalhe={`${numero(resumo.faturasEmAberto.length)} fatura(s)${atrasada ? ' · há atrasada' : ''}`}
          tom={atrasada ? 'alerta' : resumo.faturasEmAberto.length ? 'atencao' : 'neutro'}
          href={resumo.faturasEmAberto.length ? `${base}?aba=financeiro` : undefined}
        />
        <Indicador rotulo="Último acesso" valor={dataHora(resumo.ultimoAcesso)} detalhe={`anterior: ${dataHora(resumo.acessoAnterior)}`} />
      </div>
    </>
  )
}
