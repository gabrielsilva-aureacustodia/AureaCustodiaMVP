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
 * A falha momentânea não apaga o retrato bom (22/10/2026).
 *
 * Quando os Correios não respondem, o job recebe `indisponivel` sem nenhum evento. Regravar isso
 * por cima da linha de um objeto já rastreado faria a tela do cliente trocar "Saiu para entrega" por
 * "não foi possível consultar" — e perder a linha do tempo inteira — por causa de uma queda de
 * minutos na API. O mesmo vale para `nao_encontrado` sobre um objeto que os Correios já rastrearam:
 * objeto conhecido não deixa de existir, e o lote que não o devolveu é falha deles, não fato novo.
 * A condição fica na própria SQL, e não num "lê e depois decide" no job, para não
 * abrir janela entre a leitura e a escrita. Sem linha anterior, o `indisponivel` grava: a tela
 * precisa dizer por que não há rastreio.
 */
const NAO_SOBRESCREVE_COM_FALHA = `WHERE NOT (EXCLUDED.status_atual = 'indisponivel'
                   AND rastreios.status_atual <> 'indisponivel')
                AND NOT (EXCLUDED.status_atual = 'nao_encontrado'
                   AND rastreios.status_atual NOT IN ('indisponivel', 'nao_encontrado'))`

/**
 * Grava (ou regrava) o estado de um objeto. É upsert porque o job roda de novo
 * sobre os mesmos códigos: o que interessa é o último retrato, não o histórico
 * de consultas — a linha do tempo dos Correios já vem dentro de `eventos`.
 *
 * Devolve `false` quando a linha ficou como estava (falha momentânea sobre um retrato bom).
 */
export async function salvarRastreio(tx: Consulta, r: RastreioGravado): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `INSERT INTO ${S}.rastreios AS rastreios
       (codigo_rastreio, protocolo, status_atual, etapa_descricao, entregue, atualizado_em, eventos)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (codigo_rastreio) DO UPDATE
       SET protocolo = EXCLUDED.protocolo,
           status_atual = EXCLUDED.status_atual,
           etapa_descricao = EXCLUDED.etapa_descricao,
           entregue = EXCLUDED.entregue,
           atualizado_em = EXCLUDED.atualizado_em,
           eventos = EXCLUDED.eventos
       ${NAO_SOBRESCREVE_COM_FALHA}
     RETURNING codigo_rastreio`,
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
  return rows.length > 0
}

/**
 * Grava o retrato de uma retirada física. Upsert pelo código, igual ao de envio (migration 030).
 *
 * `protocolo` vai a NULL de propósito: a restrição `rastreios_um_dono_check` aceita exatamente um
 * dono por linha. Se o mesmo código de objeto já tiver sido gravado como envio, o upsert troca o
 * dono em vez de violar a restrição.
 *
 * Mesma proteção do envio: `indisponivel` não regrava um retrato bom, e aí devolve `false`.
 */
export async function salvarRastreioDeRetirada(
  tx: Consulta,
  r: RastreioObjetoResult & { retiradaId: string },
): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `INSERT INTO ${S}.rastreios AS rastreios
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
           eventos = EXCLUDED.eventos
       ${NAO_SOBRESCREVE_COM_FALHA}
     RETURNING codigo_rastreio`,
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
  return rows.length > 0
}
