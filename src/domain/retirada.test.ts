import { describe, expect, it } from 'vitest'

import {
  calcularPrazoLimiteRetirada,
  calcularTaxaRetirada,
  criarSolicitacaoRetirada,
  podeTransicionarRetirada,
  PRAZO_RETIRADA_DIAS,
  TAXA_RETIRADA_COMUM_CENTS,
  TAXA_RETIRADA_SEGURA_CENTS,
  transicionarRetirada,
  validarEnderecoRetirada,
} from './retirada'
import type { EnderecoEntrega, ModalidadeRetirada, StatusRetirada } from './types'

const ENDERECO_VALIDO_EXEMPLO: EnderecoEntrega = {
  nome: 'Gabriel Silva',
  cpfOuCnpj: '123.456.789-00',
  logradouro: 'Rua dos Tabajaras',
  numero: '12',
  complemento: 'Sala 210',
  bairro: 'Floresta',
  cidade: 'Belo Horizonte',
  uf: 'MG',
  cep: '30150-040',
  telefone: '31999998888',
}

describe('Regras de Negócio e Máquina de Estados de Retirada (Frente C)', () => {
  describe('Tabela de Preços (D-1)', () => {
    it('retorna R$ 50,00 (5000 cents) para a modalidade comum', () => {
      expect(TAXA_RETIRADA_COMUM_CENTS).toBe(5000)
      expect(calcularTaxaRetirada('comum')).toBe(5000)
    })

    it('retorna R$ 180,00 (18000 cents) para a modalidade segura', () => {
      expect(TAXA_RETIRADA_SEGURA_CENTS).toBe(18000)
      expect(calcularTaxaRetirada('segura')).toBe(18000)
    })

    it('lança erro para modalidade desconhecida', () => {
      expect(() => calcularTaxaRetirada('expressa' as unknown as ModalidadeRetirada)).toThrow(
        /Modalidade de retirada desconhecida/,
      )
    })
  })

  describe('Cálculo de Prazo D+30 (D-2)', () => {
    it('mantém o prazo isolado na constante PRAZO_RETIRADA_DIAS = 30', () => {
      expect(PRAZO_RETIRADA_DIAS).toBe(30)
    })

    it('calcula a data-limite somando exatamente 30 dias corridos em milissegundos', () => {
      const dataSolicitacao = 1757548800000 // timestamp base
      const limite = calcularPrazoLimiteRetirada(dataSolicitacao)
      const msEsperados = 30 * 24 * 60 * 60 * 1000
      expect(limite).toBe(dataSolicitacao + msEsperados)
    })

    it('permite sobrescrever o número de dias se a decisão D-2 definir prazo diferente', () => {
      const dataSolicitacao = 1757548800000
      const limite = calcularPrazoLimiteRetirada(dataSolicitacao, 35) // D+30 + D+5
      const msEsperados = 35 * 24 * 60 * 60 * 1000
      expect(limite).toBe(dataSolicitacao + msEsperados)
    })

    it('rejeita timestamp inválido ou menor/igual a zero', () => {
      expect(() => calcularPrazoLimiteRetirada(0)).toThrow(/Data de solicitação inválida/)
      expect(() => calcularPrazoLimiteRetirada(-100)).toThrow(/Data de solicitação inválida/)
      expect(() => calcularPrazoLimiteRetirada(NaN)).toThrow(/Data de solicitação inválida/)
    })
  })

  describe('Validação de Endereço de Entrega (Trava 2)', () => {
    it('aprova endereço completo com CPF formatado', () => {
      const res = validarEnderecoRetirada(ENDERECO_VALIDO_EXEMPLO)
      expect(res.valido).toBe(true)
      expect(res.erros).toHaveLength(0)
    })

    it('aprova endereço completo com CNPJ', () => {
      const res = validarEnderecoRetirada({
        ...ENDERECO_VALIDO_EXEMPLO,
        cpfOuCnpj: '68.071.452/0001-06',
      })
      expect(res.valido).toBe(true)
      expect(res.erros).toHaveLength(0)
    })

    it('recusa se o objeto for nulo ou indefinido', () => {
      expect(validarEnderecoRetirada(null).valido).toBe(false)
      expect(validarEnderecoRetirada(undefined).valido).toBe(false)
    })

    it('recusa nome ausente ou com menos de 3 caracteres', () => {
      const res = validarEnderecoRetirada({ ...ENDERECO_VALIDO_EXEMPLO, nome: 'Ab' })
      expect(res.valido).toBe(false)
      expect(res.erros.some((e) => e.includes('Nome completo'))).toBe(true)
    })

    it('recusa documento com número de dígitos incorreto', () => {
      const res = validarEnderecoRetirada({ ...ENDERECO_VALIDO_EXEMPLO, cpfOuCnpj: '123.456' })
      expect(res.valido).toBe(false)
      expect(res.erros.some((e) => e.includes('CPF ou CNPJ'))).toBe(true)
    })

    it('recusa CEP que não tenha 8 dígitos', () => {
      const res = validarEnderecoRetirada({ ...ENDERECO_VALIDO_EXEMPLO, cep: '30150-04' })
      expect(res.valido).toBe(false)
      expect(res.erros.some((e) => e.includes('CEP'))).toBe(true)
    })

    it('recusa UF diferente de 2 letras', () => {
      const res = validarEnderecoRetirada({ ...ENDERECO_VALIDO_EXEMPLO, uf: 'MINAS' })
      expect(res.valido).toBe(false)
      expect(res.erros.some((e) => e.includes('UF'))).toBe(true)
    })

    it('recusa logradouro, número, bairro ou cidade vazios', () => {
      const res = validarEnderecoRetirada({
        ...ENDERECO_VALIDO_EXEMPLO,
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
      })
      expect(res.valido).toBe(false)
      expect(res.erros.length).toBeGreaterThanOrEqual(4)
    })

    it('recusa telefone com menos de 10 dígitos', () => {
      const res = validarEnderecoRetirada({ ...ENDERECO_VALIDO_EXEMPLO, telefone: '319999' })
      expect(res.valido).toBe(false)
      expect(res.erros.some((e) => e.includes('Telefone'))).toBe(true)
    })
  })

  describe('Criação da Solicitação de Retirada', () => {
    it('cria solicitação no estado "solicitada" com histórico inicial', () => {
      const ts = 1757548800000
      const ret = criarSolicitacaoRetirada({
        id: 'RET-000001',
        coinId: 'RO-000042',
        reciboCodigo: 'REC-000042',
        userEmail: 'rogerio@testeaurea.com.br',
        modalidade: 'comum',
        endereco: ENDERECO_VALIDO_EXEMPLO,
        solicitadoEm: ts,
      })

      expect(ret.id).toBe('RET-000001')
      expect(ret.coinId).toBe('RO-000042')
      expect(ret.reciboCodigo).toBe('REC-000042')
      expect(ret.status).toBe('solicitada')
      expect(ret.valorTaxaCents).toBe(5000)
      expect(ret.dataLimiteD30).toBe(ts + 30 * 24 * 60 * 60 * 1000)
      expect(ret.historico).toHaveLength(1)
      expect(ret.historico[0].para).toBe('solicitada')
    })

    it('falha ao criar solicitação com endereço inválido', () => {
      expect(() =>
        criarSolicitacaoRetirada({
          id: 'RET-000002',
          coinId: 'RO-000043',
          reciboCodigo: 'REC-000043',
          userEmail: 'rogerio@testeaurea.com.br',
          modalidade: 'segura',
          endereco: { ...ENDERECO_VALIDO_EXEMPLO, cep: '123' },
          solicitadoEm: Date.now(),
        }),
      ).toThrow(/Endereço de retirada inválido/)
    })
  })

  describe('Máquina de Estados de Retirada', () => {
    it('valida transições permitidas', () => {
      expect(podeTransicionarRetirada('solicitada', 'paga')).toBe(true)
      expect(podeTransicionarRetirada('solicitada', 'cancelada')).toBe(true)
      expect(podeTransicionarRetirada('paga', 'separacao')).toBe(true)
      expect(podeTransicionarRetirada('paga', 'cancelada')).toBe(true)
      expect(podeTransicionarRetirada('separacao', 'postada')).toBe(true)
      expect(podeTransicionarRetirada('postada', 'entregue')).toBe(true)
    })

    it('rejeita saltos ilegais no fluxo', () => {
      expect(podeTransicionarRetirada('solicitada', 'separacao')).toBe(false)
      expect(podeTransicionarRetirada('solicitada', 'postada')).toBe(false)
      expect(podeTransicionarRetirada('solicitada', 'entregue')).toBe(false)
      expect(podeTransicionarRetirada('paga', 'postada')).toBe(false)
      expect(podeTransicionarRetirada('paga', 'entregue')).toBe(false)
      expect(podeTransicionarRetirada('separacao', 'entregue')).toBe(false)
    })

    it('rejeita regressões no fluxo', () => {
      expect(podeTransicionarRetirada('paga', 'solicitada')).toBe(false)
      expect(podeTransicionarRetirada('separacao', 'paga')).toBe(false)
      expect(podeTransicionarRetirada('postada', 'separacao')).toBe(false)
      expect(podeTransicionarRetirada('entregue', 'postada')).toBe(false)
      expect(podeTransicionarRetirada('cancelada', 'solicitada')).toBe(false)
    })

    it('rejeita transição para o mesmo estado', () => {
      const estados: StatusRetirada[] = [
        'solicitada',
        'paga',
        'separacao',
        'postada',
        'entregue',
        'cancelada',
      ]
      for (const e of estados) {
        expect(podeTransicionarRetirada(e, e)).toBe(false)
      }
    })

    it('executa o ciclo completo de ponta a ponta com imutabilidade e histórico', () => {
      const t0 = 1000
      let r = criarSolicitacaoRetirada({
        id: 'RET-000001',
        coinId: 'RO-000001',
        reciboCodigo: 'REC-000001',
        userEmail: 'cliente@teste.com',
        modalidade: 'comum',
        endereco: ENDERECO_VALIDO_EXEMPLO,
        solicitadoEm: t0,
      })

      // 1. solicitada -> paga
      const t1 = 2000
      r = transicionarRetirada(r, 'paga', { data: t1, autor: 'sistema:webhook' })
      expect(r.status).toBe('paga')
      expect(r.pagoEm).toBe(t1)
      expect(r.historico).toHaveLength(2)

      // 2. paga -> separacao
      const t2 = 3000
      r = transicionarRetirada(r, 'separacao', {
        data: t2,
        motivo: 'Iniciada separação física no cofre',
        autor: 'rogeriopena@testeaurea.com.br',
      })
      expect(r.status).toBe('separacao')
      expect(r.historico).toHaveLength(3)

      // 3. separacao -> postada (requer código de rastreio)
      const t3 = 4000
      expect(() => transicionarRetirada(r, 'postada', { data: t3 })).toThrow(
        /Código de rastreamento postal é obrigatório/,
      )

      r = transicionarRetirada(r, 'postada', {
        data: t3,
        codigoRastreio: 'SL123456789BR',
        motivo: 'Postado nos Correios com AR e valor declarado',
      })
      expect(r.status).toBe('postada')
      expect(r.codigoRastreio).toBe('SL123456789BR')
      expect(r.historico).toHaveLength(4)

      // 4. postada -> entregue
      const t4 = 5000
      r = transicionarRetirada(r, 'entregue', {
        data: t4,
        motivo: 'Entrega confirmada pelo SRO Correios',
      })
      expect(r.status).toBe('entregue')
      expect(r.historico).toHaveLength(5)
    })

    it('permite cancelamento e impede transições a partir do estado cancelada', () => {
      let r = criarSolicitacaoRetirada({
        id: 'RET-000002',
        coinId: 'RO-000002',
        reciboCodigo: 'REC-000002',
        userEmail: 'cliente@teste.com',
        modalidade: 'segura',
        endereco: ENDERECO_VALIDO_EXEMPLO,
        solicitadoEm: 1000,
      })

      r = transicionarRetirada(r, 'cancelada', {
        data: 1500,
        motivo: 'Cancelamento solicitado pelo cliente antes do pagamento',
      })

      expect(r.status).toBe('cancelada')
      expect(() => transicionarRetirada(r, 'paga', { data: 2000 })).toThrow(
        /Transição de status de retirada inválida/,
      )
    })
  })
})
