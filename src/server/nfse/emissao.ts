/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR. Carrega o certificado da empresa.
 * ==========================================================================*/

import 'server-only'

/**
 * O envio das notas: pega os pedidos pendentes da fila (`aurea.nfse_emissoes`), monta a DPS, assina
 * com o e-CNPJ, manda à Sefin Nacional e grava o resultado. Quem cria os pedidos é `mutarEstado`
 * (src/server/db/estado.ts), na transação da negociação ou do pagamento; isto roda depois, chamado
 * por `agendarEmissaoNfse()` logo após a operação e pelo cron diário (reenvio de pendências).
 *
 * AS DUAS GARANTIAS
 * -----------------
 *  1. NUNCA DUAS NOTAS PARA O MESMO FATO. O número da DPS e o XML assinado são gravados ANTES do
 *     envio. Se o envio morrer no meio (timeout, queda da função), a próxima rodada pergunta à Sefin
 *     se aquela DPS já gerou nota (`GET /dps/{id}`) antes de mandar de novo.
 *  2. NENHUMA NOTA DE TESTE NO LUGAR DA DE VERDADE. Sem `NFSE_AMBIENTE=producao`, a emissão vai para a
 *     produção restrita (notas "sem validade jurídica") — e no site publicado da Vercel nem isso: os
 *     pedidos ficam `pendente` até a produção ser ligada, e então saem com a data do fato. Uma nota
 *     autorizada só na restrita é reemitida quando a produção liga.
 *
 * O leiaute: a produção restrita está, em 23/10/2026, numa transição da NT 009 (aceita a DPS com
 * `finNFSe` na raiz, CST fora do `gIBSCBS` e a descrição depois do NBS, mas ainda com `indDest` no
 * grupo IBSCBS) — testado com duas notas autorizadas. A produção roda a v1.01 até 30/11 e a NT 009
 * depois. Recusa de esquema (E1235) não gera nota nem consome número: o envio tenta o formato seguinte.
 */

import { FORMATO_DO_LEIAUTE, leiauteNaData, montarDps, problemasDoPedido, type FormatoDps, type TomadorNfse } from '@/domain/nfse/dps'
import type { AppState, UserEmail } from '@/domain/types'

import { bancoConfigurado, executarNoBanco } from '../db/client'
import type { Executor } from '../db/sql'
import {
  gravarAutorizada,
  gravarDpsPreparada,
  gravarFalha,
  pedidoDaEmissao,
  reivindicarParaEnvio,
  reservarNumeroDps,
  type EmissaoNfse,
  type ErroNfse,
} from '../db/repositories/nfse'
import { assinarXml } from './assinatura'
import { certificadoConfigurado, certificadoDoAmbiente, type CertificadoA1 } from './certificado'
import { codigoIbgeDoCep } from './municipio'
import {
  FalhaTransitoriaSefin,
  ambienteConfigurado,
  chaveDaDpsJaEmitida,
  consultarNfse,
  enviarDps,
  numeroDaNfse,
  tpAmbDo,
  type AmbienteNfse,
} from './sefin'

export const VERSAO_APLICATIVO = 'RealOlimpico-1.0'

/** Série das DPS emitidas pela plataforma. A faixa da API é 1–49999; 70000 é do emissor web (E0010). */
export function serieConfigurada(): number {
  const n = Number(process.env.NFSE_SERIE ?? '1')
  return Number.isInteger(n) && n >= 1 && n <= 49_999 ? n : 1
}

/** O formato que a produção restrita aceitou em 23/10/2026 (NT 009, release 1). */
const FORMATO_RESTRITA_OUT_2026: FormatoDps = { finNFSeNaRaiz: true, indDestNaRaiz: false, cstForaDoGrupo: true, descricaoNoFim: true }

/** Os formatos a tentar, em ordem. Só a recusa de esquema (E1235) passa para o próximo. */
export function formatosATentar(ambiente: AmbienteNfse, agora: number): FormatoDps[] {
  const candidatos =
    ambiente === 'restrita'
      ? [FORMATO_RESTRITA_OUT_2026, FORMATO_DO_LEIAUTE.nt009, FORMATO_DO_LEIAUTE['v1.01']]
      : leiauteNaData(agora) === 'nt009'
        ? [FORMATO_DO_LEIAUTE.nt009, FORMATO_RESTRITA_OUT_2026, FORMATO_DO_LEIAUTE['v1.01']]
        : [FORMATO_DO_LEIAUTE['v1.01'], FORMATO_RESTRITA_OUT_2026, FORMATO_DO_LEIAUTE.nt009]
  return candidatos
}

