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
  modalidade_envio: string | null
  origem: string
  peso_inicial_mg: unknown
  caixa_inicial: string | null
  observacao: string | null
  desconsiderado_em: unknown
  motivo_desconsideracao: string | null
}

export async function carregarEnvios(tx: Consulta): Promise<Envio[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaEnvio>(
    `SELECT protocolo, user_email, tipo_moeda, ano, quantidade, codigo_rastreio,
            data_postagem, data_recebimento, etapa_atual, created_at, codigos_ativos_gerados,
            modalidade_envio, origem, peso_inicial_mg, caixa_inicial, observacao,
            desconsiderado_em, motivo_desconsideracao
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
    ...(r.modalidade_envio ? { modalidadeEnvio: r.modalidade_envio as 'PAC' | 'SEDEX' } : {}),
    origem: r.origem as 'envio_postal' | 'cadastro_sem_envio',
    pesoInicialMg: numOuNulo(r.peso_inicial_mg),
    caixaInicial: r.caixa_inicial,
    observacao: r.observacao,
    desconsideradoEm: numOuNulo(r.desconsiderado_em),
    motivoDesconsideracao: r.motivo_desconsideracao,
  }))
}

export async function inserirEnvio(tx: Consulta, e: Envio): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.envios
       (protocolo, user_email, tipo_moeda, ano, quantidade, codigo_rastreio,
        data_postagem, data_recebimento, etapa_atual, created_at, codigos_ativos_gerados,
        modalidade_envio, origem, peso_inicial_mg, caixa_inicial, observacao,
        desconsiderado_em, motivo_desconsideracao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17, $18)`,
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
      e.modalidadeEnvio ?? null,
      e.origem ?? 'envio_postal',
      e.pesoInicialMg ?? null,
      e.caixaInicial ?? null,
      e.observacao ?? null,
      e.desconsideradoEm ?? null,
      e.motivoDesconsideracao ?? null,
    ],
  )
}

export async function atualizarEnvio(tx: Consulta, e: Envio): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.envios
        SET user_email = $2, tipo_moeda = $3, ano = $4, quantidade = $5, codigo_rastreio = $6,
            data_postagem = $7, data_recebimento = $8, etapa_atual = $9, created_at = $10,
            codigos_ativos_gerados = $11::jsonb, modalidade_envio = $12, origem = $13,
            peso_inicial_mg = $14, caixa_inicial = $15, observacao = $16,
            desconsiderado_em = $17, motivo_desconsideracao = $18
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
      e.modalidadeEnvio ?? null,
      e.origem ?? 'envio_postal',
      e.pesoInicialMg ?? null,
      e.caixaInicial ?? null,
      e.observacao ?? null,
      e.desconsideradoEm ?? null,
      e.motivoDesconsideracao ?? null,
    ],
  )
}

export async function removerEnvio(tx: Consulta, protocolo: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.envios WHERE protocolo = $1`, [protocolo])
}
