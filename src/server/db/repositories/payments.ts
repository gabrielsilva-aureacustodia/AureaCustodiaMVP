/**
 * Repositório de `aurea.payment_events` e `aurea.payment_intents`.
 *
 * As duas tabelas ficam juntas porque contam os dois lados da mesma história: o
 * evento que o gateway entregou e a intenção de depósito que ele confirma.
 * Nenhuma delas entra no `AppState` — ver o cabeçalho da migration 002.
 *
 * AS DUAS OPERAÇÕES QUE VALEM O ARQUIVO INTEIRO
 * ---------------------------------------------
 *  - `reivindicarEvento` é a idempotência do RA-07. `INSERT … ON CONFLICT DO
 *    NOTHING RETURNING`: quem recebe linha processa, quem não recebe descarta.
 *  - `reivindicarIntencao` é a trava do crédito. `UPDATE … WHERE status =
 *    'pendente' RETURNING`: dois webhooks simultâneos para o mesmo depósito, e
 *    só um sai com a linha na mão.
 *
 * Ambas são atômicas por construção do Postgres, não por disciplina de código.
 * É a diferença entre "improvável" e "impossível".
 */

import { nomeDoSchema, num, numOuNulo, json, type Consulta } from '../sql'

/** Estado de um evento de gateway já visto. */
export type StatusEvento = 'em_processamento' | 'processado' | 'falha'

export interface RegistroEvento {
  gateway: string
  eventoId: string
  paymentId: string | null
  tipo: string
  status: StatusEvento
  recebidoEm: number
  concluidoEm: number | null
  resultado: unknown
}

/** Forma de pagamento escolhida na tela. */
export type MetodoDeposito = 'pix' | 'checkout_pro'

/** Ciclo de vida da intenção: nasce pendente e termina creditada ou recusada. */
export type StatusIntencao = 'pendente' | 'creditando' | 'creditado' | 'recusado'

export interface IntencaoDeposito {
  externalReference: string
  userEmail: string
  valor: number
  metodo: MetodoDeposito
  status: StatusIntencao
  paymentId: string | null
  motivoRecusa: string | null
  createdAt: number
  updatedAt: number
}

/* ---------- eventos do gateway ---------- */

type LinhaEvento = {
  gateway: string
  event_id: string
  payment_id: string | null
  tipo: string
  status: string
  recebido_em: unknown
  concluido_em: unknown
  resultado: unknown
}

function paraRegistro(r: LinhaEvento): RegistroEvento {
  return {
    gateway: r.gateway,
    eventoId: r.event_id,
    paymentId: r.payment_id,
    tipo: r.tipo,
    status: r.status as StatusEvento,
    recebidoEm: num(r.recebido_em),
    concluidoEm: numOuNulo(r.concluido_em),
    resultado: json<unknown>(r.resultado),
  }
}

/**
 * Tenta registrar o evento. Devolve `true` só para quem gravou a linha.
 *
 * O `ON CONFLICT DO NOTHING` é o que torna a chamada segura sob concorrência:
 * duas instâncias que recebam a mesma notificação ao mesmo tempo disputam a
 * chave primária, e o Postgres deixa apenas uma passar. Sem ele, o par
 * "consultar depois inserir" teria uma janela entre as duas consultas — e é
 * exatamente nessa janela que o crédito dobra.
 */
export async function reivindicarEvento(
  tx: Consulta,
  gateway: string,
  eventoId: string,
  tipo: string,
  paymentId: string | null,
  agora: number,
): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ event_id: string }>(
    `INSERT INTO ${S}.payment_events (gateway, event_id, payment_id, tipo, status, recebido_em)
     VALUES ($1, $2, $3, $4, 'em_processamento', $5)
     ON CONFLICT (gateway, event_id) DO NOTHING
     RETURNING event_id`,
    [gateway, eventoId, paymentId, tipo, agora],
  )
  return rows.length > 0
}

export async function buscarEvento(
  tx: Consulta,
  gateway: string,
  eventoId: string,
): Promise<RegistroEvento | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaEvento>(
    `SELECT gateway, event_id, payment_id, tipo, status, recebido_em, concluido_em, resultado
       FROM ${S}.payment_events WHERE gateway = $1 AND event_id = $2`,
    [gateway, eventoId],
  )
  const linha = rows[0]
  return linha ? paraRegistro(linha) : null
}

