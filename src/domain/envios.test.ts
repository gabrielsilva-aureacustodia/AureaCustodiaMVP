import { describe, expect, it } from 'vitest'

import type { AppState, Envio } from '@/domain/types'
import {
  PRAZO_DESCARTE_ENVIO_MS,
  desconsiderarEnvio,
  envioVenceuPrazoDePostagem,
  isEnvioDesconsiderado,
  prePostagemAtiva,
  prazoPostagemEnvio,
  statusFaseEnvio,
} from './envios'

function makeEnvio(parciais: Partial<Envio> = {}): Envio {
  return {
    protocolo: 'RO-ENV-0001',
    userEmail: 'gabriel.silva@aureacustodia.com.br',
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    quantidade: 1,
    codigoRastreio: null,
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: 1000000,
    codigosAtivosGerados: [],
    origem: 'envio_postal',
    ...parciais,
  }
}

describe('Domínio de Envios — Descarte em 3 dias', () => {
  it('envio recém-criado não está desconsiderado e calcula tempo restante', () => {
    const t0 = 1000000
    const envio = makeEnvio({ createdAt: t0 })

    expect(isEnvioDesconsiderado(envio, t0)).toBe(false)

    // 1 dia após criação (restam 2 dias)
    const t1 = t0 + 24 * 60 * 60 * 1000
    const prazo1 = prazoPostagemEnvio(envio, t1)
    expect(prazo1.expirado).toBe(false)
    expect(prazo1.diasRestantes).toBe(2)
    expect(prazo1.mensagemAlerta).toContain('Resta(m) 2 dia(s)')

    // 2 dias e meio após criação (restam 12 horas)
    const t2 = t0 + 60 * 60 * 60 * 1000
    const prazo2 = prazoPostagemEnvio(envio, t2)
    expect(prazo2.expirado).toBe(false)
    expect(prazo2.diasRestantes).toBe(0)
    expect(prazo2.horasRestantes).toBe(12)
    expect(prazo2.mensagemAlerta).toContain('Resta(m) menos de 12 hora(s)')
  })

  it('envio não postado é desconsiderado ao completar exatamente 3 dias ou mais', () => {
    const t0 = 1000000
    const envio = makeEnvio({ createdAt: t0 })

    // 1 segundo antes de 3 dias: ainda ativo
    const umSegundoAntes = t0 + PRAZO_DESCARTE_ENVIO_MS - 1000
    expect(isEnvioDesconsiderado(envio, umSegundoAntes)).toBe(false)
    expect(prazoPostagemEnvio(envio, umSegundoAntes).expirado).toBe(false)

    // Exatamente 3 dias: expirado
    const tresDias = t0 + PRAZO_DESCARTE_ENVIO_MS
    expect(isEnvioDesconsiderado(envio, tresDias)).toBe(true)
    expect(prazoPostagemEnvio(envio, tresDias).expirado).toBe(true)

    // 4 dias: expirado
    const quatroDias = t0 + 4 * 24 * 60 * 60 * 1000
    expect(isEnvioDesconsiderado(envio, quatroDias)).toBe(true)
  })

  it('envio já postado nunca é desconsiderado pelo prazo de postagem', () => {
    const t0 = 1000000
    const cincoDiasDepois = t0 + 5 * 24 * 60 * 60 * 1000
    const envioPostado = makeEnvio({
      createdAt: t0,
      codigoRastreio: 'SL123456789BR',
      dataPostagem: t0 + 10000,
      etapaAtual: 'Envio postado',
    })

    expect(isEnvioDesconsiderado(envioPostado, cincoDiasDepois)).toBe(false)
    expect(prazoPostagemEnvio(envioPostado, cincoDiasDepois).expirado).toBe(false)
  })

  it('cadastro sem envio não é desconsiderado pelo prazo postal', () => {
    const t0 = 1000000
    const dezDiasDepois = t0 + 10 * 24 * 60 * 60 * 1000
    const envioDireto = makeEnvio({
      createdAt: t0,
      origem: 'cadastro_sem_envio',
    })

    expect(isEnvioDesconsiderado(envioDireto, dezDiasDepois)).toBe(false)
  })

  it('envio explicitamente carimbado com desconsideradoEm é sempre desconsiderado', () => {
    const envio = makeEnvio({
      desconsideradoEm: Date.now(),
      motivoDesconsideracao: 'Cancelado a pedido do cliente.',
    })
    expect(isEnvioDesconsiderado(envio)).toBe(true)
    expect(prazoPostagemEnvio(envio).expirado).toBe(true)
  })
})

