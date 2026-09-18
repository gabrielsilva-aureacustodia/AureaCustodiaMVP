import { describe, expect, it } from 'vitest'

import type { Envio, Retirada } from '@/domain/types'

import {
  diasCorridosEntre,
  diasUteisEntre,
  filtrarEnvios,
  filtrarRetiradas,
  FILTRO_LOGISTICA_PADRAO,
  lerFiltroLogistica,
  linhaDeEnvio,
  linhaDeRetirada,
} from './logistica'

/** Meio-dia de Brasília (15h UTC) de uma data. */
function dia(ano: number, mes: number, d: number): number {
  return Date.UTC(ano, mes - 1, d, 15, 0, 0)
}

function envio(parcial: Partial<Envio>): Envio {
  return {
    protocolo: 'RO-ENV-0001',
    userEmail: 'a@x.com',
    tipoMoeda: 'Direitos Humanos',
    ano: 1998,
    quantidade: 2,
    codigoRastreio: 'BR123456789BR',
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: dia(2026, 9, 1),
    codigosAtivosGerados: [],
    ...parcial,
  }
}

function retirada(parcial: Partial<Retirada>): Retirada {
  return {
    id: 'RET-000001',
    coinId: 'RO-000001',
    reciboCodigo: 'REC-000001',
    userEmail: 'a@x.com',
    modalidade: 'segura',
    status: 'paga',
    valorTaxaCents: 18000,
    endereco: { nome: 'A', cpfOuCnpj: '1', logradouro: 'R', numero: '1', bairro: 'B', cidade: 'C', uf: 'SP', cep: '0', telefone: '1' },
    solicitadoEm: dia(2026, 8, 1),
    dataLimiteD30: dia(2026, 8, 31),
    historico: [],
    formaPagamento: 'cartao',
    parcelas: 2,
    ...parcial,
  }
}

describe('contagem de dias no calendário de Brasília', () => {
  it('dias úteis pulam sábado e domingo', () => {
    // 11/09/2026 é sexta; 14/09 é segunda.
    expect(diasUteisEntre(dia(2026, 9, 11), dia(2026, 9, 14))).toBe(1)
    expect(diasUteisEntre(dia(2026, 9, 11), dia(2026, 9, 16))).toBe(3)
    expect(diasUteisEntre(dia(2026, 9, 14), dia(2026, 9, 14))).toBe(0)
  })

  it('22h de Brasília ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC', () => {
    const noite = Date.UTC(2026, 8, 15, 1, 0, 0) // 14/09 às 22h em Brasília
    expect(diasCorridosEntre(dia(2026, 9, 14), noite)).toBe(0)
  })
})

describe('prazos da logística', () => {
  it('envio recebido há mais de 2 dias úteis sem recibo acende o alerta', () => {
    const e = envio({ etapaAtual: 'Em análise física', dataPostagem: dia(2026, 9, 2), dataRecebimento: dia(2026, 9, 10) })
    expect(linhaDeEnvio(e, 'Alex', dia(2026, 9, 14))).toMatchObject({ atrasado: false, alerta: null })
    expect(linhaDeEnvio(e, 'Alex', dia(2026, 9, 15))).toMatchObject({ atrasado: true, aberto: true })
    expect(linhaDeEnvio(e, 'Alex', dia(2026, 9, 15)).alerta).toContain('3 dia(s) útil(eis)')
  })

  it('o prazo vem por parâmetro — a aba Operacional pode mudar sem tocar em fluxo', () => {
    const e = envio({ etapaAtual: 'Envio postado', dataPostagem: dia(2026, 9, 1) })
    expect(linhaDeEnvio(e, 'Alex', dia(2026, 9, 14)).atrasado).toBe(false)
    expect(linhaDeEnvio(e, 'Alex', dia(2026, 9, 14), { validacaoDiasUteis: 2, transitoEnvioDias: 10 })).toMatchObject({
      atrasado: true,
      alerta: 'Postado há 13 dias e ainda não chegou ao cofre.',
    })
  })

  it('envio com recibo emitido está encerrado e nunca atrasa', () => {
    const e = envio({ etapaAtual: 'Recibo emitido', dataRecebimento: dia(2026, 1, 1) })
    expect(linhaDeEnvio(e, 'Alex', dia(2026, 9, 14))).toMatchObject({ aberto: false, atrasado: false })
  })

  it('retirada aberta depois do D+30 está atrasada; entregue e cancelada, não', () => {
    const agora = dia(2026, 9, 3)
    expect(linhaDeRetirada(retirada({}), 'Alex', agora)).toMatchObject({
      aberta: true,
      atrasada: true,
      alerta: 'Passou do prazo de postagem de 30 dias há 3 dia(s).',
      formaPagamento: 'cartao',
      parcelas: 2,
    })
    expect(linhaDeRetirada(retirada({ status: 'entregue' }), 'Alex', agora).atrasada).toBe(false)
    expect(linhaDeRetirada(retirada({ status: 'cancelada' }), 'Alex', agora).aberta).toBe(false)
  })
})

describe('filtro da logística', () => {
  it('lê a URL e ignora valor desconhecido', () => {
    expect(lerFiltroLogistica({ ver: 'retiradas', situacao: 'atrasados', busca: ' BR123 ' })).toEqual({ ver: 'retiradas', situacao: 'atrasados', busca: 'BR123' })
    expect(lerFiltroLogistica({ ver: 'x', situacao: 'y' })).toEqual(FILTRO_LOGISTICA_PADRAO)
  })

  it('atrasados primeiro; "abertos" esconde o que terminou; busca por rastreio e nome', () => {
    const agora = dia(2026, 9, 15)
    const envios = [
      linhaDeEnvio(envio({ protocolo: 'RO-ENV-0001', etapaAtual: 'Recibo emitido', createdAt: dia(2026, 9, 3) }), 'Alex', agora),
      linhaDeEnvio(envio({ protocolo: 'RO-ENV-0002', createdAt: dia(2026, 9, 5) }), 'Alex', agora),
      linhaDeEnvio(envio({ protocolo: 'RO-ENV-0003', etapaAtual: 'Recebido pela custódia', dataRecebimento: dia(2026, 9, 9), createdAt: dia(2026, 9, 1), codigoRastreio: 'QQ1BR' }), 'Bia', agora),
    ]
    expect(filtrarEnvios(envios, FILTRO_LOGISTICA_PADRAO).map((l) => l.protocolo)).toEqual(['RO-ENV-0003', 'RO-ENV-0002'])
    expect(filtrarEnvios(envios, { ...FILTRO_LOGISTICA_PADRAO, situacao: 'todos', busca: 'qq1' }).map((l) => l.protocolo)).toEqual(['RO-ENV-0003'])
    expect(filtrarEnvios(envios, { ...FILTRO_LOGISTICA_PADRAO, ver: 'retiradas' })).toEqual([])
    const retiradas = [linhaDeRetirada(retirada({ status: 'entregue' }), 'Alex', agora)]
    expect(filtrarRetiradas(retiradas, { ...FILTRO_LOGISTICA_PADRAO, situacao: 'todos', busca: 'alex' })).toHaveLength(1)
    expect(filtrarRetiradas(retiradas, FILTRO_LOGISTICA_PADRAO)).toHaveLength(0)
  })
})
