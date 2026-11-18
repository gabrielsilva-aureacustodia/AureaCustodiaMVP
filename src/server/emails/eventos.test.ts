/**
 * A derivação dos e-mails a partir do antes/depois do estado — função pura, testada com fixtures.
 * É o contrato de "o que aconteceu que o cliente precisa saber".
 */

import { describe, expect, it } from 'vitest'

import { seedState } from '@/domain/seed'
import type { Analise, AppState, Cadastro, Envio, FaturaCustodia, Saque } from '@/domain/types'

import { eventosDeEmail } from './eventos'
import type { EventoDeEmail } from './tipos'

const AGORA = Date.UTC(2026, 10, 17, 15, 0)

function cenario(): { antes: AppState; depois: AppState; a: string; b: string; c: string } {
  const antes = seedState()
  const [a, b, c] = Object.keys(antes.users)
  return { antes, depois: structuredClone(antes), a, b, c }
}

const tipos = (eventos: readonly EventoDeEmail[]) => eventos.map((e) => e.tipo).sort()

function envio(over: Partial<Envio> = {}, usuario = 'x'): Envio {
  return {
    protocolo: 'RO-ENV-0001',
    userEmail: usuario,
    tipoMoeda: 'Direitos Humanos',
    ano: 2026,
    quantidade: 2,
    codigoRastreio: 'AP123456789BR',
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: AGORA,
    codigosAtivosGerados: [],
    ...over,
  }
}

function analise(over: Partial<Analise> = {}): Analise {
  return {
    protocolo: 'RO-ANL-0001',
    protocoloEnvio: 'RO-ENV-0001',
    codigoMoeda: 'RO-000900',
    codigoRecibo: 'REC-000900',
    tipoMoeda: 'Direitos Humanos',
    ano: 2026,
    pesoMg: 27000,
    veredito: 'aprovada',
    motivoRecusa: null,
    operador: 'op@x.com',
    aprovador: 'op@x.com',
    caixa: null,
    posicao: null,
    validadoEm: AGORA,
    caminhoVideo: null,
    hashAnterior: 'GENESIS',
    hash: 'h',
    ...over,
  }
}

function fatura(usuario: string, over: Partial<FaturaCustodia> = {}): FaturaCustodia {
  return {
    id: 'FAT-1',
    userEmail: usuario,
    competencia: '2026-11',
    quantidadeMoedas: 1,
    moedaIds: ['RO-000900'],
    valorCents: 200,
    status: 'pendente',
    dataEmissao: AGORA,
    dataVencimento: AGORA + 86_400_000,
    ...over,
  }
}

function cadastroComPix(chave: string | undefined): Cadastro {
  return {
    cpf: '',
    nomeCompleto: 'Fulano',
    dataNascimento: '',
    telefone: '',
    endereco: { logradouro: '', numero: '', bairro: '', cidade: '', uf: '', cep: '' },
    dadosBancarios: { chavePix: chave, tipoChavePix: 'cpf' },
    completadoEm: AGORA,
  }
}

