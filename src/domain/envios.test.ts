import { describe, expect, it } from 'vitest'

import type { Envio } from '@/domain/types'
import {
  PRAZO_DESCARTE_ENVIO_MS,
  isEnvioDesconsiderado,
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