export async function concluirEventoNoBanco(
  tx: Consulta,
  gateway: string,
  eventoId: string,
  resultado: unknown,
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.payment_events
        SET status = 'processado', concluido_em = $3, resultado = $4::jsonb
      WHERE gateway = $1 AND event_id = $2`,
    [gateway, eventoId, agora, resultado === undefined ? null : JSON.stringify(resultado)],
  )
}

/**
 * Marca o evento como falho, o que **libera a retentativa**: a linha continua
 * lá, mas `reivindicarEvento` não a recria — por isso a liberação é explícita,
 * apagando o registro. Um erro de infraestrutura (o gateway fora do ar na hora
 * da consulta) precisa poder ser reprocessado quando o Mercado Pago reenviar;
 * um erro de dado, não. Quem decide é quem chama.
 */
export async function falharEventoNoBanco(
  tx: Consulta,
  gateway: string,
  eventoId: string,
  liberarRetentativa: boolean,
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  if (liberarRetentativa) {
    await tx.query(`DELETE FROM ${S}.payment_events WHERE gateway = $1 AND event_id = $2`, [
      gateway,
      eventoId,
    ])
    return
  }
  await tx.query(
    `UPDATE ${S}.payment_events SET status = 'falha', concluido_em = $3
      WHERE gateway = $1 AND event_id = $2`,
    [gateway, eventoId, agora],
  )
}

/* ---------- intenções de depósito ---------- */

type LinhaIntencao = {
  external_reference: string
  user_email: string
  valor: unknown
  metodo: string
  status: string
  payment_id: string | null
  motivo_recusa: string | null
  created_at: unknown
  updated_at: unknown
}

function paraIntencao(r: LinhaIntencao): IntencaoDeposito {
  return {
    externalReference: r.external_reference,
    userEmail: r.user_email,
    valor: num(r.valor),
    metodo: r.metodo as MetodoDeposito,
    status: r.status as StatusIntencao,
    paymentId: r.payment_id,
    motivoRecusa: r.motivo_recusa,
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  }
}

export async function inserirIntencao(tx: Consulta, i: IntencaoDeposito): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.payment_intents
       (external_reference, user_email, valor, metodo, status, payment_id, motivo_recusa,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      i.externalReference,
      i.userEmail,
      i.valor,
      i.metodo,
      i.status,
      i.paymentId,
      i.motivoRecusa,
      i.createdAt,
      i.updatedAt,
    ],
  )
}

export async function buscarIntencao(
  tx: Consulta,
  externalReference: string,
): Promise<IntencaoDeposito | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaIntencao>(
    `SELECT external_reference, user_email, valor, metodo, status, payment_id, motivo_recusa,
            created_at, updated_at
       FROM ${S}.payment_intents WHERE external_reference = $1`,
    [externalReference],
  )
  const linha = rows[0]
  return linha ? paraIntencao(linha) : null
}

/** Guarda o id do pagamento assim que o gateway o devolve, sem mudar o status. */
export async function anotarPagamentoNaIntencao(
  tx: Consulta,
  externalReference: string,
  paymentId: string,
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.payment_intents SET payment_id = $2, updated_at = $3
      WHERE external_reference = $1`,
    [externalReference, paymentId, agora],
  )
}

/**
 * Reivindica a intenção para crédito. Devolve a linha SÓ para o primeiro.
 *
 * `WHERE status = 'pendente'` dentro do próprio UPDATE é o que fecha a corrida:
 * o Postgres serializa as duas escritas na mesma linha, e a segunda não encontra
 * mais `pendente` para atualizar. Conferir o status numa consulta separada antes
 * do UPDATE deixaria a janela aberta.
 */
export async function reivindicarIntencao(
  tx: Consulta,
  externalReference: string,
  agora: number,
): Promise<IntencaoDeposito | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaIntencao>(
    `UPDATE ${S}.payment_intents
        SET status = 'creditando', updated_at = $2
      WHERE external_reference = $1 AND status = 'pendente'
      RETURNING external_reference, user_email, valor, metodo, status, payment_id,
                motivo_recusa, created_at, updated_at`,
    [externalReference, agora],
  )
  const linha = rows[0]
  return linha ? paraIntencao(linha) : null
}

export async function concluirIntencao(
  tx: Consulta,
  externalReference: string,
  paymentId: string | null,
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.payment_intents
        SET status = 'creditado', payment_id = COALESCE($2, payment_id), updated_at = $3
      WHERE external_reference = $1`,
    [externalReference, paymentId, agora],
  )
}

/**
 * Recusa a intenção e diz por quê. O motivo fica gravado porque ele é a resposta
 * de "por que este depósito não caiu?" — pergunta que chega dias depois, quando
 * o log já rodou.
 */
export async function recusarIntencao(
  tx: Consulta,
  externalReference: string,
  motivo: string,
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.payment_intents SET status = 'recusado', motivo_recusa = $2, updated_at = $3
      WHERE external_reference = $1`,
    [externalReference, motivo, agora],
  )
}

/** Devolve a intenção ao estado pendente — usada quando o crédito falha por infraestrutura. */
export async function devolverIntencaoParaPendente(
  tx: Consulta,
  externalReference: string,
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.payment_intents SET status = 'pendente', updated_at = $2
      WHERE external_reference = $1 AND status = 'creditando'`,
    [externalReference, agora],
  )
}

export async function listarTodasIntencoes(tx: Consulta): Promise<IntencaoDeposito[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaIntencao>(
    `SELECT external_reference, user_email, valor, metodo, status, payment_id, motivo_recusa,
            created_at, updated_at
       FROM ${S}.payment_intents ORDER BY created_at DESC`,
  )
  return rows.map(paraIntencao)
}

