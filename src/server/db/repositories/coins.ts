/**
 * Repositório de `aurea.coins` + `aurea.nfts`.
 *
 * Substitui os arrays `user.coins` do blob. As duas tabelas são lidas e
 * gravadas JUNTAS porque, para o domínio, o recibo é parte da moeda
 * (`Coin.nft`) — separar a leitura obrigaria a costurar as duas listas de
 * volta em memória, e uma moeda sem recibo é um estado que o domínio não tem
 * como representar.
 *
 * `ORDER BY owner_email, posicao` devolve cada inventário na ordem do array
 * original. A posição é reescrita a cada persistência em que ela muda (uma
 * venda desloca as moedas seguintes do vendedor); com dezenas de moedas por
 * conta, é barato — e é o que mantém `sellToBid` vendendo as mesmas moedas que
 * venderia no blob.
 */

import type { Coin, NftStatus, StatusDigital, StatusFisico } from '@/domain/types'

import type { CoinRegistro } from '../diff'
import { nomeDoSchema, num, type Consulta } from '../sql'

type LinhaCoin = {
  id: string
  owner_email: string
  posicao: unknown
  tipo_moeda: string
  ano: unknown
  entrada: string
  status_fisico: string
  status_digital: string
  valor_estimado: unknown
  protocolo: string
  transferido: boolean
  nft_codigo: string
  nft_hash: string
  nft_data_emissao: string
  nft_status: string
}

export async function carregarCoins(tx: Consulta): Promise<CoinRegistro[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaCoin>(
    `SELECT c.id, c.owner_email, c.posicao, c.tipo_moeda, c.ano, c.entrada,
            c.status_fisico, c.status_digital, c.valor_estimado, c.protocolo, c.transferido,
            n.codigo AS nft_codigo, n.hash AS nft_hash,
            n.data_emissao AS nft_data_emissao, n.status AS nft_status
       FROM ${S}.coins c
       JOIN ${S}.nfts n ON n.coin_id = c.id
      ORDER BY c.owner_email, c.posicao`,
  )
  return rows.map((r) => {
    const coin: Coin = {
      id: r.id,
      tipoMoeda: r.tipo_moeda,
      ano: num(r.ano),
      entrada: r.entrada,
      statusFisico: r.status_fisico as StatusFisico,
      statusDigital: r.status_digital as StatusDigital,
      valorEstimado: num(r.valor_estimado),
      protocolo: r.protocolo,
      ...(r.transferido ? { transferido: true as const } : {}),
      nft: {
        codigo: r.nft_codigo,
        hash: r.nft_hash,
        dataEmissao: r.nft_data_emissao,
        status: r.nft_status as NftStatus,
      },
    }
    return { owner: r.owner_email, posicao: num(r.posicao), coin }
  })
}

export async function inserirCoin(tx: Consulta, { owner, posicao, coin }: CoinRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.coins
       (id, owner_email, posicao, tipo_moeda, ano, entrada, status_fisico, status_digital,
        valor_estimado, protocolo, transferido)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      coin.id,
      owner,
      posicao,
      coin.tipoMoeda,
      coin.ano,
      coin.entrada,
      coin.statusFisico,
      coin.statusDigital,
      coin.valorEstimado,
      coin.protocolo,
      coin.transferido === true,
    ],
  )
  await tx.query(
    `INSERT INTO ${S}.nfts (coin_id, codigo, hash, data_emissao, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [coin.id, coin.nft.codigo, coin.nft.hash, coin.nft.dataEmissao, coin.nft.status],
  )
}

export async function atualizarCoin(tx: Consulta, { owner, posicao, coin }: CoinRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.coins
        SET owner_email = $2, posicao = $3, tipo_moeda = $4, ano = $5, entrada = $6,
            status_fisico = $7, status_digital = $8, valor_estimado = $9, protocolo = $10,
            transferido = $11
      WHERE id = $1`,
    [
      coin.id,
      owner,
      posicao,
      coin.tipoMoeda,
      coin.ano,
      coin.entrada,
      coin.statusFisico,
      coin.statusDigital,
      coin.valorEstimado,
      coin.protocolo,
      coin.transferido === true,
    ],
  )
  await tx.query(
    `UPDATE ${S}.nfts SET codigo = $2, hash = $3, data_emissao = $4, status = $5 WHERE coin_id = $1`,
    [coin.id, coin.nft.codigo, coin.nft.hash, coin.nft.dataEmissao, coin.nft.status],
  )
}

/** O recibo sai junto pelo ON DELETE CASCADE. Nunca acontece hoje — a retirada física é o bloco 4.3. */
export async function removerCoin(tx: Consulta, id: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.coins WHERE id = $1`, [id])
}