describe('negociação: compra e venda', () => {
  it('uma negociação avisa o comprador (compra) e o vendedor (venda), com os valores certos', () => {
    const { antes, depois, a, b } = cenario()
    depois.trades.push({ price: 20_000, qty: 1, date: AGORA, buyer: a, seller: b, feeComprador: 200, feeVendedor: 200, fee: 400, tipoMoeda: 'Direitos Humanos' })
    const eventos = eventosDeEmail(antes, depois, AGORA)
    expect(tipos(eventos)).toEqual(['compra', 'venda'])

    const compra = eventos.find((e) => e.tipo === 'compra')
    const venda = eventos.find((e) => e.tipo === 'venda')
    expect(compra).toMatchObject({ para: a, chave: `compra:${a}:${antes.trades.length}` })
    expect(compra?.tipo === 'compra' && compra.dados).toMatchObject({ quantidade: 1, valorMoedasCents: 20_000, comissaoCents: 200, custodiaCents: 0, totalCents: 20_200 })
    expect(venda).toMatchObject({ para: b, chave: `venda:${b}:${antes.trades.length}` })
    expect(venda?.tipo === 'venda' && venda.dados).toMatchObject({ valorCents: 20_000, comissaoCents: 200, liquidoCents: 19_800 })
  })

  it('cinco unidades na mesma mutação são UM aviso de compra, não cinco', () => {
    const { antes, depois, a, b, c } = cenario()
    for (const vendedor of [b, b, c, c, b]) {
      depois.trades.push({ price: 10_000, qty: 1, date: AGORA, buyer: a, seller: vendedor, feeComprador: 100, feeVendedor: 100, fee: 200, tipoMoeda: 'Direitos Humanos' })
    }
    const eventos = eventosDeEmail(antes, depois, AGORA)
    const compras = eventos.filter((e) => e.tipo === 'compra')
    expect(compras).toHaveLength(1)
    expect(compras[0].tipo === 'compra' && compras[0].dados).toMatchObject({ quantidade: 5, valorMoedasCents: 50_000, comissaoCents: 500 })
    // Dois vendedores diferentes: um aviso de venda para cada um.
    expect(eventos.filter((e) => e.tipo === 'venda').map((e) => e.para).sort()).toEqual([b, c].sort())
  })

  it('a custódia do primeiro mês embutida na compra entra no total e não vira e-mail de fatura paga', () => {
    const { antes, depois, a, b } = cenario()
    depois.trades.push({ price: 20_000, qty: 1, date: AGORA, buyer: a, seller: b, feeComprador: 200, feeVendedor: 200, fee: 400, tipoMoeda: 'Direitos Humanos' })
    depois.faturasCustodia = [fatura(a, { id: 'FAT-COMPRA', status: 'paga', origem: 'compra', dataPagamento: AGORA, valorCents: 200 })]
    const eventos = eventosDeEmail(antes, depois, AGORA)
    expect(tipos(eventos)).toEqual(['compra', 'venda'])
    const compra = eventos.find((e) => e.tipo === 'compra')
    expect(compra?.tipo === 'compra' && compra.dados).toMatchObject({ custodiaCents: 200, totalCents: 20_400 })
  })

  it('sem negociação nova, nenhum aviso (reprocessar o mesmo estado não repete)', () => {
    const { antes, depois } = cenario()
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])
  })

  it('a chave é a posição na lista: o mesmo estado derivado duas vezes dá as mesmas chaves', () => {
    const { antes, depois, a, b } = cenario()
    depois.trades.push({ price: 100, qty: 1, date: AGORA, buyer: a, seller: b, tipoMoeda: 'Direitos Humanos' })
    const um = eventosDeEmail(antes, depois, AGORA).map((e) => e.chave)
    const dois = eventosDeEmail(antes, depois, AGORA + 5000).map((e) => e.chave)
    expect(um).toEqual(dois)
  })
})

describe('depósito em conta', () => {
  it('avisa o depósito (origem "deposito"), e só ele', () => {
    const { antes, depois, a, b } = cenario()
    depois.deposits.push({ userEmail: a, valor: 50_000, date: AGORA, origem: 'deposito', metodo: 'pix' })
    depois.deposits.push({ userEmail: b, valor: 200, date: AGORA, origem: 'fatura_custodia', metodo: 'pix' })
    const eventos = eventosDeEmail(antes, depois, AGORA)
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ tipo: 'deposito', para: a, chave: `deposito:${antes.deposits.length}` })
    expect(eventos[0].tipo === 'deposito' && eventos[0].dados).toMatchObject({ valorCents: 50_000, metodo: 'pix' })
  })

  it('sai mesmo com as notificações do cliente desligadas', () => {
    const { antes, depois, a } = cenario()
    depois.users[a].settings = { twoFA: false, notifEnvios: false, notifNegociacoes: false, notifNovidades: false }
    depois.deposits.push({ userEmail: a, valor: 1000, date: AGORA, origem: 'deposito', metodo: 'cartao' })
    expect(tipos(eventosDeEmail(antes, depois, AGORA))).toEqual(['deposito'])
  })
})

