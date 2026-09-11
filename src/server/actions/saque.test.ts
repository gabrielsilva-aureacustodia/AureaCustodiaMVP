import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import {
  confirmarLiquidacaoSaque,
  listarMeusSaques,
  rejeitarSaque,
  salvarCadastro,
  solicitarSaque,
  type CadastroInput,
} from './account'
import { mutateState } from '@/server/state'

const EMAIL_TESTE = 'gabrielsilva@testeaurea.com.br'

describe('Server Actions de Saque de Recursos (account.ts)', () => {
  beforeEach(async () => {
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue(EMAIL_TESTE)

    // Prepara o estado inicial: limpa cadastro, garante saldo e reseta saques
    await mutateState((s) => {
      const u = s.users[EMAIL_TESTE]
      if (u) {
        delete (u as { cadastro?: unknown }).cadastro
        u.balance = 50_000 // R$ 500,00
      }
      s.saques = []
    })
  })

  const cadastroValido: CadastroInput = {
    cpf: '529.982.247-25',
    nomeCompleto: 'Gabriel Silva Santos',
    dataNascimento: '1990-08-20',
    telefone: '(11) 98765-4321',
    endereco: {
      logradouro: 'Rua das Moedas',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01001-000',
    },
    dadosBancarios: {
      chavePix: '52998224725',
      tipoChavePix: 'cpf',
    },
  }

  describe('solicitarSaque', () => {
    it('rejeita chamada sem sessão autenticada', async () => {
      getSessionEmail.mockResolvedValue(null)
      const res = await solicitarSaque(10_000)
      expect(res).toEqual({ ok: false, error: 'Sessão expirada.' })
    })

    it('rejeita valor que não seja número inteiro ou seja menor/igual à taxa fixa de R$ 5,00', async () => {
      // Valor decimal
      const resDecimal = await solicitarSaque(500.5)
      expect(resDecimal.ok).toBe(false)
      expect(resDecimal.error).toContain('R$ 5,01')

      // Valor exato da taxa (R$ 5,00 = 500 cents)
      const resIgual = await solicitarSaque(500)
      expect(resIgual.ok).toBe(false)
      expect(resIgual.error).toContain('R$ 5,01')

      // Valor menor que a taxa (R$ 4,00)
      const resMenor = await solicitarSaque(400)
      expect(resMenor.ok).toBe(false)
      expect(resMenor.error).toContain('R$ 5,01')

      // Valor negativo
      const resNegativo = await solicitarSaque(-1000)
      expect(resNegativo.ok).toBe(false)
      expect(resNegativo.error).toContain('R$ 5,01')
    })

    it('rejeita solicitação se o usuário não possui dados bancários cadastrados', async () => {
      const res = await solicitarSaque(10_000)
      expect(res.ok).toBe(false)
      expect(res.error).toContain('Dados bancários para recebimento não cadastrados')
    })

    it('rejeita solicitação se o saldo disponível for insuficiente', async () => {
      await salvarCadastro(cadastroValido)
      // Tenta sacar R$ 600,00 quando o saldo é R$ 500,00
      const res = await solicitarSaque(60_000)
      expect(res.ok).toBe(false)
      expect(res.error).toBe('Saldo insuficiente para saque.')
    })

    it('registra o saque com sucesso debitando o saldo e calculando a taxa de R$ 5,00 e prazo D+3', async () => {
      await salvarCadastro(cadastroValido)

      // Saque de R$ 100,00 (10.000 centavos)
      const res = await solicitarSaque(10_000)
      expect(res.ok).toBe(true)
      expect(res.data).toBeDefined()
      expect(res.data?.valorTotal).toBe(10_000)
      expect(res.data?.taxa).toBe(500)
      expect(res.data?.valorLiquido).toBe(9_500)
      expect(res.data?.previsaoPagamento).toBeDefined()

      // Confere saldo residual e objeto de saque gravado
      const lista = await listarMeusSaques()
      expect(lista.ok).toBe(true)
      expect(lista.data?.length).toBe(1)

      const sq = lista.data![0]
      expect(sq.valorTotal).toBe(10_000)
      expect(sq.taxa).toBe(500)
      expect(sq.valorLiquido).toBe(9_500)
      expect(sq.status).toBe('solicitado')
      expect(sq.dadosBancarios.chavePix).toBe('52998224725')

      // Confere que o saldo diminuiu de 50.000 para 40.000
      await mutateState((s) => {
        expect(s.users[EMAIL_TESTE]?.balance).toBe(40_000)
      })
    })
  })

  describe('confirmarLiquidacaoSaque e rejeitarSaque', () => {
    it('permite liquidar um saque pendente gravando comprovante e data de pagamento', async () => {
      await salvarCadastro(cadastroValido)
      const res = await solicitarSaque(10_000)
      expect(res.ok).toBe(true)
      const saqueId = res.data!.saqueId

      const resLiq = await confirmarLiquidacaoSaque(saqueId, 'PIX-AUT-123456789')
      expect(resLiq.ok).toBe(true)

      const lista = await listarMeusSaques()
      const sq = lista.data!.find((item) => item.id === saqueId)
      expect(sq?.status).toBe('pago')
      expect(sq?.comprovanteRef).toBe('PIX-AUT-123456789')
      expect(sq?.pagoEm).toBeDefined()

      // Tentar liquidar novamente deve falhar
      const resDupla = await confirmarLiquidacaoSaque(saqueId)
      expect(resDupla.ok).toBe(false)
      expect(resDupla.error).toContain('já foi liquidado')
    })

    it('rejeita/cancela um saque com motivo e estorna o saldo integral para o cliente', async () => {
      await salvarCadastro(cadastroValido)
      const res = await solicitarSaque(10_000)
      expect(res.ok).toBe(true)
      const saqueId = res.data!.saqueId

      // Saldo após saque: 40.000
      await mutateState((s) => {
        expect(s.users[EMAIL_TESTE]?.balance).toBe(40_000)
      })

      // Rejeita com motivo
      const resRejeicao = await rejeitarSaque(saqueId, 'Chave Pix não encontrada no banco de destino')
      expect(resRejeicao.ok).toBe(true)

      const lista = await listarMeusSaques()
      const sq = lista.data!.find((item) => item.id === saqueId)
      expect(sq?.status).toBe('falhou')
      expect(sq?.motivoFalha).toBe('Chave Pix não encontrada no banco de destino')

      // Saldo deve ter sido estornado integralmente (volta para 50.000)
      await mutateState((s) => {
        expect(s.users[EMAIL_TESTE]?.balance).toBe(50_000)
      })

      // Tentar liquidar um saque falho deve ser recusado
      const resLiqFalho = await confirmarLiquidacaoSaque(saqueId)
      expect(resLiqFalho.ok).toBe(false)
      expect(resLiqFalho.error).toContain('marcado como falho')
    })
  })
})
