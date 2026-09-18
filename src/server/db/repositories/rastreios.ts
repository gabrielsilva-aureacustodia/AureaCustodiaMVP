/**
 * Repositório de `aurea.rastreios` — o último estado de cada objeto postal.
 *
 * Quem escreve é o job agendado (`/api/cron/shipping`); quem lê é a tela de
 * envios. A separação é a regra do M6: **a tela nunca chama os Correios**.
 * Consultar a API a cada visita gera custo, esbarra em limite de requisição e
 * deixa a página lenta — e o dado muda algumas vezes por dia, não a cada
 * carregamento.
 *
 * `eventos` é `jsonb` porque a linha do tempo é sempre lida inteira, por
 * objeto, e nunca consultada por evento isolado. Tabela filha aqui seria
 * normalização que ninguém usa.
 */

import type { EventoRastreio, RastreioObjetoResult, StatusRastreioCorreios } from '@/lib/shipping'

import { json, nomeDoSchema, num, type Consulta } from '../sql'

/**
 * O rastreio como ele é gravado: o resultado da consulta mais a quem ele pertence.
 *
 * `protocolo` é A CHAVE DO DONO, e não só o protocolo de um envio: para um envio é o protocolo
 * dele; para uma retirada é o id da retirada, e nesse caso `retiradaId` vem preenchido. Essa é a
 * chave que `/admin/logistica` já usa para achar o rastreio de cada linha (`dados.rastreios[r.id]`),
 * e mantê-la única evita um segundo mapa só para a retirada (migration 030, E8).
 */
export interface RastreioGravado extends RastreioObjetoResult {
  protocolo: string
  /** Preenchido só quando o dono é uma retirada física. Envio grava `null`. */
  retiradaId?: string | null
}

type LinhaRastreio = {
  codigo_rastreio: string
  protocolo: string | null
  retirada_id: string | null
  status_atual: string
  etapa_descricao: string
  entregue: boolean
  atualizado_em: unknown
  eventos: unknown
}

function paraRastreio(r: LinhaRastreio): RastreioGravado {
  return {
    codigoRastreio: r.codigo_rastreio,
    protocolo: r.protocolo ?? r.retirada_id ?? '',
    retiradaId: r.retirada_id,
    statusAtual: r.status_atual as StatusRastreioCorreios,
    etapaDescricao: r.etapa_descricao,
    entregue: r.entregue,
    dataUltimaAtualizacao: num(r.atualizado_em),
    eventos: json<EventoRastreio[]>(r.eventos) ?? [],
  }
}

export async function carregarRastreios(tx: Consulta): Promise<RastreioGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRastreio>(
    `SELECT codigo_rastreio, protocolo, retirada_id, status_atual, etapa_descricao, entregue,
            atualizado_em, eventos
       FROM ${S}.rastreios
      ORDER BY atualizado_em DESC`,
  )
  return rows.map(paraRastreio)
}

/**
 * Grava (ou regrava) o estado de um objeto. É upsert porque o job roda de novo
 * sobre os mesmos códigos: o que interessa é o último retrato, não o histórico
 * de consultas — a linha do tempo dos Correios já vem dentro de `eventos`.
 */
export async function salvarRastreio(tx: Consulta, r: RastreioGravado): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.rastreios
       (codigo_rastreio, protocolo, status_atual, etapa_descricao, entregue, atualizado_em, eventos)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (codigo_rastreio) DO UPDATE
       SET protocolo = EXCLUDED.protocolo,
           status_atual = EXCLUDED.status_atual,
           etapa_descricao = EXCLUDED.etapa_descricao,
           entregue = EXCLUDED.entregue,
           atualizado_em = EXCLUDED.atualizado_em,
           eventos = EXCLUDED.eventos`,
    [
      r.codigoRastreio,
      r.protocolo,
      r.statusAtual,
      r.etapaDescricao,
      r.entregue,
      r.dataUltimaAtualizacao,
      JSON.stringify(r.eventos),
    ],
  )
}

/**
 * Grava o retrato de uma retirada física. Upsert pelo código, igual ao de envio (migration 030).
 *
 * `protocolo` vai a NULL de propósito: a restrição `rastreios_um_dono_check` aceita exatamente um
 * dono por linha. Se o mesmo código de objeto já tiver sido gravado como envio, o upsert troca o
 * dono em vez de violar a restrição.
 */
export async function salvarRastreioDeRetirada(
  tx: Consulta,
  r: RastreioObjetoResult & { retiradaId: string },
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.rastreios
       (codigo_rastreio, protocolo, retirada_id, status_atual, etapa_descricao, entregue,
        atualizado_em, eventos)
     VALUES ($1, NULL, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (codigo_rastreio) DO UPDATE
       SET protocolo = NULL,
           retirada_id = EXCLUDED.retirada_id,
           status_atual = EXCLUDED.status_atual,
           etapa_descricao = EXCLUDED.etapa_descricao,
           entregue = EXCLUDED.entregue,
           atualizado_em = EXCLUDED.atualizado_em,
           eventos = EXCLUDED.eventos`,
    [
      r.codigoRastreio,
      r.retiradaId,
      r.statusAtual,
      r.etapaDescricao,
      r.entregue,
      r.dataUltimaAtualizacao,
      JSON.stringify(r.eventos),
    ],
  )
}
