/**
 * Fábricas de estado para os testes do domínio — e SÓ para eles.
 *
 * Nada daqui é importado por código de produção. Vive dentro de src/domain
 * porque monta exatamente os tipos do domínio, e um teste que montasse o
 * estado à mão em cada arquivo divergiria dos tipos na primeira mudança de
 * formato — que é justamente o momento em que os testes mais precisam
 * compilar.
 *
 * Os valores padrão são deliberadamente "de manual": moeda armazenada,
 * validada, com recibo ativo. Cada teste sobrescreve só o que o cenário
 * exige, e o resto não distrai.
 */

import type { AppState, BuyOrder, Cadastro, Coin, SellOffer, User } from '@/domain/types'

/** A moeda-referência do marketplace — nome exato do catálogo. */
export const BAN = 'Entrega da Bandeira Olímpica'

/** O segundo ativo negociável — nome exato do catálogo. */
export const DH = 'Direitos Humanos'

export function moeda(id: string, tipo: string): Coin {
  return {
    id,
    tipoMoeda: tipo,
    ano: 2012,
    entrada: '01/01/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 28500,
    protocolo: 'RO-ENV-0001',
    recibo: {
      codigo: 'REC-' + id.split('-')[1],
      hash: '0xA1B2...C3D4',
      dataEmissao: '01/01/2026',
      status: 'Ativo',
    },
  }
}

/**
 * Um cadastro formal COMPLETO e válido — CPF com dígito verificador correto,
 * todos os campos obrigatórios, PIX cadastrado.
 *
 * Existe porque `temCadastroCompleto` (src/domain/cadastro.ts) passou, em
 * 28/09/2026, a travar a publicação de oferta de venda e de compra
 * (`casarOrdensRespeitandoPendencia`, em bloqueio-por-debito.ts). Sem um
 * cadastro completo por padrão, todo usuário de teste do mercado — aqui e
 * nas fixtures locais de outros arquivos — passaria a ser tratado como
 * cadastro incompleto, e ofertas que os testes esperam ver casar sairiam do
 * livro antes de o motor rodar.
 */
export function cadastroCompleto(agora: number = Date.now()): Cadastro {
  return {
    cpf: '529.982.247-25',
    nomeCompleto: 'Usuário Teste',
    dataNascimento: '1990-01-01',
    telefone: '(11) 98765-4321',
    endereco: {
      logradouro: 'Rua das Moedas',
      numero: '10',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01000-000',
    },
    dadosBancarios: {
      chavePix: 'usuario.teste@exemplo.com.br',
      tipoChavePix: 'email',
    },
    completadoEm: agora,
    confirmadoEm: agora,
  }
}

export function usuario(nome: string, saldo: number, coins: Coin[]): User {
  return { name: nome, balance: saldo, coins, cadastro: cadastroCompleto() }
}

export function estado(users: Record<string, User>): AppState {
  return {
    users,
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 100, envio: 100 },
    deposits: [],
    analises: [],
  }
}

export function venda(
  id: string,
  coinId: string,
  seller: string,
  price: number,
  tipo: string,
  t: number,
  prioridade?: number,
): SellOffer {
  return {
    id,
    coinId,
    seller,
    price,
    obs: '',
    lotId: 'LOT-' + id,
    createdAt: t,
    tipoMoeda: tipo,
    prioridadeEm: prioridade ?? t,
  }
}

export function compra(
  id: string,
  buyer: string,
  price: number,
  qty: number,
  tipo: string,
  t: number,
  prioridade?: number,
): BuyOrder {
  return {
    id,
    buyer,
    price,
    qty,
    createdAt: t,
    tipoMoeda: tipo,
    prioridadeEm: prioridade ?? t,
  }
}
