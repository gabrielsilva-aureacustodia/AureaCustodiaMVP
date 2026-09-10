/**
 * POST /api/estacao/analise/fechar — o veredito. É aqui que a moeda nasce.
 *
 * Corpo:
 * {
 *   "protocolo": "RO-ENV-0001",
 *   "operador": "gabriel.silva@aureacustodia.com.br",
 *   "moedas": [
 *     { "pesoMg": 27000, "veredito": "aprovada", "caixa": "EB-001", "posicao": 7,
 *       "caminhoVideo": "analises/RO-ENV-0001/RO-ENV-0001-1.webm" },
 *     { "pesoMg": 26800, "veredito": "recusada", "motivoRecusa": "Peso fora da tolerância" }
 *   ]
 * }
 *
 * A VALIDAÇÃO AQUI NÃO É BUROCRACIA. Esta é a rota que cria ativo do nada — a
 * mesma que, no monolito, dava para chamar pelo console do navegador e fabricar
 * acervo. Peso que chega como texto, veredito escrito errado ou lista com
 * tamanho diferente do envio viram 400 antes de encostar no estado.
 *
 * O que NÃO se valida aqui: nada de trava de ambiente, aceite ou confirmação em
 * dobro. Se a chave é válida e o corpo faz sentido, grava.
 */

import { NextRequest, NextResponse } from 'next/server'

import { autorizarEstacao } from '@/server/estacao/acesso'
import { fecharAnalise, type VereditoRecebido } from '@/server/estacao/analise'
import type { VereditoAnalise } from '@/domain/types'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

/** Peso plausível para moeda comemorativa brasileira: de 1 g a 100 g. */
const PESO_MIN_MG = 1000
const PESO_MAX_MG = 100000

type Erro = { campo: string; motivo: string }

function textoOpcional(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function validarMoeda(v: unknown, i: number, erros: Erro[]): VereditoRecebido | null {
  if (typeof v !== 'object' || v === null) {
    erros.push({ campo: `moedas[${i}]`, motivo: 'não é um objeto' })
    return null
  }
  const o = v as Record<string, unknown>

  const veredito = o.veredito
  if (veredito !== 'aprovada' && veredito !== 'recusada') {
    erros.push({ campo: `moedas[${i}].veredito`, motivo: 'precisa ser "aprovada" ou "recusada"' })
    return null
  }

  const peso = o.pesoMg
  if (typeof peso !== 'number' || !Number.isFinite(peso)) {
    erros.push({ campo: `moedas[${i}].pesoMg`, motivo: 'precisa ser número em miligramas' })
    return null
  }
  if (peso < PESO_MIN_MG || peso > PESO_MAX_MG) {
    erros.push({
      campo: `moedas[${i}].pesoMg`,
      motivo: `fora da faixa plausível (${PESO_MIN_MG} a ${PESO_MAX_MG} mg) — o valor foi digitado em gramas?`,
    })
    return null
  }

  const motivoRecusa = textoOpcional(o.motivoRecusa)
  // Recusa sem motivo é o registro que não explica nada ao cliente cujo pacote
  // está voltando — e é ele quem paga o frete da devolução.
  if (veredito === 'recusada' && motivoRecusa === null) {
    erros.push({ campo: `moedas[${i}].motivoRecusa`, motivo: 'obrigatório quando a moeda é recusada' })
    return null
  }

  const posicao = o.posicao
  return {
    pesoMg: peso,
    veredito: veredito as VereditoAnalise,
    motivoRecusa,
    caixa: textoOpcional(o.caixa),
    posicao: typeof posicao === 'number' && Number.isFinite(posicao) ? posicao : null,
    caminhoVideo: textoOpcional(o.caminhoVideo),
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const acesso = autorizarEstacao(req.headers.get('authorization'))
  if (!acesso.ok) {
    return NextResponse.json({ error: acesso.erro }, { status: acesso.status, headers: SEM_CACHE })
  }

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400, headers: SEM_CACHE })
  }
  if (typeof corpo !== 'object' || corpo === null) {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400, headers: SEM_CACHE })
  }
  const c = corpo as Record<string, unknown>

  const erros: Erro[] = []

  const protocolo = textoOpcional(c.protocolo)
  if (protocolo === null) erros.push({ campo: 'protocolo', motivo: 'obrigatório' })

  const operador = textoOpcional(c.operador)
  if (operador === null) erros.push({ campo: 'operador', motivo: 'obrigatório' })

  const lista = c.moedas
  if (!Array.isArray(lista) || lista.length === 0) {
    erros.push({ campo: 'moedas', motivo: 'precisa ser uma lista com ao menos um veredito' })
  }

  const moedas: VereditoRecebido[] = []
  if (Array.isArray(lista)) {
    lista.forEach((m, i) => {
      const v = validarMoeda(m, i, erros)
      if (v) moedas.push(v)
    })
  }

  if (erros.length > 0) {
    return NextResponse.json(
      { error: 'Dados da análise inválidos.', detalhes: erros },
      { status: 400, headers: SEM_CACHE },
    )
  }

  const r = await fecharAnalise({
    protocolo: protocolo as string,
    operador: operador as string,
    moedas,
  })

  if (!r.ok) {
    return NextResponse.json({ error: r.erro }, { status: r.status, headers: SEM_CACHE })
  }
  return NextResponse.json({ ok: true, ...r.dados }, { headers: SEM_CACHE })
}