/** Por que a emissão não roda agora — ou `null` se pode rodar. */
export function impedimentoDaEmissao(): string | null {
  if (!bancoConfigurado()) return 'Sem banco de dados configurado: a fila de notas vive no Postgres.'
  if (!certificadoConfigurado()) return 'Certificado da empresa não configurado (NFSE_CERT_PFX_BASE64 e NFSE_CERT_SENHA).'
  if (ambienteConfigurado() === 'restrita' && process.env.VERCEL_ENV === 'production') {
    return 'Emissão em produção ainda não ligada (NFSE_AMBIENTE=producao). As notas ficam na fila e saem com a data de cada fato quando ligar.'
  }
  return null
}

/** O tomador da nota a partir do cadastro do cliente. `null` quando não há cadastro. */
export async function tomadorDoCliente(state: AppState, email: UserEmail): Promise<TomadorNfse | null> {
  const cadastro = state.users[email]?.cadastro
  if (!cadastro?.cpf || !cadastro.nomeCompleto) return null
  const e = cadastro.endereco
  const cMun = e?.cep ? await codigoIbgeDoCep(e.cep) : null
  return {
    cpf: cadastro.cpf,
    nome: cadastro.nomeCompleto,
    endereco:
      e && cMun
        ? { cMun, cep: e.cep, logradouro: e.logradouro, numero: e.numero, complemento: e.complemento, bairro: e.bairro }
        : undefined,
  }
}

type Desfecho = 'autorizada' | 'rejeitada' | 'erro'

async function emitirUma(
  e: EmissaoNfse,
  state: AppState,
  cert: CertificadoA1,
  ambiente: AmbienteNfse,
  executar: Executor,
): Promise<Desfecho> {
  const serie = serieConfigurada()
  const pedido = pedidoDaEmissao(e)

  const falhar = async (status: 'rejeitada' | 'erro', erros: ErroNfse[]): Promise<Desfecho> => {
    await executar((tx) => gravarFalha(tx, e.id, { status, erros, agora: Date.now() }))
    return status
  }

  // 1. Já foi enviada neste ambiente e a resposta se perdeu? Pergunta antes de reenviar.
  const mesmaDps = e.idDps && e.ambiente === ambiente
  if (mesmaDps && e.idDps) {
    try {
      const chave = await chaveDaDpsJaEmitida(cert, ambiente, e.idDps)
      if (chave) {
        const xml = (await consultarNfse(cert, ambiente, chave)) ?? ''
        await executar((tx) => gravarAutorizada(tx, e.id, { chaveAcesso: chave, numeroNfse: numeroDaNfse(xml), xmlNfse: xml, agora: Date.now() }))
        return 'autorizada'
      }
    } catch (err) {
      if (err instanceof FalhaTransitoriaSefin) return falhar('erro', [{ codigo: 'REDE', descricao: err.message }])
      throw err
    }
  }

  // 2. O que impede a nota sai aqui, sem gastar número nem ida à Sefin.
  const tomador = await tomadorDoCliente(state, e.tomadorEmail)
  const problemas = problemasDoPedido(pedido, tomador)
  if (problemas.length || !tomador) {
    return falhar('rejeitada', problemas.map((descricao) => ({ codigo: 'CADASTRO', descricao })))
  }

  // 3. Número: reaproveita o da tentativa anterior no mesmo ambiente (DPS rejeitada não gerou nota).
  let numero = mesmaDps && e.nDps ? e.nDps : await executar((tx) => reservarNumeroDps(tx, ambiente, serie))
  let erros: ErroNfse[] = []

  for (let trocasDeNumero = 0; trocasDeNumero < 3; trocasDeNumero++) {
    for (const formato of formatosATentar(ambiente, Date.now())) {
      const emitidoEm = Date.now() - 30_000 // a Sefin recusa dhEmi no futuro (E0008); meio minuto de folga para o relógio
      const { id, xml } = montarDps({ pedido, tomador, tpAmb: tpAmbDo(ambiente), serie, numero, emitidoEm, verAplic: VERSAO_APLICATIVO, formato })
      const assinado = assinarXml(xml, cert, 'DPS', 'infDPS')
      await executar((tx) => gravarDpsPreparada(tx, e.id, { ambiente, serie, nDps: numero, idDps: id, xmlDps: assinado, agora: Date.now() }))

      let r
      try {
        r = await enviarDps(cert, ambiente, assinado)
      } catch (err) {
        if (err instanceof FalhaTransitoriaSefin) return falhar('erro', [{ codigo: 'REDE', descricao: err.message }])
        throw err
      }
      if (r.ok) {
        await executar((tx) =>
          gravarAutorizada(tx, e.id, { chaveAcesso: r.chaveAcesso, numeroNfse: r.numeroNfse, xmlNfse: r.xmlNfse, agora: Date.now() }),
        )
        return 'autorizada'
      }
      erros = r.erros
      // Esquema recusado: o formato não é o deste ambiente agora. Tenta o próximo, com o mesmo número.
      if (erros.some((x) => x.codigo === 'E1235')) continue
      break
    }
    // Número já usado por outra DPS (E0014): reserva outro e recomeça.
    if (erros.some((x) => x.codigo === 'E0014')) {
      numero = await executar((tx) => reservarNumeroDps(tx, ambiente, serie))
      continue
    }
    break
  }
  return falhar('rejeitada', erros)
}

