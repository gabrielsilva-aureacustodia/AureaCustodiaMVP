import 'server-only'

/**
 * Repositório de recebimentos pelo gateway: `aurea.recebimentos_gateway`.
 *
 * Registra a separação financeira de todo pagamento confirmado pelo Mercado Pago (decisão F-5 e passo B1.3).
 * Separa valor bruto, valor pago pelo cliente, tarifa retida pelo gateway e valor líquido,
 * além de parcelas, data de liberação e competência.
 *
 * REGRA INEGOCIÁVEL:
 *  - Escrita é estritamente `INSERT … ON CONFLICT (payment_id) DO NOTHING` (idempotente).
 *  - Nenhuma linha é alterada ou removida.
 *  - A competência contábil segue `competenciaAtual(aprovadoEm)` de `src/domain/custody.ts` (UTC, RA-32).
 */

import { competenciaAtual } from '@/domain/custody'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { nomeDoSchema, num, numOuNulo, type Consulta } from '@/server/db/sql'

export interface RecebimentoGateway {
  id?: number
  createdAt: number
  paymentId: string
  externalReference: string
  tipoOperacao: string
  userEmail: string
  metodo: string
  parcelas: number
  valorBruto: number
  valorPagoCliente: number
  tarifaGateway: number
  valorLiquido: number
  aprovadoEm: number
  liberacaoPrevista: number | null
  competencia: string
}

type LinhaRecebimento = {
  id: unknown
  created_at: unknown
  payment_id: string
  external_reference: string
  tipo_operacao: string
  user_email: string
  metodo: string
  parcelas: unknown
  valor_bruto: unknown
  valor_pago_cliente: unknown
  tarifa_gateway: unknown
  valor_liquido: unknown
  aprovado_em: unknown
  liberacao_prevista: unknown | null
  competencia: string
}

function paraRecebimento(r: LinhaRecebimento): RecebimentoGateway {
  return {
    id: num(r.id),
    createdAt: num(r.created_at),
    paymentId: r.payment_id,
    externalReference: r.external_reference,
    tipoOperacao: r.tipo_operacao,
    userEmail: r.user_email,
    metodo: r.metodo,
    parcelas: num(r.parcelas),
    valorBruto: num(r.valor_bruto),
    valorPagoCliente: num(r.valor_pago_cliente),
    tarifaGateway: num(r.tarifa_gateway),
    valorLiquido: num(r.valor_liquido),
    aprovadoEm: num(r.aprovado_em),
    liberacaoPrevista: numOuNulo(r.liberacao_prevista),
    competencia: r.competencia,
  }
}

/* ------------------------------------------------------------------ *
 * Operações diretas no Postgres                                       *
 * ------------------------------------------------------------------ */

export async function inserirRecebimentoBanco(
  tx: Consulta,
  r: Omit<RecebimentoGateway, 'id' | 'createdAt' | 'competencia'> & {
    createdAt?: number
    competencia?: string
  },
): Promise<void> {
  const S = nomeDoSchema()
  const agora = r.createdAt ?? Date.now()
  const comp = r.competencia || competenciaAtual(r.aprovadoEm)
  const parcelas = r.parcelas && r.parcelas > 0 ? r.parcelas : 1

  await tx.query(
    `INSERT INTO ${S}.recebimentos_gateway
       (created_at, payment_id, external_reference, tipo_operacao, user_email, metodo,
        parcelas, valor_bruto, valor_pago_cliente, tarifa_gateway, valor_liquido,
        aprovado_em, liberacao_prevista, competencia)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (payment_id) DO NOTHING`,
    [
      agora,
      r.paymentId,
      r.externalReference,
      r.tipoOperacao,
      r.userEmail,
      r.metodo,
      parcelas,
      r.valorBruto,
      r.valorPagoCliente,
      r.tarifaGateway,
      r.valorLiquido,
      r.aprovadoEm,
      r.liberacaoPrevista,
      comp,
    ],
  )
}

export async function buscarRecebimentoPorPaymentIdBanco(
  tx: Consulta,
  paymentId: string,
): Promise<RecebimentoGateway | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRecebimento>(
    `SELECT id, created_at, payment_id, external_reference, tipo_operacao, user_email,
            metodo, parcelas, valor_bruto, valor_pago_cliente, tarifa_gateway, valor_liquido,
            aprovado_em, liberacao_prevista, competencia
       FROM ${S}.recebimentos_gateway
      WHERE payment_id = $1`,
    [paymentId],
  )
  const linha = rows[0]
  return linha ? paraRecebimento(linha) : null
}

