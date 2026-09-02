/**
 * Repositório de `aurea.envios` — os protocolos do wizard de custódia.
 *
 * Substitui `state.envios`. O protocolo `RO-ENV-0001` é a chave; a etapa e as
 * datas mudam conforme o wizard avança (markPosted, advanceAnalysis), e
 * `codigos_ativos_gerados` recebe os ids das moedas criadas na última etapa.
 *
 * `ORDER BY ord` reproduz a ordem de criação — que coincide com a do
 * protocolo, mas não depende dela: um dia o formato do código pode mudar, e a
 * ordem da tela continuaria certa.
 */

import type { Envio, EtapaEnvio } from '@/domain/types'

import { json, nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

type LinhaEnvio = {
  protocolo: string
  user_email: string
  tipo_moeda: string
  ano: unknown
  quantidade: unknown
  codigo_rastreio: string | null
  data_postagem: unknown
  data_recebimento: unknown
  etapa_atual: string
  created_at: unknown
  codigos_ativos_gerados: unknown
}

export async function carregarEnvios(tx: Consulta): Promise<Envio[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaEnvio>(
    `SELECT protocolo, user_email, tipo_moeda, ano, quantidade, codigo_rastreio,
            data_postagem, data_recebimento, etapa_atual, created_at, codigos_ativos_gerados
       FROM ${S}.envios
      ORDER BY ord`,
  )
  return rows.map((r) => ({
    protocolo: r.protocolo,
    userEmail: r.user_email,
    tipoMoeda: r.tipo_moeda,
    ano: num(r.ano),
    quantidade: num(r.quantidade),
    codigoRastreio: r.codigo_rastreio,
    dataPostagem: numOuNulo(r.data_postagem),
    dataRecebimento: numOuNulo(r.data_recebimento),
    etapaAtual: r.etapa_atual as EtapaEnvio,
    createdAt: num(r.created_at),
    codigosAtivosGerados: json<string[]>(r.codigos_ativos_gerados) ?? [],
  }))
}

export async function inserirEnvio(tx: Consulta, e: Envio): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.envios
       (protocolo, user_email, tipo_moeda, ano, quantidade, codigo_rastreio,
        data_postagem, data_recebimento, etapa_atual, created_at, codigos_ativos_gerados)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
    [
      e.protocolo,
      e.userEmail,
      e.tipoMoeda,
      e.ano,
      e.quantidade,
      e.codigoRastreio,
      e.dataPostagem,
      e.dataRecebimento,
      e.etapaAtual,
      e.createdAt,
      JSON.stringify(e.codigosAtivosGerados),
    ],
  )
}

export async function atualizarEnvio(tx: Consulta, e: Envio): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.envios
        SET user_email = $2, tipo_moeda = $3, ano = $4, quantidade = $5, codigo_rastreio = $6,
            data_postagem = $7, data_recebimento = $8, etapa_atual = $9, created_at = $10,
            codigos_ativos_gerados = $11::jsonb
      WHERE protocolo = $1`,
    [
      e.protocolo,
      e.userEmail,
      e.tipoMoeda,
      e.ano,
      e.quantidade,
      e.codigoRastreio,
      e.dataPostagem,
      e.dataRecebimento,
      e.etapaAtual,
      e.createdAt,
      JSON.stringify(e.codigosAtivosGerados),
    ],
  )
}

export async function removerEnvio(tx: Consulta, protocolo: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.envios WHERE protocolo = $1`, [protocolo])
}