export interface RelatorioEmissao {
  impedimento: string | null
  ambiente: AmbienteNfse
  processadas: number
  autorizadas: number
  rejeitadas: number
  erros: number
}

/**
 * Envia o que está na fila. `incluirRejeitadas` é a rodada diária: recusas por cadastro incompleto
 * voltam a ser tentadas sozinhas (o cliente pode ter completado o endereço), até o limite de tentativas.
 */
export interface OpcoesDeEnvio {
  limite?: number
  incluirRejeitadas?: boolean
  /** Banco e estado de fora — para exercitar o envio contra um Postgres embutido. Padrão: os do servidor. */
  executar?: Executor
  carregarEstado?: () => Promise<AppState>
}

export async function processarNotasPendentes(opcoes: OpcoesDeEnvio = {}): Promise<RelatorioEmissao> {
  const ambiente = ambienteConfigurado()
  const executar = opcoes.executar ?? executarNoBanco
  const impedimento = opcoes.executar && certificadoConfigurado() ? null : impedimentoDaEmissao()
  const relatorio: RelatorioEmissao = { impedimento, ambiente, processadas: 0, autorizadas: 0, rejeitadas: 0, erros: 0 }
  if (relatorio.impedimento) return relatorio

  const cert = certificadoDoAmbiente()
  const lote = await executar((tx) =>
    reivindicarParaEnvio(tx, { limite: opcoes.limite ?? 25, agora: Date.now(), ambiente, incluirRejeitadas: opcoes.incluirRejeitadas ?? false }),
  )
  if (!lote.length) return relatorio

  // O estado inteiro, uma vez por lote, só para ler o cadastro dos tomadores.
  const state = opcoes.carregarEstado ? await opcoes.carregarEstado() : await (await import('../state')).getState()

  for (const e of lote) {
    relatorio.processadas++
    try {
      const desfecho = await emitirUma(e, state, cert, ambiente, executar)
      if (desfecho === 'autorizada') relatorio.autorizadas++
      else if (desfecho === 'rejeitada') relatorio.rejeitadas++
      else relatorio.erros++
    } catch (err) {
      relatorio.erros++
      const descricao = err instanceof Error ? err.message : String(err)
      console.error(`[aurea] NFS-e ${e.chave}: ${descricao}`)
      await executar((tx) => gravarFalha(tx, e.id, { status: 'erro', erros: [{ codigo: 'INTERNO', descricao }], agora: Date.now() }))
    }
  }
  if (relatorio.processadas) {
    console.info(
      `[aurea] NFS-e (${ambiente}): ${relatorio.autorizadas} autorizada(s), ${relatorio.rejeitadas} rejeitada(s), ${relatorio.erros} com erro.`,
    )
  }
  return relatorio
}
