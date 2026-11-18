/**
 * A fila de e-mails (`aurea.emails_pendentes`, migration 053) — o mesmo desenho da fila de NFS-e
 * (src/server/db/repositories/nfse.ts), escrito aqui dentro porque o módulo inteiro é da frente C.
 *
 * Tudo recebe uma `Consulta` (a transação de quem chama): `enfileirarEmails` roda DENTRO da transação da
 * mutação, e o despacho roda em transações próprias e curtas. Sem `server-only`, para a suíte rodar a SQL de
 * verdade no PGlite.
 *
 * AS TRÊS GARANTIAS
 *  1. Idempotência: `chave` UNIQUE + `ON CONFLICT DO NOTHING` — o mesmo evento derivado duas vezes entra uma só.
 *  2. Reserva atômica: `reivindicar` marca `reservado_ate` com `FOR UPDATE SKIP LOCKED`; dois envios simultâneos
 *     (o `after()` de uma mutação e o cron) nunca pegam a mesma linha, e uma reserva que morreu no meio volta
 *     sozinha quando o prazo dela passa.
 *  3. Validade: pendente há mais de `VALIDADE_MS` vira `expirado` e nunca é enviado.
 */

import { nomeDoSchema, num, type Consulta } from '@/server/db/sql'

import type { EventoDeEmail, TipoDeEmail } from './tipos'

/** Depois disto, e-mail que ainda não saiu é aviso velho: confunde mais do que ajuda. */
export const VALIDADE_MS = 24 * 60 * 60_000
/** Quantas vezes o provedor pode falhar antes de a linha ser abandonada. */
export const TENTATIVAS_MAXIMAS = 5
/** Quanto tempo uma reserva segura a linha. Passou disto, outro envio pode pegá-la. */
export const RESERVA_MS = 2 * 60_000
/** Depois de uma falha, a linha espera isto antes de ser tentada de novo. */
export const ESPERA_APOS_FALHA_MS = 5 * 60_000

export interface EmailNaFila {
  id: number
  chave: string
  tipo: TipoDeEmail
  para: string
  dados: unknown
  tentativas: number
  criadoEm: number
}

export type StatusDoEmail = 'pendente' | 'enviado' | 'simulado' | 'expirado' | 'desistido'

/**
 * Grava os eventos novos. Devolve quantos ENTRARAM — evento repetido (mesma chave) não conta, e é por isso que
 * `mutarEstado` só agenda o envio quando o número é maior que zero.
 */
export async function enfileirarEmails(tx: Consulta, eventos: readonly EventoDeEmail[], agora: number): Promise<number> {
  const S = nomeDoSchema()
  let entraram = 0
  for (const e of eventos) {
    const { rows } = await tx.query(
      `INSERT INTO ${S}.emails_pendentes (chave, tipo, para, dados, criado_em)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (chave) DO NOTHING
       RETURNING id`,
      [e.chave, e.tipo, e.para, JSON.stringify(e.dados), agora],
    )
    entraram += rows.length
  }
  return entraram
}

/** Marca `expirado` o que ficou pendente além da validade. Devolve quantas linhas expiraram. */
export async function expirarAntigos(tx: Consulta, agora: number): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `UPDATE ${S}.emails_pendentes SET status = 'expirado'
      WHERE status = 'pendente' AND criado_em < $1
      RETURNING id`,
    [agora - VALIDADE_MS],
  )
  return rows.length
}

function dadosDe(v: unknown): unknown {
  return typeof v === 'string' ? (JSON.parse(v) as unknown) : v
}

/**
 * Pega até `limite` linhas pendentes e as reserva por `RESERVA_MS`, numa instrução só. Conta a tentativa já na
 * reserva: se o servidor morrer no meio do envio, a tentativa não some do placar.
 */
export async function reivindicar(tx: Consulta, opcoes: { limite: number; agora: number }): Promise<EmailNaFila[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `UPDATE ${S}.emails_pendentes
        SET reservado_ate = $3, tentativas = tentativas + 1
      WHERE id IN (
        SELECT id FROM ${S}.emails_pendentes
         WHERE status = 'pendente' AND tentativas < $4 AND (reservado_ate IS NULL OR reservado_ate < $2)
         ORDER BY id
         LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, chave, tipo, para, dados, tentativas, criado_em`,
    [opcoes.limite, opcoes.agora, opcoes.agora + RESERVA_MS, TENTATIVAS_MAXIMAS],
  )
  return rows
    .map((r) => ({
      id: num(r.id),
      chave: String(r.chave),
      tipo: r.tipo as TipoDeEmail,
      para: String(r.para),
      dados: dadosDe(r.dados),
      tentativas: num(r.tentativas),
      criadoEm: num(r.criado_em),
    }))
    .sort((a, b) => a.id - b.id)
}

export async function marcarEnviado(
  tx: Consulta,
  id: number,
  dados: { agora: number; idProvedor: string | null; simulado: boolean },
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.emails_pendentes
        SET status = $2, enviado_em = $3, id_provedor = $4, reservado_ate = NULL, ultimo_erro = NULL
      WHERE id = $1`,
    [id, dados.simulado ? 'simulado' : 'enviado', dados.agora, dados.idProvedor],
  )
}

/**
 * Falha do provedor: guarda o erro, segura a linha por `ESPERA_APOS_FALHA_MS` e, se foi a última tentativa,
 * desiste. Nunca lança por causa do provedor — a mensagem do erro é só texto.
 */
export async function registrarFalha(tx: Consulta, id: number, dados: { erro: string; agora: number }): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.emails_pendentes
        SET ultimo_erro = $2,
            reservado_ate = $3,
            status = CASE WHEN tentativas >= $4 THEN 'desistido' ELSE status END
      WHERE id = $1`,
    [id, dados.erro.slice(0, 500), dados.agora + ESPERA_APOS_FALHA_MS, TENTATIVAS_MAXIMAS],
  )
}

/** Para a tela de diagnóstico e para os testes: a linha como está. */
export async function buscarPorChave(
  tx: Consulta,
  chave: string,
): Promise<{ status: StatusDoEmail; tentativas: number; ultimoErro: string | null; idProvedor: string | null } | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `SELECT status, tentativas, ultimo_erro, id_provedor FROM ${S}.emails_pendentes WHERE chave = $1`,
    [chave],
  )
  const r = rows[0]
  if (!r) return null
  return {
    status: r.status as StatusDoEmail,
    tentativas: num(r.tentativas),
    ultimoErro: (r.ultimo_erro as string | null) ?? null,
    idProvedor: (r.id_provedor as string | null) ?? null,
  }
}