describe('envio para a custódia', () => {
  it('"Protocolo gerado" -> "Envio postado" avisa a postagem com o rastreio', () => {
    const { antes, depois, a } = cenario()
    antes.envios.push(envio({}, a))
    depois.envios.push(envio({ etapaAtual: 'Envio postado', dataPostagem: AGORA }, a))
    const eventos = eventosDeEmail(antes, depois, AGORA)
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ tipo: 'envio_postado', para: a, chave: 'envio-postado:RO-ENV-0001' })
    expect(eventos[0].tipo === 'envio_postado' && eventos[0].dados).toMatchObject({ protocolo: 'RO-ENV-0001', codigoRastreio: 'AP123456789BR', quantidade: 2 })
  })

  it('"Envio postado" -> "Recebido pela custódia" avisa o recebimento', () => {
    const { antes, depois, a } = cenario()
    antes.envios.push(envio({ etapaAtual: 'Envio postado' }, a))
    depois.envios.push(envio({ etapaAtual: 'Recebido pela custódia' }, a))
    expect(eventosDeEmail(antes, depois, AGORA).map((e) => [e.tipo, e.chave])).toEqual([['envio_recebido', 'envio-recebido:RO-ENV-0001']])
  })

  it('do "Protocolo gerado" direto ao "Recebido" (entrega registrada no mesmo job) avisa só o recebimento', () => {
    const { antes, depois, a } = cenario()
    antes.envios.push(envio({}, a))
    depois.envios.push(envio({ etapaAtual: 'Recebido pela custódia' }, a))
    expect(tipos(eventosDeEmail(antes, depois, AGORA))).toEqual(['envio_recebido'])
  })

  it('etapas seguintes ("Em análise física", "Recibo emitido") não geram aviso de envio', () => {
    const { antes, depois, a } = cenario()
    antes.envios.push(envio({ etapaAtual: 'Recebido pela custódia' }, a))
    depois.envios.push(envio({ etapaAtual: 'Em análise física' }, a))
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])
  })

  it('cadastro sem envio e envio desconsiderado não têm postagem a avisar', () => {
    const { antes, depois, a } = cenario()
    antes.envios.push(envio({ origem: 'cadastro_sem_envio' }, a), envio({ protocolo: 'RO-ENV-0002' }, a))
    depois.envios.push(
      envio({ origem: 'cadastro_sem_envio', etapaAtual: 'Envio postado' }, a),
      envio({ protocolo: 'RO-ENV-0002', etapaAtual: 'Envio postado', desconsideradoEm: AGORA }, a),
    )
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])
  })

  it('respeita notifEnvios desligado: o aviso opcional não entra', () => {
    const { antes, depois, a } = cenario()
    depois.users[a].settings = { twoFA: false, notifEnvios: false, notifNegociacoes: true, notifNovidades: false }
    antes.envios.push(envio({}, a))
    depois.envios.push(envio({ etapaAtual: 'Envio postado' }, a))
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])
  })
})

describe('análise da bancada', () => {
  it('moeda aprovada avisa o dono do envio, com o código da moeda', () => {
    const { antes, depois, a } = cenario()
    depois.envios.push(envio({}, a))
    depois.analises = [analise()]
    const [e] = eventosDeEmail(antes, depois, AGORA)
    expect(e).toMatchObject({ tipo: 'moeda_aceita', para: a, chave: 'analise:RO-ANL-0001' })
    expect(e.tipo === 'moeda_aceita' && e.dados).toMatchObject({ quantidade: 1, codigos: ['RO-000900'], primeiroMesPago: false })
  })

  it('moeda recusada avisa com o motivo', () => {
    const { antes, depois, a } = cenario()
    depois.envios.push(envio({}, a))
    depois.analises = [analise({ veredito: 'recusada', codigoMoeda: null, codigoRecibo: null, motivoRecusa: 'Peso fora da tolerância' })]
    const [e] = eventosDeEmail(antes, depois, AGORA)
    expect(e).toMatchObject({ tipo: 'moeda_recusada', para: a })
    expect(e.tipo === 'moeda_recusada' && e.dados).toMatchObject({ motivos: ['Peso fora da tolerância'] })
  })

  it('sem registro de envio (cadastro direto), o dono da moeda aprovada é quem a tem no inventário', () => {
    const { antes, depois, b } = cenario()
    depois.users[b].coins.push({ ...depois.users[b].coins[0], id: 'RO-000900' })
    depois.analises = [analise({ protocoloEnvio: 'RO-DIR-0001', origem: 'cadastro_direto' })]
    const [e] = eventosDeEmail(antes, depois, AGORA)
    expect(e).toMatchObject({ tipo: 'moeda_aceita', para: b })
  })

  it('"primeiro mês já pago" aparece quando a fatura de entrada nasce paga na mesma mutação', () => {
    const { antes, depois, a } = cenario()
    depois.envios.push(envio({}, a))
    depois.analises = [analise()]
    depois.faturasCustodia = [fatura(a, { status: 'paga', origem: 'entrada_no_acervo', dataPagamento: AGORA })]
    const eventos = eventosDeEmail(antes, depois, AGORA)
    // Um único e-mail (o da moeda aceita): a fatura que nasce paga por fora não gera aviso próprio.
    expect(tipos(eventos)).toEqual(['moeda_aceita'])
    expect(eventos[0].tipo === 'moeda_aceita' && eventos[0].dados.primeiroMesPago).toBe(true)
  })

  it('análise já gravada antes não é avisada de novo', () => {
    const { antes, depois, a } = cenario()
    antes.envios.push(envio({}, a))
    depois.envios.push(envio({}, a))
    antes.analises = [analise()]
    depois.analises = [analise()]
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])
  })
})