export async function listarRecebimentosPorCompetenciaBanco(
  tx: Consulta,
  competencia: string,
): Promise<RecebimentoGateway[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRecebimento>(
    `SELECT id, created_at, payment_id, external_reference, tipo_operacao, user_email,
            metodo, parcelas, valor_bruto, valor_pago_cliente, tarifa_gateway, valor_liquido,
            aprovado_em, liberacao_prevista, competencia
       FROM ${S}.recebimentos_gateway
      WHERE competencia = $1
      ORDER BY aprovado_em ASC`,
    [competencia],
  )
  return rows.map(paraRecebimento)
}

export async function listarTodosRecebimentosBanco(tx: Consulta): Promise<RecebimentoGateway[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRecebimento>(
    `SELECT id, created_at, payment_id, external_reference, tipo_operacao, user_email,
            metodo, parcelas, valor_bruto, valor_pago_cliente, tarifa_gateway, valor_liquido,
            aprovado_em, liberacao_prevista, competencia
       FROM ${S}.recebimentos_gateway
      ORDER BY aprovado_em ASC`,
  )
  return rows.map(paraRecebimento)
}

/* ------------------------------------------------------------------ *
 * Adaptador de Memória (para testes e dev sem banco)                 *
 * ------------------------------------------------------------------ */

class MemoriaRecebimentos {
  private mapa = new Map<string, RecebimentoGateway>()
  private autoId = 1

  async gravar(
    r: Omit<RecebimentoGateway, 'id' | 'createdAt' | 'competencia'> & {
      createdAt?: number
      competencia?: string
    },
  ): Promise<void> {
    if (this.mapa.has(r.paymentId)) {
      return // ON CONFLICT DO NOTHING
    }
    const id = this.autoId++
    const createdAt = r.createdAt ?? Date.now()
    const competencia = r.competencia || competenciaAtual(r.aprovadoEm)
    const parcelas = r.parcelas && r.parcelas > 0 ? r.parcelas : 1
    const item: RecebimentoGateway = {
      ...r,
      id,
      createdAt,
      competencia,
      parcelas,
    }
    this.mapa.set(r.paymentId, item)
  }

  async buscarPorPaymentId(paymentId: string): Promise<RecebimentoGateway | null> {
    const item = this.mapa.get(paymentId)
    return item ? { ...item } : null
  }

  async listarPorCompetencia(competencia: string): Promise<RecebimentoGateway[]> {
    return Array.from(this.mapa.values())
      .filter((r) => r.competencia === competencia)
      .map((r) => ({ ...r }))
      .sort((a, b) => a.aprovadoEm - b.aprovadoEm)
  }

  async listarTodos(): Promise<RecebimentoGateway[]> {
    return Array.from(this.mapa.values())
      .map((r) => ({ ...r }))
      .sort((a, b) => a.aprovadoEm - b.aprovadoEm)
  }

  limpar(): void {
    this.mapa.clear()
    this.autoId = 1
  }
}

const memoriaRecebimentos = new MemoriaRecebimentos()

/* ------------------------------------------------------------------ *
 * API pública do repositório                                         *
 * ------------------------------------------------------------------ */

export async function gravarRecebimento(
  r: Omit<RecebimentoGateway, 'id' | 'createdAt' | 'competencia'> & {
    createdAt?: number
    competencia?: string
  },
): Promise<void> {
  if (bancoConfigurado()) {
    await executarNoBanco((tx) => inserirRecebimentoBanco(tx, r))
  } else {
    await memoriaRecebimentos.gravar(r)
  }
}

export async function buscarRecebimentoPorPaymentId(
  paymentId: string,
): Promise<RecebimentoGateway | null> {
  if (bancoConfigurado()) {
    return executarNoBanco((tx) => buscarRecebimentoPorPaymentIdBanco(tx, paymentId))
  }
  return memoriaRecebimentos.buscarPorPaymentId(paymentId)
}

export async function listarRecebimentosPorCompetencia(
  competencia: string,
): Promise<RecebimentoGateway[]> {
  if (bancoConfigurado()) {
    return executarNoBanco((tx) => listarRecebimentosPorCompetenciaBanco(tx, competencia))
  }
  return memoriaRecebimentos.listarPorCompetencia(competencia)
}

export async function listarTodosRecebimentos(): Promise<RecebimentoGateway[]> {
  if (bancoConfigurado()) {
    return executarNoBanco((tx) => listarTodosRecebimentosBanco(tx))
  }
  return memoriaRecebimentos.listarTodos()
}

/** Limpa memória para testes unitários isolados */
export function _limparRecebimentosEmMemoria(): void {
  memoriaRecebimentos.limpar()
}