describe('Domínio de Envios — Fases do ciclo de vida', () => {
  const t0 = 1000000

  it('fase: ainda não postado', () => {
    const envio = makeEnvio({ createdAt: t0 })
    const status = statusFaseEnvio(envio, null, t0)
    expect(status.fase).toBe('nao_postado')
    expect(status.rotulo).toBe('Ainda não postado')
    expect(status.descricao).toContain('ainda não postado')
  })

  it('fase: desconsiderado', () => {
    const envio = makeEnvio({ createdAt: t0 })
    const quatroDias = t0 + 4 * 24 * 60 * 60 * 1000
    const status = statusFaseEnvio(envio, null, quatroDias)
    expect(status.fase).toBe('desconsiderado')
    expect(status.rotulo).toBe('Desconsiderado')
    expect(status.badgeVariant).toBe('danger')
  })

  it('fase: postado vs em trânsito', () => {
    const envio = makeEnvio({
      createdAt: t0,
      codigoRastreio: 'SL123456789BR',
      dataPostagem: t0 + 1000,
      etapaAtual: 'Envio postado',
    })

    // Sem dados dos Correios ainda
    const s1 = statusFaseEnvio(envio, null, t0 + 2000)
    expect(s1.fase).toBe('postado')
    expect(s1.rotulo).toBe('Postado')

    // Correios indicam em trânsito
    const s2 = statusFaseEnvio(
      envio,
      { statusAtual: 'em_transito', etapaDescricao: 'Encaminhado para CTE Cajamar' },
      t0 + 2000,
    )
    expect(s2.fase).toBe('em_transito')
    expect(s2.rotulo).toBe('Em trânsito')
    expect(s2.descricao).toBe('Encaminhado para CTE Cajamar')
  })

  it('fase: recebido pela custódia', () => {
    const envio = makeEnvio({
      etapaAtual: 'Recebido pela custódia',
      dataRecebimento: t0 + 5000,
    })
    const s = statusFaseEnvio(envio)
    expect(s.fase).toBe('recebido')
    expect(s.rotulo).toBe('Recebido pela custódia')
  })

  it('fase: em análise física', () => {
    const envio = makeEnvio({
      etapaAtual: 'Em análise física',
    })
    const s = statusFaseEnvio(envio)
    expect(s.fase).toBe('em_analise')
    expect(s.rotulo).toBe('Em análise física')
  })

  it('fase: analisado / concluído', () => {
    const envio = makeEnvio({
      etapaAtual: 'Recibo emitido',
      codigosAtivosGerados: ['RO-BAN-0001'],
    })
    const s = statusFaseEnvio(envio)
    expect(s.fase).toBe('analisado')
    expect(s.rotulo).toBe('Analisado / Concluído')
    expect(s.descricao).toContain('RO-BAN-0001')
    expect(s.badgeVariant).toBe('success')
  })
})

describe('Domínio de Envios — frete pago e etiqueta oficial (22/10/2026)', () => {
  const PRE = {
    id: 'PRI1',
    codigoObjeto: 'AP123456789BR',
    codigoServico: '03301',
    criadaEm: 1000000,
    prazoPostagem: null,
    canceladaEm: null,
  }
  const FRETE = {
    modalidade: 'PAC' as const,
    codigoServico: '03301',
    valorCents: 2114,
    valorDeclaradoCents: 15000,
    prazoDiasUteis: 5,
    cotadoEm: 1000000,
    status: 'pago' as const,
    pagoEm: 1000000,
    forma: 'saldo' as const,
  }
  const vencido = 1000000 + PRAZO_DESCARTE_ENVIO_MS + 1

  it('envio com etiqueta vencido NÃO cai na leitura: quem decide é o servidor, depois de perguntar aos Correios', () => {
    const envio = makeEnvio({ prePostagem: PRE, frete: FRETE })
    expect(isEnvioDesconsiderado(envio, vencido)).toBe(false)
    expect(envioVenceuPrazoDePostagem(envio, vencido)).toBe(true)
    const prazo = prazoPostagemEnvio(envio, vencido)
    expect(prazo.expirado).toBe(false)
    expect(prazo.mensagemAlerta).toContain('frete volta ao seu saldo')
  })

  it('etiqueta cancelada volta à regra comum dos 3 dias', () => {
    const envio = makeEnvio({ prePostagem: { ...PRE, canceladaEm: 2 } })
    expect(prePostagemAtiva(envio)).toBeNull()
    expect(isEnvioDesconsiderado(envio, vencido)).toBe(true)
  })

  it('desconsiderar com frete pago devolve o frete ao saldo uma vez só', () => {
    const envio = makeEnvio({ frete: { ...FRETE }, prePostagem: PRE })
    const state = { users: { [envio.userEmail]: { balance: 500 } }, envios: [envio] } as unknown as AppState

    const r1 = desconsiderarEnvio(state, envio, vencido)
    expect(r1.freteEstornadoCents).toBe(2114)
    expect(r1.prePostagemACancelar?.id).toBe('PRI1')
    expect(state.users[envio.userEmail].balance).toBe(2614)
    expect(envio.frete?.status).toBe('estornado')
    expect(envio.desconsideradoEm).toBe(vencido)

    const r2 = desconsiderarEnvio(state, envio, vencido + 1)
    expect(r2.freteEstornadoCents).toBe(0)
    expect(state.users[envio.userEmail].balance).toBe(2614)
  })

  it('desconsiderar sem frete pago não mexe em saldo', () => {
    const envio = makeEnvio({ frete: { ...FRETE, status: 'cotado' } })
    const state = { users: { [envio.userEmail]: { balance: 500 } }, envios: [envio] } as unknown as AppState
    expect(desconsiderarEnvio(state, envio, vencido).freteEstornadoCents).toBe(0)
    expect(state.users[envio.userEmail].balance).toBe(500)
    expect(envio.frete?.status).toBe('cotado')
  })
})