describe('fatura de custódia', () => {
  it('pendente -> paga avisa o pagamento', () => {
    const { antes, depois, a } = cenario()
    antes.faturasCustodia = [fatura(a)]
    depois.faturasCustodia = [fatura(a, { status: 'paga', dataPagamento: AGORA, formaPagamento: 'pix' })]
    const [e] = eventosDeEmail(antes, depois, AGORA)
    expect(e).toMatchObject({ tipo: 'fatura_paga', para: a, chave: 'fatura-paga:FAT-1' })
    expect(e.tipo === 'fatura_paga' && e.dados).toMatchObject({ valorCents: 200, forma: 'pix', competencia: '2026-11' })
  })

  it('fatura que NASCE paga pelo ciclo (débito automático) avisa; a que nasce paga por compra ou entrada não', () => {
    const { antes, depois, a } = cenario()
    depois.faturasCustodia = [
      fatura(a, { id: 'F-CICLO', status: 'paga', origem: 'ciclo_mensal', dataPagamento: AGORA }),
      fatura(a, { id: 'F-COMPRA', status: 'paga', origem: 'compra', dataPagamento: AGORA }),
      fatura(a, { id: 'F-ENTRADA', status: 'paga', origem: 'entrada_no_acervo', dataPagamento: AGORA }),
    ]
    expect(eventosDeEmail(antes, depois, AGORA).map((e) => e.chave)).toEqual(['fatura-paga:F-CICLO'])
  })

  it('fatura que já estava paga, ou continua em aberto, não avisa', () => {
    const { antes, depois, a } = cenario()
    antes.faturasCustodia = [fatura(a, { id: 'JA-PAGA', status: 'paga' }), fatura(a, { id: 'ABERTA' })]
    depois.faturasCustodia = [fatura(a, { id: 'JA-PAGA', status: 'paga', dataPagamento: AGORA }), fatura(a, { id: 'ABERTA', status: 'atrasada' })]
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])
  })
})

describe('segurança: chave Pix', () => {
  it('trocar a chave avisa, com a chave MASCARADA e nunca inteira', () => {
    const { antes, depois, a } = cenario()
    antes.users[a].cadastro = cadastroComPix('111.222.333-44')
    depois.users[a].cadastro = cadastroComPix('555.666.777-88')
    const [e] = eventosDeEmail(antes, depois, AGORA)
    expect(e).toMatchObject({ tipo: 'seguranca_pix', para: a, chave: `seguranca-pix:${a}:${AGORA}` })
    expect(e.tipo === 'seguranca_pix' && e.dados.chaveMascarada).toBe('terminada em 7788')
    expect(JSON.stringify(e)).not.toContain('555.666.777-88')
    expect(JSON.stringify(e)).not.toContain('111.222.333-44')
  })

  it('a primeira gravação da chave (não havia uma) e a regravação igual não avisam', () => {
    const { antes, depois, a, b } = cenario()
    depois.users[a].cadastro = cadastroComPix('111.222.333-44')
    antes.users[b].cadastro = cadastroComPix('999')
    depois.users[b].cadastro = cadastroComPix('999')
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])
  })

  it('sai sempre, mesmo com as notificações desligadas', () => {
    const { antes, depois, a } = cenario()
    antes.users[a].cadastro = cadastroComPix('111.222.333-44')
    depois.users[a].cadastro = cadastroComPix('555.666.777-88')
    depois.users[a].settings = { twoFA: false, notifEnvios: false, notifNegociacoes: false, notifNovidades: false }
    expect(tipos(eventosDeEmail(antes, depois, AGORA))).toEqual(['seguranca_pix'])
  })
})

describe('o que a central NÃO dispara', () => {
  it('saque (pedido, pago, recusado) não gera evento: é de src/server/saques/avisos.ts', () => {
    const { antes, depois, a } = cenario()
    const saque: Saque = {
      id: 'SAQ-1',
      userEmail: a,
      valorTotal: 10_500,
      taxa: 500,
      valorLiquido: 10_000,
      dadosBancarios: { chavePix: '111.222.333-44', tipoChavePix: 'cpf' },
      status: 'solicitado',
      criadoEm: AGORA,
      previsaoPagamentoEm: AGORA + 3 * 86_400_000,
      atualizadoEm: AGORA,
    }
    antes.saques = []
    depois.saques = [saque]
    expect(eventosDeEmail(antes, depois, AGORA)).toEqual([])

    const pago: AppState = structuredClone(depois)
    pago.saques = [{ ...saque, status: 'pago', pagoEm: AGORA }]
    expect(eventosDeEmail(depois, pago, AGORA)).toEqual([])

    const recusado: AppState = structuredClone(depois)
    recusado.saques = [{ ...saque, status: 'falhou', motivoFalha: 'Chave inválida' }]
    expect(eventosDeEmail(depois, recusado, AGORA)).toEqual([])
  })

  it('destinatário que não está mais no estado não recebe nada', () => {
    const { antes, depois, b } = cenario()
    depois.trades.push({ price: 100, qty: 1, date: AGORA, buyer: 'sumiu@x.com', seller: b, tipoMoeda: 'Direitos Humanos' })
    expect(eventosDeEmail(antes, depois, AGORA).map((e) => e.para)).toEqual([b])
  })
})
