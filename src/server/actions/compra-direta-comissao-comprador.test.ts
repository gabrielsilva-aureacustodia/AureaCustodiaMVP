/**
 * `iniciarCompraDireta` cobra o mesmo total que o modal de /mercado mostra (E8, RA-24).
 *
 * Antes da E8 o comprador via "Total a pagar" com a comissão de compra e o Pix cobrava só o preço
 * do lote. A diferença sumia: a Áurea não recebia a comissão de quem compra por esse caminho, e o
 * livro-razão fechava com um lançamento de ajuste a cada compra.
 *
 * Prova que a cobrança usa a TABELA VIGENTE do painel, e não a do código, e que a comissão fica
 * congelada na metadata da intenção — porque o valor cobrado não muda depois de a cobrança abrir.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

const { criarPixDeposito, criarPreferenciaDeposito } = vi.hoisted(() => ({
  criarPixDeposito: vi.fn(),
  criarPreferenciaDeposito: vi.fn(),
}))
vi.mock('@/lib/payments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments')>()),
  criarPixDeposito,
  criarPreferenciaDeposito,
}))

const { carregarRegrasDoMercado } = vi.hoisted(() => ({ carregarRegrasDoMercado: vi.fn() }))
vi.mock('@/server/config/carregar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/config/carregar')>()),
  carregarRegrasDoMercado,
}))

import { COIN_TYPES } from '@/domain/constants'
import { TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from '@/server/payments/repositorios'
import { mutateState } from '@/server/state'

import { salvarCadastro } from './account'
import { iniciarCompraDireta } from './payments'

const TAXAS_DO_PAINEL: TabelaDeTaxas = {
  ...TAXAS_PADRAO,
  comissaoVendedorBp: 100,
  comissaoVendedorFixa: 250,
  comissaoCompradorBp: 80,
  comissaoCompradorFixa: 150, // comprador: 0,8% + R$ 1,50
}

const EMAIL_COMPRADOR = 'gabrielsilva@testeaurea.com.br'
const EMAIL_VENDEDOR = 'alex@testeaurea.com.br'

const PRECO = 20_000
/** round(20_000 × 80 / 10_000) + 150 */
const COMISSAO_UNIT = 310

async function completarCadastro() {
  await salvarCadastro({
    cpf: '529.982.247-25',
    nomeCompleto: 'Gabriel Silva',
    dataNascimento: '1990-01-01',
    telefone: '(11) 98765-4321',
    endereco: {
      logradouro: 'Rua das Moedas',
      numero: '10',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01001-000',
    },
    dadosBancarios: { chavePix: '52998224725', tipoChavePix: 'cpf' },
  })
}

async function prepararLote(lotId: string, quantas: number) {
  await mutateState((s) => {
    for (let i = 0; i < quantas; i += 1) {
      s.sellOffers.push({
        id: `OFFER-e8-action-${i}`,
        coinId: `RO-00000${i + 2}`,
        seller: EMAIL_VENDEDOR,
        price: PRECO,
        obs: 'Lote da E8',
        lotId,
        createdAt: Date.now(),
        tipoMoeda: 'Entrega da Bandeira Olímpica',
      })
    }
  })
}

describe('iniciarCompraDireta cobra preço + comissão de compra (E8)', () => {
  beforeEach(async () => {
    _limparRepositoriosEmMemoria()
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue(EMAIL_COMPRADOR)
    criarPixDeposito.mockReset()
    criarPreferenciaDeposito.mockReset()
    carregarRegrasDoMercado.mockReset()
    carregarRegrasDoMercado.mockResolvedValue({
      taxas: TAXAS_DO_PAINEL,
      catalogo: COIN_TYPES,
      depositoMaxCents: 10_000_000,
    })
    await mutateState((s) => {
      s.sellOffers = s.sellOffers.filter((o) => !o.lotId.startsWith('LOT-e8'))
    })
    await completarCadastro()
  })

  it('o Pix cobra custoDeCompraPorMoeda × qty, com a tabela vigente do painel', async () => {
    const lotId = 'LOT-e8-pix'
    await prepararLote(lotId, 2)
    criarPixDeposito.mockResolvedValue({
      paymentId: 'pay-e8-pix',
      qrCode: 'copia-e-cola',
      qrCodeBase64: 'base64',
    })

    const res = await iniciarCompraDireta(lotId, 2, 'pix')
    expect(res.ok).toBe(true)
    if (!res.ok || !res.data) throw new Error('Esperava sucesso')

    // 2 × (20_000 + 310)
    expect(res.data.valorCents).toBe(40_620)
    expect(criarPixDeposito).toHaveBeenCalledWith(
      expect.objectContaining({ valorCents: 40_620 }),
    )
  })

  it('congela a comissão por moeda na metadata da intenção', async () => {
    const lotId = 'LOT-e8-meta'
    await prepararLote(lotId, 1)
    criarPixDeposito.mockResolvedValue({
      paymentId: 'pay-e8-meta',
      qrCode: 'copia-e-cola',
      qrCodeBase64: 'base64',
    })

    const res = await iniciarCompraDireta(lotId, 1, 'pix')
    if (!res.ok || !res.data) throw new Error('Esperava sucesso')

    const intencao = await repositorioIntencoes().buscar(res.data.externalReference)
    expect(intencao?.metadata?.comissaoCompradorPorMoeda).toBe(COMISSAO_UNIT)
    expect(intencao?.metadata?.unitPrice).toBe(PRECO)
    expect(intencao?.valor).toBe(PRECO + COMISSAO_UNIT)
  })

  it('o cartão cobra o mesmo total do Pix', async () => {
    const lotId = 'LOT-e8-cartao'
    await prepararLote(lotId, 1)
    criarPreferenciaDeposito.mockResolvedValue({
      preferenceId: 'pref-e8',
      initPoint: 'https://mp.test/checkout',
    })

    const res = await iniciarCompraDireta(lotId, 1, 'checkout_pro')
    expect(res.ok).toBe(true)
    if (!res.ok || !res.data) throw new Error('Esperava sucesso')

    expect(res.data.valorCents).toBe(PRECO + COMISSAO_UNIT)
    expect(criarPreferenciaDeposito).toHaveBeenCalledWith(
      expect.objectContaining({ valorCents: PRECO + COMISSAO_UNIT }),
    )
  })

  it('o teto por operação compara o total COM a comissão', async () => {
    carregarRegrasDoMercado.mockResolvedValue({
      taxas: TAXAS_DO_PAINEL,
      catalogo: COIN_TYPES,
      // Cabe o preço, não cabe o preço mais a comissão.
      depositoMaxCents: PRECO + 100,
    })
    const lotId = 'LOT-e8-teto'
    await prepararLote(lotId, 1)

    const res = await iniciarCompraDireta(lotId, 1, 'pix')
    expect(res.ok).toBe(false)
    if (res.ok) throw new Error('Esperava recusa pelo teto')
    expect(res.error).toContain('valor máximo por operação')
    expect(criarPixDeposito).not.toHaveBeenCalled()
  })
})
