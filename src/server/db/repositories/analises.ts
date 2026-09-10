/**
 * Repositório de `aurea.analises` — os procedimentos da bancada (frente E).
 *
 * APPEND-ONLY, como `trades`: só `carregar` e `inserir`. Não há `atualizar`
 * nem `remover`, e a ausência é a garantia — cada análise carrega o hash da
 * anterior, então corrigir uma linha antiga por UPDATE quebraria a corrente
 * inteira sem deixar rastro. Análise errada se refaz com uma análise nova.
 *
 * `posicao` é o índice no array de `AppState.analises`, e `ORDER BY posicao` é
 * o que devolve a corrente na ordem em que foi escrita — que é a ordem em que
 * os hashes foram encadeados. Ordenar por `protocolo` daria quase o mesmo
 * resultado e falharia no dia em que o formato do código mudasse.
 */

import type { Analise, VereditoAnalise } from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

type LinhaAnalise = {
  protocolo: string
  protocolo_envio: string
  codigo_moeda: string | null
  codigo_recibo: string | null
  tipo_moeda: string
  ano: unknown
  peso_mg: unknown
  veredito: string
  motivo_recusa: string | null
  operador: string
  aprovador: string
  caixa: string | null
  posicao_caixa: unknown
  validado_em: unknown
  caminho_video: string | null
  hash_anterior: string
  hash: string
}

export async function carregarAnalises(tx: Consulta): Promise<Analise[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaAnalise>(
    `SELECT protocolo, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda, ano,
            peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
            validado_em, caminho_video, hash_anterior, hash
       FROM ${S}.analises
      ORDER BY posicao`,
  )
  return rows.map((r) => ({
    protocolo: r.protocolo,
    protocoloEnvio: r.protocolo_envio,
    codigoMoeda: r.codigo_moeda,
    codigoRecibo: r.codigo_recibo,
    tipoMoeda: r.tipo_moeda,
    ano: num(r.ano),
    pesoMg: num(r.peso_mg),
    veredito: r.veredito as VereditoAnalise,
    motivoRecusa: r.motivo_recusa,
    operador: r.operador,
    aprovador: r.aprovador,
    caixa: r.caixa,
    posicao: r.posicao_caixa === null ? null : num(r.posicao_caixa),
    validadoEm: num(r.validado_em),
    caminhoVideo: r.caminho_video,
    hashAnterior: r.hash_anterior,
    hash: r.hash,
  }))
}

export async function inserirAnalise(
  tx: Consulta,
  posicao: number,
  a: Analise,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.analises
       (protocolo, posicao, protocolo_envio, codigo_moeda, codigo_recibo, tipo_moeda, ano,
        peso_mg, veredito, motivo_recusa, operador, aprovador, caixa, posicao_caixa,
        validado_em, caminho_video, hash_anterior, hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      a.protocolo,
      posicao,
      a.protocoloEnvio,
      a.codigoMoeda,
      a.codigoRecibo,
      a.tipoMoeda,
      a.ano,
      a.pesoMg,
      a.veredito,
      a.motivoRecusa,
      a.operador,
      a.aprovador,
      a.caixa,
      a.posicao,
      a.validadoEm,
      a.caminhoVideo,
      a.hashAnterior,
      a.hash,
    ],
  )
}
